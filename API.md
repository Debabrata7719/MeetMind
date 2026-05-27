# API Reference — Meeting Intelligence System

All endpoints are served by FastAPI running at `http://127.0.0.1:8000` by default.

Interactive docs available at:
- Swagger UI → `http://127.0.0.1:8000/docs`
- ReDoc → `http://127.0.0.1:8000/redoc`

---

## Project structure

Routes are organized under `api/routes/`. `main.py` is a thin entry point that only registers the router.

```
api/
├── models.py          ← Pydantic request models
├── router.py          ← Registers all route modules
└── routes/
    ├── upload.py      ← POST /upload
    ├── recording.py   ← POST /start-recording, POST /stop-recording
    ├── meeting.py     ← POST /notes, POST /chat, POST /set-meeting-name, GET /meetings
    └── download.py    ← GET /download-notes
```

---

## Request / Response Models

Defined in `api/models.py`:

```python
class ChatRequest(BaseModel):
    question: str
    meeting_id: str

class NotesRequest(BaseModel):
    meeting_id: str

class MeetingName(BaseModel):
    meeting_id: str
    name: str
```

---

## Endpoints

---

### GET /

Health check.

**Response**
```json
{ "message": "API running" }
```

---

### POST /upload

Upload a meeting file (MP4, MP3, or WAV). Kicks off the background pipeline:
video → audio → transcript → chunks → embeddings.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Meeting file. Accepted: `.mp4`, `.mp3`, `.wav` |

**Response 200**
```json
{
  "message": "meeting uploaded successfully. processing started in background.",
  "meeting_id": "a3f9c2d1e4b7..."
}
```

**Response 400** — unsupported file extension
```json
{ "detail": "Only mp4/mp3/wav allowed" }
```

**Notes**
- `meeting_id` is a UUID hex string generated per upload.
- Pipeline runs asynchronously using FastAPI BackgroundTasks.
- Returns immediately. The frontend must poll `/status/{meeting_id}` to track progress.

---

### GET /status/{meeting_id}

Returns the live processing status of a meeting upload by querying Redis.

**Response 200**
```json
{
  "status": "queued | processing | complete | failed",
  "progress": 75,
  "stage": "extracting_audio | transcribing | embedding | done",
  "detail": "Transcribing chunk 2/5",
  "error": ""
}
```

**Response 404** — job not found
```json
{ "detail": "Job not found" }
```

---

### POST /start-recording

Start live microphone recording using `sounddevice`.

**Response 200**
```json
{ "message": "Recording started" }
```

**Response 500** — audio device not available
```json
{ "detail": "Recording failed to start" }
```

---

### POST /stop-recording

Stop the active recording, save the audio, and run the full pipeline.

**Response 200**
```json
{
  "message": "Recording stopped & processed",
  "meeting_id": "b1e2f3a4c5d6..."
}
```

**Response 400** — recording was never started
```json
{ "detail": "Recording not started" }
```

**Response 500** — processing failed
```json
{ "detail": "Recording processing failed" }
```

**Notes**
- Audio is saved to `uploads/meeting.wav`.
- Pipeline runs the same flow as `/upload`.

---

### POST /notes

Generate bullet-point highlights for a meeting using Groq LLM.

**Request body**
```json
{ "meeting_id": "a3f9c2d1e4b7..." }
```

**Response 200**
```json
{
  "notes": "• Key decision made.\n• Action item assigned.\n• Follow-up scheduled."
}
```

**Response 500** — generation failed
```json
{ "detail": "Notes generation failed" }
```

**Notes**
- Highlights are cached in Redis. The first request takes time; subsequent requests return instantly.
- Deduplicates retrieved chunks before sending to LLM.
- Requires `GROQ_API_KEY` in `.env`.

---

### POST /chat

Ask a question about a specific meeting. Answers are grounded only in the meeting transcript.

**Request body**
```json
{
  "question": "What action items were assigned?",
  "meeting_id": "a3f9c2d1e4b7..."
}
```

**Response 200**
```json
{
  "answer": "The following action items were assigned: ..."
}
```

**Response 500** — chat failed
```json
{ "detail": "Chat failed" }
```

**Notes**
- Uses `ConversationalRetrievalChain` with `ConversationBufferWindowMemory` (last 5 turns).
- Retrieves top 7 most relevant chunks per query.
- If the answer is not in the transcript, returns: `"Not found in the meeting transcript"`.
- Empty or whitespace-only questions return: `"Please ask a valid question."`
- Requires `GROQ_API_KEY` in `.env`.

---

### POST /set-meeting-name

Save a human-readable name for a meeting.

**Request body**
```json
{
  "meeting_id": "a3f9c2d1e4b7...",
  "name": "Weekly Team Sync"
}
```

**Response 200**
```json
{ "status": "saved" }
```

**Notes**
- Names are persisted in the MySQL database under the authenticated user.

---

### GET /meetings

List all saved meetings in reverse chronological order.

**Response 200**
```json
[
  { "id": "a3f9c2d1e4b7...", "name": "Weekly Team Sync" },
  { "id": "b1e2f3a4c5d6...", "name": "Product Review" }
]
```

**Notes**
- Returns `[]` if no meetings have been named yet.
- Order is reversed so the most recent meeting appears first.

---

### GET /download-notes

Download the highlights for a meeting as PDF, TXT, or DOCX. Requires authentication (httpOnly JWT cookie) and meeting ownership verification.

**Query parameters**

| Parameter | Type | Required | Values |
|---|---|---|---|
| `meeting_id` | string | yes | UUID hex of the meeting |
| `format` | string | no | `pdf` (default), `txt`, `docx` |

**Response 200 (file)** — returns the file as a download

**Response 200 (error)** — highlights not generated yet
```json
{ "error": "Highlights not generated yet." }
```

**Response 200 (error)** — invalid format
```json
{ "error": "Invalid format" }
```

**Notes**
- Reads from `Notes/highlights_<meeting_id>.txt`.
- PDF is built with ReportLab, DOCX with python-docx.
- The meeting name is resolved from the MySQL database and included in the file header and filename.
- Generate highlights first via `POST /notes` before downloading.

---

## Error handling

All endpoints follow this pattern:

| Status | Meaning |
|---|---|
| `200` | Success (or business-logic error returned as JSON) |
| `400` | Bad request (invalid file type, recording not started) |
| `500` | Internal server error (pipeline crash, LLM failure) |

Errors from `/download-notes` and `/meetings` are always returned as `200` with an `error` key in the JSON body rather than HTTP error codes.

---

## Authentication

Authentication is implemented via JWT tokens stored in httpOnly cookies:

**Registration & Login:**
- `POST /auth/register` — Create new user account with email + password
- `POST /auth/login` — Login returns JWT in httpOnly cookie (24-hour expiry)
- `GET /auth/me` — Check current session, returns `{user_id, email}`
- `POST /auth/logout` — Clears the auth cookie

**Requirements:**
- Password must be 8+ chars, with uppercase, lowercase, digit, special character
- All endpoints except `/auth/register` and `/auth/login` require valid JWT cookie
- Meeting access is scoped to the authenticated user (ownership checks on `/chat`, `/notes`, `/set-meeting-name`, `/meetings`)

**Known Issues:**
- Password reset flow not implemented
- No email verification on registration
- No brute-force protection on login/register

---

## CORS

All origins are allowed (`*`). Configured in `main.py` via `CORSMiddleware`.

---



```bash
uvicorn main:app --reload
```

Server starts at `http://127.0.0.1:8000`.
