import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";
import ChicksInward from "../models/ChicksInward.js";
import Mortality from "../models/Mortality.js";
import WeightGrowth from "../models/WeightGrowth.js";
import EggCollection from "../models/EggCollection.js";
import FeedInventory from "../models/FeedInventory.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Medicine from "../models/Medicine.js";
import Vaccination from "../models/Vaccination.js";
import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";
import WaterQuality from "../models/WaterQuality.js";
import StaffAttendance from "../models/StaffAttendance.js";
import Task from "../models/Task.js";
import Payroll from "../models/Payroll.js";
import BiosecurityVisitor from "../models/BiosecurityVisitor.js";
import ShedMaintenance from "../models/ShedMaintenance.js";
import Sale from "../models/Sale.js";
import FarmExpense from "../models/FarmExpense.js";
import FarmReport from "../models/FarmReport.js";

const createFarm = async (req, res) => {
  try {
    const { name, code, manager, description, address, contact, establishedDate } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Farm name and code are required",
      });
    }

    const existingFarm = await Farm.findOne({
      code: code.trim().toUpperCase(),
    });

    if (existingFarm) {
      return res.status(409).json({
        success: false,
        message: "Farm code already exists",
      });
    }

    const farm = await Farm.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      owner: req.user._id,
      manager: manager || null,
      description: description || "",
      address: address || {},
      contact: contact || {},
      establishedDate: establishedDate || null,
    });

    return res.status(201).json({
      success: true,
      message: "Farm created successfully",
      farm,
    });
  } catch (error) {
    console.error("Create farm error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create farm",
    });
  }
};

const getFarms = async (req, res) => {
  try {
    const farms = await Farm.find({
      owner: req.user._id,
    })
      .populate("manager", "name email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: farms.length,
      farms,
    });
  } catch (error) {
    console.error("Get farms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch farms",
    });
  }
};

const getFarmById = async (req, res) => {
  try {
    const farm = await Farm.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("manager", "name email phone role");

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    return res.status(200).json({
      success: true,
      farm,
    });
  } catch (error) {
    console.error("Get farm error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch farm",
    });
  }
};

const updateFarm = async (req, res) => {
  try {
    const { name, code, manager, description, address, contact, status, establishedDate } = req.body;

    const farm = await Farm.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    if (code) {
      const normalizedCode = code.trim().toUpperCase();

      const existingFarm = await Farm.findOne({
        code: normalizedCode,
        _id: { $ne: farm._id },
      });

      if (existingFarm) {
        return res.status(409).json({
          success: false,
          message: "Farm code already exists",
        });
      }

      farm.code = normalizedCode;
    }

    if (name !== undefined) farm.name = name.trim();
    if (manager !== undefined) farm.manager = manager || null;
    if (description !== undefined) farm.description = description;
    if (address !== undefined) farm.address = address;
    if (contact !== undefined) farm.contact = contact;
    if (status !== undefined) farm.status = status;

    if (establishedDate !== undefined) {
      farm.establishedDate = establishedDate || null;
    }

    await farm.save();

    return res.status(200).json({
      success: true,
      message: "Farm updated successfully",
      farm,
    });
  } catch (error) {
    console.error("Update farm error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update farm",
    });
  }
};

const deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check dependent Farm OS records before deleting farm
    |--------------------------------------------------------------------------
    */

    const [
      shedCount,
      batchCount,
      chicksInwardCount,
      mortalityCount,
      weightGrowthCount,
      eggCollectionCount,
      feedInventoryCount,
      feedConsumptionCount,
      medicineCount,
      vaccinationCount,
      veterinaryHealthLogCount,
      waterQualityCount,
      staffAttendanceCount,
      taskCount,
      payrollCount,
      biosecurityVisitorCount,
      shedMaintenanceCount,
      saleCount,
      farmExpenseCount,
      farmReportCount,
    ] = await Promise.all([
      Shed.countDocuments({ farm: farm._id }),
      Batch.countDocuments({ farm: farm._id }),
      ChicksInward.countDocuments({ farm: farm._id }),
      Mortality.countDocuments({ farm: farm._id }),
      WeightGrowth.countDocuments({ farm: farm._id }),
      EggCollection.countDocuments({ farm: farm._id }),
      FeedInventory.countDocuments({ farm: farm._id }),
      FeedConsumption.countDocuments({ farm: farm._id }),
      Medicine.countDocuments({ farm: farm._id }),
      Vaccination.countDocuments({ farm: farm._id }),
      VeterinaryHealthLog.countDocuments({ farm: farm._id }),
      WaterQuality.countDocuments({ farm: farm._id }),
      StaffAttendance.countDocuments({ farm: farm._id }),
      Task.countDocuments({ farm: farm._id }),
      Payroll.countDocuments({ farm: farm._id }),
      BiosecurityVisitor.countDocuments({ farm: farm._id }),
      ShedMaintenance.countDocuments({ farm: farm._id }),
      Sale.countDocuments({ farm: farm._id }),
      FarmExpense.countDocuments({ farm: farm._id }),
      FarmReport.countDocuments({ farm: farm._id }),
    ]);

    const dependentRecords = [
      {
        name: "Sheds",
        count: shedCount,
      },
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
        name: "Feed Inventory",
        count: feedInventoryCount,
      },
      {
        name: "Feed Consumption Records",
        count: feedConsumptionCount,
      },
      {
        name: "Medicine Records",
        count: medicineCount,
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
        name: "Staff Attendance Records",
        count: staffAttendanceCount,
      },
      {
        name: "Tasks",
        count: taskCount,
      },
      {
        name: "Payroll Records",
        count: payrollCount,
      },
      {
        name: "Biosecurity Visitor Records",
        count: biosecurityVisitorCount,
      },
      {
        name: "Shed Maintenance Records",
        count: shedMaintenanceCount,
      },
      {
        name: "Sales",
        count: saleCount,
      },
      {
        name: "Farm Expenses",
        count: farmExpenseCount,
      },
      {
        name: "Farm Reports",
        count: farmReportCount,
      },
    ].filter((item) => item.count > 0);

    if (dependentRecords.length > 0) {
      const recordSummary = dependentRecords.map((item) => `${item.name}: ${item.count}`).join(", ");

      return res.status(409).json({
        success: false,
        message: "Farm cannot be deleted because dependent records exist. Delete dependent records first.",
        farm: {
          id: farm._id,
          name: farm.name,
          code: farm.code,
        },
        dependentRecords,
        summary: recordSummary,
      });
    }

    await Farm.deleteOne({
      _id: farm._id,
    });

    return res.status(200).json({
      success: true,
      message: "Farm deleted successfully",
    });
  } catch (error) {
    console.error("Delete farm error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete farm",
    });
  }
};

export { createFarm, getFarms, getFarmById, updateFarm, deleteFarm };
