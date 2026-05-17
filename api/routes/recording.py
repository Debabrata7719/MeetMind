"""
api/routes/recording.py

POST /start-recording  — start live microphone capture.
POST /stop-recording   — stop capture, run full pipeline, save meeting to MySQL.
Requires authentication (httpOnly JWT cookie).
"""

import traceback
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool

from app.recording.recorder import start_recording, stop_recording
from app.services import process_meeting
from auth.dependencies import get_current_user
from auth.db import save_meeting

router = APIRouter()

# Module-level stream state
stream = None


@router.post("/start-recording")
async def start_rec(user: dict = Depends(get_current_user)):
    global stream
    try:
        stream = start_recording()
        return {"message": "Recording started"}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording failed to start")


@router.post("/stop-recording")
async def stop_rec(user: dict = Depends(get_current_user)):
    global stream

    if stream is None:
        raise HTTPException(400, "Recording not started")

    try:
        meeting_id = uuid4().hex
        audio_path = stop_recording(stream, "uploads/meeting.wav")
        await run_in_threadpool(process_meeting, str(audio_path), meeting_id)
        stream = None

        # Save meeting to MySQL under this user
        save_meeting(meeting_id, user["user_id"], "Live Recording")

        return {
            "message": "Recording stopped & processed",
            "meeting_id": meeting_id,
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording processing failed")
