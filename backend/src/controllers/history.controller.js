const { pool } = require("../config/db");

// Logs a used/consumed action and flips the source item's status to 'used'.
async function logUsed(req, res) {
  const { itemId, quantity } = req.body;
  if (!itemId) return res.status(400).json({ error: "itemId is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `SELECT name FROM items WHERE id = $1 AND user_id = $2`,
      [itemId, req.user.uid]
    );
    if (itemResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Item not found" });
    }

    const historyResult = await client.query(
      `INSERT INTO history (user_id, item_id, item_name, action, quantity)
       VALUES ($1,$2,$3,'used',$4) RETURNING *`,
      [req.user.uid, itemId, itemResult.rows[0].name, quantity || 1]
    );

    await client.query(
      `UPDATE items SET status = 'used' WHERE id = $1 AND user_id = $2`,
      [itemId, req.user.uid]
    );

    await client.query("COMMIT");
    res.status(201).json(historyResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to log usage", detail: err.message });
  } finally {
    client.release();
  }
}

async function listHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM history WHERE user_id = $1 ORDER BY logged_at DESC`,
      [req.user.uid]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history", detail: err.message });
  }
}

module.exports = { logUsed, listHistory };
