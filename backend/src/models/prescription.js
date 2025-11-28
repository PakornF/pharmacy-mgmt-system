import mongoose from "mongoose";

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    dosage: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    issueDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
    items: { type: [prescriptionItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
