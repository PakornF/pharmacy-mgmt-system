import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import { fileURLToPath } from "url";

import Medicine from "./src/models/medicine.js";
import Supplier from "./src/models/supplier.js";
import Customer from "./src/models/customer.js";
import Doctor from "./src/models/doctor.js";
import Prescription from "./src/models/prescription.js";
import PrescriptionItem from "./src/models/prescriptionItem.js";
import Sale from "./src/models/sale.js";
import SaleItem from "./src/models/saleItem.js";
import SupplyOrder from "./src/models/supplyOrder.js";
import SupplyOrderItem from "./src/models/supplyOrderItem.js";
import SalePrescription from "./src/models/salePrescription.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const loadJSON = (file) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures", file), "utf-8")
  );

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "pharmacy",
    });
    console.log("✅ MongoDB connected");

    // Remove legacy sale_item_id index to allow multiple sale items without that field
    try {
      await mongoose.connection.collection("saleitems").dropIndex("sale_item_id_1");
    } catch (e) {
      // ignore if index not found
    }

    await Promise.all([
      Medicine.deleteMany(),
      Supplier.deleteMany(),
      Customer.deleteMany(),
      Doctor.deleteMany(),
      Prescription.deleteMany(),
      PrescriptionItem.deleteMany(),
      Sale.deleteMany(),
      SaleItem.deleteMany(),
      SupplyOrder.deleteMany(),
      SupplyOrderItem.deleteMany(),
      SalePrescription.deleteMany(),
    ]);
    console.log("🧹 Database cleared");

    // 3️⃣ load data
    const medicines = loadJSON("medicines.json");
    const suppliers = loadJSON("suppliers.json");
    const customers = loadJSON("customers.json");
    const doctors = loadJSON("doctors.json");
    const prescriptions = loadJSON("prescriptions.json");
    const prescriptionItems = loadJSON("prescriptionItems.json");
    const sales = loadJSON("sales.json");
    const saleItems = loadJSON("saleItems.json");
    const supplyOrders = loadJSON("supplyOrders.json");
    const supplyOrderItems = loadJSON("supplyOrderItems.json");
    const salePrescriptions = loadJSON("salePrescriptions.json");

    const DEFAULT_DOCTOR_PASSWORD = "doctor123";

    const doctorPasswordHash = await bcrypt.hash(
    DEFAULT_DOCTOR_PASSWORD,
    10
    );

    const doctorsWithPassword = doctors.map(d => ({
    ...d,
    passwordHash: doctorPasswordHash
    }));

    // 4️⃣ insert data 
    await Supplier.insertMany(suppliers);
    await Medicine.insertMany(medicines);
    await Customer.insertMany(customers);
    await Doctor.insertMany(doctorsWithPassword);

    await Prescription.insertMany(prescriptions);
    await PrescriptionItem.insertMany(prescriptionItems);

    await Sale.insertMany(sales);
    await SaleItem.insertMany(saleItems);
    await SalePrescription.insertMany(salePrescriptions);

    await SupplyOrder.insertMany(supplyOrders);
    await SupplyOrderItem.insertMany(supplyOrderItems);

    console.log("🌱 Seed completed successfully");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

seed();
