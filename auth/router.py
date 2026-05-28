"""
auth/router.py

Auth endpoints:
  POST /auth/register  — create a new account
  POST /auth/login     — verify credentials, set httpOnly JWT cookie
  POST /auth/logout    — clear the cookie
  GET  /auth/me        — return current user from cookie (session check)
"""

import os
import traceback
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth.db import get_db
from auth.service import create_user, get_user_by_email
from auth.security import (
    validate_password,
    verify_password,
    create_access_token,
    decode_access_token,
    EXPIRE_HOURS,
)
from auth.schemas import RegisterRequest, LoginRequest, UserResponse
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = EXPIRE_HOURS * 3600  # seconds


# ─── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
@limiter.limit("3/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Confirm passwords match
    if payload.password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    # 2. Validate password rules
    errors = validate_password(payload.password)
    if errors:
        raise HTTPException(400, {"detail": "Weak password", "rules": errors})

    # 3. Create user
    try:
        create_user(db, payload.email, payload.password)
    except IntegrityError:
        raise HTTPException(409, "Email already registered")
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Registration failed")

    return {"message": "Account created. Please log in."}


# ─── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # 1. Fetch user
    try:
        user = get_user_by_email(db, payload.email)
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Login failed")

    # 2. Verify credentials (same message for both to prevent enumeration)
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(401, "Invalid email or password")

    # 3. Issue JWT and set httpOnly cookie
    token = create_access_token(user.id, user.email)

    is_prod = os.getenv("ENV") == "production"

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

    return {"message": "Logged in", "email": user.email}


# ─── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(response: Response):
    is_prod = os.getenv("ENV") == "production"

    response.delete_cookie(
        key=COOKIE_NAME, 
        path="/",
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod
    )
    return {"message": "Logged out"}


# ─── Me (session check) ────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def me(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not authenticated")

    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired session")

    return UserResponse(id=int(payload["sub"]), email=payload["email"])
