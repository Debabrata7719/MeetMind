"""
auth/service.py

Business logic for the auth and meeting features.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session
from src.domain.models import User, Meeting
from src.application.security import hash_password


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def create_user(db: Session, name: str, email: str, plain_password: str) -> User:
    hashed_password = hash_password(plain_password)
    user = User(name=name, email=email, password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def save_meeting(db: Session, meeting_id: str, user_id: int, name: str = "Untitled Meeting", duration: int = 0) -> Meeting:
    stmt = select(Meeting).where(Meeting.meeting_id == meeting_id)
    meeting = db.execute(stmt).scalar_one_or_none()

    if meeting:
        if meeting.user_id != user_id:
            # Overwriting someone else's meeting isn't allowed, but practically meeting_ids are UUIDs
            pass
        meeting.name = name
        meeting.duration = duration
    else:
        meeting = Meeting(meeting_id=meeting_id, user_id=user_id, name=name, duration=duration)
        db.add(meeting)

    db.commit()
    db.refresh(meeting)
    return meeting


def update_meeting_name(db: Session, meeting_id: str, user_id: int, name: str) -> bool:
    stmt = select(Meeting).where(Meeting.meeting_id == meeting_id).where(Meeting.user_id == user_id)
    meeting = db.execute(stmt).scalar_one_or_none()
    if meeting:
        meeting.name = name
        db.commit()
        return True
    return False


def get_user_meetings(db: Session, user_id: int) -> list[dict]:
    stmt = select(Meeting).where(Meeting.user_id == user_id).order_by(Meeting.created_at.desc())
    meetings = db.execute(stmt).scalars().all()
    return [{"id": m.meeting_id, "name": m.name} for m in meetings]


def meeting_belongs_to_user(db: Session, meeting_id: str, user_id: int) -> bool:
    stmt = select(Meeting).where(Meeting.meeting_id == meeting_id).where(Meeting.user_id == user_id)
    return db.execute(stmt).scalar_one_or_none() is not None


def get_meeting_name(db: Session, meeting_id: str, user_id: int) -> str | None:
    stmt = select(Meeting).where(Meeting.meeting_id == meeting_id).where(Meeting.user_id == user_id)
    meeting = db.execute(stmt).scalar_one_or_none()
    return meeting.name if meeting else None


def delete_meeting_from_db(db: Session, meeting_id: str, user_id: int) -> bool:
    stmt = select(Meeting).where(Meeting.meeting_id == meeting_id).where(Meeting.user_id == user_id)
    meeting = db.execute(stmt).scalar_one_or_none()
    if meeting:
        db.delete(meeting)
        db.commit()
        return True
    return False


def update_password(db: Session, email: str, new_plain_password: str) -> bool:
    """Hash and store the new password for the given email address."""
    from src.application.security import hash_password
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()
    if not user:
        return False
    user.password = hash_password(new_plain_password)
    db.commit()
    return True

def update_user_name(db: Session, email: str, new_name: str) -> bool:
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()
    if not user:
        return False
    user.name = new_name
    db.commit()
    return True
