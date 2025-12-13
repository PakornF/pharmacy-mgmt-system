import Customer from "../models/customer.js";
import Sale from "../models/sale.js";
import Prescription from "../models/prescription.js";
import PrescriptionItem from "../models/prescriptionItem.js";
import Medicine from "../models/medicine.js";

// GET all customers
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customers", error: error.message });
  }
};

// CREATE new customer
export const createCustomer = async (req, res) => {
  try {
    const {
      customer_id,
      customer_first_name,
      customer_last_name,
      full_name,
      contact,
      gender,
      day_of_birth,
    } = req.body;

    // Allow legacy full_name field: split into first/last
    let firstName = customer_first_name;
    let lastName = customer_last_name;
    if ((!firstName || !lastName) && full_name) {
      const parts = full_name.trim().split(/\s+/);
      firstName = firstName || parts.shift() || "";
      lastName = lastName || parts.join(" ") || "";
    }

    if (!customer_id || !firstName || !lastName || !contact || !gender || !day_of_birth) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCustomer = new Customer({
      customer_id,
      customer_first_name: firstName,
      customer_last_name: lastName,
      contact,
      gender,
      day_of_birth,
    });

    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(400).json({ message: "Error creating customer", error: error.message });
  }
};

// UPDATE customer
export const updateCustomer = async (req, res) => {
  try {
    const { customer_first_name, customer_last_name, full_name, ...rest } = req.body;

    // Derive first/last from full_name if needed
    let firstName = customer_first_name;
    let lastName = customer_last_name;
    if ((!firstName || !lastName) && full_name) {
      const parts = full_name.trim().split(/\s+/);
      firstName = firstName || parts.shift() || "";
      lastName = lastName || parts.join(" ") || "";
    }

    const updateData = {
      ...rest,
    };
    if (firstName) updateData.customer_first_name = firstName;
    if (lastName) updateData.customer_last_name = lastName;

    const customer = await Customer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json(customer);
  } catch (error) {
    res.status(400).json({ message: "Error updating customer", error: error.message });
  }
};

// DELETE customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json({ message: "Customer deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting customer", error: error.message });
  }
};

// GET customer sales history
export const getCustomerSales = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const sales = await Sale.find({ customer_id: customer.customer_id });
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer sales", error: error.message });
  }
};

// GET customer prescriptions history
export const getCustomerPrescriptions = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const prescriptions = await Prescription.find({
      customer_id: customer.customer_id,
    }).sort({ issue_date: -1 });

    if (prescriptions.length === 0) {
      return res.status(200).json([]);
    }

    const prescripIds = prescriptions.map((p) => p.prescription_id);
    const items = await PrescriptionItem.find({
      prescription_id: { $in: prescripIds },
    }).lean();

    const medIds = [...new Set(items.map((it) => it.medicine_id))];
    const meds = await Medicine.find({
      medicine_id: { $in: medIds },
    }).lean();
    const medMap = new Map(meds.map((m) => [m.medicine_id, m]));

    const itemsByPrescription = items.reduce((acc, it) => {
      acc[it.prescription_id] = acc[it.prescription_id] || [];
      const med = medMap.get(it.medicine_id);
      acc[it.prescription_id].push({
        prescription_item_id: it._id,
        medicine_id: it.medicine_id,
        medicine_name: med ? med.name : "Unknown medicine",
        dosage: it.dosage || "",
        quantity: it.quantity,
        unit: med ? med.unit : "",
      });
      return acc;
    }, {});

    const result = prescriptions.map((p) => ({
      ...p.toObject(),
      items: itemsByPrescription[p.prescription_id] || [],
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer prescriptions", error: error.message });
  }
};
