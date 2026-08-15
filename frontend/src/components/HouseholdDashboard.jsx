// src/components/HouseholdDashboard.jsx
import React from 'react';

export default function HouseholdDashboard({ onBack }) {
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack}>← Change Mode</button>
      <h2>Household Pantry</h2>
      <p>Your item expiry tracking will display here.</p>
    </div>
  );
}
