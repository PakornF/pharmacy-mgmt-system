import Medicine from "../models/medicine.js";
import Sale from "../models/sale.js";
import Prescription from "../models/prescription.js";
import SupplyOrderItem from "../models/supplyOrderItem.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const LOW_STOCK_THRESHOLD = 50; 

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1) Number of medicine documents
    const totalMedicineItems = await Medicine.countDocuments();

    // 2) Total quantity in stock (sum of quantity field)
    const aggQty = await Medicine.aggregate([
      { $group: { _id: null, totalQty: { $sum: "$quantity" } } },
    ]);
    const totalQuantityInStock = aggQty.length > 0 ? aggQty[0].totalQty : 0;

    // 3) Low stock alert list
    const lowStockMeds = await Medicine.find({
      quantity: { $lt: LOW_STOCK_THRESHOLD },
    }).select("medicine_id name brand quantity");

    // 4) Expired meds - query from SupplyOrderItem where expiry_date < today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let expiredMeds = [];
    try {
      // Find all expired supply order items
      const expiredItems = await SupplyOrderItem.find({
        expiry_date: { $exists: true, $lt: today },
      }).select("medicine_id expiry_date");

      // Get unique medicine_ids and their earliest expiry dates
      const expiredMap = new Map();
      for (const item of expiredItems) {
        if (item.medicine_id && item.expiry_date) {
          const medId = item.medicine_id;
          if (!expiredMap.has(medId) || expiredMap.get(medId).expiry_date > item.expiry_date) {
            expiredMap.set(medId, {
              medicine_id: medId,
              expiry_date: item.expiry_date,
            });
          }
        }
      }

      // Get medicine details for expired medicines
      if (expiredMap.size > 0) {
        const expiredMedIds = Array.from(expiredMap.keys());
        const medicines = await Medicine.find({
          medicine_id: { $in: expiredMedIds },
        }).select("medicine_id name brand");

        // Combine medicine details with expiry dates
        expiredMeds = medicines.map((med) => {
          const expiredInfo = expiredMap.get(med.medicine_id);
          return {
            medicine_id: med.medicine_id,
            name: med.name,
            brand: med.brand,
            expiry_date: expiredInfo.expiry_date,
          };
        });
      }
    } catch (e) {
      console.error("Error fetching expired medicines:", e);
      expiredMeds = [];
    }

    // 5) Total sales for today
    const todaySales = await Sale.aggregate([
      {
        $match: {
          sale_datetime: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total_price" },
          count: { $sum: 1 },
        },
      },
    ]);
    const todaySalesTotal = todaySales[0]?.totalRevenue || 0;
    const todaySalesCount = todaySales[0]?.count || 0;

    // 6) Awaited prescriptions: not marked sold and not linked to any sale
    const awaitedAgg = await Prescription.aggregate([
      {
        $lookup: {
          from: "sales",
          localField: "prescription_id",
          foreignField: "prescription_id",
          as: "sales",
        },
      },
      {
        $match: {
          $and: [
            { $or: [{ is_sale: { $exists: false } }, { is_sale: { $ne: true } }] },
            { $expr: { $eq: [{ $size: "$sales" }, 0] } },
          ],
        },
      },
      { $count: "count" },
    ]);
    const awaitedCount = awaitedAgg[0]?.count ?? 0;

    res.json({
      totalMedicineItems,
      totalQuantityInStock,
      lowStockMeds,
      expiredMeds,
      todaySalesTotal,
      todaySalesCount,
      awaitedPrescriptions: awaitedCount,
    });
  } catch (error) {
    console.error("Error getting dashboard summary:", error);
    res.status(500).json({
      message: "Error getting dashboard summary",
      error: error.message,
    });
  }
};

// DELETE /api/dashboard/expired/:medicine_id - Remove expired supply order items
export const removeExpiredMedicine = async (req, res) => {
  try {
    const { medicine_id } = req.params;
    const { expiry_date } = req.body;

    if (!medicine_id) {
      return res.status(400).json({
        message: "Medicine ID is required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build query to find expired supply order items
    const query = {
      medicine_id: medicine_id,
      expiry_date: { $exists: true, $lt: today },
    };

    // If specific expiry_date is provided, match that exact date
    if (expiry_date) {
      const targetDate = new Date(expiry_date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.expiry_date = {
        $gte: targetDate,
        $lt: nextDay,
      };
    }

    // Delete all matching expired supply order items
    const result = await SupplyOrderItem.deleteMany(query);

    res.json({
      message: "Expired medicine items removed successfully",
      deletedCount: result.deletedCount,
      medicine_id: medicine_id,
    });
  } catch (error) {
    console.error("Error removing expired medicine:", error);
    res.status(500).json({
      message: "Error removing expired medicine",
      error: error.message,
    });
  }
};
