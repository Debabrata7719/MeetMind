"""
api/routes/recording.py
"""

import traceback
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.infrastructure.recording.recorder import start_recording, stop_recording
from src.application.meeting_service import process_meeting
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.application.auth_service import save_meeting

router = APIRouter()

# Scoped in-memory stream state per user
active_recordings = {}


@router.post("/start-recording")
async def start_rec(user: dict = Depends(get_current_user)):
    try:
        stream = start_recording()
        active_recordings[user["user_id"]] = stream
        return {"message": "Recording started"}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording failed to start")


@router.post("/stop-recording")
async def stop_rec(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = active_recordings.pop(user["user_id"], None)

    if stream is None:
        raise HTTPException(400, "Recording not started")

    try:
        meeting_id = uuid4().hex
        audio_path = f"uploads/{meeting_id}.wav"
        
        # Stop recording and write to the unique path
        await run_in_threadpool(stop_recording, stream, audio_path)

        # Save meeting to database first under this user
        save_meeting(db, meeting_id, user["user_id"], "Live Recording")

        # Process the saved meeting second
        await run_in_threadpool(process_meeting, str(audio_path), meeting_id)

        return {
            "message": "Recording stopped & processed",
            "meeting_id": meeting_id,
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording processing failed")
