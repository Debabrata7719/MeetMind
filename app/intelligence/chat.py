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
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.chat_message_histories import RedisChatMessageHistory

from langchain_classic.chains import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferWindowMemory

from langchain_core.prompts import PromptTemplate


# ===============================
# PATH SETUP
# ===============================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
VECTORDB_DIR = BASE_DIR / "data" / "vectordb"

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")


# ===============================
# EMBEDDING (load once → faster)
# MUST match the model used in embed_store.py
# ===============================
embedding = SentenceTransformerEmbeddings(
    model_name="paraphrase-multilingual-MiniLM-L12-v2"
)


# ===============================
# LLM (load once)
# ===============================
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
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
# RETRIEVER CACHE — reuse Chroma connection per meeting
# key: meeting_id → value: retriever instance
# ===============================
_retriever_cache: dict = {}


# ===============================
# HELPER → Load retriever for meeting
# ===============================
def _get_retriever(meeting_id: str):
    """
    Returns a cached retriever for the meeting.
    Chroma DB connections are reusable and stateless.
    """

    if meeting_id in _retriever_cache:
        return _retriever_cache[meeting_id]

    db_path = VECTORDB_DIR / meeting_id

    if not db_path.exists():
        raise ValueError(f"Meeting not found: {meeting_id}")

    db = Chroma(
        persist_directory=str(db_path),
        embedding_function=embedding,
        collection_name="meeting_chunks"
    )

    retriever = db.as_retriever(
        search_kwargs={"k": 7}
    )

    _retriever_cache[meeting_id] = retriever
    return retriever


# ===============================
# MAIN FUNCTION (API safe)
# ===============================
def ask_question(query: str, meeting_id: str, user_id: int) -> str:
    """
    Called by FastAPI.

    Each user + meeting combination:
      → separate vectordb retriever (cached)
      → separate Redis-backed memory (survives restarts + multi-worker)
    """

    if not query.strip():
        return "Please ask a valid question."

    retriever = _get_retriever(meeting_id)

    # Redis-backed chat history — scoped per user + meeting
    session_id = f"chat:{user_id}:{meeting_id}"
    chat_history = RedisChatMessageHistory(
        session_id=session_id,
        url=REDIS_URL,
    )

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

    result = chain.invoke({
        "question": query.strip()
    })

    answer = result["answer"].strip()

    # ===== Extra Safety Filter =====
    if not answer:
        return "Not found in the meeting transcript"

    return answer
