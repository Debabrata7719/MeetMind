"""
auth/models.py

Pydantic request/response models for auth endpoints.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.strip().lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True

class UpdateNameRequest(BaseModel):
    name: str

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str
