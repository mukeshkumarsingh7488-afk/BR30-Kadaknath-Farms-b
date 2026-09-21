import FeedInventory from "../models/FeedInventory.js";
import FeedConsumption from "../models/FeedConsumption.js";
import Farm from "../models/Farm.js";

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isFiniteNumber = (value) => {
  return Number.isFinite(Number(value));
};

const calculateStatus = (currentStockKg, reorderLevelKg, expiryDate) => {
  const today = getToday();

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return "EXPIRED";
    }
  }

  if (currentStockKg <= 0) {
    return "OUT_OF_STOCK";
  }

  if (currentStockKg <= reorderLevelKg) {
    return "LOW_STOCK";
  }

  return "AVAILABLE";
};

const validateFarmOwnership = async (farmId, userId) => {
  return Farm.findOne({
    _id: farmId,
    owner: userId,
  });
};

/*
 * Returns the actual quantity consumed through FeedConsumption.
 *
 * This is important because quantityUsedKg in FeedInventory should
 * remain consistent with actual consumption records.
 */
const getActualConsumedQuantity = async (feedId) => {
  const result = await FeedConsumption.aggregate([
    {
      $match: {
        feedInventory: feedId,
      },
    },
    {
      $group: {
        _id: null,
        totalUsedKg: {
          $sum: "$quantityKg",
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  return {
    totalUsedKg: result[0]?.totalUsedKg || 0,
    count: result[0]?.count || 0,
  };
};

// CREATE
export const createFeedInventory = async (req, res, next) => {
  try {
    const { farm, feedName, feedType, brand, batchNumber, supplier, purchaseDate, quantityReceivedKg, quantityUsedKg = 0, reorderLevelKg = 0, unitCostPerKg = 0, totalPurchaseCost, invoiceNumber, expiryDate, storageLocation, notes } = req.body;

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

    if (!feedName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feed name is required",
      });
    }

    if (!feedType) {
      return res.status(400).json({
        success: false,
        message: "Feed type is required",
      });
    }

    if (purchaseDate !== undefined && purchaseDate !== null && purchaseDate !== "" && !isValidDate(purchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase date",
      });
    }

    if (expiryDate !== undefined && expiryDate !== null && expiryDate !== "" && !isValidDate(expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date",
      });
    }

    const received = Number(quantityReceivedKg || 0);
    const used = Number(quantityUsedKg || 0);
    const reorderLevel = Number(reorderLevelKg || 0);
    const unitCost = Number(unitCostPerKg || 0);

    if (!isFiniteNumber(received) || received <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be greater than 0",
      });
    }

    if (!isFiniteNumber(used) || used < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot be negative",
      });
    }

    if (used > received) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot exceed quantity received",
      });
    }

    if (!isFiniteNumber(reorderLevel) || reorderLevel < 0) {
      return res.status(400).json({
        success: false,
        message: "Reorder level cannot be negative",
      });
    }

    if (!isFiniteNumber(unitCost) || unitCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit cost cannot be negative",
      });
    }

    const currentStock = received - used;

    const calculatedTotalCost = totalPurchaseCost !== undefined && totalPurchaseCost !== null && totalPurchaseCost !== "" ? Number(totalPurchaseCost) : received * unitCost;

    if (!isFiniteNumber(calculatedTotalCost) || calculatedTotalCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Total purchase cost cannot be negative",
      });
    }

    const status = calculateStatus(currentStock, reorderLevel, expiryDate);

    const feedInventory = await FeedInventory.create({
      farm,
      feedName: feedName.trim(),
      feedType,
      brand: brand?.trim(),
      batchNumber: batchNumber?.trim(),
      supplier,
      purchaseDate,
      quantityReceivedKg: received,
      quantityUsedKg: used,
      currentStockKg: currentStock,
      reorderLevelKg: reorderLevel,
      unitCostPerKg: unitCost,
      totalPurchaseCost: calculatedTotalCost,
      invoiceNumber: invoiceNumber?.trim(),
      expiryDate,
      storageLocation: storageLocation?.trim(),
      status,
      notes,
      addedBy: req.user._id,
    });

    const populatedFeed = await FeedInventory.findById(feedInventory._id).populate("farm", "name code");

    return res.status(201).json({
      success: true,
      message: "Feed inventory added successfully",
      data: populatedFeed,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getFeedInventories = async (req, res, next) => {
  try {
    const { farm, feedType, status, expiry, lowStock, page = 1, limit = 20 } = req.query;

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

    if (feedType) {
      query.feedType = feedType;
    }

    if (status) {
      query.status = status;
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
            $gt: ["$currentStockKg", 0],
          },
          {
            $lte: ["$currentStockKg", "$reorderLevelKg"],
          },
        ],
      };
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      FeedInventory.find(query)
        .populate("farm", "name code")
        .populate("addedBy", "name email")
        .sort({
          purchaseDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      FeedInventory.countDocuments(query),
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
export const getFeedInventoryById = async (req, res, next) => {
  try {
    const feed = await FeedInventory.findById(req.params.id).populate("farm", "name code owner").populate("addedBy", "name email");

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed inventory not found",
      });
    }

    if (String(feed.farm.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: feed,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateFeedInventory = async (req, res, next) => {
  try {
    const feed = await FeedInventory.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed inventory not found",
      });
    }

    const farmExists = await validateFarmOwnership(feed.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { feedName, feedType, brand, batchNumber, supplier, purchaseDate, quantityReceivedKg, quantityUsedKg, reorderLevelKg, unitCostPerKg, totalPurchaseCost, invoiceNumber, expiryDate, storageLocation, notes } = req.body;

    /*
     * Check actual consumption records.
     *
     * If FeedConsumption records exist, quantityUsedKg becomes
     * a protected derived value. This prevents inventory stock
     * from being manually changed away from actual consumption.
     */
    const actualConsumption = await getActualConsumedQuantity(feed._id);

    const hasConsumption = actualConsumption.count > 0;

    const actualUsedKg = Number(actualConsumption.totalUsedKg || 0);

    if (quantityUsedKg !== undefined && hasConsumption) {
      const requestedUsedKg = Number(quantityUsedKg);

      if (!isFiniteNumber(requestedUsedKg) || requestedUsedKg < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity used cannot be negative",
        });
      }

      if (Math.abs(requestedUsedKg - actualUsedKg) > 0.000001) {
        return res.status(409).json({
          success: false,
          message: "Quantity used cannot be manually changed because feed consumption records already exist. Edit the Feed Consumption records instead.",
          actualConsumedKg: actualUsedKg,
        });
      }
    }

    const received = quantityReceivedKg !== undefined ? Number(quantityReceivedKg) : Number(feed.quantityReceivedKg || 0);

    const used = hasConsumption ? actualUsedKg : quantityUsedKg !== undefined ? Number(quantityUsedKg) : Number(feed.quantityUsedKg || 0);

    const reorderLevel = reorderLevelKg !== undefined ? Number(reorderLevelKg) : Number(feed.reorderLevelKg || 0);

    const unitCost = unitCostPerKg !== undefined ? Number(unitCostPerKg) : Number(feed.unitCostPerKg || 0);

    if (!isFiniteNumber(received) || received <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity received must be greater than 0",
      });
    }

    if (!isFiniteNumber(used) || used < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot be negative",
      });
    }

    if (used > received) {
      return res.status(400).json({
        success: false,
        message: "Quantity used cannot exceed quantity received",
      });
    }

    if (!isFiniteNumber(reorderLevel) || reorderLevel < 0) {
      return res.status(400).json({
        success: false,
        message: "Reorder level cannot be negative",
      });
    }

    if (!isFiniteNumber(unitCost) || unitCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit cost cannot be negative",
      });
    }

    if (purchaseDate !== undefined && purchaseDate !== null && purchaseDate !== "" && !isValidDate(purchaseDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase date",
      });
    }

    const finalExpiryDate = expiryDate !== undefined ? expiryDate : feed.expiryDate;

    if (finalExpiryDate !== undefined && finalExpiryDate !== null && finalExpiryDate !== "" && !isValidDate(finalExpiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date",
      });
    }

    const currentStock = received - used;

    const calculatedTotalCost = totalPurchaseCost !== undefined && totalPurchaseCost !== null && totalPurchaseCost !== "" ? Number(totalPurchaseCost) : received * unitCost;

    if (!isFiniteNumber(calculatedTotalCost) || calculatedTotalCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Total purchase cost cannot be negative",
      });
    }

    const status = calculateStatus(currentStock, reorderLevel, finalExpiryDate);

    if (feedName !== undefined) {
      if (!feedName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Feed name cannot be empty",
        });
      }

      feed.feedName = feedName.trim();
    }

    if (feedType !== undefined) {
      if (!feedType) {
        return res.status(400).json({
          success: false,
          message: "Feed type cannot be empty",
        });
      }

      feed.feedType = feedType;
    }

    if (brand !== undefined) {
      feed.brand = brand?.trim();
    }

    if (batchNumber !== undefined) {
      feed.batchNumber = batchNumber?.trim();
    }

    if (supplier !== undefined) {
      feed.supplier = supplier;
    }

    if (purchaseDate !== undefined) {
      feed.purchaseDate = purchaseDate;
    }

    if (invoiceNumber !== undefined) {
      feed.invoiceNumber = invoiceNumber?.trim();
    }

    if (storageLocation !== undefined) {
      feed.storageLocation = storageLocation?.trim();
    }

    if (notes !== undefined) {
      feed.notes = notes;
    }

    feed.quantityReceivedKg = received;

    feed.quantityUsedKg = used;

    feed.currentStockKg = currentStock;

    feed.reorderLevelKg = reorderLevel;

    feed.unitCostPerKg = unitCost;

    feed.totalPurchaseCost = calculatedTotalCost;

    feed.expiryDate = finalExpiryDate;

    feed.status = status;

    await feed.save();

    const updatedFeed = await FeedInventory.findById(feed._id).populate("farm", "name code").populate("addedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Feed inventory updated successfully",
      data: updatedFeed,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteFeedInventory = async (req, res, next) => {
  try {
    const feed = await FeedInventory.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({
        success: false,
        message: "Feed inventory not found",
      });
    }

    const farmExists = await validateFarmOwnership(feed.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /*
     * Once consumption records exist, this inventory record
     * becomes part of the farm's historical stock trail.
     *
     * Do not delete it because FeedConsumption.feedInventory
     * would become invalid and historical stock calculations
     * would lose their source record.
     */
    const consumption = await getActualConsumedQuantity(feed._id);

    if (consumption.count > 0) {
      return res.status(409).json({
        success: false,
        message: "Feed inventory cannot be deleted because feed consumption records exist for this inventory",
        dependentRecords: [
          {
            type: "FeedConsumption",
            count: consumption.count,
            totalConsumedKg: consumption.totalUsedKg,
          },
        ],
        summary: {
          totalDependencies: consumption.count,
        },
      });
    }

    await FeedInventory.deleteOne({
      _id: feed._id,
    });

    return res.status(200).json({
      success: true,
      message: "Feed inventory deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
