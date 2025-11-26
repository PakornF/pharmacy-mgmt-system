import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import medicineRoutes from "./routes/medicineRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/medicines", medicineRoutes);

app.get("/", (req, res) => {
  res.send("Pharmacy Management System API, backend is running...");
});

app.listen(process.env.PORT || 8000, () => {
  console.log("Server running on port " + (process.env.PORT || 8000));
});