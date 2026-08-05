"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateName, updatePassword } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();

  // Profile Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("Loading...");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  // Password Form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  const passwordRules = [
    { label: "At least 8 characters", valid: newPassword.length >= 8 },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(newPassword) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(newPassword) },
    { label: "At least one number", valid: /\d/.test(newPassword) },
    { label: "At least one special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  useEffect(() => {
    // Fetch initial user data
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setEmail(data.email);
          if (data.name) setName(data.name);
        } else {
          router.push("/login");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");
    setNameLoading(true);
    try {
      await updateName(name);
      setNameSuccess("Profile updated successfully. Please refresh the page to see changes in the header.");
    } catch (err: any) {
      setNameError(err.message || "Failed to update profile.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
    try {
      await updatePassword(oldPassword, newPassword, confirmPassword);
      setPwdSuccess("Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="font-headline-md text-headline-md font-bold mb-2">Settings</h1>
        <p className="text-on-surface-variant font-label-md">Manage your profile and security preferences.</p>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h2 className="font-title-lg text-title-lg font-bold mb-6 flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined">person</span>
          Profile Information
        </h2>
        
        {nameError && <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">{nameError}</div>}
        {nameSuccess && <div className="mb-4 p-3 rounded bg-primary-container text-on-primary-container text-sm">{nameSuccess}</div>}

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">Email address (Read-only)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">mail</span>
              <input
                value={email}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-surface-variant border border-outline-variant rounded-xl text-on-surface-variant cursor-not-allowed"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">person</span>
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
          <div className="pt-2">
            <button
              type="submit"
              disabled={nameLoading}
              className="bg-primary text-white font-label-md py-2.5 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {nameLoading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h2 className="font-title-lg text-title-lg font-bold mb-6 flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined">security</span>
          Security
        </h2>

        {pwdError && <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">{pwdError}</div>}
        {pwdSuccess && <div className="mb-4 p-3 rounded bg-primary-container text-on-primary-container text-sm">{pwdSuccess}</div>}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">Current Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">lock</span>
              <input
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                placeholder="••••••••"
                type="password"
                required
              />
            </div>
          </div>
          <div className="pt-4 border-t border-outline-variant">
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">New Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">lock_reset</span>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all duration-200"
                placeholder="••••••••"
                type="password"
                required
              />
            </div>
            {newPassword && (
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
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">Confirm New Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">password</span>
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
          <div className="pt-2">
            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-primary text-white font-label-md py-2.5 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {pwdLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
