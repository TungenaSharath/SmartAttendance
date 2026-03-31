"""
Attendance router — subjects, students, sessions, and attendance marking.
Migrated from the original monolithic main.py.
"""

import base64
import uuid
import os

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile

from app.auth.dependencies import get_current_user, get_teacher
from app import database as db
from app.config import UPLOAD_DIR, MAX_REGISTRATION_IMAGES, MIN_REGISTRATION_IMAGES

router = APIRouter(prefix="/api", tags=["Attendance"])


# ── Helpers ───────────────────────────────────────────────────────────

def _read_image(file_bytes: bytes):
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not decode image")
    return img


def _encode_image_b64(image: np.ndarray, fmt: str = ".jpg") -> str:
    _, buf = cv2.imencode(fmt, image)
    return base64.b64encode(buf).decode("utf-8")


def _verify_ownership(subject_id: int, user: dict):
    """Ensure the subject belongs to the authenticated teacher."""
    if not db.verify_subject_ownership(subject_id, user["user_id"]):
        raise HTTPException(403, "Not your subject")


def _verify_session_ownership(session_id: int, user: dict):
    """Ensure the session's subject belongs to the teacher. Returns session."""
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    _verify_ownership(session["subject_id"], user)
    return session


# ══════════════════════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════════════════════

@router.post("/subjects")
def create_subject(
    name: str = Form(...),
    user: dict = Depends(get_teacher),
):
    sid = db.create_subject(name, user["user_id"])
    return {"id": sid, "name": name}


@router.get("/subjects")
def list_subjects(user: dict = Depends(get_teacher)):
    return db.get_subjects_by_teacher(user["user_id"])


@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, user: dict = Depends(get_teacher)):
    _verify_ownership(subject_id, user)
    db.delete_subject(subject_id)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════
# STUDENTS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

@router.post("/subjects/{subject_id}/students")
def add_student(
    subject_id: int,
    name: str = Form(...),
    roll_number: str = Form(...),
    images: list[UploadFile] = File(...),
    user: dict = Depends(get_teacher),
):
    _verify_ownership(subject_id, user)

    if not (MIN_REGISTRATION_IMAGES <= len(images) <= MAX_REGISTRATION_IMAGES):
        raise HTTPException(400, f"Provide {MIN_REGISTRATION_IMAGES}-{MAX_REGISTRATION_IMAGES} images")

    # Import here to avoid loading heavy ML models at import time
    from app.core.face_detection import detect_faces
    from app.core.embedding import get_embedding

    student_id = db.add_student(name, roll_number, subject_id)
    saved = 0

    for img_file in images:
        raw = img_file.file.read()
        image = _read_image(raw)
        detections = detect_faces(image)
        if not detections:
            continue
        emb = get_embedding(detections[0])
        if emb is not None:
            fname = f"{uuid.uuid4().hex}.jpg"
            fpath = os.path.join(UPLOAD_DIR, fname)
            with open(fpath, "wb") as f:
                f.write(raw)
            db.add_embedding(student_id, emb, fpath)
            saved += 1

    if saved == 0:
        db.delete_student(student_id)
        raise HTTPException(400, "No faces detected in any image")

    db.add_audit_log(user["user_id"], "ADD_STUDENT", "student", student_id,
                     f"{name} ({roll_number}) - {saved} embeddings")

    return {
        "id": student_id, "name": name, "roll_number": roll_number,
        "embeddings_saved": saved
    }


@router.get("/subjects/{subject_id}/students")
def list_students(subject_id: int, user: dict = Depends(get_teacher)):
    _verify_ownership(subject_id, user)
    students = db.get_students_by_subject(subject_id)
    for s in students:
        s["embedding_count"] = db.get_embedding_count(s["id"])
    return students


@router.put("/subjects/{subject_id}/students/{student_id}")
def edit_student(
    subject_id: int, student_id: int,
    name: str = Form(...),
    roll_number: str = Form(...),
    user: dict = Depends(get_teacher),
):
    _verify_ownership(subject_id, user)
    student = db.get_student_by_id(student_id)
    if not student or student["subject_id"] != subject_id:
        raise HTTPException(404, "Student not found")
    db.edit_student(student_id, name, roll_number)
    return {"id": student_id, "name": name, "roll_number": roll_number}


@router.delete("/subjects/{subject_id}/students/{student_id}")
def delete_student(
    subject_id: int, student_id: int,
    user: dict = Depends(get_teacher),
):
    _verify_ownership(subject_id, user)
    student = db.get_student_by_id(student_id)
    if not student or student["subject_id"] != subject_id:
        raise HTTPException(404, "Student not found")
    db.delete_student(student_id)
    db.add_audit_log(user["user_id"], "DELETE_STUDENT", "student", student_id)
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════
# SESSIONS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

@router.post("/subjects/{subject_id}/sessions")
def create_session(
    subject_id: int,
    name: str = Form(...),
    user: dict = Depends(get_teacher),
):
    _verify_ownership(subject_id, user)
    sid = db.create_session(name, subject_id)
    return {"id": sid, "name": name}


@router.get("/subjects/{subject_id}/sessions")
def list_sessions(subject_id: int, user: dict = Depends(get_teacher)):
    _verify_ownership(subject_id, user)
    return db.get_sessions_by_subject(subject_id)


# ══════════════════════════════════════════════════════════════════════
# ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

@router.post("/attendance/mark")
def mark_attendance(
    session_id: int = Form(...),
    image: UploadFile = File(...),
    user: dict = Depends(get_teacher),
):
    session = _verify_session_ownership(session_id, user)

    from app.core.recognition import mark_attendance_from_frame

    raw = image.file.read()
    img = _read_image(raw)
    result = mark_attendance_from_frame(session_id, session["subject_id"], img)
    annotated_b64 = _encode_image_b64(result["annotated_image"])

    db.add_audit_log(user["user_id"], "MARK_ATTENDANCE", "session", session_id,
                     f"{len(result['marked'])} marked, {result['unknown_count']} unknown")

    return {
        "marked": result["marked"],
        "unknown_count": result["unknown_count"],
        "total_faces": result["total_faces"],
        "annotated_image": annotated_b64,
    }


@router.post("/attendance/process-frame")
def process_live_frame(
    session_id: int = Form(None),
    subject_id: int = Form(...),
    image: UploadFile = File(...),
    user: dict = Depends(get_teacher),
):
    _verify_ownership(subject_id, user)

    from app.core.recognition import process_frame, mark_attendance_from_frame

    raw = image.file.read()
    img = _read_image(raw)

    if session_id:
        result = mark_attendance_from_frame(session_id, subject_id, img)
        annotated_b64 = _encode_image_b64(result["annotated_image"])
        return {
            "marked": result["marked"],
            "unknown_count": result["unknown_count"],
            "total_faces": result["total_faces"],
            "annotated_image": annotated_b64,
        }
    else:
        result = process_frame(img, subject_id)
        annotated_b64 = _encode_image_b64(result["annotated_image"])
        return {
            "detections": result["detections"],
            "count": result["count"],
            "annotated_image": annotated_b64,
        }


@router.put("/attendance/{session_id}/{student_db_id}")
def update_attendance(
    session_id: int, student_db_id: int,
    status: str = Form(...),
    user: dict = Depends(get_teacher),
):
    _verify_session_ownership(session_id, user)
    db.update_attendance(session_id, student_db_id, status)
    db.add_audit_log(user["user_id"], "UPDATE_ATTENDANCE", "attendance", session_id,
                     f"student {student_db_id} -> {status}")
    return {"ok": True}


@router.get("/attendance/{session_id}")
def get_attendance(session_id: int, user: dict = Depends(get_teacher)):
    _verify_session_ownership(session_id, user)
    return db.get_session_attendance(session_id)


# ══════════════════════════════════════════════════════════════════════
# PEER ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

@router.post("/attendance/peer-mark")
def peer_mark_attendance(
    session_id: int = Form(...),
    actual_teacher_id: int = Form(...),
    class_info: str = Form(None),
    notes: str = Form(None),
    image: UploadFile = File(...),
    user: dict = Depends(get_teacher),
):
    """Substitute teacher marks attendance for another teacher's class."""
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    from app.core.recognition import mark_attendance_from_frame

    raw = image.file.read()
    img = _read_image(raw)
    result = mark_attendance_from_frame(session_id, session["subject_id"], img)
    annotated_b64 = _encode_image_b64(result["annotated_image"])

    # Record the peer attendance
    db.create_peer_attendance(session_id, actual_teacher_id, user["user_id"],
                              class_info, notes)

    db.add_audit_log(user["user_id"], "PEER_ATTENDANCE", "session", session_id,
                     f"Substitute for teacher {actual_teacher_id}")

    return {
        "marked": result["marked"],
        "unknown_count": result["unknown_count"],
        "total_faces": result["total_faces"],
        "annotated_image": annotated_b64,
    }


@router.get("/attendance/peer-history")
def get_peer_history(user: dict = Depends(get_teacher)):
    return db.get_peer_attendance_by_teacher(user["user_id"])


# ══════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════

@router.get("/reports/csv/{session_id}")
def download_csv(session_id: int, user: dict = Depends(get_teacher)):
    _verify_session_ownership(session_id, user)
    from fastapi.responses import FileResponse
    path = db.export_session_csv(session_id)
    return FileResponse(path, media_type="text/csv", filename=os.path.basename(path))


@router.get("/reports/summary/{session_id}")
def get_summary(session_id: int, user: dict = Depends(get_teacher)):
    _verify_session_ownership(session_id, user)
    return db.get_session_attendance(session_id)


# ══════════════════════════════════════════════════════════════════════
# ANALYTICS (subject-level)
# ══════════════════════════════════════════════════════════════════════

@router.get("/analytics/{subject_id}")
def get_analytics(subject_id: int, user: dict = Depends(get_teacher)):
    _verify_ownership(subject_id, user)
    return db.get_analytics_by_subject(subject_id)
