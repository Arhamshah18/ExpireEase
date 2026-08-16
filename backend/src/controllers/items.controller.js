const { pool } = require("../config/db");

const normalise = (s) => s.trim().toLowerCase();

async function createItem(req, res) {
  const { name, mfgDate, expDate, quantity, unit, barcode, entryMethod } = req.body;
  if (!name || !expDate) {
    return res.status(400).json({ error: "name and expDate are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO items (user_id, name, normalised_name, barcode, mfg_date, exp_date, quantity, unit, entry_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.uid, name, normalise(name), barcode || null, mfgDate || null, expDate,
       quantity || 1, unit || "unit", entryMethod || "manual"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create item", detail: err.message });
  }
}

async function listItems(req, res) {
  const { status } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM items WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY exp_date ASC`,
      [req.user.uid, status || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items", detail: err.message });
  }
}

async function updateItemStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!["active", "used", "wasted"].includes(status)) {
    return res.status(400).json({ error: "status must be active, used, or wasted" });
  }
  try {
    const result = await pool.query(
      `UPDATE items SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [status, id, req.user.uid]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Item not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update item", detail: err.message });
  }
}

module.exports = { createItem, listItems, updateItemStatus };
