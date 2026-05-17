"""
auth/dependencies.py

Reusable FastAPI dependency that reads the httpOnly JWT cookie
and returns the decoded current user. Inject with Depends(get_current_user).
"""

from fastapi import Request, HTTPException
from auth.security import decode_access_token

COOKIE_NAME = "access_token"


def get_current_user(request: Request) -> dict:
    """Return {'user_id': int, 'email': str} or raise 401."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        return {"user_id": int(payload["sub"]), "email": payload["email"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
