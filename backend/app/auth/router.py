"""
Auth router — registration, login, and user info endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, Form

from app.auth.schemas import RegisterRequest, LoginRequest
from app.auth.service import hash_password, verify_password, create_token
from app.auth.dependencies import get_current_user
from app import database as db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register")
def register(
    name: str = Form(...),
    teacher_id: str = Form(...),
    password: str = Form(...),
    role: str = Form("TEACHER"),
    department_id: int = Form(None),
):
    """Register a new user (teacher/HOD/admin)."""
    if role not in ("ADMIN", "HOD", "TEACHER"):
        raise HTTPException(400, "Invalid role")

    existing = db.get_teacher_by_login_id(teacher_id)
    if existing:
        raise HTTPException(400, f"Teacher ID '{teacher_id}' already exists")

    pw_hash = hash_password(password)
    pk = db.create_teacher(name, teacher_id, pw_hash, role=role, department_id=department_id)

    # Auto-create staff record if department is specified
    if department_id:
        try:
            db.create_staff(pk, department_id, f"EMP-{pk:04d}")
        except Exception:
            pass  # Staff record is optional

    db.add_audit_log(pk, "REGISTER", "teacher", pk, f"Registered as {role}")

    token = create_token(pk, name, role)
    return {
        "token": token,
        "user": {"id": pk, "name": name, "teacher_id": teacher_id, "role": role}
    }


@router.post("/login")
def login(
    teacher_id: str = Form(...),
    password: str = Form(...),
):
    """Login and receive JWT token."""
    teacher = db.get_teacher_by_login_id(teacher_id)
    if not teacher or not verify_password(password, teacher["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    role = teacher.get("role", "TEACHER")
    token = create_token(teacher["id"], teacher["name"], role)

    db.add_audit_log(teacher["id"], "LOGIN", "teacher", teacher["id"])

    return {
        "token": token,
        "user": {
            "id": teacher["id"],
            "name": teacher["name"],
            "teacher_id": teacher["teacher_id"],
            "role": role,
            "department_id": teacher.get("department_id"),
        }
    }


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    teacher = db.get_teacher_by_pk(user["user_id"])
    if not teacher:
        raise HTTPException(404, "User not found")
    return {
        "id": teacher["id"],
        "name": teacher["name"],
        "teacher_id": teacher["teacher_id"],
        "role": teacher.get("role", "TEACHER"),
        "department_id": teacher.get("department_id"),
    }
