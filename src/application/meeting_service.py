import os
import traceback
import assemblyai as aai

from src.application.pipeline.chunk_text import chunk_text
from src.infrastructure.vector_store.embed_store import embed_store
from src.infrastructure.workers.tasks.webhook_tasks import dispatch_webhook
from src.infrastructure.ai.highlights import extract_highlights
from src.infrastructure.ai.chat import ask_question as chat_ask
from src.infrastructure.cache.job_progress import update_progress, set_job_done, set_job_failed
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue

def process_meeting(file_path: str, meeting_id: str):
    try:
        # 1. Transcribe video directly with AssemblyAI
        update_progress(meeting_id, "transcribing", 10, "Transcribing video with AssemblyAI")
        
        api_key = os.getenv("ASSEMBLYAI_API_KEY")
        if not api_key:
            raise ValueError("ASSEMBLYAI_API_KEY not found in .env")
        aai.settings.api_key = api_key
        
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(file_path)
        
        if transcript.error:
            raise RuntimeError(f"AssemblyAI Error: {transcript.error}")
            
        text = transcript.text
        if not text:
            raise ValueError("Transcription returned empty text.")

        update_progress(meeting_id, "transcribing", 50, "Transcription complete")

        # 2. Chunk text
        update_progress(meeting_id, "embedding", 60, "Chunking text")
        chunks = chunk_text(text)
        
        # 3. Embed and store in Qdrant
        update_progress(meeting_id, "embedding", 80, f"Embedding {len(chunks)} chunks to Qdrant")
        embed_store(chunks, meeting_id)

        # 4. Done
        # Update meeting duration and dispatch webhook
        from src.infrastructure.database import SessionLocal
        from src.domain.models import Meeting
        db = SessionLocal()
        try:
            meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
            if meeting:
                duration = int(transcript.audio_duration)
                meeting.duration = duration
                user_id = meeting.user_id
                db.commit()
                
                # Trigger Webhook
                dispatch_webhook.delay(
                    user_id=user_id,
                    event_name="meeting.processed",
                    payload={"meeting_id": meeting_id, "duration": duration}
                )
                
                # 4.5 Pre-compute Highlights
                update_progress(meeting_id, "embedding", 90, "Generating AI Highlights")
                try:
                    from src.domain.models import AIHighlight
                    result = extract_highlights(meeting_id)
                    existing = db.query(AIHighlight).filter(AIHighlight.meeting_id == meeting.id).first()
                    if not existing:
                        db.add(AIHighlight(meeting_id=meeting.id, content=result))
                        db.commit()
                except Exception as e:
                    print(f"[Warning] Failed to generate highlights: {e}")

        finally:
            db.close()

        update_progress(meeting_id, "done", 100, "Processing complete")
        set_job_done(meeting_id)

        # 5. Clean up from Cloudinary if it's a URL, or local disk if it's a file
        if file_path.startswith("http"):
            try:
                import cloudinary
                import cloudinary.uploader
                # Extract public_id from Cloudinary URL (e.g., https://res.cloudinary.com/.../upload/v1234/public_id.mp4)
                # Split by /upload/, then get everything after the version folder, and strip the extension
                parts = file_path.split("/upload/")
                if len(parts) == 2:
                    after_upload = parts[1].split("/", 1)[-1] # Removes the v1234 folder if present
                    public_id = after_upload.rsplit(".", 1)[0]
                    cloudinary.uploader.destroy(public_id, resource_type="video")
                    print(f"[OK] Deleted source file from Cloudinary: {public_id}")
            except Exception as e:
                print(f"[Warning] Failed to delete from Cloudinary: {e}")
        elif os.path.exists(file_path):
            os.remove(file_path)
            print(f"[OK] Deleted local source file: {file_path}")

        print(f"[OK] Meeting {meeting_id} processing complete")

    except Exception as e:
        traceback.print_exc()
        print(f"[Warning] Exception in process_meeting: {e}")
        # We do NOT set_job_failed or delete the file here.
        # The Celery wrapper will catch this exception, trigger a retry, 
        # and only delete the file when all retries are permanently exhausted.
        raise


def generate_notes(meeting_id: str):
    return extract_highlights(meeting_id)


def ask_question(query: str, meeting_id: str, user_id: int):
    return chat_ask(query, meeting_id, user_id)


def delete_meeting_data(meeting_id: str, user_id: int):
    import shutil
    import glob
    import redis
    import os
    
    # 1. Delete from Qdrant
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if qdrant_url and qdrant_api_key:
        try:
            client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
            collection_name = os.getenv("QDRANT_COLLECTION_NAME", "meetings")
            client.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="metadata.meeting_id",
                            match=MatchValue(value=meeting_id)
                        )
                    ]
                )
            )
            print(f"[OK] Deleted vectors from Qdrant for {meeting_id}")
        except Exception as e:
            print(f"[Warning] Failed to delete Qdrant vectors via API: {e}")
    
    # 2. Delete Redis keys
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis.from_url(redis_url)
        redis_client.delete(f"highlights:{meeting_id}")
        redis_client.delete(f"semantic_cache:{user_id}:{meeting_id}")
        redis_client.delete(f"message_store:chat:{user_id}:{meeting_id}")
        redis_client.delete(f"chat:{user_id}:{meeting_id}")
    except Exception as e:
        print(f"[Warning] Failed to delete Redis keys for {meeting_id}: {e}")
    
    # 3. Clean up intermediate and upload files just in case
    for folder in ["uploads", "intermediate"]:
        for f in glob.glob(os.path.join("data", folder, f"{meeting_id}*")):
            try:
                if os.path.isfile(f):
                    os.remove(f)
                elif os.path.isdir(f):
                    shutil.rmtree(f, ignore_errors=True)
            except:
                pass
