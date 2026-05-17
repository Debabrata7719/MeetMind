"""
api/routes/meeting.py

All endpoints now require an authenticated user (httpOnly JWT cookie).
Meetings are stored in MySQL, scoped per user_id.

POST /notes            — generate highlights (user must own the meeting)
POST /chat             — ask a question    (user must own the meeting)
POST /set-meeting-name — save name         (user must own the meeting)
GET  /meetings         — list only the current user's meetings
"""

import traceback
from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool

from app.services import generate_notes, ask_question
from api.models import ChatRequest, NotesRequest, MeetingName
from auth.dependencies import get_current_user
from auth.db import get_user_meetings, update_meeting_name, meeting_belongs_to_user

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _assert_ownership(meeting_id: str, user_id: int) -> None:
    """Raise 403 if the meeting does not belong to this user."""
    if not meeting_belongs_to_user(meeting_id, user_id):
        raise HTTPException(403, "Meeting not found or access denied")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/notes")
async def notes(payload: NotesRequest, user: dict = Depends(get_current_user)):
    _assert_ownership(payload.meeting_id, user["user_id"])
    try:
        result = await run_in_threadpool(generate_notes, payload.meeting_id)
        return {"notes": result}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Notes generation failed")


@router.post("/chat")
async def chat(payload: ChatRequest, user: dict = Depends(get_current_user)):
    _assert_ownership(payload.meeting_id, user["user_id"])
    try:
        answer = await run_in_threadpool(
            ask_question, payload.question, payload.meeting_id
        )
        return {"answer": answer}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Chat failed")


@router.post("/set-meeting-name")
def set_meeting_name(data: MeetingName, user: dict = Depends(get_current_user)):
    updated = update_meeting_name(data.meeting_id, user["user_id"], data.name)
    if not updated:
        raise HTTPException(404, "Meeting not found or access denied")
    return {"status": "saved"}


@router.get("/meetings")
def list_meetings(user: dict = Depends(get_current_user)):
    return get_user_meetings(user["user_id"])
