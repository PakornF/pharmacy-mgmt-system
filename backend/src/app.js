import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import medicineRoutes from "./routes/medicineRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import supplyOrderRoutes from "./routes/supplyOrderRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/medicines", medicineRoutes);
app.use("/prescriptions", prescriptionRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/supply-orders", supplyOrderRoutes);
app.use("/customers", customerRoutes);
app.use("/doctors", doctorRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Pharmacy Management System API, backend is running...");
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server running on port " + (process.env.PORT || 8000));
});
