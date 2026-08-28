# ===============================
# LOAD ENV
# ===============================
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv()


# ===============================
# IMPORTS
# ===============================
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from langchain_community.chat_message_histories import RedisChatMessageHistory

from langchain_classic.chains import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferWindowMemory

from langchain_core.prompts import PromptTemplate


# ===============================
# PATH SETUP
# ===============================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")


# ===============================
# EMBEDDING (load once → faster)
# MUST match the model used in embed_store.py
# ===============================
from src.infrastructure.ai.embeddings import shared_embedding_model as embedding


# ===============================
# LLM (load once)
# ===============================
from langchain_groq import ChatGroq
llm = ChatGroq(
    model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
    groq_api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3
)


# ===============================
# PROMPT (UPGRADED INTELLIGENCE)
# ===============================
template = """
You are an expert meeting assistant with memory of the conversation.

STRICT RULES:
- Answer from the meeting context provided below
- For follow-up questions (e.g. "what do you mean", "explain that", "tell me more"),
  use the chat history to understand what is being referred to
- Do NOT guess or hallucinate information not in the meeting
- If the answer is truly not in the meeting transcript or chat history → say: "Not found in the meeting transcript"
- Keep answers concise but complete
- Prefer bullet points if multiple items
- Preserve numbers, dates, and names exactly

Language Rule:
Respond in the SAME language as the question.

Chat History:
{chat_history}

Meeting Context:
{context}

Question:
{question}

Answer:
"""

prompt = PromptTemplate(
    template=template,
    input_variables=["context", "question", "chat_history"]
)


# ===============================
# RETRIEVER CACHE — reuse Qdrant connection per meeting
# key: meeting_id → value: retriever instance
# ===============================
_retriever_cache: dict = {}


# ===============================
# HELPER → Load retriever for meeting
# ===============================
def _get_retriever(meeting_id: str):
    """
    Returns a cached retriever for the meeting.
    Qdrant clients are reusable.
    """

    if meeting_id in _retriever_cache:
        return _retriever_cache[meeting_id]

    if not QDRANT_URL or not QDRANT_API_KEY:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env")

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    # Check if the meeting exists in the metadata
    # The collection is "meetings", we filter by meeting_id metadata
    
    # We create the vector store with a metadata filter
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

    # Use a similarity search with filter
    from langchain_core.documents import Document
    
    # Create a custom retriever that filters by meeting_id
    retriever = qdrant.as_retriever(
        search_kwargs={
            "k": 7,
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

    _retriever_cache[meeting_id] = retriever
    return retriever


# ===============================
# MAIN FUNCTION (API safe)
# ===============================
import redis
import json
import numpy as np

# Redis client for semantic cache
redis_client = redis.from_url(REDIS_URL)

def ask_question(query: str, meeting_id: str, user_id: int):
    import hashlib

    if not query.strip():
        return "Please ask a valid question."

    query_clean = query.strip()

    # Redis-backed chat history — scoped per user + meeting
    session_id = f"chat:{user_id}:{meeting_id}"
    chat_history = RedisChatMessageHistory(
        session_id=session_id,
        url=REDIS_URL,
    )

    # ===============================
    # Semantic Cache Check
    # ===============================
    # Include history context in the cache key to prevent follow-up key collisions
    recent_msgs = chat_history.messages[-5:]
    history_str = "".join([f"{msg.type}:{msg.content}" for msg in recent_msgs])
    cache_key_raw = f"{query_clean}_{history_str}"
    cache_key = f"semantic_cache:{user_id}:{meeting_id}:{hashlib.sha256(cache_key_raw.encode()).hexdigest()}"
    
    cached_answer = redis_client.get(cache_key)
    if cached_answer:
        return cached_answer.decode('utf-8')

    # 4. Cache Miss - run the chain
    retriever = _get_retriever(meeting_id)

    memory = ConversationBufferWindowMemory(
        k=5,
        memory_key="chat_history",
        return_messages=True,
        chat_memory=chat_history,
    )

    # Build chain fresh each request with Redis-backed memory
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt}
    )

    result = chain.invoke({"question": query_clean, "chat_history": chat_history})

    # Cache the result
    redis_client.set(cache_key, result["answer"], ex=3600)

    answer = result["answer"].strip()

    # Apply extra safety filter
    if "don't know" in answer.lower() or "don't have enough" in answer.lower() or "do not have enough" in answer.lower() or not answer:
        answer = "Not found in the meeting transcript"

    return answer

import asyncio
from langchain_core.callbacks import AsyncCallbackHandler

class AsyncIteratorCallbackHandler(AsyncCallbackHandler):
    def __init__(self):
        self.queue = asyncio.Queue()
        self.done = asyncio.Event()

    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.queue.put_nowait(token)

    async def on_llm_end(self, response, **kwargs) -> None:
        self.done.set()
        
    async def on_llm_error(self, error, **kwargs) -> None:
        self.done.set()

    async def aiter(self):
        while not self.queue.empty() or not self.done.is_set():
            try:
                # Wait for the next token with a short timeout
                token = await asyncio.wait_for(self.queue.get(), timeout=0.1)
                yield token
            except asyncio.TimeoutError:
                continue

async def ask_question_stream(query: str, meeting_id: str, user_id: int):
    import hashlib
    
    if not query.strip():
        yield "Please ask a valid question."
        return

    query_clean = query.strip()

    session_id = f"chat:{user_id}:{meeting_id}"
    chat_history = RedisChatMessageHistory(session_id=session_id, url=REDIS_URL)

    # ===============================
    # Semantic Cache Check
    # ===============================
    # Include history context in the cache key to prevent follow-up key collisions
    recent_msgs = chat_history.messages[-5:]
    history_str = "".join([f"{msg.type}:{msg.content}" for msg in recent_msgs])
    cache_key_raw = f"{query_clean}_{history_str}"
    cache_key = f"semantic_cache:{user_id}:{meeting_id}:{hashlib.sha256(cache_key_raw.encode()).hexdigest()}"
    
    cached_answer = await asyncio.to_thread(redis_client.get, cache_key)
    if cached_answer:
        yield cached_answer.decode('utf-8')
        return

    retriever = _get_retriever(meeting_id)

    # Retrieve relevant documents via non-blocking async I/O
    try:
        docs = await retriever.ainvoke(query_clean)
        context_text = "\n\n".join([d.page_content for d in docs])
    except Exception as e:
        print(f"[Retrieval Error] {e}")
        context_text = "No context found."

    # Format chat history from Redis history (mimicking ConversationBufferWindowMemory)
    chat_history_str = ""
    for msg in chat_history.messages[-5:]:
        role = "User" if msg.type == "human" else "AI"
        chat_history_str += f"{role}: {msg.content}\n"

    # Build input prompt
    formatted_prompt = prompt.format(
        context=context_text,
        question=query_clean,
        chat_history=chat_history_str
    )

    streaming_llm = ChatGroq(
        model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3,
        streaming=True
    )

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
    try:
        async for chunk in streaming_llm.astream(formatted_prompt):
            token = extract_text_content(chunk.content)
            if token:
                full_answer += token
                yield token
    except Exception as e:
        print(f"[WebSocket Error] {e}")
        yield f"[ERROR] Streaming failed: {e}"
        return

    # Apply extra safety filter
    if "don't know" in full_answer.lower() or "don't have enough" in full_answer.lower() or "do not have enough" in full_answer.lower() or not full_answer:
        full_answer = "Not found in the meeting transcript"

    await asyncio.to_thread(redis_client.set, cache_key, full_answer.strip(), ex=3600)
