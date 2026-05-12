"""
api/routes/meeting.py

POST /notes            — generate highlights for a meeting.
POST /chat             — ask a question about a meeting.
POST /set-meeting-name — save a human-readable name for a meeting.
GET  /meetings         — list all saved meetings.
"""

import os
import json
import traceback
from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.services import generate_notes, ask_question
from api.models import ChatRequest, NotesRequest, MeetingName

router = APIRouter()

MEETINGS_FILE = "data/meetings.json"


@router.post("/notes")
async def notes(payload: NotesRequest):
    try:
        result = await run_in_threadpool(generate_notes, payload.meeting_id)
        return {"notes": result}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Notes generation failed")


@router.post("/chat")
async def chat(payload: ChatRequest):
    try:
        answer = await run_in_threadpool(
            ask_question, payload.question, payload.meeting_id
        )
        return {"answer": answer}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Chat failed")


@router.post("/set-meeting-name")
def set_meeting_name(data: MeetingName):
    os.makedirs("data", exist_ok=True)

    if os.path.exists(MEETINGS_FILE):
        with open(MEETINGS_FILE) as f:
            db = json.load(f)
    else:
        db = {}

    db[data.meeting_id] = data.name

    with open(MEETINGS_FILE, "w") as f:
        json.dump(db, f, indent=2)

    return {"status": "saved"}


@router.get("/meetings")
def list_meetings():
    if not os.path.exists(MEETINGS_FILE):
        return []

    with open(MEETINGS_FILE) as f:
        db = json.load(f)

    meetings = [{"id": k, "name": v} for k, v in db.items()]
    meetings.reverse()
    return meetings
