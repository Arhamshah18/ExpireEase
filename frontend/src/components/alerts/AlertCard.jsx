import React from "react";

const BAND_LABELS = {
  green: "Fresh",
  yellow: "Use Soon",
  orange: "Use Very Soon",
  red: "Urgent",
  blinking_red: "Critical",
  expired: "Expired",
};

export default function AlertCard({ item, band, onDismiss }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <strong>{item.name}</strong>
        <div style={{ fontSize: "0.85em", color: "#666" }}>
          {BAND_LABELS[band] || band} — Exp: {item.exp_date}
        </div>
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(item.id)}>Dismiss</button>
      )}
    </div>
  );
}
