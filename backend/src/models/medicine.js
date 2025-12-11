import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema(
  {
  medicine_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number }, // Cost price (purchase price from supplier)
  quantity: { type: Number, required: true },
  supplier_id: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Medicine", MedicineSchema);
