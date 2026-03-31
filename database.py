"""
SQLite database operations for teachers, subjects, students, embeddings,
sessions, and attendance.
"""

import sqlite3
import json
import os
import csv
from datetime import datetime
from typing import Optional
import numpy as np

from config import DB_PATH, REPORT_DIR


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
        CREATE TABLE IF NOT EXISTS teachers (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            teacher_id    TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
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
    """)
    conn.commit()
    conn.close()


# ══════════════════════════════════════════════════════════════════════
# TEACHERS
# ══════════════════════════════════════════════════════════════════════

def create_teacher(name: str, teacher_id: str, password_hash: str) -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO teachers (name, teacher_id, password_hash) VALUES (?, ?, ?)",
        (name, teacher_id, password_hash),
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
    # Pre-populate attendance with Absent for all students in the subject
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

    # ── Overall recognition stats ──
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

    # ── Confidence distribution (auto-marked only) ──
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

    # ── Per-session breakdown ──
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
