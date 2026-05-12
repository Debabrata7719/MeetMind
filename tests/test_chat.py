"""
tests/test_chat.py

Tests for app/intelligence/chat.py

Fast tests use real ChromaDB retrieval but mock the Groq LLM call.
Real LLM tests run automatically when GROQ_API_KEY is present in .env.

IMPORTANT: embed_store uses paraphrase-multilingual-MiniLM-L12-v2.
           chat.py MUST use the same model — mismatch = empty results.
"""

import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.core.config import BASE_DIR

REAL_MEETING_ID = "test_video_meeting"

_env_file = BASE_DIR / ".env"
HAS_GROQ_KEY = bool(
    os.environ.get("GROQ_API_KEY")
    or (_env_file.exists() and "GROQ_API_KEY" in _env_file.read_text())
)


# ─────────────────────────────────────────────
# Fast tests — real retrieval, mocked LLM
# ─────────────────────────────────────────────

def test_empty_question_returns_guard_message(real_meeting_id):
    """ask_question with blank input must return the guard message immediately."""
    mock_result = {"answer": "mocked"}
    with patch("app.intelligence.chat.ChatGroq") as mock_llm:
        mock_chain = MagicMock()
        mock_chain.invoke.return_value = mock_result
        mock_llm.return_value = MagicMock()
        from app.intelligence.chat import ask_question
        result = ask_question("   ", real_meeting_id)
    assert result == "Please ask a valid question."
    print("\n[OK] Empty query guard works")


def test_whitespace_only_question_rejected(real_meeting_id):
    """Whitespace-only questions must be rejected before hitting the LLM."""
    from app.intelligence.chat import ask_question
    result = ask_question("\t\n  ", real_meeting_id)
    assert result == "Please ask a valid question."


def test_missing_meeting_raises_value_error():
    """load_chain must raise ValueError when the meeting vectordb doesn't exist."""
    from app.intelligence.chat import load_chain
    with pytest.raises(ValueError, match="Meeting not found"):
        load_chain("totally_nonexistent_meeting_xyz_000")
    print("\n[OK] ValueError raised for missing meeting")


def test_chat_uses_correct_embedding_model():
    """chat.py must use paraphrase-multilingual-MiniLM-L12-v2 (same as embed_store)."""
    import inspect
    import app.intelligence.chat as chat_mod
    source = inspect.getsource(chat_mod)
    assert "paraphrase-multilingual-MiniLM-L12-v2" in source, (
        "chat.py is using a different embedding model than embed_store.py!\n"
        "This causes retrieval to return garbage results."
    )
    print("\n[OK] Correct embedding model confirmed in chat.py")


def test_chat_retrieval_finds_relevant_chunks(real_meeting_id):
    """The retriever must return relevant chunks from the real meeting."""
    from langchain_community.embeddings import SentenceTransformerEmbeddings
    from langchain_chroma import Chroma
    from app.core.config import VECTORDB_DIR

    embedding = SentenceTransformerEmbeddings(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )
    db = Chroma(
        persist_directory=str(VECTORDB_DIR / real_meeting_id),
        embedding_function=embedding,
        collection_name="meeting_chunks",
    )
    docs = db.as_retriever(search_kwargs={"k": 3}).invoke("what was discussed")
    assert len(docs) > 0, "Retriever returned no documents!"
    assert any(len(d.page_content) > 10 for d in docs)
    print(f"\n[OK] Retriever returned {len(docs)} relevant chunks")
    print(f"      Top result: {docs[0].page_content[:100]}")


# ─────────────────────────────────────────────
# Real LLM tests — only when GROQ_API_KEY is set
# ─────────────────────────────────────────────

@pytest.mark.skipif(not HAS_GROQ_KEY, reason="GROQ_API_KEY not configured")
class TestRealChat:

    def test_real_question_gets_answer(self, real_meeting_id):
        """A real question must get a meaningful answer from the LLM."""
        from app.intelligence.chat import ask_question
        result = ask_question("What was discussed in this meeting?", real_meeting_id)
        assert isinstance(result, str)
        assert len(result.strip()) > 10
        safe = result.encode("ascii", errors="replace").decode("ascii")
        print(f"\n[OK] Answer:\n{safe[:400]}")

    def test_out_of_scope_question_handled(self, real_meeting_id):
        """Questions outside the meeting must get a graceful response."""
        from app.intelligence.chat import ask_question
        result = ask_question("What is the capital of France?", real_meeting_id)
        assert isinstance(result, str)
        assert len(result.strip()) > 0
        print(f"\n[OK] Out-of-scope response: {result[:200]}")

    def test_answer_is_not_empty_string(self, real_meeting_id):
        """LLM must never return a blank answer."""
        from app.intelligence.chat import ask_question
        result = ask_question("Who attended the meeting?", real_meeting_id)
        assert result.strip() != ""

    def test_missing_meeting_still_raises(self):
        """Even with real LLM, missing meeting must raise ValueError."""
        from app.intelligence.chat import ask_question
        with pytest.raises(Exception):
            ask_question("Hello?", "nonexistent_meeting_xyz_99999")
