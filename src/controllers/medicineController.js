import Medicine from "../models/Medicine.js";
import Farm from "../models/Farm.js";
import Vaccination from "../models/Vaccination.js";
import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";

const MEDICINE_TYPES = ["MEDICINE", "VACCINE", "ANTIBIOTIC", "VITAMIN", "SUPPLEMENT", "DISINFECTANT", "OTHER"];

const MEDICINE_UNITS = ["ML", "LITRE", "GRAM", "KG", "TABLET", "DOSE", "VIAL", "BOTTLE", "PACK", "PIECE"];

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
};

const isValidDate = (value) => {
  if (!value) {
    return true;
  }

  return !Number.isNaN(new Date(value).getTime());
};

const isFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  return Number.isFinite(Number(value));
};

const calculateStatus = (currentStock, reorderLevel, expiryDate) => {
  const today = getToday();

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return "EXPIRED";
    }
  }

  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (currentStock <= reorderLevel) {
    return "LOW_STOCK";
  }

  return "AVAILABLE";
};

const validateFarmOwnership = async (farmId, userId) => {
  if (!isValidObjectId(farmId)) {
    return null;
  }

  return Farm.findOne({
    _id: farmId,
    owner: userId,
  });
};

const getMedicineDependencies = async (medicineId) => {
  const [vaccinationCount, veterinaryCount] = await Promise.all([
    Vaccination.countDocuments({
      medicine: medicineId,
    }),

    VeterinaryHealthLog.countDocuments({
      "treatment.medicine": medicineId,
    }),
  ]);

  return {
    vaccinationCount,
    veterinaryCount,
  };
};

const getVaccinationUsage = async (medicineId) => {
  const result = await Vaccination.aggregate([
    {
      $match: {
        medicine: medicineId,
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: null,
        totalQuantityUsed: {
          $sum: {
            $ifNull: ["$vaccineQuantityUsed", 0],
          },
        },
      },
    },
  ]);

  return Number(result[0]?.totalQuantityUsed || 0);
};

const validateBasicFields = ({ name, type, unit }) => {
  if (!name?.trim()) {
    return "Medicine name is required";
  }

  if (!type) {
    return "Medicine type is required";
  }

  if (!MEDICINE_TYPES.includes(type)) {
    return "Invalid medicine type";
  }

  if (!unit) {
    return "Medicine unit is required";
  }

  if (!MEDICINE_UNITS.includes(unit)) {
    return "Invalid medicine unit";
  }

  return null;
};

const validateNumericFields = (fields) => {
  for (const [field, value] of Object.entries(fields)) {
    if (!isFiniteNumber(value)) {
      return `${field} must be a valid number`;
    }

    if (value !== undefined && value !== null && value !== "" && Number(value) < 0) {
      return `${field} cannot be negative`;
    }
  }

  return null;
};

// CREATE
export const createMedicine = async (req, res, next) => {
  try {
    const { farm, name, type, brand, composition, batchNumber, supplier, purchaseDate, expiryDate, unit, quantityReceived, quantityUsed = 0, reorderLevel = 0, unitCost = 0, totalPurchaseCost, invoiceNumber, storageLocation, storageTemperature, notes } = req.body;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm is required",
      });
    }

    const farmExists = await validateFarmOwnership(farm, req.user._id);

    if (!farmExists) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    const basicFieldError = validateBasicFields({
      name,
      type,
      unit,
    });

    if (basicFieldError) {
      return res.status(400).json({
        success: false,
        message: basicFieldError,
      });
    }

    if (purchaseDate && !isValidDate(purchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is invalid",
      });
    }

    if (expiryDate && !isValidDate(expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is invalid",
      });
    }

    if (purchaseDate && expiryDate && new Date(expiryDate) < new Date(purchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date cannot be before purchase date",
      });
    }

    const numericError = validateNumericFields({
      quantityReceived,
      quantityUsed,
      reorderLevel,
      unitCost,
      totalPurchaseCost,
    });

    if (numericError) {
      return res.status(400).json({
        success: false,
        message: numericError,
      });
    }

    const received = Number(quantityReceived);
    const used = Number(quantityUsed);
    const reorder = Number(reorderLevel);
    const cost = Number(unitCost);

    if (received <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be greater than 0",
      });
    }

    if (used > received) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot exceed quantity received",
      });
    }

    const currentStock = received - used;

    let calculatedTotalCost;

    if (totalPurchaseCost !== undefined && totalPurchaseCost !== null && totalPurchaseCost !== "") {
      calculatedTotalCost = Number(totalPurchaseCost);
    } else {
      calculatedTotalCost = received * cost;
    }

    if (calculatedTotalCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Total purchase cost cannot be negative",
      });
    }

    const status = calculateStatus(currentStock, reorder, expiryDate);

    const medicine = await Medicine.create({
      farm,
      name: name.trim(),
      type,
      brand: brand?.trim(),
      composition: composition?.trim(),
      batchNumber: batchNumber?.trim(),
      supplier,
      purchaseDate,
      expiryDate,
      unit,

      quantityReceived: received,
      quantityUsed: used,
      currentStock,

      reorderLevel: reorder,
      unitCost: cost,
      totalPurchaseCost: calculatedTotalCost,

      invoiceNumber: invoiceNumber?.trim(),
      storageLocation: storageLocation?.trim(),
      storageTemperature: storageTemperature?.trim(),

      status,
      notes: notes?.trim() || "",

      addedBy: req.user._id,
    });

    const populatedMedicine = await Medicine.findById(medicine._id).populate("farm", "name code").populate("addedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Medicine inventory added successfully",
      data: populatedMedicine,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getMedicines = async (req, res, next) => {
  try {
    const { farm, type, status, expiry, lowStock, page = 1, limit = 20 } = req.query;

    const query = {};

    if (farm) {
      const farmExists = await validateFarmOwnership(farm, req.user._id);

      if (!farmExists) {
        return res.status(404).json({
          success: false,
          message: "Farm not found or access denied",
        });
      }

      query.farm = farm;
    } else {
      const userFarms = await Farm.find({
        owner: req.user._id,
      }).select("_id");

      query.farm = {
        $in: userFarms.map((item) => item._id),
      };
    }

    if (type) {
      if (!MEDICINE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid medicine type",
        });
      }

      query.type = type;
    }

    if (status) {
      const allowedStatuses = ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRED"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid medicine status",
        });
      }

      query.status = status;
    }

    if (expiry && !["expired", "valid"].includes(expiry)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry filter",
      });
    }

    if (expiry === "expired") {
      query.expiryDate = {
        $lt: getToday(),
      };
    }

    if (expiry === "valid") {
      query.$or = [
        {
          expiryDate: {
            $gte: getToday(),
          },
        },
        {
          expiryDate: null,
        },
      ];
    }

    if (lowStock === "true") {
      query.$expr = {
        $and: [
          {
            $gt: ["$currentStock", 0],
          },
          {
            $lte: ["$currentStock", "$reorderLevel"],
          },
        ],
      };
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Medicine.find(query)
        .populate("farm", "name code")
        .populate("addedBy", "name email")
        .sort({
          purchaseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Medicine.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE
export const getMedicineById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    const medicine = await Medicine.findById(req.params.id).populate("farm", "name code owner").populate("addedBy", "name email");

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine inventory not found",
      });
    }

    if (String(medicine.farm.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateMedicine = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine inventory not found",
      });
    }

    const farmExists = await validateFarmOwnership(medicine.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { name, type, brand, composition, batchNumber, supplier, purchaseDate, expiryDate, unit, quantityReceived, quantityUsed, reorderLevel, unitCost, totalPurchaseCost, invoiceNumber, storageLocation, storageTemperature, notes } = req.body;

    const finalName = name !== undefined ? name : medicine.name;

    const finalType = type !== undefined ? type : medicine.type;

    const finalUnit = unit !== undefined ? unit : medicine.unit;

    const basicFieldError = validateBasicFields({
      name: finalName,
      type: finalType,
      unit: finalUnit,
    });

    if (basicFieldError) {
      return res.status(400).json({
        success: false,
        message: basicFieldError,
      });
    }

    const finalPurchaseDate = purchaseDate !== undefined ? purchaseDate : medicine.purchaseDate;

    const finalExpiryDate = expiryDate !== undefined ? expiryDate : medicine.expiryDate;

    if (finalPurchaseDate && !isValidDate(finalPurchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is invalid",
      });
    }

    if (finalExpiryDate && !isValidDate(finalExpiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date is invalid",
      });
    }

    if (finalPurchaseDate && finalExpiryDate && new Date(finalExpiryDate) < new Date(finalPurchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Expiry date cannot be before purchase date",
      });
    }

    const received = quantityReceived !== undefined ? Number(quantityReceived) : Number(medicine.quantityReceived || 0);

    const requestedUsed = quantityUsed !== undefined ? Number(quantityUsed) : Number(medicine.quantityUsed || 0);

    const reorder = reorderLevel !== undefined ? Number(reorderLevel) : Number(medicine.reorderLevel || 0);

    const cost = unitCost !== undefined ? Number(unitCost) : Number(medicine.unitCost || 0);

    const numericError = validateNumericFields({
      quantityReceived: received,
      quantityUsed: requestedUsed,
      reorderLevel: reorder,
      unitCost: cost,
    });

    if (numericError) {
      return res.status(400).json({
        success: false,
        message: numericError,
      });
    }

    if (received <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be greater than 0",
      });
    }

    /*
     * Vaccination records are the actual stock
     * consumers for vaccine inventory.
     *
     * Completed vaccinations cannot be ignored
     * while editing quantityUsed.
     */
    const actualVaccinationUsage = await getVaccinationUsage(medicine._id);

    if (requestedUsed < actualVaccinationUsage) {
      return res.status(409).json({
        success: false,
        message: "Quantity used cannot be less than completed vaccination usage",
        dependentRecords: {
          vaccinationUsage: actualVaccinationUsage,
        },
      });
    }

    if (requestedUsed > received) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot exceed quantity received",
      });
    }

    if (reorder < 0) {
      return res.status(400).json({
        success: false,
        message: "Reorder level cannot be negative",
      });
    }

    if (cost < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit cost cannot be negative",
      });
    }

    let calculatedTotalCost;

    if (totalPurchaseCost !== undefined && totalPurchaseCost !== null && totalPurchaseCost !== "") {
      if (!isFiniteNumber(totalPurchaseCost)) {
        return res.status(400).json({
          success: false,
          message: "Total purchase cost must be a valid number",
        });
      }

      calculatedTotalCost = Number(totalPurchaseCost);
    } else {
      calculatedTotalCost = received * cost;
    }

    if (calculatedTotalCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Total purchase cost cannot be negative",
      });
    }

    const currentStock = received - requestedUsed;

    const status = calculateStatus(currentStock, reorder, finalExpiryDate);

    medicine.name = finalName.trim();
    medicine.type = finalType;
    medicine.unit = finalUnit;

    if (brand !== undefined) {
      medicine.brand = brand?.trim() || "";
    }

    if (composition !== undefined) {
      medicine.composition = composition?.trim() || "";
    }

    if (batchNumber !== undefined) {
      medicine.batchNumber = batchNumber?.trim() || "";
    }

    if (supplier !== undefined) {
      medicine.supplier = supplier;
    }

    if (purchaseDate !== undefined) {
      medicine.purchaseDate = purchaseDate || null;
    }

    if (expiryDate !== undefined) {
      medicine.expiryDate = expiryDate || null;
    }

    if (invoiceNumber !== undefined) {
      medicine.invoiceNumber = invoiceNumber?.trim() || "";
    }

    if (storageLocation !== undefined) {
      medicine.storageLocation = storageLocation?.trim() || "";
    }

    if (storageTemperature !== undefined) {
      medicine.storageTemperature = storageTemperature?.trim() || "";
    }

    if (notes !== undefined) {
      medicine.notes = notes?.trim() || "";
    }

    medicine.quantityReceived = received;

    medicine.quantityUsed = requestedUsed;

    medicine.currentStock = currentStock;

    medicine.reorderLevel = reorder;

    medicine.unitCost = cost;

    medicine.totalPurchaseCost = calculatedTotalCost;

    medicine.status = status;

    await medicine.save();

    const updatedMedicine = await Medicine.findById(medicine._id).populate("farm", "name code").populate("addedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Medicine inventory updated successfully",
      data: updatedMedicine,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteMedicine = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medicine ID",
      });
    }

    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine inventory not found",
      });
    }

    const farmExists = await validateFarmOwnership(medicine.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const dependencies = await getMedicineDependencies(medicine._id);

    const dependentRecords = [];

    if (dependencies.vaccinationCount > 0) {
      dependentRecords.push({
        collection: "Vaccination",
        count: dependencies.vaccinationCount,
      });
    }

    if (dependencies.veterinaryCount > 0) {
      dependentRecords.push({
        collection: "VeterinaryHealthLog",
        count: dependencies.veterinaryCount,
      });
    }

    if (dependentRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Medicine cannot be deleted because dependent records exist",
        dependentRecords,
        quantityUsed: Number(medicine.quantityUsed || 0),
      });
    }

    if (Number(medicine.quantityUsed || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: "Medicine inventory cannot be deleted after stock has been used",
        dependentRecords: {
          quantityUsed: Number(medicine.quantityUsed || 0),
        },
      });
    }

    await Medicine.deleteOne({
      _id: medicine._id,
    });

    return res.status(200).json({
      success: true,
      message: "Medicine inventory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
