import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema({
  // Business primary key (unique code like "MED001")
  medicine_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },

  brand: {
    type: String,
    required: true,
    trim: true,
  },

  type: {
    type: String,
    required: true,
    trim: true,
  },

  // Decimal in Mongo = Number
  price: {
    type: Number,
    required: true,
    min: 0,
  },

  quantity: {
    type: Number,
    required: true,
    min: 0,
  },

  // Logical foreign key; later you can link to a Supplier collection
  supplier_id: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("Medicine", medicineSchema);
