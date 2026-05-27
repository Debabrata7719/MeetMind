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
| Database | MySQL (User accounts + Meetings) |
| Chat memory | Redis — persistent, multi-worker safe (`RedisChatMessageHistory`) |
| Auth | bcrypt + python-jose (JWT httpOnly cookies) |
| Speech-to-text | faster-whisper (`small` model, CTranslate2 backend) |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (SentenceTransformers) |
| Vector store | ChromaDB `PersistentClient` — per-meeting collections |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| LangChain | `ConversationalRetrievalChain` + Redis-backed `ConversationBufferWindowMemory` |
| Audio extraction | FFmpeg |
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
│   │   └── config.py               # Central paths + FFmpeg auto-discovery
│   ├── pipeline/
│   │   ├── video_to_audio.py       # FFmpeg: MP4/MP3 → 16kHz mono WAV
│   │   ├── audio_to_text.py        # faster-whisper: WAV → transcript.txt
│   │   ├── chunk_text.py           # LangChain splitter → chunks.txt
│   │   └── pipeline.py             # LangChain sequential chain
│   ├── storage/
│   │   └── embed_store.py          # SentenceTransformers + ChromaDB write
│   ├── intelligence/
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
│       ├── upload.py               # POST /upload
│       ├── recording.py            # POST /start-recording, /stop-recording
│       ├── meeting.py              # POST /notes, /chat, /set-meeting-name, GET /meetings
│       └── download.py             # GET /download-notes
│
├── auth/                           # Authentication layer
│   ├── db.py                       # MySQL connection + meeting queries
│   ├── security.py                 # bcrypt hashes, password rules, JWT signing
│   ├── models.py                   # Pydantic auth models
│   ├── router.py                   # POST /register, /login, /logout, GET /me
│   └── dependencies.py             # JWT httpOnly cookie decoder
│
├── frontend/                       # Next.js Application
│   ├── app/
│   │   ├── page.tsx                # Animated Landing Page
│   │   ├── login/                  # Sign in
│   │   ├── register/               # Sign up
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
├── main.py                         # FastAPI entry point (thin — wires api/router.py)
├── API.md                          # Full API reference
├── requirements.txt
├── .gitignore
└── .env                            # GROQ_API_KEY (not committed)
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

Create a database named `Meeting_analizer_user` and a `users` and `meetings` table. See `auth/db.py` for schema details.

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

JWT_SECRET_KEY=your_secure_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

REDIS_URL=redis://localhost:6379
```

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

**Redis Highlights Caching** — Highlights are generated on-demand rather than automatically. The first click queries the LLM and caches the output in Redis. Subsequent clicks pull from Redis instantly, saving money on API tokens and drastically improving UI responsiveness.

**Semantic Chat Caching** — The chat system converts user queries into mathematical embeddings using the local SentenceTransformers model, and compares them against previous queries stored in Redis using cosine similarity. If a user asks a question that is >95% similar to a previous question, the answer is instantly served from the Redis cache without ever hitting the Groq API.

**Per-meeting vector stores** — each meeting gets its own ChromaDB directory under `data/vectordb/<meeting_id>/`. Meetings never pollute each other's retrieval results.

**Embedding model consistency** — `paraphrase-multilingual-MiniLM-L12-v2` is used at both write time (`embed_store.py`) and read time (`chat.py` / `highlights.py`). This was a real bug that was found and fixed — using `all-MiniLM-L6-v2` at read time caused completely wrong retrieval results.

**Context-only answering** — the chat prompt instructs the LLM to answer only from retrieved context and respond with "Not found in the meeting transcript" if the answer isn't there. This prevents hallucination.

**Redis-backed chat memory** — chat history is stored in Redis using `RedisChatMessageHistory`, keyed by `chat:{user_id}:{meeting_id}`. This means conversation context survives server restarts, works correctly with multiple Uvicorn workers (`--workers 4`), and ensures two users chatting with the same meeting get fully isolated memory.

**Session-scoped test fixtures** — FFmpeg and Whisper run once per `pytest` session. All test files share the results via `conftest.py` fixtures, keeping total test time reasonable.

**Python 3.13 compatibility** — `conftest.py` patches `importlib.util.find_spec` to handle `soundfile.__spec__ = None`, which causes `ValueError` in Python 3.13 when `transformers` checks for soundfile availability.

**User authentication & meeting isolation** — JWT httpOnly cookies + bcrypt hashing ensures secure sessions. Meeting ownership is enforced on `/chat`, `/notes`, `/set-meeting-name`, `/download-notes`, and `/meetings` endpoints. All meetings are scoped to the authenticated user. Meeting names are stored exclusively in MySQL — no legacy JSON files.

---

## Future improvements

- Async upload processing with job queues (Redis + Celery/ARQ)
- Speaker diarization (who said what)
- Live transcription streaming
- Meeting analytics dashboard
- Sentiment analysis per speaker
- Action item auto-assignment
- Multi-language highlight extraction
- Docker containerization
- Password reset and email verification