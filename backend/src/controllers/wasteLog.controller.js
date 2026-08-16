const { pool } = require("../config/db");

async function logWaste(req, res) {
  const { itemId, quantity, reason } = req.body;
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

    const wasteResult = await client.query(
      `INSERT INTO waste_log (user_id, item_id, item_name, quantity, reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.uid, itemId, itemResult.rows[0].name, quantity || 1, reason || "expired"]
    );

    await client.query(
      `UPDATE items SET status = 'wasted' WHERE id = $1 AND user_id = $2`,
      [itemId, req.user.uid]
    );

    await client.query("COMMIT");
    res.status(201).json(wasteResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to log waste", detail: err.message });
  } finally {
    client.release();
  }
}

// Called by a scheduled job to auto-move expired, still-active items to waste_log.
async function autoMoveExpiredItems(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expired = await client.query(
      `SELECT id, user_id, name FROM items WHERE status = 'active' AND exp_date < CURRENT_DATE`
    );

    for (const item of expired.rows) {
      await client.query(
        `INSERT INTO waste_log (user_id, item_id, item_name, reason) VALUES ($1,$2,$3,'expired')`,
        [item.user_id, item.id, item.name]
      );
      await client.query(`UPDATE items SET status = 'wasted' WHERE id = $1`, [item.id]);
    }

    await client.query("COMMIT");
    res.json({ movedCount: expired.rowCount });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to auto-move expired items", detail: err.message });
  } finally {
    client.release();
  }
}

async function listWasteLog(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM waste_log WHERE user_id = $1 ORDER BY logged_at DESC`,
      [req.user.uid]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waste log", detail: err.message });
  }
}

module.exports = { logWaste, autoMoveExpiredItems, listWasteLog };
