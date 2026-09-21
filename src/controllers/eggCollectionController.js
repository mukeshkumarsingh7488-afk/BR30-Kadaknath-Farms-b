import EggCollection from "../models/EggCollection.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isNonNegativeNumber = (value) => {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
};

const validateQualityBreakdown = (quantity, goodEggs, damagedEggs, crackedEggs, dirtyEggs) => {
  const finalGoodEggs = Number(goodEggs);
  const finalDamagedEggs = Number(damagedEggs);
  const finalCrackedEggs = Number(crackedEggs);
  const finalDirtyEggs = Number(dirtyEggs);

  if (!isNonNegativeNumber(finalGoodEggs) || !isNonNegativeNumber(finalDamagedEggs) || !isNonNegativeNumber(finalCrackedEggs) || !isNonNegativeNumber(finalDirtyEggs)) {
    return {
      valid: false,
      message: "Good, damaged, cracked and dirty egg quantities cannot be negative",
    };
  }

  const qualityTotal = finalGoodEggs + finalDamagedEggs + finalCrackedEggs + finalDirtyEggs;

  if (qualityTotal > 0 && qualityTotal !== quantity) {
    return {
      valid: false,
      message: "Good, damaged, cracked and dirty eggs must equal total quantity",
    };
  }

  return {
    valid: true,
    goodEggs: finalGoodEggs,
    damagedEggs: finalDamagedEggs,
    crackedEggs: finalCrackedEggs,
    dirtyEggs: finalDirtyEggs,
  };
};

const createEggCollection = async (req, res) => {
  try {
    const { farm, shed, batch, collectionDate, collectionSession, eggType, quantity, goodEggs, damagedEggs, crackedEggs, dirtyEggs, averageWeightGram, totalWeightKg, notes } = req.body;

    if (!farm || !shed || !batch || !collectionDate || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed, batch, collection date and quantity are required",
      });
    }

    if (!isValidDate(collectionDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection date",
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

    const collectionQuantity = Number(quantity);

    if (!Number.isInteger(collectionQuantity) || collectionQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Egg quantity must be a whole number greater than 0",
      });
    }

    const qualityValidation = validateQualityBreakdown(collectionQuantity, goodEggs ?? 0, damagedEggs ?? 0, crackedEggs ?? 0, dirtyEggs ?? 0);

    if (!qualityValidation.valid) {
      return res.status(400).json({
        success: false,
        message: qualityValidation.message,
      });
    }

    const finalAverageWeight = averageWeightGram !== undefined ? Number(averageWeightGram) : 0;

    if (!isNonNegativeNumber(finalAverageWeight)) {
      return res.status(400).json({
        success: false,
        message: "Average egg weight cannot be negative",
      });
    }

    let calculatedTotalWeight;

    if (totalWeightKg !== undefined) {
      calculatedTotalWeight = Number(totalWeightKg);

      if (!isNonNegativeNumber(calculatedTotalWeight)) {
        return res.status(400).json({
          success: false,
          message: "Total egg weight cannot be negative",
        });
      }
    } else {
      calculatedTotalWeight = finalAverageWeight > 0 ? (collectionQuantity * finalAverageWeight) / 1000 : 0;
    }

    const collection = await EggCollection.create({
      farm,
      shed,
      batch,
      collectionDate,
      collectionSession: collectionSession || "MORNING",
      eggType: eggType || "TABLE_EGG",
      quantity: collectionQuantity,
      goodEggs: qualityValidation.goodEggs,
      damagedEggs: qualityValidation.damagedEggs,
      crackedEggs: qualityValidation.crackedEggs,
      dirtyEggs: qualityValidation.dirtyEggs,
      averageWeightGram: finalAverageWeight,
      totalWeightKg: calculatedTotalWeight,
      collectedBy: req.user._id,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Egg collection recorded successfully",
      collection,
    });
  } catch (error) {
    console.error("Create egg collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record egg collection",
    });
  }
};

const getEggCollections = async (req, res) => {
  try {
    const { farm, shed, batch, eggType, session, from, to } = req.query;

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
    if (eggType) filter.eggType = eggType;

    if (session) {
      filter.collectionSession = session;
    }

    if (from || to) {
      filter.collectionDate = {};

      if (from) {
        const startDate = new Date(from);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date",
          });
        }

        filter.collectionDate.$gte = startDate;
      }

      if (to) {
        const endDate = new Date(to);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.collectionDate.$lte = endDate;
      }
    }

    const collections = await EggCollection.find(filter).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName birdType breed currentQuantity").populate("collectedBy", "name email").sort({
      collectionDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: collections.length,
      collections,
    });
  } catch (error) {
    console.error("Get egg collections error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch egg collections",
    });
  }
};

const getEggCollectionById = async (req, res) => {
  try {
    const collection = await EggCollection.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code").populate("batch", "batchNumber batchName birdType breed currentQuantity").populate("collectedBy", "name email");

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Egg collection record not found",
      });
    }

    if (collection.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this record",
      });
    }

    return res.status(200).json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error("Get egg collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch egg collection",
    });
  }
};

const updateEggCollection = async (req, res) => {
  try {
    const collection = await EggCollection.findById(req.params.id).populate("farm", "owner");

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Egg collection record not found",
      });
    }

    if (collection.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this record",
      });
    }

    const { collectionDate, collectionSession, eggType, quantity, goodEggs, damagedEggs, crackedEggs, dirtyEggs, averageWeightGram, totalWeightKg, notes } = req.body;

    if (collectionDate !== undefined && !isValidDate(collectionDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid collection date",
      });
    }

    const newQuantity = quantity !== undefined ? Number(quantity) : collection.quantity;

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Egg quantity must be a whole number greater than 0",
      });
    }

    const newGoodEggs = goodEggs !== undefined ? Number(goodEggs) : collection.goodEggs;

    const newDamagedEggs = damagedEggs !== undefined ? Number(damagedEggs) : collection.damagedEggs;

    const newCrackedEggs = crackedEggs !== undefined ? Number(crackedEggs) : collection.crackedEggs;

    const newDirtyEggs = dirtyEggs !== undefined ? Number(dirtyEggs) : collection.dirtyEggs;

    const qualityValidation = validateQualityBreakdown(newQuantity, newGoodEggs, newDamagedEggs, newCrackedEggs, newDirtyEggs);

    if (!qualityValidation.valid) {
      return res.status(400).json({
        success: false,
        message: qualityValidation.message,
      });
    }

    let newAverageWeight = averageWeightGram !== undefined ? Number(averageWeightGram) : collection.averageWeightGram;

    if (!isNonNegativeNumber(newAverageWeight)) {
      return res.status(400).json({
        success: false,
        message: "Average egg weight cannot be negative",
      });
    }

    let newTotalWeightKg;

    if (totalWeightKg !== undefined) {
      newTotalWeightKg = Number(totalWeightKg);

      if (!isNonNegativeNumber(newTotalWeightKg)) {
        return res.status(400).json({
          success: false,
          message: "Total egg weight cannot be negative",
        });
      }
    } else {
      newTotalWeightKg = newAverageWeight > 0 ? (newQuantity * newAverageWeight) / 1000 : 0;
    }

    if (collectionDate !== undefined) {
      collection.collectionDate = collectionDate;
    }

    if (collectionSession !== undefined) {
      collection.collectionSession = collectionSession;
    }

    if (eggType !== undefined) {
      collection.eggType = eggType;
    }

    collection.quantity = newQuantity;
    collection.goodEggs = qualityValidation.goodEggs;
    collection.damagedEggs = qualityValidation.damagedEggs;
    collection.crackedEggs = qualityValidation.crackedEggs;
    collection.dirtyEggs = qualityValidation.dirtyEggs;
    collection.averageWeightGram = newAverageWeight;
    collection.totalWeightKg = newTotalWeightKg;

    if (notes !== undefined) {
      collection.notes = notes;
    }

    await collection.save();

    return res.status(200).json({
      success: true,
      message: "Egg collection updated successfully",
      collection,
    });
  } catch (error) {
    console.error("Update egg collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update egg collection",
    });
  }
};

const deleteEggCollection = async (req, res) => {
  try {
    const collection = await EggCollection.findById(req.params.id).populate("farm", "owner");

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: "Egg collection record not found",
      });
    }

    if (collection.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this record",
      });
    }

    /*
     * Historical dependency protection:
     *
     * FarmReport may already contain this egg collection's
     * aggregated data. Deleting the source record afterward
     * would make the report/history inconsistent.
     */
    const FarmReport = (await import("../models/FarmReport.js")).default;

    const dependentRecords = [];

    const reportCount = await FarmReport.countDocuments({
      farm: collection.farm._id,
      batch: collection.batch,
      periodStart: { $lte: collection.collectionDate },
      periodEnd: { $gte: collection.collectionDate },
    });

    if (reportCount > 0) {
      dependentRecords.push({
        type: "FarmReport",
        count: reportCount,
        message: "Farm reports already cover this collection date",
      });
    }

    if (dependentRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Egg collection cannot be deleted because dependent historical records exist",
        dependentRecords,
        summary: {
          totalDependencies: dependentRecords.reduce((total, item) => total + item.count, 0),
        },
      });
    }

    await EggCollection.deleteOne({
      _id: collection._id,
    });

    return res.status(200).json({
      success: true,
      message: "Egg collection deleted successfully",
    });
  } catch (error) {
    console.error("Delete egg collection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete egg collection",
    });
  }
};

export { createEggCollection, getEggCollections, getEggCollectionById, updateEggCollection, deleteEggCollection };
