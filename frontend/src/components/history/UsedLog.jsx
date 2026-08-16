import React, { useState, useEffect } from "react";
import { fetchHistory } from "../../services/historyService";

export default function UsedLog() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchHistory().then(setEntries).catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h3>Used / Consumed Log</h3>
      {entries.length === 0 && <p>No items logged yet.</p>}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.item_name} — qty {entry.quantity} — {new Date(entry.logged_at).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
