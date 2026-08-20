# MeetMind — Meeting Intelligence & Conversational AI System

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-DC2626?style=for-the-badge&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Upstash%20Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Groq](https://img.shields.io/badge/Groq%20Llama--3-F05A28?style=for-the-badge&logoColor=white)](https://groq.com/)

A cloud-native, enterprise-grade meeting intelligence backend engineered to transcribe massive audio/video recordings, generate dense vector embeddings, extract actionable highlights, and answer conversational questions in real-time with sub-second streaming responses.

---

## 🏗️ 1. System Architectural Diagram

The system is built on **Clean Architecture (Domain-Driven Design)** with decoupled layers, asynchronous task queues, resilient retry mechanisms, and zero-storage bloat.

```mermaid
flowchart TB
    %% ─────────────────────────────────────────────────────────────
    %% STYLING & CLASSES
    %% ─────────────────────────────────────────────────────────────
    classDef client fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef gateway fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef appLayer fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f8fafc;
    classDef queue fill:#451a03,stroke:#f97316,stroke-width:2px,color:#f8fafc;
    classDef worker fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#3b0764,stroke:#d946ef,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#1e293b,stroke:#06b6d4,stroke-width:2px,color:#f8fafc;
    classDef ext fill:#1f2937,stroke:#64748b,stroke-width:2px,color:#f8fafc;

    %% ─────────────────────────────────────────────────────────────
    %% CLIENT LAYER
    %% ─────────────────────────────────────────────────────────────
    subgraph ClientLayer["🖥️ Client Layer (Next.js / Frontend)"]
        UI["Next.js Web Application"]:::client
        UploadWidget["Direct-to-Cloud Uploader"]:::client
        ChatClient["Streaming Chat UI (WebSocket)"]:::client
        ProgressTracker["Live Progress Bar (WebSocket)"]:::client
    end

    %% ─────────────────────────────────────────────────────────────
    %% API GATEWAY & PRESENTATION LAYER
    %% ─────────────────────────────────────────────────────────────
    subgraph GatewayLayer["⚡ Presentation Layer (FastAPI Gateway)"]
        API["FastAPI App (main.py)"]:::gateway
        Limiter["SlowAPI Rate Limiter"]:::gateway
        AuthRouter["Auth Router (JWT / OAuth / OTP)"]:::gateway
        UploadRouter["Upload Router (Cloudinary HMAC Signature)"]:::gateway
        MeetingRouter["Meeting Router (CRUD / Notes / Chat)"]:::gateway
        StatusRouter["Status Router (Polling & Job State)"]:::gateway
        WSRouter["WebSocket Manager (Progress & Chat Streaming)"]:::gateway
        WebhookRouter["Webhooks Router (Registration & CRUD)"]:::gateway
        DashboardRouter["Dashboard Router (User Metrics)"]:::gateway
    end

    %% ─────────────────────────────────────────────────────────────
    %% APPLICATION / DOMAIN LAYER
    %% ─────────────────────────────────────────────────────────────
    subgraph AppLayer["🧠 Application & Domain Layer"]
        MeetingService["Meeting Service (Orchestrator)"]:::appLayer
        AuthService["Auth & Session Service"]:::appLayer
        SecurityModule["Security & Password Engine (bcrypt/JWT)"]:::appLayer
        TextChunker["LangChain Recursive Chunker"]:::appLayer
        EmailService["Gmail SMTP OTP Service"]:::appLayer
    end

    %% ─────────────────────────────────────────────────────────────
    %% ASYNC QUEUE & CACHING LAYER
    %% ─────────────────────────────────────────────────────────────
    subgraph QueueLayer["📦 Message Broker, Cache & Pub/Sub (Upstash Redis)"]
        TaskQueue[("Celery Task Broker (Redis)")]:::queue
        PubSub[("Redis Pub/Sub (job_updates:meeting_id)")]:::queue
        JobCache[("Job Progress Hash Store (TTL: 2h)")]:::queue
        SemanticCache[("Semantic Chat Cache (TTL: 1h)")]:::queue
        ChatHistoryStore[("Redis Chat History Buffer")]:::queue
        APICache[("FastAPI Route Response Cache")]:::queue
    end

    %% ─────────────────────────────────────────────────────────────
    %% BACKGROUND WORKERS & SCHEDULERS
    %% ─────────────────────────────────────────────────────────────
    subgraph WorkerLayer["⚙️ Worker Layer (Celery Workers & Beat)"]
        CeleryWorker["Pipeline Worker (process_meeting_task)"]:::worker
        WebhookWorker["Webhook Worker (trigger_single_webhook)"]:::worker
        CeleryBeat["Celery Beat Scheduler"]:::worker
        MidnightCleanup["Midnight Cleanup Cron (00:00 UTC)"]:::worker
        UploadCleanup["Stale Uploads Cleaner (02:00 UTC)"]:::worker
    end

    %% ─────────────────────────────────────────────────────────────
    %% AI & INTELLIGENCE SERVICES
    %% ─────────────────────────────────────────────────────────────
    subgraph AILayer["🤖 AI & Intelligence Layer"]
        AssemblyAI["AssemblyAI (Audio/Video Transcription)"]:::ai
        VoyageAI["VoyageAI (voyage-3.5-lite Embeddings)"]:::ai
        GroqChat["Groq (Llama-3.3-70B Chat Stream)"]:::ai
        GroqHighlights["Groq (Llama-3.3-70B Highlights Extractor)"]:::ai
    end

    %% ─────────────────────────────────────────────────────────────
    %% PERSISTENCE & CLOUD STORAGE LAYER
    %% ─────────────────────────────────────────────────────────────
    subgraph StorageLayer["💾 Persistence & Cloud Storage"]
        PostgresDB[("Supabase PostgreSQL DB")]:::storage
        QdrantDB[("Qdrant Cloud Vector DB")]:::storage
        CloudinaryStore["Cloudinary Storage (Direct Ingestion)"]:::storage
    end

    %% ─────────────────────────────────────────────────────────────
    %% EXTERNAL INTEGRATIONS
    %% ─────────────────────────────────────────────────────────────
    subgraph ExtServices["🌐 External Integrations"]
        GoogleOAuth["Google OAuth 2.0 (SSO)"]:::ext
        SMTP["Gmail SMTP Server"]:::ext
        WebhookEndpoints["External Webhooks (Zapier / Slack / Custom)"]:::ext
    end

    %% ─────────────────────────────────────────────────────────────
    %% RELATIONSHIPS & CONNECTIONS
    %% ─────────────────────────────────────────────────────────────
    UI -->|HTTP / Cookies| API
    UploadWidget -->|1. Request HMAC Signature| UploadRouter
    UploadWidget -->|2. Direct Upload Video| CloudinaryStore
    UploadWidget -->|3. Send Cloudinary URL| UploadRouter

    ChatClient -->|Realtime Chat Stream| WSRouter
    ProgressTracker -->|Listen for Progress| WSRouter

    API --> Limiter
    Limiter --> AuthRouter & UploadRouter & MeetingRouter & StatusRouter & WSRouter & WebhookRouter & DashboardRouter

    AuthRouter --> AuthService & SecurityModule
    AuthRouter --> GoogleOAuth
    AuthRouter --> EmailService --> SMTP
    UploadRouter --> MeetingService
    MeetingRouter --> MeetingService
    WebhookRouter --> PostgresDB
    DashboardRouter --> PostgresDB

    MeetingService --> PostgresDB
    AuthService --> PostgresDB

    UploadRouter -->|Enqueue Job| TaskQueue
    UploadRouter -->|Set Status = Queued| JobCache

    TaskQueue --> CeleryWorker
    CeleryBeat --> MidnightCleanup & UploadCleanup
    MidnightCleanup -->|Wipe DB| TaskQueue
    MidnightCleanup -->|Delete Videos| CloudinaryStore

    CeleryWorker -->|1. Fetch & Transcribe| AssemblyAI
    AssemblyAI -.->|Read Direct Stream| CloudinaryStore
    CeleryWorker -->|2. Chunk Transcript| TextChunker
    CeleryWorker -->|3. Generate Embeddings| VoyageAI
    CeleryWorker -->|4. Upsert Vectors| QdrantDB
    CeleryWorker -->|5. Extract Highlights| GroqHighlights
    CeleryWorker -->|6. Save Duration & Highlights| PostgresDB
    CeleryWorker -->|7. Publish Progress Updates| PubSub
    CeleryWorker -->|8. Update Progress Hash| JobCache
    CeleryWorker -->|9. Zero-Storage Wipe| CloudinaryStore
    CeleryWorker -->|10. Dispatch Webhook Event| WebhookWorker

    WebhookWorker -->|HMAC-SHA256 Signed POST| WebhookEndpoints

    WSRouter -->|Subscribe| PubSub
    WSRouter -->|Check Cache| SemanticCache
    WSRouter -->|Retrieve History| ChatHistoryStore
    WSRouter -->|Vector Search k=7| QdrantDB
    WSRouter -->|Stream Inference Tokens| GroqChat
    WSRouter -->|Persist Q&A| PostgresDB

    StatusRouter -->|Read State| JobCache
    MeetingRouter -->|Read Cached Response| APICache
```

---

## 🔄 2. User End-to-End Flow & Processing Lifecycle Diagram

This sequence diagram illustrates the entire lifecycle from user authentication and direct-to-cloud upload to vectorization, real-time WebSocket streaming, webhook dispatching, and cron cleanup.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User / Frontend (Next.js)
    participant API as ⚡ FastAPI Backend
    participant Cloudinary as ☁️ Cloudinary Storage
    participant Redis as 📦 Upstash Redis (Broker / Cache)
    participant Worker as ⚙️ Celery Worker
    participant Assembly as 🎙️ AssemblyAI
    participant Voyage as 🧬 VoyageAI
    participant Qdrant as 🎯 Qdrant Cloud
    participant Groq as ⚡ Groq LLM (Llama-3.3-70B)
    participant DB as 🐘 Supabase PostgreSQL
    participant Webhook as 🔔 Webhook Endpoint (Slack/Zapier)

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 1: AUTHENTICATION
    %% ─────────────────────────────────────────────────────────────
    rect rgb(20, 30, 45)
        note over User, API: Phase 1: Secure Authentication & Session Handshake
        User->>API: POST /auth/login (or Google OAuth2 / OTP Reset)
        API->>DB: Verify credentials / validate bcrypt hash
        DB-->>API: User record found
        API-->>User: Set httpOnly, secure, SameSite=None JWT Cookie
    end

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 2: DIRECT-TO-CLOUD UPLOAD
    %% ─────────────────────────────────────────────────────────────
    rect rgb(30, 40, 35)
        note over User, Cloudinary: Phase 2: Direct-to-Cloud Upload (Bypassing Server Memory Limits)
        User->>API: GET /upload/signature
        API-->>User: Return HMAC-SHA1 signature, timestamp & API key
        User->>Cloudinary: POST video payload directly to Cloudinary API
        Cloudinary-->>User: Return secure_url & public_id
        User->>API: POST /upload { file_url, original_name }
        API->>DB: Insert Meeting record (id, user_id, name, duration=0)
        API->>Redis: HSET job:{meeting_id} status="queued", progress=0
        API->>Redis: PUBLISH job_updates:{meeting_id} { status: "queued", progress: 0 }
        API->>Redis: LPUSH Celery Task Queue (process_meeting_task)
        API-->>User: 200 OK { meeting_id, message: "Processing started" }
    end

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 3: BACKGROUND PIPELINE EXECUTION
    %% ─────────────────────────────────────────────────────────────
    rect rgb(45, 30, 45)
        note over Worker, Qdrant: Phase 3: AI Intelligence Pipeline (Async Worker)
        User->>API: Connect WebSocket /ws/{meeting_id}
        API->>Redis: SUBSCRIBE job_updates:{meeting_id}

        Redis->>Worker: Consume process_meeting_task(file_url, meeting_id)
        Worker->>Redis: Update progress -> stage="transcribing", progress=10
        Redis-->>API: Forward pub/sub progress message
        API-->>User: WS Frame: { stage: "transcribing", progress: 10% }

        Worker->>Assembly: Submit video URL for transcription
        Assembly-->>Worker: Return full transcript text & audio_duration
        Worker->>Redis: Update progress -> stage="embedding", progress=60
        Redis-->>API: Forward pub/sub progress message
        API-->>User: WS Frame: { stage: "embedding", progress: 60% }

        Worker->>Worker: LangChain RecursiveCharacterTextSplitter (chunk_size=1000, overlap=200)
        Worker->>Voyage: Embed text chunks via voyage-3.5-lite
        Voyage-->>Worker: Return 1024-dim dense vector embeddings
        Worker->>Qdrant: Upsert points with payload { meeting_id: uuid } to collection "meetings"
        
        Worker->>Groq: Generate precomputed meeting highlights
        Groq-->>Worker: Return bulleted action items & decisions
        Worker->>DB: Save duration, update meeting status & insert AIHighlight record
        Worker->>Redis: SET highlights:{meeting_id} (TTL: 24h)

        Worker->>Cloudinary: DELETE video via API (Zero-Storage Bloat Guarantee)
        Cloudinary-->>Worker: Video resource wiped

        Worker->>Redis: Update progress -> status="done", progress=100
        Redis-->>API: Forward pub/sub progress message
        API-->>User: WS Frame: { status: "done", progress: 100% }
        API->>User: Close WebSocket connection cleanly
    end

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 4: ASYNC WEBHOOK DISPATCH
    %% ─────────────────────────────────────────────────────────────
    rect rgb(30, 45, 50)
        note over Worker, Webhook: Phase 4: Independent Webhook Dispatching
        Worker->>Redis: Enqueue dispatch_webhook(user_id, "meeting.processed")
        Redis->>Worker: Trigger trigger_single_webhook.delay() for each active endpoint
        Worker->>Webhook: POST with HMAC-SHA256 header (X-MeetMind-Signature)
        alt Webhook Failed
            Worker->>Redis: Retry with Exponential Backoff (60s, 120s, 240s... up to 5 attempts)
        else Webhook Successful
            Webhook-->>Worker: 200 OK
        end
    end

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 5: REAL-TIME CONVERSATIONAL RAG CHAT
    %% ─────────────────────────────────────────────────────────────
    rect rgb(25, 35, 45)
        note over User, Groq: Phase 5: Real-Time Conversational RAG & Streaming Chat
        User->>API: Connect WebSocket /ws/chat/{meeting_id}
        User->>API: Send question: "What were the key takeaways and next steps?"
        API->>DB: Verify meeting ownership (meeting_belongs_to_user)
        API->>DB: Save ChatMessage (role="user")
        API->>Redis: Check semantic cache for query hash (SHA-256)
        
        alt Cache Miss
            API->>Redis: Retrieve conversation buffer history (RedisChatMessageHistory, k=5)
            API->>Voyage: Embed user question
            Voyage-->>API: Question embedding vector
            API->>Qdrant: Similarity search (k=7, filter: meeting_id=uuid)
            Qdrant-->>API: Return top matching context chunks
            API->>Groq: Stream prompt (Strict context + Chat history + Question) to Llama-3.3-70B
            loop Token Streaming
                Groq-->>API: Stream token chunks
                API-->>User: WS Send token chunk
            end
            API-->>User: WS Send "[DONE]" marker
            API->>DB: Save ChatMessage (role="ai", content=full_answer)
            API->>Redis: Cache response in semantic cache (TTL: 1h)
        else Cache Hit
            Redis-->>API: Return cached answer
            API-->>User: WS Send full cached answer
            API-->>User: WS Send "[DONE]" marker
        end
    end

    %% ─────────────────────────────────────────────────────────────
    %% STAGE 6: NOTES EXPORT & SCHEDULED MAINTENANCE
    %% ─────────────────────────────────────────────────────────────
    rect rgb(35, 30, 25)
        note over User, API: Phase 6: Document Export & Scheduled Cron Cleanup
        User->>API: GET /download-notes?meeting_id=uuid&format=pdf|docx|txt
        API->>Redis: Fetch cached highlights
        API->>API: Compile ReportLab PDF / python-docx Document / Plaintext
        API-->>User: Return Binary File Download (MeetingName.pdf)

        note over Redis, Cloudinary: Midnight Cron Job (00:00 UTC via Celery Beat)
        Worker->>Redis: FLUSHDB (Flush expired session caches)
        Worker->>Cloudinary: delete_all_resources(resource_type="video")
    end
```

---

## 🚀 Core Features & Architectural Highlights

| Feature | Implementation | Architectural Benefit |
| :--- | :--- | :--- |
| **Direct-to-Cloud Upload** | Cloudinary HMAC signatures (`GET /upload/signature`) | Bypasses backend memory limits; supports 100GB+ video files with 0 server memory pressure. |
| **Zero Storage Bloat** | Instant post-processing destruction | Videos are wiped from Cloudinary immediately after vector extraction to ensure 0% storage waste. |
| **Ultra-Fast Transcription** | AssemblyAI Native Cloud Ingestion | Directly transcribes from secure streaming URLs without downloading files locally. |
| **High-Density Vector Search** | VoyageAI (`voyage-3.5-lite`) + Qdrant Cloud | Dense 1024-dimensional semantic embeddings stored with indexed metadata filters (`meeting_id`). |
| **Conversational RAG** | LangChain + RedisChatMessageHistory | Multi-turn contextual memory with a sliding window buffer (`k=5`) per user and meeting. |
| **Real-time Token Streaming** | WebSockets + Groq Llama-3.3-70B | Sub-second token delivery directly through `/ws/chat/{meeting_id}` with DDoS concurrency locks. |
| **Asynchronous Pipeline** | Celery + Upstash Redis | Resilient background processing with automatic retry mechanisms (3x retries with exponential backoff). |
| **Isolated Webhook Dispatch** | Celery Sub-tasks + HMAC-SHA256 | Independent execution per webhook endpoint so failing webhooks do not block healthy integrations. |
| **Multi-Tier Caching** | Upstash Redis | Semantic Q&A caching, route response caching (`@cache_response`), and active job status hashes. |
| **Automated Housekeeping** | Celery Beat Scheduler | Automated cron jobs at 00:00, 02:00, and 03:00 UTC to flush stale caches, orphaned uploads, and legacy folders. |

---

## 📂 Project Structure (Clean DDD Architecture)

```
MeetMind/
├── main.py                               # FastAPI application entry point, CORS, RateLimiter, Health Checks
├── alembic.ini                           # Alembic database migration configuration
├── requirements.txt                      # Production dependencies
├── API.md                                # REST API documentation & payload contracts
├── README.md                             # Architecture & system documentation
│
├── alembic/                              # Database migration versions
│   └── versions/                         # Auto-generated migration scripts
│
└── src/
    ├── domain/                           # Enterprise Domain Models & Schemas
    │   ├── models.py                     # SQLAlchemy ORM Models (User, Meeting, AIHighlight, ChatMessage, WebhookEndpoint)
    │   └── schemas.py                    # Pydantic request/response validation schemas
    │
    ├── application/                      # Application Business Logic & Services
    │   ├── auth_service.py               # User authentication, credential validation, meeting persistence
    │   ├── email_service.py              # Gmail SMTP integration for OTP generation & password resets
    │   ├── meeting_service.py            # Meeting lifecycle management, notes, chat query orchestration
    │   ├── security.py                   # bcrypt password hashing, policy verification, JWT token utilities
    │   └── pipeline/
    │       └── chunk_text.py             # LangChain recursive character text splitter
    │
    ├── infrastructure/                   # Frameworks, External Drivers & Integrations
    │   ├── database.py                   # SQLAlchemy engine, connection pooling (pool_recycle=1800)
    │   ├── ai/                           # AI Model Integrations
    │   │   ├── chat.py                   # Groq ConversationalRetrievalChain, Redis memory, Async streaming callback
    │   │   ├── embeddings.py             # VoyageAI singleton embedding model configuration
    │   │   └── highlights.py             # Multi-query semantic highlight extraction engine
    │   ├── vector_store/
    │   │   └── embed_store.py            # Qdrant Cloud client, collection manager & payload indexer
    │   ├── cache/                        # Redis Caching & State Management
    │   │   ├── redis_client.py           # Reusable Upstash Redis connection client
    │   │   ├── cache.py                  # FastAPI route caching decorator & cache invalidation
    │   │   └── job_progress.py           # Redis Hash job progress tracking & Pub/Sub notifications
    │   ├── recording/
    │   │   └── recorder.py               # Local microphone recording utilities (PyAudio)
    │   └── workers/                      # Celery Background Workers & Tasks
    │       ├── celery_app.py             # Celery instance, Upstash SSL broker config & Beat schedules
    │       └── tasks/
    │           ├── pipeline_tasks.py     # Meeting ingestion task with 3x retry policy & cleanup
    │           ├── webhook_tasks.py      # Fan-out webhook dispatcher with HMAC signatures & backoff
    │           └── maintenance_tasks.py  # Midnight Redis & Cloudinary wiping cron tasks
    │
    └── presentation/                     # Delivery Mechanism (HTTP & WebSockets)
        ├── dependencies.py               # FastAPI auth dependency (httpOnly cookie & Bearer extractor)
        ├── core/
        │   ├── config.py                 # Environment configuration loader
        │   └── rate_limit.py             # SlowAPI rate limiting configuration
        └── api/
            ├── router.py                 # Aggregator for all API routes
            ├── models.py                 # Request payload models for meeting routes
            ├── auth_router.py            # Auth endpoints (Register, Login, Google OAuth, OTP reset)
            └── routes/
                ├── upload.py             # Cloudinary HMAC signature & meeting upload trigger
                ├── meeting.py            # Meeting CRUD, /notes, /chat, and /ws/chat/{meeting_id}
                ├── ws.py                 # Pipeline progress updates WebSocket (/ws/{meeting_id})
                ├── status.py             # Job progress status polling endpoint
                ├── dashboard.py          # Dashboard aggregated metrics & statistics
                ├── download.py           # ReportLab PDF, DOCX, and TXT exporter
                ├── webhooks.py           # Webhook registration & endpoint management
                └── recording.py          # Start/stop live audio recording endpoints
```

---

## 🛠️ Technology Stack Matrix

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **API Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance asynchronous REST & WebSocket framework |
| **Relational Database** | [PostgreSQL (Supabase)](https://supabase.com/) | Primary transactional database with connection pooling |
| **ORM & Migrations** | [SQLAlchemy](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) | Type-safe declarative database models and schema migrations |
| **Vector Database** | [Qdrant Cloud](https://qdrant.tech/) | Managed vector search engine with metadata filtering |
| **Message Broker & Cache**| [Upstash Redis](https://upstash.com/) | Serverless cloud Redis for Celery broker, Pub/Sub, and caching |
| **Background Tasks** | [Celery](https://docs.celeryq.dev/) + [Celery Beat](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html) | Distributed task queue and periodic cron maintenance jobs |
| **File Storage** | [Cloudinary](https://cloudinary.com/) | Direct client-to-cloud signed uploads bypassing backend limits |
| **Audio Transcription** | [AssemblyAI](https://www.assemblyai.com/) | Cloud speech-to-text API supporting streaming URL ingestion |
| **Text Embeddings** | [VoyageAI](https://www.voyageai.com/) (`voyage-3.5-lite`) | State-of-the-art dense semantic text representations |
| **LLM Reasoning** | [Groq](https://groq.com/) (`llama-3.3-70b-versatile`) | Ultra-low latency LLM for RAG chat and highlight extraction |
| **RAG Framework** | [LangChain](https://www.langchain.com/) | Document chunking, vector retrieval, and conversational chains |
| **Document Export** | [ReportLab](https://www.reportlab.com/) + [python-docx](https://python-docx.readthedocs.io/) | PDF and DOCX automated report generation |
| **Rate Limiting** | [SlowAPI](https://slowapi.readthedocs.io/) | IP-based request throttling against brute force and DDoS |

---

## ⚡ API & WebSocket Endpoints

### 🔐 Authentication (`/auth`)
- `POST /auth/register` — Register a new user account *(Rate limit: 3/min)*
- `POST /auth/login` — Authenticate and set secure `httpOnly` JWT cookie *(Rate limit: 5/min)*
- `POST /auth/logout` — Invalidate user session and clear cookies
- `GET /auth/me` — Return currently authenticated user profile
- `PUT /auth/me/name` — Update user profile display name
- `PUT /auth/me/password` — Update user password with old password verification
- `POST /auth/forgot-password` — Generate and email 4-digit OTP via Gmail SMTP *(Rate limit: 3/min)*
- `POST /auth/verify-otp` — Verify OTP against Redis store (TTL: 5 mins)
- `POST /auth/reset-password` — Reset user password after verified OTP step
- `GET /auth/google/login` — Initiate Google OAuth 2.0 SSO flow
- `GET /auth/google/callback` — Google OAuth callback, user upsert, and session cookie issue

### 📤 Upload & Pipeline Execution (`/upload`)
- `GET /upload/signature` — Generate HMAC-SHA1 signature for direct Cloudinary upload *(Rate limit: 10/min)*
- `POST /upload` — Receive Cloudinary file URL and dispatch Celery processing task *(Rate limit: 5/hour)*
- `GET /status/{meeting_id}` — Poll background processing state and progress percentage
- `WS /ws/{meeting_id}` — Real-time WebSocket stream for job progress updates (Redis Pub/Sub)

### 🎙️ Meetings & Conversational Intelligence
- `GET /meetings` — List all meetings for the current user *(Cached: 60s)*
- `POST /set-meeting-name` — Rename a meeting
- `DELETE /meetings/{meeting_id}` — Delete meeting, Qdrant vectors, and Redis cache
- `POST /notes` — Generate structured bullet-point meeting highlights *(Rate limit: 5/min)*
- `POST /chat` — REST query against meeting transcript *(Rate limit: 20/min)*
- `WS /ws/chat/{meeting_id}` — Real-time conversational streaming chat with Llama-3.3-70B & context retrieval
- `GET /download-notes` — Export highlights as formatted `pdf`, `docx`, or `txt`

### 📊 Dashboard & Webhooks
- `GET /dashboard/metrics` — Aggregate user statistics (total meetings, duration, highlights, questions)
- `POST /webhooks` — Register a new webhook endpoint (auto-generates HMAC secret)
- `GET /webhooks` — List user's registered webhook endpoints
- `DELETE /webhooks/{webhook_id}` — Delete a webhook endpoint

---

## ⚙️ Local Development & Setup Guide

### 1. Prerequisites
- Python 3.10+
- Upstash Redis account (or local Redis instance)
- Supabase PostgreSQL instance (or local PostgreSQL)
- Qdrant Cloud cluster
- API keys for AssemblyAI, VoyageAI, Groq, and Cloudinary

### 2. Clone & Environment Setup
```bash
git clone https://github.com/your-username/MeetMind.git
cd MeetMind

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory modeled after `.env.example`:
```env
# AI Services
GROQ_API_KEY=gsk_...
VOYAGE_API_KEY=pa-...
ASSEMBLYAI_API_KEY=...

# Databases & Cache
DATABASE_URL=postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=...
REDIS_URL=rediss://default:password@your-redis.upstash.io:6379

# Storage & Auth
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
JWT_SECRET_KEY=your_super_secret_jwt_key_at_least_32_characters_long
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000

# Email Service
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_APP_PASSWORD=your_16_char_app_password
```

### 4. Database Schema Migration
Run Alembic migrations to initialize PostgreSQL tables:
```bash
alembic upgrade head
```

### 5. Running the Application Services

**Terminal 1 — Start the FastAPI Server:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Start Celery Worker (Pipeline & Webhooks):**
```bash
# Mac / Linux:
celery -A src.infrastructure.workers.celery_app worker -l INFO

# Windows (using solo execution pool):
celery -A src.infrastructure.workers.celery_app worker -P solo -l INFO
```

**Terminal 3 — Start Celery Beat Scheduler (Maintenance Crons):**
```bash
celery -A src.infrastructure.workers.celery_app beat -l INFO
```

---

## 🔒 Security & Resilience Measures

1. **Authentication:** Signed JWT tokens stored in `httpOnly`, `Secure`, `SameSite=None` (or `Lax`) cookies to mitigate Cross-Site Scripting (XSS).
2. **Brute Force Protection:** SlowAPI throttles auth, upload, and generation endpoints by client IP.
3. **Webhook Integrity:** All outbound webhooks carry an `X-MeetMind-Signature` header calculated using `HMAC-SHA256` over the JSON body.
4. **Data Isolation:** Qdrant similarity searches strictly enforce payload filtering by `meeting_id`, and DB queries enforce `user_id` ownership verification.
5. **Fault Isolation:** Celery webhook tasks execute in independent sub-tasks with isolated exponential backoff schedules, ensuring that third-party timeouts do not impact system health.
6. **Zero Cloud Bloat:** Uploaded video files are permanently purged from Cloudinary immediately after vectorization, ensuring data privacy and cost optimization.