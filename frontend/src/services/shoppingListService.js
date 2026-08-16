import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function authHeader() {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function fetchShoppingList(listType) {
  const query = listType ? `?listType=${encodeURIComponent(listType)}` : "";
  const res = await fetch(`${API_BASE}/api/shopping-list${query}`, { headers: await authHeader() });
  if (!res.ok) throw new Error("Failed to fetch shopping list");
  return res.json();
}

export async function addShoppingListRow({ listType, name, quantity = 1, source = "custom" }) {
  const res = await fetch(`${API_BASE}/api/shopping-list`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ listType, name, quantity, source }),
  });
  if (!res.ok) throw new Error("Failed to add shopping list row");
  return res.json();
}

export async function generateFromHistory(listType = "ration") {
  const res = await fetch(`${API_BASE}/api/shopping-list/generate-from-history`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ listType }),
  });
  if (!res.ok) throw new Error("Failed to generate list from history");
  return res.json();
}

export async function updateShoppingListRow(id, { isChecked, quantity }) {
  const res = await fetch(`${API_BASE}/api/shopping-list/${id}`, {
    method: "PATCH",
    headers: await authHeader(),
    body: JSON.stringify({ isChecked, quantity }),
  });
  if (!res.ok) throw new Error("Failed to update shopping list row");
  return res.json();
}
