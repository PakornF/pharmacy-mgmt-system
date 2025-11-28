import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    saleDatetime: { type: Date, default: Date.now },
    totalPrice: { type: Number, required: true, min: 0 },
    items: { type: [saleItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);
