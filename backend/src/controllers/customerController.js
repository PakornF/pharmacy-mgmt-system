import Customer from "../models/customer.js";
import Sale from "../models/sale.js";
import Prescription from "../models/prescription.js";

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
      full_name,
      contact,
      gender,
      day_of_birth,
    } = req.body;

    if (!customer_id || !full_name || !contact || !gender || !day_of_birth) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCustomer = new Customer({
      customer_id,
      full_name,
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
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
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

    const prescriptions = await Prescription.find({ customer_id: customer.customer_id });
    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching customer prescriptions", error: error.message });
  }
};

