import StaffAttendance from "../models/StaffAttendance.js";
import Farm from "../models/Farm.js";
import User from "../models/User.js";

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
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

const validateStaff = async (staffId) => {
  if (!isValidObjectId(staffId)) {
    return null;
  }

  return User.findById(staffId).select("_id name email phone role isBlocked");
};

const validateStaffAccount = (staffDoc) => {
  if (!staffDoc) {
    return {
      valid: false,
      status: 404,
      message: "Staff user not found",
    };
  }

  if (staffDoc.isBlocked) {
    return {
      valid: false,
      status: 400,
      message: "This staff account is blocked",
    };
  }

  if (!["staff", "admin"].includes(staffDoc.role)) {
    return {
      valid: false,
      status: 400,
      message: "Selected user is not a staff or admin account",
    };
  }

  return {
    valid: true,
  };
};

const normalizeDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const normalizeDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return {
      totalHours: 0,
      overtimeHours: 0,
    };
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      totalHours: 0,
      overtimeHours: 0,
    };
  }

  if (end <= start) {
    return null;
  }

  const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  const roundedTotalHours = Number(totalHours.toFixed(2));

  const overtimeHours = roundedTotalHours > 8 ? Number((roundedTotalHours - 8).toFixed(2)) : 0;

  return {
    totalHours: roundedTotalHours,
    overtimeHours,
  };
};

const validateCheckTimes = (checkIn, checkOut) => {
  if (checkIn && !isValidDate(checkIn)) {
    return "Invalid check-in time";
  }

  if (checkOut && !isValidDate(checkOut)) {
    return "Invalid check-out time";
  }

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) {
      return "Check-out time must be after check-in time";
    }
  }

  return null;
};

const allowedStatuses = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "WEEK_OFF"];

const validateStatus = (status) => {
  return allowedStatuses.includes(status);
};

const createStaffAttendance = async (req, res, next) => {
  try {
    const { farm, staff, date, status, checkIn, checkOut, workLocation, remarks } = req.body;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm is required",
      });
    }

    const farmDoc = await validateFarmOwnership(farm, req.user._id);

    if (!farmDoc) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Staff is required",
      });
    }

    if (!isValidObjectId(staff)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID",
      });
    }

    const staffDoc = await validateStaff(staff);

    const staffValidation = validateStaffAccount(staffDoc);

    if (!staffValidation.valid) {
      return res.status(staffValidation.status).json({
        success: false,
        message: staffValidation.message,
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Attendance date is required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Attendance status is required",
      });
    }

    if (!validateStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    const normalizedDate = normalizeDateOnly(date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    const checkTimeError = validateCheckTimes(checkIn, checkOut);

    if (checkTimeError) {
      return res.status(400).json({
        success: false,
        message: checkTimeError,
      });
    }

    const normalizedCheckIn = normalizeDateTime(checkIn);
    const normalizedCheckOut = normalizeDateTime(checkOut);

    const existingAttendance = await StaffAttendance.findOne({
      farm,
      staff,
      date: normalizedDate,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "Attendance already exists for this staff and date",
      });
    }

    const calculatedHours = calculateHours(normalizedCheckIn, normalizedCheckOut);

    if (!calculatedHours) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be after check-in time",
      });
    }

    const attendance = await StaffAttendance.create({
      farm,
      staff,
      date: normalizedDate,
      status,
      checkIn: normalizedCheckIn,
      checkOut: normalizedCheckOut,
      totalHours: calculatedHours.totalHours,
      overtimeHours: calculatedHours.overtimeHours,
      workLocation: workLocation?.trim() || "",
      remarks: remarks?.trim() || "",
      markedBy: req.user._id,
    });

    const populatedAttendance = await StaffAttendance.findById(attendance._id).populate("farm", "name code").populate("staff", "name email phone role").populate("markedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Staff attendance created successfully",
      data: populatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

const getStaffAttendances = async (req, res, next) => {
  try {
    const { farm, staff, status, fromDate, toDate } = req.query;

    const filter = {};

    if (farm) {
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

    if (staff) {
      if (!isValidObjectId(staff)) {
        return res.status(400).json({
          success: false,
          message: "Invalid staff ID",
        });
      }

      filter.staff = staff;
    }

    if (status) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
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

    if (fromDate && toDate) {
      const start = normalizeDateOnly(fromDate);
      const end = normalizeDateOnly(toDate);

      if (!start || !end) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range",
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "fromDate cannot be greater than toDate",
        });
      }
    }

    if (fromDate || toDate) {
      filter.date = {};

      if (fromDate) {
        const startDate = normalizeDateOnly(fromDate);

        filter.date.$gte = startDate;
      }

      if (toDate) {
        const endDate = normalizeDateOnly(toDate);

        endDate.setHours(23, 59, 59, 999);

        filter.date.$lte = endDate;
      }
    }

    const records = await StaffAttendance.find(filter).populate("farm", "name code").populate("staff", "name email phone role").populate("markedBy", "name email").sort({
      date: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const getStaffAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await StaffAttendance.findById(id).populate("farm", "name code").populate("staff", "name email phone role").populate("markedBy", "name email");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const farmId = attendance.farm?._id || attendance.farm;

    const farmDoc = await validateFarmOwnership(farmId, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

const updateStaffAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await StaffAttendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(attendance.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { date, status, checkIn, checkOut, workLocation, remarks } = req.body;

    if (date !== undefined) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance date",
        });
      }

      const normalizedDate = normalizeDateOnly(date);

      const duplicateAttendance = await StaffAttendance.findOne({
        _id: { $ne: attendance._id },
        farm: attendance.farm,
        staff: attendance.staff,
        date: normalizedDate,
      });

      if (duplicateAttendance) {
        return res.status(409).json({
          success: false,
          message: "Attendance already exists for this staff and date",
        });
      }

      attendance.date = normalizedDate;
    }

    if (status !== undefined) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      attendance.status = status;
    }

    const finalCheckIn = checkIn !== undefined ? checkIn || null : attendance.checkIn;

    const finalCheckOut = checkOut !== undefined ? checkOut || null : attendance.checkOut;

    const checkTimeError = validateCheckTimes(finalCheckIn, finalCheckOut);

    if (checkTimeError) {
      return res.status(400).json({
        success: false,
        message: checkTimeError,
      });
    }

    if (checkIn !== undefined) {
      attendance.checkIn = normalizeDateTime(checkIn);
    }

    if (checkOut !== undefined) {
      attendance.checkOut = normalizeDateTime(checkOut);
    }

    if (workLocation !== undefined) {
      attendance.workLocation = workLocation?.trim() || "";
    }

    if (remarks !== undefined) {
      attendance.remarks = remarks?.trim() || "";
    }

    const calculatedHours = calculateHours(attendance.checkIn, attendance.checkOut);

    if (!calculatedHours) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be after check-in time",
      });
    }

    attendance.totalHours = calculatedHours.totalHours;

    attendance.overtimeHours = calculatedHours.overtimeHours;

    await attendance.save();

    const updatedAttendance = await StaffAttendance.findById(attendance._id).populate("farm", "name code").populate("staff", "name email phone role").populate("markedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Staff attendance updated successfully",
      data: updatedAttendance,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStaffAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance ID",
      });
    }

    const attendance = await StaffAttendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(attendance.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await StaffAttendance.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Staff attendance deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createStaffAttendance, getStaffAttendances, getStaffAttendanceById, updateStaffAttendance, deleteStaffAttendance };
