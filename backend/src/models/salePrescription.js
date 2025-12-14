import mongoose from "mongoose";

const SalePrescriptionSchema = new mongoose.Schema({
    sale_id: { type: Number, required: true },
    prescription_id: { type: Number, required: true }
  });

  SalePrescriptionSchema.index(
    { sale_id: 1, prescription_id: 1 },
    { unique: true }
  );

export default mongoose.model("SalePrescription", SalePrescriptionSchema);