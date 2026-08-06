import os
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

# We use Redis as the storage backend for rate limits.
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

def get_user_identifier(request: Request) -> str:
    """
    Identifies the user for rate limiting. 
    First tries to extract the email from the JWT cookie. 
    Falls back to the IP address for unauthenticated routes (like /login or /register).
    """
    token = request.cookies.get("access_token")
    if token:
        try:
            from src.application.security import decode_access_token
            payload = decode_access_token(token)
            if "email" in payload:
                return payload["email"]
        except Exception:
            pass
            
    return get_remote_address(request)

limiter = Limiter(key_func=get_user_identifier, storage_uri=redis_url)
