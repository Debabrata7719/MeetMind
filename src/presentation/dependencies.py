"""
auth/dependencies.py

Reusable FastAPI dependency that reads the httpOnly JWT cookie
and returns the decoded current user. Inject with Depends(get_current_user).
"""

from fastapi import Request, HTTPException
from src.application.security import decode_access_token

COOKIE_NAME = "access_token"


def get_current_user(request: Request) -> dict:
    """Return {'user_id': int, 'email': str} or raise 401."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
        token_version = payload.get("version")
        
        # Verify token version in Redis
        from src.infrastructure.cache.redis_client import redis_client
        current_version = redis_client.get(f"user_token_version:{user_id}")
        if current_version is not None and token_version is not None:
            if int(current_version) != int(token_version):
                raise HTTPException(status_code=401, detail="Session has been revoked")
        elif current_version is None and token_version is not None:
            redis_client.set(f"user_token_version:{user_id}", str(token_version))

        return {"user_id": user_id, "email": payload["email"]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
