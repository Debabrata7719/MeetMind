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
            if file_path.startswith("http") and ".amazonaws.com/" in file_path:
                try:
                    import boto3
                    parts = file_path.split(".amazonaws.com/")
                    if len(parts) == 2:
                        file_key = parts[1]
                        s3_bucket = os.getenv("AWS_S3_BUCKET")
                        s3_client = boto3.client(
                            "s3",
                            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                            region_name="ap-south-1"
                        )
                        s3_client.delete_object(Bucket=s3_bucket, Key=file_key)
                        print(f"[OK] Deleted orphaned S3 file after failure: {file_key}")
                except Exception as cleanup_err:
                    print(f"[Error] Failed to delete S3 file {file_path}: {cleanup_err}")
            elif os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"[OK] Deleted orphaned file after failure: {file_path}")
                except Exception as cleanup_err:
                    print(f"[Error] Failed to delete file {file_path}: {cleanup_err}")
            
            raise


import redis
import assemblyai as aai
from src.application.pipeline.chunk_text import chunk_text
from src.infrastructure.vector_store.embed_store import embed_store
from src.infrastructure.ai.highlights import extract_highlights
from src.infrastructure.database import SessionLocal
from src.domain.models import Meeting, AIHighlight
from src.infrastructure.cache.redis_client import redis_client
from src.infrastructure.cache.job_progress import set_job_done

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def transcribe_live_chunk_task(self, file_path: str, meeting_id: str, index: int):
    """
    Asynchronously transcribes a single audio chunk and stores the text
    in a Redis Hash by index.
    """
    try:
        api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not api_key:
            raise ValueError("ASSEMBLYAI_API_KEY not found in .env")
        aai.settings.api_key = api_key
        
        print(f"[Live Celery] Transcribing chunk: {file_path}")
        transcriber = aai.Transcriber()
        config = aai.TranscriptionConfig(language_code="en")
        transcript = transcriber.transcribe(file_path, config=config)
        
        if transcript.error:
            err_msg = str(transcript.error)
            if "no spoken audio" in err_msg.lower() or "language_detection" in err_msg.lower():
                print(f"[Live Celery] Skipping chunk {file_path} - No speech detected: {err_msg}")
                if os.path.exists(file_path):
                    os.remove(file_path)
                return
            raise RuntimeError(f"AssemblyAI Error on chunk: {transcript.error}")
            
        text = transcript.text
        if text and text.strip():
            redis_key = f"live_transcript:{meeting_id}"
            redis_client.hset(redis_key, str(index), text.strip())
            print(f"[Live Celery] Saved segment to Hash {redis_key} at index {index}: '{text.strip()[:30]}...'")
        else:
            print(f"[Live Celery] Transcription empty for chunk: {file_path}")

        # Clean up chunk file on success
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[Live Celery] Cleaned up chunk file on success: {file_path}")

    except Exception as exc:
        print(f"[Live Celery] Error in chunk transcription: {exc}")
        attempt = self.request.retries + 1
        max_retries = self.max_retries
        
        if attempt <= max_retries:
            if os.path.exists(file_path):
                raise self.retry(exc=exc)
            else:
                print(f"[Live Celery] Chunk file deleted, cannot retry. Skipping chunk.")
        else:
            print(f"[Live Celery] Max retries exhausted for chunk {file_path}. Cleaning up.")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"[Live Celery] Warning: failed to delete file {file_path}: {e}")
            raise


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def aggregate_live_meeting_task(self, meeting_id: str):
    """
    Aggregates all transcript segments from Redis Hash in chronological order,
    chunks the text, vectorizes and stores in Qdrant, generates highlights, and cleans up.
    """
    from src.infrastructure.cache.job_progress import update_progress
    db = SessionLocal()
    try:
        update_progress(meeting_id, "transcribing", 20, "Compiling audio transcript segments...")
        redis_key = f"live_transcript:{meeting_id}"
        segments_dict = redis_client.hgetall(redis_key)
        
        if not segments_dict:
            print(f"[Live Celery] No transcript segments found in Redis for meeting {meeting_id}")
            meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
            if meeting:
                existing = db.query(AIHighlight).filter(AIHighlight.meeting_id == meeting.id).first()
                if existing:
                    existing.content = "### No Speech Detected\n\nWe couldn't detect any spoken words or audio content in this live meeting. Please ensure your microphone is connected and you speak during the session."
                else:
                    db.add(AIHighlight(
                        meeting_id=meeting.id, 
                        content="### No Speech Detected\n\nWe couldn't detect any spoken words or audio content in this live meeting. Please ensure your microphone is connected and you speak during the session."
                    ))
                db.commit()
            set_job_done(meeting_id)
            return

        sorted_keys = sorted(segments_dict.keys(), key=int)
        segments = [segments_dict[k] for k in sorted_keys]
        full_text = " ".join(segments)
        print(f"[Live Celery] Aggregated full transcript length: {len(full_text)}")

        update_progress(meeting_id, "embedding", 40, "Chunking meeting transcript...")
        chunks = chunk_text(full_text)
        print(f"[Live Celery] Chunked transcript into {len(chunks)} blocks")

        update_progress(meeting_id, "embedding", 60, f"Vectorizing and saving {len(chunks)} chunks to Qdrant...")
        embed_store(chunks, meeting_id)
        print(f"[Live Celery] Stored vectors in Qdrant")

        update_progress(meeting_id, "generating_highlights", 80, "Extracting action items and summary highlights...")
        meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
        if meeting:
            estimated_duration = len(segments) * 30
            meeting.duration = estimated_duration
            db.commit()

            try:
                result = extract_highlights(meeting_id)
                existing = db.query(AIHighlight).filter(AIHighlight.meeting_id == meeting.id).first()
                if existing:
                    existing.content = result
                else:
                    db.add(AIHighlight(meeting_id=meeting.id, content=result))
                db.commit()
            except Exception as e:
                print(f"[Live Celery] Warning: failed to generate highlights: {e}")

        redis_client.delete(redis_key)
        redis_client.delete(f"live_transcript_seq:{meeting_id}")
        print(f"[Live Celery] Cleared Redis buffer {redis_key} and sequence counter")

        set_job_done(meeting_id)
        print(f"[Live Celery] Live meeting aggregation complete for {meeting_id}")

    except Exception as exc:
        print(f"[Live Celery] Error in live meeting aggregation: {exc}")
        db.rollback()
        
        attempt = self.request.retries + 1
        max_retries = self.max_retries
        
        if attempt <= max_retries:
            print(f"[Live Celery] Aggregation failed, retrying (Attempt {attempt}/{max_retries})")
            set_job_retrying(meeting_id, attempt, max_retries)
            raise self.retry(exc=exc)
        else:
            print(f"[Live Celery] Max retries exhausted for live meeting {meeting_id}. Failing permanently.")
            set_job_failed(meeting_id, f"Live aggregation failed after {max_retries} retries: {str(exc)}")
            
            # Clean up Redis buffer
            redis_key = f"live_transcript:{meeting_id}"
            redis_client.delete(redis_key)
            raise
    finally:
        db.close()
