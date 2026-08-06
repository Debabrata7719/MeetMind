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
      // 1. Get Cloudinary signature from our backend
      const sigRes = await fetch(`${API_BASE}/upload/signature`, {
        credentials: "include",
      });
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const sigData = await sigRes.json();

      // 2. Upload directly to Cloudinary
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append("file", selectedFile);
      cloudinaryFormData.append("api_key", sigData.api_key);
      cloudinaryFormData.append("timestamp", sigData.timestamp);
      cloudinaryFormData.append("signature", sigData.signature);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/auto/upload`,
        {
          method: "POST",
          body: cloudinaryFormData,
        }
      );
      
      if (!cloudRes.ok) throw new Error("Failed to upload to Cloudinary");
      const cloudData = await cloudRes.json();

      // 3. Send the Cloudinary URL to our backend
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          file_url: cloudData.secure_url,
          original_name: selectedFile.name.split('.')[0]
        }),
      });

      if (!res.ok) {
        throw new Error("Backend failed to start processing");
      }

      const data = await res.json();
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isRecording && seconds !== 0) {
      // Don't reset seconds on pause
    }
    return () => clearInterval(interval);
  }, [isRecording, seconds]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleStop = () => {
    setIsRecording(false);
    setSeconds(0);
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
            {/* Animated Waveform */}
            <div className="flex items-center justify-center gap-1 h-12 overflow-hidden">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isRecording
                      ? "bg-primary animate-[waveform-bounce_1.2s_ease-in-out_infinite]"
                      : "bg-primary-container opacity-30 h-2"
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                ></div>
              ))}
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
                onClick={() => setIsRecording(!isRecording)}
                className="w-20 h-20 primary-gradient rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 hover:scale-105 transition-all group"
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isRecording ? "pause" : "mic"}
                </span>
              </button>
              <button
                disabled={seconds === 0}
                className="w-14 h-14 flex items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-all disabled:opacity-30"
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  pause
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
