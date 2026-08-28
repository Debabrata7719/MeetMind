from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from langchain_core.prompts import ChatPromptTemplate
import os
import redis
import asyncio
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
    
    collection_name = os.getenv("QDRANT_COLLECTION_NAME", "meetings")
    try:
        client.get_collection(collection_name=collection_name)
    except Exception:
        dummy_vector = embedding.embed_query("dummy text")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=rest_models.VectorParams(
                size=len(dummy_vector),
                distance=rest_models.Distance.COSINE
            )
        )
    
    # Ensure payload index on metadata.meeting_id is present
    try:
        client.create_payload_index(
            collection_name=collection_name,
            field_name="metadata.meeting_id",
            field_schema="keyword"
        )
    except Exception:
        pass

    qdrant = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
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

    # ========= Queries (Combined to respect Voyage 3 RPM limit) =========
    queries = [
        "important topics, key decisions, and critical conclusions",
        "tasks assigned, action items, deadlines, and commitments"
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
    from langchain_groq import ChatGroq
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0
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

    if isinstance(result, list):
        text_parts = []
        for part in result:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                text_parts.append(part["text"])
        result = "\n".join(text_parts)
    else:
        result = str(result)

    # ========= Cache in Redis =========
    redis_client.set(cache_key, result, ex=86400)

    print("[OK] Highlights generated and cached in Redis")
    return result


async def extract_highlights_stream(meeting_id: str):
    cache_key = f"highlights:{meeting_id}"
    cached = await asyncio.to_thread(redis_client.get, cache_key)
    if cached:
        print(f"[INFO] Returning cached highlights for {meeting_id} from Redis")
        yield cached
        return

    print("[INFO] Extracting meeting highlights from VectorDB (Streaming)...")

    from src.infrastructure.ai.embeddings import shared_embedding_model as embedding

    # ========= LOAD QDRANT DB =========
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if not qdrant_url or not qdrant_api_key:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env")

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    
    collection_name = os.getenv("QDRANT_COLLECTION_NAME", "meetings")
    try:
        client.get_collection(collection_name=collection_name)
    except Exception:
        dummy_vector = embedding.embed_query("dummy text")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=rest_models.VectorParams(
                size=len(dummy_vector),
                distance=rest_models.Distance.COSINE
            )
        )
    
    try:
        client.create_payload_index(
            collection_name=collection_name,
            field_name="metadata.meeting_id",
            field_schema="keyword"
        )
    except Exception:
        pass

    qdrant = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
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

    # ========= Queries (Combined to respect Voyage 3 RPM limit) =========
    queries = [
        "important topics, key decisions, and critical conclusions",
        "tasks assigned, action items, deadlines, and commitments"
    ]

    chunks = []
    for q in queries:
        docs = await retriever.ainvoke(q)
        chunks.extend([d.page_content.strip() for d in docs])

    unique_chunks = list(dict.fromkeys(chunks))
    context = "\n\n".join(unique_chunks[:12])

    # ========= LLM =========
    from langchain_groq import ChatGroq
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0,
        streaming=True
    )

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

    def extract_text_content(content) -> str:
        if isinstance(content, str):
            return content
        elif isinstance(content, list):
            return "".join(extract_text_content(item) for item in content)
        elif isinstance(content, dict):
            if "text" in content:
                return str(content["text"])
            return ""
        return str(content)

    full_answer = ""
    async for chunk in chain.astream({"text": context}):
        token = extract_text_content(chunk.content)
        if token:
            full_answer += token
            yield token

    if full_answer:
        await asyncio.to_thread(redis_client.set, cache_key, full_answer.strip(), ex=86400)
        print("[OK] Highlights generated and cached in Redis")

