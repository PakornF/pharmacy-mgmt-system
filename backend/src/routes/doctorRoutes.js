import express from "express";
import {
  getAllDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";

import { loginDoctor } from "../controllers/doctorAuthController.js";

const router = express.Router();

router.get("/", getAllDoctors);
router.post("/", createDoctor);
router.put("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

router.post("/login", loginDoctor);

export default router;

