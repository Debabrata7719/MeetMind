"""
api/routes/status.py

GET /status/{meeting_id} — return real-time job progress from Redis.
Requires authentication; verifies meeting ownership.
"""

from fastapi import APIRouter, HTTPException, Depends

from app.core.job_progress import get_job_status
from auth.dependencies import get_current_user
from auth.db import meeting_belongs_to_user

router = APIRouter()


@router.get("/status/{meeting_id}")
def job_status(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    # Verify the caller owns this meeting
    if not meeting_belongs_to_user(meeting_id, user["user_id"]):
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
