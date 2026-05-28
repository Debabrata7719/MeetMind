"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/auth";

const RULES = [
  { re: /.{8,}/,                    label: "At least 8 characters" },
  { re: /[A-Z]/,                    label: "One uppercase letter" },
  { re: /[a-z]/,                    label: "One lowercase letter" },
  { re: /\d/,                       label: "One number (0-9)" },
  { re: /[!@#$%^&*(),.?":{}|<>]/, label: "One special character" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);

  const ruleStatus = RULES.map(r => ({ ...r, ok: r.re.test(pass) }));
  const passMatch  = pass === confirm && confirm.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!passMatch) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await apiRegister(email, pass, confirm);
      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      const e = err as { detail?: string | { rules?: string[] } };
      if (typeof e?.detail === "object" && e.detail?.rules) {
        setError(e.detail.rules.join(" · "));
      } else if (typeof e?.detail === "string") {
        setError(e.detail);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width:"100%", background:"#0c1019", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, color:"#e2e8f0", fontSize:14, padding:"12px 14px", outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const, transition:"border-color .2s" };

  return (
    <div style={{ minHeight:"100vh", background:"#06080f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,-apple-system,sans-serif", padding:24 }}>
      <div aria-hidden style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", top:"-10%", left:"-5%", background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:"-10%", right:"-5%", background:"radial-gradient(circle,rgba(139,92,246,.09),transparent 70%)", filter:"blur(80px)" }} />
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:440 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#fff", boxShadow:"0 0 20px rgba(59,130,246,.4)" }}>MIS</div>
            <span style={{ fontSize:17, fontWeight:700, color:"#e2e8f0" }}>Meeting Intelligence</span>
          </Link>
          <p style={{ marginTop:10, fontSize:13, color:"#64748b" }}>Create your free account</p>
        </div>

        {/* Card */}
        <div style={{ background:"#111827", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"32px 32px 28px", boxShadow:"0 24px 64px rgba(0,0,0,.4)", position:"relative" }}>
          <div style={{ position:"absolute", left:"10%", right:"10%", top:0, height:1, background:"linear-gradient(90deg,transparent,rgba(139,92,246,.3),transparent)" }} />

          <h1 style={{ fontSize:22, fontWeight:800, color:"#e2e8f0", margin:"0 0 24px", letterSpacing:"-.02em" }}>Create account</h1>

          {error && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"11px 14px", marginBottom:18, fontSize:13, color:"#fca5a5" }}>{error}</div>}
          {success && <div style={{ background:"rgba(16,185,129,.1)", border:"1px solid rgba(16,185,129,.25)", borderRadius:10, padding:"11px 14px", marginBottom:18, fontSize:13, color:"#6ee7b7" }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:15 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Email</label>
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,.45)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"} />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Password</label>
              <input type="password" required value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={inputStyle}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,.45)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,.08)"} />

              {/* Live password rules */}
              {pass.length > 0 && (
                <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                  {ruleStatus.map(r => (
                    <div key={r.label} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color: r.ok ? "#6ee7b7" : "#94a3b8" }}>
                      <span style={{ fontSize:13 }}>{r.ok ? "✅" : "❌"}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:7, textTransform:"uppercase", letterSpacing:".08em" }}>Confirm Password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                style={{ ...inputStyle, borderColor: confirm.length > 0 ? (passMatch ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.4)") : "rgba(255,255,255,.08)" }}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,.45)"}
                onBlur={e => e.target.style.borderColor= confirm.length > 0 ? (passMatch ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.35)") : "rgba(255,255,255,.08)"} />
              {confirm.length > 0 && (
                <p style={{ fontSize:12, marginTop:6, color: passMatch ? "#6ee7b7" : "#fca5a5" }}>
                  {passMatch ? "✅ Passwords match" : "❌ Passwords do not match"}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop:6, width:"100%", padding:"13px", borderRadius:12, border:"none", background: loading ? "rgba(139,92,246,.5)" : "linear-gradient(135deg,#8b5cf6,#3b82f6)", color:"#fff", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", boxShadow:"0 4px 20px rgba(139,92,246,.3)" }}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:22, fontSize:13, color:"#64748b" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color:"#60a5fa", fontWeight:600, textDecoration:"none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
