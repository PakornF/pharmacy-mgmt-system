import mongoose from "mongoose";

const supplyOrderItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    orderedQuantity: { type: Number, required: true, min: 1 },
    costPerUnit: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date },
  },
  { _id: true }
);

const supplyOrderSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    orderDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["PENDING", "DELIVERED"], default: "PENDING" },
    totalCost: { type: Number, min: 0 },
    items: { type: [supplyOrderItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("SupplyOrder", supplyOrderSchema);
