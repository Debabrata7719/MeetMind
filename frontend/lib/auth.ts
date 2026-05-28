/**
 * frontend/lib/auth.ts
 * Auth API helpers — register, login, logout, getMe
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


export interface AuthUser { id: number; email: string }

export async function apiRegister(email: string, password: string, confirm_password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, confirm_password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",   // ← needed to receive & store the httpOnly cookie
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (res.status === 429) throw { detail: "Too many requests! Please wait a moment." };
  if (!res.ok) throw data;
  return data;
}

export async function apiLogout() {
  await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
}

export async function apiMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
