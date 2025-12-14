import mongoose from "mongoose";

const SaleItemSchema = new mongoose.Schema({
  sale_id: { type: Number, required: true },
  medicine_id: { type: String, required: true },
  quantity: { type: Number, required: true }
});

export default mongoose.model("SaleItem", SaleItemSchema);
