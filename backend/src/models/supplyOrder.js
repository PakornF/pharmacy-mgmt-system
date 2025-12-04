import mongoose from "mongoose";

const SupplyOrderSchema = new mongoose.Schema({
  order_id: { type: Number, required: true, unique: true },
  supplier_id: { type: Number, required: true },
  order_date: { type: Date, required: true },
  status: { type: String, required: true },
  total_cost: { type: Number, required: true }
});

export default mongoose.model("SupplyOrder", SupplyOrderSchema);