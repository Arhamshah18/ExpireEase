import React, { useState, useEffect } from "react";
import { fetchWasteLog } from "../../services/historyService";

export default function WasteLog() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchWasteLog().then(setEntries).catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h3>Waste Log</h3>
      {entries.length === 0 && <p>No wasted items logged yet.</p>}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.item_name} — qty {entry.quantity} — reason: {entry.reason} —{" "}
            {new Date(entry.logged_at).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
