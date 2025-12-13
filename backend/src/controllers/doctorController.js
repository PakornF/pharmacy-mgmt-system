import Doctor from "../models/doctor.js";
import bcrypt from "bcrypt";

// GET all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select("-passwordHash");
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors", error: error.message });
  }
};

// CREATE new doctor
export const createDoctor = async (req, res) => {
  try {
    const { doctor_first_name, doctor_last_name, license_no, username, password } = req.body;

    if (!doctor_first_name || !doctor_last_name || !license_no || !username || !password) {
      return res.status(400).json({
        message: "doctor_first_name, doctor_last_name, license_no, username, and password are required",
      });
    }

    // เช็ค license_no ซ้ำ
    const existedLicense = await Doctor.findOne({ license_no });
    if (existedLicense) {
      return res.status(400).json({
        message: "This license number already exists for another doctor.",
      });
    }
    const existedUsername = await Doctor.findOne({ username });
    if (existedUsername) {
      return res.status(400).json({
        message: "This username is already taken.",
      });
    }

    // +1 to the last doctor_id
    const last = await Doctor.findOne().sort({ doctor_id: -1 });
    const nextId = last ? last.doctor_id + 1 : 1;

    // password hashing
    const passwordHash = await bcrypt.hash(password, 10);

    const doctor = await Doctor.create({
      doctor_id: nextId,
      doctor_first_name,
      doctor_last_name,
      license_no,
      username,
      passwordHash,
    });

    const safeDoctor = {
      _id: doctor._id,
      doctor_id: doctor.doctor_id,
      doctor_first_name: doctor.doctor_first_name,
      doctor_last_name: doctor.doctor_last_name,
      license_no: doctor.license_no,
      username: doctor.username,
    };

    res.status(201).json(safeDoctor);
  } catch (error) {
    res.status(500).json({ message: "Error creating doctor", error: error.message });
  }
};

// UPDATE doctor
export const updateDoctor = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Hash new password if provided
    if (updateData.password) {
      const newHash = await bcrypt.hash(updateData.password, 10);
      updateData.passwordHash = newHash;
      delete updateData.password;
    }

    // Not allow updating doctor_id field
    if (updateData.doctor_id) {
      delete updateData.doctor_id;
    }

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json(doctor);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating doctor", error: error.message });
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
    res
      .status(400)
      .json({ message: "Error deleting doctor", error: error.message });
  }
};
