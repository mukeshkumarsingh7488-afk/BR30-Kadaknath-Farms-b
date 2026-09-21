import mongoose from "mongoose";

import FarmExpense from "../models/FarmExpense.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";

const EXPENSE_CATEGORIES = ["FEED", "MEDICINE", "VACCINE", "CHICKS", "BIRDS", "LABOR", "ELECTRICITY", "WATER", "MAINTENANCE", "TRANSPORT", "PACKAGING", "BIOSECURITY", "VETERINARY", "EQUIPMENT", "RENT", "MARKETING", "OTHER"];

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CREDIT", "OTHER"];

const PAYMENT_STATUSES = ["PAID", "PENDING", "PARTIAL"];

const isValidObjectId = (value) => {
  return mongoose.isValidObjectId(value);
};

const isValidDate = (value) => {
  return value && !Number.isNaN(new Date(value).getTime());
};

const isFiniteNumber = (value) => {
  return Number.isFinite(Number(value));
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : NaN;
};

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const throwError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throwError(`Invalid ${fieldName}`);
  }
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && !isValidDate(startDate)) {
    throwError("Invalid startDate");
  }

  if (endDate && !isValidDate(endDate)) {
    throwError("Invalid endDate");
  }

  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      throwError("startDate cannot be greater than endDate");
    }
  }
};

const validateFarmOwnership = async (farmId, userId) => {
  if (!isValidObjectId(farmId)) {
    throwError("Invalid farm id");
  }

  if (!isValidObjectId(userId)) {
    throwError("Invalid user id", 401);
  }

  const farm = await Farm.findOne({
    _id: farmId,
    owner: userId,
  });

  if (!farm) {
    throwError("Farm not found or access denied", 404);
  }

  return farm;
};

const validateShedBelongsToFarm = async (shedId, farmId) => {
  if (!shedId) {
    return null;
  }

  if (!isValidObjectId(shedId)) {
    throwError("Invalid shed id");
  }

  const shed = await Shed.findOne({
    _id: shedId,
    farm: farmId,
  });

  if (!shed) {
    throwError("Shed not found or does not belong to this farm", 400);
  }

  return shed;
};

const validateBatchBelongsToFarm = async (batchId, farmId) => {
  if (!batchId) {
    return null;
  }

  if (!isValidObjectId(batchId)) {
    throwError("Invalid batch id");
  }

  const batch = await Batch.findOne({
    _id: batchId,
    farm: farmId,
  });

  if (!batch) {
    throwError("Batch not found or does not belong to this farm", 400);
  }

  return batch;
};

const validateAmounts = ({ amount, paidAmount, dueAmount }) => {
  const parsedAmount = toNumber(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    throwError("amount must be 0 or greater");
  }

  const parsedPaidAmount = toNumber(paidAmount, 0);

  if (!Number.isFinite(parsedPaidAmount) || parsedPaidAmount < 0) {
    throwError("paidAmount must be 0 or greater");
  }

  if (parsedPaidAmount > parsedAmount) {
    throwError("paidAmount cannot be greater than amount");
  }

  const calculatedDueAmount = roundMoney(parsedAmount - parsedPaidAmount);

  if (dueAmount !== undefined && dueAmount !== null && dueAmount !== "") {
    const parsedDueAmount = toNumber(dueAmount);

    if (!Number.isFinite(parsedDueAmount) || parsedDueAmount < 0) {
      throwError("dueAmount must be 0 or greater");
    }

    if (Math.abs(parsedDueAmount - calculatedDueAmount) > 0.01) {
      throwError("dueAmount does not match amount and paidAmount");
    }
  }

  let paymentStatus = "PENDING";

  if (parsedPaidAmount === 0) {
    paymentStatus = "PENDING";
  } else if (parsedPaidAmount < parsedAmount) {
    paymentStatus = "PARTIAL";
  } else {
    paymentStatus = "PAID";
  }

  return {
    amount: roundMoney(parsedAmount),
    paidAmount: roundMoney(parsedPaidAmount),
    dueAmount: calculatedDueAmount,
    paymentStatus,
  };
};

const normalizeVendor = (vendor) => {
  if (vendor === undefined || vendor === null || vendor === "") {
    return {};
  }

  if (typeof vendor !== "object" || Array.isArray(vendor)) {
    throwError("vendor must be an object");
  }

  const name = vendor.name !== undefined ? String(vendor.name).trim() : "";

  const phone = vendor.phone !== undefined ? String(vendor.phone).trim() : "";

  const invoiceNumber = vendor.invoiceNumber !== undefined ? String(vendor.invoiceNumber).trim() : "";

  if (name.length > 150) {
    throwError("vendor name cannot exceed 150 characters");
  }

  if (phone.length > 20) {
    throwError("vendor phone cannot exceed 20 characters");
  }

  if (invoiceNumber.length > 100) {
    throwError("vendor invoiceNumber cannot exceed 100 characters");
  }

  return {
    name,
    phone,
    invoiceNumber,
  };
};

const validateReceiptImage = (receiptImage) => {
  if (receiptImage === undefined || receiptImage === null || receiptImage === "") {
    return null;
  }

  if (typeof receiptImage !== "object" || Array.isArray(receiptImage)) {
    throwError("receiptImage must be an object");
  }

  if (receiptImage.url !== undefined && typeof receiptImage.url !== "string") {
    throwError("receiptImage.url must be a string");
  }

  if (receiptImage.publicId !== undefined && typeof receiptImage.publicId !== "string") {
    throwError("receiptImage.publicId must be a string");
  }

  return receiptImage;
};

const buildExpensePayload = async ({ body, farmId, userId }) => {
  const farm = await validateFarmOwnership(farmId, userId);

  if (!body.expenseDate || !isValidDate(body.expenseDate)) {
    throwError("Valid expenseDate is required");
  }

  if (!body.category) {
    throwError("category is required");
  }

  validateEnum(body.category, EXPENSE_CATEGORIES, "category");

  const title = String(body.title || "").trim();

  if (!title) {
    throwError("title is required");
  }

  if (title.length > 150) {
    throwError("title cannot exceed 150 characters");
  }

  const description = body.description !== undefined && body.description !== null ? String(body.description).trim() : "";

  if (description.length > 1000) {
    throwError("description cannot exceed 1000 characters");
  }

  const shed = await validateShedBelongsToFarm(body.shed, farmId);

  const batch = await validateBatchBelongsToFarm(body.batch, farmId);

  const paymentMethod = body.paymentMethod || "CASH";

  validateEnum(paymentMethod, PAYMENT_METHODS, "paymentMethod");

  const amounts = validateAmounts({
    amount: body.amount,
    paidAmount: body.paidAmount,
    dueAmount: body.dueAmount,
  });

  const vendor = normalizeVendor(body.vendor);

  const receiptImage = validateReceiptImage(body.receiptImage);

  let recurring = false;

  if (body.recurring !== undefined) {
    if (typeof body.recurring !== "boolean") {
      throwError("recurring must be true or false");
    }

    recurring = body.recurring;
  }

  const notes = body.notes !== undefined && body.notes !== null ? String(body.notes).trim() : "";

  if (notes.length > 1000) {
    throwError("notes cannot exceed 1000 characters");
  }

  return {
    farm: farm._id,
    shed: shed ? shed._id : null,
    batch: batch ? batch._id : null,

    expenseDate: new Date(body.expenseDate),

    category: body.category,

    title,

    description,

    ...amounts,

    paymentMethod,

    vendor,

    recurring,

    ...(receiptImage
      ? {
          receiptImage,
        }
      : {}),

    createdBy: userId,

    notes,
  };
};

// CREATE EXPENSE
export const createFarmExpense = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const farmId = req.body?.farm;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!farmId) {
      return res.status(400).json({
        success: false,
        message: "farm is required",
      });
    }

    const payload = await buildExpensePayload({
      body: req.body,
      farmId,
      userId,
    });

    const expense = await FarmExpense.create(payload);

    const populatedExpense = await FarmExpense.findById(expense._id).populate("farm", "name code").populate("shed", "name code type currentBirds capacity").populate("batch", "batchNumber batchName birdType currentQuantity status").populate("createdBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Farm expense created successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL EXPENSES
export const getFarmExpenses = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { farm, shed, batch, category, paymentMethod, paymentStatus, startDate, endDate, minAmount, maxAmount, page = 1, limit = 20 } = req.query;

    if (farm && !isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm id",
      });
    }

    if (shed && !isValidObjectId(shed)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shed id",
      });
    }

    if (batch && !isValidObjectId(batch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch id",
      });
    }

    if (category) {
      if (!EXPENSE_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }
    }

    if (paymentMethod) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid paymentMethod",
        });
      }
    }

    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid paymentStatus",
        });
      }
    }

    validateDateRange(startDate, endDate);

    if (minAmount !== undefined && (!isFiniteNumber(minAmount) || Number(minAmount) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid minAmount",
      });
    }

    if (maxAmount !== undefined && (!isFiniteNumber(maxAmount) || Number(maxAmount) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maxAmount",
      });
    }

    if (minAmount !== undefined && maxAmount !== undefined && Number(minAmount) > Number(maxAmount)) {
      return res.status(400).json({
        success: false,
        message: "minAmount cannot be greater than maxAmount",
      });
    }

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

    const farms = await Farm.find({
      ...(farm ? { _id: farm } : {}),
      owner: userId,
    })
      .select("_id")
      .lean();

    const farmIds = farms.map((item) => item._id);

    if (farm && farmIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    const filter = {
      farm: {
        $in: farmIds,
      },
    };

    if (shed) {
      filter.shed = shed;
    }

    if (batch) {
      filter.batch = batch;
    }

    if (category) {
      filter.category = category;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      filter.expenseDate = {};

      if (startDate) {
        filter.expenseDate.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);

        end.setHours(23, 59, 59, 999);

        filter.expenseDate.$lte = end;
      }
    }

    if (minAmount !== undefined) {
      filter.amount = {
        ...(filter.amount || {}),
        $gte: Number(minAmount),
      };
    }

    if (maxAmount !== undefined) {
      filter.amount = {
        ...(filter.amount || {}),
        $lte: Number(maxAmount),
      };
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const [expenses, total] = await Promise.all([
      FarmExpense.find(filter)
        .populate("farm", "name code")
        .populate("shed", "name code type")
        .populate("batch", "batchNumber batchName birdType currentQuantity status")
        .populate("createdBy", "name email role")
        .sort({
          expenseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(parsedLimit),

      FarmExpense.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE EXPENSE
export const getFarmExpenseById = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const expenseId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense id",
      });
    }

    const farms = await Farm.find({
      owner: userId,
    })
      .select("_id")
      .lean();

    const farmIds = farms.map((item) => item._id);

    const expense = await FarmExpense.findOne({
      _id: expenseId,
      farm: {
        $in: farmIds,
      },
    })
      .populate("farm", "name code")
      .populate("shed", "name code type currentBirds capacity")
      .populate("batch", "batchNumber batchName birdType currentQuantity status")
      .populate("createdBy", "name email role");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Farm expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE EXPENSE
export const updateFarmExpense = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const expenseId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense id",
      });
    }

    const expense = await FarmExpense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Farm expense not found",
      });
    }

    const farm = await Farm.findOne({
      _id: expense.farm,
      owner: userId,
    });

    if (!farm) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const body = {
      ...req.body,
      farm: expense.farm,
    };

    const payload = await buildExpensePayload({
      body,
      farmId: String(expense.farm),
      userId,
    });

    expense.expenseDate = payload.expenseDate;

    expense.category = payload.category;

    expense.title = payload.title;

    expense.description = payload.description;

    expense.amount = payload.amount;

    expense.paidAmount = payload.paidAmount;

    expense.dueAmount = payload.dueAmount;

    expense.paymentStatus = payload.paymentStatus;

    expense.paymentMethod = payload.paymentMethod;

    expense.vendor = payload.vendor;

    expense.recurring = payload.recurring;

    expense.notes = payload.notes;

    expense.shed = payload.shed;

    expense.batch = payload.batch;

    if (body.receiptImage !== undefined) {
      expense.receiptImage = payload.receiptImage;
    }

    await expense.save();

    const updatedExpense = await FarmExpense.findById(expense._id).populate("farm", "name code").populate("shed", "name code type currentBirds capacity").populate("batch", "batchNumber batchName birdType currentQuantity status").populate("createdBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Farm expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE EXPENSE
export const deleteFarmExpense = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const expenseId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(expenseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense id",
      });
    }

    const expense = await FarmExpense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Farm expense not found",
      });
    }

    const farm = await Farm.findOne({
      _id: expense.farm,
      owner: userId,
    });

    if (!farm) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await expense.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Farm expense deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
