# Meeting Intelligence System

A highly-scalable, cloud-native backend designed to transcribe massive meeting recordings, generate semantic embeddings, and answer conversational queries in real-time.

## Architecture

This system has been upgraded to a robust, cloud-native architecture capable of handling 100GB+ video uploads and processing thousands of concurrent users:

- **Frontend:** Next.js (Deployed on Vercel)
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL (Supabase) via SQLAlchemy
- **Vector Database:** Qdrant Cloud
- **Message Broker & Cache:** Upstash Redis (Cloud Redis)
- **Background Workers:** Celery (Pipeline & Webhook execution)
- **Storage:** Cloudinary (Direct-to-cloud uploads bypassing the backend)
- **AI Transcription:** AssemblyAI
- **AI Embeddings:** VoyageAI
- **AI Chat LLM:** Llama-3-70B via Groq

## End-to-End Workflow

1. **Direct-to-Cloud Upload:** The Next.js frontend requests an HMAC signature (`GET /upload/signature`) from the backend. The frontend then securely uploads massive video files *directly* to Cloudinary, avoiding backend server limits and 413 Payload Too Large errors.
2. **Task Queueing:** The frontend sends the Cloudinary `secure_url` to the backend. The backend saves metadata to Supabase and dispatches a Celery task to Upstash Redis.
3. **AI Processing Pipeline (Celery Worker):** 
   - Celery pulls the task from Redis.
   - It submits the Cloudinary URL natively to **AssemblyAI** for extremely fast transcription.
   - The transcript is split via LangChain and sent to **VoyageAI** for highly-accurate dense vector embeddings.
   - The embeddings are upserted into **Qdrant Cloud** with metadata filtering (`meeting_id`).
   - The Celery worker then connects to the Cloudinary SDK and **permanently deletes the video**, ensuring 0% storage bloat.
4. **Real-time WebSockets:** The user connects to `/ws/chat/{meeting_id}`. 
   - A DDoS protection lock ensures overlapping generation requests are ignored.
   - **Groq** streams the Llama-3 response directly back to the user interface.
5. **Independent Webhook Dispatch:** If the user has external integrations (e.g. Zapier, Slack), a separate Celery dispatcher spawns independent sub-tasks for *each* webhook. If one endpoint fails, only that specific webhook goes into exponential backoff (up to 5 retries).
6. **Midnight Cron Cleanup:** A Celery Beat scheduler runs precisely at 00:00 UTC every night, completely flushing the Upstash Redis cache and wiping any orphaned resources from Cloudinary.

## Running the Application

### 1. Start the API Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Celery Worker (Pipeline & Webhooks)
Windows (using solo pool):
```bash
celery -A src.infrastructure.workers.celery_app worker -P solo -l INFO
```
Linux/Mac:
```bash
celery -A src.infrastructure.workers.celery_app worker -l INFO
```

### 3. Start the Celery Beat Scheduler (Midnight Cleanup)
```bash
celery -A src.infrastructure.workers.celery_app beat -l INFO
```

## Migration & DB Management
Run Alembic to apply schema upgrades (e.g., adding Google OAuth Profile Images):
```bash
alembic upgrade head
```