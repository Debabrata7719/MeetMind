from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()


def extract_highlights(meeting_id: str):

    print("[INFO] Extracting meeting highlights...")

    # ========= Embedding =========
    # MUST match the model used in embed_store.py
    embedding = SentenceTransformerEmbeddings(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )

    # ========= LOAD MEETING-SPECIFIC DB =========
    db_path = os.path.join("data", "vectordb", meeting_id)

    db = Chroma(
        persist_directory=db_path,
        embedding_function=embedding,
        collection_name="meeting_chunks"
    )

    retriever = db.as_retriever(search_kwargs={"k": 6})

    # ========= Queries (Improved) =========
    queries = [
        "important topics discussed",
        "key decisions made",
        "tasks assigned or action items",
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
        model_name="openai/gpt-oss-120b",
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

    # ========= Save =========
    os.makedirs("Notes", exist_ok=True)

    with open(f"Notes/highlights_{meeting_id}.txt", "w", encoding="utf-8") as f:
        f.write(result)

    print("[OK] Highlights saved")
    return result
