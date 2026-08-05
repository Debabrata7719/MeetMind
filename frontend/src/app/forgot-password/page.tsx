"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forgotPassword, verifyOtp, resetPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "At least one number", valid: /\d/.test(password) },
    { label: "At least one special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess("OTP sent to your email address.");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      setSuccess("OTP verified successfully.");
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      await resetPassword(email, password);
      setSuccess("Password reset successfully. You can now log in.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-row overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="font-label-md">Back to Home</span>
            </Link>
            <h2 className="font-headline-md text-headline-md mb-2">
              Reset your password
            </h2>
            <p className="text-on-surface-variant">
              {step === 1 && "Enter your email and we'll send you a 4-digit OTP."}
              {step === 2 && "Enter the 4-digit OTP sent to your email."}
              {step === 3 && "Create a new strong password."}
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded bg-primary-container text-on-primary-container text-sm">
              {success}
            </div>
          )}

          {/* STEP 1: Request OTP */}
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    mail
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                    placeholder="name@example.com"
                    type="email"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-label-md text-label-md py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                  4-Digit OTP
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    password
                  </span>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200 text-center tracking-[1em] font-mono text-xl"
                    placeholder="••••"
                    type="text"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-label-md text-label-md py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep(1); setSuccess(""); setError(""); }}
                  className="text-xs text-primary hover:underline font-label-md"
                >
                  Change email address
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Reset Password */}
          {step === 3 && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    lock
                  </span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                </div>
                {password && (
                  <div className="mt-3 text-xs space-y-1.5">
                    {passwordRules.map((rule, idx) => (
                      <div key={idx} className={`flex items-center gap-2 ${rule.valid ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {rule.valid ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        {rule.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    lock_reset
                  </span>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-label-md text-label-md py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center text-sm text-on-surface-variant">
            Remember your password?{" "}
            <Link
              href="/login"
              className="text-primary font-label-md hover:underline"
            >
              Log in instead
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
