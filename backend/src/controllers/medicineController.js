// backend/src/controllers/medicineController.js
import Medicine from "../models/Medicine.js";

const REQUIRED_FIELDS = [
  "medicine_id",
  "name",
  "brand",
  "type",
  "price",
  "quantity",
  "supplier_id",
];

// Validate request body has all required fields
const validateMedicineBody = (body) => {
  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );
  return missing;
};

// GET /medicines  – get all medicines
export const getAllMedicines = async (req, res) => {
  try {
    const meds = await Medicine.find().sort({ name: 1 });
    res.status(200).json(meds);
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).json({
      message: "Error fetching medicines",
      error: error.message,
    });
  }
};

// GET /medicines/:id – get one medicine by MongoDB _id
export const getMedicineById = async (req, res) => {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    res.status(200).json(med);
  } catch (error) {
    console.error("Error fetching medicine:", error);
    res.status(400).json({
      message: "Error fetching medicine",
      error: error.message,
    });
  }
};

// (optional) GET /medicines/code/:medicine_id – find by business PK
export const getMedicineByCode = async (req, res) => {
  try {
    const med = await Medicine.findOne({ medicine_id: req.params.medicine_id });
    if (!med) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    res.status(200).json(med);
  } catch (error) {
    console.error("Error fetching medicine by code:", error);
    res.status(400).json({
      message: "Error fetching medicine by code",
      error: error.message,
    });
  }
};

// POST /medicines – create new medicine
export const createMedicine = async (req, res) => {
  try {
    const missing = validateMedicineBody(req.body);
    if (missing.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        missing,
      });
    }

    const existing = await Medicine.findOne({
      medicine_id: req.body.medicine_id,
    });
    if (existing) {
      return res.status(409).json({
        message: "medicine_id already exists",
      });
    }

    const newMed = new Medicine({
      medicine_id: req.body.medicine_id,
      name: req.body.name,
      brand: req.body.brand,
      type: req.body.type,
      price: req.body.price,
      quantity: req.body.quantity,
      supplier_id: req.body.supplier_id,
    });

    const saved = await newMed.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating medicine:", error);
    res.status(400).json({
      message: "Error creating medicine",
      error: error.message,
    });
  }
};

// PUT /medicines/:id – update existing medicine by MongoDB _id
export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    // You can choose to validate here too; for now, partial update allowed
    const updateData = {
      medicine_id: req.body.medicine_id,
      name: req.body.name,
      brand: req.body.brand,
      type: req.body.type,
      price: req.body.price,
      quantity: req.body.quantity,
      supplier_id: req.body.supplier_id,
    };

    // Remove undefined so we don't overwrite with undefined
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updated = await Medicine.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating medicine:", error);
    res.status(400).json({
      message: "Error updating medicine",
      error: error.message,
    });
  }
};

// DELETE /medicines/:id – delete medicine by MongoDB _id
export const deleteMedicine = async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    res.status(200).json({
      message: "Medicine deleted",
      medicine: deleted,
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    res.status(400).json({
      message: "Error deleting medicine",
      error: error.message,
    });
  }
};