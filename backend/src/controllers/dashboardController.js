import Medicine from "../models/medicine.js";
import Sale from "../models/sale.js";
import Prescription from "../models/prescription.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const LOW_STOCK_THRESHOLD = 10; // adjust as you like

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

    // 4) Expired meds (requires expiry_date field in Medicine model)
    // If you don't have expiry_date, you can skip this block.
    let expiredMeds = [];
    try {
      expiredMeds = await Medicine.find({
        expiry_date: { $lt: new Date() },
      }).select("medicine_id name brand expiry_date");
    } catch (e) {
      // ignore if field not in schema
      expiredMeds = [];
    }

    // 5) Total sales for today
    const todaySales = await Sale.aggregate([
      {
        $addFields: {
          saleDate: { $ifNull: ["$sale_datetime", "$createdAt"] },
        },
      },
      {
        $match: {
          saleDate: { $gte: todayStart, $lte: todayEnd },
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

    // 6) Awaited prescriptions: those not yet used in a sale
    const awaitedCount = await Prescription.countDocuments({ is_sale: { $ne: true } });

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
