import ShedMaintenance from "../models/ShedMaintenance.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

const MAINTENANCE_TYPES = ["CLEANING", "SANITIZATION", "REPAIR", "ELECTRICAL", "PLUMBING", "VENTILATION", "EQUIPMENT", "STRUCTURAL", "PEST_CONTROL", "OTHER"];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_NOTES_LENGTH = 2000;
const MAX_VENDOR_NAME_LENGTH = 150;
const MAX_VENDOR_PHONE_LENGTH = 30;
const MAX_VENDOR_COMPANY_LENGTH = 150;
const MAX_MATERIALS = 100;
const MAX_IMAGES = 20;

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
};

const isFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  return Number.isFinite(Number(value));
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return Number(value);
};

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    return `Invalid ${fieldName}`;
  }

  return null;
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

const validateShedBelongsToFarm = async (shedId, farmId) => {
  if (!isValidObjectId(shedId) || !isValidObjectId(farmId)) {
    return null;
  }

  return Shed.findOne({
    _id: shedId,
    farm: farmId,
  });
};

const validateUser = async (userId) => {
  if (!userId || !isValidObjectId(userId)) {
    return null;
  }

  return User.findById(userId).select("_id name email phone role isBlocked");
};

const validateStaffUser = async (userId) => {
  const user = await validateUser(userId);

  if (!user) {
    return {
      valid: false,
      status: 404,
      message: "User not found",
    };
  }

  if (!["staff", "admin"].includes(user.role)) {
    return {
      valid: false,
      status: 400,
      message: "User must be a staff or admin user",
    };
  }

  if (user.isBlocked) {
    return {
      valid: false,
      status: 400,
      message: "User account is blocked",
    };
  }

  return {
    valid: true,
    user,
  };
};

const validateDateOrder = ({ scheduledDate, completedDate }) => {
  if (scheduledDate && !isValidDate(scheduledDate)) {
    return "Invalid scheduled date";
  }

  if (completedDate && !isValidDate(completedDate)) {
    return "Invalid completed date";
  }

  if (scheduledDate && completedDate) {
    if (new Date(completedDate) < new Date(scheduledDate)) {
      return "Completed date cannot be before scheduled date";
    }
  }

  return null;
};

const validateImages = (images, fieldName = "Images") => {
  if (images === undefined || images === null) {
    return null;
  }

  if (!Array.isArray(images)) {
    return `${fieldName} must be an array`;
  }

  if (images.length > MAX_IMAGES) {
    return `${fieldName} cannot contain more than ${MAX_IMAGES} images`;
  }

  for (const image of images) {
    if (!image || typeof image !== "object" || Array.isArray(image)) {
      return "Each image must be a valid object";
    }

    if (typeof image.url !== "string" || !image.url.trim()) {
      return "Each image must contain a valid url";
    }

    if (image.url.trim().length > 2000) {
      return "Image url is too long";
    }

    if (image.publicId !== undefined && image.publicId !== null && typeof image.publicId !== "string") {
      return "Image publicId must be a string";
    }

    if (typeof image.publicId === "string" && image.publicId.length > 500) {
      return "Image publicId is too long";
    }
  }

  return null;
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map((image) => ({
    url: image.url.trim(),
    ...(image.publicId
      ? {
          publicId: image.publicId.trim(),
        }
      : {}),
  }));
};

const validateMaterials = (materialsUsed) => {
  if (materialsUsed === undefined || materialsUsed === null) {
    return null;
  }

  if (!Array.isArray(materialsUsed)) {
    return "Materials used must be an array";
  }

  if (materialsUsed.length > MAX_MATERIALS) {
    return `Materials used cannot contain more than ${MAX_MATERIALS} items`;
  }

  for (const material of materialsUsed) {
    if (!material || typeof material !== "object" || Array.isArray(material)) {
      return "Each material must be a valid object";
    }

    if (material.name !== undefined && typeof material.name !== "string") {
      return "Material name must be a string";
    }

    if (material.name !== undefined && material.name !== null && String(material.name).trim().length > 150) {
      return "Material name cannot exceed 150 characters";
    }

    if (material.quantity !== undefined && material.quantity !== null && material.quantity !== "") {
      if (!Number.isFinite(Number(material.quantity)) || Number(material.quantity) < 0) {
        return "Material quantity must be a valid non-negative number";
      }
    }

    if (material.unit !== undefined && material.unit !== null && typeof material.unit !== "string") {
      return "Material unit must be a string";
    }

    if (material.unit !== undefined && material.unit !== null && String(material.unit).trim().length > 30) {
      return "Material unit cannot exceed 30 characters";
    }

    if (material.cost !== undefined && material.cost !== null && material.cost !== "") {
      if (!Number.isFinite(Number(material.cost)) || Number(material.cost) < 0) {
        return "Material cost must be a valid non-negative number";
      }
    }
  }

  return null;
};

const normalizeMaterials = (materialsUsed) => {
  if (!Array.isArray(materialsUsed)) {
    return [];
  }

  return materialsUsed.map((material) => ({
    ...material,
    ...(material.name !== undefined
      ? {
          name: String(material.name).trim(),
        }
      : {}),
    ...(material.unit !== undefined
      ? {
          unit: String(material.unit).trim(),
        }
      : {}),
    ...(material.quantity !== undefined
      ? {
          quantity: toNumber(material.quantity),
        }
      : {}),
    ...(material.cost !== undefined
      ? {
          cost: toNumber(material.cost),
        }
      : {}),
  }));
};

const validateVendor = (vendor) => {
  if (vendor === undefined || vendor === null) {
    return null;
  }

  if (typeof vendor !== "object" || Array.isArray(vendor)) {
    return "Vendor must be an object";
  }

  if (vendor.name !== undefined && vendor.name !== null && typeof vendor.name !== "string") {
    return "Vendor name must be a string";
  }

  if (vendor.phone !== undefined && vendor.phone !== null && typeof vendor.phone !== "string") {
    return "Vendor phone must be a string";
  }

  if (vendor.company !== undefined && vendor.company !== null && typeof vendor.company !== "string") {
    return "Vendor company must be a string";
  }

  if (typeof vendor.name === "string" && vendor.name.trim().length > MAX_VENDOR_NAME_LENGTH) {
    return "Vendor name cannot exceed 150 characters";
  }

  if (typeof vendor.phone === "string" && vendor.phone.trim().length > MAX_VENDOR_PHONE_LENGTH) {
    return "Vendor phone cannot exceed 30 characters";
  }

  if (typeof vendor.company === "string" && vendor.company.trim().length > MAX_VENDOR_COMPANY_LENGTH) {
    return "Vendor company cannot exceed 150 characters";
  }

  return null;
};

const normalizeVendor = (vendor) => {
  if (!vendor || typeof vendor !== "object" || Array.isArray(vendor)) {
    return {};
  }

  return {
    ...(vendor.name !== undefined
      ? {
          name: String(vendor.name).trim(),
        }
      : {}),
    ...(vendor.phone !== undefined
      ? {
          phone: String(vendor.phone).trim(),
        }
      : {}),
    ...(vendor.company !== undefined
      ? {
          company: String(vendor.company).trim(),
        }
      : {}),
  };
};

const validateCosts = ({ estimatedCost, actualCost }) => {
  const fields = {
    estimatedCost,
    actualCost,
  };

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

const normalizeOptionalText = (value, fieldName, maxLength) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return trimmed;
};

const populateMaintenance = (query) => {
  return query.populate("farm", "name code").populate("shed", "name code").populate("reportedBy", "name email role").populate("assignedTo", "name email role");
};

// CREATE
const createShedMaintenance = async (req, res, next) => {
  try {
    const { farm, shed, maintenanceDate, maintenanceType, title, description, priority, reportedBy, assignedTo, scheduledDate, completedDate, status, estimatedCost, actualCost, vendor, materialsUsed, beforeImages, afterImages, notes } = req.body;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm is required",
      });
    }

    if (!isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm ID",
      });
    }

    const farmDoc = await validateFarmOwnership(farm, req.user._id);

    if (!farmDoc) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    if (!shed) {
      return res.status(400).json({
        success: false,
        message: "Shed is required",
      });
    }

    if (!isValidObjectId(shed)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shed ID",
      });
    }

    const shedDoc = await validateShedBelongsToFarm(shed, farm);

    if (!shedDoc) {
      return res.status(400).json({
        success: false,
        message: "Shed does not belong to the selected farm",
      });
    }

    if (!maintenanceDate) {
      return res.status(400).json({
        success: false,
        message: "Maintenance date is required",
      });
    }

    if (!isValidDate(maintenanceDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance date",
      });
    }

    if (!maintenanceType) {
      return res.status(400).json({
        success: false,
        message: "Maintenance type is required",
      });
    }

    const maintenanceTypeError = validateEnum(maintenanceType, MAINTENANCE_TYPES, "maintenance type");

    if (maintenanceTypeError) {
      return res.status(400).json({
        success: false,
        message: maintenanceTypeError,
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Maintenance title is required",
      });
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Maintenance title cannot exceed 200 characters",
      });
    }

    const finalPriority = priority || "MEDIUM";

    const priorityError = validateEnum(finalPriority, PRIORITIES, "priority");

    if (priorityError) {
      return res.status(400).json({
        success: false,
        message: priorityError,
      });
    }

    const finalStatus = status || "PENDING";

    const statusError = validateEnum(finalStatus, STATUSES, "status");

    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError,
      });
    }

    const dateOrderError = validateDateOrder({
      scheduledDate,
      completedDate,
    });

    if (dateOrderError) {
      return res.status(400).json({
        success: false,
        message: dateOrderError,
      });
    }

    if (finalStatus === "COMPLETED" && !completedDate) {
      return res.status(400).json({
        success: false,
        message: "Completed date is required when status is COMPLETED",
      });
    }

    if (finalStatus === "CANCELLED" && completedDate) {
      return res.status(400).json({
        success: false,
        message: "Cancelled maintenance cannot have a completed date",
      });
    }

    const costError = validateCosts({
      estimatedCost,
      actualCost,
    });

    if (costError) {
      return res.status(400).json({
        success: false,
        message: costError,
      });
    }

    const vendorError = validateVendor(vendor);

    if (vendorError) {
      return res.status(400).json({
        success: false,
        message: vendorError,
      });
    }

    const materialsError = validateMaterials(materialsUsed);

    if (materialsError) {
      return res.status(400).json({
        success: false,
        message: materialsError,
      });
    }

    const beforeImagesError = validateImages(beforeImages, "beforeImages");

    if (beforeImagesError) {
      return res.status(400).json({
        success: false,
        message: beforeImagesError,
      });
    }

    const afterImagesError = validateImages(afterImages, "afterImages");

    if (afterImagesError) {
      return res.status(400).json({
        success: false,
        message: afterImagesError,
      });
    }

    let finalReportedBy = reportedBy || req.user._id;

    if (!isValidObjectId(finalReportedBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reported by user ID",
      });
    }

    const reportedValidation = await validateStaffUser(finalReportedBy);

    if (!reportedValidation.valid) {
      return res.status(reportedValidation.status).json({
        success: false,
        message: reportedValidation.message,
      });
    }

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      const assignedValidation = await validateStaffUser(assignedTo);

      if (!assignedValidation.valid) {
        return res.status(assignedValidation.status).json({
          success: false,
          message: assignedValidation.message,
        });
      }
    }

    const descriptionValue = normalizeOptionalText(description, "Description", MAX_DESCRIPTION_LENGTH);

    const notesValue = normalizeOptionalText(notes, "Notes", MAX_NOTES_LENGTH);

    let finalCompletedDate = completedDate || null;

    if (finalStatus === "COMPLETED" && !finalCompletedDate) {
      finalCompletedDate = new Date();
    }

    const maintenance = await ShedMaintenance.create({
      farm,
      shed,

      maintenanceDate: new Date(maintenanceDate),

      maintenanceType,

      title: title.trim(),

      description: descriptionValue,

      priority: finalPriority,

      reportedBy: finalReportedBy,

      assignedTo: assignedTo || null,

      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,

      completedDate: finalCompletedDate ? new Date(finalCompletedDate) : null,

      status: finalStatus,

      estimatedCost: toNumber(estimatedCost),

      actualCost: toNumber(actualCost),

      vendor: normalizeVendor(vendor),

      materialsUsed: normalizeMaterials(materialsUsed),

      beforeImages: normalizeImages(beforeImages),

      afterImages: normalizeImages(afterImages),

      notes: notesValue,
    });

    const populatedMaintenance = await populateMaintenance(ShedMaintenance.findById(maintenance._id));

    return res.status(201).json({
      success: true,
      message: "Shed maintenance record created successfully",
      data: populatedMaintenance,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
const getShedMaintenances = async (req, res, next) => {
  try {
    const { farm, shed, maintenanceType, priority, status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const parsedPage = Number(page);

    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: "page must be a positive integer",
      });
    }

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        message: "limit must be between 1 and 100",
      });
    }

    const filter = {};

    let farmIds = [];

    if (farm) {
      if (!isValidObjectId(farm)) {
        return res.status(400).json({
          success: false,
          message: "Invalid farm ID",
        });
      }

      const farmDoc = await validateFarmOwnership(farm, req.user._id);

      if (!farmDoc) {
        return res.status(404).json({
          success: false,
          message: "Farm not found or access denied",
        });
      }

      farmIds = [farm];
      filter.farm = farm;
    } else {
      const farms = await Farm.find({
        owner: req.user._id,
      }).select("_id");

      farmIds = farms.map((item) => item._id);

      filter.farm = {
        $in: farmIds,
      };
    }

    if (shed) {
      if (!isValidObjectId(shed)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shed ID",
        });
      }

      const shedDoc = await Shed.findOne({
        _id: shed,
        farm: {
          $in: farmIds,
        },
      });

      if (!shedDoc) {
        return res.status(400).json({
          success: false,
          message: "Shed not found or access denied",
        });
      }

      filter.shed = shed;
    }

    if (maintenanceType) {
      const error = validateEnum(maintenanceType, MAINTENANCE_TYPES, "maintenance type");

      if (error) {
        return res.status(400).json({
          success: false,
          message: error,
        });
      }

      filter.maintenanceType = maintenanceType;
    }

    if (priority) {
      const error = validateEnum(priority, PRIORITIES, "priority");

      if (error) {
        return res.status(400).json({
          success: false,
          message: error,
        });
      }

      filter.priority = priority;
    }

    if (status) {
      const error = validateEnum(status, STATUSES, "status");

      if (error) {
        return res.status(400).json({
          success: false,
          message: error,
        });
      }

      filter.status = status;
    }

    if (fromDate && !isValidDate(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate",
      });
    }

    if (toDate && !isValidDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate",
      });
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be after toDate",
      });
    }

    if (fromDate || toDate) {
      filter.maintenanceDate = {};

      if (fromDate) {
        filter.maintenanceDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.maintenanceDate.$lte = endDate;
      }
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const [records, total] = await Promise.all([
      populateMaintenance(
        ShedMaintenance.find(filter)
          .sort({
            maintenanceDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(parsedLimit)
      ),

      ShedMaintenance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: records.length,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE
const getShedMaintenanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance ID",
      });
    }

    const maintenance = await populateMaintenance(ShedMaintenance.findById(id));

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    const farmId = maintenance.farm?._id || maintenance.farm;

    const farmDoc = await validateFarmOwnership(farmId, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: maintenance,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
const updateShedMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance ID",
      });
    }

    const maintenance = await ShedMaintenance.findById(id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(maintenance.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { shed, maintenanceDate, maintenanceType, title, description, priority, reportedBy, assignedTo, scheduledDate, completedDate, status, estimatedCost, actualCost, vendor, materialsUsed, beforeImages, afterImages, notes } = req.body;

    // -------------------------
    // VALIDATE EVERYTHING FIRST
    // -------------------------

    const nextShed = shed !== undefined ? shed : maintenance.shed;

    if (!nextShed || !isValidObjectId(nextShed)) {
      return res.status(400).json({
        success: false,
        message: "Valid shed is required",
      });
    }

    const shedDoc = await validateShedBelongsToFarm(nextShed, maintenance.farm);

    if (!shedDoc) {
      return res.status(400).json({
        success: false,
        message: "Shed does not belong to the selected farm",
      });
    }

    const nextMaintenanceDate = maintenanceDate !== undefined ? maintenanceDate : maintenance.maintenanceDate;

    if (!isValidDate(nextMaintenanceDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance date",
      });
    }

    const nextMaintenanceType = maintenanceType !== undefined ? maintenanceType : maintenance.maintenanceType;

    const maintenanceTypeError = validateEnum(nextMaintenanceType, MAINTENANCE_TYPES, "maintenance type");

    if (maintenanceTypeError) {
      return res.status(400).json({
        success: false,
        message: maintenanceTypeError,
      });
    }

    const nextTitle = title !== undefined ? title : maintenance.title;

    if (typeof nextTitle !== "string" || !nextTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Maintenance title cannot be empty",
      });
    }

    if (nextTitle.trim().length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Maintenance title cannot exceed 200 characters",
      });
    }

    const nextDescription = description !== undefined ? description : maintenance.description;

    if (nextDescription !== undefined && nextDescription !== null && typeof nextDescription !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const descriptionValue = normalizeOptionalText(nextDescription, "Description", MAX_DESCRIPTION_LENGTH);

    const nextPriority = priority !== undefined ? priority : maintenance.priority;

    const priorityError = validateEnum(nextPriority, PRIORITIES, "priority");

    if (priorityError) {
      return res.status(400).json({
        success: false,
        message: priorityError,
      });
    }

    const nextReportedBy = reportedBy !== undefined ? reportedBy : maintenance.reportedBy;

    if (nextReportedBy && !isValidObjectId(nextReportedBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reported by user ID",
      });
    }

    if (nextReportedBy) {
      const validation = await validateStaffUser(nextReportedBy);

      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message,
        });
      }
    }

    const nextAssignedTo = assignedTo !== undefined ? assignedTo : maintenance.assignedTo;

    if (nextAssignedTo && !isValidObjectId(nextAssignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned user ID",
      });
    }

    if (nextAssignedTo) {
      const validation = await validateStaffUser(nextAssignedTo);

      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message,
        });
      }
    }

    const nextScheduledDate = scheduledDate !== undefined ? scheduledDate : maintenance.scheduledDate;

    const nextCompletedDate = completedDate !== undefined ? completedDate : maintenance.completedDate;

    if (nextScheduledDate && !isValidDate(nextScheduledDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scheduled date",
      });
    }

    if (nextCompletedDate && !isValidDate(nextCompletedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid completed date",
      });
    }

    const dateOrderError = validateDateOrder({
      scheduledDate: nextScheduledDate,
      completedDate: nextCompletedDate,
    });

    if (dateOrderError) {
      return res.status(400).json({
        success: false,
        message: dateOrderError,
      });
    }

    const nextStatus = status !== undefined ? status : maintenance.status;

    const statusError = validateEnum(nextStatus, STATUSES, "status");

    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError,
      });
    }

    let finalCompletedDate = nextCompletedDate || null;

    if (nextStatus === "COMPLETED" && !finalCompletedDate) {
      finalCompletedDate = new Date();
    }

    if (nextStatus === "CANCELLED" && finalCompletedDate) {
      return res.status(400).json({
        success: false,
        message: "Cancelled maintenance cannot have a completed date",
      });
    }

    const nextEstimatedCost = estimatedCost !== undefined ? estimatedCost : maintenance.estimatedCost;

    const nextActualCost = actualCost !== undefined ? actualCost : maintenance.actualCost;

    const costError = validateCosts({
      estimatedCost: nextEstimatedCost,
      actualCost: nextActualCost,
    });

    if (costError) {
      return res.status(400).json({
        success: false,
        message: costError,
      });
    }

    const nextVendor = vendor !== undefined ? vendor : maintenance.vendor;

    const vendorError = validateVendor(nextVendor);

    if (vendorError) {
      return res.status(400).json({
        success: false,
        message: vendorError,
      });
    }

    const nextMaterials = materialsUsed !== undefined ? materialsUsed : maintenance.materialsUsed;

    const materialsError = validateMaterials(nextMaterials);

    if (materialsError) {
      return res.status(400).json({
        success: false,
        message: materialsError,
      });
    }

    const nextBeforeImages = beforeImages !== undefined ? beforeImages : maintenance.beforeImages;

    const beforeImagesError = validateImages(nextBeforeImages, "beforeImages");

    if (beforeImagesError) {
      return res.status(400).json({
        success: false,
        message: beforeImagesError,
      });
    }

    const nextAfterImages = afterImages !== undefined ? afterImages : maintenance.afterImages;

    const afterImagesError = validateImages(nextAfterImages, "afterImages");

    if (afterImagesError) {
      return res.status(400).json({
        success: false,
        message: afterImagesError,
      });
    }

    const nextNotes = notes !== undefined ? notes : maintenance.notes;

    const notesValue = normalizeOptionalText(nextNotes, "Notes", MAX_NOTES_LENGTH);

    // -------------------------
    // APPLY ONLY AFTER VALIDATION
    // -------------------------

    maintenance.shed = nextShed;

    maintenance.maintenanceDate = new Date(nextMaintenanceDate);

    maintenance.maintenanceType = nextMaintenanceType;

    maintenance.title = nextTitle.trim();

    maintenance.description = descriptionValue;

    maintenance.priority = nextPriority;

    maintenance.reportedBy = nextReportedBy || null;

    maintenance.assignedTo = nextAssignedTo || null;

    maintenance.scheduledDate = nextScheduledDate ? new Date(nextScheduledDate) : null;

    maintenance.completedDate = finalCompletedDate ? new Date(finalCompletedDate) : null;

    maintenance.status = nextStatus;

    maintenance.estimatedCost = toNumber(nextEstimatedCost);

    maintenance.actualCost = toNumber(nextActualCost);

    maintenance.vendor = normalizeVendor(nextVendor);

    maintenance.materialsUsed = normalizeMaterials(nextMaterials);

    maintenance.beforeImages = normalizeImages(nextBeforeImages);

    maintenance.afterImages = normalizeImages(nextAfterImages);

    maintenance.notes = notesValue;

    await maintenance.save();

    const updatedMaintenance = await populateMaintenance(ShedMaintenance.findById(maintenance._id));

    return res.status(200).json({
      success: true,
      message: "Shed maintenance record updated successfully",
      data: updatedMaintenance,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
const deleteShedMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maintenance ID",
      });
    }

    const maintenance = await ShedMaintenance.findById(id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(maintenance.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await maintenance.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Shed maintenance record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// UPLOAD IMAGE
const uploadShedMaintenanceImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "br30-kadaknath-farms/shed-maintenance",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    return res.status(201).json({
      success: true,
      message: "Shed maintenance image uploaded successfully",
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { createShedMaintenance, getShedMaintenances, getShedMaintenanceById, updateShedMaintenance, deleteShedMaintenance, uploadShedMaintenanceImage };
