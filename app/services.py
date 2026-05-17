from app.pipeline.video_to_audio import video_to_audio
from app.pipeline.audio_to_text import audio_to_text
from app.pipeline.chunk_text import chunk_text
from app.storage.embed_store import embed_store
from app.intelligence.highlights import extract_highlights
from app.intelligence.chat import ask_question as chat_ask
import os

def process_meeting(file_path: str, meeting_id: str):
    # 1. Split video/audio into 5-minute chunk files
    chunk_wav_files = video_to_audio(file_path, meeting_id)

    final_transcript_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data", "intermediate", meeting_id, "transcript.txt"
    )
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(final_transcript_path), exist_ok=True)
    
    # Clear final transcript if it exists
    if os.path.exists(final_transcript_path):
        os.remove(final_transcript_path)

    # 2. Process each segment
    for i, wav_file in enumerate(chunk_wav_files):
        print(f"Processing chunk {i+1}/{len(chunk_wav_files)}: {wav_file}")
        
        # Audio -> Text chunk
        temp_transcript_path = audio_to_text(wav_file, meeting_id, i)
        
        # Append to final transcript
        with open(temp_transcript_path, "r", encoding="utf-8") as tf:
            chunk_text_content = tf.read()
        with open(final_transcript_path, "a", encoding="utf-8") as ff:
            ff.write(chunk_text_content + "\n")
            
        # Text chunk -> Split into LangChain chunks
        temp_chunks_path = chunk_text(temp_transcript_path, meeting_id, i)
        
        # Store embeddings
        embed_store(temp_chunks_path, meeting_id)
        
        # Cleanup temporary files immediately
        os.remove(wav_file)
        os.remove(temp_transcript_path)
        os.remove(temp_chunks_path)


def generate_notes(meeting_id: str):
    return extract_highlights(meeting_id)


def ask_question(query: str, meeting_id: str):
    return chat_ask(query, meeting_id)
