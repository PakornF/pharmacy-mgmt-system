import express from "express";
import Prescription from "../models/prescription.js";
import PrescriptionItem from "../models/prescriptionItem.js";
import Customer from "../models/customer.js";
import Doctor from "../models/doctor.js";
import Medicine from "../models/medicine.js";

const router = express.Router();

/**
 * POST /api/prescriptions
 * สร้าง prescription + items
 * body: {
 *   prescription_id, doctor_id, customer_id, issue_date, notes,
 *   items: [{ medicine_id, dosage, quantity }]
 * }
 */
router.post("/", async (req, res) => {
  try {
    const {
      prescription_id,
      doctor_id,
      customer_id,
      issue_date,
      notes,
      items,
    } = req.body;

    if (
      !prescription_id ||
      !doctor_id ||
      !customer_id ||
      !issue_date ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // header
    const prescription = await Prescription.create({
      prescription_id,
      doctor_id,
      customer_id,
      issue_date,
      notes,
    });

    // items
    const itemsToInsert = items.map((i) => ({
      prescription_id,
      medicine_id: i.medicine_id,
      // ให้ dosage ว่างได้ (จะไปโชว์เป็น "-" ฝั่ง UI)
      dosage: i.dosage || "",
      quantity: i.quantity,
    }));
    await PrescriptionItem.insertMany(itemsToInsert);

    // populate ข้อมูลไว้ตอบกลับสวย ๆ (หมอ, ลูกค้า, รายการยา)
    const doctor = await Doctor.findOne({ doctor_id });
    const customer = await Customer.findOne({ customer_id });
    const itemDetails = await PrescriptionItem.find({ prescription_id });
    const medicines = await Medicine.find({
      medicine_id: { $in: itemDetails.map((it) => it.medicine_id) },
    });

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

/**
 * GET /api/prescriptions
 * list prescription ทั้งหมด (มี optional search ด้วยชื่อคนไข้)
 * query: ?patientName=...
 */
router.get("/", async (req, res) => {
  try {
    const { patientName } = req.query;
    let customerFilter = {};

    if (patientName) {
      customerFilter.full_name = { $regex: patientName, $options: "i" };
    }

    const customers = await Customer.find(customerFilter).select(
      "customer_id full_name"
    );
    const customerIds = customers.map((c) => c.customer_id);

    const prescriptionFilter = patientName
      ? { customer_id: { $in: customerIds } }
      : {};

    const prescriptions = await Prescription.find(prescriptionFilter).sort({
      issue_date: -1,
    });

    const prescripIds = prescriptions.map((p) => p.prescription_id);
    const items = await PrescriptionItem.find({
      prescription_id: { $in: prescripIds },
    });

    const medicineIds = items.map((it) => it.medicine_id);
    const medicines = await Medicine.find({ medicine_id: { $in: medicineIds } });

    const doctors = await Doctor.find({
      doctor_id: { $in: prescriptions.map((p) => p.doctor_id) },
    });

    const itemsByPrescription = items.reduce((acc, item) => {
      acc[item.prescription_id] = acc[item.prescription_id] || [];
      acc[item.prescription_id].push({
        ...item.toObject(),
        medicine:
          medicines.find((m) => m.medicine_id === item.medicine_id) || null,
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

/**
 * GET /api/prescriptions/customer/:customerId/latest-items
 * เอาไว้ให้หน้า Sales ใช้ดึง "ใบสั่งยาล่าสุดของลูกค้าคนนี้"
 * พร้อมรายการยา + dosage + quantity
 */
router.get("/customer/:customerId/latest-items", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    if (Number.isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    // 1) หา prescription ล่าสุดของลูกค้าคนนี้
    const latestPrescription = await Prescription.findOne({
      customer_id: customerId,
    })
      .sort({ issue_date: -1 })
      .lean();

    if (!latestPrescription) {
      return res.json({ prescription: null, items: [] });
    }

    // 2) ดึง items ของ prescription นี้
    const items = await PrescriptionItem.find({
      prescription_id: latestPrescription.prescription_id,
    }).lean();

    if (items.length === 0) {
      return res.json({ prescription: latestPrescription, items: [] });
    }

    // 3) เติมชื่อยา / unit
    const medicineIds = [...new Set(items.map((it) => it.medicine_id))];
    const medicines = await Medicine.find({
      medicine_id: { $in: medicineIds },
    }).lean();

    const medMap = new Map(
      medicines.map((m) => [m.medicine_id, m])
    );

    const enrichedItems = items.map((it) => {
      const med = medMap.get(it.medicine_id);
      return {
        prescription_item_id: it._id,
        prescription_id: it.prescription_id,
        medicine_id: it.medicine_id,
        medicine_name: med ? med.name : "Unknown medicine",
        unit: med ? med.unit : "",
        // ดึงราคาต่อหน่วยและสต็อกปัจจุบันมาด้วย เพื่อให้ฝั่ง Sales ใช้ได้เลย
        price: med ? med.price : 0,
        stock: med ? med.quantity : 0,
        // ฝั่ง Front ถ้า dosage == "" ให้แสดง "-"
        dosage: it.dosage || "",
        // ปริมาณที่หมอสั่งในใบสั่งยา (ค่าเริ่มต้นของ quantity ในบิล)
        quantity: it.quantity,
      };
    });

    res.json({
      prescription: latestPrescription,
      items: enrichedItems,
    });
  } catch (err) {
    console.error("Error fetching latest prescription items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;