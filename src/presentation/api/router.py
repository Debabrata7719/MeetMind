"""
api/router.py

Registers all route modules into a single APIRouter.
main.py includes this one router — nothing else needed there.
"""

from fastapi import APIRouter

from src.presentation.api.routes.upload import router as upload_router
from src.presentation.api.routes.recording import router as recording_router
from src.presentation.api.routes.meeting import router as meeting_router
from src.presentation.api.routes.download import router as download_router
from src.presentation.api.routes.status import router as status_router
from src.presentation.api.routes.dashboard import router as dashboard_router
from src.presentation.api.routes.ws import router as ws_router
from src.presentation.api.routes.webhooks import router as webhooks_router
from src.presentation.api.routes.live import router as live_router

api_router = APIRouter()

api_router.include_router(upload_router)
api_router.include_router(recording_router)
api_router.include_router(meeting_router)
api_router.include_router(download_router)
api_router.include_router(status_router)
api_router.include_router(dashboard_router)
api_router.include_router(ws_router)
api_router.include_router(webhooks_router)
api_router.include_router(live_router)
