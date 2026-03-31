"""
Authentication module — password hashing & JWT token management.
"""

import bcrypt
import jwt
import time
from typing import Optional
from fastapi import Request, HTTPException

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS


# ── Password Hashing ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ── JWT Tokens ────────────────────────────────────────────────────────

def create_token(teacher_id: int, name: str) -> str:
    """Create a JWT token with teacher_id payload."""
    payload = {
        "teacher_id": teacher_id,
        "name": name,
        "exp": time.time() + JWT_EXPIRY_HOURS * 3600,
        "iat": time.time(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload["exp"] < time.time():
            return None
        return payload
    except (jwt.InvalidTokenError, KeyError):
        return None


# ── FastAPI Dependency ────────────────────────────────────────────────

def get_current_teacher(request: Request) -> dict:
    """
    Extract the authenticated teacher from the request.
    Checks Authorization header (Bearer token) or 'token' cookie.
    Raises 401 if not authenticated.
    """
    token = None

    # Check Authorization header first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # Fall back to cookie
    if not token:
        token = request.cookies.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    return payload
