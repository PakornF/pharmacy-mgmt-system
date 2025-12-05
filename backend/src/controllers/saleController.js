import Sale from "../models/sale.js";
import SaleItem from "../models/saleItem.js";
import Medicine from "../models/medicine.js";

// Helper: get next integer id for a field (e.g. sale_id, sale_item_id)
const getNextIntId = async (Model, fieldName) => {
  const last = await Model.findOne().sort({ [fieldName]: -1 }).lean();
  return last ? last[fieldName] + 1 : 1;
};

// 1) Search medicines for billing: /sales/medicines?q=para
export const searchMedicinesForBilling = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { medicine_id: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
            { brand: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const meds = await Medicine.find(filter)
      .sort({ name: 1 })
      .limit(20);

    res.status(200).json(meds);
  } catch (error) {
    console.error("Error searching medicines:", error);
    res.status(500).json({ message: "Error searching medicines", error: error.message });
  }
};

export const createSale = async (req, res) => {
  try {
    const { customer_id, prescription_id = null, items } = req.body;

    if (!customer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "customer_id and items[] are required",
      });
    }

    // Fetch all medicines involved
    const medicineIds = items.map((it) => it.medicine_id);
    const medicines = await Medicine.find({ medicine_id: { $in: medicineIds } });

    const medMap = new Map();
    medicines.forEach((m) => medMap.set(m.medicine_id, m));

    // Validate stock and compute total
    let total_price = 0;
    const detailedItems = [];

    for (const item of items) {
      const { medicine_id, quantity, dosage = "" } = item;
      const med = medMap.get(medicine_id);

      if (!med) {
        return res.status(400).json({ message: `Medicine not found: ${medicine_id}` });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for medicine_id ${medicine_id}`,
        });
      }

      if (med.quantity < quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${medicine_id} (${med.name}). In stock: ${med.quantity}, requested: ${quantity}`,
        });
      }

      const lineTotal = med.price * quantity;
      total_price += lineTotal;

      detailedItems.push({
        medicine_id,
        name: med.name,
        unit_price: med.price,
        quantity,
        dosage,
        line_total: lineTotal,
      });
    }

    // Generate IDs
    const nextSaleId = await getNextIntId(Sale, "sale_id");
    let nextSaleItemId = await getNextIntId(SaleItem, "sale_item_id");

    // Create Sale document
    const sale = new Sale({
      sale_id: nextSaleId,
      customer_id,
      sale_datetime: new Date(),
      total_price,
      // ผูกกับ prescription ถ้ามี (ไม่บังคับ)
      prescription_id: prescription_id || null,
    });
    await sale.save();

    // Create SaleItems + update Medicine stock
    const saleItemsDocs = [];
    for (const item of detailedItems) {
      const saleItem = new SaleItem({
        sale_item_id: nextSaleItemId++,
        sale_id: nextSaleId,
        medicine_id: item.medicine_id,
        unit_price: item.unit_price,
        quantity: item.quantity,
        dosage: item.dosage || "",
      });
      saleItemsDocs.push(saleItem.save());

      // Decrease stock
      await Medicine.updateOne(
        { medicine_id: item.medicine_id },
        { $inc: { quantity: -item.quantity } }
      );
    }
    await Promise.all(saleItemsDocs);

    return res.status(201).json({
      message: "Sale created successfully",
      sale,
      items: detailedItems,
      total_price,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(400).json({ message: "Error creating sale", error: error.message });
  }
};

// 3) Get all sales (summary list)
export const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ sale_datetime: -1 });

    if (sales.length === 0) {
      return res.status(200).json([]);
    }

    const saleIds = sales.map((s) => s.sale_id);
    const saleItems = await SaleItem.find({
      sale_id: { $in: saleIds },
    }).lean();

    const medicineIds = [
      ...new Set(saleItems.map((it) => it.medicine_id)),
    ];
    const medicines = await Medicine.find({
      medicine_id: { $in: medicineIds },
    }).lean();
    const medMap = new Map(
      medicines.map((m) => [m.medicine_id, m])
    );

    const itemsBySale = saleItems.reduce((acc, it) => {
      acc[it.sale_id] = acc[it.sale_id] || [];
      const med = medMap.get(it.medicine_id);
      acc[it.sale_id].push({
        sale_item_id: it.sale_item_id,
        medicine_id: it.medicine_id,
        medicine_name: med ? med.name : "Unknown medicine",
        unit_price: it.unit_price,
        quantity: it.quantity,
        dosage: it.dosage || "",
      });
      return acc;
    }, {});

    const result = sales.map((s) => ({
      ...s.toObject(),
      items: itemsBySale[s.sale_id] || [],
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Error fetching sales", error: error.message });
  }
};

// 4) Get one sale with items (detail)
export const getSaleWithItems = async (req, res) => {
  try {
    const saleId = Number(req.params.sale_id);
    if (Number.isNaN(saleId)) {
      return res.status(400).json({ message: "Invalid sale_id" });
    }

    const sale = await Sale.findOne({ sale_id: saleId });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const items = await SaleItem.find({ sale_id: saleId }).lean();

    if (items.length === 0) {
      return res.status(200).json({ sale, items: [] });
    }

    const medicineIds = [
      ...new Set(items.map((it) => it.medicine_id)),
    ];
    const medicines = await Medicine.find({
      medicine_id: { $in: medicineIds },
    }).lean();
    const medMap = new Map(
      medicines.map((m) => [m.medicine_id, m])
    );

    const enrichedItems = items.map((it) => {
      const med = medMap.get(it.medicine_id);
      return {
        ...it,
        medicine_name: med ? med.name : "Unknown medicine",
        dosage: it.dosage || "",
      };
    });

    return res.status(200).json({ sale, items: enrichedItems });
  } catch (error) {
    console.error("Error fetching sale detail:", error);
    res.status(400).json({ message: "Error fetching sale", error: error.message });
  }
};

// 5) Delete sale (and restore stock)
export const deleteSale = async (req, res) => {
  try {
    const saleId = Number(req.params.sale_id);
    if (Number.isNaN(saleId)) {
      return res.status(400).json({ message: "Invalid sale_id" });
    }

    const sale = await Sale.findOne({ sale_id: saleId });
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const items = await SaleItem.find({ sale_id: saleId });

    // Restore stock
    for (const item of items) {
      await Medicine.updateOne(
        { medicine_id: item.medicine_id },
        { $inc: { quantity: item.quantity } }
      );
    }

    await SaleItem.deleteMany({ sale_id: saleId });
    await Sale.deleteOne({ sale_id: saleId });

    res.status(200).json({
      message: "Sale deleted and stock restored",
      sale,
      items,
    });
  } catch (error) {
    console.error("Error deleting sale:", error);
    res.status(400).json({ message: "Error deleting sale", error: error.message });
  }
};