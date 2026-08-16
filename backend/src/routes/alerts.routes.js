const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  hasAlertBeenSent,
  recordAlertSent,
  itemsNeedingEvaluation,
} = require("../controllers/alerts.controller");

router.use(requireAuth);
router.get("/sent", hasAlertBeenSent);
router.post("/sent", recordAlertSent);
router.get("/pending-evaluation", itemsNeedingEvaluation);

module.exports = router;
