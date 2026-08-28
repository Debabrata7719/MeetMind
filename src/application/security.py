"""
auth/security.py

Password hashing (bcrypt) and JWT token utilities (python-jose).
"""

import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))


# ─── Password rules ────────────────────────────────────────────────────────────

PASSWORD_RULES = [
    (r".{8,}",           "At least 8 characters"),
    (r"[A-Z]",           "At least one uppercase letter"),
    (r"[a-z]",           "At least one lowercase letter"),
    (r"\d",              "At least one digit (0-9)"),
    (r"[!@#$%^&*(),.?\":{}|<>]", "At least one special character"),
]


def validate_password(password: str) -> list[str]:
    """Return a list of violated rule messages. Empty list = password is valid."""
    errors = []
    for pattern, message in PASSWORD_RULES:
        if not re.search(pattern, password):
            errors.append(message)
    return errors


# ─── Hashing ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt and return the hash string."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ─── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(user_id: int, email: str) -> str:
    """Create a signed JWT containing user_id and email with a token version."""
    from src.infrastructure.cache.redis_client import redis_client
    version_key = f"user_token_version:{user_id}"
    version = redis_client.get(version_key)
    if not version:
        version = "1"
        redis_client.set(version_key, "1")

    expire = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "version": int(version)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.
    Raises JWTError if invalid or expired.
    Returns the payload dict on success.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def revoke_user_tokens(user_id: int) -> None:
    """Increment the user's token version in Redis to invalidate all existing tokens."""
    from src.infrastructure.cache.redis_client import redis_client
    version_key = f"user_token_version:{user_id}"
    redis_client.incr(version_key)
