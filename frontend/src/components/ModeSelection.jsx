import React from "react";

export default function ModeSelection({ onSelectMode }) {
  return (
    <div style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>
      <h1>ExpireEase</h1>
      <p>Select tracking operational mode:</p>
      <div>
        <button onClick={() => onSelectMode("household")} style={{ padding: "12px 24px", margin: "10px" }}>
          Household Mode
        </button>
        <button onClick={() => onSelectMode("commercial")} style={{ padding: "12px 24px", margin: "10px" }}>
          Commercial Mode (FEFO)
        </button>
      </div>
    </div>
  );
}
