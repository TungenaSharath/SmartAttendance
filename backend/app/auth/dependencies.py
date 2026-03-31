"""
FastAPI dependencies for authentication and role-based access control.
"""

from functools import wraps
from fastapi import Request, HTTPException, Depends


from app.auth.service import decode_token


def get_current_user(request: Request) -> dict:
    """
    Extract the authenticated user from the request.
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


def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    Usage: Depends(require_role("ADMIN", "HOD"))
    """
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user
    return role_checker


# Convenience dependencies
get_admin = require_role("ADMIN")
get_hod = require_role("HOD", "ADMIN")
get_teacher = require_role("TEACHER", "HOD", "ADMIN")
