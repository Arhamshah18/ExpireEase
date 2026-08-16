const { pool } = require("../config/db");

const normalise = (s) => s.trim().toLowerCase();

// Adds a row; relies on the UNIQUE(user_id, list_type, normalised_name) constraint
// for de-dup, so a repeat add just bumps quantity instead of erroring.
async function addRow(req, res) {
  const { listType, name, quantity, source } = req.body;
  if (!name || !listType) return res.status(400).json({ error: "name and listType are required" });

  try {
    const result = await pool.query(
      `INSERT INTO shopping_lists (user_id, list_type, name, normalised_name, quantity, source)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, list_type, normalised_name)
       DO UPDATE SET quantity = shopping_lists.quantity + EXCLUDED.quantity
       RETURNING *`,
      [req.user.uid, listType, name, normalise(name), quantity || 1, source || "custom"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add row", detail: err.message });
  }
}

// Pre-populates a list from recent history (consumed items), pre-checked.
async function generateFromHistory(req, res) {
  const { listType } = req.body;
  try {
    const historyItems = await pool.query(
      `SELECT DISTINCT item_name FROM history WHERE user_id = $1 ORDER BY item_name`,
      [req.user.uid]
    );

    const inserted = [];
    for (const row of historyItems.rows) {
      const result = await pool.query(
        `INSERT INTO shopping_lists (user_id, list_type, name, normalised_name, source, is_checked)
         VALUES ($1,$2,$3,$4,'history',TRUE)
         ON CONFLICT (user_id, list_type, normalised_name) DO NOTHING
         RETURNING *`,
        [req.user.uid, listType || "ration", row.item_name, normalise(row.item_name)]
      );
      if (result.rows[0]) inserted.push(result.rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate list from history", detail: err.message });
  }
}

async function updateRow(req, res) {
  const { id } = req.params;
  const { isChecked, quantity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE shopping_lists SET
         is_checked = COALESCE($1, is_checked),
         quantity = COALESCE($2, quantity)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [isChecked, quantity, id, req.user.uid]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Row not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update row", detail: err.message });
  }
}

async function listRows(req, res) {
  const { listType } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM shopping_lists WHERE user_id = $1 AND ($2::text IS NULL OR list_type = $2)
       ORDER BY is_checked ASC, name ASC`,
      [req.user.uid, listType || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shopping list", detail: err.message });
  }
}

module.exports = { addRow, generateFromHistory, updateRow, listRows };
