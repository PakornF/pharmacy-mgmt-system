import mongoose from "mongoose";

const PrescriptionItemSchema = new mongoose.Schema({
  prescription_item_id: { type: Number, required: true, unique: true },
  prescription_id: { type: Number, required: true },
  medicine_id: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true }
});

export default mongoose.model("PrescriptionItem", PrescriptionItemSchema);