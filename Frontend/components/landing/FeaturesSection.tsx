"use client";
import Link from "next/link";

const features = [
  { icon:"🎙️", title:"Upload or Record",   desc:"Drop in an MP4, MP3, or WAV — or hit Record to capture live mic audio. The full pipeline starts automatically.", badge:"Multi-format",  accent:"#3b82f6" },
  { icon:"📝", title:"AI Transcription",    desc:"OpenAI Whisper (small) converts speech to text with high accuracy — multilingual, runs locally, no API cost.",     badge:"Whisper AI",    accent:"#8b5cf6" },
  { icon:"✨", title:"Smart Highlights",    desc:"Groq LLM distills key decisions, action items, and conclusions into bullet-point summaries. Export as PDF, TXT, or DOCX.", badge:"Groq LLM",     accent:"#22d3ee" },
  { icon:"💬", title:"Meeting Chat",        desc:"Ask anything about your meeting. RAG-powered retrieval ensures answers are grounded in what was actually said — no hallucination.", badge:"RAG + ChromaDB", accent:"#10b981" },
];

const steps = [
  { n:"01", label:"Upload or Record",     desc:"Provide your meeting file or record live audio" },
  { n:"02", label:"FFmpeg → WAV",         desc:"Audio extracted to 16 kHz mono for Whisper" },
  { n:"03", label:"Whisper Transcription",desc:"Speech converted to accurate text segments" },
  { n:"04", label:"Chunk & Embed",        desc:"Text split and stored in a per-meeting ChromaDB vector store" },
  { n:"05", label:"Highlights & Chat",    desc:"Groq LLM answers using only your meeting context" },
];

export function FeaturesSection() {
  return (
    <>
      {/* ── Features ── */}
      <section id="features" style={{ background:"linear-gradient(to bottom,#000,#06080f)", padding:"96px 24px" }}>
        <div style={{ maxWidth:1152, margin:"0 auto" }}>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:999, padding:"5px 16px", fontSize:11, textTransform:"uppercase", letterSpacing:".14em", color:"rgba(255,255,255,.45)" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#60a5fa" }} /> Features
            </span>
            <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:900, color:"#fff", margin:"20px 0 14px", letterSpacing:"-.025em" }}>
              Everything you need,{" "}
              <span style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                nothing you don&apos;t
              </span>
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,.45)", maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
              A focused pipeline — upload to insight in one click, no configuration required.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20 }}>
            {features.map(f => (
              <div key={f.title} style={{ background:`linear-gradient(160deg,${f.accent}18,${f.accent}06)`, border:`1px solid ${f.accent}28`, borderRadius:20, padding:"28px 24px", position:"relative", transition:"transform .3s, box-shadow .3s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow=`0 16px 48px ${f.accent}22`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow="none"; }}>
                <div style={{ position:"absolute", inset:"0 25% auto 25%", height:1, background:`linear-gradient(90deg,transparent,${f.accent}30,transparent)` }} />
                <span style={{ fontSize:32 }}>{f.icon}</span>
                <span style={{ display:"inline-block", marginTop:12, background:`${f.accent}18`, color:f.accent, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", padding:"3px 10px", borderRadius:999 }}>{f.badge}</span>
                <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", margin:"12px 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize:13.5, color:"rgba(255,255,255,.5)", lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ background:"#06080f", padding:"96px 24px" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:999, padding:"5px 16px", fontSize:11, textTransform:"uppercase", letterSpacing:".14em", color:"rgba(255,255,255,.45)" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#a78bfa" }} /> Pipeline
            </span>
            <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:900, color:"#fff", margin:"20px 0 0", letterSpacing:"-.025em" }}>How it works</h2>
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:39, top:16, bottom:16, width:1, background:"linear-gradient(to bottom,rgba(59,130,246,.4),rgba(139,92,246,.3),transparent)" }} />
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              {steps.map((s,i) => (
                <div key={s.n} style={{ display:"flex", alignItems:"center", gap:20 }}>
                  <div style={{ width:78, height:78, flexShrink:0, borderRadius:18, border:"1px solid rgba(255,255,255,.1)", background:"linear-gradient(135deg,rgba(59,130,246,.18),rgba(139,92,246,.12))", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
                    <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"rgba(255,255,255,.3)" }}>Step</span>
                    <span style={{ fontSize:22, fontWeight:900, color:"#fff" }}>{s.n}</span>
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 4px" }}>{s.label}</p>
                    <p style={{ fontSize:13.5, color:"rgba(255,255,255,.45)", margin:0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background:"#0c1019", padding:"96px 24px", position:"relative", overflow:"hidden" }}>
        <div aria-hidden style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 55% at 50% 50%,rgba(59,130,246,.1) 0%,transparent 70%)" }} />
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center", position:"relative", zIndex:1 }}>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:900, color:"#fff", margin:"0 0 20px", letterSpacing:"-.025em" }}>
            Ready to stop forgetting{" "}
            <span style={{ background:"linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              what was decided?
            </span>
          </h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,.48)", lineHeight:1.75, maxWidth:520, margin:"0 auto 36px" }}>
            Upload your first meeting and have highlights in under a minute. Free, local, and private — your data never leaves your machine.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/register" style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontWeight:700, fontSize:15, padding:"14px 32px", borderRadius:999, textDecoration:"none", boxShadow:"0 8px 28px rgba(59,130,246,.3)", display:"inline-flex", alignItems:"center", gap:6 }}>
              Get Started →
            </Link>
            <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color:"rgba(255,255,255,.65)", fontWeight:600, fontSize:15, padding:"14px 32px", borderRadius:999, textDecoration:"none", border:"1px solid rgba(255,255,255,.18)", display:"inline-flex", alignItems:"center" }}>
              View API Docs
            </a>
          </div>
        </div>
        <div style={{ maxWidth:1152, margin:"64px auto 0", borderTop:"1px solid rgba(255,255,255,.06)", paddingTop:24, textAlign:"center", fontSize:12, color:"rgba(255,255,255,.18)" }}>
          Meeting Intelligence System — Whisper · Groq · ChromaDB · LangChain · FastAPI · Next.js
        </div>
      </section>
    </>
  );
}
