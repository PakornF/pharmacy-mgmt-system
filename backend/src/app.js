import express from 'express';
import { connectDB } from './config/db.js';

import medicineRoutes from "./routes/medicineRoutes.js";

const app = express();
app.use(express.json());

connectDB();

app.listen(3000, () => console.log("Server running"));

app.use("/medicines", medicineRoutes);