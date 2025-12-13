import express from "express";
import SupplyOrder from "../models/supplyOrder.js";
import SupplyOrderItem from "../models/supplyOrderItem.js";
import Supplier from "../models/supplier.js";
import Medicine from "../models/medicine.js";

const router = express.Router();

const buildOrderResponse = async (orders) => {
  const supplierIds = orders.map((o) => o.supplier_id);
  const suppliers = await Supplier.find({ supplier_id: { $in: supplierIds } });
  const orderIds = orders.map((o) => o.order_id);
  const items = await SupplyOrderItem.find({ order_id: { $in: orderIds } });
  const medIds = items.map((i) => i.medicine_id);
  const meds = await Medicine.find({ medicine_id: { $in: medIds } });

  const itemsByOrder = items.reduce((acc, item) => {
    acc[item.order_id] = acc[item.order_id] || [];
    acc[item.order_id].push({
      ...item.toObject(),
      medicine: meds.find((m) => m.medicine_id === item.medicine_id) || null,
    });
    return acc;
  }, {});

  return orders.map((o) => ({
    ...o.toObject(),
    supplier: suppliers.find((s) => s.supplier_id === o.supplier_id) || null,
    items: itemsByOrder[o.order_id] || [],
  }));
};

// List supply orders (optional status filter)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const orders = await SupplyOrder.find(filter).sort({ order_date: -1 });
    const response = await buildOrderResponse(orders);
    res.json(response);
  } catch (err) {
    console.error("Error listing supply orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create supply order with items
router.post("/", async (req, res) => {
  try {
    const { order_id, supplier_id, order_date, status = "PENDING", total_cost, items } = req.body;
    if (!order_id || !supplier_id || !order_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const supplier = await Supplier.findOne({ supplier_id });
    if (!supplier) return res.status(400).json({ message: "Supplier not found" });

    const computedTotal = items.reduce(
      (sum, i) => sum + Number(i.ordered_quantity || 0) * Number(i.cost_per_unit || 0),
      0
    );

    const order = await SupplyOrder.create({
      order_id,
      supplier_id,
      order_date,
      status,
      total_cost: total_cost ?? computedTotal,
    });

    const nowBase = Date.now();
    const itemsToInsert = items.map((i, idx) => ({
      order_item_id: i.order_item_id ?? nowBase + idx,
      order_id,
      medicine_id: i.medicine_id,
      ordered_quantity: i.ordered_quantity,
      cost_per_unit: i.cost_per_unit,
      units_per_pack: i.units_per_pack ?? 1,
      expiry_date: i.expiry_date,
    }));
    await SupplyOrderItem.insertMany(itemsToInsert);

    const response = (await buildOrderResponse([order]))[0];
    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating supply order:", err);
    res.status(400).json({ message: "Invalid data" });
  }
});

// Update supply order (only if not delivered)
router.put("/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;
    const existing = await SupplyOrder.findOne({ order_id: Number(order_id) });
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.status === "DELIVERED") return res.status(400).json({ message: "Cannot edit delivered order" });

    const { supplier_id, order_date, status, total_cost, items } = req.body;

    if (items && (!Array.isArray(items) || items.length === 0)) {
      return res.status(400).json({ message: "Items must be a non-empty array" });
    }

    if (supplier_id) {
      const supplier = await Supplier.findOne({ supplier_id });
      if (!supplier) return res.status(400).json({ message: "Supplier not found" });
    }

    const updates = {};
    if (supplier_id !== undefined) updates.supplier_id = supplier_id;
    if (order_date !== undefined) updates.order_date = order_date;
    if (status !== undefined) updates.status = status;
    if (total_cost !== undefined) updates.total_cost = total_cost;

    const updatedOrder = await SupplyOrder.findOneAndUpdate({ order_id: Number(order_id) }, updates, { new: true });

    if (items) {
      await SupplyOrderItem.deleteMany({ order_id: Number(order_id) });
      const itemsToInsert = items.map((i) => ({
        order_item_id: i.order_item_id,
        order_id: Number(order_id),
        medicine_id: i.medicine_id,
        ordered_quantity: i.ordered_quantity,
        cost_per_unit: i.cost_per_unit,
        expiry_date: i.expiry_date,
      }));
      await SupplyOrderItem.insertMany(itemsToInsert);
    }

    const response = (await buildOrderResponse([updatedOrder]))[0];
    res.json(response);
  } catch (err) {
    console.error("Error updating supply order:", err);
    res.status(400).json({ message: "Invalid data" });
  }
});

// Mark delivered/pending and update medicine quantities when delivered
router.patch("/:order_id/status", async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    if (!status || !["PENDING", "DELIVERED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await SupplyOrder.findOne({ order_id: Number(order_id) });
    if (!order) return res.status(404).json({ message: "Not found" });

    const wasDelivered = order.status === "DELIVERED";
    order.status = status;
    await order.save();

    if (status === "DELIVERED" && !wasDelivered) {
      const items = await SupplyOrderItem.find({ order_id: Number(order_id) });
      for (const item of items) {
        await Medicine.updateOne(
          { medicine_id: item.medicine_id },
          { $inc: { quantity: item.ordered_quantity } }
        );
      }
    }

    const response = (await buildOrderResponse([order]))[0];
    res.json(response);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(400).json({ message: "Invalid data" });
  }
});

export default router;
