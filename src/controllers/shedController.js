import Shed from "../models/Shed.js";
import Farm from "../models/Farm.js";
import Batch from "../models/Batch.js";
import ChicksInward from "../models/ChicksInward.js";
import Mortality from "../models/Mortality.js";
import WeightGrowth from "../models/WeightGrowth.js";
import EggCollection from "../models/EggCollection.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Vaccination from "../models/Vaccination.js";
import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";
import WaterQuality from "../models/WaterQuality.js";
import Task from "../models/Task.js";
import BiosecurityVisitor from "../models/BiosecurityVisitor.js";
import ShedMaintenance from "../models/ShedMaintenance.js";

const createShed = async (req, res) => {
  try {
    const { farm, name, code, type, capacity, currentBirds, location, description, status, lastSanitizedAt, nextSanitizationAt, notes } = req.body;

    if (!farm || !name || !code || capacity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed name, code and capacity are required",
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

    const normalizedCode = code.trim().toUpperCase();

    const existingShed = await Shed.findOne({
      farm,
      code: normalizedCode,
    });

    if (existingShed) {
      return res.status(409).json({
        success: false,
        message: "Shed code already exists in this farm",
      });
    }

    if (Number(currentBirds || 0) > Number(capacity)) {
      return res.status(400).json({
        success: false,
        message: "Current birds cannot exceed shed capacity",
      });
    }

    const shed = await Shed.create({
      farm,
      name: name.trim(),
      code: normalizedCode,
      type: type || "MIXED",
      capacity,
      currentBirds: currentBirds || 0,
      location: location || "",
      description: description || "",
      status: status || "ACTIVE",
      lastSanitizedAt: lastSanitizedAt || null,
      nextSanitizationAt: nextSanitizationAt || null,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Shed created successfully",
      shed,
    });
  } catch (error) {
    console.error("Create shed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create shed",
    });
  }
};

const getSheds = async (req, res) => {
  try {
    const { farm } = req.query;

    let farmFilter = {
      owner: req.user._id,
    };

    if (farm) {
      farmFilter._id = farm;
    }

    const farms = await Farm.find(farmFilter).select("_id");

    const farmIds = farms.map((item) => item._id);

    const sheds = await Shed.find({
      farm: { $in: farmIds },
    })
      .populate("farm", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sheds.length,
      sheds,
    });
  } catch (error) {
    console.error("Get sheds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sheds",
    });
  }
};

const getShedById = async (req, res) => {
  try {
    const shed = await Shed.findById(req.params.id).populate("farm", "name code owner");

    if (!shed) {
      return res.status(404).json({
        success: false,
        message: "Shed not found",
      });
    }

    if (shed.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this shed",
      });
    }

    return res.status(200).json({
      success: true,
      shed,
    });
  } catch (error) {
    console.error("Get shed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shed",
    });
  }
};

const updateShed = async (req, res) => {
  try {
    const shed = await Shed.findById(req.params.id).populate("farm", "owner");

    if (!shed) {
      return res.status(404).json({
        success: false,
        message: "Shed not found",
      });
    }

    if (shed.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this shed",
      });
    }

    const { name, code, type, capacity, currentBirds, location, description, status, lastSanitizedAt, nextSanitizationAt, notes } = req.body;

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();

      const existingShed = await Shed.findOne({
        farm: shed.farm._id,
        code: normalizedCode,
        _id: { $ne: shed._id },
      });

      if (existingShed) {
        return res.status(409).json({
          success: false,
          message: "Shed code already exists in this farm",
        });
      }

      shed.code = normalizedCode;
    }

    const finalCapacity = capacity !== undefined ? Number(capacity) : shed.capacity;

    const finalCurrentBirds = currentBirds !== undefined ? Number(currentBirds) : shed.currentBirds;

    if (finalCurrentBirds > finalCapacity) {
      return res.status(400).json({
        success: false,
        message: "Current birds cannot exceed shed capacity",
      });
    }

    if (name !== undefined) shed.name = name.trim();
    if (type !== undefined) shed.type = type;
    if (capacity !== undefined) shed.capacity = capacity;
    if (currentBirds !== undefined) shed.currentBirds = currentBirds;
    if (location !== undefined) shed.location = location;
    if (description !== undefined) shed.description = description;
    if (status !== undefined) shed.status = status;

    if (lastSanitizedAt !== undefined) {
      shed.lastSanitizedAt = lastSanitizedAt || null;
    }

    if (nextSanitizationAt !== undefined) {
      shed.nextSanitizationAt = nextSanitizationAt || null;
    }

    if (notes !== undefined) shed.notes = notes;

    await shed.save();

    return res.status(200).json({
      success: true,
      message: "Shed updated successfully",
      shed,
    });
  } catch (error) {
    console.error("Update shed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shed",
    });
  }
};

const deleteShed = async (req, res) => {
  try {
    const shed = await Shed.findById(req.params.id).populate("farm", "owner");

    if (!shed) {
      return res.status(404).json({
        success: false,
        message: "Shed not found",
      });
    }

    if (shed.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this shed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Current bird protection
    |--------------------------------------------------------------------------
    */

    if (Number(shed.currentBirds || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this shed because it currently has birds",
        shed: {
          id: shed._id,
          name: shed.name,
          code: shed.code,
          currentBirds: shed.currentBirds,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check dependent records before deleting shed
    |--------------------------------------------------------------------------
    */

    const [batchCount, chicksInwardCount, mortalityCount, weightGrowthCount, eggCollectionCount, feedConsumptionCount, vaccinationCount, veterinaryHealthLogCount, waterQualityCount, taskCount, biosecurityVisitorCount, shedMaintenanceCount] = await Promise.all([
      Batch.countDocuments({
        shed: shed._id,
      }),

      ChicksInward.countDocuments({
        shed: shed._id,
      }),

      Mortality.countDocuments({
        shed: shed._id,
      }),

      WeightGrowth.countDocuments({
        shed: shed._id,
      }),

      EggCollection.countDocuments({
        shed: shed._id,
      }),

      FeedConsumption.countDocuments({
        shed: shed._id,
      }),

      Vaccination.countDocuments({
        shed: shed._id,
      }),

      VeterinaryHealthLog.countDocuments({
        shed: shed._id,
      }),

      WaterQuality.countDocuments({
        shed: shed._id,
      }),

      Task.countDocuments({
        shed: shed._id,
      }),

      BiosecurityVisitor.countDocuments({
        visitingShed: shed._id,
      }),

      ShedMaintenance.countDocuments({
        shed: shed._id,
      }),
    ]);

    const dependentRecords = [
      {
        name: "Batches",
        count: batchCount,
      },
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
        name: "Water Quality Records",
        count: waterQualityCount,
      },
      {
        name: "Tasks",
        count: taskCount,
      },
      {
        name: "Biosecurity Visitor Records",
        count: biosecurityVisitorCount,
      },
      {
        name: "Shed Maintenance Records",
        count: shedMaintenanceCount,
      },
    ].filter((item) => item.count > 0);

    if (dependentRecords.length > 0) {
      const recordSummary = dependentRecords.map((item) => `${item.name}: ${item.count}`).join(", ");

      return res.status(409).json({
        success: false,
        message: "Shed cannot be deleted because dependent records exist. Delete dependent records first.",
        shed: {
          id: shed._id,
          name: shed.name,
          code: shed.code,
        },
        dependentRecords,
        summary: recordSummary,
      });
    }

    await Shed.deleteOne({
      _id: shed._id,
    });

    return res.status(200).json({
      success: true,
      message: "Shed deleted successfully",
    });
  } catch (error) {
    console.error("Delete shed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete shed",
    });
  }
};

export { createShed, getSheds, getShedById, updateShed, deleteShed };
