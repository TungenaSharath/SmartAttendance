"""
HOD Portal router — department-level analytics, staff monitoring, and leave management.
"""

from datetime import date
from fastapi import APIRouter, HTTPException, Depends

from app.auth.dependencies import get_hod
from app import database as db

router = APIRouter(prefix="/api/hod", tags=["HOD Portal"])


def _get_hod_department(user: dict) -> int:
    """Get the HOD's department ID."""
    teacher = db.get_teacher_by_pk(user["user_id"])
    dept_id = teacher.get("department_id")
    if not dept_id:
        raise HTTPException(400, "No department assigned to HOD")
    return dept_id


@router.get("/dashboard")
def hod_dashboard(user: dict = Depends(get_hod)):
    """Department summary dashboard."""
    if user["role"] == "ADMIN":
        # Admin can see all departments
        return db.get_institution_stats()

    dept_id = _get_hod_department(user)
    dept = db.get_department(dept_id)
    stats = db.get_department_attendance_stats(dept_id)

    return {
        "department": dept,
        **stats,
    }


@router.get("/students")
def hod_students(user: dict = Depends(get_hod)):
    """All students in the HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_students_by_department(dept_id)


@router.get("/staff")
def hod_staff(user: dict = Depends(get_hod)):
    """All staff in the HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_staff_by_department(dept_id)


@router.get("/staff-attendance")
def hod_staff_attendance(
    date_str: str = None,
    user: dict = Depends(get_hod),
):
    """Staff attendance for HOD's department."""
    dept_id = _get_hod_department(user)
    if not date_str:
        date_str = date.today().isoformat()
    return db.get_staff_attendance_by_date(date_str, dept_id)


@router.get("/defaulters")
def hod_defaulters(
    threshold: float = 75.0,
    user: dict = Depends(get_hod),
):
    """Students with attendance below threshold in HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_defaulters(dept_id, threshold)


@router.get("/trends")
def hod_trends(
    months: int = 6,
    user: dict = Depends(get_hod),
):
    """Monthly attendance trends for HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_monthly_trends(dept_id, months)


@router.get("/teachers")
def hod_teachers(user: dict = Depends(get_hod)):
    """All teachers in the HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_teachers_by_department(dept_id)


@router.get("/subjects")
def hod_subjects(user: dict = Depends(get_hod)):
    """All subjects in the HOD's department."""
    dept_id = _get_hod_department(user)
    return db.get_subjects_by_department(dept_id)
