import ChicksInward from "../models/ChicksInward.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";

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
import uploadImageBuffer from "../services/cloudinaryUploadService.js";

const createChicksInward = async (req, res) => {
  try {
    const { farm, shed, batch, inwardNumber, inwardDate, birdType, breed, supplier, quantityReceived, transportMortality, acceptedQuantity, maleCount, femaleCount, unitCost, invoiceNumber, vehicleNumber, notes } = req.body;

    let parsedSupplier = supplier;
    let parsedTransportMortality = transportMortality;

    try {
      if (typeof parsedSupplier === "string") {
        parsedSupplier = JSON.parse(parsedSupplier);
      }

      if (typeof parsedTransportMortality === "string") {
        parsedTransportMortality = JSON.parse(parsedTransportMortality);
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier or transport mortality data",
      });
    }

    let invoiceImage = "";

    if (req.file) {
      const uploadedImage = await uploadImageBuffer(req.file.buffer, "br30-kadaknath-farms/chicks-inward/invoices");

      invoiceImage = uploadedImage.secure_url;
    }

    if (!farm || !shed || !batch || !inwardNumber || !inwardDate || !parsedSupplier?.name || quantityReceived === undefined) {
      return res.status(400).json({
        success: false,
        message: "Farm, shed, batch, inward number, date, supplier and quantity are required",
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

    const normalizedInwardNumber = inwardNumber.trim().toUpperCase();

    const existingInward = await ChicksInward.findOne({
      farm,
      inwardNumber: normalizedInwardNumber,
    });

    if (existingInward) {
      return res.status(409).json({
        success: false,
        message: "Inward number already exists in this farm",
      });
    }

    const receivedQty = Number(quantityReceived);
    const transportMortalityQty = Number(parsedTransportMortality?.quantity || 0);

    if (!Number.isFinite(receivedQty) || receivedQty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be at least 1",
      });
    }

    if (!Number.isFinite(transportMortalityQty) || transportMortalityQty < 0) {
      return res.status(400).json({
        success: false,
        message: "Transport mortality cannot be negative",
      });
    }

    if (transportMortalityQty > receivedQty) {
      return res.status(400).json({
        success: false,
        message: "Transport mortality cannot exceed quantity received",
      });
    }

    const calculatedAcceptedQuantity = receivedQty - transportMortalityQty;

    const finalAcceptedQuantity = acceptedQuantity !== undefined ? Number(acceptedQuantity) : calculatedAcceptedQuantity;

    if (!Number.isFinite(finalAcceptedQuantity) || finalAcceptedQuantity !== calculatedAcceptedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Accepted quantity must equal received quantity minus transport mortality",
      });
    }

    const finalMaleCount = Number(maleCount || 0);
    const finalFemaleCount = Number(femaleCount || 0);

    if (!Number.isFinite(finalMaleCount) || !Number.isFinite(finalFemaleCount) || finalMaleCount < 0 || finalFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot be negative",
      });
    }

    if (finalMaleCount + finalFemaleCount > finalAcceptedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot exceed accepted quantity",
      });
    }

    if (shedExists.currentBirds + finalAcceptedQuantity > shedExists.capacity) {
      return res.status(400).json({
        success: false,
        message: "Shed does not have enough available capacity",
      });
    }

    const finalUnitCost = Number(unitCost || 0);

    if (!Number.isFinite(finalUnitCost) || finalUnitCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit cost cannot be negative",
      });
    }

    const totalCost = finalAcceptedQuantity * finalUnitCost;

    const inward = await ChicksInward.create({
      farm,
      shed,
      batch,
      inwardNumber: normalizedInwardNumber,
      inwardDate,
      birdType: birdType || batchExists.birdType,
      breed: breed || batchExists.breed || "Kadaknath",
      supplier: {
        name: parsedSupplier.name.trim(),
        phone: parsedSupplier.phone || "",
        address: parsedSupplier.address || "",
      },
      quantityReceived: receivedQty,
      transportMortality: {
        quantity: transportMortalityQty,
        reason: parsedTransportMortality?.reason || "",
      },
      acceptedQuantity: finalAcceptedQuantity,
      maleCount: finalMaleCount,
      femaleCount: finalFemaleCount,
      unitCost: finalUnitCost,
      totalCost,
      invoiceNumber: invoiceNumber || "",
      invoiceImage: invoiceImage || "",
      vehicleNumber: vehicleNumber || "",
      notes: notes || "",
      createdBy: req.user._id,
    });

    batchExists.currentQuantity += finalAcceptedQuantity;
    batchExists.currentMaleCount += finalMaleCount;
    batchExists.currentFemaleCount += finalFemaleCount;

    await batchExists.save();

    shedExists.currentBirds += finalAcceptedQuantity;

    await shedExists.save();

    return res.status(201).json({
      success: true,
      message: "Chicks inward recorded successfully",
      inward,
    });
  } catch (error) {
    console.error("Create chicks inward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create chicks inward",
    });
  }
};

const getChicksInwards = async (req, res) => {
  try {
    const { farm, shed, batch } = req.query;

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

    const inwards = await ChicksInward.find(filter).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName birdType breed currentQuantity").populate("createdBy", "name email").sort({ inwardDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: inwards.length,
      inwards,
    });
  } catch (error) {
    console.error("Get chicks inwards error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chicks inward records",
    });
  }
};

const getChicksInwardById = async (req, res) => {
  try {
    const inward = await ChicksInward.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code capacity currentBirds").populate("batch", "batchNumber batchName birdType breed currentQuantity").populate("createdBy", "name email");

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: "Chicks inward record not found",
      });
    }

    if (inward.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this inward record",
      });
    }

    return res.status(200).json({
      success: true,
      inward,
    });
  } catch (error) {
    console.error("Get chicks inward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chicks inward record",
    });
  }
};

const updateChicksInward = async (req, res) => {
  try {
    const inward = await ChicksInward.findById(req.params.id).populate("farm", "owner").populate("shed").populate("batch");

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: "Chicks inward record not found",
      });
    }

    if (inward.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this inward record",
      });
    }

    const { inwardDate, supplier, quantityReceived, transportMortality, acceptedQuantity, maleCount, femaleCount, unitCost, invoiceNumber, vehicleNumber, notes } = req.body;

    let parsedSupplier = supplier;
    let parsedTransportMortality = transportMortality;

    try {
      if (typeof parsedSupplier === "string") {
        parsedSupplier = JSON.parse(parsedSupplier);
      }

      if (typeof parsedTransportMortality === "string") {
        parsedTransportMortality = JSON.parse(parsedTransportMortality);
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier or transport mortality data",
      });
    }

    const oldAcceptedQuantity = inward.acceptedQuantity;
    const oldMaleCount = inward.maleCount;
    const oldFemaleCount = inward.femaleCount;

    const newReceivedQuantity = quantityReceived !== undefined ? Number(quantityReceived) : inward.quantityReceived;

    const newTransportMortality = parsedTransportMortality !== undefined ? Number(parsedTransportMortality.quantity || 0) : inward.transportMortality.quantity;

    if (!Number.isFinite(newReceivedQuantity) || newReceivedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be at least 1",
      });
    }

    if (!Number.isFinite(newTransportMortality) || newTransportMortality < 0) {
      return res.status(400).json({
        success: false,
        message: "Transport mortality cannot be negative",
      });
    }

    const calculatedAccepted = newReceivedQuantity - newTransportMortality;

    const newAcceptedQuantity = acceptedQuantity !== undefined ? Number(acceptedQuantity) : calculatedAccepted;

    if (newTransportMortality > newReceivedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Transport mortality cannot exceed quantity received",
      });
    }

    if (!Number.isFinite(newAcceptedQuantity) || newAcceptedQuantity !== calculatedAccepted) {
      return res.status(400).json({
        success: false,
        message: "Accepted quantity must equal received quantity minus transport mortality",
      });
    }

    const newMaleCount = maleCount !== undefined ? Number(maleCount) : inward.maleCount;

    const newFemaleCount = femaleCount !== undefined ? Number(femaleCount) : inward.femaleCount;

    if (!Number.isFinite(newMaleCount) || !Number.isFinite(newFemaleCount) || newMaleCount < 0 || newFemaleCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot be negative",
      });
    }

    if (newMaleCount + newFemaleCount > newAcceptedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Male and female count cannot exceed accepted quantity",
      });
    }

    const quantityDifference = newAcceptedQuantity - oldAcceptedQuantity;

    const newShedBirdCount = inward.shed.currentBirds + quantityDifference;

    if (newShedBirdCount > inward.shed.capacity) {
      return res.status(400).json({
        success: false,
        message: "Shed does not have enough available capacity",
      });
    }

    if (newShedBirdCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock adjustment",
      });
    }

    const batchNewQuantity = inward.batch.currentQuantity + quantityDifference;

    const batchNewMaleCount = inward.batch.currentMaleCount - oldMaleCount + newMaleCount;

    const batchNewFemaleCount = inward.batch.currentFemaleCount - oldFemaleCount + newFemaleCount;

    if (batchNewQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Batch quantity cannot become negative",
      });
    }

    if (batchNewMaleCount < 0 || batchNewFemaleCount < 0 || batchNewMaleCount + batchNewFemaleCount > batchNewQuantity) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch male/female stock",
      });
    }

    let newUnitCost = inward.unitCost;

    if (unitCost !== undefined) {
      newUnitCost = Number(unitCost);

      if (!Number.isFinite(newUnitCost) || newUnitCost < 0) {
        return res.status(400).json({
          success: false,
          message: "Unit cost cannot be negative",
        });
      }
    }

    if (inwardDate !== undefined) {
      inward.inwardDate = inwardDate;
    }

    if (parsedSupplier !== undefined) {
      if (!parsedSupplier?.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Supplier name is required",
        });
      }

      inward.supplier = {
        name: parsedSupplier.name.trim(),
        phone: parsedSupplier.phone || "",
        address: parsedSupplier.address || "",
      };
    }

    inward.quantityReceived = newReceivedQuantity;

    inward.transportMortality = {
      quantity: newTransportMortality,
      reason: parsedTransportMortality?.reason ?? inward.transportMortality.reason,
    };

    inward.acceptedQuantity = newAcceptedQuantity;
    inward.maleCount = newMaleCount;
    inward.femaleCount = newFemaleCount;
    inward.unitCost = newUnitCost;

    inward.totalCost = inward.acceptedQuantity * inward.unitCost;

    if (invoiceNumber !== undefined) {
      inward.invoiceNumber = invoiceNumber;
    }

    if (req.file) {
      const uploadedImage = await uploadImageBuffer(req.file.buffer, "br30-kadaknath-farms/chicks-inward/invoices");

      inward.invoiceImage = uploadedImage.secure_url;
    }

    if (vehicleNumber !== undefined) {
      inward.vehicleNumber = vehicleNumber;
    }

    if (notes !== undefined) {
      inward.notes = notes;
    }

    await inward.save();

    inward.batch.currentQuantity = batchNewQuantity;
    inward.batch.currentMaleCount = batchNewMaleCount;
    inward.batch.currentFemaleCount = batchNewFemaleCount;

    await inward.batch.save();

    inward.shed.currentBirds = newShedBirdCount;

    await inward.shed.save();

    return res.status(200).json({
      success: true,
      message: "Chicks inward updated successfully",
      inward,
    });
  } catch (error) {
    console.error("Update chicks inward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update chicks inward",
    });
  }
};

const deleteChicksInward = async (req, res) => {
  try {
    const inward = await ChicksInward.findById(req.params.id).populate("farm", "owner").populate("shed").populate("batch");

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: "Chicks inward record not found",
      });
    }

    if (inward.farm.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this inward record",
      });
    }

    /*
      ---------------------------------------------------------
      DEPENDENCY CHECK
      ---------------------------------------------------------
      Agar is inward ke batch par aage koi farm activity
      already ho chuki hai, to inward delete nahi karenge.

      Reason:
      Inward ek stock-source record hai. Isko delete karne ke
      baad batch ka historical stock calculation corrupt ho
      sakta hai.
    */

    const dependencyChecks = await Promise.all([
      Mortality.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      WeightGrowth.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      EggCollection.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      FeedConsumption.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      Vaccination.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      VeterinaryHealthLog.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      Task.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      FarmReport.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      FarmExpense.countDocuments({
        farm: inward.farm._id,
        batch: inward.batch._id,
      }),

      Sale.countDocuments({
        farm: inward.farm._id,
        "items.batch": inward.batch._id,
      }),
    ]);

    const [mortalityCount, weightGrowthCount, eggCollectionCount, feedConsumptionCount, vaccinationCount, veterinaryHealthCount, taskCount, farmReportCount, farmExpenseCount, saleCount] = dependencyChecks;

    const dependentRecords = [];

    if (mortalityCount > 0) {
      dependentRecords.push({
        module: "Mortality",
        count: mortalityCount,
      });
    }

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
        message: "Cannot delete this inward record because dependent farm records already exist for this batch",
        dependentRecords,
      });
    }

    /*
      ---------------------------------------------------------
      STOCK SAFETY CHECK
      ---------------------------------------------------------
    */

    if (inward.batch.currentQuantity < inward.acceptedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this record because batch stock is already lower than this inward quantity",
      });
    }

    if (inward.shed.currentBirds < inward.acceptedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this record because shed stock is already lower than this inward quantity",
      });
    }

    const newBatchQuantity = inward.batch.currentQuantity - inward.acceptedQuantity;

    const newBatchMaleCount = inward.batch.currentMaleCount - inward.maleCount;

    const newBatchFemaleCount = inward.batch.currentFemaleCount - inward.femaleCount;

    const newShedBirdCount = inward.shed.currentBirds - inward.acceptedQuantity;

    if (newBatchQuantity < 0 || newBatchMaleCount < 0 || newBatchFemaleCount < 0 || newShedBirdCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this record because stock would become negative",
      });
    }

    /*
      ---------------------------------------------------------
      APPLY STOCK REVERSAL
      ---------------------------------------------------------
    */

    inward.batch.currentQuantity = newBatchQuantity;
    inward.batch.currentMaleCount = newBatchMaleCount;
    inward.batch.currentFemaleCount = newBatchFemaleCount;

    inward.shed.currentBirds = newShedBirdCount;

    await inward.batch.save();
    await inward.shed.save();

    await ChicksInward.findByIdAndDelete(inward._id);

    return res.status(200).json({
      success: true,
      message: "Chicks inward deleted successfully",
    });
  } catch (error) {
    console.error("Delete chicks inward error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete chicks inward",
    });
  }
};

export { createChicksInward, getChicksInwards, getChicksInwardById, updateChicksInward, deleteChicksInward };
