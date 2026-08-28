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
from src.infrastructure.database import get_db, SessionLocal
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

from fastapi.responses import StreamingResponse
from src.infrastructure.ai.highlights import extract_highlights_stream

@router.post("/notes")
@limiter.limit("5/minute")
async def notes(request: Request, payload: NotesRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    _assert_ownership(db, payload.meeting_id, user["user_id"])
    try:
        async def stream_generator():
            full_notes = ""
            async for chunk in extract_highlights_stream(payload.meeting_id):
                full_notes += chunk
                yield chunk
            
            # Save highlight to database for metrics (if not already saved by Celery)
            from src.infrastructure.database import SessionLocal
            local_db = SessionLocal()
            try:
                stmt = select(Meeting).where(Meeting.meeting_id == payload.meeting_id)
                meeting = local_db.execute(stmt).scalar_one_or_none()
                if meeting and full_notes:
                    existing = local_db.execute(select(AIHighlight).where(AIHighlight.meeting_id == meeting.id)).scalar_one_or_none()
                    if existing:
                        existing.content = full_notes
                    else:
                        local_db.add(AIHighlight(meeting_id=meeting.id, content=full_notes))
                    local_db.commit()
            except Exception as db_err:
                print(f"[DB Error] Failed to write highlight metrics: {db_err}")
                local_db.rollback()
            finally:
                local_db.close()

        return StreamingResponse(stream_generator(), media_type="text/plain")
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
    print(f"[WS Chat] Handshake check. Cookie token present: {bool(token)}")
    if not token:
        print("[WS Chat] Authentication failed: Missing access_token cookie")
        await websocket.close(code=1008, reason="Missing authentication token")
        return
        
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub") or payload.get("user_id")
        print(f"[WS Chat] Decoded token. User ID string: {user_id_str}")
        if not user_id_str:
            raise ValueError("Token missing user ID subject claim")
        user_id = int(user_id_str)
    except Exception as e:
        print(f"[WS Chat] Authentication failed: Invalid token ({e})")
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    # Now handle messages verified with short-lived database checks
    try:
        with SessionLocal() as db:
            if not meeting_belongs_to_user(db, meeting_id, user_id):
                print(f"[WS Chat] Ownership check failed for user {user_id} and meeting {meeting_id}")
                await websocket.close(code=1008, reason="Meeting not found or access denied")
                return
    except Exception as db_err:
        print(f"[WS Chat] Initial ownership check database error: {db_err}")
        await websocket.close(code=1011, reason="Database connection error")
        return
            
    print(f"[WS Chat] Connection fully established for meeting {meeting_id}")
    is_generating = False
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[WS Chat] Received raw message: {data}")
            
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

            print(f"[WS Chat] Processing question: {question}")
            is_generating = True
            
            try:
                # Save user question to DB in short-lived transaction
                db_meeting_id = None
                with SessionLocal() as db:
                    meeting = db.execute(select(Meeting).where(Meeting.meeting_id == meeting_id)).scalar_one_or_none()
                    if meeting:
                        db_meeting_id = meeting.id
                        db.add(ChatMessage(meeting_id=meeting.id, role='user', content=question))
                        db.commit()

                # Stream the answer
                full_answer = ""
                print("[WS Chat] Querying Gemini and starting stream...")
                async for chunk in ask_question_stream(question, meeting_id, user_id):
                    full_answer += chunk
                    await websocket.send_text(chunk)
                    
                print(f"[WS Chat] Stream finished. Response length: {len(full_answer)}")
                # Indicate end of stream
                await websocket.send_text("[DONE]")

                # Save AI answer to DB in short-lived transaction
                if db_meeting_id and full_answer:
                    with SessionLocal() as db:
                        db.add(ChatMessage(meeting_id=db_meeting_id, role='ai', content=full_answer))
                        db.commit()
            except Exception as stream_err:
                print(f"[WS Chat] Streaming error: {stream_err}")
                traceback.print_exc()
                await websocket.send_text(f"[ERROR] {str(stream_err)}")
            finally:
                is_generating = False

    except WebSocketDisconnect:
        print(f"[WS Chat] WebSocket disconnected for meeting {meeting_id}")
    except Exception as e:
        print(f"[WS Chat] WebSocket loop error: {e}")
        traceback.print_exc()
        try:
            await websocket.send_text(f"[ERROR] {str(e)}")
            await websocket.close(code=1011)
        except:
            pass


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
