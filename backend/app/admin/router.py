"""
Admin Portal router — institution-wide analytics, department management, reports.
"""

import csv
import os
from datetime import datetime, date
from io import StringIO
from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_admin
from app import database as db
from app.config import REPORT_DIR

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])


@router.get("/dashboard")
def admin_dashboard(user: dict = Depends(get_admin)):
    """Institution-wide statistics."""
    stats = db.get_institution_stats()
    stats["departments"] = db.get_all_departments()
    return stats


@router.get("/departments")
def list_departments(user: dict = Depends(get_admin)):
    """List all departments with stats."""
    departments = db.get_all_departments()
    result = []
    for dept in departments:
        dept_stats = db.get_department_attendance_stats(dept["id"])
        dept.update(dept_stats)
        result.append(dept)
    return result


@router.post("/departments")
def create_department(
    name: str = Form(...),
    code: str = Form(...),
    hod_id: int = Form(None),
    user: dict = Depends(get_admin),
):
    """Create a new department."""
    dept_id = db.create_department(name, code, hod_id)
    db.add_audit_log(user["user_id"], "CREATE_DEPARTMENT", "department", dept_id, name)
    return {"id": dept_id, "name": name, "code": code}


@router.put("/departments/{dept_id}")
def update_department(
    dept_id: int,
    name: str = Form(None),
    code: str = Form(None),
    hod_id: int = Form(None),
    user: dict = Depends(get_admin),
):
    """Update department details."""
    db.update_department(dept_id, name, code, hod_id)
    db.add_audit_log(user["user_id"], "UPDATE_DEPARTMENT", "department", dept_id)
    return {"ok": True}


@router.get("/departments/{dept_id}/stats")
def department_stats(dept_id: int, user: dict = Depends(get_admin)):
    """Deep-dive stats for a specific department."""
    dept = db.get_department(dept_id)
    if not dept:
        raise HTTPException(404, "Department not found")

    stats = db.get_department_attendance_stats(dept_id)
    teachers = db.get_teachers_by_department(dept_id)
    defaulters = db.get_defaulters(dept_id)
    trends = db.get_monthly_trends(dept_id)

    return {
        "department": dept,
        **stats,
        "teachers": teachers,
        "defaulters": defaulters,
        "trends": trends,
    }


@router.get("/teachers")
def all_teachers(user: dict = Depends(get_admin)):
    """List all teachers."""
    return db.get_all_teachers()


@router.put("/teachers/{teacher_id}/role")
def update_teacher_role(
    teacher_id: int,
    role: str = Form(...),
    user: dict = Depends(get_admin),
):
    """Update a teacher's role."""
    if role not in ("ADMIN", "HOD", "TEACHER"):
        raise HTTPException(400, "Invalid role")
    db.update_teacher_role(teacher_id, role)
    db.add_audit_log(user["user_id"], "UPDATE_ROLE", "teacher", teacher_id, role)
    return {"ok": True, "role": role}


@router.get("/system-metrics")
def system_metrics(user: dict = Depends(get_admin)):
    """System usage metrics."""
    stats = db.get_institution_stats()
    audit = db.get_audit_log(limit=50)
    return {
        **stats,
        "recent_activity": audit,
    }


@router.get("/export/attendance-csv")
def export_all_attendance_csv(
    department_id: int = None,
    user: dict = Depends(get_admin),
):
    """Export attendance data as CSV."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Department", "Teacher", "Subject", "Session", "Student",
                     "Roll Number", "Status", "Confidence", "Method", "Marked At"])

    conn = db.__import__("app.database")._get_conn() if False else None
    # Use direct query for efficiency
    import sqlite3
    from app.config import DB_PATH
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    query = """
        SELECT d.name AS dept_name, t.name AS teacher_name, sub.name AS subject_name,
               se.name AS session_name, st.name AS student_name, st.roll_number,
               a.status, a.confidence, a.method, a.marked_at
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        JOIN subjects sub ON se.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        JOIN students st ON a.student_id = st.id
        LEFT JOIN departments d ON t.department_id = d.id
    """
    params = []
    if department_id:
        query += " WHERE t.department_id = ?"
        params.append(department_id)
    query += " ORDER BY d.name, t.name, sub.name, se.created_at DESC, st.name"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    for r in rows:
        writer.writerow([
            r["dept_name"] or "N/A", r["teacher_name"], r["subject_name"],
            r["session_name"], r["student_name"], r["roll_number"],
            r["status"], f'{r["confidence"]:.2f}', r["method"], r["marked_at"]
        ])

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"institution_attendance_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/audit-log")
def get_audit_log(
    limit: int = 100,
    user: dict = Depends(get_admin),
):
    """Get recent audit log entries."""
    return db.get_audit_log(limit)
