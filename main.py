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

app = FastAPI(title="Meeting Intelligence System")

# ─── CORS ──────────────────────────────────────────────────────────────────────
# allow_credentials=True + explicit origins required for httpOnly cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://meeting-intelligence-system-one.vercel.app",
    ],
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
