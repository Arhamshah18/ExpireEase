import React, { useState, useEffect } from "react";
import {
  fetchShoppingList,
  addShoppingListRow,
  generateFromHistory,
  updateShoppingListRow,
} from "../../services/shoppingListService";

export default function ShoppingListUI({ listType = "ration" }) {
  const [rows, setRows] = useState([]);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    load();
  }, [listType]);

  const load = async () => {
    const data = await fetchShoppingList(listType);
    setRows(data);
  };

  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    await addShoppingListRow({ listType, name: newItemName, source: "custom" });
    setNewItemName("");
    load();
  };

  const handleGenerateFromHistory = async () => {
    await generateFromHistory(listType);
    load();
  };

  const handleToggle = async (row) => {
    await updateShoppingListRow(row.id, { isChecked: !row.is_checked });
    load();
  };

  return (
    <div style={{ maxWidth: "500px", fontFamily: "sans-serif" }}>
      <h3>Shopping List ({listType})</h3>
      <button onClick={handleGenerateFromHistory} style={{ marginBottom: "12px" }}>
        Pre-fill from History
      </button>

      <form onSubmit={handleAddCustom} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          placeholder="Add custom item"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map((row) => (
          <li key={row.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <input type="checkbox" checked={row.is_checked} onChange={() => handleToggle(row)} />
            <span style={{ textDecoration: row.is_checked ? "line-through" : "none" }}>
              {row.name} (x{row.quantity})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
