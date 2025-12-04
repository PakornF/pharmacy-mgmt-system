import mongoose from "mongoose";

const PrescriptionItemSchema = new mongoose.Schema(
  {
    prescription_id: { type: Number, required: true, index: true },
    medicine_id: { type: String, required: true },
    dosage: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export default mongoose.model("PrescriptionItem", PrescriptionItemSchema);
