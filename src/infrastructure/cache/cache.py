import json
import inspect
from functools import wraps
from fastapi import Request
from starlette.concurrency import run_in_threadpool
from src.infrastructure.cache.redis_client import redis_client

def cache_response(ttl_seconds: int = 60):
    """
    Caches JSON responses for FastAPI routes based on the request URL and user ID.
    Assumes the route has a `request: Request` and `user: dict` injected.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            user: dict = kwargs.get("user")
            
            if not request or not user:
                # Fallback if params are missing
                if inspect.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                return await run_in_threadpool(func, *args, **kwargs)
                
            user_id = user.get("user_id")
            path = request.url.path
            
            cache_key = f"cache:api:{user_id}:{path}"
            cached_data = redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
                
            # Execute the actual endpoint
            if inspect.iscoroutinefunction(func):
                response = await func(*args, **kwargs)
            else:
                response = await run_in_threadpool(func, *args, **kwargs)
            
            # Cache the response
            try:
                redis_client.set(cache_key, json.dumps(response), ex=ttl_seconds)
            except Exception as e:
                print(f"[Warning] Failed to cache response: {e}")
                
            return response
        return wrapper
    return decorator

def invalidate_user_cache(user_id: int):
    """
    Invalidates all API caches for a specific user.
    """
    try:
        keys = redis_client.keys(f"cache:api:{user_id}:*")
        if keys:
            redis_client.delete(*keys)
    except Exception:
        pass
