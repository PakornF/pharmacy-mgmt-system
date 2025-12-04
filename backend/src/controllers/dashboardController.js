import Medicine from "../models/medicine.js";
// import Sale from "../models/Sale.js";              // when you create it
// import Prescription from "../models/Prescription.js"; // when you create it

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

    // 5) Total sales for today (requires Sale model)
    // let todaySales = await Sale.aggregate([
    //   {
    //     $match: {
    //       createdAt: { $gte: todayStart, $lte: todayEnd },
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalRevenue: { $sum: "$total_amount" },
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);
    // const todaySalesTotal = todaySales[0]?.totalRevenue || 0;
    // const todaySalesCount = todaySales[0]?.count || 0;

    // TEMP placeholder if Sale model not ready:
    const todaySalesTotal = 0;
    const todaySalesCount = 0;

    // 6) Awaited prescriptions (requires Prescription model)
    // const awaitedCount = await Prescription.countDocuments({
    //   status: "awaiting",
    // });

    // TEMP placeholder:
    const awaitedCount = 0;

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