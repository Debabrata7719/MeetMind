from src.infrastructure.workers.celery_app import celery_app
from src.application.meeting_service import process_meeting
from src.infrastructure.cache.job_progress import set_job_retrying, set_job_failed
import traceback
import os

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_meeting_task(self, file_path: str, meeting_id: str):
    """
    Background task to process a meeting via AssemblyAI, chunking, and VoyageAI/Qdrant.
    Automatically retries on failure.
    """
    try:
        process_meeting(file_path, meeting_id)
    except Exception as exc:
        traceback.print_exc()
        
        attempt = self.request.retries + 1
        max_retries = self.max_retries
        
        if attempt <= max_retries:
            print(f"[Warning] Task failed, retrying in 60s (Attempt {attempt}/{max_retries})")
            set_job_retrying(meeting_id, attempt, max_retries)
            raise self.retry(exc=exc)
        else:
            print(f"[Error] Max retries exhausted for meeting {meeting_id}. Failing permanently.")
            set_job_failed(meeting_id, f"Processing failed after {max_retries} retries: {str(exc)}")
            
            # Clean up the file to prevent storage leaks
            if file_path.startswith("http"):
                try:
                    import cloudinary
                    import cloudinary.uploader
                    parts = file_path.split("/upload/")
                    if len(parts) == 2:
                        after_upload = parts[1].split("/", 1)[-1]
                        public_id = after_upload.rsplit(".", 1)[0]
                        cloudinary.uploader.destroy(public_id, resource_type="video")
                        print(f"[OK] Deleted orphaned Cloudinary file after failure: {public_id}")
                except Exception as cleanup_err:
                    print(f"[Error] Failed to delete Cloudinary file {file_path}: {cleanup_err}")
            elif os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"[OK] Deleted orphaned file after failure: {file_path}")
                except Exception as cleanup_err:
                    print(f"[Error] Failed to delete file {file_path}: {cleanup_err}")
            
            raise
