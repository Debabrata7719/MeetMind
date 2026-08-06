from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
def extract_highlights(meeting_id: str):
    cache_key = f"highlights:{meeting_id}"
    cached = redis_client.get(cache_key)
    if cached:
        print(f"[INFO] Returning cached highlights for {meeting_id} from Redis")
        return cached

    print("[INFO] Extracting meeting highlights from VectorDB...")

    from src.infrastructure.ai.embeddings import shared_embedding_model as embedding

    # ========= LOAD QDRANT DB =========
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if not qdrant_url or not qdrant_api_key:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env")

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    
    qdrant = QdrantVectorStore(
        client=client,
        collection_name="meetings",
        embedding=embedding
    )

    retriever = qdrant.as_retriever(
        search_kwargs={
            "k": 6,
            "filter": rest_models.Filter(
                must=[
                    rest_models.FieldCondition(
                        key="metadata.meeting_id",
                        match=rest_models.MatchValue(value=meeting_id)
                    )
                ]
            )
        }
    )

    # ========= Queries (Improved) =========
    queries = [
        "important topics discussed",
        "key decisions made",
        "src.infrastructure.workers.tasks assigned or action items",
        "deadlines or commitments",
        "critical points or conclusions"
    ]

    chunks = []

    for q in queries:
        docs = retriever.invoke(q)
        chunks.extend([d.page_content.strip() for d in docs])

    # ========= Remove duplicate chunks =========
    unique_chunks = list(dict.fromkeys(chunks))

    # ========= Limit context size =========
    context = "\n\n".join(unique_chunks[:12])

    # ========= LLM =========
    llm = ChatGroq(
        model_name="llama-3.3-70b-versatile",
        temperature=0,
        request_timeout=30
    )

    # ========= Prompt (Upgraded Intelligence) =========
    prompt = ChatPromptTemplate.from_template("""
You are an expert meeting analyst.

Extract only the MOST IMPORTANT highlights.

Rules:
- Only include decisions, action items, deadlines, or key conclusions
- Ignore filler conversation or casual talk
- Each highlight must be one concise sentence
- Do NOT repeat similar points
- Maximum 8 highlights

Format:
• Highlight

Meeting Text:
{text}
""")

    chain = prompt | llm

    result = chain.invoke({"text": context}).content

    # ========= Cache in Redis =========
    redis_client.set(cache_key, result, ex=86400)

    print("[OK] Highlights generated and cached in Redis")
    return result
