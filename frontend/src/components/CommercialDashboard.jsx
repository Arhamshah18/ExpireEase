import React, { useState, useEffect } from "react";
import { calculateRemainingPercentage, sortByEarliestExpiry, getAlertBand } from "../utils/shelfLife";
import { logUsedItem, logWastedItem } from "../services/historyService";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const BAND_COLORS = {
  green: "#2e7d32",
  yellow: "#f9a825",
  orange: "#ef6c00",
  red: "#c62828",
  blinking_red: "#b71c1c",
  expired: "#616161",
};

export default function CommercialDashboard({ onBack, authHeader }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const res = await fetch(`${API_BASE}/api/items?status=active`, { headers: await authHeader() });
    const data = await res.json();
    // Commercial mode is strictly FEFO ordered for stock rotation.
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
    <div style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <button onClick={onBack}>← Change Mode</button>
      <h2>Commercial Inventory (FEFO)</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #333" }}>
            <th>Item</th>
            <th>Exp Date</th>
            <th>% Remaining</th>
            <th>Band</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const pct = calculateRemainingPercentage(item.mfg_date, item.exp_date);
            const band = getAlertBand(pct);
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td>{item.name}</td>
                <td>{item.exp_date}</td>
                <td>{pct}%</td>
                <td style={{ color: BAND_COLORS[band], fontWeight: "bold" }}>{band}</td>
                <td>
                  <button onClick={() => handleUsed(item)} style={{ marginRight: "6px" }}>Used</button>
                  <button onClick={() => handleWasted(item)}>Wasted</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
