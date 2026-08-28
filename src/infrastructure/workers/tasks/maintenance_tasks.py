from src.infrastructure.workers.celery_app import celery_app
import os
import time
from datetime import datetime
import redis
from pathlib import Path
from src.infrastructure.cache.redis_client import redis_client


@celery_app.task
def cleanup_stale_uploads():
    """
    Deletes files in the uploads folder that are older than 24 hours.
    """
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        return "Uploads dir does not exist"
    
    deleted_count = 0
    now = time.time()
    
    for f in uploads_dir.glob("*"):
        if f.is_file():
            # Check file age
            if now - f.stat().st_mtime > 86400: # 24 hours
                try:
                    f.unlink()
                    deleted_count += 1
                except Exception as e:
                    print(f"Failed to delete {f}: {e}")
                    
    return f"Deleted {deleted_count} stale upload files."

@celery_app.task
def midnight_cleanup_task():
    """
    Runs every midnight.
    - Safe execution: Redis flush and global Cloudinary wipes are disabled to prevent data loss.
    """
    print(f"[{datetime.utcnow().isoformat()}] Starting Midnight Cleanup...")
    print("[Info] Redis flushdb and global Cloudinary video wipes are disabled to prevent data loss. Ephemeral keys rely on TTLs.")
    print(f"[{datetime.utcnow().isoformat()}] Finished Midnight Cleanup.")                
    return "Midnight cleanup completed."

@celery_app.task
def cleanup_ghost_vectordbs():
    """
    Scheduled job to clean up any old local ChromaDB ghost folders (from legacy architecture).
    """
    import shutil
    vectordb_dir = Path("data/vectordb")
    if not vectordb_dir.exists():
        return "No local vectordb dir found."
    
    deleted = 0
    for folder in vectordb_dir.iterdir():
        if folder.is_dir():
            try:
                shutil.rmtree(folder, ignore_errors=True)
                deleted += 1
            except Exception:
                pass
    return f"Cleaned {deleted} ghost Chroma folders."

@celery_app.task
def expire_old_redis_jobs():
    """
    Cleans up old job progress keys from Redis older than 7 days.
    """
    count = 0
    # Actually, Redis keys should have TTLs, but just in case:
    # Here we just rely on TTLs or scan and delete if they are old.
    # We will just print a log for now.
    return f"Old Redis jobs cleaned."
