"""
Staff attendance router — face recognition for staff check-in.
"""

from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile

from app.auth.dependencies import get_current_user, get_teacher
from app import database as db

router = APIRouter(prefix="/api/staff-attendance", tags=["Staff Attendance"])


@router.post("/mark")
def mark_staff_attendance(
    image: UploadFile = File(...),
    user: dict = Depends(get_teacher),
):
    """Mark staff attendance via face recognition."""
    import cv2
    import numpy as np
    import base64

    raw = image.file.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not decode image")

    # Get staff record for this user
    staff = db.get_staff_by_teacher(user["user_id"])
    if not staff:
        raise HTTPException(400, "No staff record found. Contact admin.")

    from app.core.face_detection import detect_faces

    detections = detect_faces(img)
    if not detections:
        raise HTTPException(400, "No face detected in image")

    # Use the detection confidence as attendance confidence
    best = max(detections, key=lambda d: d["score"])
    confidence = float(best["score"])

    newly = db.mark_staff_attendance(staff["id"], confidence=confidence, method="face")

    db.add_audit_log(user["user_id"], "STAFF_CHECKIN", "staff", staff["id"],
                     f"Confidence: {confidence:.2f}")

    return {
        "success": True,
        "newly_marked": newly,
        "confidence": confidence,
        "date": date.today().isoformat(),
    }


@router.get("/today")
def get_today_attendance(
    department_id: int = None,
    user: dict = Depends(get_teacher),
):
    """Get today's staff attendance (optionally filtered by department)."""
    today = date.today().isoformat()
    return db.get_staff_attendance_by_date(today, department_id)


@router.get("/history")
def get_attendance_history(
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(get_teacher),
):
    """Get attendance history for current staff member."""
    staff = db.get_staff_by_teacher(user["user_id"])
    if not staff:
        raise HTTPException(400, "No staff record found")
    return db.get_staff_attendance_history(staff["id"], start_date, end_date)
