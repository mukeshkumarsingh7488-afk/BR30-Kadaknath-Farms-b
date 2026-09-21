import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Farm from "../models/Farm.js";
import Batch from "../models/Batch.js";
import Shed from "../models/Shed.js";

const PRODUCT_TYPES = ["LIVE_BIRD", "CHICK", "EGG", "HATCHING_EGG", "BREEDING_PAIR", "DRESSED_CHICKEN", "OTHER"];

const UNITS = ["PIECE", "KG", "DOZEN", "EGG", "PAIR"];

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CREDIT", "OTHER"];

const DELIVERY_STATUSES = ["NOT_REQUIRED", "PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID"];

const STOCK_PRODUCT_TYPES = new Set(["LIVE_BIRD", "CHICK", "BREEDING_PAIR"]);

const STOCK_UNIT_RULES = {
  LIVE_BIRD: "PIECE",
  CHICK: "PIECE",
  BREEDING_PAIR: "PAIR",
};

const isValidObjectId = (value) => {
  return mongoose.isValidObjectId(value);
};

const isValidDate = (value) => {
  return value && !Number.isNaN(new Date(value).getTime());
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

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const generateSaleNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);

  return `SALE-${timestamp}-${random}`;
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
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throwError("startDate cannot be greater than endDate");
    }
  }
};

const normalizeCustomer = (customer) => {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    throwError("Customer details are required");
  }

  const name = String(customer.name || "").trim();

  if (!name) {
    throwError("Customer name is required");
  }

  if (name.length > 150) {
    throwError("Customer name cannot exceed 150 characters");
  }

  const phone = customer.phone !== undefined && customer.phone !== null ? String(customer.phone).trim() : "";

  if (phone.length > 20) {
    throwError("Customer phone cannot exceed 20 characters");
  }

  const email = customer.email !== undefined && customer.email !== null ? String(customer.email).trim().toLowerCase() : "";

  if (email) {
    if (email.length > 150) {
      throwError("Customer email cannot exceed 150 characters");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throwError("Invalid customer email");
    }
  }

  const address = customer.address !== undefined && customer.address !== null ? String(customer.address).trim() : "";

  if (address.length > 500) {
    throwError("Customer address cannot exceed 500 characters");
  }

  return {
    name,
    phone,
    email,
    address,
  };
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throwError("At least one sale item is required");
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throwError(`Invalid sale item at index ${index}`);
    }

    const { productType, productName, batch, quantity, unit, weightKg, unitPrice, discount } = item;

    if (!productType) {
      throwError(`productType is required for item ${index + 1}`);
    }

    validateEnum(productType, PRODUCT_TYPES, `productType for item ${index + 1}`);

    const normalizedProductName = String(productName || "").trim();

    if (!normalizedProductName) {
      throwError(`productName is required for item ${index + 1}`);
    }

    if (normalizedProductName.length > 150) {
      throwError(`productName cannot exceed 150 characters for item ${index + 1}`);
    }

    validateEnum(unit, UNITS, `unit for item ${index + 1}`);

    const parsedQuantity = toNumber(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      throwError(`quantity must be greater than 0 for item ${index + 1}`);
    }

    /*
     * Bird stock cannot be sold in fractions.
     */
    if (STOCK_PRODUCT_TYPES.has(productType)) {
      if (!Number.isInteger(parsedQuantity)) {
        throwError(`quantity must be a whole number for ${productType} item ${index + 1}`);
      }

      const requiredUnit = STOCK_UNIT_RULES[productType];

      if (unit !== requiredUnit) {
        throwError(`${productType} must use ${requiredUnit} unit`);
      }

      if (!batch) {
        throwError(`Batch is required for ${productType} sale`);
      }

      if (!isValidObjectId(batch)) {
        throwError(`Invalid batch for item ${index + 1}`);
      }
    } else if (batch && !isValidObjectId(batch)) {
      throwError(`Invalid batch for item ${index + 1}`);
    }

    const parsedUnitPrice = toNumber(unitPrice);

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      throwError(`unitPrice must be 0 or greater for item ${index + 1}`);
    }

    const parsedDiscount = toNumber(discount, 0);

    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      throwError(`discount must be 0 or greater for item ${index + 1}`);
    }

    const grossAmount = roundMoney(parsedQuantity * parsedUnitPrice);

    if (parsedDiscount > grossAmount) {
      throwError(`Item discount cannot be greater than item amount for item ${index + 1}`);
    }

    const totalAmount = roundMoney(grossAmount - parsedDiscount);

    let normalizedWeightKg = 0;

    if (weightKg !== undefined && weightKg !== null && weightKg !== "") {
      normalizedWeightKg = toNumber(weightKg);

      if (!Number.isFinite(normalizedWeightKg) || normalizedWeightKg < 0) {
        throwError(`weightKg must be 0 or greater for item ${index + 1}`);
      }
    }

    return {
      productType,
      productName: normalizedProductName,
      batch: batch || null,
      quantity: parsedQuantity,
      unit,
      weightKg: normalizedWeightKg,
      unitPrice: roundMoney(parsedUnitPrice),
      discount: roundMoney(parsedDiscount),
      totalAmount,
    };
  });
};

const validateAndPrepareItems = async (items, farmId) => {
  const normalizedItems = normalizeItems(items);

  const batchIds = [...new Set(normalizedItems.filter((item) => item.batch).map((item) => String(item.batch)))];

  let batches = [];

  if (batchIds.length > 0) {
    batches = await Batch.find({
      _id: { $in: batchIds },
      farm: farmId,
    });
  }

  const batchMap = new Map(batches.map((batch) => [String(batch._id), batch]));

  for (const item of normalizedItems) {
    if (!item.batch) {
      continue;
    }

    const batch = batchMap.get(String(item.batch));

    if (!batch) {
      throwError(`Batch not found or does not belong to this farm: ${item.batch}`, 400);
    }

    if (STOCK_PRODUCT_TYPES.has(item.productType) && batch.status === "CANCELLED") {
      throwError(`Batch ${batch.batchNumber} is cancelled`);
    }
  }

  return {
    items: normalizedItems,
    batchMap,
  };
};

const getStockImpact = (items, deliveryStatus) => {
  if (deliveryStatus === "CANCELLED") {
    return new Map();
  }

  const stockMap = new Map();

  for (const item of items) {
    if (!STOCK_PRODUCT_TYPES.has(item.productType)) {
      continue;
    }

    const batchId = String(item.batch);

    let stockQuantity = Number(item.quantity);

    if (item.productType === "BREEDING_PAIR") {
      stockQuantity *= 2;
    }

    stockMap.set(batchId, (stockMap.get(batchId) || 0) + stockQuantity);
  }

  return stockMap;
};

/*
 * Validate all stock requirements BEFORE changing anything.
 * This prevents partial stock deduction when multiple batches
 * are involved in one sale.
 */
const prepareStockRecords = async (items, deliveryStatus) => {
  const stockMap = getStockImpact(items, deliveryStatus);

  if (stockMap.size === 0) {
    return [];
  }

  const records = [];

  for (const [batchId, quantity] of stockMap.entries()) {
    if (!isValidObjectId(batchId)) {
      throwError(`Invalid batch id: ${batchId}`);
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      throwError(`Batch not found: ${batchId}`);
    }

    if (batch.status === "CANCELLED") {
      throwError(`Batch ${batch.batchNumber} is cancelled`);
    }

    if (batch.currentQuantity < quantity) {
      throwError(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.currentQuantity}, required: ${quantity}`);
    }

    if (!batch.shed) {
      throwError(`Batch ${batch.batchNumber} is not linked to a shed`);
    }

    if (!isValidObjectId(batch.shed)) {
      throwError(`Invalid shed reference for batch ${batch.batchNumber}`);
    }

    const shed = await Shed.findById(batch.shed);

    if (!shed) {
      throwError(`Shed not found for batch ${batch.batchNumber}`);
    }

    if (shed.currentBirds < quantity) {
      throwError(`Insufficient bird stock in shed ${shed.code}. Available: ${shed.currentBirds}, required: ${quantity}`);
    }

    records.push({
      batch,
      shed,
      quantity,
    });
  }

  return records;
};

const applyBatchStock = async (items, deliveryStatus) => {
  const records = await prepareStockRecords(items, deliveryStatus);

  if (records.length === 0) {
    return;
  }

  for (const record of records) {
    const { batch, shed, quantity } = record;

    batch.currentQuantity -= quantity;
    shed.currentBirds -= quantity;

    if (batch.currentQuantity === 0) {
      batch.status = "COMPLETED";
      batch.completedAt = new Date();
    }

    await batch.save();
    await shed.save();
  }
};

const prepareRestoreRecords = async (items, deliveryStatus) => {
  const stockMap = getStockImpact(items, deliveryStatus);

  if (stockMap.size === 0) {
    return [];
  }

  const records = [];

  for (const [batchId, quantity] of stockMap.entries()) {
    if (!isValidObjectId(batchId)) {
      throwError(`Invalid batch id: ${batchId}`);
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      throwError(`Cannot restore stock because batch ${batchId} was not found`, 409);
    }

    if (!batch.shed) {
      throwError(`Cannot restore stock because batch ${batch.batchNumber} has no shed`);
    }

    const shed = await Shed.findById(batch.shed);

    if (!shed) {
      throwError(`Cannot restore stock because shed for batch ${batch.batchNumber} was not found`, 409);
    }

    if (shed.currentBirds + quantity > shed.capacity) {
      throwError(`Cannot restore stock because shed ${shed.code} capacity would be exceeded`);
    }

    records.push({
      batch,
      shed,
      quantity,
    });
  }

  return records;
};

const restoreBatchStock = async (items, deliveryStatus) => {
  const records = await prepareRestoreRecords(items, deliveryStatus);

  if (records.length === 0) {
    return;
  }

  for (const record of records) {
    const { batch, shed, quantity } = record;

    batch.currentQuantity += quantity;
    shed.currentBirds += quantity;

    if (batch.status === "COMPLETED" && batch.currentQuantity > 0) {
      batch.status = "ACTIVE";
      batch.completedAt = null;
    }

    await batch.save();
    await shed.save();
  }
};

const calculateTotals = ({ items, discount = 0, tax = 0, deliveryCharge = 0 }) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0));

  const saleDiscount = toNumber(discount, 0);
  const saleTax = toNumber(tax, 0);
  const saleDeliveryCharge = toNumber(deliveryCharge, 0);

  if (!Number.isFinite(saleDiscount) || saleDiscount < 0) {
    throwError("Sale discount must be 0 or greater");
  }

  if (!Number.isFinite(saleTax) || saleTax < 0) {
    throwError("Tax must be 0 or greater");
  }

  if (!Number.isFinite(saleDeliveryCharge) || saleDeliveryCharge < 0) {
    throwError("Delivery charge must be 0 or greater");
  }

  if (saleDiscount > subtotal) {
    throwError("Sale discount cannot be greater than subtotal");
  }

  const grandTotal = roundMoney(subtotal - saleDiscount + saleTax + saleDeliveryCharge);

  return {
    subtotal,
    discount: roundMoney(saleDiscount),
    tax: roundMoney(saleTax),
    deliveryCharge: roundMoney(saleDeliveryCharge),
    grandTotal,
  };
};

const calculatePayment = (grandTotal, paidAmount) => {
  const paid = toNumber(paidAmount, 0);

  if (!Number.isFinite(paid) || paid < 0) {
    throwError("paidAmount must be 0 or greater");
  }

  if (paid > grandTotal) {
    throwError("paidAmount cannot be greater than grandTotal");
  }

  const dueAmount = roundMoney(grandTotal - paid);

  let paymentStatus = "PENDING";

  if (paid === 0) {
    paymentStatus = "PENDING";
  } else if (paid < grandTotal) {
    paymentStatus = "PARTIAL";
  } else {
    paymentStatus = "PAID";
  }

  return {
    paidAmount: roundMoney(paid),
    dueAmount,
    paymentStatus,
  };
};

const validateCommonFields = (body) => {
  const { saleDate, customer, paymentMethod, deliveryStatus } = body;

  if (!saleDate || !isValidDate(saleDate)) {
    throwError("Valid saleDate is required");
  }

  normalizeCustomer(customer);

  if (paymentMethod !== undefined) {
    validateEnum(paymentMethod, PAYMENT_METHODS, "paymentMethod");
  }

  if (deliveryStatus !== undefined) {
    validateEnum(deliveryStatus, DELIVERY_STATUSES, "deliveryStatus");
  }
};

const normalizeSaleNumber = (value) => {
  const saleNumber = String(value || "").trim();

  if (!saleNumber) {
    return "";
  }

  if (saleNumber.length > 50) {
    throwError("saleNumber cannot exceed 50 characters");
  }

  return saleNumber.toUpperCase();
};

const buildSalePayload = async ({ body, farmId, userId }) => {
  if (!isValidObjectId(farmId)) {
    throwError("Invalid farm id");
  }

  if (!isValidObjectId(userId)) {
    throwError("Invalid user id", 401);
  }

  validateCommonFields(body);

  const farm = await Farm.findOne({
    _id: farmId,
    owner: userId,
  });

  if (!farm) {
    const error = new Error("Farm not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const { items } = await validateAndPrepareItems(body.items, farmId);

  const totals = calculateTotals({
    items,
    discount: body.discount,
    tax: body.tax,
    deliveryCharge: body.deliveryCharge,
  });

  const payment = calculatePayment(totals.grandTotal, body.paidAmount);

  const deliveryStatus = body.deliveryStatus || "NOT_REQUIRED";

  const customer = normalizeCustomer(body.customer);

  let invoiceNumber = "";

  if (body.invoiceNumber !== undefined) {
    invoiceNumber = String(body.invoiceNumber || "").trim();

    if (invoiceNumber.length > 100) {
      throwError("invoiceNumber cannot exceed 100 characters");
    }
  }

  let notes = "";

  if (body.notes !== undefined) {
    notes = String(body.notes || "").trim();

    if (notes.length > 1000) {
      throwError("notes cannot exceed 1000 characters");
    }
  }

  return {
    farm: farmId,

    saleDate: new Date(body.saleDate),

    customer,

    items,

    ...totals,

    paymentMethod: body.paymentMethod || "CASH",

    ...payment,

    deliveryStatus,

    invoiceNumber,

    notes,

    createdBy: userId,
  };
};

const populateSale = (query) => {
  return query.populate("farm", "name code").populate("items.batch", "batchNumber batchName birdType currentQuantity shed status").populate("createdBy", "name email role");
};

const validateQueryPagination = (page, limit) => {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    throwError("page must be a positive integer");
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throwError("limit must be a positive integer");
  }

  if (parsedLimit > 100) {
    throwError("limit cannot exceed 100");
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
};

// CREATE SALE
export const createSale = async (req, res, next) => {
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

    if (!isValidObjectId(farmId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm id",
      });
    }

    const payload = await buildSalePayload({
      body: req.body,
      farmId,
      userId,
    });

    const requestedSaleNumber = normalizeSaleNumber(req.body.saleNumber);

    const saleNumber = requestedSaleNumber || generateSaleNumber();

    const existingSale = await Sale.findOne({
      farm: farmId,
      saleNumber,
    });

    if (existingSale) {
      return res.status(409).json({
        success: false,
        message: "Sale number already exists",
      });
    }

    const sale = new Sale({
      ...payload,
      saleNumber,
    });

    /*
     * Stock is changed before sale save.
     * If sale save fails, restore the stock.
     */
    await applyBatchStock(payload.items, payload.deliveryStatus);

    try {
      await sale.save();
    } catch (saveError) {
      try {
        await restoreBatchStock(payload.items, payload.deliveryStatus);
      } catch (rollbackError) {
        saveError.message = `${saveError.message}. ` + `Stock rollback also failed: ${rollbackError.message}`;
        saveError.statusCode = 500;
      }

      throw saveError;
    }

    const populatedSale = await populateSale(Sale.findById(sale._id));

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      sale: populatedSale,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL SALES
export const getSales = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { farm, paymentStatus, deliveryStatus, customer, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (farm && !isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm id",
      });
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid paymentStatus",
      });
    }

    if (deliveryStatus && !DELIVERY_STATUSES.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliveryStatus",
      });
    }

    validateDateRange(startDate, endDate);

    const pagination = validateQueryPagination(page, limit);

    const farmFilter = farm
      ? {
          _id: farm,
          owner: userId,
        }
      : {
          owner: userId,
        };

    const farms = await Farm.find(farmFilter).select("_id").lean();

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

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (deliveryStatus) {
      filter.deliveryStatus = deliveryStatus;
    }

    if (customer) {
      const customerSearch = String(customer).trim();

      if (customerSearch) {
        filter["customer.name"] = {
          $regex: escapeRegex(customerSearch),
          $options: "i",
        };
      }
    }

    if (startDate || endDate) {
      filter.saleDate = {};

      if (startDate) {
        filter.saleDate.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filter.saleDate.$lte = end;
      }
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [sales, total] = await Promise.all([
      populateSale(
        Sale.find(filter)
          .sort({
            saleDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(pagination.limit)
      ),
      Sale.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: sales.length,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
      sales,
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE SALE
export const getSaleById = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const saleId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id",
      });
    }

    const farms = await Farm.find({
      owner: userId,
    })
      .select("_id")
      .lean();

    const farmIds = farms.map((item) => item._id);

    const sale = await populateSale(
      Sale.findOne({
        _id: saleId,
        farm: {
          $in: farmIds,
        },
      })
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SALE
export const updateSale = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const saleId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id",
      });
    }

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    const farm = await Farm.findOne({
      _id: sale.farm,
      owner: userId,
    });

    if (!farm) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const farmId = String(sale.farm);

    const body = {
      ...req.body,
      farm: sale.farm,
    };

    const payload = await buildSalePayload({
      body,
      farmId,
      userId,
    });

    const newSaleNumber = req.body.saleNumber !== undefined ? normalizeSaleNumber(req.body.saleNumber) : sale.saleNumber;

    if (!newSaleNumber) {
      return res.status(400).json({
        success: false,
        message: "saleNumber cannot be empty",
      });
    }

    if (req.body.saleNumber !== undefined && newSaleNumber !== sale.saleNumber) {
      const duplicate = await Sale.findOne({
        farm: sale.farm,
        saleNumber: newSaleNumber,
        _id: {
          $ne: sale._id,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Sale number already exists",
        });
      }
    }

    /*
     * STEP 1
     * Restore stock from old sale.
     */
    await restoreBatchStock(sale.items, sale.deliveryStatus);

    let newStockApplied = false;

    try {
      /*
       * STEP 2
       * Apply stock required by new sale.
       */
      await applyBatchStock(payload.items, payload.deliveryStatus);

      newStockApplied = true;

      /*
       * STEP 3
       * Update sale.
       */
      sale.saleNumber = newSaleNumber;
      sale.saleDate = payload.saleDate;
      sale.customer = payload.customer;
      sale.items = payload.items;
      sale.subtotal = payload.subtotal;
      sale.discount = payload.discount;
      sale.tax = payload.tax;
      sale.deliveryCharge = payload.deliveryCharge;
      sale.grandTotal = payload.grandTotal;
      sale.paymentMethod = payload.paymentMethod;
      sale.paidAmount = payload.paidAmount;
      sale.dueAmount = payload.dueAmount;
      sale.paymentStatus = payload.paymentStatus;
      sale.deliveryStatus = payload.deliveryStatus;

      if (req.body.invoiceNumber !== undefined) {
        sale.invoiceNumber = payload.invoiceNumber;
      }

      if (req.body.notes !== undefined) {
        sale.notes = payload.notes;
      }

      await sale.save();
    } catch (updateError) {
      /*
       * New stock was applied but sale update failed.
       * Remove new stock first.
       */
      if (newStockApplied) {
        try {
          await restoreBatchStock(payload.items, payload.deliveryStatus);
        } catch (rollbackNewError) {
          updateError.message = `${updateError.message}. ` + `New stock rollback failed: ${rollbackNewError.message}`;
          updateError.statusCode = 500;
          throw updateError;
        }
      }

      /*
       * Restore the original sale stock.
       */
      try {
        await applyBatchStock(sale.items, sale.deliveryStatus);
      } catch (rollbackOldError) {
        updateError.message = `${updateError.message}. ` + `Original stock restoration failed: ${rollbackOldError.message}`;
        updateError.statusCode = 500;
      }

      throw updateError;
    }

    const updatedSale = await populateSale(Sale.findById(sale._id));

    return res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: updatedSale,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE SALE
export const deleteSale = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const saleId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale id",
      });
    }

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    const farm = await Farm.findOne({
      _id: sale.farm,
      owner: userId,
    });

    if (!farm) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /*
     * Restore stock first.
     */
    await restoreBatchStock(sale.items, sale.deliveryStatus);

    try {
      await sale.deleteOne();
    } catch (deleteError) {
      /*
       * If sale deletion fails, put stock back
       * into the sold state.
       */
      try {
        await applyBatchStock(sale.items, sale.deliveryStatus);
      } catch (rollbackError) {
        deleteError.message = `${deleteError.message}. ` + `Stock rollback failed: ${rollbackError.message}`;
        deleteError.statusCode = 500;
      }

      throw deleteError;
    }

    return res.status(200).json({
      success: true,
      message: "Sale deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
