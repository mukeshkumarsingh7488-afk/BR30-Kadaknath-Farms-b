import WeightGrowth from "../models/WeightGrowth.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";

const createWeightGrowth = async (req, res) => {
  try {
    const { farm, shed, batch, date, ageInDays, sampleSize, averageWeightKg, minimumWeightKg, maximumWeightKg, maleAverageWeightKg, femaleAverageWeightKg, totalSampleWeightKg, measurementMethod, targetWeightKg, notes } = req.body;

    if (!farm || !shed || !batch || !date || ageInDays === undefined || sampleSize === undefined || averageWeightKg === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed, batch, date, age, sample size and average weight are required",
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

    const sample = Number(sampleSize);
    const averageWeight = Number(averageWeightKg);
    const age = Number(ageInDays);

    if (!Number.isFinite(age) || age < 0) {
      return res.status(400).json({
        success: false,
        message: "Age cannot be negative",
      });
    }

    if (!Number.isFinite(sample) || sample < 1) {
      return res.status(400).json({
        success: false,
        message: "Sample size must be at least 1",
      });
    }

    if (!Number.isFinite(averageWeight) || averageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Average weight cannot be negative",
      });
    }

    if (sample > batchExists.currentQuantity) {
      return res.status(400).json({
        success: false,
        message: "Sample size cannot exceed current batch birds",
      });
    }

    const minimumWeight = minimumWeightKg !== undefined ? Number(minimumWeightKg) : 0;

    const maximumWeight = maximumWeightKg !== undefined ? Number(maximumWeightKg) : 0;

    const maleAverageWeight = maleAverageWeightKg !== undefined ? Number(maleAverageWeightKg) : 0;

    const femaleAverageWeight = femaleAverageWeightKg !== undefined ? Number(femaleAverageWeightKg) : 0;

    if (!Number.isFinite(minimumWeight) || minimumWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot be negative",
      });
    }

    if (!Number.isFinite(maximumWeight) || maximumWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Maximum weight cannot be negative",
      });
    }

    if (!Number.isFinite(maleAverageWeight) || maleAverageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Male average weight cannot be negative",
      });
    }

    if (!Number.isFinite(femaleAverageWeight) || femaleAverageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Female average weight cannot be negative",
      });
    }

    if (minimumWeight > averageWeight) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot exceed average weight",
      });
    }

    if (maximumWeight > 0 && maximumWeight < averageWeight) {
      return res.status(400).json({
        success: false,
        message: "Maximum weight cannot be lower than average weight",
      });
    }

    if (maximumWeight > 0 && minimumWeight > maximumWeight) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot exceed maximum weight",
      });
    }

    const measurementDate = new Date(date);

    if (Number.isNaN(measurementDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid measurement date",
      });
    }

    const previousRecord = await WeightGrowth.findOne({
      batch,
      date: { $lt: measurementDate },
    }).sort({ date: -1 });

    let weightGainFromPreviousKg = 0;
    let averageDailyGainKg = 0;

    if (previousRecord) {
      weightGainFromPreviousKg = averageWeight - previousRecord.averageWeightKg;

      const daysDifference = (measurementDate.getTime() - new Date(previousRecord.date).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDifference > 0) {
        averageDailyGainKg = weightGainFromPreviousKg / daysDifference;
      }
    }

    if (averageDailyGainKg < 0) {
      averageDailyGainKg = 0;
    }

    const finalTargetWeight = targetWeightKg !== undefined ? Number(targetWeightKg) : Number(batchExists.targetWeightKg || 0);

    if (!Number.isFinite(finalTargetWeight) || finalTargetWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Target weight cannot be negative",
      });
    }

    let targetAchievementPercentage = 0;

    if (finalTargetWeight > 0) {
      targetAchievementPercentage = (averageWeight / finalTargetWeight) * 100;
    }

    const calculatedTotalSampleWeight = totalSampleWeightKg !== undefined ? Number(totalSampleWeightKg) : averageWeight * sample;

    if (!Number.isFinite(calculatedTotalSampleWeight) || calculatedTotalSampleWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Total sample weight cannot be negative",
      });
    }

    const weightGrowth = await WeightGrowth.create({
      farm,
      shed,
      batch,
      date: measurementDate,
      ageInDays: age,
      sampleSize: sample,
      averageWeightKg: averageWeight,
      minimumWeightKg: minimumWeight,
      maximumWeightKg: maximumWeight,
      maleAverageWeightKg: maleAverageWeight,
      femaleAverageWeightKg: femaleAverageWeight,
      totalSampleWeightKg: calculatedTotalSampleWeight,
      weightGainFromPreviousKg,
      averageDailyGainKg,
      targetWeightKg: finalTargetWeight,
      targetAchievementPercentage,
      measurementMethod: measurementMethod || "SAMPLE_AVERAGE",
      measuredBy: req.user._id,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Weight and growth record created successfully",
      weightGrowth,
    });
  } catch (error) {
    console.error("Create weight growth error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create weight and growth record",
    });
  }
};

const getWeightGrowthRecords = async (req, res) => {
  try {
    const { farm, shed, batch, from, to } = req.query;

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

    if (from || to) {
      filter.date = {};

      if (from) {
        const startDate = new Date(from);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date",
          });
        }

        filter.date.$gte = startDate;
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
        filter.date.$lte = endDate;
      }
    }

    const records = await WeightGrowth.find(filter).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName breed currentQuantity targetWeightKg").populate("measuredBy", "name email").sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Get weight growth records error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weight and growth records",
    });
  }
};

const getWeightGrowthById = async (req, res) => {
  try {
    const record = await WeightGrowth.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code capacity currentBirds").populate("batch", "batchNumber batchName breed currentQuantity targetWeightKg").populate("measuredBy", "name email");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Weight and growth record not found",
      });
    }

    if (record.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this record",
      });
    }

    return res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    console.error("Get weight growth record error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weight and growth record",
    });
  }
};

const updateWeightGrowth = async (req, res) => {
  try {
    const record = await WeightGrowth.findById(req.params.id).populate("farm", "owner").populate("batch");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Weight and growth record not found",
      });
    }

    if (record.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this record",
      });
    }

    const { date, ageInDays, sampleSize, averageWeightKg, minimumWeightKg, maximumWeightKg, maleAverageWeightKg, femaleAverageWeightKg, totalSampleWeightKg, measurementMethod, targetWeightKg, notes } = req.body;

    const newDate = date !== undefined ? new Date(date) : new Date(record.date);

    if (Number.isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid measurement date",
      });
    }

    const newAge = ageInDays !== undefined ? Number(ageInDays) : record.ageInDays;

    const newAverageWeight = averageWeightKg !== undefined ? Number(averageWeightKg) : record.averageWeightKg;

    const newSampleSize = sampleSize !== undefined ? Number(sampleSize) : record.sampleSize;

    if (!Number.isFinite(newAge) || newAge < 0) {
      return res.status(400).json({
        success: false,
        message: "Age cannot be negative",
      });
    }

    if (!Number.isFinite(newSampleSize) || newSampleSize < 1) {
      return res.status(400).json({
        success: false,
        message: "Sample size must be at least 1",
      });
    }

    if (!Number.isFinite(newAverageWeight) || newAverageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Average weight cannot be negative",
      });
    }

    if (newSampleSize > record.batch.currentQuantity) {
      return res.status(400).json({
        success: false,
        message: "Sample size cannot exceed current batch birds",
      });
    }

    const newMinimumWeight = minimumWeightKg !== undefined ? Number(minimumWeightKg) : record.minimumWeightKg;

    const newMaximumWeight = maximumWeightKg !== undefined ? Number(maximumWeightKg) : record.maximumWeightKg;

    const newMaleAverageWeight = maleAverageWeightKg !== undefined ? Number(maleAverageWeightKg) : record.maleAverageWeightKg;

    const newFemaleAverageWeight = femaleAverageWeightKg !== undefined ? Number(femaleAverageWeightKg) : record.femaleAverageWeightKg;

    if (!Number.isFinite(newMinimumWeight) || newMinimumWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot be negative",
      });
    }

    if (!Number.isFinite(newMaximumWeight) || newMaximumWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Maximum weight cannot be negative",
      });
    }

    if (!Number.isFinite(newMaleAverageWeight) || newMaleAverageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Male average weight cannot be negative",
      });
    }

    if (!Number.isFinite(newFemaleAverageWeight) || newFemaleAverageWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Female average weight cannot be negative",
      });
    }

    if (newMinimumWeight > newAverageWeight) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot exceed average weight",
      });
    }

    if (newMaximumWeight > 0 && newMaximumWeight < newAverageWeight) {
      return res.status(400).json({
        success: false,
        message: "Maximum weight cannot be lower than average weight",
      });
    }

    if (newMaximumWeight > 0 && newMinimumWeight > newMaximumWeight) {
      return res.status(400).json({
        success: false,
        message: "Minimum weight cannot exceed maximum weight",
      });
    }

    const previousRecord = await WeightGrowth.findOne({
      batch: record.batch._id,
      _id: { $ne: record._id },
      date: { $lt: newDate },
    }).sort({ date: -1 });

    let weightGainFromPreviousKg = 0;
    let averageDailyGainKg = 0;

    if (previousRecord) {
      weightGainFromPreviousKg = newAverageWeight - previousRecord.averageWeightKg;

      const daysDifference = (newDate.getTime() - new Date(previousRecord.date).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDifference > 0) {
        averageDailyGainKg = weightGainFromPreviousKg / daysDifference;
      }
    }

    if (averageDailyGainKg < 0) {
      averageDailyGainKg = 0;
    }

    const finalTargetWeight = targetWeightKg !== undefined ? Number(targetWeightKg) : Number(record.targetWeightKg || 0);

    if (!Number.isFinite(finalTargetWeight) || finalTargetWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Target weight cannot be negative",
      });
    }

    let targetAchievementPercentage = 0;

    if (finalTargetWeight > 0) {
      targetAchievementPercentage = (newAverageWeight / finalTargetWeight) * 100;
    }

    const newTotalSampleWeight = totalSampleWeightKg !== undefined ? Number(totalSampleWeightKg) : newAverageWeight * newSampleSize;

    if (!Number.isFinite(newTotalSampleWeight) || newTotalSampleWeight < 0) {
      return res.status(400).json({
        success: false,
        message: "Total sample weight cannot be negative",
      });
    }

    record.date = newDate;
    record.ageInDays = newAge;
    record.sampleSize = newSampleSize;
    record.averageWeightKg = newAverageWeight;

    record.minimumWeightKg = newMinimumWeight;

    record.maximumWeightKg = newMaximumWeight;

    record.maleAverageWeightKg = newMaleAverageWeight;

    record.femaleAverageWeightKg = newFemaleAverageWeight;

    record.totalSampleWeightKg = newTotalSampleWeight;

    record.weightGainFromPreviousKg = weightGainFromPreviousKg;

    record.averageDailyGainKg = averageDailyGainKg;

    record.targetWeightKg = finalTargetWeight;

    record.targetAchievementPercentage = targetAchievementPercentage;

    if (measurementMethod !== undefined) {
      record.measurementMethod = measurementMethod;
    }

    if (notes !== undefined) {
      record.notes = notes;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Weight and growth record updated successfully",
      record,
    });
  } catch (error) {
    console.error("Update weight growth error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update weight and growth record",
    });
  }
};

const deleteWeightGrowth = async (req, res) => {
  try {
    const record = await WeightGrowth.findById(req.params.id).populate("farm", "owner");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Weight and growth record not found",
      });
    }

    if (record.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this record",
      });
    }

    /*
      ---------------------------------------------------------
      HISTORY DEPENDENCY CHECK
      ---------------------------------------------------------
      Agar is record ke baad same batch ka koi newer
      Weight & Growth record hai, to current record delete
      karne se next record ka previous-weight calculation
      change ho jayega.
    */

    const newerRecord = await WeightGrowth.findOne({
      batch: record.batch,
      date: { $gt: record.date },
    }).sort({ date: 1 });

    if (newerRecord) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this weight record because newer weight and growth records already exist for this batch",
        dependentRecords: [
          {
            module: "Weight & Growth",
            count: 1,
          },
        ],
      });
    }

    await WeightGrowth.findByIdAndDelete(record._id);

    return res.status(200).json({
      success: true,
      message: "Weight and growth record deleted successfully",
    });
  } catch (error) {
    console.error("Delete weight growth error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete weight and growth record",
    });
  }
};

export { createWeightGrowth, getWeightGrowthRecords, getWeightGrowthById, updateWeightGrowth, deleteWeightGrowth };
