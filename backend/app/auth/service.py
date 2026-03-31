"""
Authentication service — password hashing & JWT token management.
"""

import bcrypt
import jwt
import time
from typing import Optional

from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS


# ── Password Hashing ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# ── JWT Tokens ────────────────────────────────────────────────────────

def create_token(user_id: int, name: str, role: str = "TEACHER") -> str:
    """Create a JWT token with user payload including role."""
    payload = {
        "user_id": user_id,
        "name": name,
        "role": role,
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
