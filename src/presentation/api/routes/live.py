import os
import uuid
import traceback
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.application.auth_service import save_meeting, meeting_belongs_to_user
from src.infrastructure.cache.redis_client import redis_client
from src.infrastructure.cache.job_progress import set_job_queued
from src.infrastructure.workers.tasks.pipeline_tasks import transcribe_live_chunk_task, aggregate_live_meeting_task

router = APIRouter(prefix="/meetings")

@router.post("/{meeting_id}/live/start")
async def start_live_session(
    meeting_id: str,
    name: str = "Live Meeting",
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Create meeting entry in Postgres
        save_meeting(db, meeting_id, user["user_id"], name)
        
        # Reset the Redis live transcript buffer
        redis_key = f"live_transcript:{meeting_id}"
        redis_client.delete(redis_key)
        
        # Initialize job status to processing
        set_job_queued(meeting_id)
        
        return {"status": "started", "meeting_id": meeting_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Failed to start live session: {e}")

@router.post("/{meeting_id}/live/chunk")
async def upload_live_chunk(
    meeting_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify meeting belongs to user
    if not meeting_belongs_to_user(db, meeting_id, user["user_id"]):
        raise HTTPException(403, "Access denied")
        
    try:
        # Save uploaded chunk to temp path
        os.makedirs(os.path.join("data", "intermediate"), exist_ok=True)
        ext = os.path.splitext(file.filename)[1] if file.filename else ".webm"
        if not ext:
            ext = ".webm"
        chunk_filename = f"{meeting_id}_{uuid.uuid4().hex}{ext}"
        temp_path = os.path.join("data", "intermediate", chunk_filename)
        
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Trigger Celery chunk transcription task
        transcribe_live_chunk_task.delay(temp_path, meeting_id)
        
        return {"status": "chunk_uploaded", "filename": chunk_filename}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Failed to upload live chunk: {e}")

@router.get("/{meeting_id}/live/transcript")
async def get_live_transcript(
    meeting_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not meeting_belongs_to_user(db, meeting_id, user["user_id"]):
        raise HTTPException(403, "Access denied")
        
    try:
        redis_key = f"live_transcript:{meeting_id}"
        segments = redis_client.lrange(redis_key, 0, -1)
        decoded_segments = [seg.decode('utf-8') for seg in segments]
        return {"meeting_id": meeting_id, "transcript_segments": decoded_segments, "full_transcript": " ".join(decoded_segments)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Failed to fetch live transcript: {e}")

@router.post("/{meeting_id}/live/end")
async def end_live_session(
    meeting_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not meeting_belongs_to_user(db, meeting_id, user["user_id"]):
        raise HTTPException(403, "Access denied")
        
    try:
        # Trigger background aggregation task
        aggregate_live_meeting_task.delay(meeting_id)
        return {"status": "aggregation_started", "meeting_id": meeting_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Failed to end live session: {e}")
