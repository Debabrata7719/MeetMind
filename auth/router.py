"""
auth/router.py

Auth endpoints:
  POST /auth/register  — create a new account
  POST /auth/login     — verify credentials, set httpOnly JWT cookie
  POST /auth/logout    — clear the cookie
  GET  /auth/me        — return current user from cookie (session check)
"""

import traceback
from fastapi import APIRouter, HTTPException, Response, Request
from mysql.connector import IntegrityError

from auth.db import get_connection
from auth.security import (
    validate_password,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    EXPIRE_HOURS,
)
from auth.models import RegisterRequest, LoginRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = EXPIRE_HOURS * 3600  # seconds


# ─── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    # 1. Confirm passwords match
    if payload.password != payload.confirm_password:
        raise HTTPException(400, "Passwords do not match")

    # 2. Validate password rules
    errors = validate_password(payload.password)
    if errors:
        raise HTTPException(400, {"detail": "Weak password", "rules": errors})

    # 3. Hash & insert
    hashed = hash_password(payload.password)

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (email, password) VALUES (%s, %s)",
            (payload.email, hashed),
        )
        conn.commit()
        cursor.close()
        conn.close()
    except IntegrityError:
        raise HTTPException(409, "Email already registered")
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Registration failed")

    return {"message": "Account created. Please log in."}


# ─── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(payload: LoginRequest, response: Response):
    # 1. Fetch user
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, email, password FROM users WHERE email = %s",
            (payload.email,),
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Login failed")

    # 2. Verify credentials (same message for both to prevent enumeration)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    # 3. Issue JWT and set httpOnly cookie
    token = create_access_token(user["id"], user["email"])

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,          # set True in production (HTTPS)
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

    return {"message": "Logged in", "email": user["email"]}


# ─── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME, 
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
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
