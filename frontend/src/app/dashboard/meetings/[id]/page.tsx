"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/api";

type JobStatus = { status: string; progress?: number; message?: string } | null;

export default function MeetingWorkspacePage() {
  const params = useParams();
  const meetingId = params.id as string;
  const [activeTab, setActiveTab] = useState<"hub" | "transcript" | "highlights" | "chat">("hub");

  const [jobStatus, setJobStatus] = useState<JobStatus>(null);
  const [highlights, setHighlights] = useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Status Polling
  useEffect(() => {
    if (!meetingId) return;

    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${meetingId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setJobStatus(data);
          if (data.status === "done" || data.status === "failed") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [meetingId]);

  // Fetch Highlights on demand
  const generateHighlights = () => {
    if (highlights || isGeneratingNotes) return;
    setIsGeneratingNotes(true);
    fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ meeting_id: meetingId })
    })
      .then(res => res.json())
      .then(data => setHighlights(data.notes))
      .catch(console.error)
      .finally(() => setIsGeneratingNotes(false));
  };

  // Chat State
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meeting_id: meetingId, question: userMsg })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isProcessing = jobStatus && jobStatus.status !== "done" && jobStatus.status !== "failed";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-10 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-outline-variant/30 text-center max-w-md w-full">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-4">sync</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Analyzing Meeting</h3>
            <p className="text-on-surface-variant text-label-md mb-6">{jobStatus.message || "Processing media file..."}</p>
            <div className="w-full bg-surface-variant rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${jobStatus.progress || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-outline font-bold text-right">{jobStatus.progress || 0}%</p>
          </div>
        </div>
      )}

      {/* Workspace Header (Overrides layout header visually) */}
      <header className="flex justify-between items-center h-16 px-6 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/history"
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-md text-label-md hidden sm:inline">
              Back to History
            </span>
          </Link>
          <div className="h-4 w-px bg-outline-variant"></div>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Meeting Workspace {params.id}
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              No meeting data found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/50">
            <span className={`w-2 h-2 rounded-full ${jobStatus?.status === 'done' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {jobStatus?.status === "done" ? "Processed" : jobStatus?.status || "Loading..."}
            </span>
          </div>
        </div>
      </header>


      {/* Content Area Grid */}
      <div className="flex-1 overflow-hidden flex bg-background">
        {/* Main Display Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
          {/* HUB VIEW */}
          {activeTab === "hub" && (
            <div className="flex flex-col items-center justify-center h-full space-y-10 pb-20">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    task_alt
                  </span>
                </div>
                <h2 className="font-display-sm text-display-sm text-on-surface">Analysis Ready</h2>
                <p className="text-on-surface-variant max-w-md mx-auto text-lg">
                  The meeting vectors have been successfully stored. What would you like to do next?
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                <button
                  onClick={() => {
                    setActiveTab("highlights");
                    generateHighlights();
                  }}
                  disabled={jobStatus?.status !== "done"}
                  className="group flex flex-col items-center gap-4 p-10 bg-white border border-outline-variant/50 rounded-[32px] hover:border-primary hover:shadow-lg transition-all disabled:opacity-50 text-center"
                >
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Get Highlights</h3>
                    <p className="text-sm text-on-surface-variant">Generate a full executive summary and extract action items.</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (window.innerWidth < 640) {
                      setActiveTab("chat");
                    } else {
                      document.getElementById("chatInput")?.focus();
                    }
                  }}
                  disabled={jobStatus?.status !== "done"}
                  className="group flex flex-col items-center gap-4 p-10 bg-white border border-outline-variant/50 rounded-[32px] hover:border-secondary hover:shadow-lg transition-all disabled:opacity-50 text-center"
                >
                  <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">forum</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Ask about meeting</h3>
                    <p className="text-sm text-on-surface-variant">Chat directly with the meeting vectors to find specific answers.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TRANSCRIPT VIEW */}
          {activeTab === "transcript" && (
            <div className="space-y-8 max-w-4xl mx-auto pb-20">
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70">
                <span className="material-symbols-outlined text-4xl mb-4">notes</span>
                <p>Transcript will appear here once processed.</p>
              </div>
            </div>
          )}

          {/* HIGHLIGHTS VIEW */}
          {activeTab === "highlights" && (
            <div className="space-y-8 max-w-5xl mx-auto pb-20">
              {isGeneratingNotes && !highlights && (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-4xl mb-4">sync</span>
                  <p>Generating AI Intelligence Report...</p>
                </div>
              )}
              {highlights && (
                <section className="bg-white p-8 rounded-[24px] shadow-sm border border-outline-variant/20 whitespace-pre-wrap">
                  {highlights}
                </section>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Decisions */}
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-outline-variant/20">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      gavel
                    </span>
                    Decisions
                  </h4>
                  <p className="text-on-surface-variant italic">No decisions extracted.</p>
                </div>

                {/* Action Items */}
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-outline-variant/20 border-l-4 border-l-primary">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      checklist
                    </span>
                    Action Items
                  </h4>
                  <p className="text-on-surface-variant italic">No action items found.</p>
                </div>
              </div>
            </div>
          )}

          {/* CHAT VIEW (Mobile only) */}
          {activeTab === "chat" && (
            <div className="h-full flex flex-col max-w-4xl mx-auto sm:hidden relative">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">robot_2</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm">Chat with MeetMind AI</h3>
                    <p className="text-on-surface-variant max-w-sm">
                      Ask anything about the transcript, decisions, or sentiment of this meeting.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-surface-variant" : "bg-primary text-white"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {msg.role === "user" ? "person" : "robot_2"}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === "user" ? "bg-surface-variant text-on-surface" : "bg-primary/5 text-on-surface border border-primary/10"} whitespace-pre-wrap`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-sm">robot_2</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* AI Chat Sidebar (Desktop Always Visible) */}
        <div className="hidden sm:flex w-[350px] lg:w-[400px] border-l border-outline-variant/30 flex-col bg-surface-container-lowest">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center text-white">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <span className="font-label-md text-label-md font-bold">
                AI Assistant
              </span>
            </div>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70 text-center space-y-4">
                <span className="material-symbols-outlined text-4xl">forum</span>
                <p className="text-sm px-4">Chat is empty. Ask me anything about the meeting.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === "user" ? "bg-surface-variant" : "bg-primary text-white"}`}>
                    <span className="material-symbols-outlined text-[12px]">
                      {msg.role === "user" ? "person" : "robot_2"}
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === "user" ? "bg-surface-variant text-on-surface rounded-tr-sm" : "bg-primary/5 text-on-surface border border-primary/10 rounded-tl-sm"} whitespace-pre-wrap`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[12px]">robot_2</span>
                </div>
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 rounded-tl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 bg-white border-t border-outline-variant/30">
            <div className="mb-3 flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-surface-container rounded-full text-xs text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all">
                "Summarize risks"
              </button>
            </div>
            <form onSubmit={handleSendChat} className="relative">
              <input
                id="chatInput"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading || !jobStatus || jobStatus.status !== "done"}
                className="w-full pl-4 pr-12 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none custom-scrollbar disabled:opacity-50"
                placeholder={jobStatus?.status !== "done" ? "Processing..." : "Message MeetMind AI..."}
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isChatLoading || !jobStatus || jobStatus.status !== "done"}
                className="absolute right-2 top-1.5 w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
