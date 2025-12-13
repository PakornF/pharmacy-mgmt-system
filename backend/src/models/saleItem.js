import mongoose from "mongoose";

const SaleItemSchema = new mongoose.Schema({
  sale_item_id: { type: Number, required: true, unique: true },
  sale_id: { type: Number, required: true },
  medicine_id: { type: String, required: true },
  unit_price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  dosage: { type: String, default: "" },
});

export default mongoose.model("SaleItem", SaleItemSchema);