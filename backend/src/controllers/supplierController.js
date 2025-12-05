import Supplier from "../models/supplier.js";

// GET all suppliers
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find(); // Get all suppliers from DB
    res.status(200).json(suppliers); // Respond with the list of suppliers
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Error fetching suppliers", error: error.message });
  }
};

// GET a supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id); // Get the supplier by MongoDB _id
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json(supplier); // Respond with the supplier details
  } catch (error) {
    console.error("Error fetching supplier by ID:", error);
    res.status(500).json({ message: "Error fetching supplier", error: error.message });
  }
};

// CREATE new supplier
export const createSupplier = async (req, res) => {
  try {
    const { supplier_id, supplier_name, contact_person, phone, email, address, notes } = req.body;

    const missing = ["supplier_name", "contact_person", "phone", "email", "address"].filter(
      (field) => !req.body[field]
    );
    if (missing.length > 0) {
      return res.status(400).json({ message: "Missing required fields", missing });
    }

    let nextSupplierId;
    if (supplier_id !== undefined && supplier_id !== null && supplier_id !== "") {
      const parsed = Number(supplier_id);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: "supplier_id must be a number" });
      }
      nextSupplierId = parsed;
    } else {
      const latest = await Supplier.findOne().sort({ supplier_id: -1 }).lean();
      const latestId = Number(latest?.supplier_id) || 0;
      nextSupplierId = latestId + 1;
    }

    const duplicate = await Supplier.findOne({ supplier_id: nextSupplierId });
    if (duplicate) {
      return res.status(409).json({ message: "supplier_id already exists" });
    }

    // Create a new supplier instance
    const newSupplier = new Supplier({
      supplier_id: nextSupplierId,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      notes,
    });

    // Save the supplier to the database
    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier); // Respond with the created supplier
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(400).json({ message: "Error creating supplier", error: error.message });
  }
};

// UPDATE supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the supplier and update
    const updatedSupplier = await Supplier.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(updatedSupplier); // Return the updated supplier
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(400).json({ message: "Error updating supplier", error: error.message });
  }
};

// DELETE supplier
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSupplier = await Supplier.findByIdAndDelete(id); // Delete the supplier by _id
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
