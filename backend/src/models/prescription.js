import mongoose from "mongoose";

const PrescriptionSchema = new mongoose.Schema({
  prescription_id: { type: Number, required: true, unique: true },
  customer_id: { type: Number, required: true },
  doctor_id: { type: Number, required: true },
  issue_date: { type: Date, required: true },
  notes: { type: String }
});

export default mongoose.model("Prescription", PrescriptionSchema);