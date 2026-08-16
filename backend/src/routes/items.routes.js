const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { createItem, listItems, updateItemStatus } = require("../controllers/items.controller");

router.use(requireAuth);
router.post("/", createItem);
router.get("/", listItems);
router.patch("/:id/status", updateItemStatus);

module.exports = router;
