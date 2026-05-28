# Meeting Intelligence System API Reference

This document outlines the core API endpoints available in the system. 

## Authentication (`/auth`)

### `POST /auth/register`
Register a new user account.
- **Payload:** `{"email": "user@example.com", "password": "securepassword"}`
- **Response:** `{"msg": "User registered successfully", "user_id": 1}`

### `POST /auth/login`
Authenticate and receive an `access_token` via HTTP-only cookie.
- **Payload:** `{"email": "user@example.com", "password": "securepassword"}`
- **Response:** `{"msg": "Login successful"}`
- **Note:** Sets a secure, `httpOnly` cookie containing the JWT.

### `GET /auth/me`
Retrieve the currently authenticated user's profile.
- **Headers:** Requires valid `access_token` cookie.
- **Response:** `{"user_id": 1, "email": "user@example.com"}`

---

## Meetings (`/meetings`)

### `GET /meetings`
List all meetings owned by the authenticated user.
- **Headers:** Requires valid `access_token` cookie.
- **Response:** `[{"meeting_id": "uuid", "name": "Meeting Name", "created_at": "timestamp"}]`

### `DELETE /meetings/{meeting_id}`
Permanently delete a meeting and all associated data (Vector DB, Redis Cache, MySQL row).
- **Headers:** Requires valid `access_token` cookie.
- **Response:** `{"status": "deleted"}`

---

## Intelligence & Processing

### `POST /upload`
Upload an audio or video file to trigger the intelligence pipeline (FFmpeg extraction, Whisper transcription, ChromaDB vector indexing).
- **Headers:** Requires valid `access_token` cookie.
- **Form Data:** `file` (multipart/form-data)
- **Response:** `{"meeting_id": "uuid"}`

### `POST /chat`
Ask a question grounded entirely in the context of the specific meeting transcript.
- **Headers:** Requires valid `access_token` cookie.
- **Payload:** `{"meeting_id": "uuid", "question": "What were the action items?"}`
- **Response:** `{"answer": "..."}`

### `POST /notes`
Generate intelligent bullet-point highlights from the meeting transcript using Groq.
- **Headers:** Requires valid `access_token` cookie.
- **Payload:** `{"meeting_id": "uuid"}`
- **Response:** `{"highlights": "..."}`

### `GET /download-notes`
Download the generated highlights as a PDF, TXT, or DOCX file.
- **Headers:** Requires valid `access_token` cookie.
- **Query Params:** `meeting_id=uuid`, `format=pdf|txt|docx`
- **Response:** Binary file download.
