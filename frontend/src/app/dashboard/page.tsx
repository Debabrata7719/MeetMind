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
            <span>Powered by MeetMind AI</span>
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
              {metrics.questions_asked}
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
        <div className="relative border-l-2 border-outline-variant/30 ml-4 pl-8 space-y-8 py-4">
          {meetings.length === 0 ? (
            <p className="text-on-surface-variant">
              No meetings found. Start by uploading a recording!
            </p>
          ) : (
            meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="relative bg-white p-6 rounded-[24px] shadow-sm border border-outline-variant/20 hover:border-primary/40 hover:shadow-lg transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface border-4 border-primary flex items-center justify-center z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>

                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-on-background group-hover:text-primary transition-colors">
                      {meeting.name || "Untitled Meeting"}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        {meeting.created_at ? new Date(meeting.created_at).toLocaleDateString() : ""}
                      </span>
                      {meeting.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {Math.floor(meeting.duration / 3600)}h {Math.floor((meeting.duration % 3600) / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Processed
                  </span>
                  
                  <Link href={`/dashboard/meetings/${meeting.id}`}>
                    <button className="px-5 py-3 bg-surface-container-low hover:bg-primary hover:text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer">
                      Open Workspace
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
