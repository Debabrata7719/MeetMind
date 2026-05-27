"""
api/routes/upload.py

POST /upload — accept MP4/MP3/WAV, save file, kick off pipeline in background.
Returns immediately with meeting_id so the frontend can poll /status/{meeting_id}.
Requires authentication (httpOnly JWT cookie).
"""

from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks

from app.services import process_meeting
from app.core.job_progress import set_job_queued
from auth.dependencies import get_current_user
from auth.db import save_meeting

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mp3", ".wav"}


@router.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only mp4/mp3/wav allowed")

    from uuid import uuid4
    meeting_id = uuid4().hex
    file_path = UPLOAD_DIR / f"{meeting_id}{ext}"
    original_name = Path(file.filename).stem  # use filename as initial meeting name

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

        # Save meeting to MySQL immediately so it appears in history
        save_meeting(meeting_id, user["user_id"], original_name)

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
