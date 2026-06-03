"""
SQLite database operations for the extended SmartAttendance platform.
Includes teachers, subjects, students, embeddings, sessions, attendance,
departments, staff, leave requests, peer attendance, and audit logging.
"""

import sqlite3
import json
import os
import csv
from datetime import datetime, date
from typing import Optional
import numpy as np

from app.config import DB_PATH, REPORT_DIR


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS departments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    UNIQUE NOT NULL,
            code        TEXT    UNIQUE NOT NULL,
            hod_id      INTEGER,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS teachers (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            teacher_id    TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'TEACHER',
            department_id INTEGER REFERENCES departments(id),
            created_at    TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS students (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            roll_number TEXT    NOT NULL,
            subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            created_at  TEXT    DEFAULT (datetime('now')),
            UNIQUE(roll_number, subject_id)
        );

        CREATE TABLE IF NOT EXISTS embeddings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            embedding   TEXT    NOT NULL,
            image_path  TEXT,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            status      TEXT    NOT NULL DEFAULT 'Absent',
            confidence  REAL    DEFAULT 0.0,
            marked_at   TEXT    DEFAULT (datetime('now')),
            method      TEXT    DEFAULT 'auto',
            UNIQUE(session_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS staff (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id    INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            department_id INTEGER NOT NULL REFERENCES departments(id),
            employee_code TEXT    UNIQUE NOT NULL,
            designation   TEXT,
            created_at    TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS staff_attendance (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id    INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
            date        TEXT    NOT NULL,
            status      TEXT    NOT NULL DEFAULT 'Absent',
            check_in    TEXT,
            check_out   TEXT,
            confidence  REAL    DEFAULT 0.0,
            method      TEXT    DEFAULT 'auto',
            marked_at   TEXT    DEFAULT (datetime('now')),
            UNIQUE(staff_id, date)
        );

        CREATE TABLE IF NOT EXISTS leave_requests (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id        INTEGER NOT NULL REFERENCES teachers(id),
            leave_type        TEXT    NOT NULL,
            start_date        TEXT    NOT NULL,
            end_date          TEXT    NOT NULL,
            reason            TEXT,
            status            TEXT    NOT NULL DEFAULT 'PENDING',
            reviewed_by       INTEGER REFERENCES teachers(id),
            reviewed_at       TEXT,
            admin_override_by INTEGER REFERENCES teachers(id),
            admin_override_at TEXT,
            created_at        TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS peer_attendance (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id        INTEGER NOT NULL REFERENCES sessions(id),
            actual_teacher_id INTEGER NOT NULL REFERENCES teachers(id),
            marked_by_id      INTEGER NOT NULL REFERENCES teachers(id),
            class_info        TEXT,
            notes             TEXT,
            created_at        TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER REFERENCES teachers(id),
            action      TEXT    NOT NULL,
            target_type TEXT,
            target_id   INTEGER,
            details     TEXT,
            created_at  TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS system_settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
        CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(date);
        CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendance(staff_id);
        CREATE INDEX IF NOT EXISTS idx_leave_teacher ON leave_requests(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
        CREATE INDEX IF NOT EXISTS idx_students_subject ON students(subject_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    """)
    conn.commit()

    # Migration: add columns to existing teachers table if they don't exist
    try:
        conn.execute("SELECT role FROM teachers LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE teachers ADD COLUMN role TEXT NOT NULL DEFAULT 'TEACHER'")
        conn.commit()

    try:
        conn.execute("SELECT department_id FROM teachers LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE teachers ADD COLUMN department_id INTEGER REFERENCES departments(id)")
        conn.commit()

    # Create index on department_id now that migration has ensured the column exists
    conn.execute("CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department_id)")
    conn.commit()

    conn.close()


# ══════════════════════════════════════════════════════════════════════
# TEACHERS
# ══════════════════════════════════════════════════════════════════════

def create_teacher(name: str, teacher_id: str, password_hash: str,
                   role: str = "TEACHER", department_id: int = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO teachers (name, teacher_id, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)",
        (name, teacher_id, password_hash, role, department_id),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_teacher_by_login_id(teacher_id: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM teachers WHERE teacher_id = ?", (teacher_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_teacher_by_pk(pk: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM teachers WHERE id = ?", (pk,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_teachers() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("SELECT id, name, teacher_id, role, department_id, created_at FROM teachers ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_teachers_by_department(department_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, name, teacher_id, role, department_id, created_at FROM teachers WHERE department_id = ? ORDER BY name",
        (department_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_teacher_role(teacher_pk: int, role: str):
    conn = _get_conn()
    conn.execute("UPDATE teachers SET role = ? WHERE id = ?", (role, teacher_pk))
    conn.commit()
    conn.close()


# ══════════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ══════════════════════════════════════════════════════════════════════

def create_department(name: str, code: str, hod_id: int = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO departments (name, code, hod_id) VALUES (?, ?, ?)",
        (name, code, hod_id),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_all_departments() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT d.*, t.name AS hod_name
        FROM departments d
        LEFT JOIN teachers t ON d.hod_id = t.id
        ORDER BY d.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_department(department_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("""
        SELECT d.*, t.name AS hod_name
        FROM departments d
        LEFT JOIN teachers t ON d.hod_id = t.id
        WHERE d.id = ?
    """, (department_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_department(department_id: int, name: str = None, code: str = None, hod_id: int = None):
    conn = _get_conn()
    updates, params = [], []
    if name is not None:
        updates.append("name = ?"); params.append(name)
    if code is not None:
        updates.append("code = ?"); params.append(code)
    if hod_id is not None:
        updates.append("hod_id = ?"); params.append(hod_id)
    if updates:
        params.append(department_id)
        conn.execute(f"UPDATE departments SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()


# ══════════════════════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════════════════════

def create_subject(name: str, teacher_pk: int) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO subjects (name, teacher_id) VALUES (?, ?)",
        (name, teacher_pk),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_subjects_by_teacher(teacher_pk: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM subjects WHERE teacher_id = ? ORDER BY name",
        (teacher_pk,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_subject(subject_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_subject(subject_id: int):
    conn = _get_conn()
    conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    conn.commit()
    conn.close()


def verify_subject_ownership(subject_id: int, teacher_pk: int) -> bool:
    """Check that the subject belongs to the teacher."""
    subj = get_subject(subject_id)
    return subj is not None and subj["teacher_id"] == teacher_pk


def get_subjects_by_department(department_id: int) -> list[dict]:
    """Get all subjects taught by teachers in a department."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT s.*, t.name AS teacher_name
        FROM subjects s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE t.department_id = ?
        ORDER BY s.name
    """, (department_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# STUDENTS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

def add_student(name: str, roll_number: str, subject_id: int) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO students (name, roll_number, subject_id) VALUES (?, ?, ?)",
        (name, roll_number, subject_id),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_students_by_subject(subject_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM students WHERE subject_id = ? ORDER BY name",
        (subject_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_student_by_id(student_db_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_db_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def edit_student(student_db_id: int, name: str, roll_number: str):
    conn = _get_conn()
    conn.execute(
        "UPDATE students SET name = ?, roll_number = ? WHERE id = ?",
        (name, roll_number, student_db_id),
    )
    conn.commit()
    conn.close()


def delete_student(student_db_id: int):
    conn = _get_conn()
    conn.execute("DELETE FROM students WHERE id = ?", (student_db_id,))
    conn.commit()
    conn.close()


def get_students_by_department(department_id: int) -> list[dict]:
    """Get all students enrolled in subjects taught by dept teachers."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT DISTINCT st.id, st.name, st.roll_number, st.subject_id, st.created_at,
               sub.name AS subject_name
        FROM students st
        JOIN subjects sub ON st.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        WHERE t.department_id = ?
        ORDER BY st.name
    """, (department_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# EMBEDDINGS
# ══════════════════════════════════════════════════════════════════════

def add_embedding(student_db_id: int, embedding: np.ndarray, image_path: str = ""):
    emb_json = json.dumps(embedding.tolist())
    conn = _get_conn()
    conn.execute(
        "INSERT INTO embeddings (student_id, embedding, image_path) VALUES (?, ?, ?)",
        (student_db_id, emb_json, image_path),
    )
    conn.commit()
    conn.close()


def get_embeddings_by_subject(subject_id: int) -> list[dict]:
    """Return all embeddings for students in a specific subject."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT e.id, e.student_id, e.embedding, e.image_path,
               s.name, s.roll_number AS student_code
        FROM embeddings e
        JOIN students s ON e.student_id = s.id
        WHERE s.subject_id = ?
    """, (subject_id,)).fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["embedding"] = np.array(json.loads(d["embedding"]), dtype=np.float32)
        results.append(d)
    return results


def get_embedding_count(student_db_id: int) -> int:
    conn = _get_conn()
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM embeddings WHERE student_id = ?",
        (student_db_id,),
    ).fetchone()
    conn.close()
    return row["cnt"]


# ══════════════════════════════════════════════════════════════════════
# SESSIONS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

def create_session(name: str, subject_id: int) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO sessions (name, subject_id) VALUES (?, ?)",
        (name, subject_id),
    )
    conn.commit()
    session_id = cur.lastrowid
    students = conn.execute(
        "SELECT id FROM students WHERE subject_id = ?", (subject_id,)
    ).fetchall()
    for s in students:
        conn.execute(
            "INSERT OR IGNORE INTO attendance (session_id, student_id, status) VALUES (?, ?, 'Absent')",
            (session_id, s["id"]),
        )
    conn.commit()
    conn.close()
    return session_id


def get_sessions_by_subject(subject_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM sessions WHERE subject_id = ? ORDER BY created_at DESC",
        (subject_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_session(session_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ══════════════════════════════════════════════════════════════════════
# ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

def mark_attendance(session_id: int, student_db_id: int, confidence: float = 0.0,
                    method: str = "auto") -> bool:
    """Mark a student present. Returns False if already present (duplicate prevention)."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT status FROM attendance WHERE session_id = ? AND student_id = ?",
        (session_id, student_db_id),
    ).fetchone()

    if row and row["status"] == "Present":
        conn.close()
        return False

    if row:
        conn.execute(
            """UPDATE attendance SET status='Present', confidence=?, marked_at=datetime('now'), method=?
               WHERE session_id=? AND student_id=?""",
            (confidence, method, session_id, student_db_id),
        )
    else:
        conn.execute(
            "INSERT INTO attendance (session_id, student_id, status, confidence, method) VALUES (?, ?, 'Present', ?, ?)",
            (session_id, student_db_id, confidence, method),
        )
    conn.commit()
    conn.close()
    return True


def update_attendance(session_id: int, student_db_id: int, status: str):
    """Manual override."""
    conn = _get_conn()
    conn.execute(
        """UPDATE attendance SET status=?, method='manual', marked_at=datetime('now')
           WHERE session_id=? AND student_id=?""",
        (status, session_id, student_db_id),
    )
    conn.commit()
    conn.close()


def get_session_attendance(session_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT a.id, a.session_id, a.student_id, a.status, a.confidence,
               a.marked_at, a.method, s.name, s.roll_number AS student_code
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.session_id = ?
        ORDER BY s.name
    """, (session_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# STAFF
# ══════════════════════════════════════════════════════════════════════

def create_staff(teacher_id: int, department_id: int, employee_code: str,
                 designation: str = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO staff (teacher_id, department_id, employee_code, designation) VALUES (?, ?, ?, ?)",
        (teacher_id, department_id, employee_code, designation),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_staff_by_teacher(teacher_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("""
        SELECT s.*, t.name AS teacher_name, d.name AS department_name
        FROM staff s
        JOIN teachers t ON s.teacher_id = t.id
        JOIN departments d ON s.department_id = d.id
        WHERE s.teacher_id = ?
    """, (teacher_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_staff_by_department(department_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT s.*, t.name AS teacher_name, t.teacher_id AS login_id
        FROM staff s
        JOIN teachers t ON s.teacher_id = t.id
        WHERE s.department_id = ?
        ORDER BY t.name
    """, (department_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_staff() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT s.*, t.name AS teacher_name, d.name AS department_name
        FROM staff s
        JOIN teachers t ON s.teacher_id = t.id
        JOIN departments d ON s.department_id = d.id
        ORDER BY t.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# STAFF ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

def mark_staff_attendance(staff_id: int, date_str: str = None,
                          confidence: float = 0.0, method: str = "auto") -> bool:
    """Mark staff present for a date. Returns False if already present."""
    if date_str is None:
        date_str = date.today().isoformat()
    conn = _get_conn()
    row = conn.execute(
        "SELECT status FROM staff_attendance WHERE staff_id = ? AND date = ?",
        (staff_id, date_str),
    ).fetchone()

    now = datetime.now().strftime("%H:%M:%S")

    if row and row["status"] == "Present":
        conn.close()
        return False

    if row:
        conn.execute(
            """UPDATE staff_attendance SET status='Present', check_in=?, confidence=?,
               method=?, marked_at=datetime('now') WHERE staff_id=? AND date=?""",
            (now, confidence, method, staff_id, date_str),
        )
    else:
        conn.execute(
            """INSERT INTO staff_attendance (staff_id, date, status, check_in, confidence, method)
               VALUES (?, ?, 'Present', ?, ?, ?)""",
            (staff_id, date_str, now, confidence, method),
        )
    conn.commit()
    conn.close()
    return True


def get_staff_attendance_by_date(date_str: str, department_id: int = None) -> list[dict]:
    conn = _get_conn()
    query = """
        SELECT sa.*, s.employee_code, t.name AS teacher_name, d.name AS department_name
        FROM staff_attendance sa
        JOIN staff s ON sa.staff_id = s.id
        JOIN teachers t ON s.teacher_id = t.id
        JOIN departments d ON s.department_id = d.id
        WHERE sa.date = ?
    """
    params = [date_str]
    if department_id:
        query += " AND s.department_id = ?"
        params.append(department_id)
    query += " ORDER BY t.name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_staff_attendance_history(staff_id: int, start_date: str = None,
                                 end_date: str = None) -> list[dict]:
    conn = _get_conn()
    query = "SELECT * FROM staff_attendance WHERE staff_id = ?"
    params = [staff_id]
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    query += " ORDER BY date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# LEAVE REQUESTS
# ══════════════════════════════════════════════════════════════════════

def create_leave_request(teacher_id: int, leave_type: str, start_date: str,
                         end_date: str, reason: str = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO leave_requests (teacher_id, leave_type, start_date, end_date, reason)
           VALUES (?, ?, ?, ?, ?)""",
        (teacher_id, leave_type, start_date, end_date, reason),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_leave_requests_by_teacher(teacher_id: int) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT lr.*, t.name AS teacher_name,
               rv.name AS reviewer_name
        FROM leave_requests lr
        JOIN teachers t ON lr.teacher_id = t.id
        LEFT JOIN teachers rv ON lr.reviewed_by = rv.id
        WHERE lr.teacher_id = ?
        ORDER BY lr.created_at DESC
    """, (teacher_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_pending_leave_requests(department_id: int = None) -> list[dict]:
    conn = _get_conn()
    query = """
        SELECT lr.*, t.name AS teacher_name, t.teacher_id AS login_id,
               d.name AS department_name
        FROM leave_requests lr
        JOIN teachers t ON lr.teacher_id = t.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE lr.status = 'PENDING'
    """
    params = []
    if department_id:
        query += " AND t.department_id = ?"
        params.append(department_id)
    query += " ORDER BY lr.created_at ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_leave_requests(department_id: int = None) -> list[dict]:
    conn = _get_conn()
    query = """
        SELECT lr.*, t.name AS teacher_name, t.teacher_id AS login_id,
               d.name AS department_name,
               rv.name AS reviewer_name
        FROM leave_requests lr
        JOIN teachers t ON lr.teacher_id = t.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN teachers rv ON lr.reviewed_by = rv.id
    """
    params = []
    if department_id:
        query += " WHERE t.department_id = ?"
        params.append(department_id)
    query += " ORDER BY lr.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def review_leave_request(leave_id: int, status: str, reviewed_by: int):
    conn = _get_conn()
    conn.execute(
        """UPDATE leave_requests SET status=?, reviewed_by=?, reviewed_at=datetime('now')
           WHERE id=?""",
        (status, reviewed_by, leave_id),
    )
    conn.commit()
    conn.close()


def override_leave_request(leave_id: int, status: str, admin_id: int):
    conn = _get_conn()
    conn.execute(
        """UPDATE leave_requests SET status=?, admin_override_by=?, admin_override_at=datetime('now')
           WHERE id=?""",
        (status, admin_id, leave_id),
    )
    conn.commit()
    conn.close()


def get_leave_request(leave_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("""
        SELECT lr.*, t.name AS teacher_name
        FROM leave_requests lr
        JOIN teachers t ON lr.teacher_id = t.id
        WHERE lr.id = ?
    """, (leave_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ══════════════════════════════════════════════════════════════════════
# PEER ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

def create_peer_attendance(session_id: int, actual_teacher_id: int,
                           marked_by_id: int, class_info: str = None,
                           notes: str = None) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """INSERT INTO peer_attendance (session_id, actual_teacher_id, marked_by_id, class_info, notes)
           VALUES (?, ?, ?, ?, ?)""",
        (session_id, actual_teacher_id, marked_by_id, class_info, notes),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id


def get_peer_attendance_by_teacher(teacher_id: int) -> list[dict]:
    """Get sessions where this teacher's classes were handled by substitutes."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT pa.*, t_actual.name AS actual_teacher_name,
               t_marked.name AS marked_by_name, se.name AS session_name,
               sub.name AS subject_name
        FROM peer_attendance pa
        JOIN teachers t_actual ON pa.actual_teacher_id = t_actual.id
        JOIN teachers t_marked ON pa.marked_by_id = t_marked.id
        JOIN sessions se ON pa.session_id = se.id
        JOIN subjects sub ON se.subject_id = sub.id
        WHERE pa.actual_teacher_id = ? OR pa.marked_by_id = ?
        ORDER BY pa.created_at DESC
    """, (teacher_id, teacher_id)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════════════

def add_audit_log(user_id: int, action: str, target_type: str = None,
                  target_id: int = None, details: str = None):
    conn = _get_conn()
    conn.execute(
        """INSERT INTO audit_log (user_id, action, target_type, target_id, details)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, action, target_type, target_id, details),
    )
    conn.commit()
    conn.close()


def get_audit_log(limit: int = 100) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("""
        SELECT al.*, t.name AS user_name
        FROM audit_log al
        LEFT JOIN teachers t ON al.user_id = t.id
        ORDER BY al.created_at DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ══════════════════════════════════════════════════════════════════════
# REPORTING
# ══════════════════════════════════════════════════════════════════════

def export_session_csv(session_id: int) -> str:
    """Export attendance for a session to a timestamped CSV. Returns file path."""
    conn = _get_conn()
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    rows = get_session_attendance(session_id)
    conn.close()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_name = session["name"].replace(" ", "_") if session else "unknown"
    filename = f"attendance_{session_name}_{timestamp}.csv"
    filepath = os.path.join(REPORT_DIR, filename)

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Student Name", "Roll Number", "Status", "Confidence", "Marked At", "Method"])
        for r in rows:
            writer.writerow([
                r["name"], r["student_code"], r["status"],
                f'{r["confidence"]:.2f}', r["marked_at"], r["method"]
            ])

    return filepath


# ══════════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════════

def get_analytics_by_subject(subject_id: int) -> dict:
    """Return recognition accuracy analytics for all sessions in a subject."""
    conn = _get_conn()

    overall = conn.execute("""
        SELECT
            COUNT(*)                                              AS total_records,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS total_present,
            SUM(CASE WHEN a.status = 'Present' AND a.method = 'auto' THEN 1 ELSE 0 END) AS auto_marked,
            SUM(CASE WHEN a.status = 'Present' AND a.method = 'manual' THEN 1 ELSE 0 END) AS manual_marked,
            AVG(CASE WHEN a.status = 'Present' AND a.method = 'auto' AND a.confidence > 0
                     THEN a.confidence END)                       AS avg_confidence
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        WHERE se.subject_id = ?
    """, (subject_id,)).fetchone()
    overall = dict(overall)

    buckets = conn.execute("""
        SELECT
            SUM(CASE WHEN a.confidence >= 0.9  THEN 1 ELSE 0 END) AS c90_100,
            SUM(CASE WHEN a.confidence >= 0.8  AND a.confidence < 0.9  THEN 1 ELSE 0 END) AS c80_90,
            SUM(CASE WHEN a.confidence >= 0.7  AND a.confidence < 0.8  THEN 1 ELSE 0 END) AS c70_80,
            SUM(CASE WHEN a.confidence >= 0.6  AND a.confidence < 0.7  THEN 1 ELSE 0 END) AS c60_70,
            SUM(CASE WHEN a.confidence >= 0.5  AND a.confidence < 0.6  THEN 1 ELSE 0 END) AS c50_60,
            SUM(CASE WHEN a.confidence <  0.5  AND a.confidence > 0    THEN 1 ELSE 0 END) AS c_below50,
            COUNT(*)                                                                      AS total
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        WHERE se.subject_id = ? AND a.status = 'Present' AND a.method = 'auto' AND a.confidence > 0
    """, (subject_id,)).fetchone()
    buckets = dict(buckets)

    sessions = conn.execute("""
        SELECT
            se.id            AS session_id,
            se.name          AS session_name,
            se.created_at,
            COUNT(*)                                              AS total_students,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END) AS absent,
            AVG(CASE WHEN a.status = 'Present' AND a.method = 'auto' AND a.confidence > 0
                     THEN a.confidence END)                       AS avg_confidence
        FROM sessions se
        LEFT JOIN attendance a ON a.session_id = se.id
        WHERE se.subject_id = ?
        GROUP BY se.id
        ORDER BY se.created_at DESC
    """, (subject_id,)).fetchall()
    conn.close()

    session_list = []
    for s in sessions:
        s = dict(s)
        total = s["total_students"] or 0
        present = s["present"] or 0
        s["attendance_rate"] = round(present / total * 100, 1) if total > 0 else 0
        s["avg_confidence"] = round(s["avg_confidence"] or 0, 4)
        session_list.append(s)

    total_sessions = len(session_list)
    auto = overall["auto_marked"] or 0
    manual = overall["manual_marked"] or 0
    total_present = overall["total_present"] or 0
    recognition_rate = round(auto / total_present * 100, 1) if total_present > 0 else 0
    avg_conf = round(overall["avg_confidence"] or 0, 4)

    return {
        "total_sessions": total_sessions,
        "total_records": overall["total_records"] or 0,
        "total_present": total_present,
        "auto_marked": auto,
        "manual_marked": manual,
        "avg_confidence": avg_conf,
        "recognition_rate": recognition_rate,
        "confidence_distribution": {
            "90-100%": buckets.get("c90_100", 0) or 0,
            "80-90%":  buckets.get("c80_90", 0) or 0,
            "70-80%":  buckets.get("c70_80", 0) or 0,
            "60-70%":  buckets.get("c60_70", 0) or 0,
            "50-60%":  buckets.get("c50_60", 0) or 0,
            "<50%":    buckets.get("c_below50", 0) or 0,
        },
        "sessions": session_list,
    }


def get_department_attendance_stats(department_id: int) -> dict:
    """Get aggregated attendance stats for a department."""
    conn = _get_conn()
    row = conn.execute("""
        SELECT
            COUNT(DISTINCT st.id) AS total_students,
            COUNT(DISTINCT t.id)  AS total_teachers,
            COUNT(DISTINCT sub.id) AS total_subjects,
            COUNT(DISTINCT se.id) AS total_sessions
        FROM teachers t
        LEFT JOIN subjects sub ON sub.teacher_id = t.id
        LEFT JOIN students st ON st.subject_id = sub.id
        LEFT JOIN sessions se ON se.subject_id = sub.id
        WHERE t.department_id = ?
    """, (department_id,)).fetchone()
    stats = dict(row)

    # Today's attendance
    today = date.today().isoformat()
    att_row = conn.execute("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        JOIN subjects sub ON se.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        WHERE t.department_id = ? AND date(se.created_at) = ?
    """, (department_id, today)).fetchone()
    att = dict(att_row)
    total = att["total"] or 0
    present = att["present"] or 0
    stats["today_attendance_rate"] = round(present / total * 100, 1) if total > 0 else 0

    conn.close()
    return stats


def get_defaulters(department_id: int = None, threshold: float = 75.0) -> list[dict]:
    """Get students with attendance below threshold percentage."""
    conn = _get_conn()
    query = """
        SELECT st.id, st.name, st.roll_number, sub.name AS subject_name,
               COUNT(a.id) AS total_sessions,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
               ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1.0 ELSE 0 END) / COUNT(a.id) * 100, 1) AS attendance_pct
        FROM students st
        JOIN subjects sub ON st.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        JOIN attendance a ON a.student_id = st.id
    """
    params = []
    if department_id:
        query += " WHERE t.department_id = ?"
        params.append(department_id)
    query += """
        GROUP BY st.id, sub.id
        HAVING attendance_pct < ?
        ORDER BY attendance_pct ASC
    """
    params.append(threshold)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_monthly_trends(department_id: int = None, months: int = 6) -> list[dict]:
    """Get monthly attendance trends."""
    conn = _get_conn()
    query = """
        SELECT strftime('%Y-%m', se.created_at) AS month,
               COUNT(a.id) AS total,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
               ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1.0 ELSE 0 END) / COUNT(a.id) * 100, 1) AS attendance_pct
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        JOIN subjects sub ON se.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        WHERE se.created_at >= date('now', ?)
    """
    params = [f"-{months} months"]
    if department_id:
        query += " AND t.department_id = ?"
        params.append(department_id)
    query += " GROUP BY month ORDER BY month"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_institution_stats() -> dict:
    """Get institution-wide statistics for admin dashboard."""
    conn = _get_conn()
    stats = {}

    row = conn.execute("""
        SELECT
            (SELECT COUNT(*) FROM departments) AS total_departments,
            (SELECT COUNT(*) FROM teachers) AS total_teachers,
            (SELECT COUNT(DISTINCT id) FROM students) AS total_students,
            (SELECT COUNT(*) FROM sessions) AS total_sessions,
            (SELECT COUNT(*) FROM attendance WHERE status = 'Present') AS total_present,
            (SELECT COUNT(*) FROM attendance) AS total_records,
            (SELECT COUNT(*) FROM leave_requests) AS total_leave_requests,
            (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING') AS pending_leaves
    """).fetchone()
    stats = dict(row)

    total = stats["total_records"] or 0
    present = stats["total_present"] or 0
    stats["overall_attendance_rate"] = round(present / total * 100, 1) if total > 0 else 0

    conn.close()
    return stats


# ══════════════════════════════════════════════════════════════════════
# SYSTEM SETTINGS
# ══════════════════════════════════════════════════════════════════════

def get_setting(key: str, default: str = None) -> str:
    """Retrieve a system setting by key."""
    conn = _get_conn()
    row = conn.execute("SELECT value FROM system_settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    """Set a system setting (upsert)."""
    conn = _get_conn()
    conn.execute(
        "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value)
    )
    conn.commit()
    conn.close()
