# ===============================
# LOAD ENV
# ===============================
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()


# ===============================
# IMPORTS
# ===============================
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings

from langchain_classic.chains import ConversationalRetrievalChain
from langchain_classic.memory import ConversationBufferWindowMemory

from langchain_core.prompts import PromptTemplate


# ===============================
# PATH SETUP
# ===============================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
VECTORDB_DIR = BASE_DIR / "data" / "vectordb"


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
    model_name="openai/gpt-oss-120b",
    temperature=0
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
# CHAIN CACHE — persists memory across API calls
# key: meeting_id → value: chain instance with memory
# ===============================
_chain_cache: dict = {}


# ===============================
# HELPER → Load DB for meeting
# ===============================
def load_chain(meeting_id: str):
    """
    Returns a cached chain for the meeting so memory persists
    across multiple API calls in the same session.
    Creates a new chain only on first call for that meeting_id.
    """

    if meeting_id in _chain_cache:
        return _chain_cache[meeting_id]

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

    memory = ConversationBufferWindowMemory(
        k=5,
        memory_key="chat_history",
        return_messages=True
    )

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt}
    )

    _chain_cache[meeting_id] = chain
    return chain


# ===============================
# MAIN FUNCTION (API safe)
# ===============================
def ask_question(query: str, meeting_id: str) -> str:
    """
    Called by FastAPI.

    Each meeting:
      → separate vectordb
      → separate memory
    """

    if not query.strip():
        return "Please ask a valid question."

    qa_chain = load_chain(meeting_id)

    result = qa_chain.invoke({
        "question": query.strip()
    })

    answer = result["answer"].strip()

    # ===== Extra Safety Filter =====
    if not answer:
        return "Not found in the meeting transcript"

    return answer
