import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactInfo: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);
