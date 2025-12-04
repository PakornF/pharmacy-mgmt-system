import express from "express";
import {
  searchMedicinesForBilling,
  createSale,
  getAllSales,
  getSaleWithItems,
  deleteSale,
} from "../controllers/saleController.js";

const router = express.Router();

// Search medicines for billing
// GET /sales/medicines?q=para
router.get("/medicines", searchMedicinesForBilling);

// Sales CRUD
// GET /sales
router.get("/", getAllSales);

// GET /sales/:sale_id
router.get("/:sale_id", getSaleWithItems);

// POST /sales
router.post("/", createSale);

// DELETE /sales/:sale_id
router.delete("/:sale_id", deleteSale);

export default router;