"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiLogin(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#06080f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,-apple-system,sans-serif", padding:24 }}>
      {/* Background orbs */}
      <div aria-hidden style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", top:"-10%", left:"-5%", background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:"-10%", right:"-5%", background:"radial-gradient(circle,rgba(139,92,246,.09),transparent 70%)", filter:"blur(80px)" }} />
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#fff", boxShadow:"0 0 20px rgba(59,130,246,.4)" }}>MIS</div>
            <span style={{ fontSize:17, fontWeight:700, color:"#e2e8f0" }}>Meeting Intelligence</span>
          </Link>
          <p style={{ marginTop:10, fontSize:13, color:"#64748b" }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{ background:"#111827", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 24px 64px rgba(0,0,0,.4)" }}>
          {/* Top shimmer */}
          <div style={{ position:"absolute", left:"10%", right:"10%", top:0, height:1, background:"linear-gradient(90deg,transparent,rgba(59,130,246,.3),transparent)", borderRadius:1 }} />

          <h1 style={{ fontSize:22, fontWeight:800, color:"#e2e8f0", margin:"0 0 24px", letterSpacing:"-.02em" }}>Welcome back</h1>

          {error && (
            <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"11px 14px", marginBottom:20, fontSize:13, color:"#fca5a5" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:14, padding:"12px 14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="rgba(59,130,246,.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Password</label>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:14, padding:"12px 14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="rgba(59,130,246,.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{ marginTop:8, width:"100%", padding:"13px", borderRadius:12, border:"none", background: loading ? "rgba(59,130,246,.5)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", transition:"opacity .2s", boxShadow:"0 4px 20px rgba(59,130,246,.3)" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:22, fontSize:13, color:"#64748b" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color:"#60a5fa", fontWeight:600, textDecoration:"none" }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
