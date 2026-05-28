import os
import chromadb
from app.intelligence.embeddings import shared_embedding_model

def embed_store(chunks_file: str, meeting_id: str):
    """
    Store embeddings using SAME meeting_id from backend.
    DO NOT generate new id here.
    """

    persist_directory = os.path.join(
        "data",
        "vectordb",
        meeting_id
    )

    collection_name = "meeting_chunks"

    chunks = []

    with open(chunks_file, "r", encoding="utf-8") as f:
        text = f.read()

    raw_chunks = text.split("----- CHUNK")

    for c in raw_chunks:
        c = c.strip()
        if len(c) > 20:
            chunks.append(c)

    print(f"[OK] Loaded {len(chunks)} chunks")

    embeddings = shared_embedding_model.embed_documents(chunks)

    os.makedirs(persist_directory, exist_ok=True)

    # Use PersistentClient (chromadb >= 0.4 API)
    # Old API: chromadb.Client(settings=chromadb.Settings(persist_directory=...))
    client = chromadb.PersistentClient(path=persist_directory)

    collection = client.get_or_create_collection(collection_name)

    import uuid
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[uuid.uuid4().hex for _ in range(len(chunks))]
    )


    print(f"[OK] Stored embeddings in: {persist_directory}")

    return persist_directory
