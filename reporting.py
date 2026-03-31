"""
Reporting utilities — CSV export and session summaries.
"""

from database import export_session_csv, get_session_attendance, get_students_by_subject, get_session


def generate_csv_report(session_id: int) -> str:
    """Generate a CSV report file and return its path."""
    return export_session_csv(session_id)


def get_session_summary(session_id: int) -> dict:
    """Return a summary dict for the session, including all students in the subject."""
    session = get_session(session_id)
    attendance = get_session_attendance(session_id)
    subject_id = session["subject_id"] if session else None
    all_students = get_students_by_subject(subject_id) if subject_id else []

    # Build a lookup of attendance records by student_id
    att_map = {a["student_id"]: a for a in attendance}

    # Build complete records: all registered students, marking unscanned as Absent
    records = []
    for s in all_students:
        if s["id"] in att_map:
            records.append(att_map[s["id"]])
        else:
            records.append({
                "student_id": s["id"],
                "session_id": session_id,
                "name": s["name"],
                "student_code": s["roll_number"],
                "status": "Absent",
                "confidence": 0,
                "marked_at": None,
            })

    total = len(all_students)
    present = sum(1 for r in records if r["status"] == "Present")
    absent = total - present
    rate = (present / total * 100) if total > 0 else 0

    return {
        "session_id": session_id,
        "total_registered": total,
        "total_in_session": total,
        "present": present,
        "absent": absent,
        "attendance_rate": f"{rate:.1f}%",
        "records": records,
    }
