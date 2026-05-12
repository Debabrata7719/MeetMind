"""
tests/test_chunk_text.py

Tests for app/pipeline/chunk_text.py

Uses the REAL transcript produced from uploads/test_video.mp4 via Whisper.
No mocks — if chunking is broken, these tests will tell you.
"""

import pytest
from pathlib import Path

from app.core.config import INTERMEDIATE_DIR


def test_chunk_text_returns_path(real_chunks_path):
    """chunk_text() must return a non-empty string path."""
    assert isinstance(real_chunks_path, str)
    assert len(real_chunks_path) > 0
    print(f"\n[OK] Chunks path: {real_chunks_path}")


def test_chunk_text_file_exists(real_chunks_path):
    """chunks.txt must exist on disk after chunking."""
    assert Path(real_chunks_path).exists()


def test_chunk_text_correct_filename(real_chunks_path):
    """Output filename must be chunks.txt."""
    assert Path(real_chunks_path).name == "chunks.txt"


def test_chunk_text_correct_directory(real_chunks_path):
    """Chunks file must be saved in data/intermediate/."""
    assert Path(real_chunks_path).parent == INTERMEDIATE_DIR


def test_chunk_text_file_is_nonempty(real_chunks_path):
    """Chunks file must not be empty."""
    assert Path(real_chunks_path).stat().st_size > 0


def test_chunk_text_contains_chunk_markers(real_chunks_content):
    """Output must contain ----- CHUNK markers."""
    assert "----- CHUNK" in real_chunks_content, (
        "No chunk markers found — chunking may have failed silently."
    )
    print("\n[OK] Chunk markers found")


def test_chunk_text_produces_multiple_chunks(real_chunks_content):
    """A real meeting video must produce more than one chunk."""
    count = real_chunks_content.count("----- CHUNK")
    assert count >= 2, f"Expected at least 2 chunks, got {count}"
    print(f"\n[OK] Total chunks: {count}")


def test_chunk_text_chunks_have_content(real_chunks_content):
    """Each chunk must contain more than 20 characters of real text."""
    parts = real_chunks_content.split("----- CHUNK")
    meaningful = [p.strip() for p in parts if len(p.strip()) > 20]
    assert len(meaningful) >= 1, "No meaningful chunks found!"
    print(f"\n[OK] Meaningful chunks (>20 chars): {len(meaningful)}")
    print(f"      First chunk preview: {meaningful[0][:200]}")


def test_chunk_text_missing_file_raises(tmp_path):
    """chunk_text() must raise FileNotFoundError for a non-existent transcript."""
    from app.pipeline.chunk_text import chunk_text
    with pytest.raises(FileNotFoundError):
        chunk_text(str(tmp_path / "nonexistent_transcript.txt"))
    print("\n[OK] FileNotFoundError raised for missing file")


def test_chunk_text_chunk_size_reasonable(real_chunks_content):
    """No individual chunk should exceed 300 characters (chunk_size=150 + overlap)."""
    parts = real_chunks_content.split("----- CHUNK")
    for part in parts:
        # Strip the chunk number header line before measuring
        lines = part.strip().splitlines()
        body = "\n".join(lines[1:]).strip() if len(lines) > 1 else part.strip()
        assert len(body) <= 300, (
            f"Chunk too large ({len(body)} chars) — splitter may be misconfigured:\n{body[:100]}"
        )
    print("\n[OK] All chunks within expected size range")
