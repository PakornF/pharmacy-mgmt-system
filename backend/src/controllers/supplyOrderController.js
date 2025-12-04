import SupplyOrder from "../models/supplyOrder.js";
import SupplyOrderItem from "../models/supplyOrderItem.js";
import Medicine from "../models/medicine.js";

// POST /supply-orders/:id/mark-received
export async function markOrderReceived(req, res) {
  try {
    const orderId = req.params.id;

    // 1) หา order
    const order = await SupplyOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Supply order not found" });
    }

    if (order.status === "received") {
      return res.status(400).json({ message: "Order already received" });
    }

    // 2) ดึงรายการยาของ order นี้
    const items = await SupplyOrderItem.find({ order_id: orderId });

    // 3) อัปเดต stock ของแต่ละ medicine
    for (const item of items) {
      // ถ้า units_per_pack ยังไม่ได้กรอก → ใช้ค่าที่ส่งมาจาก frontend ได้
      // เช่น body = { overrides: [{ order_item_id, units_per_pack, expiry_date }, ...] }
      // ตอนนี้สมมติว่าใน DB มี units_per_pack แล้ว
      const unitsPerPack = item.units_per_pack;
      if (!unitsPerPack || unitsPerPack <= 0) {
        // กันพลาด
        console.warn(
          `SupplyOrderItem ${item._id} has invalid units_per_pack, skip`
        );
        continue;
      }

      const addedPacks = item.ordered_quantity; // กล่อง
      const addedUnits = item.ordered_quantity * unitsPerPack; // เม็ดทั้งหมด

      await Medicine.updateOne(
        { medicine_id: item.medicine_id },
        {
          $inc: {
            quantity: addedUnits,      // เพิ่มจำนวนเม็ดยาในสต็อก
            item_in_stock: addedPacks, // เพิ่มจำนวนกล่องในสต็อก
          },
        }
      );
    }

    // 4) เปลี่ยนสถานะ order เป็น received
    order.status = "received";
    await order.save();

    res.json({ message: "Order marked as received and stock updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark order as received." });
  }
}