"""
Staff attendance router — face recognition for staff check-in.
"""

from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile

from app.auth.dependencies import get_current_user, get_teacher
from app import database as db

router = APIRouter(prefix="/api/staff-attendance", tags=["Staff Attendance"])


import math

def _haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

@router.post("/mark")
def mark_staff_attendance(
    image: UploadFile = File(...),
    lat: str = Form(None),
    lng: str = Form(None),
    user: dict = Depends(get_teacher),
):
    """Mark staff attendance via face recognition and geofencing."""
    # Check Geofencing first (Defaults to CBIT College, Hyderabad)
    c_lat_str = db.get_setting("campus_lat", "17.3916")
    c_lng_str = db.get_setting("campus_lng", "78.3190")
    c_radius_str = db.get_setting("campus_radius", "500")
    
    if c_lat_str and c_lng_str:
        if not lat or not lng:
            raise HTTPException(400, "Location tracking required for attendance. Please allow location access in your browser.")
        try:
            c_lat, c_lng = float(c_lat_str), float(c_lng_str)
            u_lat, u_lng = float(lat), float(lng)
            radius = float(c_radius_str)
            
            distance = _haversine(c_lat, c_lng, u_lat, u_lng)
            if distance > radius:
                raise HTTPException(400, f"Outside campus geofence. Distance: {distance:.0f}m (Allowed: {radius}m)")
        except ValueError:
            pass

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
