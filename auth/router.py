"""
auth/router.py

Auth endpoints:
  POST /auth/register        — create a new account
  POST /auth/login           — verify credentials, set httpOnly JWT cookie
  POST /auth/logout          — clear the cookie
  GET  /auth/me              — return current user from cookie (session check)
  POST /auth/forgot-password — generate and email a 4-digit OTP
  POST /auth/verify-otp      — validate the OTP from Redis
  POST /auth/reset-password  — replace password in DB, clear OTP
"""

import os
import traceback
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth.db import get_db
from auth.service import create_user, get_user_by_email, update_password
from auth.email_service import send_otp_email
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


# ─── Forgot Password ───────────────────────────────────────────────────────────

import random
import redis as redis_lib

OTP_TTL = 5 * 60  # 5 minutes in seconds

def _get_redis():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    return redis_lib.Redis.from_url(redis_url, decode_responses=True)


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: dict, db: Session = Depends(get_db)):
    """Check if the email exists, generate OTP, store in Redis, send via Gmail."""
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(400, "Email is required")

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(404, "No account found with this email. Please create a new account.")

    otp = str(random.randint(1000, 9999))
    r = _get_redis()
    r.setex(f"otp:{email}", OTP_TTL, otp)

    try:
        send_otp_email(email, otp)
    except Exception as e:
        r.delete(f"otp:{email}")
        raise HTTPException(500, f"Failed to send OTP email: {str(e)}")

    return {"message": "OTP sent to your email address."}


@router.post("/verify-otp")
def verify_otp(payload: dict, db: Session = Depends(get_db)):
    """Validate the OTP from Redis. Returns success if it matches."""
    email = payload.get("email", "").strip().lower()
    otp = str(payload.get("otp", "")).strip()

    if not email or not otp:
        raise HTTPException(400, "Email and OTP are required")

    r = _get_redis()
    stored_otp = r.get(f"otp:{email}")

    if not stored_otp:
        raise HTTPException(400, "Invalid or expired OTP. Please generate a new one.")
    if stored_otp != otp:
        raise HTTPException(400, "Invalid OTP. Please check and try again.")

    # OTP is correct — mark it as verified (replace with a verified flag, keep TTL)
    ttl = r.ttl(f"otp:{email}")
    r.setex(f"otp_verified:{email}", ttl, "1")

    return {"message": "OTP verified successfully."}


@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    """Reset the user's password. Requires a prior successful /verify-otp call."""
    email = payload.get("email", "").strip().lower()
    new_password = payload.get("new_password", "")

    if not email or not new_password:
        raise HTTPException(400, "Email and new password are required")

    # Ensure OTP was verified
    r = _get_redis()
    if not r.get(f"otp_verified:{email}"):
        raise HTTPException(403, "OTP not verified. Please complete the OTP step first.")

    errors = validate_password(new_password)
    if errors:
        raise HTTPException(400, {"detail": "Weak password", "rules": errors})

    success = update_password(db, email, new_password)
    if not success:
        raise HTTPException(404, "User not found.")

    # Clean up Redis keys
    r.delete(f"otp:{email}")
    r.delete(f"otp_verified:{email}")

    return {"message": "Password reset successfully. You can now log in."}
