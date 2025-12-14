import Sale from "../models/sale.js";
import SaleItem from "../models/saleItem.js";
import SalePrescription from "../models/salePrescription.js";
import Medicine from "../models/medicine.js";
import Prescription from "../models/prescription.js";
import PrescriptionItem from "../models/prescriptionItem.js";

let saleItemIndexChecked = false;
const ensureSaleItemIndex = async () => {
  if (saleItemIndexChecked) return;
  try {
    await SaleItem.collection.dropIndex("sale_item_id_1");
  } catch (error) {
    // Ignore if index does not exist
  } finally {
    saleItemIndexChecked = true;
  }
};

// Helper: get next integer id for a field (e.g. sale_id)
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
    const {
      customer_id,
      prescription_id = null,
      prescription_ids = [],
      prescription_map = [],
      items,
    } = req.body;

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
        quantity,
        dosage,
        line_total: lineTotal,
      });
    }

    // Generate IDs
    const nextSaleId = await getNextIntId(Sale, "sale_id");
    await ensureSaleItemIndex();
    // Create Sale document
    const primaryPrescriptionId = prescription_id || (Array.isArray(prescription_ids) && prescription_ids.length > 0 ? prescription_ids[0] : null);

    const sale = new Sale({
      sale_id: nextSaleId,
      customer_id,
      sale_datetime: new Date(),
      total_price,
    });
    await sale.save();

    // Link all prescriptions to this sale (via SalePrescription collection)
    const prescIds = new Set();
    if (primaryPrescriptionId) prescIds.add(Number(primaryPrescriptionId));
    if (Array.isArray(prescription_ids)) {
      prescription_ids.forEach((pid) => {
        if (pid !== null && pid !== undefined) prescIds.add(Number(pid));
      });
    }

    if (prescIds.size > 0) {
      const prescDocs = Array.from(prescIds).map((pid) => {
        const mapping = Array.isArray(prescription_map)
          ? prescription_map.find((m) => Number(m.prescription_id) === Number(pid))
          : null;
        const dosages = Array.isArray(mapping?.dosages)
          ? mapping.dosages
              .filter((d) => d && d.medicine_id)
              .map((d) => ({
                medicine_id: d.medicine_id,
                dosage: d.dosage || "",
              }))
          : [];
        return {
          sale_id: nextSaleId,
          prescription_id: pid,
          note: mapping?.note || "",
          dosages,
        };
      });
      await SalePrescription.insertMany(prescDocs, { ordered: false }).catch(() => {});
    }

    // Create SaleItems + update Medicine stock
    const saleItemsDocs = [];
    for (const item of detailedItems) {
      const saleItem = new SaleItem({
        sale_id: nextSaleId,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
      });
      saleItemsDocs.push(saleItem.save());

      // Decrease stock
      await Medicine.updateOne(
        { medicine_id: item.medicine_id },
        { $inc: { quantity: -item.quantity } }
      );
    }
    await Promise.all(saleItemsDocs);

    // Mark linked prescription(s) as sold
    if (prescIds.size > 0) {
      await Prescription.updateMany(
        { prescription_id: { $in: Array.from(prescIds) } },
        { $set: { is_sale: true } }
      );
    }

    return res.status(201).json({
      message: "Sale created successfully",
      sale,
      items: detailedItems,
      total_price,
      prescription_ids: Array.from(prescIds),
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
    const salePrescriptions = await SalePrescription.find({
      sale_id: { $in: saleIds },
    }).lean();

    let dosageBySale = {};
    const allPrescIds = [
      ...new Set(salePrescriptions.map((sp) => sp.prescription_id)),
    ];
    if (allPrescIds.length > 0) {
      const prescItems = await PrescriptionItem.find({
        prescription_id: { $in: allPrescIds },
      }).lean();
      const itemsByPresc = prescItems.reduce((acc, it) => {
        acc[it.prescription_id] = acc[it.prescription_id] || [];
        acc[it.prescription_id].push(it);
        return acc;
      }, {});
      dosageBySale = salePrescriptions.reduce((acc, sp) => {
        const items = itemsByPresc[sp.prescription_id] || [];
        if (items.length === 0) return acc;
        acc[sp.sale_id] = acc[sp.sale_id] || {};
        items.forEach((it) => {
          acc[sp.sale_id][String(it.medicine_id)] = it.dosage || "";
        });
        return acc;
      }, {});
    }

    const prescBySale = salePrescriptions.reduce((acc, sp) => {
      acc[sp.sale_id] = acc[sp.sale_id] || [];
      acc[sp.sale_id].push(sp.prescription_id);
      return acc;
    }, {});
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
       const dosageMap = dosageBySale[it.sale_id] || {};
      acc[it.sale_id].push({
        medicine_id: it.medicine_id,
        medicine_name: med ? med.name : "Unknown medicine",
        unit_price: med ? med.price : 0,
        quantity: it.quantity,
        dosage: dosageMap[String(it.medicine_id)] || "",
      });
      return acc;
    }, {});

    const result = sales.map((s) => ({
      ...s.toObject(),
      items: itemsBySale[s.sale_id] || [],
      items_count: (itemsBySale[s.sale_id] || []).length,
      prescription_ids: prescBySale[s.sale_id] || [],
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

    const [items, salePrescriptions] = await Promise.all([
      SaleItem.find({ sale_id: saleId }).lean(),
      SalePrescription.find({ sale_id: saleId }).lean(),
    ]);

    let dosageMap = new Map();
    const prescIds = salePrescriptions.map((sp) => sp.prescription_id);
    if (prescIds.length > 0) {
      const prescItems = await PrescriptionItem.find({
        prescription_id: { $in: prescIds },
      }).lean();
      const map = new Map();
      prescItems.forEach((it) => {
        if (it.medicine_id) {
          map.set(String(it.medicine_id), it.dosage || "");
        }
      });
      dosageMap = map;
    }

    if (items.length === 0) {
      return res.status(200).json({ sale, items: [], prescription_ids: salePrescriptions.map((sp) => sp.prescription_id) });
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
        unit_price: med ? med.price : 0,
        dosage: dosageMap.get(String(it.medicine_id)) || "",
      };
    });

    return res.status(200).json({
      sale,
      items: enrichedItems,
      prescription_ids: salePrescriptions.map((sp) => sp.prescription_id),
    });
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
    await SalePrescription.deleteMany({ sale_id: saleId });
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
