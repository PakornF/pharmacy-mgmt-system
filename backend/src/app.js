import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";

import dashboardRoutes from "./routes/dashboardRoutes.js";

import medicineRoutes from "./routes/medicineRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import supplyOrderRoutes from "./routes/supplyOrderRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";

// Resolve backend/.env no matter where the server is started from
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files from repo-level /frontend
const frontendPath = path.join(__dirname, "../../frontend");
app.use(express.static(frontendPath));

// Connect DB
connectDB();

// Routes
// Dashboard API lives under /api to avoid conflicting with SPA /dashboard route
app.use("/api/dashboard", dashboardRoutes);

app.use("/medicines", medicineRoutes);
app.use("/prescriptions", prescriptionRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/supply-orders", supplyOrderRoutes);
app.use("/customers", customerRoutes);
app.use("/doctors", doctorRoutes);
app.use("/sales", saleRoutes);

// Serve SPA routes so refresh/back on /customer etc. works
const spaRoutes = [
  "/",
  "/overview",
  "/medicine",
  "/sales",
  "/customer",
  "/doctor",
  "/prescription",
  "/supplier",
  "/supply-order",
];

app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Fallback: any other GET (not matched above) returns SPA index
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server running on port " + (process.env.PORT || 8000));
});
