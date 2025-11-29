import Doctor from "../models/doctor.js";

// GET all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors", error: error.message });
  }
};

// CREATE new doctor
export const createDoctor = async (req, res) => {
  try {
    const {
      doctor_id,
      doctor_full_name,
      license_no,
    } = req.body;

    if (!doctor_id || !doctor_full_name || !license_no) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newDoctor = new Doctor({
      doctor_id,
      doctor_full_name,
      license_no,
    });

    await newDoctor.save();
    res.status(201).json(newDoctor);
  } catch (error) {
    console.error("Error creating doctor:", error);
    res.status(400).json({ message: "Error creating doctor", error: error.message });
  }
};

// UPDATE doctor
export const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.status(200).json(doctor);
  } catch (error) {
    res.status(400).json({ message: "Error updating doctor", error: error.message });
  }
};

// DELETE doctor
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.status(200).json({ message: "Doctor deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting doctor", error: error.message });
  }
};

