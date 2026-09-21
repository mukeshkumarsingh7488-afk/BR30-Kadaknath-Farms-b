import Payroll from "../models/Payroll.js";
import Farm from "../models/Farm.js";
import User from "../models/User.js";

const PAYMENT_TYPES = ["MONTHLY", "DAILY_WAGE", "WEEKLY", "HOURLY", "CONTRACT"];

const PAYMENT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"];

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"];

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
};

const isFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  return Number.isFinite(Number(value));
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const isValidPayrollMonth = (value) => {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
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

const validateStaffForPayroll = async (staffId) => {
  const staffDoc = await validateStaff(staffId);

  if (!staffDoc) {
    return {
      valid: false,
      status: 404,
      message: "Staff user not found",
    };
  }

  if (!["staff", "admin"].includes(staffDoc.role)) {
    return {
      valid: false,
      status: 400,
      message: "Payroll can only be created for staff or admin users",
    };
  }

  if (staffDoc.isBlocked) {
    return {
      valid: false,
      status: 400,
      message: "Blocked staff cannot be used for payroll",
    };
  }

  return {
    valid: true,
    staffDoc,
  };
};

const validateNonNegativeNumbers = (fields) => {
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

const validateDayCounts = ({ workingDays, presentDays, absentDays, halfDays, leaveDays }) => {
  const values = {
    workingDays: toNumber(workingDays),
    presentDays: toNumber(presentDays),
    absentDays: toNumber(absentDays),
    halfDays: toNumber(halfDays),
    leaveDays: toNumber(leaveDays),
  };

  for (const [field, value] of Object.entries(values)) {
    if (!Number.isInteger(value)) {
      return `${field} must be a whole number`;
    }
  }

  if (values.presentDays > values.workingDays) {
    return "Present days cannot be greater than working days";
  }

  if (values.absentDays > values.workingDays) {
    return "Absent days cannot be greater than working days";
  }

  if (values.halfDays > values.workingDays) {
    return "Half days cannot be greater than working days";
  }

  if (values.leaveDays > values.workingDays) {
    return "Leave days cannot be greater than working days";
  }

  const attendanceTotal = values.presentDays + values.absentDays + values.halfDays * 0.5 + values.leaveDays;

  if (attendanceTotal > values.workingDays) {
    return "Attendance days cannot exceed working days";
  }

  return null;
};

const calculatePayroll = (data) => {
  const basicSalary = toNumber(data.basicSalary);
  const dailyRate = toNumber(data.dailyRate);
  const hourlyRate = toNumber(data.hourlyRate);

  const presentDays = toNumber(data.presentDays);
  const halfDays = toNumber(data.halfDays);

  const overtimeAmount = toNumber(data.overtimeAmount);
  const bonus = toNumber(data.bonus);
  const allowances = toNumber(data.allowances);

  const advanceAmount = toNumber(data.advanceAmount);
  const deductions = toNumber(data.deductions);

  let calculatedBasicSalary = basicSalary;

  if (data.paymentType === "DAILY_WAGE" && dailyRate > 0) {
    calculatedBasicSalary = presentDays * dailyRate + halfDays * dailyRate * 0.5;
  }

  if (data.paymentType === "HOURLY" && hourlyRate > 0) {
    calculatedBasicSalary = presentDays * hourlyRate * 8;
  }

  const grossSalary = calculatedBasicSalary + overtimeAmount + bonus + allowances;

  const netSalary = grossSalary - advanceAmount - deductions;

  return {
    basicSalary: Number(calculatedBasicSalary.toFixed(2)),
    overtimeAmount: Number(overtimeAmount.toFixed(2)),
    grossSalary: Number(grossSalary.toFixed(2)),
    netSalary: Number(netSalary.toFixed(2)),
  };
};

const getAutomaticPaymentStatus = (paidAmount, netSalary) => {
  if (paidAmount <= 0) {
    return "PENDING";
  }

  if (paidAmount < netSalary) {
    return "PARTIALLY_PAID";
  }

  return "PAID";
};

const validatePaymentDetails = ({ paymentStatus, paidAmount, netSalary, paymentDate, paymentMethod }) => {
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return "Invalid payment status";
  }

  if (paymentStatus !== "CANCELLED" && paidAmount > netSalary) {
    return "Paid amount cannot be greater than net salary";
  }

  if (paymentStatus === "PAID" && paidAmount < netSalary) {
    return "PAID status requires paid amount to equal net salary";
  }

  if (paymentStatus === "PARTIALLY_PAID" && (paidAmount <= 0 || paidAmount >= netSalary)) {
    return "PARTIALLY_PAID status requires paid amount between 0 and net salary";
  }

  if (paymentStatus === "PENDING" && paidAmount > 0) {
    return "PENDING status cannot have a paid amount";
  }

  if (paymentStatus !== "PENDING" && paymentStatus !== "CANCELLED" && paymentDate && !isValidDate(paymentDate)) {
    return "Invalid payment date";
  }

  if (paymentMethod !== undefined && paymentMethod !== null && paymentMethod !== "" && !PAYMENT_METHODS.includes(paymentMethod)) {
    return "Invalid payment method";
  }

  return null;
};

const createPayroll = async (req, res, next) => {
  try {
    const {
      farm,
      staff,
      payrollMonth,
      paymentType,
      workingDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      overtimeHours,
      basicSalary,
      dailyRate,
      hourlyRate,
      overtimeAmount,
      bonus,
      allowances,
      advanceAmount,
      deductions,
      paymentStatus,
      paidAmount,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
    } = req.body;

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

    const staffValidation = await validateStaffForPayroll(staff);

    if (!staffValidation.valid) {
      return res.status(staffValidation.status).json({
        success: false,
        message: staffValidation.message,
      });
    }

    if (!payrollMonth?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Payroll month is required",
      });
    }

    const normalizedPayrollMonth = payrollMonth.trim();

    if (!isValidPayrollMonth(normalizedPayrollMonth)) {
      return res.status(400).json({
        success: false,
        message: "Payroll month must be in YYYY-MM format",
      });
    }

    const finalPaymentType = paymentType || "MONTHLY";

    if (!PAYMENT_TYPES.includes(finalPaymentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    const existingPayroll = await Payroll.findOne({
      farm,
      staff,
      payrollMonth: normalizedPayrollMonth,
    });

    if (existingPayroll) {
      return res.status(409).json({
        success: false,
        message: "Payroll already exists for this staff and month",
      });
    }

    const numericFields = {
      workingDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      overtimeHours,
      basicSalary,
      dailyRate,
      hourlyRate,
      overtimeAmount,
      bonus,
      allowances,
      advanceAmount,
      deductions,
      paidAmount,
    };

    const numericError = validateNonNegativeNumbers(numericFields);

    if (numericError) {
      return res.status(400).json({
        success: false,
        message: numericError,
      });
    }

    const dayCountError = validateDayCounts({
      workingDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
    });

    if (dayCountError) {
      return res.status(400).json({
        success: false,
        message: dayCountError,
      });
    }

    const calculated = calculatePayroll({
      paymentType: finalPaymentType,
      presentDays,
      halfDays,
      basicSalary,
      dailyRate,
      hourlyRate,
      overtimeAmount,
      bonus,
      allowances,
      advanceAmount,
      deductions,
    });

    if (calculated.netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Net salary cannot be negative",
      });
    }

    const finalPaidAmount = toNumber(paidAmount);

    if (finalPaidAmount > calculated.netSalary) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot be greater than net salary",
      });
    }

    const finalPaymentStatus = paymentStatus || getAutomaticPaymentStatus(finalPaidAmount, calculated.netSalary);

    const paymentError = validatePaymentDetails({
      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,
      netSalary: calculated.netSalary,
      paymentDate,
      paymentMethod,
    });

    if (paymentError) {
      return res.status(400).json({
        success: false,
        message: paymentError,
      });
    }

    const payroll = await Payroll.create({
      farm,
      staff,
      payrollMonth: normalizedPayrollMonth,
      paymentType: finalPaymentType,

      workingDays: toNumber(workingDays),
      presentDays: toNumber(presentDays),
      absentDays: toNumber(absentDays),
      halfDays: toNumber(halfDays),
      leaveDays: toNumber(leaveDays),

      overtimeHours: toNumber(overtimeHours),

      basicSalary: calculated.basicSalary,
      dailyRate: toNumber(dailyRate),
      hourlyRate: toNumber(hourlyRate),

      overtimeAmount: calculated.overtimeAmount,
      bonus: toNumber(bonus),
      allowances: toNumber(allowances),

      grossSalary: calculated.grossSalary,

      advanceAmount: toNumber(advanceAmount),
      deductions: toNumber(deductions),

      netSalary: calculated.netSalary,

      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,

      paymentDate: finalPaymentStatus === "PENDING" || finalPaymentStatus === "CANCELLED" ? null : paymentDate || new Date(),

      paymentMethod: finalPaymentStatus === "PENDING" || finalPaymentStatus === "CANCELLED" ? null : paymentMethod || null,

      transactionReference: transactionReference?.trim() || "",

      processedBy: req.user._id,
      notes: notes?.trim() || "",
    });

    const populatedPayroll = await Payroll.findById(payroll._id).populate("farm", "name code").populate("staff", "name email phone role").populate("processedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Payroll created successfully",
      data: populatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

const getPayrolls = async (req, res, next) => {
  try {
    const { farm, staff, payrollMonth, paymentType, paymentStatus } = req.query;

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

      const staffValidation = await validateStaffForPayroll(staff);

      if (!staffValidation.valid) {
        return res.status(staffValidation.status).json({
          success: false,
          message: staffValidation.message,
        });
      }

      filter.staff = staff;
    }

    if (payrollMonth) {
      if (!isValidPayrollMonth(payrollMonth)) {
        return res.status(400).json({
          success: false,
          message: "Payroll month must be in YYYY-MM format",
        });
      }

      filter.payrollMonth = payrollMonth;
    }

    if (paymentType) {
      if (!PAYMENT_TYPES.includes(paymentType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment type",
        });
      }

      filter.paymentType = paymentType;
    }

    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    const payrolls = await Payroll.find(filter).populate("farm", "name code").populate("staff", "name email phone role").populate("processedBy", "name email").sort({
      payrollMonth: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: payrolls.length,
      data: payrolls,
    });
  } catch (error) {
    next(error);
  }
};

const getPayrollById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findById(id).populate("farm", "name code").populate("staff", "name email phone role").populate("processedBy", "name email");

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    const farmId = payroll.farm?._id || payroll.farm;

    const farmDoc = await validateFarmOwnership(farmId, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

const updatePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    const farmDoc = await validateFarmOwnership(payroll.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const allowedFields = [
      "paymentType",
      "workingDays",
      "presentDays",
      "absentDays",
      "halfDays",
      "leaveDays",
      "overtimeHours",
      "basicSalary",
      "dailyRate",
      "hourlyRate",
      "overtimeAmount",
      "bonus",
      "allowances",
      "advanceAmount",
      "deductions",
      "paymentStatus",
      "paidAmount",
      "paymentDate",
      "paymentMethod",
      "transactionReference",
      "notes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        payroll[field] = req.body[field];
      }
    }

    if (!PAYMENT_TYPES.includes(payroll.paymentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    const numericFields = ["workingDays", "presentDays", "absentDays", "halfDays", "leaveDays", "overtimeHours", "basicSalary", "dailyRate", "hourlyRate", "overtimeAmount", "bonus", "allowances", "advanceAmount", "deductions", "paidAmount"];

    const numericValues = {};

    for (const field of numericFields) {
      if (!isFiniteNumber(payroll[field])) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid number`,
        });
      }

      const value = toNumber(payroll[field]);

      if (value < 0) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be negative`,
        });
      }

      payroll[field] = value;
      numericValues[field] = value;
    }

    const dayCountError = validateDayCounts({
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      absentDays: payroll.absentDays,
      halfDays: payroll.halfDays,
      leaveDays: payroll.leaveDays,
    });

    if (dayCountError) {
      return res.status(400).json({
        success: false,
        message: dayCountError,
      });
    }

    const calculated = calculatePayroll({
      paymentType: payroll.paymentType,
      presentDays: payroll.presentDays,
      halfDays: payroll.halfDays,
      basicSalary: payroll.basicSalary,
      dailyRate: payroll.dailyRate,
      hourlyRate: payroll.hourlyRate,
      overtimeAmount: payroll.overtimeAmount,
      bonus: payroll.bonus,
      allowances: payroll.allowances,
      advanceAmount: payroll.advanceAmount,
      deductions: payroll.deductions,
    });

    if (calculated.netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Net salary cannot be negative",
      });
    }

    payroll.basicSalary = calculated.basicSalary;
    payroll.overtimeAmount = calculated.overtimeAmount;
    payroll.grossSalary = calculated.grossSalary;
    payroll.netSalary = calculated.netSalary;

    if (payroll.paidAmount > payroll.netSalary) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot be greater than net salary",
      });
    }

    const finalPaymentStatus = req.body.paymentStatus !== undefined ? payroll.paymentStatus : getAutomaticPaymentStatus(payroll.paidAmount, payroll.netSalary);

    payroll.paymentStatus = finalPaymentStatus;

    const paymentError = validatePaymentDetails({
      paymentStatus: payroll.paymentStatus,
      paidAmount: payroll.paidAmount,
      netSalary: payroll.netSalary,
      paymentDate: payroll.paymentDate,
      paymentMethod: payroll.paymentMethod,
    });

    if (paymentError) {
      return res.status(400).json({
        success: false,
        message: paymentError,
      });
    }

    if (payroll.paymentStatus === "PENDING" || payroll.paymentStatus === "CANCELLED") {
      payroll.paymentDate = null;
      payroll.paymentMethod = null;
    } else if (!payroll.paymentDate) {
      payroll.paymentDate = new Date();
    } else if (!isValidDate(payroll.paymentDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    if (payroll.paymentMethod) {
      if (!PAYMENT_METHODS.includes(payroll.paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }
    }

    payroll.transactionReference = payroll.transactionReference?.trim() || "";

    payroll.notes = payroll.notes?.trim() || "";

    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id).populate("farm", "name code").populate("staff", "name email phone role").populate("processedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      data: updatedPayroll,
    });
  } catch (error) {
    next(error);
  }
};

const deletePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll ID",
      });
    }

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    const farmDoc = await validateFarmOwnership(payroll.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await Payroll.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Payroll deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createPayroll, getPayrolls, getPayrollById, updatePayroll, deletePayroll };
