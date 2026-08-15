// src/components/ModeSelection.jsx
import React from 'react';

export default function ModeSelection({ onSelectMode }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>ExpireEase</h1>
      <p>Select your operational mode:</p>
      <button onClick={() => onSelectMode('household')} style={{ margin: '10px', padding: '10px 20px' }}>
        Household Mode
      </button>
      <button onClick={() => onSelectMode('commercial')} style={{ margin: '10px', padding: '10px 20px' }}>
        Commercial Mode
      </button>
    </div>
  );
}
