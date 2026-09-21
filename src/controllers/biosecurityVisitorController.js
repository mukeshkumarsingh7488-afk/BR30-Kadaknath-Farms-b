import BiosecurityVisitor from "../models/BiosecurityVisitor.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import User from "../models/User.js";

const VISITOR_TYPES = ["SUPPLIER", "VETERINARIAN", "FARMER", "CUSTOMER", "STAFF", "DELIVERY", "GOVERNMENT", "TECHNICIAN", "OTHER"];

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
};

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const normalizeBoolean = (value) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return Boolean(value);
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
  if (!shedId || !isValidObjectId(shedId) || !isValidObjectId(farmId)) {
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

const validateApprover = async (userId) => {
  const user = await validateUser(userId);

  if (!user) {
    return {
      valid: false,
      status: 404,
      message: "Approver not found",
    };
  }

  if (!["staff", "admin"].includes(user.role)) {
    return {
      valid: false,
      status: 400,
      message: "Approver must be a staff or admin user",
    };
  }

  if (user.isBlocked) {
    return {
      valid: false,
      status: 400,
      message: "Approver account is blocked",
    };
  }

  return {
    valid: true,
    user,
  };
};

const validateVisitorType = (visitorType) => {
  if (!VISITOR_TYPES.includes(visitorType)) {
    return "Invalid visitor type";
  }

  return null;
};

const validateRiskLevel = (riskLevel) => {
  if (!RISK_LEVELS.includes(riskLevel)) {
    return "Invalid risk level";
  }

  return null;
};

const validateDateRange = ({ checkIn, checkOut }) => {
  if (checkIn && !isValidDate(checkIn)) {
    return "Invalid check-in date";
  }

  if (checkOut && !isValidDate(checkOut)) {
    return "Invalid check-out date";
  }

  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkOutDate < checkInDate) {
      return "Check-out cannot be before check-in";
    }
  }

  return null;
};

const validateObjectField = (value, fieldName) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return `${fieldName} must be an object`;
  }

  return null;
};

const createBiosecurityVisitor = async (req, res, next) => {
  try {
    const { farm, visitorName, phone, visitorType, purpose, companyName, vehicleNumber, visitDate, checkIn, checkOut, visitingShed, lastFarmVisitDate, visitedOtherPoultryFarmRecently, recentPoultryFarmDetails, biosecurityMeasures, healthDeclaration, riskLevel, approvedBy, notes } = req.body;

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

    if (!visitorName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Visitor name is required",
      });
    }

    if (visitorName.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Visitor name cannot exceed 150 characters",
      });
    }

    if (!visitorType) {
      return res.status(400).json({
        success: false,
        message: "Visitor type is required",
      });
    }

    const visitorTypeError = validateVisitorType(visitorType);

    if (visitorTypeError) {
      return res.status(400).json({
        success: false,
        message: visitorTypeError,
      });
    }

    if (!purpose?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Visit purpose is required",
      });
    }

    if (purpose.trim().length > 300) {
      return res.status(400).json({
        success: false,
        message: "Visit purpose cannot exceed 300 characters",
      });
    }

    if (!visitDate) {
      return res.status(400).json({
        success: false,
        message: "Visit date is required",
      });
    }

    if (!isValidDate(visitDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visit date",
      });
    }

    if (lastFarmVisitDate && !isValidDate(lastFarmVisitDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid last farm visit date",
      });
    }

    const dateRangeError = validateDateRange({
      checkIn,
      checkOut,
    });

    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message: dateRangeError,
      });
    }

    if (visitingShed) {
      if (!isValidObjectId(visitingShed)) {
        return res.status(400).json({
          success: false,
          message: "Invalid visiting shed ID",
        });
      }

      const shedDoc = await validateShedBelongsToFarm(visitingShed, farm);

      if (!shedDoc) {
        return res.status(400).json({
          success: false,
          message: "Visiting shed does not belong to the selected farm",
        });
      }
    }

    if (phone !== undefined && phone !== null) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone must be a string",
        });
      }

      if (phone.trim().length > 30) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot exceed 30 characters",
        });
      }
    }

    if (companyName !== undefined && companyName !== null) {
      if (typeof companyName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Company name must be a string",
        });
      }
    }

    if (vehicleNumber !== undefined && vehicleNumber !== null) {
      if (typeof vehicleNumber !== "string") {
        return res.status(400).json({
          success: false,
          message: "Vehicle number must be a string",
        });
      }
    }

    const measuresError = validateObjectField(biosecurityMeasures, "Biosecurity measures");

    if (measuresError) {
      return res.status(400).json({
        success: false,
        message: measuresError,
      });
    }

    const healthError = validateObjectField(healthDeclaration, "Health declaration");

    if (healthError) {
      return res.status(400).json({
        success: false,
        message: healthError,
      });
    }

    const finalRiskLevel = riskLevel || "LOW";

    const riskError = validateRiskLevel(finalRiskLevel);

    if (riskError) {
      return res.status(400).json({
        success: false,
        message: riskError,
      });
    }

    const recentlyVisited = normalizeBoolean(visitedOtherPoultryFarmRecently);

    if (recentlyVisited && !recentPoultryFarmDetails?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recent poultry farm visit details are required when this option is true",
      });
    }

    if (approvedBy) {
      if (!isValidObjectId(approvedBy)) {
        return res.status(400).json({
          success: false,
          message: "Invalid approver ID",
        });
      }

      const approverValidation = await validateApprover(approvedBy);

      if (!approverValidation.valid) {
        return res.status(approverValidation.status).json({
          success: false,
          message: approverValidation.message,
        });
      }
    }

    const visitor = await BiosecurityVisitor.create({
      farm,

      visitorName: visitorName.trim(),
      phone: phone?.trim() || "",
      visitorType,

      purpose: purpose.trim(),
      companyName: companyName?.trim() || "",
      vehicleNumber: vehicleNumber?.trim() || "",

      visitDate,
      checkIn: checkIn || null,
      checkOut: checkOut || null,

      visitingShed: visitingShed || null,

      lastFarmVisitDate: lastFarmVisitDate || null,

      visitedOtherPoultryFarmRecently: recentlyVisited,

      recentPoultryFarmDetails: recentPoultryFarmDetails?.trim() || "",

      biosecurityMeasures: biosecurityMeasures || {},

      healthDeclaration: healthDeclaration || {},

      riskLevel: finalRiskLevel,

      approvedBy: approvedBy || null,

      recordedBy: req.user._id,

      notes: notes?.trim() || "",
    });

    const populatedVisitor = await BiosecurityVisitor.findById(visitor._id).populate("farm", "name code").populate("visitingShed", "name code").populate("approvedBy", "name email role").populate("recordedBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Biosecurity visitor record created successfully",
      data: populatedVisitor,
    });
  } catch (error) {
    next(error);
  }
};

const getBiosecurityVisitors = async (req, res, next) => {
  try {
    const { farm, visitorType, riskLevel, visitingShed, fromDate, toDate } = req.query;

    const filter = {};

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

      filter.farm = farm;
    } else {
      const farms = await Farm.find({
        owner: req.user._id,
      }).select("_id");

      filter.farm = {
        $in: farms.map((item) => item._id),
      };
    }

    if (visitorType) {
      const visitorTypeError = validateVisitorType(visitorType);

      if (visitorTypeError) {
        return res.status(400).json({
          success: false,
          message: visitorTypeError,
        });
      }

      filter.visitorType = visitorType;
    }

    if (riskLevel) {
      const riskError = validateRiskLevel(riskLevel);

      if (riskError) {
        return res.status(400).json({
          success: false,
          message: riskError,
        });
      }

      filter.riskLevel = riskLevel;
    }

    if (visitingShed) {
      if (!isValidObjectId(visitingShed)) {
        return res.status(400).json({
          success: false,
          message: "Invalid visiting shed ID",
        });
      }

      const shedFarmId = farm || null;

      if (shedFarmId) {
        const shedDoc = await validateShedBelongsToFarm(visitingShed, shedFarmId);

        if (!shedDoc) {
          return res.status(400).json({
            success: false,
            message: "Visiting shed does not belong to the selected farm",
          });
        }
      } else {
        const farms = await Farm.find({
          owner: req.user._id,
        }).select("_id");

        const farmIds = farms.map((item) => item._id);

        const shedDoc = await Shed.findOne({
          _id: visitingShed,
          farm: { $in: farmIds },
        });

        if (!shedDoc) {
          return res.status(400).json({
            success: false,
            message: "Visiting shed not found or access denied",
          });
        }
      }

      filter.visitingShed = visitingShed;
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

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (from > to) {
        return res.status(400).json({
          success: false,
          message: "fromDate cannot be after toDate",
        });
      }
    }

    if (fromDate || toDate) {
      filter.visitDate = {};

      if (fromDate) {
        filter.visitDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.visitDate.$lte = endDate;
      }
    }

    const visitors = await BiosecurityVisitor.find(filter).populate("farm", "name code").populate("visitingShed", "name code").populate("approvedBy", "name email role").populate("recordedBy", "name email role").sort({
      visitDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors,
    });
  } catch (error) {
    next(error);
  }
};

const getBiosecurityVisitorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visitor record ID",
      });
    }

    const visitor = await BiosecurityVisitor.findById(id).populate("farm", "name code").populate("visitingShed", "name code").populate("approvedBy", "name email role").populate("recordedBy", "name email role");

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found",
      });
    }

    const farmId = visitor.farm?._id || visitor.farm;

    const farmDoc = await validateFarmOwnership(farmId, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    next(error);
  }
};

const updateBiosecurityVisitor = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visitor record ID",
      });
    }

    const visitor = await BiosecurityVisitor.findById(id);

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(visitor.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { visitorName, phone, visitorType, purpose, companyName, vehicleNumber, visitDate, checkIn, checkOut, visitingShed, lastFarmVisitDate, visitedOtherPoultryFarmRecently, recentPoultryFarmDetails, biosecurityMeasures, healthDeclaration, riskLevel, approvedBy, notes } = req.body;

    if (visitorName !== undefined) {
      if (typeof visitorName !== "string" || !visitorName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Visitor name cannot be empty",
        });
      }

      if (visitorName.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: "Visitor name cannot exceed 150 characters",
        });
      }

      visitor.visitorName = visitorName.trim();
    }

    if (phone !== undefined) {
      if (phone !== null && typeof phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone must be a string",
        });
      }

      visitor.phone = phone?.trim() || "";
    }

    if (visitorType !== undefined) {
      const visitorTypeError = validateVisitorType(visitorType);

      if (visitorTypeError) {
        return res.status(400).json({
          success: false,
          message: visitorTypeError,
        });
      }

      visitor.visitorType = visitorType;
    }

    if (purpose !== undefined) {
      if (typeof purpose !== "string" || !purpose.trim()) {
        return res.status(400).json({
          success: false,
          message: "Visit purpose cannot be empty",
        });
      }

      if (purpose.trim().length > 300) {
        return res.status(400).json({
          success: false,
          message: "Visit purpose cannot exceed 300 characters",
        });
      }

      visitor.purpose = purpose.trim();
    }

    if (companyName !== undefined) {
      if (companyName !== null && typeof companyName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Company name must be a string",
        });
      }

      visitor.companyName = companyName?.trim() || "";
    }

    if (vehicleNumber !== undefined) {
      if (vehicleNumber !== null && typeof vehicleNumber !== "string") {
        return res.status(400).json({
          success: false,
          message: "Vehicle number must be a string",
        });
      }

      visitor.vehicleNumber = vehicleNumber?.trim() || "";
    }

    if (visitDate !== undefined) {
      if (!isValidDate(visitDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid visit date",
        });
      }

      visitor.visitDate = visitDate;
    }

    if (checkIn !== undefined) {
      if (checkIn && !isValidDate(checkIn)) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-in date",
        });
      }

      visitor.checkIn = checkIn || null;
    }

    if (checkOut !== undefined) {
      if (checkOut && !isValidDate(checkOut)) {
        return res.status(400).json({
          success: false,
          message: "Invalid check-out date",
        });
      }

      visitor.checkOut = checkOut || null;
    }

    const dateRangeError = validateDateRange({
      checkIn: visitor.checkIn,
      checkOut: visitor.checkOut,
    });

    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message: dateRangeError,
      });
    }

    if (visitingShed !== undefined) {
      if (visitingShed) {
        if (!isValidObjectId(visitingShed)) {
          return res.status(400).json({
            success: false,
            message: "Invalid visiting shed ID",
          });
        }

        const shedDoc = await validateShedBelongsToFarm(visitingShed, visitor.farm);

        if (!shedDoc) {
          return res.status(400).json({
            success: false,
            message: "Visiting shed does not belong to the selected farm",
          });
        }
      }

      visitor.visitingShed = visitingShed || null;
    }

    if (lastFarmVisitDate !== undefined) {
      if (lastFarmVisitDate && !isValidDate(lastFarmVisitDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid last farm visit date",
        });
      }

      visitor.lastFarmVisitDate = lastFarmVisitDate || null;
    }

    if (visitedOtherPoultryFarmRecently !== undefined) {
      visitor.visitedOtherPoultryFarmRecently = normalizeBoolean(visitedOtherPoultryFarmRecently);
    }

    if (recentPoultryFarmDetails !== undefined) {
      if (recentPoultryFarmDetails !== null && typeof recentPoultryFarmDetails !== "string") {
        return res.status(400).json({
          success: false,
          message: "Recent poultry farm details must be a string",
        });
      }

      visitor.recentPoultryFarmDetails = recentPoultryFarmDetails?.trim() || "";
    }

    if (visitor.visitedOtherPoultryFarmRecently && !visitor.recentPoultryFarmDetails?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recent poultry farm visit details are required when this option is true",
      });
    }

    if (biosecurityMeasures !== undefined) {
      const measuresError = validateObjectField(biosecurityMeasures, "Biosecurity measures");

      if (measuresError) {
        return res.status(400).json({
          success: false,
          message: measuresError,
        });
      }

      visitor.biosecurityMeasures = biosecurityMeasures || {};
    }

    if (healthDeclaration !== undefined) {
      const healthError = validateObjectField(healthDeclaration, "Health declaration");

      if (healthError) {
        return res.status(400).json({
          success: false,
          message: healthError,
        });
      }

      visitor.healthDeclaration = healthDeclaration || {};
    }

    if (riskLevel !== undefined) {
      const riskError = validateRiskLevel(riskLevel);

      if (riskError) {
        return res.status(400).json({
          success: false,
          message: riskError,
        });
      }

      visitor.riskLevel = riskLevel;
    }

    if (approvedBy !== undefined) {
      if (approvedBy) {
        if (!isValidObjectId(approvedBy)) {
          return res.status(400).json({
            success: false,
            message: "Invalid approver ID",
          });
        }

        const approverValidation = await validateApprover(approvedBy);

        if (!approverValidation.valid) {
          return res.status(approverValidation.status).json({
            success: false,
            message: approverValidation.message,
          });
        }
      }

      visitor.approvedBy = approvedBy || null;
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "Notes must be a string",
        });
      }

      visitor.notes = notes?.trim() || "";
    }

    await visitor.save();

    const updatedVisitor = await BiosecurityVisitor.findById(visitor._id).populate("farm", "name code").populate("visitingShed", "name code").populate("approvedBy", "name email role").populate("recordedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Biosecurity visitor record updated successfully",
      data: updatedVisitor,
    });
  } catch (error) {
    next(error);
  }
};

const deleteBiosecurityVisitor = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visitor record ID",
      });
    }

    const visitor = await BiosecurityVisitor.findById(id);

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(visitor.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await BiosecurityVisitor.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Biosecurity visitor record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createBiosecurityVisitor, getBiosecurityVisitors, getBiosecurityVisitorById, updateBiosecurityVisitor, deleteBiosecurityVisitor };
