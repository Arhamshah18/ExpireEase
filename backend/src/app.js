const express = require("express");
const cors = require("cors");

const itemsRoutes = require("./routes/items.routes");
const historyRoutes = require("./routes/history.routes");
const wasteLogRoutes = require("./routes/wasteLog.routes");
const shoppingListRoutes = require("./routes/shoppingList.routes");
const alertsRoutes = require("./routes/alerts.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/items", itemsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/waste-log", wasteLogRoutes);
app.use("/api/shopping-list", shoppingListRoutes);
app.use("/api/alerts", alertsRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
