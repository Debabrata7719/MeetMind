"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

export function MISHeroAnimated() {
  const pillars = [92,84,78,70,62,54,46,34,18,34,46,54,62,70,78,84,92];
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIsMounted(true), 100); return () => clearTimeout(t); }, []);

  const navItems = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "API Docs", href: "http://127.0.0.1:8000/docs" },
  ];

  return (
    <>
      <style>{`
        @keyframes mis-up { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mis-pulse { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        .mis-up { animation: mis-up 0.75s ease-out forwards; opacity:0; }
      `}</style>

      <section style={{ minHeight:"100vh", background:"#000", color:"#fff", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>

        {/* ── Background ── */}
        <div aria-hidden style={{ position:"absolute", inset:0, zIndex:0, background:[
          "radial-gradient(80% 55% at 50% 48%, rgba(59,130,246,.38) 0%, rgba(139,92,246,.28) 28%, rgba(20,20,50,.45) 55%, rgba(0,0,0,.97) 85%)",
          "radial-gradient(65% 45% at 18% 8%, rgba(96,165,250,.45) 0%, rgba(59,130,246,.25) 35%, transparent 65%)",
          "radial-gradient(55% 40% at 82% 12%, rgba(139,92,246,.38) 0%, transparent 55%)",
        ].join(",") }} />
        <div aria-hidden style={{ position:"absolute", inset:0, zIndex:1, opacity:.12, backgroundImage:[
          "repeating-linear-gradient(90deg,rgba(255,255,255,.12) 0 1px,transparent 1px 80px)",
          "repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 80px)",
        ].join(",") }} />

        {/* ── Nav ── */}
        <header style={{ position:"relative", zIndex:20 }}>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, boxShadow:"0 0 20px rgba(59,130,246,.4)" }}>MIS</div>
              <span style={{ fontSize:17, fontWeight:700 }}>Meeting Intelligence</span>
            </div>
            <nav style={{ display:"flex", gap:28, fontSize:14, color:"rgba(255,255,255,.72)" }}>
              {navItems.map(n => <a key={n.label} href={n.href} style={{ color:"inherit", textDecoration:"none" }}>{n.label}</a>)}
            </nav>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <Link href="/login" style={{ fontSize:14, color:"rgba(255,255,255,.65)", textDecoration:"none" }}>Sign in</Link>
              <Link href="/register" style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:700, padding:"10px 22px", borderRadius:999, textDecoration:"none", boxShadow:"0 4px 20px rgba(59,130,246,.35)" }}>Get Started</Link>
            </div>
          </div>
        </header>

        {/* ── Hero Content ── */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px 140px", position:"relative", zIndex:10, textAlign:"center" }}>
          <div style={{ maxWidth:780, width:"100%" }}>

            {/* Badge */}
            <div className={isMounted ? "mis-up" : ""} style={{ animationDelay:"0ms", display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.13)", borderRadius:999, padding:"6px 16px", fontSize:11, textTransform:"uppercase", letterSpacing:".12em", color:"rgba(255,255,255,.6)", backdropFilter:"blur(8px)", marginBottom:28 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#60a5fa", flexShrink:0 }} />
              AI-Powered
            </div>

            {/* Headline */}
            <h1 className={isMounted ? "mis-up" : ""} style={{ animationDelay:"150ms", fontSize:"clamp(2.6rem,6vw,4.8rem)", fontWeight:900, lineHeight:1.08, letterSpacing:"-.035em", margin:"0 0 24px", color:"#fff" }}>
              Turn meetings into{" "}
              <span style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                actionable intelligence
              </span>
            </h1>

            {/* Sub-copy */}
            <p className={isMounted ? "mis-up" : ""} style={{ animationDelay:"270ms", fontSize:18, color:"rgba(255,255,255,.58)", lineHeight:1.72, maxWidth:600, margin:"0 auto 38px" }}>
              Upload or record any meeting. Get instant AI transcription, bullet-point highlights, and a chat interface that answers questions grounded only in what was said.
            </p>

            {/* CTAs */}
            <div className={isMounted ? "mis-up" : ""} style={{ animationDelay:"380ms", display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <Link href="/login" style={{ background:"#fff", color:"#000", fontWeight:700, fontSize:15, padding:"14px 30px", borderRadius:999, textDecoration:"none", boxShadow:"0 8px 28px rgba(0,0,0,.35)", display:"inline-flex", alignItems:"center", gap:6 }}>
                Sign In →
              </Link>
              <a href="#features" style={{ color:"rgba(255,255,255,.82)", fontWeight:600, fontSize:15, padding:"14px 30px", borderRadius:999, textDecoration:"none", border:"1px solid rgba(255,255,255,.22)", backdropFilter:"blur(8px)", display:"inline-flex", alignItems:"center" }}>
                See Features
              </a>
            </div>
          </div>
        </div>

        {/* ── Tech Stack ── */}
        <div style={{ position:"relative", zIndex:10, textAlign:"center", padding:"0 24px 150px" }}>
          <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:".2em", color:"rgba(255,255,255,.22)", marginBottom:14 }}>Built with</p>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"8px 24px", opacity:.45 }}>
            {["Whisper AI","Groq LLM","ChromaDB","LangChain","FastAPI","Next.js","Python","React"].map(t =>
              <span key={t} style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.7)" }}>{t}</span>
            )}
          </div>
        </div>

        {/* ── Center glow ── */}
        <div style={{ position:"absolute", bottom:130, left:"50%", transform:"translateX(-50%)", width:90, height:140, background:"linear-gradient(to bottom,rgba(96,165,250,.65),rgba(167,139,250,.4),transparent)", borderRadius:8, zIndex:5, animation:"mis-pulse 6s ease-in-out infinite" }} />

        {/* ── Pillars ── */}
        <div style={{ position:"absolute", inset:"auto 0 0 0", height:"48vh", zIndex:5 }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#000 0%,rgba(0,0,0,.88) 35%,transparent 100%)" }} />
          <div style={{ position:"absolute", inset:0, bottom:0, display:"flex", alignItems:"flex-end", gap:2, padding:"0 2px" }}>
            {pillars.map((h,i) => (
              <div key={i} style={{ flex:1, background:"#000", height:isMounted?`${h}%`:"0%", transition:"height 1000ms ease-in-out", transitionDelay:`${Math.abs(i-Math.floor(pillars.length/2))*60}ms` }} />
            ))}
          </div>
        </div>

      </section>
    </>
  );
}
