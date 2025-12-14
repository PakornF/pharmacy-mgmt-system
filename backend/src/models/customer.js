import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  customer_id: { type: Number, required: true, unique: true },
  customer_first_name: { type: String, required: true },
  customer_last_name: { type: String, required: true },
  email: { type: String, required: true},
  contact: { type: String, required: true },
  gender: { type: String, required: true },
  day_of_birth: { type: Date, required: true },
});

// Virtual full_name for backward compatibility
CustomerSchema.virtual("full_name").get(function () {
  const first = this.customer_first_name || "";
  const last = this.customer_last_name || "";
  return `${first} ${last}`.trim();
});

CustomerSchema.set("toJSON", { virtuals: true });
CustomerSchema.set("toObject", { virtuals: true });

export default mongoose.model("Customer", CustomerSchema);
