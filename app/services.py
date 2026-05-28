from app.pipeline.video_to_audio import video_to_audio
from app.pipeline.audio_to_text import audio_to_text
from app.pipeline.chunk_text import chunk_text
from app.storage.embed_store import embed_store
from app.intelligence.highlights import extract_highlights
from app.intelligence.chat import ask_question as chat_ask
from app.core.job_progress import update_progress, set_job_done, set_job_failed
import os
import traceback


def process_meeting(file_path: str, meeting_id: str):
    try:
        # 1. Split video/audio into 5-minute chunk files
        update_progress(meeting_id, "extracting_audio", 5, "Splitting audio into chunks")
        chunk_wav_files = video_to_audio(file_path, meeting_id)
        update_progress(meeting_id, "extracting_audio", 10, "Audio extraction complete")

        total_chunks = len(chunk_wav_files)

        # 2. Process each segment
        for i, wav_file in enumerate(chunk_wav_files):
            chunk_num = i + 1
            print(f"Processing chunk {chunk_num}/{total_chunks}: {wav_file}")

            # ── Transcribe ──
            # Progress range for transcription: 10–70 (scaled by chunk count)
            transcribe_progress = 10 + int((i / total_chunks) * 50)
            update_progress(
                meeting_id, "transcribing", transcribe_progress,
                f"Transcribing chunk {chunk_num}/{total_chunks}"
            )
            temp_transcript_path = audio_to_text(wav_file, meeting_id, i)

            # ── Chunk + Embed ──
            embed_progress = 10 + int(((i + 0.5) / total_chunks) * 50)
            update_progress(
                meeting_id, "embedding", embed_progress,
                f"Embedding chunk {chunk_num}/{total_chunks}"
            )
            temp_chunks_path = chunk_text(temp_transcript_path, meeting_id, i)
            embed_store(temp_chunks_path, meeting_id)

            # Cleanup temporary files immediately
            os.remove(wav_file)
            os.remove(temp_transcript_path)
            os.remove(temp_chunks_path)

        # 3. Done
        update_progress(meeting_id, "done", 100, "Processing complete")
        set_job_done(meeting_id)

        # 4. Clean up original uploaded file and intermediate directory
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[OK] Deleted original source file: {file_path}")
            
        import shutil
        intermediate_dir = os.path.join("data", "intermediate", meeting_id)
        if os.path.exists(intermediate_dir):
            shutil.rmtree(intermediate_dir)
            print(f"[OK] Deleted intermediate folder: {intermediate_dir}")

        print(f"[OK] Meeting {meeting_id} processing complete")

    except Exception as e:
        traceback.print_exc()
        set_job_failed(meeting_id, str(e))
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
    
    # 1. Delete ChromaDB folder
    vectordb_dir = os.path.join("data", "vectordb", meeting_id)
    if os.path.exists(vectordb_dir):
        try:
            from langchain_community.vectorstores import Chroma
            from app.intelligence.embeddings import shared_embedding_model
            vector_db = Chroma(
                persist_directory=vectordb_dir,
                embedding_function=shared_embedding_model
            )
            vector_db.delete_collection()
            # Try to force garbage collection of the SQLite connection
            del vector_db
            
            # Clear Chroma system cache to release the Windows file lock on sqlite3
            import chromadb
            chromadb.api.client.SharedSystemClient.clear_system_cache()
        except Exception as e:
            print(f"[Warning] Failed to delete Chroma collection via API: {e}")
            
        shutil.rmtree(vectordb_dir, ignore_errors=True)
        
        # Fallback for Windows file locks: Truncate the locked sqlite files to 0 bytes
        if os.path.exists(vectordb_dir):
            for root, _, files in os.walk(vectordb_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'w') as f:
                            f.write('')
                    except Exception:
                        pass
    
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
