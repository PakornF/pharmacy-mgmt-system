import express from "express";
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSales,
  getCustomerPrescriptions,
} from "../controllers/customerController.js";

const router = express.Router();

router.get("/", getAllCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.get("/:id/sales", getCustomerSales);
router.get("/:id/prescriptions", getCustomerPrescriptions);

export default router;

