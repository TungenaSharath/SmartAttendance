"""
FastAPI application — REST API for the Classroom Attendance System.
Includes teacher authentication, subject management, and subject-scoped operations.
"""

import os
import base64
import uuid
import time
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

import config
import database as db
from auth import hash_password, verify_password, create_token, get_current_teacher
from face_detection import init_detector
from embedding import compute_embedding_from_image
from recognition import process_frame, mark_attendance_from_frame
from reporting import generate_csv_report, get_session_summary

# ── App setup ─────────────────────────────────────────────────────────
app = FastAPI(title="Classroom Attendance System", version="2.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory=config.TEMPLATE_DIR)

if os.path.isdir(config.STATIC_DIR):
    app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")


@app.on_event("startup")
async def startup():
    db.init_db()
    print(f"[*] Loading InsightFace model '{config.MODEL_PACK}' ...")
    init_detector()
    print("[OK] Model loaded and ready.")


# ── Helpers ───────────────────────────────────────────────────────────

def _read_image(file_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image file")
    return img


def _encode_image_b64(image: np.ndarray, fmt: str = ".jpg") -> str:
    _, buf = cv2.imencode(fmt, image)
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _verify_ownership(subject_id: int, teacher: dict):
    """Ensure the subject belongs to the authenticated teacher."""
    if not db.verify_subject_ownership(subject_id, teacher["teacher_id"]):
        raise HTTPException(403, "You do not have access to this subject")


def _verify_session_ownership(session_id: int, teacher: dict) -> dict:
    """Ensure the session's subject belongs to the teacher. Returns session."""
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    _verify_ownership(session["subject_id"], teacher)
    return session


# ── UI ────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ══════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register")
async def register_teacher(
    name: str = Form(...),
    teacher_id: str = Form(...),
    password: str = Form(...),
):
    if len(password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    existing = db.get_teacher_by_login_id(teacher_id)
    if existing:
        raise HTTPException(409, f"Teacher ID '{teacher_id}' already exists")
    pw_hash = hash_password(password)
    pk = db.create_teacher(name, teacher_id, pw_hash)
    token = create_token(pk, name)
    return {"message": f"Teacher '{name}' registered", "token": token, "teacher_id": pk, "name": name}


@app.post("/api/auth/login")
async def login_teacher(
    teacher_id: str = Form(...),
    password: str = Form(...),
):
    teacher = db.get_teacher_by_login_id(teacher_id)
    if not teacher or not verify_password(password, teacher["password_hash"]):
        raise HTTPException(401, "Invalid ID or password")
    token = create_token(teacher["id"], teacher["name"])
    return {"token": token, "teacher_id": teacher["id"], "name": teacher["name"]}


@app.get("/api/auth/me")
async def get_me(teacher: dict = Depends(get_current_teacher)):
    return {"teacher_id": teacher["teacher_id"], "name": teacher["name"]}


# ══════════════════════════════════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/subjects")
async def create_subject(
    name: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    subject_id = db.create_subject(name, teacher["teacher_id"])
    return {"subject_id": subject_id, "name": name}


@app.get("/api/subjects")
async def list_subjects(teacher: dict = Depends(get_current_teacher)):
    return db.get_subjects_by_teacher(teacher["teacher_id"])


@app.delete("/api/subjects/{subject_id}")
async def delete_subject(subject_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_ownership(subject_id, teacher)
    db.delete_subject(subject_id)
    return {"message": "Subject deleted"}


# ══════════════════════════════════════════════════════════════════════
# STUDENTS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/subjects/{subject_id}/students")
async def add_student(
    subject_id: int,
    name: str = Form(...),
    roll_number: str = Form(...),
    images: list[UploadFile] = File(...),
    teacher: dict = Depends(get_current_teacher),
):
    _verify_ownership(subject_id, teacher)
    try:
        student_db_id = db.add_student(name, roll_number, subject_id)
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(409, f"Roll number '{roll_number}' already exists in this subject")
        raise

    embeddings_saved = 0
    for img_file in images:
        raw = await img_file.read()
        image = _read_image(raw)
        fname = f"{roll_number}_{uuid.uuid4().hex[:8]}.jpg"
        fpath = os.path.join(config.UPLOAD_DIR, fname)
        cv2.imwrite(fpath, image)
        embs = compute_embedding_from_image(image)
        if not embs:
            continue
        db.add_embedding(student_db_id, embs[0], fpath)
        embeddings_saved += 1

    if embeddings_saved == 0:
        db.delete_student(student_db_id)
        raise HTTPException(400, "No faces detected in any uploaded images. Please upload clear face photos.")

    return {
        "message": f"Student '{name}' added",
        "student_id": student_db_id,
        "embeddings_saved": embeddings_saved,
    }


@app.get("/api/subjects/{subject_id}/students")
async def list_students(subject_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_ownership(subject_id, teacher)
    students = db.get_students_by_subject(subject_id)
    for s in students:
        s["embedding_count"] = db.get_embedding_count(s["id"])
    return students


@app.put("/api/subjects/{subject_id}/students/{student_id}")
async def edit_student(
    subject_id: int,
    student_id: int,
    name: str = Form(...),
    roll_number: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    _verify_ownership(subject_id, teacher)
    student = db.get_student_by_id(student_id)
    if not student or student["subject_id"] != subject_id:
        raise HTTPException(404, "Student not found in this subject")
    db.edit_student(student_id, name, roll_number)
    return {"message": f"Student updated"}


@app.delete("/api/subjects/{subject_id}/students/{student_id}")
async def delete_student(
    subject_id: int, student_id: int,
    teacher: dict = Depends(get_current_teacher),
):
    _verify_ownership(subject_id, teacher)
    student = db.get_student_by_id(student_id)
    if not student or student["subject_id"] != subject_id:
        raise HTTPException(404, "Student not found in this subject")
    db.delete_student(student_id)
    return {"message": "Student deleted"}


# ══════════════════════════════════════════════════════════════════════
# SESSIONS (subject-scoped)
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/subjects/{subject_id}/sessions")
async def create_session(
    subject_id: int,
    name: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    _verify_ownership(subject_id, teacher)
    session_id = db.create_session(name, subject_id)
    return {"session_id": session_id, "name": name}


@app.get("/api/subjects/{subject_id}/sessions")
async def list_sessions(subject_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_ownership(subject_id, teacher)
    return db.get_sessions_by_subject(subject_id)


# ══════════════════════════════════════════════════════════════════════
# ATTENDANCE
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/attendance/mark")
async def mark_attendance(
    session_id: int = Form(...),
    image: UploadFile = File(...),
    teacher: dict = Depends(get_current_teacher),
):
    session = _verify_session_ownership(session_id, teacher)
    t0 = time.time()
    raw = await image.read()
    img = _read_image(raw)
    result = mark_attendance_from_frame(session_id, session["subject_id"], img)
    scan_ms = round((time.time() - t0) * 1000)
    annotated_b64 = _encode_image_b64(result["annotated_image"])
    return {
        "marked": result["marked"],
        "unknown_count": result["unknown_count"],
        "total_faces": result["total_faces"],
        "annotated_image": annotated_b64,
        "scan_time_ms": scan_ms,
    }


@app.post("/api/attendance/live-frame")
async def process_live_frame(
    session_id: int = Form(None),
    subject_id: int = Form(...),
    image: UploadFile = File(...),
    teacher: dict = Depends(get_current_teacher),
):
    _verify_ownership(subject_id, teacher)
    raw = await image.read()
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


@app.put("/api/attendance/{session_id}/{student_db_id}")
async def update_attendance(
    session_id: int, student_db_id: int,
    status: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    _verify_session_ownership(session_id, teacher)
    if status not in ("Present", "Absent"):
        raise HTTPException(400, "Status must be 'Present' or 'Absent'")
    db.update_attendance(session_id, student_db_id, status)
    return {"message": "Attendance updated", "status": status}


@app.get("/api/attendance/{session_id}")
async def get_attendance(session_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_session_ownership(session_id, teacher)
    return db.get_session_attendance(session_id)


# ══════════════════════════════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/reports/{session_id}/csv")
async def download_csv(session_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_session_ownership(session_id, teacher)
    filepath = generate_csv_report(session_id)
    return FileResponse(filepath, media_type="text/csv", filename=os.path.basename(filepath))


@app.get("/api/reports/{session_id}/summary")
async def get_summary(session_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_session_ownership(session_id, teacher)
    return get_session_summary(session_id)


# ══════════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/analytics/{subject_id}")
async def get_analytics(subject_id: int, teacher: dict = Depends(get_current_teacher)):
    _verify_ownership(subject_id, teacher)
    return db.get_analytics_by_subject(subject_id)


# ══════════════════════════════════════════════════════════════════════
# TEST — Run Each Model Separately
# ══════════════════════════════════════════════════════════════════════

@app.post("/api/test/models")
async def test_models_separately(
    image: UploadFile = File(...),
    teacher: dict = Depends(get_current_teacher),
):
    """Run each InsightFace model individually and return per-model output."""
    from insightface.app import FaceAnalysis

    raw = await image.read()
    img = _read_image(raw)
    results = {}

    # ── Model 1: Detection only (SCRFD) ──
    det_app = FaceAnalysis(name=config.MODEL_PACK, providers=["CPUExecutionProvider"],
                           allowed_modules=["detection"])
    det_app.prepare(ctx_id=-1, det_size=config.DET_SIZE)

    t0 = time.time()
    det_faces = det_app.get(img)
    det_ms = round((time.time() - t0) * 1000)

    det_faces = [f for f in det_faces if f.det_score >= config.DETECTION_CONFIDENCE]
    det_img = img.copy()
    det_results = []
    for i, face in enumerate(det_faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        score = float(face.det_score)
        cv2.rectangle(det_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"Face {i+1}: {score:.0%}"
        cv2.putText(det_img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        if face.kps is not None:
            for pt in face.kps.astype(int):
                cv2.circle(det_img, tuple(pt), 3, (0, 255, 255), -1)
        det_results.append({
            "face_id": i + 1,
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "confidence": round(score, 4),
            "landmarks": face.kps.astype(int).tolist() if face.kps is not None else None,
        })

    results["detection"] = {
        "model": "SCRFD (det_10g)",
        "faces": det_results,
        "face_count": len(det_results),
        "time_ms": det_ms,
        "annotated_image": _encode_image_b64(det_img),
    }

    # ── Model 2: Recognition (ArcFace) ──
    rec_app = FaceAnalysis(name=config.MODEL_PACK, providers=["CPUExecutionProvider"],
                           allowed_modules=["detection", "recognition"])
    rec_app.prepare(ctx_id=-1, det_size=config.DET_SIZE)

    t0 = time.time()
    rec_faces = rec_app.get(img)
    rec_ms = round((time.time() - t0) * 1000)

    rec_faces = [f for f in rec_faces if f.det_score >= config.DETECTION_CONFIDENCE]
    rec_img = img.copy()
    rec_results = []
    for i, face in enumerate(rec_faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        emb = face.normed_embedding
        cv2.rectangle(rec_img, (x1, y1), (x2, y2), (255, 165, 0), 2)
        if emb is not None:
            norm = float(np.linalg.norm(emb))
            label = f"Face {i+1}: norm={norm:.3f}"
            cv2.putText(rec_img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 165, 0), 2)
            rec_results.append({
                "face_id": i + 1,
                "embedding_shape": list(emb.shape),
                "l2_norm": round(norm, 4),
                "mean": round(float(np.mean(emb)), 6),
                "std": round(float(np.std(emb)), 6),
                "first_10": [round(float(v), 4) for v in emb[:10]],
            })

    results["recognition"] = {
        "model": "ArcFace (w600k_r50)",
        "embeddings": rec_results,
        "time_ms": rec_ms,
        "annotated_image": _encode_image_b64(rec_img),
    }

    # ── Model 3: GenderAge ──
    ga_app = FaceAnalysis(name=config.MODEL_PACK, providers=["CPUExecutionProvider"],
                          allowed_modules=["detection", "genderage"])
    ga_app.prepare(ctx_id=-1, det_size=config.DET_SIZE)

    t0 = time.time()
    ga_faces = ga_app.get(img)
    ga_ms = round((time.time() - t0) * 1000)

    ga_faces = [f for f in ga_faces if f.det_score >= config.DETECTION_CONFIDENCE]
    ga_img = img.copy()
    ga_results = []
    for i, face in enumerate(ga_faces):
        x1, y1, x2, y2 = face.bbox.astype(int)
        age = getattr(face, "age", None)
        gender = getattr(face, "gender", None)
        gender_str = "Male" if gender == 1 else "Female" if gender == 0 else "Unknown"
        color = (255, 100, 100) if gender == 1 else (100, 100, 255) if gender == 0 else (200, 200, 200)
        cv2.rectangle(ga_img, (x1, y1), (x2, y2), color, 2)
        label = f"{gender_str}, Age: {age}"
        cv2.putText(ga_img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        ga_results.append({
            "face_id": i + 1,
            "gender": gender_str,
            "gender_raw": int(gender) if gender is not None else None,
            "age": int(age) if age is not None else None,
        })

    results["genderage"] = {
        "model": "GenderAge",
        "predictions": ga_results,
        "time_ms": ga_ms,
        "annotated_image": _encode_image_b64(ga_img),
    }

    # ── Summary ──
    results["summary"] = {
        "total_time_ms": det_ms + rec_ms + ga_ms,
        "detection_ms": det_ms,
        "recognition_ms": rec_ms,
        "genderage_ms": ga_ms,
        "model_pack": config.MODEL_PACK,
    }

    return results


# ══════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════

@app.get("/api/config")
async def get_config():
    return {
        "similarity_threshold": config.SIMILARITY_THRESHOLD,
        "detection_confidence": config.DETECTION_CONFIDENCE,
        "model_pack": config.MODEL_PACK,
    }


# ── Run ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
