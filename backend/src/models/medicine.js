import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  expiry_date: Date
});

export default mongoose.model("Medicine", MedicineSchema);