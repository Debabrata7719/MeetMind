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

  // Status via WebSocket
  useEffect(() => {
    if (!meetingId) return;

    // Fetch initial status just in case it's already done
    fetch(`${API_BASE}/status/${meetingId}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setJobStatus(data))
      .catch(console.error);

    const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/${meetingId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setJobStatus(data);
        if (data.status === "done" || data.status === "failed") {
          ws.close();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

  // Fetch Highlights on demand
  const generateHighlights = async () => {
    if (highlights || isGeneratingNotes) return;
    setIsGeneratingNotes(true);
    setHighlights("");
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meeting_id: meetingId })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch highlights: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setHighlights(prev => (prev || "") + chunk);
      }
    } catch (err) {
      console.error(err);
      setHighlights("We had trouble compiling the AI intelligence report for this meeting. Please check your connection and try clicking 'Get Highlights' again.");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Chat State
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWsRef = useRef<WebSocket | null>(null);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/chat/${meetingId}`;
      const ws = new WebSocket(wsUrl);
      chatWsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ question: userMsg }));
        // Add a placeholder assistant message
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      };

      ws.onmessage = (event) => {
        const chunk = event.data;
        if (chunk === "[DONE]") {
          ws.close();
        } else if (chunk.startsWith("[ERROR]")) {
          console.error(chunk);
          setMessages(prev => {
            const newMsgs = [...prev];
            const last = newMsgs[newMsgs.length - 1];
            if (last && last.role === "assistant") {
              newMsgs[newMsgs.length - 1] = { role: "assistant", content: "Sorry, I ran into a system error processing your request. Please try asking again." };
            }
            return newMsgs;
          });
          ws.close();
        } else {
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              // Create a new object to ensure React triggers a re-render
              newMsgs[newMsgs.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
            }
            return newMsgs;
          });
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          if (last && last.role === "assistant") {
            newMsgs[newMsgs.length - 1] = { role: "assistant", content: "We couldn't connect to the AI chat service. Please check your internet connection." };
          }
          return newMsgs;
        });
        setIsChatLoading(false);
        ws.close();
      };
      
      ws.onclose = () => {
        setIsChatLoading(false);
        chatWsRef.current = null;
      };
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last && last.role === "assistant") {
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: "Failed to open a connection to the chat server. Please try again." };
        }
        return newMsgs;
      });
      setIsChatLoading(false);
      chatWsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (chatWsRef.current) {
        chatWsRef.current.close();
        chatWsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isProcessing = jobStatus && jobStatus.status !== "done" && jobStatus.status !== "failed";

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-bold text-on-surface">{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    let inList = false;
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      const cleanLine = line.trim();
      if (!cleanLine) {
        if (inList) {
          inList = false;
        }
        return;
      }

      // Check header
      if (cleanLine.startsWith("### ")) {
        if (inList) inList = false;
        elements.push(<h3 key={i} className="text-lg font-bold mt-4 mb-2 text-on-surface">{cleanLine.substring(4)}</h3>);
      } else if (cleanLine.startsWith("## ")) {
        if (inList) inList = false;
        elements.push(<h2 key={i} className="text-xl font-bold mt-5 mb-2 border-b border-outline-variant/30 pb-1 text-on-surface">{cleanLine.substring(3)}</h2>);
      } else if (cleanLine.startsWith("# ")) {
        if (inList) inList = false;
        elements.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-on-surface">{cleanLine.substring(2)}</h1>);
      } else if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
        const itemContent = cleanLine.substring(2);
        const parsed = parseBold(itemContent);
        elements.push(
          <li key={i} className="ml-5 list-disc text-on-surface-variant mb-1.5 leading-relaxed">
            {parsed}
          </li>
        );
      } else {
        if (inList) inList = false;
        const parsed = parseBold(cleanLine);
        elements.push(<p key={i} className="text-on-surface-variant mb-3 leading-relaxed">{parsed}</p>);
      }
    });

    return <div className="prose max-w-none">{elements}</div>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-10 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-outline-variant/30 text-center max-w-md w-full">
            {/* SVG Circular Progress Bar from 0 to 100 */}
            <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  strokeWidth="8"
                  fill="transparent"
                  style={{ stroke: 'var(--color-surface-container)' }}
                />
                {/* Foreground circle */}
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - (jobStatus?.progress || 0) / 100)}
                  strokeLinecap="round"
                  style={{ stroke: 'var(--color-primary)', transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
              </svg>
              <span className="absolute text-xl font-bold text-on-surface">
                {jobStatus?.progress || 0}%
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Analyzing Meeting</h3>
            <p className="text-on-surface-variant text-label-md mb-6">{jobStatus.message || "Processing media file..."}</p>
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
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl border border-outline-variant/20 shadow-sm">
                    <span className="font-bold text-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                      AI Intelligence Report
                    </span>
                    <button
                      onClick={() => {
                        const blob = new Blob([highlights], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `meeting-${params.id}-highlights.md`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download Markdown
                    </button>
                  </div>
                  <section className="bg-white p-8 rounded-[24px] shadow-sm border border-outline-variant/20">
                    {renderMarkdown(highlights)}
                  </section>
                </div>
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
