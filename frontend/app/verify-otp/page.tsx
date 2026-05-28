"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (!email) router.replace("/forgot-password");
  }, [email, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Invalid OTP");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendMsg("");
    setError("");
    setResendLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to resend");
      setResendMsg("A new OTP has been sent to your email.");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setResendLoading(false);
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
          <p style={{ marginTop:10, fontSize:13, color:"#64748b" }}>
            OTP sent to <span style={{ color:"#60a5fa" }}>{email}</span>
          </p>
        </div>

        <div style={{ background:"#111827", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 24px 64px rgba(0,0,0,.4)" }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#e2e8f0", margin:"0 0 8px", letterSpacing:"-.02em" }}>Enter OTP</h1>
          <p style={{ fontSize:13, color:"#64748b", margin:"0 0 24px" }}>Check your email for the 4-digit code. Valid for 5 minutes.</p>

          {error && (
            <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"11px 14px", marginBottom:20, fontSize:13, color:"#fca5a5" }}>
              {error}
            </div>
          )}

          {resendMsg && (
            <div style={{ background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:10, padding:"11px 14px", marginBottom:20, fontSize:13, color:"#86efac" }}>
              {resendMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>4-Digit OTP</label>
              <input
                type="text" required maxLength={4} pattern="\d{4}"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
                style={{ width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:28, fontWeight:800, textAlign:"center", letterSpacing:"0.4em", padding:"14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="rgba(59,130,246,.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"}
              />
            </div>

            <button
              type="submit" disabled={loading || otp.length !== 4}
              style={{ marginTop:8, width:"100%", padding:"13px", borderRadius:12, border:"none", background: (loading || otp.length !== 4) ? "rgba(59,130,246,.5)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:700, cursor: (loading || otp.length !== 4) ? "not-allowed" : "pointer", fontFamily:"inherit", boxShadow:"0 4px 20px rgba(59,130,246,.3)" }}
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:"#64748b" }}>
            Didn&apos;t receive it?{" "}
            <button
              onClick={handleResend} disabled={resendLoading}
              style={{ color:"#60a5fa", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"inherit", padding:0 }}
            >
              {resendLoading ? "Sending…" : "Resend OTP"}
            </button>
          </p>

          <p style={{ textAlign:"center", marginTop:8, fontSize:13, color:"#64748b" }}>
            <Link href="/login" style={{ color:"#94a3b8", textDecoration:"none" }}>← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"#06080f" }} />}>
      <VerifyOTPContent />
    </Suspense>
  );
}
