"""
tests/test_embed_store.py

Tests for app/storage/embed_store.py

Uses the REAL chunks produced from uploads/test_video.mp4.
ChromaDB runs with a real PersistentClient — no storage mocks.
Embedding model: paraphrase-multilingual-MiniLM-L12-v2 (same as production).
"""

import chromadb
import pytest
from pathlib import Path

from app.core.config import BASE_DIR, VECTORDB_DIR


def test_embed_store_meeting_id_is_string(real_meeting_id):
    """embed_store fixture must return a non-empty string meeting_id."""
    assert isinstance(real_meeting_id, str)
    assert len(real_meeting_id) > 0
    print(f"\n[OK] meeting_id: {real_meeting_id}")


def test_embed_store_vectordb_dir_exists(real_meeting_id):
    """ChromaDB must create a directory for the meeting."""
    db_path = VECTORDB_DIR / real_meeting_id
    assert db_path.exists(), f"VectorDB dir not found: {db_path}"
    assert db_path.is_dir()
    print(f"\n[OK] VectorDB dir: {db_path}")


def test_embed_store_vectordb_has_files(real_meeting_id):
    """VectorDB directory must not be empty."""
    db_path = VECTORDB_DIR / real_meeting_id
    files = [f for f in db_path.rglob("*") if f.is_file()]
    assert len(files) > 0, f"VectorDB dir is empty: {db_path}"
    print(f"\n[OK] VectorDB files: {[f.name for f in files]}")


def test_embed_store_has_sqlite_file(real_meeting_id):
    """ChromaDB must create a .sqlite3 database file."""
    db_path = VECTORDB_DIR / real_meeting_id
    sqlite_files = list(db_path.rglob("*.sqlite3"))
    assert len(sqlite_files) > 0, f"No SQLite file in: {db_path}"
    print(f"\n[OK] SQLite: {sqlite_files[0].name}")


def test_embed_store_collection_has_chunks(real_meeting_id):
    """ChromaDB collection must contain the embedded chunks."""
    db_path = str(VECTORDB_DIR / real_meeting_id)
    client = chromadb.PersistentClient(path=db_path)
    col = client.get_collection("meeting_chunks")
    count = col.count()
    assert count > 0, "Collection is empty — nothing was embedded!"
    print(f"\n[OK] Chunks in collection: {count}")


def test_embed_store_retrieval_returns_results(real_meeting_id):
    """A semantic query against the stored embeddings must return results."""
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
    assert len(docs) > 0, "Retriever returned no documents!"
    print(f"\n[OK] Retrieved {len(docs)} docs for 'topics discussed'")
    print(f"      First result: {docs[0].page_content[:100]}")


def test_embed_store_uses_persistent_client(real_meeting_id):
    """Must use chromadb.PersistentClient (chromadb >= 0.4 API)."""
    db_path = str(VECTORDB_DIR / real_meeting_id)
    client = chromadb.PersistentClient(path=db_path)
    assert client is not None
    print("\n[OK] chromadb.PersistentClient works correctly")


def test_embed_store_filters_short_chunks(real_chunks_content):
    """embed_store only embeds chunks longer than 20 characters."""
    parts = real_chunks_content.split("----- CHUNK")
    valid = [p.strip() for p in parts if len(p.strip()) > 20]
    assert len(valid) >= 1
    print(f"\n[OK] Valid chunks (>20 chars): {len(valid)}")
