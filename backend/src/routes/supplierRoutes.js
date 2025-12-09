import express from "express";
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierMedicines,
} from "../controllers/supplierController.js";

const router = express.Router();

// Get all suppliers
router.get("/", getAllSuppliers);

// Get medicines of a supplier (ใช้ในหน้า View)
router.get("/:id/medicines", getSupplierMedicines);  

// Get a supplier by ID
router.get("/:id", getSupplierById);

// Create a new supplier
router.post("/", createSupplier);

// Update an existing supplier
router.put("/:id", updateSupplier);

// Delete a supplier
router.delete("/:id", deleteSupplier);

export default router;