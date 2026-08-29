"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function MeetingsPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    try {
      // 1. Get S3 presigned post URL from our backend
      const sigRes = await fetch(
        `${API_BASE}/upload/s3-presigned?filename=${encodeURIComponent(selectedFile.name)}&filetype=${encodeURIComponent(selectedFile.type)}`,
        {
          credentials: "include",
        }
      );
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const sigData = await sigRes.json();

      // 2. Upload directly to S3
      const s3FormData = new FormData();
      Object.entries(sigData.fields).forEach(([key, value]) => {
        s3FormData.append(key, value as string);
      });
      // S3 requires the file parameter to be appended LAST
      s3FormData.append("file", selectedFile);

      const s3Res = await fetch(sigData.url, {
        method: "POST",
        body: s3FormData,
      });
      
      if (!s3Res.ok) throw new Error("Failed to upload to S3 storage bucket");

      // 3. Send the S3 file key to our backend
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          file_key: sigData.file_key,
          original_name: selectedFile.name.split('.')[0]
        }),
      });

      if (!res.ok) {
        throw new Error("Backend failed to start processing");
      }

      const data = await res.json();
      try {
        const processing = JSON.parse(localStorage.getItem("processing_meetings") || "[]");
        if (!processing.includes(data.meeting_id)) {
          processing.push(data.meeting_id);
          localStorage.setItem("processing_meetings", JSON.stringify(processing));
        }
      } catch (storageErr) {
        console.error("Failed to write to localStorage:", storageErr);
      }
      router.push(`/dashboard/meetings/${data.meeting_id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to upload the file. Please try again.");
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const meetingIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startLiveRecording = async () => {
    try {
      // 1. Generate unique meeting ID
      const newMeetingId = "live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      meetingIdRef.current = newMeetingId;

      // 2. Call backend to start live session
      const startRes = await fetch(`${API_BASE}/meetings/${newMeetingId}/live/start?name=Live%20Meeting%20Recording`, {
        method: "POST",
        credentials: "include"
      });
      if (!startRes.ok) throw new Error("Failed to start live session on backend");

      // 3. Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      isRecordingRef.current = true;
      let chunks: Blob[] = [];

      // 4. Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (chunks.length > 0 && meetingIdRef.current) {
          const blob = new Blob(chunks, { type: "audio/webm" });
          chunks = []; // Reset for next rotation
          
          const chunkFormData = new FormData();
          chunkFormData.append("file", blob, "chunk.webm");
          try {
            await fetch(`${API_BASE}/meetings/${meetingIdRef.current}/live/chunk`, {
              method: "POST",
              body: chunkFormData,
              credentials: "include"
            });
            console.log("[Mic] Self-contained chunk uploaded successfully");
          } catch (chunkErr) {
            console.error("[Mic] Failed to upload chunk:", chunkErr);
          }
        }

        // If user clicked Stop (isRecordingRef is false), finalize meeting aggregation
        if (!isRecordingRef.current && meetingIdRef.current) {
          try {
            console.log("[Mic] Finalizing live meeting recording:", meetingIdRef.current);
            await fetch(`${API_BASE}/meetings/${meetingIdRef.current}/live/end`, {
              method: "POST",
              credentials: "include"
            });
            router.push(`/dashboard/meetings/${meetingIdRef.current}`);
          } catch (endErr) {
            console.error("[Mic] Failed to finalize live meeting:", endErr);
          }
        }

        // Restart recording for next micro-batch if still active
        if (isRecordingRef.current && streamRef.current && streamRef.current.active) {
          mediaRecorder.start();
        }
      };

      // Start initial recording
      mediaRecorder.start();
      setIsRecording(true);
      setSeconds(0);

      // Rotate chunks every 15 seconds to ensure self-contained file headers
      rotationIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 15000);

      console.log("[Mic] Live recording loop initiated");
    } catch (err) {
      console.error("[Mic] Failed to initialize live recording:", err);
      alert("Microphone permission denied or recording failed to start.");
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      isRecordingRef.current = false;
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    } else {
      startLiveRecording();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Failed to stop media recorder on unmount", e);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.error("Failed to stop track on unmount", e);
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleStop = async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setSeconds(0);

    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-outline mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">
              Meetings
            </span>
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
              Recording Center
            </span>
          </nav>
          <h2 className="font-headline-md text-headline-md text-on-background">
            Capture Intelligence
          </h2>
          <p className="text-on-surface-variant mt-2 max-w-xl">
            Initiate high-fidelity recording or upload existing media to process
            with our AI engines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {/* Avatars will appear here when shared */}
          </div>
          <span className="text-sm text-outline font-medium">
            Shared with Team
          </span>
        </div>
      </div>

      {/* Content Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Recording Panel */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-8 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[400px]">
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-[128px]">
              graphic_eq
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${isRecording ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-error animate-pulse" : "bg-primary"}`}></span>
                <span className="font-label-sm text-label-sm">
                  {isRecording ? "RECORDING..." : "READY TO RECORD"}
                </span>
              </div>
              <button className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            <div className="text-center py-6">
              <div className="font-display-lg text-display-lg text-on-surface tracking-tighter tabular-nums">
                {formatTime(seconds)}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            {/* SVG Waveform Visualizer */}
            <div className="h-16 flex items-center justify-center relative overflow-hidden bg-surface-container-low/20 rounded-2xl border border-outline-variant/10">
              {isRecording ? (
                <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
                  <path
                    d="M 0 30 Q 25 5, 50 30 T 100 30 T 150 30 T 200 30 T 250 30 T 300 30 T 350 30 T 400 30"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray="20 10"
                    style={{
                      stroke: 'var(--color-primary)',
                      filter: 'drop-shadow(0 0 6px var(--color-primary))',
                      animation: 'wave-flow 3s linear infinite'
                    }}
                  />
                  <path
                    d="M 0 30 Q 25 55, 50 30 T 100 30 T 150 30 T 200 30 T 250 30 T 300 30 T 350 30 T 400 30"
                    fill="none"
                    strokeWidth="1.5"
                    strokeDasharray="15 15"
                    style={{
                      stroke: 'var(--color-tertiary)',
                      opacity: 0.6,
                      animation: 'wave-flow 4s linear infinite reverse'
                    }}
                  />
                </svg>
              ) : (
                <div className="flex gap-1.5 items-center">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="w-1 h-3 bg-outline-variant/30 rounded-full"></div>
                  ))}
                </div>
              )}
            </div>
            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                disabled={seconds === 0 && !isRecording}
                onClick={handleStop}
                className="w-14 h-14 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-all disabled:opacity-30"
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  stop
                </span>
              </button>
              <button
                onClick={handleMicToggle}
                className="w-20 h-20 primary-gradient rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:scale-105 transition-all group"
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isRecording ? "stop" : "mic"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Panel */}
        <div className="lg:col-span-7 space-y-gutter">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="sr-only" 
            accept="audio/*,video/*,.mp4,.mp3,.wav,.mov"
            onChange={handleFileSelect}
          />
          {/* Drop Zone */}
          <div 
            onClick={triggerFileInput}
            className="bg-white border-2 border-dashed border-outline-variant rounded-[24px] p-10 transition-all duration-300 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary hover:bg-primary/5"
          >
            <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-primary text-4xl">
                cloud_upload
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Drag & Drop Media
            </h3>
            <p className="text-on-surface-variant mt-2 max-w-sm">
              Upload your meeting recordings, voice notes, or video files to
              generate instant transcripts and insights.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg font-label-sm text-label-sm">
                MP4
              </span>
              <span className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg font-label-sm text-label-sm">
                MP3
              </span>
              <span className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg font-label-sm text-label-sm">
                WAV
              </span>
              <span className="px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg font-label-sm text-label-sm">
                MOV
              </span>
            </div>
            <button className="mt-8 px-6 py-2 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all">
              Browse Files
            </button>
          </div>
          {/* Active Uploads will appear here */}
          {selectedFile && (
            <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between border border-outline-variant/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">insert_drive_file</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface truncate max-w-[200px] md:max-w-md">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">memory</span>
                      Analyze Meeting
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Tooltip */}
      <div className="flex flex-col lg:flex-row gap-gutter">
        <div className="lg:col-span-12">
          <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-2xl flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary">
                auto_awesome
              </span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface">
                Pro Tip: Multi-Language Detection
              </h4>
              <p className="text-on-surface-variant text-sm">
                MeetMind automatically detects up to 12 languages in a single
                session. No manual switching required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
