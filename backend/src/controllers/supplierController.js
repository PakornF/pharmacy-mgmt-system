import Supplier from "../models/supplier.js";
import Medicine from "../models/medicine.js";

const REQUIRED_FIELDS = [
  "supplier_name",
  "contact_person",
  "phone",
  "email",
  "address",
];

// --- Validation Logic ---
const validateSupplierBody = (body) => {
  const missing = REQUIRED_FIELDS.filter((field) => !body[field] || body[field].trim() === "");
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(", ")}` };
  }

  // validate phone (ต้องเป็นตัวเลข 10 หลัก)
  const phoneRegex = /^\d{10}$/;
  if (body.phone && !phoneRegex.test(body.phone.trim())) {
    return { valid: false, message: "Phone number must be exactly 10 digits (numbers only)." };
  }

  // validate email แบบง่าย ๆ
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (body.email && !emailRegex.test(body.email.trim())) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  
  return { valid: true };
};


// GET all suppliers
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ supplier_id: 1 });
    res.status(200).json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Error fetching suppliers", error: error.message });
  }
};

// GET a supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json(supplier);
  } catch (error) {
    console.error("Error fetching supplier by ID:", error);
    res.status(500).json({ message: "Error fetching supplier", error: error.message });
  }
};

// CREATE new supplier
export const createSupplier = async (req, res) => {
  try {
    const { supplier_id, supplier_name, contact_person, phone, email, address, notes } = req.body;
    
    // 1. Validate data structure and format
    const validation = validateSupplierBody(req.body);
    if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
    }

    // 2. Determine next supplier_id (PK auto-increment logic)
    let nextSupplierId;
    
    // If supplier_id is provided, use it (and validate it's a number)
    if (supplier_id !== undefined && supplier_id !== null && supplier_id !== "") {
      const parsed = Number(supplier_id);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: "supplier_id must be a number" });
      }
      nextSupplierId = parsed;
    } else {
      // If not provided, find the maximum existing ID and auto-increment
      const latest = await Supplier.findOne().sort({ supplier_id: -1 }).lean();
      const latestId = Number(latest?.supplier_id) || 0;
      nextSupplierId = latestId + 1;
    }

    // 3. Check for supplier_id duplicate (if the ID wasn't just auto-incremented safely)
    if (nextSupplierId) {
        const duplicate = await Supplier.findOne({ supplier_id: nextSupplierId });
        if (duplicate) {
            return res.status(409).json({ message: `supplier_id ${nextSupplierId} already exists` });
        }
    }


    // 4. Create a new supplier instance
    const newSupplier = new Supplier({
      supplier_id: nextSupplierId,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      notes,
    });

    // 5. Save the supplier to the database
    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier);
  } catch (error) {
    // Handle database errors (e.g., MongoDB duplicate key if checks missed it)
    console.error("Error creating supplier:", error);
    res.status(400).json({ message: "Error creating supplier", error: error.message });
  }
};

// UPDATE supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 1. Validate incoming data (only fields present are validated)
    const validation = validateSupplierBody(updateData);
    // NOTE: This simple validation might fail if the frontend only sends a partial update. 
    // You may need to fetch the existing supplier first before running validation.

    if (updateData.phone && !validation.valid) { // Simple check for phone/email validation errors
        return res.status(400).json({ message: validation.message });
    }
    
    // Prevent changing the business PK (supplier_id) through this route
    if (updateData.supplier_id) {
        delete updateData.supplier_id;
    }

    // 2. Find the supplier and update
    const updatedSupplier = await Supplier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(updatedSupplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(400).json({ message: "Error updating supplier", error: error.message });
  }
};

// DELETE supplier
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSupplier = await Supplier.findByIdAndDelete(id);
    if (!deletedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json({
      message: "Supplier deleted successfully",
      supplier: deletedSupplier,
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Error deleting supplier", error: error.message });
  }
};

// GET medicines related to a supplier
export const getSupplierMedicines = async (req, res) => {
  try {
    // We assume the route uses MongoDB _id in the URL, but the client wants medicines by business supplier_id
    const { id } = req.params; 

    // 1. Find supplier by MongoDB _id first
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // 2. Use supplier.supplier_id (Number PK) to find medicines
    const medicines = await Medicine.find({
      supplier_id: supplier.supplier_id,
    }).sort({ name: 1 });

    return res.status(200).json(medicines);
  } catch (error) {
    console.error("Error fetching medicines for supplier:", error);
    return res.status(500).json({
      message: "Error fetching supplier medicines",
      error: error.message,
    });
  }
};