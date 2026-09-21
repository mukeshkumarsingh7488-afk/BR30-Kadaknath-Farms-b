import mongoose from "mongoose";

import Farm from "../models/Farm.js";
import FarmReport from "../models/FarmReport.js";
import Sale from "../models/Sale.js";
import FarmExpense from "../models/FarmExpense.js";
import Batch from "../models/Batch.js";
import ChicksInward from "../models/ChicksInward.js";
import Mortality from "../models/Mortality.js";
import EggCollection from "../models/EggCollection.js";
import FeedConsumption from "../models/FeedConsumption.js";
import WeightGrowth from "../models/WeightGrowth.js";

const REPORT_TYPES = ["DAILY", "WEEKLY", "MONTHLY", "BATCH", "YEARLY", "CUSTOM"];

const STOCK_SALE_TYPES = ["LIVE_BIRD", "CHICK", "BREEDING_PAIR"];

const roundMoney = (value) => {
  return Math.round((Number(value) || 0) * 100) / 100;
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getDateRange = (periodStart, periodEnd) => {
  return {
    start: startOfDay(periodStart),
    end: endOfDay(periodEnd),
  };
};

const getItemBatchId = (item) => {
  if (!item?.batch) {
    return null;
  }

  if (item.batch?._id) {
    return item.batch._id.toString();
  }

  return item.batch.toString();
};

/*
|--------------------------------------------------------------------------
| Batch-specific sale revenue
|--------------------------------------------------------------------------
| IMPORTANT:
| A single sale can contain products from multiple batches.
|
| Example:
| Batch A = ₹4,000
| Batch B = ₹6,000
| Sale grandTotal = ₹10,000
|
| Batch A report must NOT count ₹10,000.
| It should count only Batch A's item amount.
|
| We use item.totalAmount here.
|--------------------------------------------------------------------------
*/

const getSaleRevenueForBatch = (sale, batchId) => {
  if (!sale?.items?.length || !batchId) {
    return 0;
  }

  const targetBatchId = batchId.toString();

  return sale.items.reduce((total, item) => {
    const itemBatchId = getItemBatchId(item);

    if (!itemBatchId || itemBatchId !== targetBatchId) {
      return total;
    }

    return total + Number(item.totalAmount || 0);
  }, 0);
};

/*
|--------------------------------------------------------------------------
| Batch-specific stock sold
|--------------------------------------------------------------------------
*/

const getSaleBirdsSoldForBatch = (sale, batchId) => {
  if (!sale?.items?.length || !batchId) {
    return 0;
  }

  const targetBatchId = batchId.toString();

  return sale.items.reduce((total, item) => {
    const itemBatchId = getItemBatchId(item);

    if (!itemBatchId || itemBatchId !== targetBatchId) {
      return total;
    }

    if (item.productType === "LIVE_BIRD") {
      return total + Number(item.quantity || 0);
    }

    if (item.productType === "CHICK") {
      return total + Number(item.quantity || 0);
    }

    if (item.productType === "BREEDING_PAIR") {
      return total + Number(item.quantity || 0) * 2;
    }

    return total;
  }, 0);
};

/*
|--------------------------------------------------------------------------
| Farm-level stock sold
|--------------------------------------------------------------------------
*/

const getSaleBirdsSold = (sale) => {
  if (!sale?.items?.length) {
    return 0;
  }

  return sale.items.reduce((total, item) => {
    if (item.productType === "LIVE_BIRD") {
      return total + Number(item.quantity || 0);
    }

    if (item.productType === "CHICK") {
      return total + Number(item.quantity || 0);
    }

    if (item.productType === "BREEDING_PAIR") {
      return total + Number(item.quantity || 0) * 2;
    }

    return total;
  }, 0);
};

/*
|--------------------------------------------------------------------------
| Ownership
|--------------------------------------------------------------------------
*/

const validateFarmOwnership = async (farmId, userId) => {
  if (!isValidObjectId(farmId)) {
    return {
      error: "Invalid farm ID",
    };
  }

  const farm = await Farm.findOne({
    _id: farmId,
    owner: userId,
  });

  if (!farm) {
    return {
      error: "Farm not found or you do not have access to this farm",
    };
  }

  return {
    farm,
  };
};

/*
|--------------------------------------------------------------------------
| Expense category mapping
|--------------------------------------------------------------------------
*/

const calculateExpenseBreakdown = (expenses) => {
  const breakdown = {
    feed: 0,
    medicine: 0,
    vaccine: 0,
    chicks: 0,
    labor: 0,
    electricity: 0,
    water: 0,
    maintenance: 0,
    transport: 0,
    veterinary: 0,
    other: 0,
  };

  expenses.forEach((expense) => {
    const amount = Number(expense.amount || 0);
    const category = expense.category;

    switch (category) {
      case "FEED":
        breakdown.feed += amount;
        break;

      case "MEDICINE":
        breakdown.medicine += amount;
        break;

      case "VACCINE":
        breakdown.vaccine += amount;
        break;

      case "CHICKS":
        breakdown.chicks += amount;
        break;

      case "LABOR":
        breakdown.labor += amount;
        break;

      case "ELECTRICITY":
        breakdown.electricity += amount;
        break;

      case "WATER":
        breakdown.water += amount;
        break;

      case "MAINTENANCE":
        breakdown.maintenance += amount;
        break;

      case "TRANSPORT":
        breakdown.transport += amount;
        break;

      case "VETERINARY":
        breakdown.veterinary += amount;
        break;

      default:
        breakdown.other += amount;
        break;
    }
  });

  Object.keys(breakdown).forEach((key) => {
    breakdown[key] = roundMoney(breakdown[key]);
  });

  return breakdown;
};

/*
|--------------------------------------------------------------------------
| Get revenue for farm
|--------------------------------------------------------------------------
*/

const calculateFarmRevenue = (sales) => {
  return roundMoney(sales.reduce((total, sale) => total + Number(sale.grandTotal || 0), 0));
};

/*
|--------------------------------------------------------------------------
| Get revenue for batch
|--------------------------------------------------------------------------
*/

const calculateBatchRevenue = (sales, batchId) => {
  return roundMoney(sales.reduce((total, sale) => total + getSaleRevenueForBatch(sale, batchId), 0));
};

/*
|--------------------------------------------------------------------------
| Get egg statistics
|--------------------------------------------------------------------------
*/

const calculateEggStats = (eggCollections) => {
  let totalCollected = 0;
  let goodEggs = 0;
  let damagedEggs = 0;
  let crackedEggs = 0;

  eggCollections.forEach((record) => {
    totalCollected += Number(record.quantity || 0);
    goodEggs += Number(record.goodEggs || 0);
    damagedEggs += Number(record.damagedEggs || 0);
    crackedEggs += Number(record.crackedEggs || 0);
  });

  return {
    totalCollected,
    goodEggs,
    damagedEggs,
    crackedEggs,
  };
};

/*
|--------------------------------------------------------------------------
| Get latest weight statistics
|--------------------------------------------------------------------------
*/

const calculateWeightStats = (weightRecords) => {
  if (!weightRecords.length) {
    return {
      averageWeightKg: 0,
      weightGainKg: 0,
      averageDailyGainKg: 0,
    };
  }

  const sorted = [...weightRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  const latest = sorted[sorted.length - 1];

  let weightGainKg = Number(latest.weightGainFromPreviousKg || 0);

  let averageDailyGainKg = Number(latest.averageDailyGainKg || 0);

  /*
  |--------------------------------------------------------------------------
  | If the latest record does not have calculated gain,
  | calculate it from first and latest records.
  |--------------------------------------------------------------------------
  */

  if (sorted.length >= 2) {
    const first = sorted[0];

    const firstWeight = Number(first.averageWeightKg || 0);
    const latestWeight = Number(latest.averageWeightKg || 0);

    if (latest.averageWeightKg != null && first.averageWeightKg != null) {
      const calculatedGain = latestWeight - firstWeight;

      if (calculatedGain >= 0) {
        weightGainKg = calculatedGain;
      }

      const firstDate = new Date(first.date);
      const latestDate = new Date(latest.date);

      const days = Math.max(1, Math.ceil((latestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

      averageDailyGainKg = weightGainKg / days;
    }
  }

  return {
    averageWeightKg: roundMoney(latest.averageWeightKg),
    weightGainKg: roundMoney(weightGainKg),
    averageDailyGainKg: roundMoney(averageDailyGainKg),
  };
};

/*
|--------------------------------------------------------------------------
| Calculate opening stock
|--------------------------------------------------------------------------
|
| We reconstruct stock using:
|
| Initial batch quantity
| + accepted inward
| - mortality
| - birds sold
|
|--------------------------------------------------------------------------
*/

const calculateOpeningAndClosingStock = ({ batches, inwardRecords, mortalityRecords, sales, periodStart, periodEnd, batchId = null }) => {
  const targetBatchId = batchId ? batchId.toString() : null;

  const relevantBatches = batchId ? batches.filter((batch) => batch._id.toString() === targetBatchId) : batches;

  let initialQuantity = 0;

  relevantBatches.forEach((batch) => {
    initialQuantity += Number(batch.initialQuantity || 0);
  });

  const inwardBeforePeriod = inwardRecords
    .filter((record) => {
      const date = new Date(record.inwardDate);

      if (date >= periodStart) {
        return false;
      }

      if (!targetBatchId) {
        return true;
      }

      return record.batch && record.batch.toString() === targetBatchId;
    })
    .reduce((total, record) => total + Number(record.acceptedQuantity || 0), 0);

  const mortalityBeforePeriod = mortalityRecords
    .filter((record) => {
      const date = new Date(record.date);

      if (date >= periodStart) {
        return false;
      }

      if (!targetBatchId) {
        return true;
      }

      return record.batch && record.batch.toString() === targetBatchId;
    })
    .reduce((total, record) => total + Number(record.quantity || 0), 0);

  const salesBeforePeriod = sales.reduce((total, sale) => {
    const saleDate = new Date(sale.saleDate);

    if (saleDate >= periodStart) {
      return total;
    }

    if (targetBatchId) {
      return total + getSaleBirdsSoldForBatch(sale, targetBatchId);
    }

    return total + getSaleBirdsSold(sale);
  }, 0);

  const openingBirds = Math.max(0, initialQuantity + inwardBeforePeriod - mortalityBeforePeriod - salesBeforePeriod);

  const mortalityDuringPeriod = mortalityRecords
    .filter((record) => {
      const date = new Date(record.date);

      if (date < periodStart || date > periodEnd) {
        return false;
      }

      if (!targetBatchId) {
        return true;
      }

      return record.batch && record.batch.toString() === targetBatchId;
    })
    .reduce((total, record) => total + Number(record.quantity || 0), 0);

  const inwardDuringPeriod = inwardRecords
    .filter((record) => {
      const date = new Date(record.inwardDate);

      if (date < periodStart || date > periodEnd) {
        return false;
      }

      if (!targetBatchId) {
        return true;
      }

      return record.batch && record.batch.toString() === targetBatchId;
    })
    .reduce((total, record) => total + Number(record.acceptedQuantity || 0), 0);

  const birdsSoldDuringPeriod = sales.reduce((total, sale) => {
    const saleDate = new Date(sale.saleDate);

    if (saleDate < periodStart || saleDate > periodEnd) {
      return total;
    }

    if (targetBatchId) {
      return total + getSaleBirdsSoldForBatch(sale, targetBatchId);
    }

    return total + getSaleBirdsSold(sale);
  }, 0);

  const closingBirds = Math.max(0, openingBirds + inwardDuringPeriod - mortalityDuringPeriod - birdsSoldDuringPeriod);

  return {
    openingBirds,
    inwardBirds: inwardDuringPeriod,
    mortality: mortalityDuringPeriod,
    birdsSold: birdsSoldDuringPeriod,
    closingBirds,
  };
};

/*
|--------------------------------------------------------------------------
| Generate Farm Report
|--------------------------------------------------------------------------
*/

export const generateFarmReport = async (req, res, next) => {
  try {
    const { farm, batch, reportType = "CUSTOM", periodStart, periodEnd, notes = "" } = req.body;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm ID is required",
      });
    }

    if (!isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm ID",
      });
    }

    if (!REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: "Period start and period end are required",
      });
    }

    if (!isValidDate(periodStart) || !isValidDate(periodEnd)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report dates",
      });
    }

    const { start, end } = getDateRange(periodStart, periodEnd);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Period start cannot be after period end",
      });
    }

    if (reportType === "BATCH" && !batch) {
      return res.status(400).json({
        success: false,
        message: "Batch ID is required for batch report",
      });
    }

    if (batch && !isValidObjectId(batch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const ownership = await validateFarmOwnership(farm, req.user._id);

    if (ownership.error) {
      return res.status(403).json({
        success: false,
        message: ownership.error,
      });
    }

    let batchRecord = null;

    if (batch) {
      batchRecord = await Batch.findOne({
        _id: batch,
        farm,
      });

      if (!batchRecord) {
        return res.status(404).json({
          success: false,
          message: "Batch not found in this farm",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Load source records
    |--------------------------------------------------------------------------
    */

    const [batches, inwardRecords, mortalityRecords, eggCollections, feedConsumptions, weightRecords, sales, expenses] = await Promise.all([
      Batch.find({
        farm,
      }).lean(),

      ChicksInward.find({
        farm,
        inwardDate: {
          $lte: end,
        },
      }).lean(),

      Mortality.find({
        farm,
        date: {
          $lte: end,
        },
      }).lean(),

      EggCollection.find({
        farm,
        collectionDate: {
          $gte: start,
          $lte: end,
        },
        ...(batch ? { batch } : {}),
      }).lean(),

      FeedConsumption.find({
        farm,
        consumptionDate: {
          $gte: start,
          $lte: end,
        },
        ...(batch ? { batch } : {}),
      }).lean(),

      WeightGrowth.find({
        farm,
        date: {
          $gte: start,
          $lte: end,
        },
        ...(batch ? { batch } : {}),
      })
        .sort({ date: 1 })
        .lean(),

      Sale.find({
        farm,
        saleDate: {
          $lte: end,
        },
        deliveryStatus: {
          $ne: "CANCELLED",
        },
        ...(batch
          ? {
              "items.batch": batch,
            }
          : {}),
      }).lean(),

      FarmExpense.find({
        farm,
        expenseDate: {
          $gte: start,
          $lte: end,
        },
        ...(batch
          ? {
              $or: [{ batch }, { batch: null }],
            }
          : {}),
      }).lean(),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Revenue
    |--------------------------------------------------------------------------
    */

    let totalRevenue = 0;

    if (batch) {
      /*
      IMPORTANT FIX:
      Only matching batch items are counted.
      Sale.grandTotal is NOT used for batch revenue.
      */
      totalRevenue = calculateBatchRevenue(sales, batch);
    } else {
      totalRevenue = calculateFarmRevenue(sales.filter((sale) => sale.deliveryStatus !== "CANCELLED"));
    }

    const otherIncome = 0;

    const totalRevenueWithOtherIncome = roundMoney(totalRevenue + otherIncome);

    /*
    |--------------------------------------------------------------------------
    | Expenses
    |--------------------------------------------------------------------------
    */

    const expenseBreakdown = calculateExpenseBreakdown(expenses);

    const totalExpenses = roundMoney(expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0));

    /*
    |--------------------------------------------------------------------------
    | Bird statistics
    |--------------------------------------------------------------------------
    */

    const stockStats = calculateOpeningAndClosingStock({
      batches,
      inwardRecords,
      mortalityRecords,
      sales,
      periodStart: start,
      periodEnd: end,
      batchId: batch || null,
    });

    /*
    |--------------------------------------------------------------------------
    | Egg statistics
    |--------------------------------------------------------------------------
    */

    const eggStats = calculateEggStats(eggCollections);

    /*
    |--------------------------------------------------------------------------
    | Feed statistics
    |--------------------------------------------------------------------------
    */

    const totalConsumedKg = roundMoney(feedConsumptions.reduce((total, record) => total + Number(record.quantityKg || 0), 0));

    const totalFeedCost = roundMoney(feedConsumptions.reduce((total, record) => total + Number(record.totalCost || 0), 0));

    const averageFeedPerBirdGram = stockStats.closingBirds > 0 ? roundMoney((totalConsumedKg * 1000) / stockStats.closingBirds) : 0;

    /*
    |--------------------------------------------------------------------------
    | Weight statistics
    |--------------------------------------------------------------------------
    */

    const weightStats = calculateWeightStats(weightRecords);

    /*
    |--------------------------------------------------------------------------
    | Profitability
    |--------------------------------------------------------------------------
    */

    const grossProfit = roundMoney(totalRevenueWithOtherIncome - totalExpenses);

    const profitMarginPercentage = totalRevenueWithOtherIncome > 0 ? roundMoney((grossProfit / totalRevenueWithOtherIncome) * 100) : 0;

    const costPerBird = stockStats.closingBirds > 0 ? roundMoney(totalExpenses / stockStats.closingBirds) : 0;

    const revenuePerBird = stockStats.closingBirds > 0 ? roundMoney(totalRevenueWithOtherIncome / stockStats.closingBirds) : 0;

    const mortalityPercentage = stockStats.openingBirds + stockStats.inwardBirds > 0 ? roundMoney((stockStats.mortality / (stockStats.openingBirds + stockStats.inwardBirds)) * 100) : 0;

    const fcr = weightStats.weightGainKg > 0 ? roundMoney(totalConsumedKg / weightStats.weightGainKg) : 0;

    /*
    |--------------------------------------------------------------------------
    | Create snapshot
    |--------------------------------------------------------------------------
    */

    const report = await FarmReport.create({
      farm,
      batch: batch || null,

      reportType,

      periodStart: start,
      periodEnd: end,

      revenue: {
        sales: roundMoney(totalRevenue),
        otherIncome: roundMoney(otherIncome),
        totalRevenue: totalRevenueWithOtherIncome,
      },

      expenses: {
        feed: expenseBreakdown.feed,
        medicine: expenseBreakdown.medicine,
        vaccine: expenseBreakdown.vaccine,
        chicks: expenseBreakdown.chicks,
        labor: expenseBreakdown.labor,
        electricity: expenseBreakdown.electricity,
        water: expenseBreakdown.water,
        maintenance: expenseBreakdown.maintenance,
        transport: expenseBreakdown.transport,
        veterinary: expenseBreakdown.veterinary,
        other: expenseBreakdown.other,
        totalExpenses,
      },

      profitability: {
        grossProfit,
        profitMarginPercentage,
        costPerBird,
        revenuePerBird,
      },

      birdStats: {
        openingBirds: stockStats.openingBirds,
        inwardBirds: stockStats.inwardBirds,
        mortality: stockStats.mortality,
        closingBirds: stockStats.closingBirds,
        mortalityPercentage,
        birdsSold: stockStats.birdsSold,
      },

      eggStats: {
        totalCollected: eggStats.totalCollected,
        goodEggs: eggStats.goodEggs,
        damagedEggs: eggStats.damagedEggs,
        crackedEggs: eggStats.crackedEggs,
      },

      feedStats: {
        totalConsumedKg,
        totalFeedCost,
        averageFeedPerBirdGram,
        fcr,
      },

      weightStats: {
        averageWeightKg: weightStats.averageWeightKg,
        weightGainKg: weightStats.weightGainKg,
        averageDailyGainKg: weightStats.averageDailyGainKg,
      },

      generatedAt: new Date(),
      generatedBy: req.user._id,
      notes: String(notes || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Farm report generated successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Farm Reports
|--------------------------------------------------------------------------
*/

export const getFarmReports = async (req, res, next) => {
  try {
    const { farm, batch, reportType, page = 1, limit = 20 } = req.query;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm ID is required",
      });
    }

    if (!isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm ID",
      });
    }

    if (batch && !isValidObjectId(batch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    if (reportType && !REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    const ownership = await validateFarmOwnership(farm, req.user._id);

    if (ownership.error) {
      return res.status(403).json({
        success: false,
        message: ownership.error,
      });
    }

    if (batch) {
      const batchExists = await Batch.exists({
        _id: batch,
        farm,
      });

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found in this farm",
        });
      }
    }

    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);

    const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

    const skip = (safePage - 1) * safeLimit;

    const filter = {
      farm,
    };

    if (batch) {
      filter.batch = batch;
    }

    if (reportType) {
      filter.reportType = reportType;
    }

    const [reports, total] = await Promise.all([
      FarmReport.find(filter)
        .populate("batch", "batchNumber batchName birdType breed status")
        .populate("generatedBy", "name email role")
        .sort({
          periodStart: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      FarmReport.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Single Farm Report
|--------------------------------------------------------------------------
*/

export const getFarmReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await FarmReport.findById(id).populate("farm", "name code status").populate("batch", "batchNumber batchName birdType breed status").populate("generatedBy", "name email role").lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Farm report not found",
      });
    }

    const farmId = report.farm?._id || report.farm;

    const ownership = await validateFarmOwnership(farmId, req.user._id);

    if (ownership.error) {
      return res.status(403).json({
        success: false,
        message: ownership.error,
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Delete Farm Report
|--------------------------------------------------------------------------
*/

export const deleteFarmReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await FarmReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Farm report not found",
      });
    }

    const ownership = await validateFarmOwnership(report.farm, req.user._id);

    if (ownership.error) {
      return res.status(403).json({
        success: false,
        message: ownership.error,
      });
    }

    await FarmReport.deleteOne({
      _id: report._id,
    });

    return res.status(200).json({
      success: true,
      message: "Farm report deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
