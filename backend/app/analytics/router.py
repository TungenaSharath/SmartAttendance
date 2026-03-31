"""
Analytics router — attendance trends, defaulter detection, department comparison.
"""

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_teacher, get_hod
from app import database as db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/daily-trends")
def daily_trends(
    department_id: int = None,
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_teacher),
):
    """Daily attendance data for the last N days."""
    import sqlite3
    from app.config import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    query = """
        SELECT date(se.created_at) AS day,
               COUNT(a.id) AS total,
               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
               ROUND(SUM(CASE WHEN a.status = 'Present' THEN 1.0 ELSE 0 END) / COUNT(a.id) * 100, 1) AS attendance_pct
        FROM attendance a
        JOIN sessions se ON a.session_id = se.id
        JOIN subjects sub ON se.subject_id = sub.id
        JOIN teachers t ON sub.teacher_id = t.id
        WHERE se.created_at >= date('now', ?)
    """
    params = [f"-{days} days"]
    if department_id:
        query += " AND t.department_id = ?"
        params.append(department_id)
    query += " GROUP BY day ORDER BY day"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/monthly-trends")
def monthly_trends(
    department_id: int = None,
    months: int = Query(6, ge=1, le=24),
    user: dict = Depends(get_teacher),
):
    """Monthly attendance aggregation."""
    return db.get_monthly_trends(department_id, months)


@router.get("/defaulters")
def defaulters(
    department_id: int = None,
    threshold: float = Query(75.0, ge=0, le=100),
    user: dict = Depends(get_teacher),
):
    """Students with attendance below threshold."""
    return db.get_defaulters(department_id, threshold)


@router.get("/department-comparison")
def department_comparison(user: dict = Depends(get_hod)):
    """Compare attendance across all departments."""
    departments = db.get_all_departments()
    result = []
    for dept in departments:
        stats = db.get_department_attendance_stats(dept["id"])
        result.append({
            "id": dept["id"],
            "name": dept["name"],
            "code": dept["code"],
            **stats,
        })
    return result


@router.get("/staff-insights")
def staff_insights(
    department_id: int = None,
    user: dict = Depends(get_hod),
):
    """Staff attendance patterns and insights."""
    import sqlite3
    from app.config import DB_PATH
    from datetime import date

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    query = """
        SELECT s.id AS staff_id, t.name AS teacher_name, s.employee_code,
               d.name AS department_name,
               COUNT(sa.id) AS total_days,
               SUM(CASE WHEN sa.status = 'Present' THEN 1 ELSE 0 END) AS present_days,
               ROUND(SUM(CASE WHEN sa.status = 'Present' THEN 1.0 ELSE 0 END) / MAX(COUNT(sa.id), 1) * 100, 1) AS attendance_pct,
               AVG(CASE WHEN sa.confidence > 0 THEN sa.confidence END) AS avg_confidence
        FROM staff s
        JOIN teachers t ON s.teacher_id = t.id
        JOIN departments d ON s.department_id = d.id
        LEFT JOIN staff_attendance sa ON sa.staff_id = s.id
    """
    params = []
    if department_id:
        query += " WHERE s.department_id = ?"
        params.append(department_id)
    query += " GROUP BY s.id ORDER BY attendance_pct ASC"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]
