import Prescription from "../models/prescription.js";
import PrescriptionItem from "../models/prescriptionItem.js";
import Medicine from "../models/medicine.js";

// POST /api/prescriptions
// body: { prescription_id, doctor_id, customer_id, issue_date, notes, items: [{ medicine_id, dosage, quantity }] }
export async function createPrescription(req, res) {
  try {
    const {
      prescription_id,
      doctor_id,
      customer_id,
      issue_date,
      notes,
      items,
    } = req.body;

    if (!prescription_id || !doctor_id || !customer_id || !issue_date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Prescription must contain at least one item" });
    }

    // 1) สร้าง prescription header
    const prescription = await Prescription.create({
      prescription_id,
      doctor_id,
      customer_id,
      issue_date,
      notes: notes || "",
    });

    // 2) สร้าง prescription items
    const itemDocs = items.map((it) => ({
      prescription_id: prescription_id,
      medicine_id: it.medicine_id,
      dosage: it.dosage || "",
      quantity: it.quantity,
    }));

    await PrescriptionItem.insertMany(itemDocs);

    res.status(201).json({
      message: "Prescription created",
      prescription,
    });
  } catch (err) {
    console.error("Error creating prescription:", err);
    res.status(500).json({ message: "Failed to create prescription" });
  }
}

// GET /api/prescriptions/customer/:customerId/latest-items
// ดึง prescription ล่าสุดของ customer + join ชื่อยา มาให้หน้า Sales
export async function getLatestPrescriptionItemsByCustomer(req, res) {
  try {
    const customerId = Number(req.params.customerId);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    // 1) หา prescription ล่าสุดของ customer
    const latestPrescription = await Prescription.findOne({
      customer_id: customerId,
    })
      .sort({ issue_date: -1 }) // ล่าสุดสุด
      .lean();

    if (!latestPrescription) {
      return res.json({
        prescription: null,
        items: [],
      });
    }

    // 2) ดึง items ของ prescription นี้
    const items = await PrescriptionItem.find({
      prescription_id: latestPrescription.prescription_id,
    }).lean();

    // 3) เติมข้อมูลชื่อยา / unit ให้พร้อมใช้ใน Sales page
    const medicineIds = [...new Set(items.map((it) => it.medicine_id))];
    const meds = await Medicine.find({
      medicine_id: { $in: medicineIds },
    }).lean();

    const medMap = new Map(meds.map((m) => [m.medicine_id, m]));

    const enrichedItems = items.map((it) => {
      const med = medMap.get(it.medicine_id);
      return {
        prescription_item_id: it._id,
        medicine_id: it.medicine_id,
        medicine_name: med ? med.name : "Unknown medicine",
        unit: med ? med.unit : "",
        dosage: it.dosage || "",
        quantity: it.quantity,
      };
    });

    res.json({
      prescription: latestPrescription,
      items: enrichedItems,
    });
  } catch (err) {
    console.error("Error fetching latest prescription items:", err);
    res.status(500).json({ message: "Failed to load prescription items" });
  }
}