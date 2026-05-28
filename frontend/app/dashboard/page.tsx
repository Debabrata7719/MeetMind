"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  DragEvent,
  ChangeEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  getMeetings,
  uploadMeeting,
  startRecording,
  stopRecording,
  generateNotes,
  askQuestion,
  setMeetingName,
  getDownloadUrl,
  getJobStatus,
  deleteMeeting,
  type Meeting,
  type JobStatus,
} from "@/lib/api";
import { apiLogout, apiMe } from "@/lib/auth";


// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isTyping?: boolean;
}

type RecStatus = "idle" | "recording" | "processing" | "ready";

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  // ── State ──
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string } | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [currentMeetingName, setCurrentMeetingName] = useState<string>("");
  const [meetingReady, setMeetingReady] = useState(false);
  const [activeDeleteMenu, setActiveDeleteMenu] = useState<string | null>(null);

  // Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("No file selected");
  const [isDragging, setIsDragging] = useState(false);

  // Job progress
  const [jobProgress, setJobProgress] = useState<JobStatus | null>(null);
  const [processingMeetingId, setProcessingMeetingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording
  const [recStatus, setRecStatus] = useState<RecStatus>("idle");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notes
  const [notesLines, setNotesLines] = useState<string[]>([]);
  const [notesEmpty, setNotesEmpty] = useState(true);
  const [notesPlaceholder, setNotesPlaceholder] = useState(
    "Highlights will appear here."
  );
  const [showDownload, setShowDownload] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Upload or select a meeting to start chatting." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Loader
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderText, setLoaderText] = useState("Processing...");

  // Name modal
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // ── Helpers ──
  const showLoader = (text: string) => { setLoaderText(text); setLoaderVisible(true); };
  const hideLoader = () => setLoaderVisible(false);

  const activateMeeting = useCallback(
    (id: string, name: string) => {
      setCurrentMeetingId(id);
      setCurrentMeetingName(name);
      setMeetingReady(true);
      setNotesLines([]);
      setNotesEmpty(true);
      setNotesPlaceholder("Meeting loaded. Click Generate for highlights.");
      setChatMessages([{ role: "assistant", text: `Loaded meeting: ${name}` }]);
    },
    []
  );

  // ── Timer ──
  const startTimer = () => {
    setTimerSeconds(0);
    timerRef.current = setInterval(
      () => setTimerSeconds((s) => s + 1),
      1000
    );
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTimer = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch {
      setMeetings([]);
    }
  }, []);

  useEffect(() => {
    apiMe().then(user => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser(user);
      loadHistory();
    });
  }, [router, loadHistory]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Close download dropdown on outside click ──
  useEffect(() => {
    const handler = () => setShowDownload(false);
    if (showDownload) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showDownload]);

  // ── Recording ──
  const handleStartRecording = async () => {
    try {
      setRecStatus("recording");
      setMeetingReady(false);
      startTimer();
      await startRecording();
    } catch {
      setRecStatus("idle");
      stopTimer();
    }
  };

  const handleStopRecording = async () => {
    try {
      stopTimer();
      setRecStatus("processing");
      const data = await stopRecording();
      setCurrentMeetingId(data.meeting_id);
      setRecStatus("ready");
      setMeetingReady(true);
      setNotesPlaceholder("Ready to generate highlights.");
      setNotesLines([]);
      setNotesEmpty(true);
      setChatMessages([{ role: "assistant", text: "Meeting recorded and processed!" }]);
      setNameInput("");
      setNameModalVisible(true);
    } catch {
      setRecStatus("idle");
    }
  };

  // ── File select ──
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadStatus(`Selected: ${file.name}`);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files[0] ?? null);
  };

  // ── Stop polling helper ──
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── Start polling job progress ──
  const startPolling = useCallback((meetingId: string) => {
    stopPolling();
    setProcessingMeetingId(meetingId);
    setJobProgress({ status: "queued", stage: "queued", detail: "Initializing…", progress: 0, error: "" });

    pollRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(meetingId);
        setJobProgress(status);

        if (status.status === "done") {
          stopPolling();
          setProcessingMeetingId(null);
          setJobProgress(null);
          setMeetingReady(true);
          setNotesPlaceholder("Meeting loaded. Click Generate for highlights.");
          setNotesLines([]);
          setNotesEmpty(true);
          setChatMessages([{ role: "assistant", text: "Meeting processed successfully!" }]);
          setNameInput("");
          setNameModalVisible(true);
          loadHistory();
        } else if (status.status === "failed") {
          stopPolling();
        }
      } catch {
        // Network blip — keep polling
      }
    }, 2000);
  }, [stopPolling, loadHistory]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Upload ──
  const handleUpload = async () => {
    if (!selectedFile) { setUploadStatus("Select a file first"); return; }
    
    // Show the progress overlay immediately for the file upload phase
    setJobProgress({ 
      status: "processing", 
      stage: "uploading", 
      detail: "Sending file to server…", 
      progress: 0, 
      error: "" 
    });

    try {
      const data = await uploadMeeting(selectedFile, (pct) => {
        setJobProgress({ 
          status: "processing", 
          stage: "uploading", 
          detail: "Sending file to server…", 
          progress: pct, 
          error: "" 
        });
      });
      setCurrentMeetingId(data.meeting_id);
      loadHistory();
      // Start polling for backend AI processing progress
      startPolling(data.meeting_id);
    } catch {
      setJobProgress({ 
        status: "failed", 
        stage: "failed", 
        detail: "", 
        progress: 0, 
        error: "Failed to upload file to the server. Please try again." 
      });
      setUploadStatus("Upload failed.");
    }
  };

  // ── Retry failed job ──
  const handleRetry = () => {
    setJobProgress(null);
    setProcessingMeetingId(null);
    // User can re-upload or select another file
  };

  // ── Delete ──
  const handleDeleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (currentMeetingId === id) {
        setCurrentMeetingId(null);
        setMeetingReady(false);
        setNotesLines([]);
        setChatMessages([]);
      }
      setActiveDeleteMenu(null);
    } catch (err) {
      alert("Failed to delete meeting.");
    }
  };

  // ── Notes ──
  const handleGenerateNotes = async () => {
    if (!currentMeetingId) return;
    showLoader("Generating highlights…");
    try {
      const data = await generateNotes(currentMeetingId);
      const lines = (data.notes || "No notes.").split("\n").filter((l) => l.trim());
      setNotesLines(lines);
      setNotesEmpty(false);
    } catch {
      setNotesLines(["Failed to generate notes."]);
      setNotesEmpty(false);
    } finally {
      hideLoader();
    }
  };

  // ── Download ──
  const handleDownload = (format: "pdf" | "txt" | "docx") => {
    if (!currentMeetingId) return;
    setShowDownload(false);
    window.open(getDownloadUrl(currentMeetingId, format), "_blank");
  };

  // ── Chat ──
  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || !currentMeetingId) return;
    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatInput("");
    const typingId = Date.now();
    setChatMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", isTyping: true },
    ]);
    try {
      const data = await askQuestion(q, currentMeetingId);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.isTyping ? { role: "assistant", text: data.answer || "No response" } : m
        )
      );
    } catch {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.isTyping ? { role: "assistant", text: "Chat failed. Please try again." } : m
        )
      );
    }
    void typingId;
  };

  // ── Name modal ──
  const handleSubmitName = async () => {
    if (!currentMeetingId) return;
    const name = nameInput.trim() || "Untitled Meeting";
    await setMeetingName(currentMeetingId, name);
    setNameModalVisible(false);
    setCurrentMeetingName(name);
    activateMeeting(currentMeetingId, name);
    loadHistory();
  };

  // ── Render ──
  if (!currentUser) return null;

  return (
    <div className="dashboard-body">

      {/* ── Loader (for notes generation etc.) ── */}
      {loaderVisible && (
        <div className="loader-overlay">
          <div className="loader-box">
            <div className="spinner" />
            <p>{loaderText}</p>
          </div>
        </div>
      )}

      {/* ── Upload Progress Overlay ── */}
      {jobProgress && (
        <div className="loader-overlay">
          <div className="progress-box">
            <h3 className="progress-title">
              {jobProgress.status === "failed" ? "Processing Failed" : "Processing Meeting"}
            </h3>

            {jobProgress.status !== "failed" ? (
              <>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${jobProgress.progress}%` }}
                  />
                </div>
                <div className="progress-info">
                  <span className="progress-stage">
                    {jobProgress.stage === "uploading" && "📤 Uploading File"}
                    {jobProgress.stage === "queued" && "⏳ Queued"}
                    {jobProgress.stage === "extracting_audio" && "🎵 Extracting Audio"}
                    {jobProgress.stage === "transcribing" && "🎙️ Transcribing"}
                    {jobProgress.stage === "embedding" && "🧠 Embedding"}
                    {jobProgress.stage === "generating_highlights" && "✨ Generating Highlights"}
                    {jobProgress.stage === "done" && "✅ Complete"}
                  </span>
                  <span className="progress-pct">{jobProgress.progress}%</span>
                </div>
                {jobProgress.detail && (
                  <p className="progress-detail">{jobProgress.detail}</p>
                )}
              </>
            ) : (
              <>
                <p className="progress-error">{jobProgress.error || "An unknown error occurred."}</p>
                <button className="btn primary" onClick={handleRetry}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Name modal ── */}
      {nameModalVisible && (
        <div className="loader-overlay">
          <div className="loader-box" style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>
              Enter Meeting Name
            </h3>
            <input
              autoFocus
              placeholder="e.g. Team Sync"
              value={nameInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNameInput(e.target.value)
              }
              onKeyDown={(e) => e.key === "Enter" && handleSubmitName()}
              style={{ marginTop: 12 }}
            />
            <div style={{ marginTop: 15 }}>
              <button
                className="btn primary"
                style={{ width: "100%" }}
                onClick={handleSubmitName}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="topbar">
        <div>
          <p className="eyebrow">Meeting Intelligence System</p>
          <h1 className="grad-heading">Turn meetings into answers.</h1>
          <p className="subtitle">
            Upload or record meetings, generate highlights, and chat.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{ fontSize: ".78rem", color: "var(--text-secondary)", textDecoration: "none" }}
          >
            ← Home
          </Link>
          <button
            onClick={async () => { await apiLogout(); router.push("/login"); }}
            style={{ fontSize: ".78rem", color: "#fca5a5", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign Out
          </button>
          <div className="status-pill">
            <span className="dot" />
            <span>{currentUser ? currentUser.email : "Loading…"}</span>
          </div>
        </div>
      </header>

      {/* ── Active Meeting Bar ── */}
      <div className="meeting-bar">
        {meetingReady && currentMeetingName ? (
          <>
            <span className="info-dot" />
            <span className="info-text">
              <strong>{currentMeetingName}</strong>
            </span>
            <span className="info-badge">Active</span>
          </>
        ) : (
          <span className="empty-state" style={{ padding: "4px 0", width: "100%" }}>
            No meeting selected
          </span>
        )}
      </div>

      {/* ── Main Grid ── */}
      <main className="layout">

        {/* 1 — History */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>📂 History</h2>
            <p>Select a meeting</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {meetings.length === 0 ? (
              <div className="empty-state">
                No meetings yet. Record or upload to get started.
              </div>
            ) : (
              meetings.map((m) => (
                <div
                  key={m.id}
                  className={`history-item ${
                    m.id === currentMeetingId ? "active" : ""
                  }`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => {
                    setActiveDeleteMenu(null);
                    activateMeeting(m.id, m.name);
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>{m.name}</span>
                  
                  {activeDeleteMenu === m.id ? (
                    <button 
                      onClick={(e) => handleDeleteMeeting(m.id, e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#ef4444",
                        background: "#fee2e2",
                        border: "none",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "4px",
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  ) : (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDeleteMenu(m.id);
                      }}
                      style={{ padding: "2px", cursor: "pointer", opacity: 0.6, flexShrink: 0 }}
                    >
                      <MoreVertical size={16} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2 — Recording */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>🎙️ Live Recording</h2>
            <p>Record meeting audio</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn primary" onClick={handleStartRecording}>
              🎤 Start
            </button>
            <button className="btn" onClick={handleStopRecording}>
              ⏹ Stop
            </button>
            <span
              className={`rec-status ${
                recStatus === "idle" ? "muted" : recStatus
              }`}
            >
              {recStatus === "idle"
                ? "Idle"
                : recStatus === "recording"
                ? "Recording…"
                : recStatus === "processing"
                ? "Processing…"
                : "Ready"}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "#60a5fa",
                fontFamily: "Inter, monospace",
                fontSize: ".95rem",
              }}
            >
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </section>

        {/* 3 — Highlights */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>✨ Highlights</h2>
            <p>Generate meeting notes</p>
          </div>
          <div className="btn-row">
            <button
              className="btn primary"
              disabled={!meetingReady}
              onClick={handleGenerateNotes}
            >
              Generate
            </button>
            <div className="dropdown-wrap">
              <button
                className="btn"
                disabled={!meetingReady || notesEmpty}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDownload((v) => !v);
                }}
              >
                Download ▾
              </button>
              {showDownload && (
                <div className="download-dropdown">
                  <button className="dd-item" onClick={() => handleDownload("pdf")}>
                    📄 PDF
                  </button>
                  <button className="dd-item" onClick={() => handleDownload("txt")}>
                    📝 TXT
                  </button>
                  <button className="dd-item" onClick={() => handleDownload("docx")}>
                    📃 DOCX
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="notes-output">
            {notesEmpty ? (
              <div className="empty-state">{notesPlaceholder}</div>
            ) : (
              notesLines.map((line, i) => (
                <p
                  key={i}
                  className="highlight-line"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </section>

        {/* 4 — Upload */}
        <section className="card">
          <div className="card-header">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>📤 Upload Meeting</h2>
            <p>mp4 / mp3 / wav</p>
          </div>
          <div
            className={`dropzone ${isDragging ? "dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("fileInputHidden")?.click()}
          >
            <input
              id="fileInputHidden"
              type="file"
              accept=".mp4,.mp3,.wav"
              style={{ display: "none" }}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFileChange(e.target.files?.[0] ?? null)
              }
            />
            <p>📁 Drop file here or click to browse</p>
          </div>
          <button className="btn primary" onClick={handleUpload}>
            Upload
          </button>
          <p
            style={{
              fontSize: ".82rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {uploadStatus}
          </p>
        </section>

        {/* 5 — Chat */}
        <section className="card chat-card">
          <div className="card-header">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>💬 Chat</h2>
            <p>Ask questions about your meeting</p>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.isTyping ? (
                  <span className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleChatSubmit}>
            <input
              value={chatInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setChatInput(e.target.value)
              }
              disabled={!meetingReady}
              placeholder={
                meetingReady
                  ? "Ask a question… (Enter to send)"
                  : "Select a meeting first"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e as unknown as FormEvent);
                }
              }}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={!meetingReady || !chatInput.trim()}
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
