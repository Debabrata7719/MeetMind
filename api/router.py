"""
api/router.py

Registers all route modules into a single APIRouter.
main.py includes this one router — nothing else needed there.
"""

from fastapi import APIRouter

from api.routes.upload import router as upload_router
from api.routes.recording import router as recording_router
from api.routes.meeting import router as meeting_router
from api.routes.download import router as download_router
from api.routes.status import router as status_router

api_router = APIRouter()

api_router.include_router(upload_router)
api_router.include_router(recording_router)
api_router.include_router(meeting_router)
api_router.include_router(download_router)
api_router.include_router(status_router)
