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

Upload a meeting file (MP4, MP3, or WAV). Runs the full pipeline automatically:
video → audio → transcript → chunks → embeddings.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Meeting file. Accepted: `.mp4`, `.mp3`, `.wav` |

**Response 200**
```json
{
  "message": "meeting processed successfully",
  "meeting_id": "a3f9c2d1e4b7..."
}
```

**Response 400** — unsupported file extension
```json
{ "detail": "Only mp4/mp3/wav allowed" }
```

**Response 500** — pipeline crashed
```json
{ "detail": "Pipeline crashed" }
```

**Notes**
- `meeting_id` is a UUID hex string generated per upload.
- The file is saved to `uploads/<meeting_id>.<ext>`.
- Pipeline runs asynchronously in a thread pool.

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
- Runs 5 semantic retrieval queries against the meeting's ChromaDB collection.
- Deduplicates retrieved chunks before sending to LLM.
- Saves highlights to `Notes/highlights_<meeting_id>.txt`.
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
- Names are persisted to `data/meetings.json`.
- If the file doesn't exist it is created automatically.

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

Download the highlights for a meeting as PDF, TXT, or DOCX.

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
- The meeting name is included in the file header and filename.
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

No authentication is implemented. The API is intended for local use. Do not expose it publicly without adding auth middleware.

---

## CORS

All origins are allowed (`*`). Configured in `main.py` via `CORSMiddleware`.

---

## Running the server

```bash
uvicorn main:app --reload
```

Server starts at `http://127.0.0.1:8000`.
