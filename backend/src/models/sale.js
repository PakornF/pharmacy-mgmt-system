import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
  sale_id: { type: Number, required: true, unique: true },
  customer_id: { type: Number, required: true },
  sale_datetime: { type: Date, required: true },
  total_price: { type: Number, required: true }
});

export default mongoose.model("Sale", SaleSchema);