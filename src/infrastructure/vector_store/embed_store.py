import os
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from src.infrastructure.ai.embeddings import shared_embedding_model

def embed_store(chunks: list[str], meeting_id: str):
    """
    Store embeddings using Qdrant cloud.
    """
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if not qdrant_url or not qdrant_api_key:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env")

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)

    print(f"[OK] Storing {len(chunks)} chunks into Qdrant for meeting: {meeting_id}")

    # We use a single collection "meetings" and filter by meeting_id metadata
    # QdrantVectorStore.from_texts handles collection creation automatically if it doesn't existadata.
    # To isolate meetings, we use a single collection "meetings" 
    # and filter by the meeting_id metadata.
    # but Qdrant's best practice is a single collection with payload filters.
    # Let's stick to the single collection pattern to be more robust.
    # but since we want to specify it properly:
    # Actually Qdrant requires creating the collection first if it doesn't exist, 
    # but QdrantVectorStore.from_texts handles that.

    metadatas = [{"meeting_id": meeting_id} for _ in chunks]

    QdrantVectorStore.from_texts(
        chunks,
        shared_embedding_model,
        url=qdrant_url,
        api_key=qdrant_api_key,
        collection_name="meetings",
        metadatas=metadatas,
        force_recreate=False  # Append to existing "meetings" collection
    )

    print(f"[OK] Stored embeddings in Qdrant collection 'meetings'")

    return "meetings"
