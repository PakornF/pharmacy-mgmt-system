import bcrypt from "bcrypt";
import Doctor from "../models/doctor.js";

// POST /doctors/login
// body: { "username": "drA", "password": "123456" }
export const loginDoctor = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "username and password are required" });
    }

    // Find doctor by username
    const doctor = await Doctor.findOne({ username });
    if (!doctor) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, doctor.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Del passwordHash from object before sending response
    const safeDoctor = {
      doctor_id: doctor.doctor_id,
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      license_no: doctor.license_no,
      username: doctor.username,
    };

    return res.status(200).json({
      message: "Login successful",
      doctor: safeDoctor,
    });
  } catch (err) {
    console.error("Error in loginDoctor:", err);
    res
      .status(500)
      .json({ message: "Error logging in", error: err.message });
  }
};