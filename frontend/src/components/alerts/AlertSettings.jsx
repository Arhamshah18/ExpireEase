import React, { useState } from "react";

export default function AlertSettings({ initialChannel = "whatsapp", onSave }) {
  const [channel, setChannel] = useState(initialChannel);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const handleSave = () => {
    if (onSave) onSave({ channel });
  };

  return (
    <div style={{ maxWidth: "400px", fontFamily: "sans-serif" }}>
      <h3>Alert Settings</h3>
      <label style={{ display: "block", marginBottom: "10px" }}>
        <input
          type="radio"
          name="channel"
          value="whatsapp"
          checked={channel === "whatsapp"}
          onChange={() => setChannel("whatsapp")}
          disabled={!phoneVerified}
        />
        {" "}WhatsApp {!phoneVerified && "(verify phone number first)"}
      </label>
      <label style={{ display: "block", marginBottom: "10px" }}>
        <input
          type="radio"
          name="channel"
          value="in_app"
          checked={channel === "in_app"}
          onChange={() => setChannel("in_app")}
        />
        {" "}In-app only
      </label>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
