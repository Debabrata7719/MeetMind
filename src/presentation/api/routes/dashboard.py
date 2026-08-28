from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.presentation.dependencies import get_current_user
from src.infrastructure.database import get_db
from src.domain.models import Meeting, AIHighlight, ChatMessage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_dashboard_metrics(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user["user_id"]
    
    # 1. Total Meetings
    total_meetings = db.query(Meeting).filter(Meeting.user_id == user_id).count()
    
    # 2. Recording Time (sum of durations in seconds)
    total_duration_sec = db.query(func.sum(Meeting.duration)).filter(Meeting.user_id == user_id).scalar()
    total_duration_sec = total_duration_sec or 0
    
    # 3. AI Highlights Count (count distinct meetings that have highlights)
    ai_highlights = db.query(func.count(func.distinct(AIHighlight.meeting_id)))\
                      .select_from(AIHighlight)\
                      .join(Meeting)\
                      .filter(Meeting.user_id == user_id)\
                      .scalar() or 0
    
    # 4. Questions Asked (user role chat messages)
    questions_asked = db.query(ChatMessage).join(Meeting).filter(
        Meeting.user_id == user_id, 
        ChatMessage.role == 'user'
    ).count()
    
    return {
        "total_meetings": total_meetings,
        "total_recording_time_sec": total_duration_sec,
        "ai_highlights": ai_highlights,
        "questions_asked": questions_asked
    }


@router.get("/search")
def search_meetings(query: str, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    import os
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as rest_models
    from langchain_qdrant import QdrantVectorStore
    from src.infrastructure.ai.embeddings import shared_embedding_model as embedding
    from langchain_groq import ChatGroq
    from langchain_core.prompts import ChatPromptTemplate

    user_id = user["user_id"]
    
    # 1. Fetch user's meetings to check ownership and map details
    meetings = db.query(Meeting).filter(Meeting.user_id == user_id).all()
    if not meetings:
        return {"answer": "You don't have any processed meetings yet to search through.", "results": []}

    meeting_ids = [m.meeting_id for m in meetings]
    meeting_map = {m.meeting_id: m for m in meetings}

    # 2. Setup Qdrant vector store connection
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    if not qdrant_url or not qdrant_api_key:
        return {"answer": "Vector store connection is not configured.", "results": []}

    client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    collection_name = os.getenv("QDRANT_COLLECTION_NAME", "meetings")

    qdrant = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
        embedding=embedding
    )

    # 3. Retrieve matches filtered to user's meetings
    try:
        retriever = qdrant.as_retriever(
            search_kwargs={
                "k": 6,
                "filter": rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="metadata.meeting_id",
                            match=rest_models.MatchAny(any=meeting_ids)
                        )
                    ]
                )
            }
        )
        docs = retriever.invoke(query)
    except Exception as e:
        print(f"[Search Error] Failed querying Qdrant: {e}")
        return {"answer": "Failed to search vector store.", "results": []}

    if not docs:
        return {"answer": "No matching context found in your meetings.", "results": []}

    # 4. Construct context and results payloads
    context_list = []
    results = []
    for doc in docs:
        mid = doc.metadata.get("meeting_id")
        meeting = meeting_map.get(mid)
        mname = meeting.name if meeting else "Unknown Meeting"
        mdate = meeting.created_at.strftime("%b %d, %Y") if meeting and meeting.created_at else "Unknown Date"
        
        context_list.append(f"Meeting: {mname} (Date: {mdate})\nContent: {doc.page_content.strip()}")
        results.append({
            "meeting_id": mid,
            "meeting_title": mname,
            "meeting_date": mdate,
            "content": doc.page_content.strip()
        })

    # 5. Synthesize answer using Groq LLM
    try:
        llm = ChatGroq(
            model=os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-120b"),
            groq_api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3
        )
        
        prompt = ChatPromptTemplate.from_template("""
You are an expert meeting intelligence assistant. Use the following matching excerpts from the user's meetings to answer the question.
Be precise, clear, and refer to which meetings/dates the information comes from.
If the context doesn't contain the answer, say "Based on your meetings, I couldn't find details regarding this query."

Context:
{context}

Question: {question}
Answer:
""")
        
        chain = prompt | llm
        response = chain.invoke({
            "context": "\n\n---\n\n".join(context_list),
            "question": query
        })
        answer = response.content
    except Exception as llm_err:
        print(f"[Search Error] LLM synthesis failed: {llm_err}")
        answer = "Could not synthesize answer. Showing direct match results below."

    return {
        "answer": answer,
        "results": results
    }

