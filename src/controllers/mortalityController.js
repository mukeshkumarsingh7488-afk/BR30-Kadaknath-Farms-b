import Mortality from "../models/Mortality.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";

import WeightGrowth from "../models/WeightGrowth.js";
import EggCollection from "../models/EggCollection.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Vaccination from "../models/Vaccination.js";
import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";
import Task from "../models/Task.js";
import FarmReport from "../models/FarmReport.js";
import FarmExpense from "../models/FarmExpense.js";
import Sale from "../models/Sale.js";

const createMortality = async (req, res) => {
  try {
    const { farm, shed, batch, date, quantity, cause, causeDetails, ageInDays, maleCount, femaleCount, disposed, disposalMethod, disposalDate, notes } = req.body;

    if (!farm || !shed || !batch || !date || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed, batch, date and mortality quantity are required",
      });
    }

    const farmExists = await Farm.findOne({
      _id: farm,
      owner: req.user._id,
    });

    if (!farmExists) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    const shedExists = await Shed.findOne({
      _id: shed,
      farm,
    });

    if (!shedExists) {
      return res.status(404).json({
        success: false,
        message: "Shed not found in this farm",
      });
    }

    const batchExists = await Batch.findOne({
      _id: batch,
      farm,
      shed,
    });

    if (!batchExists) {
      return res.status(404).json({
        success: false,
        message: "Batch not found in this farm and shed",
      });
    }

    const mortalityQuantity = Number(quantity);
    const mortalityMaleCount = Number(maleCount || 0);
    const mortalityFemaleCount = Number(femaleCount || 0);

    if (!Number.isFinite(mortalityQuantity) || mortalityQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Mortality quantity must be at least 1",
      });
    }

    if (!Number.isFinite(mortalityMaleCount) || !Number.isFinite(mortalityFemaleCount) || mortalityMaleCount < 0 || mortalityFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Male and female mortality cannot be negative",
      });
    }

    if (mortalityQuantity > batchExists.currentQuantity) {
      return res.status(400).json({
        success: false,
        message: "Mortality quantity cannot exceed current batch birds",
      });
    }

    if (mortalityMaleCount + mortalityFemaleCount > mortalityQuantity) {
      return res.status(400).json({
        success: false,
        message: "Male and female mortality cannot exceed total mortality",
      });
    }

    if (mortalityMaleCount > batchExists.currentMaleCount) {
      return res.status(400).json({
        success: false,
        message: "Male mortality cannot exceed current male birds",
      });
    }

    if (mortalityFemaleCount > batchExists.currentFemaleCount) {
      return res.status(400).json({
        success: false,
        message: "Female mortality cannot exceed current female birds",
      });
    }

    if (mortalityQuantity > shedExists.currentBirds) {
      return res.status(400).json({
        success: false,
        message: "Mortality quantity cannot exceed current shed birds",
      });
    }

    if (disposed && disposalMethod && !disposalDate) {
      return res.status(400).json({
        success: false,
        message: "Disposal date is required when disposal method is provided",
      });
    }

    const mortality = await Mortality.create({
      farm,
      shed,
      batch,
      date,
      quantity: mortalityQuantity,
      cause: cause || "UNKNOWN",
      causeDetails: causeDetails || "",
      ageInDays: ageInDays !== undefined ? ageInDays : null,
      maleCount: mortalityMaleCount,
      femaleCount: mortalityFemaleCount,
      disposed: Boolean(disposed),
      disposalMethod: disposalMethod || null,
      disposalDate: disposalDate || null,
      reportedBy: req.user._id,
      notes: notes || "",
    });

    batchExists.currentQuantity -= mortalityQuantity;
    batchExists.currentMaleCount -= mortalityMaleCount;
    batchExists.currentFemaleCount -= mortalityFemaleCount;

    shedExists.currentBirds -= mortalityQuantity;

    if (batchExists.currentQuantity === 0) {
      batchExists.status = "COMPLETED";
      batchExists.completedAt = new Date();
    }

    await batchExists.save();
    await shedExists.save();

    return res.status(201).json({
      success: true,
      message: "Mortality recorded successfully",
      mortality,
    });
  } catch (error) {
    console.error("Create mortality error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record mortality",
    });
  }
};

const getMortalities = async (req, res) => {
  try {
    const { farm, shed, batch, cause, from, to } = req.query;

    const farms = await Farm.find({
      owner: req.user._id,
      ...(farm ? { _id: farm } : {}),
    }).select("_id");

    const farmIds = farms.map((item) => item._id);

    const filter = {
      farm: { $in: farmIds },
    };

    if (shed) filter.shed = shed;
    if (batch) filter.batch = batch;
    if (cause) filter.cause = cause;

    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const mortalities = await Mortality.find(filter).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName birdType breed currentQuantity").populate("reportedBy", "name email").sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: mortalities.length,
      mortalities,
    });
  } catch (error) {
    console.error("Get mortalities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch mortality records",
    });
  }
};

const getMortalityById = async (req, res) => {
  try {
    const mortality = await Mortality.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code capacity currentBirds").populate("batch", "batchNumber batchName birdType breed currentQuantity currentMaleCount currentFemaleCount").populate("reportedBy", "name email");

    if (!mortality) {
      return res.status(404).json({
        success: false,
        message: "Mortality record not found",
      });
    }

    if (mortality.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this mortality record",
      });
    }

    return res.status(200).json({
      success: true,
      mortality,
    });
  } catch (error) {
    console.error("Get mortality error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch mortality record",
    });
  }
};

const updateMortality = async (req, res) => {
  try {
    const mortality = await Mortality.findById(req.params.id).populate("farm", "owner").populate("shed").populate("batch");

    if (!mortality) {
      return res.status(404).json({
        success: false,
        message: "Mortality record not found",
      });
    }

    if (mortality.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this mortality record",
      });
    }

    const { date, quantity, cause, causeDetails, ageInDays, maleCount, femaleCount, disposed, disposalMethod, disposalDate, notes } = req.body;

    const oldQuantity = mortality.quantity;
    const oldMaleCount = mortality.maleCount;
    const oldFemaleCount = mortality.femaleCount;

    const newQuantity = quantity !== undefined ? Number(quantity) : oldQuantity;

    const newMaleCount = maleCount !== undefined ? Number(maleCount) : oldMaleCount;

    const newFemaleCount = femaleCount !== undefined ? Number(femaleCount) : oldFemaleCount;

    if (!Number.isFinite(newQuantity) || newQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Mortality quantity must be at least 1",
      });
    }

    if (!Number.isFinite(newMaleCount) || !Number.isFinite(newFemaleCount) || newMaleCount < 0 || newFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Male and female mortality cannot be negative",
      });
    }

    if (newMaleCount + newFemaleCount > newQuantity) {
      return res.status(400).json({
        success: false,
        message: "Invalid male/female mortality count",
      });
    }

    const quantityDifference = newQuantity - oldQuantity;

    const maleDifference = newMaleCount - oldMaleCount;

    const femaleDifference = newFemaleCount - oldFemaleCount;

    const newBatchQuantity = mortality.batch.currentQuantity - quantityDifference;

    const newBatchMaleCount = mortality.batch.currentMaleCount - maleDifference;

    const newBatchFemaleCount = mortality.batch.currentFemaleCount - femaleDifference;

    const newShedBirdCount = mortality.shed.currentBirds - quantityDifference;

    if (newBatchQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Updated mortality would make batch stock negative",
      });
    }

    if (newBatchMaleCount < 0 || newBatchFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Updated mortality would make male/female stock negative",
      });
    }

    if (newBatchMaleCount + newBatchFemaleCount > newBatchQuantity) {
      return res.status(400).json({
        success: false,
        message: "Updated mortality would make sex stock greater than total stock",
      });
    }

    if (newShedBirdCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Updated mortality would make shed stock negative",
      });
    }

    if (newMaleCount > mortality.batch.currentMaleCount + oldMaleCount) {
      return res.status(400).json({
        success: false,
        message: "Male mortality exceeds available male birds",
      });
    }

    if (newFemaleCount > mortality.batch.currentFemaleCount + oldFemaleCount) {
      return res.status(400).json({
        success: false,
        message: "Female mortality exceeds available female birds",
      });
    }

    const finalDisposed = disposed !== undefined ? Boolean(disposed) : mortality.disposed;

    const finalDisposalMethod = disposalMethod !== undefined ? disposalMethod || null : mortality.disposalMethod;

    const finalDisposalDate = disposalDate !== undefined ? disposalDate || null : mortality.disposalDate;

    if (finalDisposed && finalDisposalMethod && !finalDisposalDate) {
      return res.status(400).json({
        success: false,
        message: "Disposal date is required when disposal method is provided",
      });
    }

    if (date !== undefined) {
      mortality.date = date;
    }

    mortality.quantity = newQuantity;

    if (cause !== undefined) {
      mortality.cause = cause;
    }

    if (causeDetails !== undefined) {
      mortality.causeDetails = causeDetails;
    }

    if (ageInDays !== undefined) {
      mortality.ageInDays = ageInDays;
    }

    mortality.maleCount = newMaleCount;
    mortality.femaleCount = newFemaleCount;
    mortality.disposed = finalDisposed;
    mortality.disposalMethod = finalDisposalMethod;
    mortality.disposalDate = finalDisposalDate;

    if (notes !== undefined) {
      mortality.notes = notes;
    }

    await mortality.save();

    mortality.batch.currentQuantity = newBatchQuantity;
    mortality.batch.currentMaleCount = newBatchMaleCount;
    mortality.batch.currentFemaleCount = newBatchFemaleCount;

    if (mortality.batch.currentQuantity === 0) {
      mortality.batch.status = "COMPLETED";
      mortality.batch.completedAt = new Date();
    } else if (mortality.batch.status === "COMPLETED") {
      mortality.batch.status = "ACTIVE";
      mortality.batch.completedAt = null;
    }

    await mortality.batch.save();

    mortality.shed.currentBirds = newShedBirdCount;

    await mortality.shed.save();

    return res.status(200).json({
      success: true,
      message: "Mortality updated successfully",
      mortality,
    });
  } catch (error) {
    console.error("Update mortality error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update mortality",
    });
  }
};

const deleteMortality = async (req, res) => {
  try {
    const mortality = await Mortality.findById(req.params.id).populate("farm", "owner").populate("shed").populate("batch");

    if (!mortality) {
      return res.status(404).json({
        success: false,
        message: "Mortality record not found",
      });
    }

    if (mortality.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this mortality record",
      });
    }

    /*
      ---------------------------------------------------------
      DEPENDENCY CHECK
      ---------------------------------------------------------
      Mortality delete karne ke baad batch stock restore hoga.
      Isliye agar batch par already later farm activity hai,
      delete block karna safer hai.
    */

    const dependencyChecks = await Promise.all([
      WeightGrowth.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      EggCollection.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      FeedConsumption.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      Vaccination.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      VeterinaryHealthLog.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      Task.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      FarmReport.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      FarmExpense.countDocuments({
        farm: mortality.farm._id,
        batch: mortality.batch._id,
      }),

      Sale.countDocuments({
        farm: mortality.farm._id,
        "items.batch": mortality.batch._id,
      }),
    ]);

    const [weightGrowthCount, eggCollectionCount, feedConsumptionCount, vaccinationCount, veterinaryHealthCount, taskCount, farmReportCount, farmExpenseCount, saleCount] = dependencyChecks;

    const dependentRecords = [];

    if (weightGrowthCount > 0) {
      dependentRecords.push({
        module: "Weight & Growth",
        count: weightGrowthCount,
      });
    }

    if (eggCollectionCount > 0) {
      dependentRecords.push({
        module: "Egg Collection",
        count: eggCollectionCount,
      });
    }

    if (feedConsumptionCount > 0) {
      dependentRecords.push({
        module: "Feed Consumption",
        count: feedConsumptionCount,
      });
    }

    if (vaccinationCount > 0) {
      dependentRecords.push({
        module: "Vaccination",
        count: vaccinationCount,
      });
    }

    if (veterinaryHealthCount > 0) {
      dependentRecords.push({
        module: "Veterinary / Health",
        count: veterinaryHealthCount,
      });
    }

    if (taskCount > 0) {
      dependentRecords.push({
        module: "Tasks",
        count: taskCount,
      });
    }

    if (farmReportCount > 0) {
      dependentRecords.push({
        module: "Farm Reports",
        count: farmReportCount,
      });
    }

    if (farmExpenseCount > 0) {
      dependentRecords.push({
        module: "Farm Expenses",
        count: farmExpenseCount,
      });
    }

    if (saleCount > 0) {
      dependentRecords.push({
        module: "Sales",
        count: saleCount,
      });
    }

    if (dependentRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this mortality record because dependent farm records already exist for this batch",
        dependentRecords,
      });
    }

    /*
      ---------------------------------------------------------
      STOCK RESTORE SAFETY
      ---------------------------------------------------------
    */

    if (mortality.shed.currentBirds + mortality.quantity > mortality.shed.capacity) {
      return res.status(400).json({
        success: false,
        message: "Cannot restore birds because shed capacity would be exceeded",
      });
    }

    const newBatchQuantity = mortality.batch.currentQuantity + mortality.quantity;

    const newBatchMaleCount = mortality.batch.currentMaleCount + mortality.maleCount;

    const newBatchFemaleCount = mortality.batch.currentFemaleCount + mortality.femaleCount;

    const newShedBirdCount = mortality.shed.currentBirds + mortality.quantity;

    if (newBatchMaleCount < 0 || newBatchFemaleCount < 0 || newBatchMaleCount + newBatchFemaleCount > newBatchQuantity) {
      return res.status(400).json({
        success: false,
        message: "Cannot restore mortality because batch sex stock would become invalid",
      });
    }

    mortality.batch.currentQuantity = newBatchQuantity;
    mortality.batch.currentMaleCount = newBatchMaleCount;
    mortality.batch.currentFemaleCount = newBatchFemaleCount;

    mortality.shed.currentBirds = newShedBirdCount;

    if (mortality.batch.status === "COMPLETED") {
      mortality.batch.status = "ACTIVE";
      mortality.batch.completedAt = null;
    }

    await mortality.batch.save();
    await mortality.shed.save();

    await Mortality.findByIdAndDelete(mortality._id);

    return res.status(200).json({
      success: true,
      message: "Mortality deleted successfully",
    });
  } catch (error) {
    console.error("Delete mortality error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete mortality",
    });
  }
};

export { createMortality, getMortalities, getMortalityById, updateMortality, deleteMortality };
