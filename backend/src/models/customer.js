import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  customer_id: { type: Number, required: true, unique: true },
  full_name: { type: String, required: true },
  contact: { type: String, required: true },
  gender: { type: String, required: true },
  day_of_birth: { type: Date, required: true }
});

export default mongoose.model("Customer", CustomerSchema);