"""
tests/test_services.py

End-to-end integration test for app/services.py

Tests the full pipeline sequentially through the services layer:
  1. video  → audio       (video_to_audio via run_pipeline)
  2. audio  → transcript  (audio_to_text via run_pipeline)
  3. text   → chunks      (chunk_text via run_pipeline)
  4. chunks → embeddings  (embed_store)
  5. embeddings → highlights (generate_notes)
  6. embeddings → chat answer (ask_question)

Uses the real uploads/test_video.mp4 — no mocks on the pipeline.
All steps share session-scoped fixtures from conftest.py.
NOTE: First run takes ~4 min due to Whisper. Subsequent runs are instant.
"""

import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.core.config import BASE_DIR, INTERMEDIATE_DIR, VECTORDB_DIR, NOTES_DIR

REAL_VIDEO      = BASE_DIR / "uploads" / "test_video.mp4"
REAL_MEETING_ID = "test_video_meeting"

# Detect Groq API key
_env_file = BASE_DIR / ".env"
HAS_GROQ_KEY = bool(
    os.environ.get("GROQ_API_KEY")
    or (_env_file.exists() and "GROQ_API_KEY" in _env_file.read_text())
)


# ══════════════════════════════════════════════
# STEP 1 — Video → Audio
# ══════════════════════════════════════════════

class TestStep1VideoToAudio:
    """services.process_meeting starts by extracting audio from the video."""

    def test_source_video_exists(self):
        """uploads/test_video.mp4 must exist before anything runs."""
        assert REAL_VIDEO.exists(), f"Test video not found: {REAL_VIDEO}"
        mb = REAL_VIDEO.stat().st_size / (1024 * 1024)
        print(f"\n[STEP 1] Video: {REAL_VIDEO.name} ({mb:.2f} MB)")

    def test_audio_extracted(self, real_audio_path):
        """FFmpeg must produce a non-empty WAV file."""
        audio = Path(real_audio_path)
        assert audio.exists()
        assert audio.suffix == ".wav"
        assert audio.stat().st_size > 0
        print(f"\n[STEP 1] Audio: {audio.name} ({audio.stat().st_size // 1024} KB)")

    def test_audio_in_correct_directory(self, real_audio_path):
        """Audio must be saved in data/intermediate/."""
        assert Path(real_audio_path).parent == INTERMEDIATE_DIR

    def test_audio_correct_filename(self, real_audio_path):
        """Audio filename must be clean_meeting_audio.wav."""
        assert Path(real_audio_path).name == "clean_meeting_audio.wav"


# ══════════════════════════════════════════════
# STEP 2 — Audio → Transcript
# ══════════════════════════════════════════════

class TestStep2AudioToText:
    """Whisper transcribes the extracted audio into text."""

    def test_transcript_file_exists(self, real_transcript_path):
        """transcript.txt must be created after Whisper runs."""
        assert Path(real_transcript_path).exists()
        assert Path(real_transcript_path).stat().st_size > 0
        print(f"\n[STEP 2] Transcript: {Path(real_transcript_path).name}")

    def test_transcript_has_real_content(self, real_transcript_text):
        """Transcript must contain real spoken words (>50 chars)."""
        assert len(real_transcript_text.strip()) > 50, (
            f"Transcript too short: {repr(real_transcript_text[:100])}"
        )
        print(f"\n[STEP 2] Transcript length: {len(real_transcript_text)} chars")
        print(f"          Preview: {real_transcript_text.strip()[:200]}")

    def test_transcript_is_valid_string(self, real_transcript_text):
        """Transcript must be a valid UTF-8 string."""
        assert isinstance(real_transcript_text, str)

    def test_transcript_in_correct_directory(self, real_transcript_path):
        """Transcript must be in data/intermediate/."""
        assert Path(real_transcript_path).parent == INTERMEDIATE_DIR


# ══════════════════════════════════════════════
# STEP 3 — Transcript → Chunks
# ══════════════════════════════════════════════

class TestStep3ChunkText:
    """The transcript is split into overlapping chunks."""

    def test_chunks_file_exists(self, real_chunks_path):
        """chunks.txt must be created after chunking."""
        assert Path(real_chunks_path).exists()
        assert Path(real_chunks_path).stat().st_size > 0
        print(f"\n[STEP 3] Chunks file: {Path(real_chunks_path).name}")

    def test_chunks_contain_markers(self, real_chunks_content):
        """Chunks file must contain ----- CHUNK markers."""
        assert "----- CHUNK" in real_chunks_content

    def test_multiple_chunks_produced(self, real_chunks_content):
        """A real meeting must produce more than one chunk."""
        count = real_chunks_content.count("----- CHUNK")
        assert count >= 2
        print(f"\n[STEP 3] Total chunks: {count}")

    def test_chunks_have_meaningful_content(self, real_chunks_content):
        """Each chunk must have more than 20 characters."""
        parts = real_chunks_content.split("----- CHUNK")
        meaningful = [p.strip() for p in parts if len(p.strip()) > 20]
        assert len(meaningful) >= 1
        print(f"\n[STEP 3] Meaningful chunks: {len(meaningful)}")
        print(f"          First chunk: {meaningful[0][:150]}")

    def test_chunks_in_correct_directory(self, real_chunks_path):
        """Chunks must be in data/intermediate/."""
        assert Path(real_chunks_path).parent == INTERMEDIATE_DIR


# ══════════════════════════════════════════════
# STEP 4 — Chunks → Embeddings
# ══════════════════════════════════════════════

class TestStep4EmbedStore:
    """Chunks are embedded and stored in ChromaDB."""

    def test_vectordb_directory_created(self, real_meeting_id):
        """ChromaDB must create a directory for the meeting."""
        db = VECTORDB_DIR / real_meeting_id
        assert db.exists() and db.is_dir()
        print(f"\n[STEP 4] VectorDB: {db}")

    def test_vectordb_has_files(self, real_meeting_id):
        """VectorDB directory must contain database files."""
        db = VECTORDB_DIR / real_meeting_id
        files = [f for f in db.rglob("*") if f.is_file()]
        assert len(files) > 0
        print(f"\n[STEP 4] VectorDB files: {[f.name for f in files]}")

    def test_vectordb_has_sqlite(self, real_meeting_id):
        """ChromaDB must create a SQLite file."""
        db = VECTORDB_DIR / real_meeting_id
        assert len(list(db.rglob("*.sqlite3"))) > 0

    def test_embeddings_are_retrievable(self, real_meeting_id):
        """A semantic query must return relevant chunks from the DB."""
        from langchain_community.embeddings import SentenceTransformerEmbeddings
        from langchain_chroma import Chroma

        embedding = SentenceTransformerEmbeddings(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        db = Chroma(
            persist_directory=str(VECTORDB_DIR / real_meeting_id),
            embedding_function=embedding,
            collection_name="meeting_chunks",
        )
        docs = db.as_retriever(search_kwargs={"k": 3}).invoke("topics discussed")
        assert len(docs) > 0
        print(f"\n[STEP 4] Retrieved {len(docs)} docs")
        print(f"          Top result: {docs[0].page_content[:100]}")


# ══════════════════════════════════════════════
# STEP 5 — Highlights (real LLM)
# ══════════════════════════════════════════════

@pytest.mark.skipif(not HAS_GROQ_KEY, reason="GROQ_API_KEY not configured")
class TestStep5Highlights:
    """generate_notes retrieves chunks and asks Groq LLM for highlights."""

    def test_highlights_returns_string(self, real_meeting_id):
        """generate_notes must return a non-empty string."""
        from app.services import generate_notes
        result = generate_notes(real_meeting_id)
        assert isinstance(result, str)
        assert len(result.strip()) > 0
        safe = result.encode("ascii", errors="replace").decode("ascii")
        print(f"\n[STEP 5] Highlights:\n{safe[:400]}")

    def test_highlights_file_saved(self, real_meeting_id):
        """Highlights must be saved to Notes/highlights_<id>.txt."""
        from app.services import generate_notes
        generate_notes(real_meeting_id)
        f = NOTES_DIR / f"highlights_{real_meeting_id}.txt"
        assert f.exists() and f.stat().st_size > 0
        print(f"\n[STEP 5] Saved: {f.name}")

    def test_highlights_has_structure(self, real_meeting_id):
        """Highlights must contain newlines or bullet points."""
        from app.services import generate_notes
        result = generate_notes(real_meeting_id)
        assert "\n" in result or "•" in result or "." in result


# ══════════════════════════════════════════════
# STEP 6 — Chat (real LLM)
# ══════════════════════════════════════════════

@pytest.mark.skipif(not HAS_GROQ_KEY, reason="GROQ_API_KEY not configured")
class TestStep6Chat:
    """ask_question retrieves chunks and answers via Groq LLM."""

    def test_empty_question_rejected(self, real_meeting_id):
        """Empty query must return the guard message."""
        from app.services import ask_question
        result = ask_question("   ", real_meeting_id)
        assert result == "Please ask a valid question."

    def test_real_question_gets_answer(self, real_meeting_id):
        """A real question must get a meaningful answer."""
        from app.services import ask_question
        result = ask_question("What was discussed in this meeting?", real_meeting_id)
        assert isinstance(result, str)
        assert len(result.strip()) > 10
        safe = result.encode("ascii", errors="replace").decode("ascii")
        print(f"\n[STEP 6] Answer:\n{safe[:400]}")

    def test_answer_is_not_blank(self, real_meeting_id):
        """LLM must never return a blank answer."""
        from app.services import ask_question
        result = ask_question("Who attended the meeting?", real_meeting_id)
        assert result.strip() != ""

    def test_missing_meeting_raises(self):
        """Non-existent meeting must raise an exception."""
        from app.services import ask_question
        with pytest.raises(Exception):
            ask_question("Hello?", "nonexistent_meeting_xyz_99999")
