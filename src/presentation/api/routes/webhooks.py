from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import secrets
from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.domain.models import WebhookEndpoint

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

import ipaddress
import socket
from urllib.parse import urlparse

def is_safe_webhook_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Resolve hostname to IPv4/IPv6 address info
        addr_info = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            # Block private, loopback, link-local, reserved, multicast, unspecified IPs
            if (ip.is_loopback or 
                ip.is_private or 
                ip.is_link_local or 
                ip.is_reserved or 
                ip.is_multicast or
                ip.is_unspecified):
                return False
        return True
    except Exception:
        return False

class WebhookCreate(BaseModel):
    url: str
    events: list[str] = ["meeting.processed"]

@router.post("")
def create_webhook(req: WebhookCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_safe_webhook_url(req.url):
        raise HTTPException(400, "Invalid webhook URL or private IP address range detected.")

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
