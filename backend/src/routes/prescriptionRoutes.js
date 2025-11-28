import express from "express";
import Prescription from "../models/prescription.js";
import PrescriptionItem from "../models/prescriptionItem.js";
import Customer from "../models/customer.js";
import Doctor from "../models/doctor.js";
import Medicine from "../models/medicine.js";

const router = express.Router();

// Create a new prescription + items
router.post("/", async (req, res) => {
  try {
    const { prescription_id, doctor_id, customer_id, issue_date, notes, items } = req.body;
    if (!prescription_id || !doctor_id || !customer_id || !issue_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prescription = await Prescription.create({
      prescription_id,
      doctor_id,
      customer_id,
      issue_date,
      notes,
    });

    const itemsToInsert = items.map((i) => ({
      prescription_id,
      medicine_id: i.medicine_id,
      dosage: i.dosage,
      quantity: i.quantity,
    }));
    await PrescriptionItem.insertMany(itemsToInsert);

    const doctor = await Doctor.findOne({ doctor_id });
    const customer = await Customer.findOne({ customer_id });
    const itemDetails = await PrescriptionItem.find({ prescription_id });
    const medicines = await Medicine.find({ medicine_id: { $in: itemDetails.map((it) => it.medicine_id) } });

    const itemWithMed = itemDetails.map((it) => ({
      ...it.toObject(),
      medicine: medicines.find((m) => m.medicine_id === it.medicine_id) || null,
    }));

    res.status(201).json({
      ...prescription.toObject(),
      doctor,
      customer,
      items: itemWithMed,
    });
  } catch (err) {
    console.error("Error creating prescription:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// List prescriptions (optional search by patient name)
router.get("/", async (req, res) => {
  try {
    const { patientName } = req.query;
    let customerFilter = {};
    if (patientName) {
      customerFilter.full_name = { $regex: patientName, $options: "i" };
    }
    const customers = await Customer.find(customerFilter).select("customer_id full_name");
    const customerIds = customers.map((c) => c.customer_id);

    const prescriptionFilter = patientName ? { customer_id: { $in: customerIds } } : {};
    const prescriptions = await Prescription.find(prescriptionFilter).sort({ issue_date: -1 });

    const prescripIds = prescriptions.map((p) => p.prescription_id);
    const items = await PrescriptionItem.find({ prescription_id: { $in: prescripIds } });
    const medicineIds = items.map((it) => it.medicine_id);
    const medicines = await Medicine.find({ medicine_id: { $in: medicineIds } });
    const doctors = await Doctor.find({ doctor_id: { $in: prescriptions.map((p) => p.doctor_id) } });

    const itemsByPrescription = items.reduce((acc, item) => {
      acc[item.prescription_id] = acc[item.prescription_id] || [];
      acc[item.prescription_id].push({
        ...item.toObject(),
        medicine: medicines.find((m) => m.medicine_id === item.medicine_id) || null,
      });
      return acc;
    }, {});

    const result = prescriptions.map((p) => ({
      ...p.toObject(),
      customer: customers.find((c) => c.customer_id === p.customer_id) || null,
      doctor: doctors.find((d) => d.doctor_id === p.doctor_id) || null,
      items: itemsByPrescription[p.prescription_id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching prescriptions:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
