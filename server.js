const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const receiptRoutes = require("./routes/receiptRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const transferRoutes = require("./routes/transferRoutes");
const adjustmentRoutes = require("./routes/adjustmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",").map((x) => x.trim()) : true }));
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth);
app.use("/api/products", productRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/categories", categoryRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({ error: status === 500 ? "Internal server error" : error.message });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`StockSense API listening on port ${port}`));
