export const API_BASE = "http://localhost:8000";

export async function getMeetings() {
  const res = await fetch(`${API_BASE}/meetings`, {
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch meetings");
  }
  return res.json();
}
