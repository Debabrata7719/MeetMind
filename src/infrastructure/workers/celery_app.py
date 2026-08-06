import os
import ssl
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

# Configuration for Upstash (rediss:// requires SSL kwargs in some environments)
broker_use_ssl = None
if redis_url.startswith("rediss://"):
    broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

# Initialize Celery app
celery_app = Celery(
    "meeting_intelligence",
    broker=redis_url,
    backend=redis_url,
    include=["src.infrastructure.workers.tasks.pipeline_tasks", "src.infrastructure.workers.tasks.maintenance_tasks", "src.infrastructure.workers.tasks.webhook_tasks"]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl=broker_use_ssl,
    redis_backend_use_ssl=broker_use_ssl,
    # Configure Beat Scheduler
    beat_schedule={
        "midnight_cleanup": {
            "task": "src.infrastructure.workers.tasks.maintenance_tasks.midnight_cleanup_task",
            "schedule": crontab(hour=0, minute=0), # Every night at midnight UTC
        },
        "cleanup_stale_uploads": {
            "task": "src.infrastructure.workers.tasks.maintenance_tasks.cleanup_stale_uploads",
            "schedule": crontab(hour=2, minute=0), # Every night at 2AM
        },
        "cleanup_ghost_vectordbs": {
            "task": "src.infrastructure.workers.tasks.maintenance_tasks.cleanup_ghost_vectordbs",
            "schedule": crontab(hour=3, minute=0), # Every night at 3AM
        }
    }
)

if __name__ == "__main__":
    celery_app.start()
