"""
api/routes/upload.py

POST /upload — accepts MP4/MP3/WAV, runs the full pipeline.
"""

from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from starlette.concurrency import run_in_threadpool

from app.services import process_meeting

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mp3", ".wav"}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only mp4/mp3/wav allowed")

    from uuid import uuid4
    meeting_id = uuid4().hex
    file_path = UPLOAD_DIR / f"{meeting_id}{ext}"

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        await run_in_threadpool(process_meeting, str(file_path), meeting_id)

    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, "Pipeline crashed")

    return {
        "message": "meeting processed successfully",
        "meeting_id": meeting_id
    }
