import Medicine from "/models/Medicine.js";

// Get all medicines
export const getAllMedicines = async (req, res) => {
  try {
    const meds = await Medicine.find();
    res.status(200).json(meds);
  } catch (error) {
    res.status(500).json({ message: "Error fetching medicines", error });
  }
};

// Create new medicine
export const createMedicine = async (req, res) => {
  try {
    const newMed = new Medicine(req.body);
    await newMed.save();
    res.status(201).json(newMed);
  } catch (error) {
    res.status(400).json({ message: "Error creating medicine", error });
  }
};

// Update medicine (e.g., stock, price)
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

// Delete medicine
export const deleteMedicine = async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Medicine deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting medicine", error });
  }
};