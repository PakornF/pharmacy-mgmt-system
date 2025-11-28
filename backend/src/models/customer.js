import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    contact: { type: String, trim: true },
    gender: { type: String, trim: true },
    dateOfBirth: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);
