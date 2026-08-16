const { pool } = require("../config/db");

// Kriti's scheduler calls this before sending a WhatsApp/in-app alert,
// to check whether this item has already been alerted at this band.
async function hasAlertBeenSent(req, res) {
  const { itemId, band } = req.query;
  if (!itemId || !band) return res.status(400).json({ error: "itemId and band are required" });

  try {
    const result = await pool.query(
      `SELECT 1 FROM alerts_sent WHERE item_id = $1 AND alert_band = $2`,
      [itemId, band]
    );
    res.json({ alreadySent: result.rowCount > 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to check alert status", detail: err.message });
  }
}

// Records that an alert was sent; UNIQUE(item_id, alert_band) enforces send-once.
async function recordAlertSent(req, res) {
  const { itemId, band, channel } = req.body;
  if (!itemId || !band) return res.status(400).json({ error: "itemId and band are required" });

  try {
    const result = await pool.query(
      `INSERT INTO alerts_sent (user_id, item_id, alert_band, channel)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (item_id, alert_band) DO NOTHING
       RETURNING *`,
      [req.user.uid, itemId, band, channel || "whatsapp"]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: "Alert already sent for this item/band" });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to record alert", detail: err.message });
  }
}

// Feeds Kriti's cron job the active items it needs to evaluate for alert bands.
async function itemsNeedingEvaluation(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, mfg_date, exp_date FROM items WHERE status = 'active'`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items for alert evaluation", detail: err.message });
  }
}

module.exports = { hasAlertBeenSent, recordAlertSent, itemsNeedingEvaluation };
