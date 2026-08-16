import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function authHeader() {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function logUsedItem(itemId, quantity = 1) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ itemId, quantity }),
  });
  if (!res.ok) throw new Error("Failed to log used item");
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/history`, { headers: await authHeader() });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function logWastedItem(itemId, quantity = 1, reason = "expired") {
  const res = await fetch(`${API_BASE}/api/waste-log`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ itemId, quantity, reason }),
  });
  if (!res.ok) throw new Error("Failed to log wasted item");
  return res.json();
}

export async function fetchWasteLog() {
  const res = await fetch(`${API_BASE}/api/waste-log`, { headers: await authHeader() });
  if (!res.ok) throw new Error("Failed to fetch waste log");
  return res.json();
}
