import React, { useState, useEffect } from "react";
import { calculateRemainingPercentage, sortByEarliestExpiry } from "../utils/shelfLife";
import { logUsedItem, logWastedItem } from "../services/historyService";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function HouseholdDashboard({ onBack, authHeader }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const res = await fetch(`${API_BASE}/api/items?status=active`, { headers: await authHeader() });
    const data = await res.json();
    setItems(sortByEarliestExpiry(data));
  };

  const handleUsed = async (item) => {
    await logUsedItem(item.id);
    loadInventory();
  };

  const handleWasted = async (item) => {
    await logWastedItem(item.id, 1, "manual_discard");
    loadInventory();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <button onClick={onBack}>← Change Mode</button>
      <h2>Household Pantry</h2>

      <h3>Active Items (FEFO Sorted)</h3>
      {items.map((item) => {
        const pct = calculateRemainingPercentage(item.mfg_date, item.exp_date);
        return (
          <div key={item.id} style={{ border: "1px solid #ddd", padding: "12px", marginBottom: "10px", borderRadius: "6px" }}>
            <strong>{item.name}</strong> — Exp: {item.exp_date} ({pct}% remaining)
            <div style={{ marginTop: "8px" }}>
              <button onClick={() => handleUsed(item)} style={{ marginRight: "6px" }}>Mark Used</button>
              <button onClick={() => handleWasted(item)}>Mark Wasted</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
