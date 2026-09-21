import mongoose from "mongoose";

import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";
import Mortality from "../models/Mortality.js";
import EggCollection from "../models/EggCollection.js";
import FeedInventory from "../models/FeedInventory.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Medicine from "../models/Medicine.js";
import Vaccination from "../models/Vaccination.js";
import Sale from "../models/Sale.js";
import FarmExpense from "../models/FarmExpense.js";
import Task from "../models/Task.js";
import WaterQuality from "../models/WaterQuality.js";
import ShedMaintenance from "../models/ShedMaintenance.js";

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const startOfMonth = (date = new Date()) => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfMonth = (date = new Date()) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
};

const roundNumber = (value, decimals = 2) => {
  const multiplier = 10 ** decimals;

  return Math.round((Number(value || 0) + Number.EPSILON) * multiplier) / multiplier;
};

const validObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getFarmForUser = async (farmId, userId) => {
  if (!validObjectId(farmId)) {
    return null;
  }

  return Farm.findOne({
    _id: farmId,
    owner: userId,
  }).lean();
};

const getDateFilter = (start, end) => ({
  $gte: start,
  $lte: end,
});

/*
|--------------------------------------------------------------------------
| FARM DASHBOARD
|--------------------------------------------------------------------------
*/

export const getFarmDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { farm } = req.query;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "farm is required",
      });
    }

    const farmRecord = await getFarmForUser(farm, userId);

    if (!farmRecord) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    /*
    |--------------------------------------------------------------------------
    | SHEDS
    |--------------------------------------------------------------------------
    */

    const [activeSheds, maintenanceSheds] = await Promise.all([
      Shed.countDocuments({
        farm,
        status: "ACTIVE",
      }),

      Shed.countDocuments({
        farm,
        status: "MAINTENANCE",
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | BATCHES
    |--------------------------------------------------------------------------
    */

    const activeBatchStats = await Batch.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          status: "ACTIVE",
        },
      },
      {
        $group: {
          _id: null,
          activeBatches: {
            $sum: 1,
          },
          totalBirds: {
            $sum: "$currentQuantity",
          },
          maleBirds: {
            $sum: "$currentMale",
          },
          femaleBirds: {
            $sum: "$currentFemale",
          },
        },
      },
    ]);

    const batchSummary = activeBatchStats[0] || {
      activeBatches: 0,
      totalBirds: 0,
      maleBirds: 0,
      femaleBirds: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | TODAY MORTALITY
    |--------------------------------------------------------------------------
    */

    const todayMortalityStats = await Mortality.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          date: getDateFilter(todayStart, todayEnd),
        },
      },
      {
        $group: {
          _id: null,
          quantity: {
            $sum: "$quantity",
          },
          records: {
            $sum: 1,
          },
        },
      },
    ]);

    const todayMortality = todayMortalityStats[0] || {
      quantity: 0,
      records: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MONTH MORTALITY
    |--------------------------------------------------------------------------
    */

    const monthlyMortalityStats = await Mortality.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          date: getDateFilter(monthStart, monthEnd),
        },
      },
      {
        $group: {
          _id: null,
          quantity: {
            $sum: "$quantity",
          },
        },
      },
    ]);

    const monthlyMortality = monthlyMortalityStats[0]?.quantity || 0;

    /*
    |--------------------------------------------------------------------------
    | TODAY EGGS
    |--------------------------------------------------------------------------
    */

    const todayEggStats = await EggCollection.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          collectionDate: getDateFilter(todayStart, todayEnd),
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: {
            $sum: "$quantity",
          },
          goodEggs: {
            $sum: "$goodEggs",
          },
          damagedEggs: {
            $sum: "$damagedEggs",
          },
          crackedEggs: {
            $sum: "$crackedEggs",
          },
        },
      },
    ]);

    const todayEggs = todayEggStats[0] || {
      totalCollected: 0,
      goodEggs: 0,
      damagedEggs: 0,
      crackedEggs: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MONTH EGGS
    |--------------------------------------------------------------------------
    */

    const monthlyEggStats = await EggCollection.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          collectionDate: getDateFilter(monthStart, monthEnd),
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: {
            $sum: "$quantity",
          },
          goodEggs: {
            $sum: "$goodEggs",
          },
          damagedEggs: {
            $sum: "$damagedEggs",
          },
          crackedEggs: {
            $sum: "$crackedEggs",
          },
        },
      },
    ]);

    const monthlyEggs = monthlyEggStats[0] || {
      totalCollected: 0,
      goodEggs: 0,
      damagedEggs: 0,
      crackedEggs: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | FEED INVENTORY
    |--------------------------------------------------------------------------
    */

    const feedStats = await FeedInventory.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
        },
      },
      {
        $group: {
          _id: null,
          totalStockKg: {
            $sum: "$currentStockKg",
          },
          totalReceivedKg: {
            $sum: "$quantityReceivedKg",
          },
          totalUsedKg: {
            $sum: "$quantityUsedKg",
          },
        },
      },
    ]);

    const feedSummary = feedStats[0] || {
      totalStockKg: 0,
      totalReceivedKg: 0,
      totalUsedKg: 0,
    };

    const lowFeedCount = await FeedInventory.countDocuments({
      farm,
      status: {
        $in: ["LOW_STOCK", "OUT_OF_STOCK", "EXPIRED"],
      },
    });

    /*
    |--------------------------------------------------------------------------
    | TODAY FEED CONSUMPTION
    |--------------------------------------------------------------------------
    */

    const todayFeedStats = await FeedConsumption.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          consumptionDate: getDateFilter(todayStart, todayEnd),
        },
      },
      {
        $group: {
          _id: null,
          quantityKg: {
            $sum: "$quantityKg",
          },
          totalCost: {
            $sum: "$totalCost",
          },
        },
      },
    ]);

    const todayFeed = todayFeedStats[0] || {
      quantityKg: 0,
      totalCost: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MONTH FEED CONSUMPTION
    |--------------------------------------------------------------------------
    */

    const monthlyFeedStats = await FeedConsumption.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          consumptionDate: getDateFilter(monthStart, monthEnd),
        },
      },
      {
        $group: {
          _id: null,
          quantityKg: {
            $sum: "$quantityKg",
          },
          totalCost: {
            $sum: "$totalCost",
          },
        },
      },
    ]);

    const monthlyFeed = monthlyFeedStats[0] || {
      quantityKg: 0,
      totalCost: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MEDICINE
    |--------------------------------------------------------------------------
    */

    const medicineStock = await Medicine.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
        },
      },
      {
        $group: {
          _id: null,
          totalStock: {
            $sum: "$currentStock",
          },
        },
      },
    ]);

    const lowMedicineCount = await Medicine.countDocuments({
      farm,
      status: {
        $in: ["LOW_STOCK", "OUT_OF_STOCK", "EXPIRED"],
      },
    });

    /*
    |--------------------------------------------------------------------------
    | VACCINATION
    |--------------------------------------------------------------------------
    */

    const upcomingVaccinations = await Vaccination.countDocuments({
      farm,
      status: "SCHEDULED",
      scheduledDate: {
        $gte: todayStart,
      },
    });

    const overdueVaccinations = await Vaccination.countDocuments({
      farm,
      status: "SCHEDULED",
      scheduledDate: {
        $lt: todayStart,
      },
    });

    const todayVaccinations = await Vaccination.countDocuments({
      farm,
      scheduledDate: getDateFilter(todayStart, todayEnd),
    });

    /*
    |--------------------------------------------------------------------------
    | TODAY SALES
    |--------------------------------------------------------------------------
    */

    const todaySalesStats = await Sale.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          saleDate: getDateFilter(todayStart, todayEnd),
          deliveryStatus: {
            $ne: "CANCELLED",
          },
        },
      },
      {
        $group: {
          _id: null,
          salesAmount: {
            $sum: "$grandTotal",
          },
          paidAmount: {
            $sum: "$paidAmount",
          },
          dueAmount: {
            $sum: "$dueAmount",
          },
          orders: {
            $sum: 1,
          },
        },
      },
    ]);

    const todaySales = todaySalesStats[0] || {
      salesAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      orders: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MONTH SALES
    |--------------------------------------------------------------------------
    */

    const monthlySalesStats = await Sale.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          saleDate: getDateFilter(monthStart, monthEnd),
          deliveryStatus: {
            $ne: "CANCELLED",
          },
        },
      },
      {
        $group: {
          _id: null,
          salesAmount: {
            $sum: "$grandTotal",
          },
          paidAmount: {
            $sum: "$paidAmount",
          },
          dueAmount: {
            $sum: "$dueAmount",
          },
          orders: {
            $sum: 1,
          },
        },
      },
    ]);

    const monthlySales = monthlySalesStats[0] || {
      salesAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      orders: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | TODAY EXPENSE
    |--------------------------------------------------------------------------
    */

    const todayExpenseStats = await FarmExpense.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          expenseDate: getDateFilter(todayStart, todayEnd),
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: "$amount",
          },
          paidAmount: {
            $sum: "$paidAmount",
          },
          dueAmount: {
            $sum: "$dueAmount",
          },
        },
      },
    ]);

    const todayExpenses = todayExpenseStats[0] || {
      amount: 0,
      paidAmount: 0,
      dueAmount: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | MONTH EXPENSE
    |--------------------------------------------------------------------------
    */

    const monthlyExpenseStats = await FarmExpense.aggregate([
      {
        $match: {
          farm: new mongoose.Types.ObjectId(farm),
          expenseDate: getDateFilter(monthStart, monthEnd),
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: "$amount",
          },
          paidAmount: {
            $sum: "$paidAmount",
          },
          dueAmount: {
            $sum: "$dueAmount",
          },
        },
      },
    ]);

    const monthlyExpenses = monthlyExpenseStats[0] || {
      amount: 0,
      paidAmount: 0,
      dueAmount: 0,
    };

    /*
    |--------------------------------------------------------------------------
    | TASKS
    |--------------------------------------------------------------------------
    */

    const pendingTasks = await Task.countDocuments({
      farm,
      status: {
        $in: ["PENDING", "IN_PROGRESS"],
      },
    });

    const overdueTasks = await Task.countDocuments({
      farm,
      status: "OVERDUE",
    });

    const todayTasks = await Task.countDocuments({
      farm,
      dueDate: getDateFilter(todayStart, todayEnd),
      status: {
        $nin: ["COMPLETED", "CANCELLED"],
      },
    });

    /*
    |--------------------------------------------------------------------------
    | WATER QUALITY
    |--------------------------------------------------------------------------
    */

    const latestWaterQuality = await WaterQuality.findOne({
      farm,
    })
      .sort({
        testDate: -1,
      })
      .select("testDate sampleLocation source overallStatus ph tdsPpm microbialTest")
      .lean();

    /*
    |--------------------------------------------------------------------------
    | MAINTENANCE
    |--------------------------------------------------------------------------
    */

    const pendingMaintenance = await ShedMaintenance.countDocuments({
      farm,
      status: {
        $in: ["PENDING", "IN_PROGRESS"],
      },
    });

    const overdueMaintenance = await ShedMaintenance.countDocuments({
      farm,
      status: {
        $in: ["PENDING", "IN_PROGRESS"],
      },
      scheduledDate: {
        $lt: todayStart,
        $ne: null,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | PROFIT
    |--------------------------------------------------------------------------
    */

    const todayProfit = roundNumber(Number(todaySales.salesAmount || 0) - Number(todayExpenses.amount || 0));

    const monthlyProfit = roundNumber(Number(monthlySales.salesAmount || 0) - Number(monthlyExpenses.amount || 0));

    const monthlyProfitMargin = Number(monthlySales.salesAmount || 0) > 0 ? roundNumber((monthlyProfit / Number(monthlySales.salesAmount)) * 100) : 0;

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      dashboardDate: todayStart,

      farm: {
        id: farmRecord._id,
        name: farmRecord.name,
        code: farmRecord.code,
        status: farmRecord.status,
      },

      birds: {
        totalActiveBirds: Number(batchSummary.totalBirds) || 0,

        maleBirds: Number(batchSummary.maleBirds) || 0,

        femaleBirds: Number(batchSummary.femaleBirds) || 0,

        activeBatches: Number(batchSummary.activeBatches) || 0,

        todayMortality: Number(todayMortality.quantity) || 0,

        monthlyMortality: Number(monthlyMortality) || 0,
      },

      sheds: {
        active: activeSheds,
        maintenance: maintenanceSheds,
      },

      eggs: {
        today: {
          totalCollected: Number(todayEggs.totalCollected) || 0,

          goodEggs: Number(todayEggs.goodEggs) || 0,

          damagedEggs: Number(todayEggs.damagedEggs) || 0,

          crackedEggs: Number(todayEggs.crackedEggs) || 0,
        },

        monthly: {
          totalCollected: Number(monthlyEggs.totalCollected) || 0,

          goodEggs: Number(monthlyEggs.goodEggs) || 0,

          damagedEggs: Number(monthlyEggs.damagedEggs) || 0,

          crackedEggs: Number(monthlyEggs.crackedEggs) || 0,
        },
      },

      feed: {
        totalStockKg: roundNumber(feedSummary.totalStockKg),

        totalReceivedKg: roundNumber(feedSummary.totalReceivedKg),

        totalUsedKg: roundNumber(feedSummary.totalUsedKg),

        lowStockItems: lowFeedCount,

        todayConsumptionKg: roundNumber(todayFeed.quantityKg),

        todayCost: roundNumber(todayFeed.totalCost),

        monthlyConsumptionKg: roundNumber(monthlyFeed.quantityKg),

        monthlyCost: roundNumber(monthlyFeed.totalCost),
      },

      medicine: {
        totalStock: roundNumber(medicineStock[0]?.totalStock || 0),

        lowStockItems: lowMedicineCount,
      },

      vaccination: {
        today: todayVaccinations,
        upcoming: upcomingVaccinations,
        overdue: overdueVaccinations,
      },

      sales: {
        today: {
          orders: Number(todaySales.orders) || 0,

          total: roundNumber(todaySales.salesAmount),

          paid: roundNumber(todaySales.paidAmount),

          due: roundNumber(todaySales.dueAmount),
        },

        monthly: {
          orders: Number(monthlySales.orders) || 0,

          total: roundNumber(monthlySales.salesAmount),

          paid: roundNumber(monthlySales.paidAmount),

          due: roundNumber(monthlySales.dueAmount),
        },
      },

      expenses: {
        today: {
          total: roundNumber(todayExpenses.amount),

          paid: roundNumber(todayExpenses.paidAmount),

          due: roundNumber(todayExpenses.dueAmount),
        },

        monthly: {
          total: roundNumber(monthlyExpenses.amount),

          paid: roundNumber(monthlyExpenses.paidAmount),

          due: roundNumber(monthlyExpenses.dueAmount),
        },
      },

      profitability: {
        today: {
          revenue: roundNumber(todaySales.salesAmount),

          expense: roundNumber(todayExpenses.amount),

          profit: todayProfit,
        },

        monthly: {
          revenue: roundNumber(monthlySales.salesAmount),

          expense: roundNumber(monthlyExpenses.amount),

          profit: monthlyProfit,

          profitMarginPercentage: monthlyProfitMargin,
        },
      },

      tasks: {
        today: todayTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
      },

      maintenance: {
        pending: pendingMaintenance,
        overdue: overdueMaintenance,
      },

      waterQuality: {
        latest: latestWaterQuality || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
