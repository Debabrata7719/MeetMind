"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { API_BASE } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>("Loading...");
  const [userName, setUserName] = useState<string>("");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUserEmail(data.email);
          setUserName(data.name || "");
          setUserImage(data.profile_image_url || null);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push("/login");
        }
      } catch (e) {
        console.error(e);
        setIsAuthenticated(false);
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  const [activeJobs, setActiveJobs] = useState<{ [id: string]: { progress: number; message: string; name: string } }>({});
  const [notifications, setNotifications] = useState<{ id: string; message: string; meetingId: string; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Semantic Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ answer: string; results: { meeting_id: string; meeting_title: string; meeting_date: string; content: string }[] } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await fetch(`${API_BASE}/dashboard/search?query=${encodeURIComponent(searchQuery)}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults({ answer: "We encountered a problem searching your meetings. The server might be temporarily busy. Please try again in a few moments.", results: [] });
      }
    } catch (_) {
      setSearchResults({ answer: "We couldn't connect to the search engine. Please check your internet connection and try again.", results: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const activeSockets: { [id: string]: WebSocket } = {};

    const syncJobs = () => {
      let processing: string[] = [];
      try {
        processing = JSON.parse(localStorage.getItem("processing_meetings") || "[]");
      } catch (e) {
        console.error(e);
      }

      // Close sockets for meetings no longer in processing list
      Object.keys(activeSockets).forEach(id => {
        if (!processing.includes(id)) {
          try {
            activeSockets[id].close();
          } catch (_) {}
          delete activeSockets[id];
          setActiveJobs(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }
      });

      // Open sockets for new processing meetings
      processing.forEach(id => {
        if (activeSockets[id]) return;

        // Fetch name/status
        fetch(`${API_BASE}/status/${id}`, { credentials: "include" })
          .then(res => res.json())
          .then(statusData => {
            if (statusData.status === "done" || statusData.status === "failed") {
              // Already complete, remove from list
              try {
                const current = JSON.parse(localStorage.getItem("processing_meetings") || "[]");
                const updated = current.filter((x: string) => x !== id);
                localStorage.setItem("processing_meetings", JSON.stringify(updated));
              } catch (_) {}
              return;
            }

            // Set up WebSocket
            const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/${id}`;
            const ws = new WebSocket(wsUrl);
            activeSockets[id] = ws;

            setActiveJobs(prev => ({
              ...prev,
              [id]: { progress: statusData.progress || 0, message: statusData.message || "Processing...", name: `Meeting ${id.substring(0, 8)}` }
            }));

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.status === "done" || data.status === "failed") {
                  ws.close();
                  delete activeSockets[id];
                  setActiveJobs(prev => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                  });
                  try {
                    const current = JSON.parse(localStorage.getItem("processing_meetings") || "[]");
                    const updated = current.filter((x: string) => x !== id);
                    localStorage.setItem("processing_meetings", JSON.stringify(updated));
                  } catch (_) {}

                  // Add real-time notification
                  const msg = data.status === "done" 
                    ? `Meeting processing complete! Click to check results.` 
                    : `Meeting processing failed: ${data.message || 'unknown error'}`;
                  
                  setNotifications(prev => [
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      message: msg,
                      meetingId: id,
                      read: false
                    },
                    ...prev
                  ]);
                } else {
                  setActiveJobs(prev => ({
                    ...prev,
                    [id]: { progress: data.progress || 0, message: data.message || "Processing...", name: `Meeting ${id.substring(0, 8)}` }
                  }));
                }
              } catch (err) {
                console.error(err);
              }
            };

            ws.onerror = () => {
              ws.close();
              delete activeSockets[id];
            };
          })
          .catch(console.error);
      });
    };

    syncJobs();

    // Periodically sync/poll to catch additions from other pages
    const interval = setInterval(syncJobs, 3000);

    return () => {
      clearInterval(interval);
      Object.values(activeSockets).forEach(ws => {
        try {
          ws.close();
        } catch (_) {}
      });
    };
  }, [isAuthenticated]);

  const getLinkClass = (path: string, exact: boolean = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200 active:scale-95 ${
      isActive
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
    }`;
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">sync</span>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="antialiased bg-surface min-h-screen">
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-white/70 dark:bg-black/70 backdrop-blur-md shadow-sm flex flex-col p-4 border-r border-outline-variant/30 z-50">
        <div className="mb-8 px-2">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">
            MeetMind
          </h1>
          <p className="text-on-surface-variant font-label-md text-label-md">
            Intelligence AI
          </p>
        </div>
        <button className="primary-gradient text-white font-bold py-3 px-4 rounded-xl mb-8 flex items-center justify-center gap-2 transition-transform duration-200 active:scale-95 shadow-lg">
          <span className="material-symbols-outlined">add</span>
          New Meeting
        </button>
        <nav className="flex flex-col gap-1 flex-1">
          <Link
            href="/dashboard"
            className={getLinkClass("/dashboard", true)}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-label-md text-label-md">Dashboard</span>
          </Link>
          <Link
            href="/dashboard/meetings"
            className={getLinkClass("/dashboard/meetings", true)}
          >
            <span className="material-symbols-outlined">video_chat</span>
            <span className="font-label-md text-label-md">Meetings</span>
          </Link>
          <Link
            href="/dashboard/history"
            className={getLinkClass("/dashboard/history", true)}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="font-label-md text-label-md">History</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className={getLinkClass("/dashboard/settings", false) + " mt-auto"}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </Link>
          <button
            onClick={async () => {
              try {
                await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
                router.push("/");
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex items-center gap-3 px-4 py-3 text-error hover:text-error hover:bg-error/10 transition-all duration-200 rounded-lg w-full text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </button>
        </nav>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-surface/70 backdrop-blur-md border-b border-outline-variant/20 flex justify-between items-center h-16 px-gutter">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              onClick={() => setShowSearchModal(true)}
              readOnly
              className="w-full bg-surface-container-low border-none outline-none rounded-lg py-2 pl-10 pr-4 text-label-md cursor-pointer hover:bg-surface-container-high transition-all"
              placeholder="Ask anything across all meetings semantically..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTheme}
            className="text-on-surface-variant hover:text-primary transition-colors duration-200 p-1 rounded-full hover:bg-surface-variant/40 cursor-pointer flex items-center justify-center"
            title="Toggle theme"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === "light" ? "dark_mode" : "light_mode"}
            </span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative p-1 rounded-full hover:bg-surface-variant/40"
            >
              <span className="material-symbols-outlined">notifications</span>
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-outline-variant/30 py-3 z-50">
                <div className="px-4 pb-2 border-b border-outline-variant/30 flex justify-between items-center">
                  <span className="font-bold text-xs text-on-surface">Notifications</span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-on-surface-variant font-medium">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <Link 
                        key={notif.id}
                        href={`/dashboard/meetings/${notif.meetingId}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          setShowNotifications(false);
                        }}
                        className={`block px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                      >
                        <p className={`text-xs text-on-surface leading-normal ${!notif.read ? 'font-bold' : 'font-medium'}`}>
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-outline font-bold mt-1 block">Click to view workspace</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right">
              <p className="font-label-md text-label-md font-bold group-hover:text-primary transition-colors">
                {userName || (userEmail !== "Loading..." ? userEmail.split("@")[0] : "User")}
              </p>
            </div>
            {userImage ? (
                <img src={userImage} alt="Profile" className="w-10 h-10 rounded-full border border-outline-variant object-cover" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-64 pt-16 min-h-screen">
        <div className="max-w-[1280px] mx-auto p-margin-desktop">
          {children}
        </div>
      </main>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-16 h-16 rounded-full primary-gradient text-white custom-shadow flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50">
        <span className="material-symbols-outlined text-3xl">mic</span>
      </button>

      {/* Global Processing Jobs Progress Bar Overlay */}
      {Object.keys(activeJobs).length > 0 && (
        <div className="fixed bottom-28 right-8 z-50 max-w-sm w-80 bg-white p-5 rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
          <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary animate-spin text-sm">sync</span>
            Active Processing Jobs
          </h4>
          {Object.entries(activeJobs).map(([id, job]) => (
            <div key={id} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-on-surface">
                <span className="truncate max-w-[180px]">{job.name}</span>
                <span className="text-primary font-bold">{job.progress}%</span>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-on-surface-variant truncate font-medium">{job.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Semantic Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">search_insight</span>
                <span className="font-bold text-sm text-on-surface">MeetMind Semantic Search</span>
              </div>
              <button 
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="text-on-surface-variant hover:text-error p-1 rounded-full hover:bg-surface-variant/40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <form onSubmit={handleSemanticSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                    search
                  </span>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl py-3 pl-10 pr-4 text-label-md transition-all"
                    placeholder="Ask a question across all meetings (e.g. 'What did we decide about the budget?')"
                    type="text"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={searchLoading || !searchQuery.trim()}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-label-md hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {searchLoading ? (
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">psychology</span>
                  )}
                  Ask AI
                </button>
              </form>

              {/* Loader */}
              {searchLoading && (
                <div className="space-y-4 py-8">
                  <div className="h-6 bg-surface-variant/40 rounded animate-pulse w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-surface-variant/40 rounded animate-pulse"></div>
                    <div className="h-4 bg-surface-variant/40 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-surface-variant/40 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults && (
                <div className="space-y-5">
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 text-label-md text-on-surface leading-relaxed">
                    <h4 className="font-bold text-xs text-primary mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      AI Analysis
                    </h4>
                    <p className="whitespace-pre-wrap font-medium">{searchResults.answer}</p>
                  </div>

                  {searchResults.results && searchResults.results.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider">References & Citations</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {searchResults.results.map((res, i) => (
                          <Link 
                            key={i} 
                            href={`/dashboard/meetings/${res.meeting_id}`}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery("");
                              setSearchResults(null);
                            }}
                            className="block p-4 bg-white rounded-xl hover:bg-surface-container-low hover:border-primary transition-all border border-outline-variant/30 shadow-sm"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-xs text-primary flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">meeting_room</span>
                                {res.meeting_title}
                              </span>
                              <span className="text-[10px] text-outline font-bold">{res.meeting_date}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">{res.content}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
