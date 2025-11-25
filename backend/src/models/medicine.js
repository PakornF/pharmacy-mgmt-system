import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  expiry_date: { type: Date, required: true }
});

export default mongoose.model("Medicine", MedicineSchema);