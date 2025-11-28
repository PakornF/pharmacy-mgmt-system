import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  supplier_id: { type: Number, required: true, unique: true },
  supplier_name: { type: String, required: true },
  contact_info: { type: String, required: true }
});

export default mongoose.model("Supplier", SupplierSchema);