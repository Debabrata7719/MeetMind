"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getMeetings, API_BASE } from "@/lib/api";

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    total_meetings: 0,
    total_recording_time_sec: 0,
    ai_highlights: 0,
    questions_asked: 0,
  });

  useEffect(() => {
    // Fetch recent meetings
    getMeetings()
      .then((data) => setMeetings(data.slice(0, 3))) // Only show 3 recent
      .catch((err) => console.error("Failed to fetch meetings:", err));

    // Fetch dashboard metrics
    fetch(`${API_BASE}/dashboard/metrics`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      })
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Failed to fetch metrics:", err));
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { hours, minutes };
  };

  const { hours, minutes } = formatDuration(metrics.total_recording_time_sec);

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[24px] bg-white p-10 custom-shadow border border-surface-container flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none"></div>
        <div className="relative z-10 max-w-xl space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-sm mr-1">bolt</span>
            AI Powered Productivity
          </span>
          <h2 className="font-display-lg text-display-lg text-on-background">
            Turn meetings into actionable intelligence.
          </h2>
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            MeetMind captures your conversations and automatically extracts tasks, summaries, and key decisions so your team can focus on the work that matters.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/dashboard/meetings">
              <button className="primary-gradient text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] shadow-md">
                <span className="material-symbols-outlined">cloud_upload</span>
                Upload Meeting
              </button>
            </Link>
            <Link href="/dashboard/meetings">
              <button className="bg-white border border-outline-variant text-on-background px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 hover:bg-surface-container-low">
                <span className="material-symbols-outlined">mic</span>
                Start Recording
              </button>
            </Link>
          </div>
        </div>
        {/* Featured Stats Illustration/Placeholder */}
        <div className="relative z-10 w-full md:w-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
          <img
            className="w-full h-full object-cover"
            alt="Futuristic UI dashboard interface"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuALnUR1rLfnNbX3J8ETZ1Tsv8m1uIx56HXxeNICqEPlq7Tg5M6OsTOXE6xSvsH9SnzjWRwhP1jeueW5lXpCUNdGHj49M_i6AP_TiQ4JfhWM81j3xwzS8JJ6hkcO65nZh1evUVPpBacfKRpxl-QvwVqIWxBfomEhrMhSitWIJ-5I4d1rADzP4VUJGT_1qS8VR_JBsd2tuXR_qpGzkM4LfWZp_a8tH5CZqbCt6VzD6FthOQYxSFiwE46sMuL0EiypTIQ9Dd_5pprlGiA"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
        </div>
      </section>

      {/* Statistics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1 */}
        <div className="bg-white p-6 rounded-[24px] custom-shadow border border-surface-container flex flex-col gap-4 hover:translate-y-[-4px] transition-transform duration-200">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              video_library
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant font-label-md text-label-md">
              Total Meetings
            </p>
            <h3 className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-background">
              {metrics.total_meetings}
            </h3>
          </div>
        </div>
        {/* Stat 2 */}
        <div className="bg-white p-6 rounded-[24px] custom-shadow border border-surface-container flex flex-col gap-4 hover:translate-y-[-4px] transition-transform duration-200">
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant font-label-md text-label-md">
              Recording Time
            </p>
            <h3 className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-background">
              {hours}h <span className="text-lg font-normal text-on-surface-variant">{minutes}m</span>
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>Total across all workspaces</span>
          </div>
        </div>
        {/* Stat 3 */}
        <div className="bg-white p-6 rounded-[24px] custom-shadow border border-surface-container flex flex-col gap-4 hover:translate-y-[-4px] transition-transform duration-200">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary-container">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant font-label-md text-label-md">
              AI Highlights
            </p>
            <h3 className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-background">
              {metrics.ai_highlights}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary font-bold">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Powered by Luminous AI</span>
          </div>
        </div>
        {/* Stat 4 */}
        <div className="bg-white p-6 rounded-[24px] custom-shadow border border-surface-container flex flex-col gap-4 hover:translate-y-[-4px] transition-transform duration-200">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              quiz
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant font-label-md text-label-md">
              Questions Asked
            </p>
            <h3 className="font-display-lg-mobile text-display-lg-mobile font-bold text-on-background">
              0
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Processed via Chat AI</span>
          </div>
        </div>
      </section>

      {/* Recent Meetings Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-background">
            Recent Meetings
          </h2>
          <Link href="/dashboard/history" className="text-primary font-bold flex items-center gap-1 hover:underline">
            View all history
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {meetings.length === 0 ? (
            <p className="text-on-surface-variant col-span-full">
              No meetings found. Start by uploading a recording!
            </p>
          ) : (
            meetings.map((meeting: any) => (
              <div
                key={meeting.meeting_id}
                className="bg-white p-6 rounded-[24px] custom-shadow border border-surface-container flex flex-col gap-6 group hover:border-primary/20 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-lg bg-surface-container-low group-hover:bg-primary-container/10 transition-colors">
                    <span className="material-symbols-outlined text-primary">
                      groups
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-label-sm text-label-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    Processed
                  </span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-headline-sm text-on-background mb-1 truncate">
                    {meeting.name || "Untitled Meeting"}
                  </h4>
                  <p className="text-on-surface-variant text-label-md">
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                    +AI
                  </div>
                </div>
                <button className="w-full py-3 bg-surface-container-low hover:bg-primary hover:text-white rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2">
                  Open Transcript
                  <span className="material-symbols-outlined text-sm">
                    open_in_new
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
