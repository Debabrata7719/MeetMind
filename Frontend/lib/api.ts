/**
 * lib/api.ts
 * Type-safe wrappers for all Meeting Intelligence System API endpoints.
 * credentials: "include" on every call so the httpOnly JWT cookie is sent.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const OPTS = { credentials: "include" as RequestCredentials };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Meeting { id: string; name: string }
export interface UploadResponse { message: string; meeting_id: string }
export interface RecordingResponse { message: string; meeting_id: string }
export interface NotesResponse { notes: string }
export interface ChatResponse { answer: string }

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function getMeetings(): Promise<Meeting[]> {
  const res = await fetch(`${API_BASE}/meetings`, OPTS);
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

export async function uploadMeeting(file: File): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd, ...OPTS });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function startRecording(): Promise<void> {
  const res = await fetch(`${API_BASE}/start-recording`, { method: "POST", ...OPTS });
  if (!res.ok) throw new Error("Failed to start recording");
}

export async function stopRecording(): Promise<RecordingResponse> {
  const res = await fetch(`${API_BASE}/stop-recording`, { method: "POST", ...OPTS });
  if (!res.ok) throw new Error("Failed to stop recording");
  return res.json();
}

export async function generateNotes(meetingId: string): Promise<NotesResponse> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting_id: meetingId }),
    ...OPTS,
  });
  if (!res.ok) throw new Error("Failed to generate notes");
  return res.json();
}

export async function askQuestion(question: string, meetingId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, meeting_id: meetingId }),
    ...OPTS,
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export async function setMeetingName(meetingId: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/set-meeting-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting_id: meetingId, name }),
    ...OPTS,
  });
  if (!res.ok) throw new Error("Failed to save meeting name");
}

export function getDownloadUrl(meetingId: string, format: "pdf" | "txt" | "docx"): string {
  return `${API_BASE}/download-notes?meeting_id=${meetingId}&format=${format}`;
}
