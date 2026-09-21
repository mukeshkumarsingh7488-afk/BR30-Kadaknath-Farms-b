import Batch from "../models/Batch.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import ChicksInward from "../models/ChicksInward.js";
import Mortality from "../models/Mortality.js";
import WeightGrowth from "../models/WeightGrowth.js";
import EggCollection from "../models/EggCollection.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Vaccination from "../models/Vaccination.js";
import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";
import Task from "../models/Task.js";
import FarmReport from "../models/FarmReport.js";
import FarmExpense from "../models/FarmExpense.js";
import Sale from "../models/Sale.js";

const createBatch = async (req, res) => {
  try {
    const { farm, shed, batchNumber, batchName, birdType, breed, source, arrivalDate, initialQuantity, currentQuantity, initialMaleCount, initialFemaleCount, currentMaleCount, currentFemaleCount, expectedSaleAgeDays, targetWeightKg, status, notes } = req.body;

    if (!farm || !shed || !batchNumber || !arrivalDate || initialQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed, batch number, arrival date and initial quantity are required",
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

    const normalizedBatchNumber = batchNumber.trim().toUpperCase();

    const existingBatch = await Batch.findOne({
      farm,
      batchNumber: normalizedBatchNumber,
    });

    if (existingBatch) {
      return res.status(409).json({
        success: false,
        message: "Batch number already exists in this farm",
      });
    }

    const initialQty = Number(initialQuantity);

    if (initialQty < 1) {
      return res.status(400).json({
        success: false,
        message: "Initial quantity must be at least 1",
      });
    }

    const finalCurrentQuantity = currentQuantity !== undefined ? Number(currentQuantity) : initialQty;

    const maleCount = currentMaleCount !== undefined ? Number(currentMaleCount) : Number(initialMaleCount || 0);

    const femaleCount = currentFemaleCount !== undefined ? Number(currentFemaleCount) : Number(initialFemaleCount || 0);

    if (maleCount + femaleCount > finalCurrentQuantity) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot exceed current quantity",
      });
    }

    if (finalCurrentQuantity > shedExists.capacity - shedExists.currentBirds) {
      return res.status(400).json({
        success: false,
        message: "Shed does not have enough available capacity",
      });
    }

    const batch = await Batch.create({
      farm,
      shed,
      batchNumber: normalizedBatchNumber,
      batchName: batchName || "",
      birdType: birdType || "CHICKS",
      breed: breed || "Kadaknath",
      source: source || {},
      arrivalDate,
      initialQuantity: initialQty,
      currentQuantity: finalCurrentQuantity,
      initialMaleCount: Number(initialMaleCount || 0),
      initialFemaleCount: Number(initialFemaleCount || 0),
      currentMaleCount: maleCount,
      currentFemaleCount: femaleCount,
      expectedSaleAgeDays: expectedSaleAgeDays !== undefined ? expectedSaleAgeDays : 120,
      targetWeightKg: targetWeightKg !== undefined ? targetWeightKg : 1.5,
      status: status || "ACTIVE",
      notes: notes || "",
      createdBy: req.user._id,
    });

    shedExists.currentBirds += finalCurrentQuantity;

    await shedExists.save();

    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      batch,
    });
  } catch (error) {
    console.error("Create batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create batch",
    });
  }
};

const getBatches = async (req, res) => {
  try {
    const { farm, shed, status } = req.query;

    const farms = await Farm.find({
      owner: req.user._id,
      ...(farm ? { _id: farm } : {}),
    }).select("_id");

    const farmIds = farms.map((item) => item._id);

    const filter = {
      farm: { $in: farmIds },
    };

    if (shed) filter.shed = shed;
    if (status) filter.status = status;

    const batches = await Batch.find(filter).populate("farm", "name code").populate("shed", "name code type capacity currentBirds").populate("createdBy", "name email").sort({
      arrivalDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Get batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batches",
    });
  }
};

const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code type capacity currentBirds status").populate("createdBy", "name email");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (batch.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this batch",
      });
    }

    return res.status(200).json({
      success: true,
      batch,
    });
  } catch (error) {
    console.error("Get batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch",
    });
  }
};

const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate("farm", "owner").populate("shed");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (batch.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this batch",
      });
    }

    const { batchName, birdType, breed, source, arrivalDate, currentQuantity, currentMaleCount, currentFemaleCount, expectedSaleAgeDays, targetWeightKg, status, completedAt, notes } = req.body;

    const newCurrentQuantity = currentQuantity !== undefined ? Number(currentQuantity) : batch.currentQuantity;

    const newMaleCount = currentMaleCount !== undefined ? Number(currentMaleCount) : batch.currentMaleCount;

    const newFemaleCount = currentFemaleCount !== undefined ? Number(currentFemaleCount) : batch.currentFemaleCount;

    if (newCurrentQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Current quantity cannot be negative",
      });
    }

    if (newMaleCount < 0 || newFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot be negative",
      });
    }

    if (newMaleCount + newFemaleCount > newCurrentQuantity) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot exceed current quantity",
      });
    }

    const quantityDifference = newCurrentQuantity - batch.currentQuantity;

    if (quantityDifference > 0 && batch.shed.currentBirds + quantityDifference > batch.shed.capacity) {
      return res.status(400).json({
        success: false,
        message: "Shed does not have enough available capacity",
      });
    }

    if (batchName !== undefined) {
      batch.batchName = batchName;
    }

    if (birdType !== undefined) {
      batch.birdType = birdType;
    }

    if (breed !== undefined) {
      batch.breed = breed;
    }

    if (source !== undefined) {
      batch.source = source;
    }

    if (arrivalDate !== undefined) {
      batch.arrivalDate = arrivalDate;
    }

    batch.currentQuantity = newCurrentQuantity;
    batch.currentMaleCount = newMaleCount;
    batch.currentFemaleCount = newFemaleCount;

    if (expectedSaleAgeDays !== undefined) {
      batch.expectedSaleAgeDays = expectedSaleAgeDays;
    }

    if (targetWeightKg !== undefined) {
      batch.targetWeightKg = targetWeightKg;
    }

    if (status !== undefined) {
      batch.status = status;

      if (status === "COMPLETED" && !batch.completedAt) {
        batch.completedAt = new Date();
      }

      if (status !== "COMPLETED") {
        batch.completedAt = completedAt || batch.completedAt;
      }
    }

    if (completedAt !== undefined) {
      batch.completedAt = completedAt || null;
    }

    if (notes !== undefined) {
      batch.notes = notes;
    }

    await batch.save();

    if (quantityDifference !== 0) {
      batch.shed.currentBirds += quantityDifference;

      if (batch.shed.currentBirds < 0) {
        batch.shed.currentBirds = 0;
      }

      await batch.shed.save();
    }

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      batch,
    });
  } catch (error) {
    console.error("Update batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update batch",
    });
  }
};

const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate("farm", "owner").populate("shed");

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (batch.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this batch",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Current stock protection
    |--------------------------------------------------------------------------
    */

    if (Number(batch.currentQuantity || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a batch that still has birds",
        batch: {
          id: batch._id,
          batchNumber: batch.batchNumber,
          currentQuantity: batch.currentQuantity,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check dependent records
    |--------------------------------------------------------------------------
    */

    const [chicksInwardCount, mortalityCount, weightGrowthCount, eggCollectionCount, feedConsumptionCount, vaccinationCount, veterinaryHealthLogCount, taskCount, farmReportCount, farmExpenseCount, saleCount] = await Promise.all([
      ChicksInward.countDocuments({
        batch: batch._id,
      }),

      Mortality.countDocuments({
        batch: batch._id,
      }),

      WeightGrowth.countDocuments({
        batch: batch._id,
      }),

      EggCollection.countDocuments({
        batch: batch._id,
      }),

      FeedConsumption.countDocuments({
        batch: batch._id,
      }),

      Vaccination.countDocuments({
        batch: batch._id,
      }),

      VeterinaryHealthLog.countDocuments({
        batch: batch._id,
      }),

      Task.countDocuments({
        batch: batch._id,
      }),

      FarmReport.countDocuments({
        batch: batch._id,
      }),

      FarmExpense.countDocuments({
        batch: batch._id,
      }),

      /*
      | Sale batch is stored inside Sale.items.batch
      */
      Sale.countDocuments({
        "items.batch": batch._id,
      }),
    ]);

    const dependentRecords = [
      {
        name: "Chicks Inward",
        count: chicksInwardCount,
      },
      {
        name: "Mortality Records",
        count: mortalityCount,
      },
      {
        name: "Weight & Growth Records",
        count: weightGrowthCount,
      },
      {
        name: "Egg Collection Records",
        count: eggCollectionCount,
      },
      {
        name: "Feed Consumption Records",
        count: feedConsumptionCount,
      },
      {
        name: "Vaccination Records",
        count: vaccinationCount,
      },
      {
        name: "Veterinary Health Logs",
        count: veterinaryHealthLogCount,
      },
      {
        name: "Tasks",
        count: taskCount,
      },
      {
        name: "Farm Reports",
        count: farmReportCount,
      },
      {
        name: "Farm Expenses",
        count: farmExpenseCount,
      },
      {
        name: "Sales",
        count: saleCount,
      },
    ].filter((item) => item.count > 0);

    if (dependentRecords.length > 0) {
      const recordSummary = dependentRecords.map((item) => `${item.name}: ${item.count}`).join(", ");

      return res.status(409).json({
        success: false,
        message: "Batch cannot be deleted because dependent records exist. Delete dependent records first.",
        batch: {
          id: batch._id,
          batchNumber: batch.batchNumber,
          batchName: batch.batchName || "",
        },
        dependentRecords,
        summary: recordSummary,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete batch
    |--------------------------------------------------------------------------
    */

    await Batch.deleteOne({
      _id: batch._id,
    });

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("Delete batch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete batch",
    });
  }
};

export { createBatch, getBatches, getBatchById, updateBatch, deleteBatch };
