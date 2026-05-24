"""
tests/test_audio_to_text.py (FASTER-WHISPER COMPATIBLE)

Tests for app/pipeline/audio_to_text.py

Uses the REAL WAV extracted from uploads/test_video.mp4
and the REAL faster-whisper model — no mocks, no fake audio.

NOTE: faster-whisper runs once per session via the session-scoped fixture.
      First run takes ~30-60 seconds on CPU; subsequent tests are instant.
      (4x faster than openai-whisper)
"""

import re
import pytest
from pathlib import Path

from app.core.config import INTERMEDIATE_DIR


def test_audio_to_text_returns_path(real_transcript_path):
    """Must return a string path."""
    assert isinstance(real_transcript_path, str)
    assert len(real_transcript_path) > 0
    print(f"\n[OK] Transcript path: {real_transcript_path}")


def test_audio_to_text_file_exists(real_transcript_path):
    """transcript_chunk_0.txt must exist on disk."""
    assert Path(real_transcript_path).exists()


def test_audio_to_text_correct_filename(real_transcript_path):
    """Output filename must be transcript_chunk_0.txt (for chunk 0)."""
    assert Path(real_transcript_path).name == "transcript_chunk_0.txt"


def test_audio_to_text_correct_directory(real_transcript_path):
    """Transcript must be saved in data/intermediate/<meeting_id>/."""
    assert INTERMEDIATE_DIR in Path(real_transcript_path).parents


def test_audio_to_text_is_nonempty(real_transcript_text):
    """Transcript must contain more than 50 characters of real speech."""
    assert len(real_transcript_text.strip()) > 50, (
        f"Transcript too short: {repr(real_transcript_text[:100])}"
    )
    print(f"\n[OK] Transcript length: {len(real_transcript_text)} chars")


def test_audio_to_text_contains_real_words(real_transcript_text):
    """Transcript must contain readable English words, not garbage."""
    assert re.search(r"[a-zA-Z]{3,}", real_transcript_text), (
        "No readable words found in transcript!"
    )


def test_audio_to_text_is_valid_string(real_transcript_text):
    """Transcript content must be a plain Python string."""
    assert isinstance(real_transcript_text, str)


def test_audio_to_text_file_size(real_transcript_path):
    """Transcript file must be larger than 100 bytes."""
    size = Path(real_transcript_path).stat().st_size
    assert size > 100, f"Transcript file too small: {size} bytes"
    print(f"\n[OK] Transcript file size: {size} bytes")


def test_audio_to_text_preview(real_transcript_text):
    """Print a preview so the test log shows what was transcribed."""
    preview = real_transcript_text.strip()[:300]
    print(f"\n[PREVIEW]\n{preview}")
    assert True  # always passes — informational only


def test_audio_to_text_faster_whisper_signature():
    """Verify that faster-whisper is properly imported and loaded."""
    from app.pipeline.audio_to_text import model

    assert model is not None, "faster-whisper model not loaded"
    print("\n[OK] faster-whisper model loaded successfully")
