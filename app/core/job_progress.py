"""
app/core/job_progress.py

Redis-backed job progress tracker for meeting processing pipeline.
Each meeting_id gets a Redis hash with:
  - status:  queued | processing | done | failed
  - stage:   extracting_audio | transcribing | embedding | generating_highlights | done
  - detail:  e.g. "chunk 2/5"
  - progress: 0–100
  - error:   error message (only when status=failed)

Keys auto-expire after 2 hours so finished jobs don't leak memory.
"""

import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_redis = redis.from_url(REDIS_URL, decode_responses=True)

JOB_TTL = 7200  # 2 hours


def _key(meeting_id: str) -> str:
    return f"job:{meeting_id}"


def set_job_queued(meeting_id: str) -> None:
    """Initialize a job as queued (called right after upload, before processing starts)."""
    _redis.hset(_key(meeting_id), mapping={
        "status": "queued",
        "stage": "queued",
        "detail": "",
        "progress": "0",
        "error": "",
    })
    _redis.expire(_key(meeting_id), JOB_TTL)


def update_progress(
    meeting_id: str,
    stage: str,
    progress: int,
    detail: str = "",
) -> None:
    """Update the current stage and progress percentage."""
    _redis.hset(_key(meeting_id), mapping={
        "status": "processing",
        "stage": stage,
        "detail": detail,
        "progress": str(min(progress, 100)),
        "error": "",
    })
    _redis.expire(_key(meeting_id), JOB_TTL)


def set_job_done(meeting_id: str) -> None:
    """Mark the job as complete."""
    _redis.hset(_key(meeting_id), mapping={
        "status": "done",
        "stage": "done",
        "detail": "",
        "progress": "100",
        "error": "",
    })
    _redis.expire(_key(meeting_id), JOB_TTL)


def set_job_failed(meeting_id: str, error_message: str) -> None:
    """Mark the job as failed with an error message."""
    _redis.hset(_key(meeting_id), mapping={
        "status": "failed",
        "stage": "failed",
        "detail": "",
        "progress": "0",
        "error": error_message,
    })
    _redis.expire(_key(meeting_id), JOB_TTL)


def get_job_status(meeting_id: str) -> dict | None:
    """Read current job status. Returns None if no job exists for this meeting_id."""
    data = _redis.hgetall(_key(meeting_id))
    if not data:
        return None
    return {
        "status": data.get("status", "unknown"),
        "stage": data.get("stage", ""),
        "detail": data.get("detail", ""),
        "progress": int(data.get("progress", 0)),
        "error": data.get("error", ""),
    }
