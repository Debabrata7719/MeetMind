"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "At least one number", valid: /\d/.test(password) },
    { label: "At least one special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await registerUser(name, email, password, confirmPassword);
      // Registration successful, redirect to login
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-row overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[45%] bg-surface-container-low p-12 border-r border-outline-variant relative">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <span
            className="material-symbols-outlined text-primary text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
            MeetMind
          </h1>
        </Link>
        <div className="flex-grow flex items-center justify-center">
          <div className="w-full max-w-md aspect-[4/5] bg-white rounded-[24px] shadow-lg overflow-hidden border border-outline-variant flex items-center justify-center text-on-surface-variant">
            <img
              alt="App Showcase"
              className="w-full h-full object-cover"
              src="/screen.png"
            />
          </div>
        </div>
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              check_circle
            </span>
            <span className="font-label-md">Real-time transcription</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              check_circle
            </span>
            <span className="font-label-md">AI-powered meeting insights</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              check_circle
            </span>
            <span className="font-label-md">Interactive team workspace</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-headline-md text-headline-md mb-2">
              Create an account
            </h2>
            <p className="text-on-surface-variant">
              Get started with your intelligence dashboard.
            </p>
          </div>
          {error && (
            <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <a
              href={`${API_BASE}/auth/google/login`}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </a>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="flex-shrink mx-4 text-on-surface-variant text-xs uppercase tracking-widest">
                or
              </span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    person
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                    placeholder="John Doe"
                    type="text"
                    required
                  />
                </div>
              </div>
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
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    lock
                  </span>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
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
                <div className="flex justify-between mb-1.5">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant">
                    Confirm Password
                  </label>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    lock
                  </span>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                    placeholder="••••••••"
                    type="password"
                    required
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-label-md text-label-md py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
            <p className="text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-label-md hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
          <footer className="mt-12 pt-8 border-t border-outline-variant flex justify-center gap-6 opacity-40">
            <p className="text-[10px] uppercase tracking-widest">
              © 2024 MeetMind Intelligence. All rights reserved.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
