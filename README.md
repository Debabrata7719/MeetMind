# Meeting Intelligence System

Turn meeting recordings into searchable knowledge — transcription, highlights, and AI chat, all in one place.

<p align="center">
  <img src="assets/Screenshot 2026-02-12 223029.png" width="900">
</p>

---

## What it does

Upload or record a meeting (MP4 / MP3 / WAV), and the system will:

1. Extract audio with FFmpeg
2. Transcribe speech with OpenAI Whisper
3. Chunk and embed the transcript into a per-meeting ChromaDB vector store
4. Let you generate bullet-point highlights via Groq LLM
5. Let you chat with the meeting — ask any question, get answers grounded only in what was said

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Speech-to-text | OpenAI Whisper (`small` model) |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (SentenceTransformers) |
| Vector store | ChromaDB (PersistentClient, per-meeting collections) |
| LLM | Groq (`openai/gpt-oss-120b`) |
| LangChain | ConversationalRetrievalChain + ConversationBufferWindowMemory |
| Audio extraction | FFmpeg |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Export | ReportLab (PDF), python-docx (DOCX) |

---

## Project structure

```
Meeting_Intelligence_System/
│
├── app/
│   ├── core/
│   │   └── config.py          # Central paths + FFmpeg discovery
│   ├── pipeline/
│   │   ├── video_to_audio.py  # FFmpeg: MP4/MP3 → WAV
│   │   ├── audio_to_text.py   # Whisper: WAV → transcript.txt
│   │   ├── chunk_text.py      # LangChain splitter → chunks.txt
│   │   └── pipeline.py        # LangChain sequential chain
│   ├── storage/
│   │   └── embed_store.py     # SentenceTransformers + ChromaDB
│   ├── intelligence/
│   │   ├── highlights.py      # Multi-query retrieval → Groq highlights
│   │   └── chat.py            # ConversationalRetrievalChain + memory
│   ├── recording/
│   │   └── recorder.py        # sounddevice live recording
│   └── services.py            # Orchestrates pipeline → embed → chat/highlights
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── data/
│   ├── intermediate/          # transcript.txt, chunks.txt, clean_meeting_audio.wav
│   └── vectordb/              # Per-meeting ChromaDB stores (one folder per meeting_id)
│
├── Notes/                     # Generated highlights (.txt / .pdf / .docx)
├── uploads/                   # Uploaded meeting files
├── assets/                    # Screenshots
├── tests/                     # Pytest test suite
├── main.py                    # FastAPI app entry point
├── requirements.txt
└── .env                       # GROQ_API_KEY (not committed)
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
- Update the `_FFMPEG_FALLBACK_BIN` path in `app/core/config.py` to point to your local FFmpeg `bin/` folder.

### 5. Environment variables

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get a free key at [console.groq.com](https://console.groq.com).

---

## Running the app

```bash
uvicorn main:app --reload
```

Then open `frontend/index.html` in your browser (or serve it with any static file server).

---

## How the pipeline works

```
Upload / Record
      │
      ▼
video_to_audio.py   →  FFmpeg extracts 16 kHz mono WAV
      │
      ▼
audio_to_text.py    →  Whisper transcribes to transcript.txt
      │
      ▼
chunk_text.py       →  LangChain splits into 150-char chunks (30 overlap)
      │
      ▼
embed_store.py      →  SentenceTransformers encodes → ChromaDB stores
                        (model: paraphrase-multilingual-MiniLM-L12-v2)
      │
      ├──▶  highlights.py  →  5 semantic queries → Groq LLM → bullet highlights
      │
      └──▶  chat.py        →  ConversationalRetrievalChain → Groq LLM → answers
```

> **Important:** The same embedding model (`paraphrase-multilingual-MiniLM-L12-v2`) is used in both `embed_store.py` (write) and `chat.py` / `highlights.py` (read). Using different models at read vs write time will silently break retrieval.

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Upload MP4/MP3/WAV, run full pipeline |
| `POST` | `/start-recording` | Start live microphone recording |
| `POST` | `/stop-recording` | Stop recording, run full pipeline |
| `POST` | `/notes` | Generate highlights for a meeting |
| `POST` | `/chat` | Ask a question about a meeting |
| `GET` | `/download-notes` | Download highlights as PDF / TXT / DOCX |
| `POST` | `/set-meeting-name` | Save a human-readable name for a meeting |
| `GET` | `/meetings` | List all saved meetings |

---

## Running tests

Place `test_video.mp4` in the `uploads/` folder (any short MP4 works), then:

```bash
pytest tests/ -v -s
```

The session-scoped fixtures run the full pipeline **once** per session — FFmpeg, Whisper, ChromaDB — and share the results across all test files. Whisper takes ~1-2 min on CPU on first run.

### Test files

| File | What it tests |
|---|---|
| `test_video_to_audio.py` | FFmpeg extraction from `test_video.mp4` |
| `test_audio_to_text.py` | Whisper transcription of real audio |
| `test_embed_store.py` | ChromaDB embedding + retrieval |
| `test_highlights.py` | Highlights generation (mocked LLM + real LLM) |
| `test_chat.py` | Chat Q&A (mocked LLM + real LLM) |

LLM tests are automatically skipped if `GROQ_API_KEY` is not set.

---

## Key design decisions

**Per-meeting vector stores** — each meeting gets its own ChromaDB directory under `data/vectordb/<meeting_id>/`. This means meetings never pollute each other's retrieval results.

**Embedding model consistency** — `paraphrase-multilingual-MiniLM-L12-v2` is used at both write time (embed_store) and read time (chat + highlights). Changing one without the other silently breaks semantic search.

**Context-only answering** — the chat prompt explicitly instructs the LLM to answer only from the retrieved context and say "Not found in the meeting transcript" if the answer isn't there. This prevents hallucination.

**Session-scoped test fixtures** — the expensive pipeline steps (FFmpeg, Whisper) run once per `pytest` session and are shared across all test files via `conftest.py`.

---

## Future improvements

- Speaker diarization (who said what)
- Live transcription streaming
- Meeting analytics dashboard
- Sentiment analysis per speaker
- Action item auto-assignment
- Multi-language highlight extraction
