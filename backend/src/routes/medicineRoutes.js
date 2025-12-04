// backend/src/routes/medicineRoutes.js
import express from "express";
import {
  getAllMedicines,
  getMedicineById,
  getMedicineByCode,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from "../controllers/medicineController.js";

const router = express.Router();

// /medicines
router.get("/", getAllMedicines);

// /medicines/:id  (MongoDB _id)
router.get("/:id", getMedicineById);

// /medicines/code/:medicine_id  (business PK, e.g. MED001)
router.get("/code/:medicine_id", getMedicineByCode);

// create
router.post("/", createMedicine);

// update
router.put("/:id", updateMedicine);

// delete
router.delete("/:id", deleteMedicine);

export default router;