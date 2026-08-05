"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMeetings } from "@/lib/api";

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    getMeetings()
      .then(setMeetings)
      .catch((err) => console.error("Failed to fetch meetings:", err));
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-2">
            History Archive
          </h1>
          <p className="text-on-surface-variant max-w-2xl font-body-lg">
            Access and review all previous intelligence reports, transcripts, and
            action items from your meeting history.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              filter_list
            </span>
            Filter
          </button>
          <button className="px-4 py-2 bg-surface border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">sort</span>
            Latest First
          </button>
        </div>
      </div>

      {/* Quick Stats / Bento Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="p-6 bg-white rounded-[24px] shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <span className="text-on-surface-variant font-label-md text-label-md">
            Total Meetings
          </span>
          <div className="mt-4">
            <span className="font-headline-md text-headline-md text-primary">
              {meetings.length}
            </span>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[24px] shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <span className="text-on-surface-variant font-label-md text-label-md">
            Action Items Completed
          </span>
          <div className="mt-4">
            <span className="font-headline-md text-headline-md text-primary">
              0%
            </span>
            <span className="text-label-sm text-on-surface-variant ml-2">
              0 total
            </span>
          </div>
        </div>
        <div className="md:col-span-2 p-6 bg-primary-container text-on-primary-container rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="font-headline-sm text-headline-sm mb-1">
              AI Insights Summary
            </h3>
            <p className="opacity-80 font-label-md text-label-md max-w-sm">
              No insights generated yet. Process a meeting to see highlights here.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-on-primary rounded-full blur-3xl opacity-20"></div>
        </div>
      </div>

      {/* Grid of Archive Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
          <p className="text-on-surface-variant col-span-full py-10 text-center bg-white rounded-[24px] border border-outline-variant/10">
            No meetings found. Start by uploading a recording!
          </p>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
              className="bg-white rounded-[24px] shadow-sm hover:shadow-md border border-outline-variant/10 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="h-40 bg-surface-container relative">
                <img
                  className="w-full h-full object-cover opacity-80"
                  alt="Meeting Cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwGX4SHz0_jQbtoRHDIBjZAreQ5GB0lBEB9t_qCHx7I5trAbBI_FukjyMj2dlh6mqY_8wsIEvEouN9Ycp4kTze8TxlDILbUehU4qcQ33cBcKPlWJGWOsL5To7TSliAyENlNVGV3TzVKA7jWCbCifjInmnDq-ZG_CYUqI3crdaAtjbsDcbLUTlIM5MBOoosKxO2UjAoQrfEdDVxj-SpU9uXRHRte3uOT2-O6v-OmXFttWu7J7n8WLoxiSoDNwSlF-P_rLnk74OYoeo"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-[14px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    timer
                  </span>
                  <span className="text-label-sm font-label-sm text-on-surface">
                    45m
                  </span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Processed
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  {meeting.name || "Untitled Meeting"}
                </h4>
                <p className="text-on-surface-variant text-label-md font-label-md mb-4">
                  {new Date(meeting.created_at).toLocaleDateString()}
                </p>
                <div className="mt-auto pt-4 border-t border-outline-variant/20 flex justify-between items-center">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full border-2 border-white bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold">
                      +AI
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
                    more_vert
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-12 flex justify-center">
        <nav className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary font-bold">
            1
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
