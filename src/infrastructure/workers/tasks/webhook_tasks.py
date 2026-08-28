from src.infrastructure.workers.celery_app import celery_app
import requests
import json
import hmac
import hashlib
from src.infrastructure.database import SessionLocal
from src.domain.models import WebhookEndpoint

@celery_app.task(bind=True, max_retries=5, default_retry_delay=60)
def trigger_single_webhook(self, url: str, secret: str, event_name: str, payload: dict):
    """
    Independent sub-task to trigger a single webhook URL.
    This allows exponential backoff for a specific failing endpoint 
    without affecting other healthy webhooks.
    """
    body = json.dumps({"event": event_name, "data": payload})
    signature = hmac.new(
        secret.encode('utf-8'),
        body.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-MeetMind-Signature": signature
    }
    
    try:
        res = requests.post(url, data=body, headers=headers, timeout=10, allow_redirects=False)
        res.raise_for_status()
        print(f"[OK] Triggered webhook: {url}")
    except Exception as exc:
        print(f"[Warning] Webhook {url} failed. Retrying... (Attempt {self.request.retries + 1}/5)")
        # Exponential backoff: 60s, 120s, 240s...
        retry_delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_delay)

@celery_app.task
def dispatch_webhook(user_id: int, event_name: str, payload: dict):
    """
    Looks up webhooks for the user and spawns an independent sub-task for each one.
    """
    db = SessionLocal()
    try:
        webhooks = db.query(WebhookEndpoint).filter_by(user_id=user_id, is_active=True).all()
        for webhook in webhooks:
            if event_name in webhook.events:
                # Spawn an independent Celery task for this specific webhook
                trigger_single_webhook.delay(
                    url=webhook.url, 
                    secret=webhook.secret, 
                    event_name=event_name, 
                    payload=payload
                )
    finally:
        db.close()
