from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.domain.models import WebhookEndpoint

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

class WebhookCreate(BaseModel):
    url: str
    events: list[str] = ["meeting.processed"]

@router.post("")
def create_webhook(req: WebhookCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = secrets.token_hex(32)
    webhook = WebhookEndpoint(
        user_id=user["user_id"],
        url=req.url,
        secret=secret,
        events=req.events
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return {"id": webhook.id, "url": webhook.url, "secret": secret}

@router.get("")
def list_webhooks(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    webhooks = db.query(WebhookEndpoint).filter_by(user_id=user["user_id"]).all()
    return [{"id": w.id, "url": w.url, "is_active": w.is_active} for w in webhooks]

@router.delete("/{webhook_id}")
def delete_webhook(webhook_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    webhook = db.query(WebhookEndpoint).filter_by(id=webhook_id, user_id=user["user_id"]).first()
    if not webhook:
        raise HTTPException(404, "Webhook not found")
    db.delete(webhook)
    db.commit()
    return {"status": "deleted"}
