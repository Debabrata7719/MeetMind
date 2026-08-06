"""
api/routes/status.py
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from src.infrastructure.cache.job_progress import get_job_status
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.application.auth_service import meeting_belongs_to_user

router = APIRouter()


@router.get("/status/{meeting_id}")
def job_status(
    meeting_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the caller owns this meeting
    if not meeting_belongs_to_user(db, meeting_id, user["user_id"]):
        raise HTTPException(403, "Meeting not found or access denied")

    status = get_job_status(meeting_id)
    if status is None:
        # No job in Redis — meeting may already be fully processed (old meeting)
        return {
            "status": "done",
            "stage": "done",
            "detail": "",
            "progress": 100,
            "error": "",
        }

    return status
