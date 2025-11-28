import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    licenseNo: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);
