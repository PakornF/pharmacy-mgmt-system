import express from "express";
import Supplier from "../models/supplier.js";
import Medicine from "../models/medicine.js";

const router = express.Router();

// GET /suppliers - list all suppliers
router.get("/", async (_req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ supplier_id: 1 });
    res.json(suppliers);
  } catch (err) {
    console.error("Error listing suppliers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /suppliers - create new supplier
router.post("/", async (req, res) => {
  try {
    const { supplier_id, supplier_name, contact_info } = req.body;
    if (!supplier_id || !supplier_name || !contact_info) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const supplier = new Supplier({ supplier_id, supplier_name, contact_info });
    const saved = await supplier.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating supplier:", err);
    res.status(400).json({ message: "Invalid data" });
  }
});

// PUT /suppliers/:supplier_id - update by business id
router.put("/:supplier_id", async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const updated = await Supplier.findOneAndUpdate({ supplier_id: Number(supplier_id) }, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating supplier:", err);
    res.status(400).json({ message: "Invalid data" });
  }
});

// DELETE /suppliers/:supplier_id - delete by business id
router.delete("/:supplier_id", async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const deleted = await Supplier.findOneAndDelete({ supplier_id: Number(supplier_id) });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /suppliers/:supplier_id/medicines - medicines stocked from this supplier
router.get("/:supplier_id/medicines", async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const meds = await Medicine.find({ supplier_id: Number(supplier_id) }).sort({ name: 1 });
    res.json(meds);
  } catch (err) {
    console.error("Error fetching medicines by supplier:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
