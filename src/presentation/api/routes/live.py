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
        
        # Reset the Redis live transcript buffer and sequence
        redis_key = f"live_transcript:{meeting_id}"
        redis_client.delete(redis_key)
        redis_client.delete(f"live_transcript_seq:{meeting_id}")
        
        # Initialize job status to processing
        set_job_queued(meeting_id)
        
        return {"status": "started", "meeting_id": meeting_id}
    except PermissionError as pe:
        raise HTTPException(403, str(pe))
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
        # Enforce maximum chunk size of 15MB
        MAX_CHUNK_SIZE = 15 * 1024 * 1024
        
        # Enforce valid audio content type or extension
        content_type = file.content_type or ""
        allowed_extensions = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".aac", ".flac"}
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".webm"
        if ext not in allowed_extensions and not content_type.startswith("audio/"):
            raise HTTPException(400, "Invalid file format. Only audio files are allowed.")
            
        # Save uploaded chunk to temp path
        os.makedirs(os.path.join("data", "intermediate"), exist_ok=True)
        chunk_filename = f"{meeting_id}_{uuid.uuid4().hex}{ext}"
        temp_path = os.path.join("data", "intermediate", chunk_filename)
        
        total_bytes = 0
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024) # 1MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_CHUNK_SIZE:
                    buffer.close()
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    raise HTTPException(413, "Chunk payload too large (max 15MB)")
                buffer.write(chunk)
            
        # Increment sequence counter in Redis
        index = redis_client.incr(f"live_transcript_seq:{meeting_id}")
        
        # Trigger Celery chunk transcription task
        transcribe_live_chunk_task.delay(temp_path, meeting_id, index)
        
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
        segments_dict = redis_client.hgetall(redis_key)
        sorted_keys = sorted(segments_dict.keys(), key=int)
        decoded_segments = [segments_dict[k] for k in sorted_keys]
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
