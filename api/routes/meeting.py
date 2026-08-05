"""
api/routes/meeting.py
"""

import traceback
from fastapi import APIRouter, HTTPException, Depends, Request
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.services import generate_notes, ask_question, delete_meeting_data
from api.models import ChatRequest, NotesRequest, MeetingName
from auth.dependencies import get_current_user
from auth.db import get_db
from auth.service import get_user_meetings, update_meeting_name, meeting_belongs_to_user, delete_meeting_from_db
from auth.models import Meeting, AIHighlight, ChatMessage
from sqlalchemy import select
from app.core.rate_limit import limiter

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _assert_ownership(db: Session, meeting_id: str, user_id: int) -> None:
    if not meeting_belongs_to_user(db, meeting_id, user_id):
        raise HTTPException(403, "Meeting not found or access denied")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/notes")
@limiter.limit("5/minute")
async def notes(request: Request, payload: NotesRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_ownership(db, payload.meeting_id, user["user_id"])
    try:
        result = await run_in_threadpool(generate_notes, payload.meeting_id)
        
        # Save highlight to database for metrics
        stmt = select(Meeting).where(Meeting.meeting_id == payload.meeting_id)
        meeting = db.execute(stmt).scalar_one_or_none()
        if meeting:
            db.add(AIHighlight(meeting_id=meeting.id, content=result))
            db.commit()

        return {"notes": result}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Notes generation failed")


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, payload: ChatRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_ownership(db, payload.meeting_id, user["user_id"])
    try:
        # Save user question to database for metrics
        stmt = select(Meeting).where(Meeting.meeting_id == payload.meeting_id)
        meeting = db.execute(stmt).scalar_one_or_none()
        if meeting:
            db.add(ChatMessage(meeting_id=meeting.id, role='user', content=payload.question))
            db.commit()

        answer = await run_in_threadpool(
            ask_question, payload.question, payload.meeting_id, user["user_id"]
        )

        # Save AI answer
        if meeting:
            db.add(ChatMessage(meeting_id=meeting.id, role='ai', content=answer))
            db.commit()

        return {"answer": answer}
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Chat failed")


@router.post("/set-meeting-name")
def set_meeting_name(data: MeetingName, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = update_meeting_name(db, data.meeting_id, user["user_id"], data.name)
    if not updated:
        raise HTTPException(404, "Meeting not found or access denied")
    return {"status": "saved"}


@router.get("/meetings")
def list_meetings(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_meetings(db, user["user_id"])


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_ownership(db, meeting_id, user["user_id"])
    
    deleted_from_db = delete_meeting_from_db(db, meeting_id, user["user_id"])
    if not deleted_from_db:
        raise HTTPException(404, "Meeting not found")
        
    await run_in_threadpool(delete_meeting_data, meeting_id, user["user_id"])
    
    return {"status": "deleted"}
