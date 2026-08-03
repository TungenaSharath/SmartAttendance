"""
SmartAttendance Startup Pilot Seeding Utility
Quickly sets up institutional accounts, HODs, faculty credentials, and sample subjects
for live college demos and pilot onboarding.
"""

import sys
import argparse
import database as db
from auth import hash_password


def seed_pilot(institution: str, hod_name: str, teacher_name: str, subject_name: str):
    print(f"[*] Initializing Pilot Environment for: {institution}")
    db.init_db()

    conn = db._get_conn()

    # 1. Create Teacher Account
    teacher_id = "FAC2026"
    password = "password123"
    hashed = hash_password(password)

    row = conn.execute("SELECT id FROM teachers WHERE teacher_id = ?", (teacher_id,)).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO teachers (name, teacher_id, password_hash) VALUES (?, ?, ?)",
            (teacher_name, teacher_id, hashed)
        )
        conn.commit()
        t_row = conn.execute("SELECT id FROM teachers WHERE teacher_id = ?", (teacher_id,)).fetchone()
        t_id = t_row["id"]
        print(f"[OK] Teacher Account Created: ID='{teacher_id}', Password='{password}'")
    else:
        t_id = row["id"]
        print(f"[INFO] Teacher '{teacher_id}' already exists.")

    # 2. Create Subject
    subj_row = conn.execute("SELECT id FROM subjects WHERE name = ? AND teacher_id = ?", (subject_name, t_id)).fetchone()
    if not subj_row:
        conn.execute(
            "INSERT INTO subjects (name, teacher_id) VALUES (?, ?)",
            (subject_name, t_id)
        )
        conn.commit()
        s_row = conn.execute("SELECT id FROM subjects WHERE name = ? AND teacher_id = ?", (subject_name, t_id)).fetchone()
        s_id = s_row["id"]
        print(f"[OK] Subject Created: '{subject_name}'")
    else:
        s_id = subj_row["id"]
        print(f"[INFO] Subject '{subject_name}' already exists.")

    # 3. Create Sample Session
    sess_row = conn.execute("SELECT id FROM sessions WHERE subject_id = ? AND name = ?", (s_id, "Pilot Session 01")).fetchone()
    if not sess_row:
        conn.execute(
            "INSERT INTO sessions (name, subject_id) VALUES (?, ?)",
            ("Pilot Session 01", s_id)
        )
        conn.commit()
        print(f"[OK] Created Initial Session: 'Pilot Session 01'")

    conn.close()
    print("\n--- Pilot Setup Complete ---")
    print(f"   Teacher ID: {teacher_id}")
    print(f"   Password  : {password}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SmartAttendance Startup Pilot Seeder")
    parser.add_argument("--institution", default="CBIT Hyderabad", help="College / School Name")
    parser.add_argument("--hod", default="Dr. Ramesh (HOD CSE)", help="HOD Name")
    parser.add_argument("--teacher", default="Prof. Anitha Sharma", help="Faculty Name")
    parser.add_argument("--subject", default="Deep Learning & CV", help="Subject Name")

    args = parser.parse_args()
    seed_pilot(args.institution, args.hod, args.teacher, args.subject)
