from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from auth.dependencies import get_current_user
from auth.db import get_db
from auth.models import Meeting, AIHighlight, ChatMessage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user["user_id"]
    
    # 1. Total Meetings
    total_meetings = db.query(Meeting).filter(Meeting.user_id == user_id).count()
    
    # 2. Recording Time (sum of durations in seconds)
    total_duration_sec = db.query(func.sum(Meeting.duration)).filter(Meeting.user_id == user_id).scalar()
    total_duration_sec = total_duration_sec or 0
    
    # 3. AI Highlights Count (count distinct meetings that have highlights)
    ai_highlights = db.query(func.count(func.distinct(AIHighlight.meeting_id)))\
                      .select_from(AIHighlight)\
                      .join(Meeting)\
                      .filter(Meeting.user_id == user_id)\
                      .scalar() or 0
    
    # 4. Questions Asked (user role chat messages)
    questions_asked = db.query(ChatMessage).join(Meeting).filter(
        Meeting.user_id == user_id, 
        ChatMessage.role == 'user'
    ).count()
    
    return {
        "total_meetings": total_meetings,
        "total_recording_time_sec": total_duration_sec,
        "ai_highlights": ai_highlights,
        "questions_asked": questions_asked
    }
