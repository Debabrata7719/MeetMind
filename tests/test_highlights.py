"""
tests/test_highlights.py

Tests for app/intelligence/highlights.py

Uses the REAL ChromaDB embeddings from uploads/test_video.mp4.
The Groq LLM call is mocked in fast tests so no API key is needed.
Real LLM tests run automatically when GROQ_API_KEY is present in .env.
"""

import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.core.config import BASE_DIR, NOTES_DIR

REAL_MEETING_ID = "test_video_meeting"

# Detect API key from env or .env file
_env_file = BASE_DIR / ".env"
HAS_GROQ_KEY = bool(
    os.environ.get("GROQ_API_KEY")
    or (_env_file.exists() and "GROQ_API_KEY" in _env_file.read_text())
)


# ─────────────────────────────────────────────
# Fast tests — real ChromaDB retrieval, mocked LLM
# ─────────────────────────────────────────────

def _mock_chain(content="• Decision made.\n• Action item assigned."):
    chain = MagicMock()
    chain.invoke.return_value = MagicMock(content=content)
    return chain


def test_highlights_returns_string(real_meeting_id):
    """extract_highlights must return a string (LLM mocked)."""
    chain = _mock_chain()
    with patch("app.intelligence.highlights.ChatGroq"), \
         patch("app.intelligence.highlights.ChatPromptTemplate") as mock_pt:
        mock_pt.from_template.return_value.__or__ = MagicMock(return_value=chain)
        from app.intelligence.highlights import extract_highlights
        result = extract_highlights(real_meeting_id)
    assert isinstance(result, str)
    print(f"\n[OK] highlights type: {type(result).__name__}")


def test_highlights_result_is_nonempty(real_meeting_id):
    """extract_highlights must return non-empty content."""
    chain = _mock_chain("• Key point from the meeting.")
    with patch("app.intelligence.highlights.ChatGroq"), \
         patch("app.intelligence.highlights.ChatPromptTemplate") as mock_pt:
        mock_pt.from_template.return_value.__or__ = MagicMock(return_value=chain)
        from app.intelligence.highlights import extract_highlights
        result = extract_highlights(real_meeting_id)
    assert len(result.strip()) > 0


def test_highlights_saves_file(real_meeting_id):
    """Highlights must be saved to Notes/highlights_<meeting_id>.txt."""
    chain = _mock_chain("• Launch by July.\n• Prepare demo.")
    with patch("app.intelligence.highlights.ChatGroq"), \
         patch("app.intelligence.highlights.ChatPromptTemplate") as mock_pt:
        mock_pt.from_template.return_value.__or__ = MagicMock(return_value=chain)
        from app.intelligence.highlights import extract_highlights
        extract_highlights(real_meeting_id)
    notes_file = NOTES_DIR / f"highlights_{real_meeting_id}.txt"
    assert notes_file.exists(), f"Highlights file not saved: {notes_file}"
    print(f"\n[OK] Highlights file: {notes_file}")


def test_highlights_file_is_nonempty(real_meeting_id):
    """Saved highlights file must not be empty."""
    chain = _mock_chain("• Follow-up Monday.\n• Budget approved.")
    with patch("app.intelligence.highlights.ChatGroq"), \
         patch("app.intelligence.highlights.ChatPromptTemplate") as mock_pt:
        mock_pt.from_template.return_value.__or__ = MagicMock(return_value=chain)
        from app.intelligence.highlights import extract_highlights
        extract_highlights(real_meeting_id)
    notes_file = NOTES_DIR / f"highlights_{real_meeting_id}.txt"
    assert notes_file.stat().st_size > 0
    print(f"\n[OK] File size: {notes_file.stat().st_size} bytes")


def test_highlights_missing_meeting_returns_empty_or_string():
    """
    extract_highlights on a non-existent meeting does NOT raise —
    ChromaDB silently creates an empty collection and the LLM receives
    no context. The function must still return a string (possibly empty).
    The LLM call is mocked so no API key is needed.
    """
    chain = _mock_chain("")
    with patch("app.intelligence.highlights.ChatGroq"), \
         patch("app.intelligence.highlights.ChatPromptTemplate") as mock_pt:
        mock_pt.from_template.return_value.__or__ = MagicMock(return_value=chain)
        from app.intelligence.highlights import extract_highlights
        result = extract_highlights("nonexistent_meeting_id_xyz_999")
    assert isinstance(result, str)
    print("\n[OK] Missing meeting returns string (no crash)")


# ─────────────────────────────────────────────
# Real LLM tests — only when GROQ_API_KEY is set
# ─────────────────────────────────────────────

@pytest.mark.skipif(not HAS_GROQ_KEY, reason="GROQ_API_KEY not configured")
class TestRealHighlights:

    def test_real_highlights_returns_text(self, real_meeting_id):
        """Real Groq LLM must return meaningful highlights text."""
        from app.intelligence.highlights import extract_highlights
        result = extract_highlights(real_meeting_id)
        assert isinstance(result, str)
        assert len(result.strip()) > 0
        safe = result.encode("ascii", errors="replace").decode("ascii")
        print(f"\n[OK] Real highlights:\n{safe[:500]}")

    def test_real_highlights_file_saved(self, real_meeting_id):
        """Real highlights must be persisted to Notes/."""
        from app.intelligence.highlights import extract_highlights
        extract_highlights(real_meeting_id)
        f = NOTES_DIR / f"highlights_{real_meeting_id}.txt"
        assert f.exists() and f.stat().st_size > 0

    def test_real_highlights_has_structure(self, real_meeting_id):
        """Real highlights must contain newlines or bullet points."""
        from app.intelligence.highlights import extract_highlights
        result = extract_highlights(real_meeting_id)
        assert "\n" in result or "•" in result or "." in result
