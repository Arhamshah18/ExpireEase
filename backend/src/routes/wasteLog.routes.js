const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { logWaste, autoMoveExpiredItems, listWasteLog } = require("../controllers/wasteLog.controller");

router.use(requireAuth);
router.post("/", logWaste);
router.get("/", listWasteLog);
// Intended to be called by an internal cron/BullMQ job, not directly by the client.
router.post("/auto-move-expired", autoMoveExpiredItems);

module.exports = router;
