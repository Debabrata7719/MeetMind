"""
main.py

Entry point for the Meeting Intelligence System.
Keeps app setup, CORS, and health check only.
All routes live in api/routes/ and auth/.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.router import api_router
from auth.router import router as auth_router
from app.core.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
import os
from dotenv import load_dotenv

load_dotenv()

is_prod = os.getenv("ENV") == "production"

app = FastAPI(
    title="Meeting Intelligence System",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json"
)
# ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Startup Health Checks & Sweeper ───────────────────────────────────────────
import shutil
import redis
from sqlalchemy import text
from auth.db import engine

@app.on_event("startup")
async def on_startup():
    print("[Startup] Running system health checks...")
    
    # 1. Check API Keys
    if not os.getenv("GROQ_API_KEY"):
        raise RuntimeError("FATAL: GROQ_API_KEY is missing from environment variables.")
        
    jwt_secret = os.getenv("JWT_SECRET_KEY", "changeme")
    if is_prod and jwt_secret == "changeme":
        raise RuntimeError("FATAL: JWT_SECRET_KEY is still set to 'changeme' in production!")

    # 2. Ping MySQL Database
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        raise RuntimeError(f"FATAL: Could not connect to MySQL database. {e}")

    # 3. Ping Redis
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = redis.Redis.from_url(redis_url)
        r.ping()
    except Exception as e:
        raise RuntimeError(f"FATAL: Could not connect to Redis server. {e}")
        
    print("[Startup] All systems go. Sweeping ghost folders...")

    """
    Sweeps through data/vectordb and automatically deletes any ghost folders 
    left behind due to Windows file locks.
    """
    vectordb_base = os.path.join("data", "vectordb")
    if not os.path.exists(vectordb_base):
        return
        
    for meeting_dir in os.listdir(vectordb_base):
        dir_path = os.path.join(vectordb_base, meeting_dir)
        if os.path.isdir(dir_path):
            sqlite_path = os.path.join(dir_path, "chroma.sqlite3")
            # If the sqlite database is 0 bytes or the folder is totally empty
            if (os.path.exists(sqlite_path) and os.path.getsize(sqlite_path) == 0) or len(os.listdir(dir_path)) == 0:
                try:
                    shutil.rmtree(dir_path)
                    print(f"[Cleanup] Swept ghost vectordb folder: {meeting_dir}")
                except Exception as e:
                    print(f"[Cleanup Warning] Could not sweep {meeting_dir}: {e}")

# ─── CORS ──────────────────────────────────────────────────────────────────────
# allow_credentials=True + explicit origins required for httpOnly cookies
import os
from dotenv import load_dotenv

load_dotenv()

# Default local origins if nothing is set in the environment
DEFAULT_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,https://meeting-intelligence-system-one.vercel.app"

# Read the comma-separated string from .env and split it into a list
cors_origins = os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "API running"}
