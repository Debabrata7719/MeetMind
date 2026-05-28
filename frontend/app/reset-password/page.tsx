"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) router.replace("/forgot-password");
  }, [email, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string"
          ? data.detail
          : data.detail?.rules?.join(", ") ?? "Something went wrong";
        throw new Error(msg);
      }
      // Success — redirect to login
      router.push("/login?reset=1");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#06080f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,-apple-system,sans-serif", padding:24 }}>
      <div aria-hidden style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", top:"-10%", left:"-5%", background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:"-10%", right:"-5%", background:"radial-gradient(circle,rgba(139,92,246,.09),transparent 70%)", filter:"blur(80px)" }} />
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#fff", boxShadow:"0 0 20px rgba(59,130,246,.4)" }}>MIS</div>
            <span style={{ fontSize:17, fontWeight:700, color:"#e2e8f0" }}>Meet Mind</span>
          </Link>
          <p style={{ marginTop:10, fontSize:13, color:"#64748b" }}>Create a strong new password</p>
        </div>

        <div style={{ background:"#111827", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 24px 64px rgba(0,0,0,.4)" }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#e2e8f0", margin:"0 0 24px", letterSpacing:"-.02em" }}>Reset Password</h1>

          {error && (
            <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"11px 14px", marginBottom:20, fontSize:13, color:"#fca5a5" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>New Password</label>
              <input
                type="password" required autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:14, padding:"12px 14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="rgba(59,130,246,.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Confirm Password</label>
              <input
                type="password" required autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={{ width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:14, padding:"12px 14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="rgba(59,130,246,.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{ marginTop:8, width:"100%", padding:"13px", borderRadius:12, border:"none", background: loading ? "rgba(59,130,246,.5)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", boxShadow:"0 4px 20px rgba(59,130,246,.3)" }}
            >
              {loading ? "Saving…" : "Reset Password"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:22, fontSize:13, color:"#64748b" }}>
            <Link href="/login" style={{ color:"#94a3b8", textDecoration:"none" }}>← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"#06080f" }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
