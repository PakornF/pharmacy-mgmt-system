import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
  {
    supplier_id: { type: Number, required: true, unique: true }, // Business identifier
    supplier_name: { type: String, required: true }, // Supplier name
    contact_person: { type: String, required: true }, // Contact person
    phone: { type: String, required: true }, // Phone number
    email: { type: String, required: true }, // Email address
    address: {
      building: { type: String, required: true },
      street: { type: String, required: true },
      zipcode: { type: Number, required: true }
    }, // Address
    notes: { type: String }, // Notes 
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", SupplierSchema);
