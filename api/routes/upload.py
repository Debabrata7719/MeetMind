"""
api/routes/upload.py
"""

from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.core.rate_limit import limiter
import filetype

from app.services import process_meeting
from app.core.job_progress import set_job_queued
from auth.dependencies import get_current_user
from auth.db import get_db
from auth.service import save_meeting
import subprocess
from app.core.config import FFMPEG_EXE
import os

def get_duration(file_path: str) -> int:
    try:
        ffprobe_exe = FFMPEG_EXE.replace("ffmpeg.exe", "ffprobe.exe")
        if not os.path.exists(ffprobe_exe):
            ffprobe_exe = "ffprobe"
        result = subprocess.run(
            [ffprobe_exe, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return int(float(result.stdout.strip()))
    except Exception:
        return 0

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mp3", ".wav"}


@router.post("/upload")
@limiter.limit("5/hour")
async def upload(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only mp4/mp3/wav allowed")

    from uuid import uuid4
    meeting_id = uuid4().hex
    file_path = UPLOAD_DIR / f"{meeting_id}{ext}"
    original_name = Path(file.filename).stem  # use filename as initial meeting name

    # 1. Early Content-Type Check
    ALLOWED_MIME_PREFIXES = ("video/", "audio/")
    if not file.content_type.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(400, "Invalid content type in header. Must be video or audio.")

    # 2. Deep Byte Sniffing Check
    chunk = await file.read(2048)
    kind = filetype.guess(chunk)
    
    if kind is None or not kind.mime.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(400, "Invalid file signature. File is not a valid video or audio format.")
        
    # Reset cursor so the entire file can be written to disk
    await file.seek(0)

    try:
        total_size = 0
        MAX_SIZE = 200 * 1024 * 1024  # 200 MB

        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_SIZE:
                    f.close()
                    file_path.unlink()  # Clean up partial file
                    raise HTTPException(413, "File exceeds 200MB limit")
                f.write(chunk)

        # Calculate duration and save meeting
        duration = get_duration(str(file_path))
        save_meeting(db, meeting_id, user["user_id"], original_name, duration)

        # Initialize job status in Redis as "queued"
        set_job_queued(meeting_id)

        # Kick off the pipeline in the background — response returns immediately
        background_tasks.add_task(process_meeting, str(file_path), meeting_id)

    except HTTPException:
        raise
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, "Upload failed")

    return {
        "message": "Upload received — processing started",
        "meeting_id": meeting_id,
    }
