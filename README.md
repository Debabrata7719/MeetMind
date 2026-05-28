# Meeting Intelligence System

Turn meeting recordings into searchable knowledge — transcription, highlights, and AI chat, all in one place.

<p align="center">
  <img src="assets/Screenshot 2026-02-12 223029.png" width="900">
</p>

---

## What it does

Upload or record a meeting (MP4 / MP3 / WAV), and the system will:

1. Extract audio with FFmpeg
2. Transcribe speech with faster-whisper
3. Chunk and embed the transcript into a per-meeting ChromaDB vector store
4. Let you generate bullet-point highlights via Groq LLM
5. Let you chat with the meeting — ask any question, get answers grounded only in what was said
6. Download highlights as PDF, TXT, or DOCX

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| API routing | Modular routers under `api/routes/` and `auth/` |
| Database | MySQL (User accounts + Meetings) via SQLAlchemy 2.0 ORM + Alembic |
| Chat memory | Redis — persistent, multi-worker safe (`RedisChatMessageHistory`) |
| Rate limiting | `slowapi` + Redis — per-email limits on upload, chat, notes, login |
| Auth | bcrypt + python-jose (JWT httpOnly cookies, cross-domain aware) |
| Email (OTP) | Gmail SMTP via `smtplib` — App Password authentication |
| Speech-to-text | faster-whisper (`small` model, CTranslate2 backend) |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (Singleton — loaded once per process) |
| Vector store | ChromaDB `PersistentClient` — per-meeting collections |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| LangChain | `ConversationalRetrievalChain` + Redis-backed `ConversationBufferWindowMemory` |
| Audio extraction | FFmpeg |
| File validation | `filetype` — deep MIME-type byte sniffing on every upload |
| Frontend | Next.js 15 (App Router) + React |
| Styling | Tailwind CSS v4 |
| Export | ReportLab (PDF), python-docx (DOCX) |
| Testing | Pytest — real pipeline + mocked unit tests |
| Python | 3.13 |

---

## Project structure

```
Meeting_Intelligence_System/
│
├── app/                            # Core business logic
│   ├── core/
│   │   ├── config.py               # Central paths + FFmpeg auto-discovery
│   │   ├── rate_limit.py           # slowapi Limiter (Redis backend, email-based key)
│   │   └── job_progress.py         # Redis-backed pipeline progress tracking
│   ├── pipeline/
│   │   ├── video_to_audio.py       # FFmpeg: MP4/MP3 → 16kHz mono WAV
│   │   ├── audio_to_text.py        # faster-whisper: WAV → transcript.txt
│   │   ├── chunk_text.py           # LangChain splitter → chunks.txt
│   │   └── pipeline.py             # LangChain sequential chain
│   ├── storage/
│   │   └── embed_store.py          # SentenceTransformers + ChromaDB write
│   ├── intelligence/
│   │   ├── embeddings.py           # Singleton embedding model (loaded once per process)
│   │   ├── highlights.py           # Multi-query retrieval → Groq highlights
│   │   └── chat.py                 # ConversationalRetrievalChain + Redis memory
│   ├── recording/
│   │   └── recorder.py             # sounddevice live microphone recording
│   └── services.py                 # Orchestrator: pipeline → embed → chat/highlights
│
├── api/                            # HTTP layer (FastAPI routes)
│   ├── models.py                   # Pydantic request models
│   ├── router.py                   # Registers all route modules
│   └── routes/
│       ├── upload.py               # POST /upload (with MIME-type validation + rate limit)
│       ├── recording.py            # POST /start-recording, /stop-recording
│       ├── meeting.py              # POST /notes, /chat, GET /meetings, DELETE /meetings/{id}
│       └── download.py             # GET /download-notes
│
├── auth/                           # Authentication layer
│   ├── db.py                       # SQLAlchemy engine + SessionLocal + meeting queries
│   ├── security.py                 # bcrypt hashes, password rules, JWT signing
│   ├── models.py                   # SQLAlchemy ORM models (User, Meeting)
│   ├── schemas.py                  # Pydantic request/response schemas
│   ├── service.py                  # DB service functions (create_user, save_meeting, update_password etc.)
│   ├── email_service.py            # Gmail SMTP — sends OTP emails for password reset
│   ├── router.py                   # POST /register, /login, /logout, /forgot-password, /verify-otp, /reset-password, GET /me
│   └── dependencies.py             # JWT httpOnly cookie decoder
│
├── frontend/                       # Next.js Application
│   ├── app/
│   │   ├── page.tsx                # Animated Landing Page
│   │   ├── login/                  # Sign in + Forgot Password link
│   │   ├── register/               # Sign up
│   │   ├── forgot-password/        # Step 1: Email input → sends OTP
│   │   ├── verify-otp/             # Step 2: Enter 4-digit OTP (with resend)
│   │   ├── reset-password/         # Step 3: New password (only after OTP verified)
│   │   └── dashboard/              # Protected meeting interface
│   ├── components/                 # Reusable React components
│   ├── lib/
│   │   ├── api.ts                  # Typed FastAPI client
│   │   └── auth.ts                 # Auth API helpers
│   ├── middleware.ts               # Protects /dashboard route
│   └── package.json
│
├── tests/
│   ├── conftest.py                 # Session-scoped pipeline fixtures
│   ├── test_services.py            # End-to-end pipeline through services layer
│   ├── test_video_to_audio.py      # FFmpeg extraction
│   ├── test_audio_to_text.py       # Whisper transcription
│   ├── test_chunk_text.py          # Text chunking
│   ├── test_embed_store.py         # ChromaDB embedding + retrieval
│   ├── test_highlights.py          # Highlights generation
│   ├── test_chat.py                # Chat Q&A
│   └── test_api.py                 # FastAPI HTTP endpoints
│
├── data/
│   ├── intermediate/               # transcript.txt, chunks.txt, clean_meeting_audio.wav
│   └── vectordb/                   # Per-meeting ChromaDB stores
│
├── Notes/                          # Generated highlights (.txt / .pdf / .docx)
│
├── uploads/                        # Uploaded / recorded meeting files
├── assets/                         # Screenshots
├── main.py                         # FastAPI entry point + startup health checks + ghost sweeper
├── API.md                          # Full offline API reference
├── alembic.ini                     # Alembic migration config
├── alembic/                        # Database migration scripts
├── requirements.txt
├── .gitignore
├── .env                            # Environment variables (not committed)
└── .env.example                    # Template for required environment variables
```

---

## Installation

### 1. Clone

```bash
git clone <repo_url>
cd Meeting_Intelligence_System
```

### 2. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. FFmpeg

FFmpeg must be available. Either:
- Install system-wide so it's on `PATH`, **or**
- Update `_FFMPEG_FALLBACK_BIN` in `app/core/config.py` to point to your local FFmpeg `bin/` folder

### 5. MySQL Setup

1. Create the empty database in MySQL:

```sql
CREATE DATABASE Meeting_analizer_user;
```

2. Add your database credentials to `.env` (see Step 7 below), then run Alembic to automatically create all tables:

```bash
alembic upgrade head
```

This creates the `users` and `meetings` tables with the correct schema. Re-run this command whenever new migrations are added.

### 6. Redis Setup

Redis is required for persistent chat memory. Install and run Redis:

```bash
# Docker (recommended)
docker run -d --name redis-server -p 6379:6379 redis

# Or install natively — see https://redis.io/docs/getting-started/
```

Verify it's running:
```bash
python -c "import redis; r = redis.from_url('redis://localhost:6379'); r.ping(); print('OK')"
```

### 7. Environment variables

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_groq_api_key_here

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=Meeting_analizer_user

JWT_SECRET_KEY=your_secure_random_string   # Must NOT be 'changeme' in production
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

REDIS_URL=redis://localhost:6379

# Comma-separated list of allowed frontend origins (no wildcards with credentials)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Set to 'production' to: disable /docs, enable SameSite=none cookies, enforce JWT key check
ENV=development

# ─── Gmail OTP Email Service (Forgot Password) ──────────────────
# Use your Gmail address and a Gmail App Password (NOT your real password)
# To get an App Password: Google Account → Security → 2-Step Verification → App Passwords
EMAIL_ADDRESS=your_gmail_address@gmail.com
EMAIL_APP_PASSWORD=your_16_char_app_password
```

> **Note:** The server performs a strict health check on startup. If `GROQ_API_KEY` is missing, MySQL is unreachable, or Redis is offline, the server will crash immediately with a descriptive error rather than silently failing mid-upload.

Create a `.env.local` file inside the `frontend/` folder:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Running the app

Ensure Redis is running, then open two terminals:

**Terminal 1 — Backend (FastAPI)**
```bash
uvicorn main:app --reload
```

**Terminal 2 — Frontend (Next.js)**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

For the full API reference see **[API.md](API.md)**.

---

## How the pipeline works

```
Upload / Record
      │
      ▼
upload.py           →  Starts BackgroundTask, returns immediately. Stores progress in Redis.
      │
      ▼
video_to_audio.py   →  FFmpeg extracts audio and splits into 5-minute chunks (chunk_000.wav)
      │
      ▼
(Iterative Loop for each 5-minute chunk)
       ├── audio_to_text.py  →  faster-whisper (small, task="translate") transcribes chunk
       ├── chunk_text.py     →  LangChain splits text into 150-char chunks (30 overlap)
       ├── embed_store.py    →  SentenceTransformers encodes → ChromaDB stores (uuid4 IDs)
       └── Cleanup           →  Deletes the 5-minute .wav and .txt chunks instantly
      │
      ▼
Final Cleanup       →  Original uploaded video and intermediate folder are permanently deleted.
      │
      ▼
(On Demand via UI)
      ├──▶  highlights.py  →  5 semantic queries → deduplicate → Groq LLM → bullet points
      │                        (First run cached in Redis, instant retrieval after)
      │
      └──▶  chat.py        →  ConversationalRetrievalChain (k=7) + Redis-backed memory (5 turns)
                                 → Semantic Caching via Redis (skips Groq for repeat questions)
                                 → Groq LLM → context-only answer
                                 Session key: chat:{user_id}:{meeting_id} — survives restarts
```

> **Critical:** `embed_store.py`, `chat.py`, and `highlights.py` all use `paraphrase-multilingual-MiniLM-L12-v2`. Using a different model at query time vs store time silently breaks semantic search and returns garbage results.

---

## Running tests

Place `test_video.mp4` in the `uploads/` folder, then:

```bash
pytest tests/ -v -s -p no:warnings
```

To run a single file:

```bash
pytest tests/test_services.py -v -s -p no:warnings
```

### Recommended test order

| Order | File | Speed | What it tests |
|---|---|---|---|
| 1 | `test_api.py` | Fast (mocked) | FastAPI HTTP endpoints |
| 2 | `test_video_to_audio.py` | Fast | FFmpeg extraction from `test_video.mp4` |
| 3 | `test_audio_to_text.py` | Fast (~60 sec) | faster-whisper transcription |
| 4 | `test_chunk_text.py` | Fast | Text chunking with real transcript |
| 5 | `test_embed_store.py` | Medium | ChromaDB embedding + retrieval |
| 6 | `test_highlights.py` | Fast/Skipped | Highlights (mocked LLM + real LLM) |
| 7 | `test_chat.py` | Fast/Skipped | Chat Q&A (mocked LLM + real LLM) |
| 8 | `test_services.py` | Slow (~4 min) | Full end-to-end through services layer |

- faster-whisper runs **once per session** — subsequent test files reuse the cached result
- LLM tests (highlights, chat, services steps 5-6) auto-skip if `GROQ_API_KEY` is not set
- Recording tests are skipped (requires audio hardware)

---

## Key design decisions

**Separated concerns** — `app/` owns all AI and pipeline logic. `api/` owns the HTTP layer. `auth/` owns authentication. `main.py` is thin and just wires them together. This makes each layer independently testable.

**Background Processing & Progress Tracking** — File uploads trigger asynchronous background tasks. The pipeline state and exact percentage are updated in Redis in real-time. The frontend smoothly polls `/status/<meeting_id>` to render a live progress bar.

**Aggressive Auto-Deletion** — To protect CPU and storage limits, large uploads are split into 5-minute `.wav` segments. The pipeline iteratively transcribes, embeds, and deletes each chunk. Once 100% complete, the original massive video file and all intermediate text files are permanently deleted. The VectorDB acts as the sole source of truth.

**Startup Health Checks (Fail Fast)** — On every boot, `main.py` verifies that `GROQ_API_KEY` is set, `JWT_SECRET_KEY` is not the default `changeme` value in production, MySQL responds to `SELECT 1`, and Redis responds to `PING`. If any check fails, the server refuses to start with a descriptive `FATAL:` error, preventing silent mid-request failures.

**Redis Rate Limiting by Email** — All expensive endpoints are protected by `slowapi` with a shared Redis storage backend. Rate limits are enforced per authenticated user **email address** (decoded from the JWT cookie) — not by IP address — preventing shared-WiFi false positives. Unauthenticated routes like `/login` fall back to IP-based limiting.

**Secure Meeting Deletion** — `DELETE /meetings/{id}` cascades across all four data systems: drops the MySQL row, removes the ChromaDB vector collection (clearing AI memory), purges all Redis chat history and cached highlights, and sweeps all raw files from the filesystem. A startup sweeper also auto-removes ghost folders left by Windows file locks on every server reboot.

**Deep MIME-Type Upload Validation** — The `/upload` route uses the `filetype` library to read the first 2KB of the file stream and mathematically verify the file's internal byte signature before saving anything to disk. A file renamed from `.exe` to `.mp4` will be instantly rejected with a `400 Bad Request` without ever reaching FFmpeg.

**Production Security Gate** — When `ENV=production` is set, the server automatically disables the Swagger UI (`/docs`) and OpenAPI schema (`/openapi.json`) routes, and switches auth cookies to `SameSite=none` + `Secure=True` to support cross-domain deployments (e.g., Vercel frontend + VPS backend). An offline `API.md` is included in the repository for developer reference.

**Redis Highlights Caching** — Highlights are generated on-demand rather than automatically. The first click queries the LLM and caches the output in Redis. Subsequent clicks pull from Redis instantly, saving money on API tokens and drastically improving UI responsiveness.

**Semantic Chat Caching** — The chat system converts user queries into mathematical embeddings using the local SentenceTransformers model, and compares them against previous queries stored in Redis using cosine similarity. If a user asks a question that is >95% similar to a previous question, the answer is instantly served from the Redis cache without ever hitting the Groq API.

**Embedding Model Singleton** — `paraphrase-multilingual-MiniLM-L12-v2` is instantiated exactly once per process in `app/intelligence/embeddings.py` and shared across `embed_store.py`, `chat.py`, and `highlights.py`. This prevents each Uvicorn worker from independently loading a 500MB+ model into RAM.

**Per-meeting vector stores** — each meeting gets its own ChromaDB directory under `data/vectordb/<meeting_id>/`. Meetings never pollute each other's retrieval results.

**Context-only answering** — the chat prompt instructs the LLM to answer only from retrieved context and respond with "Not found in the meeting transcript" if the answer isn't there. This prevents hallucination.

**Redis-backed chat memory** — chat history is stored in Redis using `RedisChatMessageHistory`, keyed by `chat:{user_id}:{meeting_id}`. This means conversation context survives server restarts, works correctly with multiple Uvicorn workers (`--workers 4`), and ensures two users chatting with the same meeting get fully isolated memory.

**SQLAlchemy 2.0 ORM + Alembic** — All database interactions use SQLAlchemy ORM models and a connection-pooled `SessionLocal`. Schema changes are managed via Alembic migrations, allowing safe, version-controlled database evolution.

**Session-scoped test fixtures** — FFmpeg and Whisper run once per `pytest` session. All test files share the results via `conftest.py` fixtures, keeping total test time reasonable.

**OTP-Based Password Reset** — Forgot Password uses a secure 3-step flow: (1) backend verifies the email exists in MySQL, (2) generates a cryptographically random 4-digit OTP using `random.randint`, stores it in Redis with a strict 5-minute TTL, and sends it via Gmail SMTP App Password. (3) After the user enters the correct OTP, a `otp_verified:{email}` flag is written to Redis. The `/reset-password` endpoint checks for this flag before allowing a password change, preventing anyone from bypassing the OTP step.

**User authentication & meeting isolation** — JWT httpOnly cookies + bcrypt hashing ensures secure sessions. Meeting ownership is enforced on `/chat`, `/notes`, `/set-meeting-name`, `/download-notes`, and `/meetings` endpoints. All meetings are scoped to the authenticated user. Meeting names are stored exclusively in MySQL — no legacy JSON files.

---

## Future improvements

- Background job queue (Celery / ARQ / Redis Queue) to decouple uploads from API workers
- Speaker diarization (who said what)
- Live transcription streaming via WebSocket/SSE
- Meeting analytics dashboard
- Sentiment analysis per speaker
- Action item auto-assignment
- Multi-language highlight extraction
- Docker containerization (`api`, `worker`, `frontend`, `redis`, `mysql`)
- Email notification when long processing jobs complete
- Pagination for the meetings list (`?page=&limit=`)
- CI/CD pipeline (GitHub Actions — pytest + frontend build on every PR)
- Load testing before production launch