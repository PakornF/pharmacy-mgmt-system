import mongoose from "mongoose";

const SupplyOrderItemSchema = new mongoose.Schema({
  order_item_id: { type: Number, required: true, unique: true },
  order_id: { type: Number, required: true },
  medicine_id: { type: String, required: true },
  ordered_quantity: { type: Number, required: true },
  cost_per_unit: { type: Number, required: true },
  units_per_pack: { type: Number, required: true },
  expiry_date: { type: Date }
});

export default mongoose.model("SupplyOrderItem", SupplyOrderItemSchema);