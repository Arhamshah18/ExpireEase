import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import ModeSelection from "./components/ModeSelection";
import HouseholdDashboard from "./components/HouseholdDashboard";
import CommercialDashboard from "./components/CommercialDashboard";

async function authHeader() {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function App() {
  const [mode, setMode] = useState(null);

  if (!mode) return <ModeSelection onSelectMode={setMode} />;

  if (mode === "household") {
    return <HouseholdDashboard onBack={() => setMode(null)} authHeader={authHeader} />;
  }

  if (mode === "commercial") {
    return <CommercialDashboard onBack={() => setMode(null)} authHeader={authHeader} />;
  }

  return null;
}