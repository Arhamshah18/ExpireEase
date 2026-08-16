const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { logUsed, listHistory } = require("../controllers/history.controller");

router.use(requireAuth);
router.post("/", logUsed);
router.get("/", listHistory);

module.exports = router;
