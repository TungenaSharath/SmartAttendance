"""
Pydantic schemas for authentication.
"""

from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    teacher_id: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=4, max_length=100)
    role: str = Field(default="TEACHER", pattern="^(ADMIN|HOD|TEACHER)$")
    department_id: Optional[int] = None


class LoginRequest(BaseModel):
    teacher_id: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: int
    name: str
    teacher_id: str
    role: str
    department_id: Optional[int] = None
