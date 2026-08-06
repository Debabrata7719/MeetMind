export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

export async function registerUser(name: string, email: string, password: string, confirm_password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password, confirm_password }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.rules) throw new Error(data.rules.join(", "));
    if (typeof data.detail === "string") throw new Error(data.detail);
    if (data.detail && data.detail.length > 0) throw new Error(data.detail[0].msg || "Registration failed");
    throw new Error("Registration failed");
  }
  return data;
}

export async function updateName(name: string) {
  const res = await fetch(`${API_BASE}/auth/me/name`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update name");
  return data;
}

export async function updatePassword(old_password: string, new_password: string, confirm_password: string) {
  const res = await fetch(`${API_BASE}/auth/me/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ old_password, new_password, confirm_password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to change password");
  return data;
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to request OTP");
  return data;
}

export async function verifyOtp(email: string, otp: string) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to verify OTP");
  return data;
}

export async function resetPassword(email: string, new_password: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to reset password");
  return data;
}
