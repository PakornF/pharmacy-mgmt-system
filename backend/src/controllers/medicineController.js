import Medicine from "../models/medicine.js";

// GET all medicines
export const getAllMedicines = async (req, res) => {
  try {
    const meds = await Medicine.find();
    res.status(200).json(meds);
  } catch (error) {
    res.status(500).json({ message: "Error fetching medicines", error: error.message });
  }
};

// CREATE new medicine
export const createMedicine = async (req, res) => {
  try {
    const {
      medicine_id,
      name,
      brand,
      type,
      price,
      quantity,
      supplier_id,
    } = req.body;

    if (!medicine_id || !name || !brand || !type || price == null || quantity == null || supplier_id == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newMed = new Medicine({
      medicine_id,
      name,
      brand,
      type,
      price,
      quantity,
      supplier_id,
    });

    await newMed.save();
    res.status(201).json(newMed);
  } catch (error) {
    console.error("Error creating medicine:", error);
    res.status(400).json({ message: "Error creating medicine", error: error.message });
  }
};

// UPDATE medicine
export const updateMedicine = async (req, res) => {
  try {
    const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json(med);
  } catch (error) {
    res.status(400).json({ message: "Error updating medicine", error });
  }
};

// DELETE medicine
export const deleteMedicine = async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Medicine deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting medicine", error });
  }
};