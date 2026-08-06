"""
api/routes/meeting.py
"""

import traceback
from fastapi import APIRouter, HTTPException, Depends, Request
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.application.meeting_service import generate_notes, ask_question, delete_meeting_data
from src.presentation.api.models import ChatRequest, NotesRequest, MeetingName
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.application.auth_service import get_user_meetings, update_meeting_name, meeting_belongs_to_user, delete_meeting_from_db
from src.infrastructure.ai.chat import ask_question_stream
from src.infrastructure.cache.cache import cache_response, invalidate_user_cache
from src.domain.models import Meeting, AIHighlight, ChatMessage
from sqlalchemy import select
from src.presentation.core.rate_limit import limiter

from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
import json

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
        
        # Save highlight to database for metrics (if not already saved by Celery)
        stmt = select(Meeting).where(Meeting.meeting_id == payload.meeting_id)
        meeting = db.execute(stmt).scalar_one_or_none()
        if meeting:
            existing = db.execute(select(AIHighlight).where(AIHighlight.meeting_id == meeting.id)).scalar_one_or_none()
            if not existing:
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


@router.websocket("/ws/chat/{meeting_id}")
async def chat_ws(websocket: WebSocket, meeting_id: str):
    await websocket.accept()
    
    # We must parse authentication manually via cookies or query param since Depends() is tricky in WS
    from src.application.security import decode_access_token
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
        
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise ValueError()
    except Exception:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    # Now handle messages
    db = next(get_db())
    is_generating = False
    try:
        if not meeting_belongs_to_user(db, meeting_id, user_id):
            await websocket.close(code=1008, reason="Meeting not found or access denied")
            return
            
        while True:
            data = await websocket.receive_text()
            
            if is_generating:
                try:
                    await websocket.send_text("[ERROR] Please wait for the current answer to finish.")
                except:
                    pass
                continue
                
            try:
                msg_data = json.loads(data)
                question = msg_data.get("question")
            except Exception:
                question = data
                
            if not question:
                continue

            is_generating = True
            
            try:
                # Save user question to DB
                meeting = db.execute(select(Meeting).where(Meeting.meeting_id == meeting_id)).scalar_one_or_none()
                if meeting:
                    db.add(ChatMessage(meeting_id=meeting.id, role='user', content=question))
                    db.commit()

                # Stream the answer
                full_answer = ""
                async for chunk in ask_question_stream(question, meeting_id, user_id):
                    full_answer += chunk
                    await websocket.send_text(chunk)
                    
                # Indicate end of stream
                await websocket.send_text("[DONE]")

                # Save AI answer to DB
                if meeting and full_answer:
                    db.add(ChatMessage(meeting_id=meeting.id, role='ai', content=full_answer))
                    db.commit()
            finally:
                is_generating = False

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for meeting {meeting_id}")
    except Exception as e:
        traceback.print_exc()
        try:
            await websocket.send_text(f"[ERROR] {str(e)}")
            await websocket.close(code=1011)
        except:
            pass
    finally:
        db.close()


@router.post("/set-meeting-name")
def set_meeting_name(data: MeetingName, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = update_meeting_name(db, data.meeting_id, user["user_id"], data.name)
    if not updated:
        raise HTTPException(404, "Meeting not found or access denied")
    return {"status": "saved"}


@router.get("/meetings")
@cache_response(ttl_seconds=60)
def list_meetings(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_meetings(db, user["user_id"])


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_ownership(db, meeting_id, user["user_id"])
    
    deleted_from_db = delete_meeting_from_db(db, meeting_id, user["user_id"])
    if not deleted_from_db:
        raise HTTPException(404, "Meeting not found")
        
    await run_in_threadpool(delete_meeting_data, meeting_id, user["user_id"])
    
    # Invalidate caches so the frontend sees the deletion immediately
    invalidate_user_cache(user["user_id"])
    
    return {"status": "deleted"}
