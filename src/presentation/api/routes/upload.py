import os
import time
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from src.presentation.core.rate_limit import limiter
import cloudinary
import cloudinary.utils

from src.application.meeting_service import process_meeting
from src.infrastructure.workers.tasks.pipeline_tasks import process_meeting_task
from src.infrastructure.cache.job_progress import set_job_queued
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.application.auth_service import save_meeting

router = APIRouter()

class CloudinaryUploadRequest(BaseModel):
    file_url: str
    original_name: str

@router.get("/upload/signature")
@limiter.limit("10/minute")
def get_cloudinary_signature(request: Request, user: dict = Depends(get_current_user)):
    """Generate a secure signature for direct-to-cloud uploads."""
    timestamp = int(time.time())
    
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    if not (cloud_name and api_key and api_secret):
        raise HTTPException(500, "Cloudinary is not configured")
        
    signature = cloudinary.utils.api_sign_request(
        {"timestamp": timestamp},
        api_secret
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "api_key": api_key,
        "cloud_name": cloud_name
    }


@router.post("/upload")
@limiter.limit("5/hour")
def upload(
    request: Request,
    payload: CloudinaryUploadRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts the direct Cloudinary URL from the frontend.
    Bypasses backend file storage completely.
    """
    if not payload.file_url.startswith("http"):
        raise HTTPException(400, "Invalid file URL")

    from uuid import uuid4
    meeting_id = uuid4().hex
    
    try:
        # Save meeting metadata
        save_meeting(db, meeting_id, user["user_id"], payload.original_name, 0)

        # Initialize job status in Redis as "queued"
        set_job_queued(meeting_id)

        # Kick off the pipeline in Celery using the Cloudinary URL
        process_meeting_task.delay(payload.file_url, meeting_id)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, "Failed to start meeting processing")

    return {
        "message": "Upload received — processing started",
        "meeting_id": meeting_id,
    }
