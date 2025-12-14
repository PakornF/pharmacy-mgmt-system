// backend/src/controllers/medicineController.js
import Medicine from "../models/medicine.js";

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
    // console.log("Query received:", req.query);
    const filter = {};

    // ถ้ามี query ?supplier_id=... ให้กรองเฉพาะของ supplier นั้น
    if (req.query.supplier_id) {
      // แปลงเป็น number ให้ตรงกับใน DB
      filter.supplier_id = Number(req.query.supplier_id);
    }

    const meds = await Medicine.find(filter).sort({ medicine_id: 1 });

    res.status(200).json(meds);
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(400).json({
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
    const { name, brand, type, price, cost, quantity, supplier_id } = req.body;
    if (!name || !brand || !type || price === undefined || quantity === undefined || !supplier_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const numericPrice = Number(price);
    const numericCost = cost !== undefined ? Number(cost) : numericPrice;
    const numericQty = Number(quantity);
    const numericSupplierId = Number(supplier_id);

    if ([numericPrice, numericCost, numericQty, numericSupplierId].some((v) => Number.isNaN(v))) {
      return res.status(400).json({ message: "Invalid numeric fields" });
    }

    // Generate next unique MED id based on highest existing medicine_id
    const lastMed = await Medicine.findOne({ medicine_id: /^MED\d+$/ })
      .sort({ medicine_id: -1 })
      .lean();

    let newIdNumber = 1;
    if (lastMed && lastMed.medicine_id) {
      const numeric = Number(lastMed.medicine_id.replace("MED", ""));
      if (!Number.isNaN(numeric)) {
        newIdNumber = numeric + 1;
      }
    }

    let newMedId = "MED" + String(newIdNumber).padStart(3, "0");
    // collision guard: increment until unique
    // (should be rare, but protects against duplicate key errors)
    while (await Medicine.exists({ medicine_id: newMedId })) {
      newIdNumber += 1;
      newMedId = "MED" + String(newIdNumber).padStart(3, "0");
    }

    const newMedicine = await Medicine.create({
      medicine_id: newMedId,
      name,
      brand,
      type,
      price: numericPrice,
      cost: numericCost,
      quantity: numericQty,
      supplier_id: numericSupplierId,
    });

    res.status(201).json(newMedicine);
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
      cost: req.body.cost,
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
