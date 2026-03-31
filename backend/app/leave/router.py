"""
Leave management router — apply, review, and manage leave requests.
"""

from fastapi import APIRouter, HTTPException, Depends, Form

from app.auth.dependencies import get_current_user, get_teacher, get_hod, get_admin
from app import database as db

router = APIRouter(prefix="/api/leave", tags=["Leave Management"])


@router.post("/apply")
def apply_leave(
    leave_type: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    reason: str = Form(None),
    user: dict = Depends(get_teacher),
):
    """Teacher applies for leave."""
    if leave_type not in ("CASUAL", "SICK", "EARNED", "DUTY", "OTHER"):
        raise HTTPException(400, "Invalid leave type. Use: CASUAL, SICK, EARNED, DUTY, OTHER")

    if start_date > end_date:
        raise HTTPException(400, "Start date must be before end date")

    leave_id = db.create_leave_request(
        user["user_id"], leave_type, start_date, end_date, reason
    )

    db.add_audit_log(user["user_id"], "APPLY_LEAVE", "leave", leave_id,
                     f"{leave_type}: {start_date} to {end_date}")

    return {"id": leave_id, "status": "PENDING"}


@router.get("/my")
def my_leaves(user: dict = Depends(get_teacher)):
    """Get current user's leave requests."""
    return db.get_leave_requests_by_teacher(user["user_id"])


@router.get("/pending")
def pending_leaves(user: dict = Depends(get_hod)):
    """HOD/Admin: get pending leave requests for their department."""
    teacher = db.get_teacher_by_pk(user["user_id"])
    dept_id = teacher.get("department_id") if user["role"] == "HOD" else None
    return db.get_pending_leave_requests(dept_id)


@router.get("/all")
def all_leaves(
    department_id: int = None,
    user: dict = Depends(get_hod),
):
    """HOD/Admin: get all leave requests."""
    if user["role"] == "HOD":
        teacher = db.get_teacher_by_pk(user["user_id"])
        department_id = teacher.get("department_id")
    return db.get_all_leave_requests(department_id)


@router.put("/{leave_id}/review")
def review_leave(
    leave_id: int,
    status: str = Form(...),
    user: dict = Depends(get_hod),
):
    """HOD approves or rejects a leave request."""
    if status not in ("APPROVED", "REJECTED"):
        raise HTTPException(400, "Status must be APPROVED or REJECTED")

    leave = db.get_leave_request(leave_id)
    if not leave:
        raise HTTPException(404, "Leave request not found")

    if leave["status"] != "PENDING":
        raise HTTPException(400, f"Leave already {leave['status']}")

    # HOD can only review leaves from their department
    if user["role"] == "HOD":
        teacher = db.get_teacher_by_pk(user["user_id"])
        applicant = db.get_teacher_by_pk(leave["teacher_id"])
        if teacher.get("department_id") != applicant.get("department_id"):
            raise HTTPException(403, "Can only review leaves from your department")

    db.review_leave_request(leave_id, status, user["user_id"])

    db.add_audit_log(user["user_id"], f"LEAVE_{status}", "leave", leave_id,
                     f"Teacher: {leave['teacher_name']}")

    return {"id": leave_id, "status": status}


@router.put("/{leave_id}/override")
def override_leave(
    leave_id: int,
    status: str = Form(...),
    user: dict = Depends(get_admin),
):
    """Admin overrides a leave decision."""
    if status not in ("APPROVED", "REJECTED"):
        raise HTTPException(400, "Status must be APPROVED or REJECTED")

    leave = db.get_leave_request(leave_id)
    if not leave:
        raise HTTPException(404, "Leave request not found")

    db.override_leave_request(leave_id, status, user["user_id"])

    db.add_audit_log(user["user_id"], f"LEAVE_OVERRIDE_{status}", "leave", leave_id,
                     f"Teacher: {leave['teacher_name']}")

    return {"id": leave_id, "status": status, "overridden": True}
