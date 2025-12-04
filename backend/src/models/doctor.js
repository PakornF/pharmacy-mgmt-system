import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema({
  doctor_id: { type: Number, required: true, unique: true },
  doctor_first_name: { type: String, required: true },
  doctor_last_name: { type: String, required: true },
  license_no: { type: Number, required: true }
});

export default mongoose.model("Doctor", DoctorSchema);