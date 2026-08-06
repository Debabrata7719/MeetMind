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

  useEffect(() => {
    // In a real app, you would fetch user session info from /auth/me
    // For now we just mock or fetch if connected
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
        } else {
          router.push("/login");
        }
      } catch (e) {
        console.error(e);
        // Fallback for missing backend or dev mode without backend
        setUserEmail("user@example.com");
      }
    };
    fetchUser();
  }, [router]);

  const getLinkClass = (path: string, exact: boolean = false) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    return `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200 active:scale-95 ${
      isActive
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
    }`;
  };

  return (
    <div className="antialiased bg-surface min-h-screen">
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low shadow-sm flex flex-col p-4 border-r border-outline-variant z-50">
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
      <header className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center h-16 px-gutter">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none outline-none rounded-lg py-2 pl-10 pr-4 text-label-md focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search meetings, transcripts, or insights..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
          </button>
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
    </div>
  );
}
