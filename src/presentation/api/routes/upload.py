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

class S3UploadRequest(BaseModel):
    file_key: str
    original_name: str

@router.get("/upload/s3-presigned")
@limiter.limit("10/minute")
def get_s3_presigned_url(request: Request, filename: str, filetype: str, user: dict = Depends(get_current_user)):
    """Generate an S3 presigned POST policy for direct browser uploads."""
    import boto3
    from botocore.config import Config
    
    s3_bucket = os.getenv("AWS_S3_BUCKET")
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    if not (s3_bucket and aws_key and aws_secret):
        raise HTTPException(500, "AWS S3 credentials or bucket name are not configured")
        
    from uuid import uuid4
    unique_id = uuid4().hex
    # Sanitize filename to prevent path traversal
    sanitized_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    file_key = f"uploads/{unique_id}-{sanitized_filename}"
    
    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            config=Config(signature_version="s3v4"),
            region_name="ap-south-1"  # Mumbai region
        )
        
        presigned_post = s3_client.generate_presigned_post(
            Bucket=s3_bucket,
            Key=file_key,
            Fields={"acl": "public-read", "Content-Type": filetype},
            Conditions=[
                {"acl": "public-read"},
                {"Content-Type": filetype},
                ["content-length-range", 0, 500 * 1024 * 1024]  # Limit to 500MB
            ],
            ExpiresIn=3600
        )
        
        return {
            "url": presigned_post["url"],
            "fields": presigned_post["fields"],
            "file_key": file_key
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate S3 presigned URL: {str(e)}")


@router.post("/upload")
@limiter.limit("5/hour")
def upload(
    request: Request,
    payload: S3UploadRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts the direct S3 file key from the frontend.
    Bypasses backend file storage completely during upload.
    """
    s3_bucket = os.getenv("AWS_S3_BUCKET")
    if not s3_bucket:
        raise HTTPException(500, "AWS S3 bucket name is not configured")

    # Construct the public S3 URL that AssemblyAI can stream directly
    file_url = f"https://{s3_bucket}.s3.ap-south-1.amazonaws.com/{payload.file_key}"

    from uuid import uuid4
    meeting_id = uuid4().hex
    
    try:
        # Save meeting metadata
        save_meeting(db, meeting_id, user["user_id"], payload.original_name, 0)

        # Initialize job status in Redis as "queued"
        set_job_queued(meeting_id)

        # Kick off the pipeline in Celery using the S3 URL
        process_meeting_task.delay(file_url, meeting_id)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, "Failed to start meeting processing")

    return {
        "message": "Upload received — processing started",
        "meeting_id": meeting_id,
    }
