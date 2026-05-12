"""
api/models.py

Pydantic request/response models for all API endpoints.
"""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    meeting_id: str


class NotesRequest(BaseModel):
    meeting_id: str


class MeetingName(BaseModel):
    meeting_id: str
    name: str
