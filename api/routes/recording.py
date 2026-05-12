"""
api/routes/recording.py

POST /start-recording  — start live microphone capture.
POST /stop-recording   — stop capture, run full pipeline.
"""

import traceback
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.recording.recorder import start_recording, stop_recording
from app.services import process_meeting

router = APIRouter()

# Module-level stream state (mirrors original main.py behaviour)
stream = None


@router.post("/start-recording")
async def start_rec():
    global stream
    try:
        stream = start_recording()
        return {"message": "Recording started"}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording failed to start")


@router.post("/stop-recording")
async def stop_rec():
    global stream

    if stream is None:
        raise HTTPException(400, "Recording not started")

    try:
        meeting_id = uuid4().hex
        audio_path = stop_recording(stream, "uploads/meeting.wav")
        await run_in_threadpool(process_meeting, str(audio_path), meeting_id)
        stream = None
        return {
            "message": "Recording stopped & processed",
            "meeting_id": meeting_id
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Recording processing failed")
