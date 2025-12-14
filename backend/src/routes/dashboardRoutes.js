import express from "express";
import { getDashboardSummary, removeExpiredMedicine } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.delete("/expired/:medicine_id", removeExpiredMedicine);

export default router;