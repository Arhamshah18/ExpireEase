const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  addRow,
  generateFromHistory,
  updateRow,
  listRows,
} = require("../controllers/shoppingList.controller");

router.use(requireAuth);
router.post("/", addRow);
router.post("/generate-from-history", generateFromHistory);
router.patch("/:id", updateRow);
router.get("/", listRows);

module.exports = router;
