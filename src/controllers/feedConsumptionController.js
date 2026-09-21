import FeedConsumption from "../models/FeedConsumption.js";
import FeedInventory from "../models/FeedInventory.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";
import FarmReport from "../models/FarmReport.js";

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

const calculateFeedStatus = (currentStockKg, reorderLevelKg, expiryDate) => {
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

const validateShed = async (shedId, farmId) => {
  if (!shedId) return null;

  return Shed.findOne({
    _id: shedId,
    farm: farmId,
  });
};

const validateBatch = async (batchId, farmId, shedId = null) => {
  if (!batchId) return null;

  const query = {
    _id: batchId,
    farm: farmId,
  };

  if (shedId) {
    query.shed = shedId;
  }

  return Batch.findOne(query);
};

const validateFeedInventory = async (feedInventoryId, farmId) => {
  return FeedInventory.findOne({
    _id: feedInventoryId,
    farm: farmId,
  });
};

const calculateValues = ({ quantityKg, birdCount, costPerKg }) => {
  const quantity = Number(quantityKg || 0);
  const birds = Number(birdCount || 0);
  const cost = Number(costPerKg || 0);

  const feedPerBirdGram = birds > 0 ? (quantity * 1000) / birds : 0;

  const totalCost = quantity * cost;

  return {
    feedPerBirdGram,
    totalCost,
  };
};

const hasFarmReportDependency = async ({ farm, batch, consumptionDate }) => {
  if (!consumptionDate) {
    return false;
  }

  const date = new Date(consumptionDate);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const reportQuery = {
    farm,
    periodStart: {
      $lte: date,
    },
    periodEnd: {
      $gte: date,
    },
  };

  /*
   * A farm-level report covers the consumption.
   * A batch report only matters when it belongs to this batch.
   */
  const reportConditions = [
    {
      ...reportQuery,
      batch: null,
    },
  ];

  if (batch) {
    reportConditions.push({
      ...reportQuery,
      batch,
    });
  }

  const count = await FarmReport.countDocuments({
    $or: reportConditions,
  });

  return count > 0;
};

const restoreInventoryStock = async (inventory, quantity) => {
  const oldUsed = Number(inventory.quantityUsedKg || 0);

  const restoreQuantity = Number(quantity || 0);

  const newUsed = oldUsed - restoreQuantity;

  if (newUsed < -0.000001) {
    throw new Error("Feed inventory stock history is inconsistent");
  }

  inventory.quantityUsedKg = Math.max(newUsed, 0);

  inventory.currentStockKg = Number(inventory.quantityReceivedKg || 0) - Number(inventory.quantityUsedKg || 0);

  if (inventory.currentStockKg < -0.000001) {
    throw new Error("Feed inventory current stock cannot become negative");
  }

  inventory.currentStockKg = Math.max(inventory.currentStockKg, 0);

  inventory.status = calculateFeedStatus(inventory.currentStockKg, Number(inventory.reorderLevelKg || 0), inventory.expiryDate);
};

const consumeInventoryStock = async (inventory, quantity) => {
  const requiredQuantity = Number(quantity || 0);

  const currentStock = Number(inventory.currentStockKg || 0);

  if (currentStock < requiredQuantity) {
    throw new Error(`Insufficient feed stock. Available stock: ${currentStock} kg`);
  }

  const newUsed = Number(inventory.quantityUsedKg || 0) + requiredQuantity;

  const received = Number(inventory.quantityReceivedKg || 0);

  if (newUsed > received + 0.000001) {
    throw new Error("Feed consumption cannot exceed quantity received");
  }

  inventory.quantityUsedKg = newUsed;

  inventory.currentStockKg = received - newUsed;

  inventory.currentStockKg = Math.max(inventory.currentStockKg, 0);

  inventory.status = calculateFeedStatus(inventory.currentStockKg, Number(inventory.reorderLevelKg || 0), inventory.expiryDate);
};

// CREATE
export const createFeedConsumption = async (req, res, next) => {
  try {
    const { farm, shed, batch, feedInventory, consumptionDate, feedType, quantityKg, birdCountAtConsumption, costPerKg, feedingSession, notes } = req.body;

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

    if (!feedInventory) {
      return res.status(400).json({
        success: false,
        message: "Feed inventory is required",
      });
    }

    if (!feedType) {
      return res.status(400).json({
        success: false,
        message: "Feed type is required",
      });
    }

    if (consumptionDate !== undefined && consumptionDate !== null && consumptionDate !== "" && !isValidDate(consumptionDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consumption date",
      });
    }

    const quantity = Number(quantityKg || 0);

    const birdCount = Number(birdCountAtConsumption || 0);

    if (!isFiniteNumber(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity consumed must be greater than 0",
      });
    }

    if (!isFiniteNumber(birdCount) || birdCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bird count must be greater than 0",
      });
    }

    if (shed) {
      const shedExists = await validateShed(shed, farm);

      if (!shedExists) {
        return res.status(404).json({
          success: false,
          message: "Shed not found for this farm",
        });
      }
    }

    if (batch) {
      const batchExists = await validateBatch(batch, farm, shed || null);

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found for this farm/shed",
        });
      }

      if (birdCount > Number(batchExists.currentQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: "Bird count cannot exceed current batch quantity",
        });
      }
    }

    const inventory = await validateFeedInventory(feedInventory, farm);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Feed inventory not found for this farm",
      });
    }

    if (inventory.expiryDate && new Date(inventory.expiryDate) < getToday()) {
      return res.status(400).json({
        success: false,
        message: "Cannot consume expired feed",
      });
    }

    if (Number(inventory.currentStockKg || 0) < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient feed stock. Available stock: ${inventory.currentStockKg} kg`,
      });
    }

    const finalCostPerKg = costPerKg !== undefined && costPerKg !== null && costPerKg !== "" ? Number(costPerKg) : Number(inventory.unitCostPerKg || 0);

    if (!isFiniteNumber(finalCostPerKg) || finalCostPerKg < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost per kg cannot be negative",
      });
    }

    const { feedPerBirdGram, totalCost } = calculateValues({
      quantityKg: quantity,
      birdCount,
      costPerKg: finalCostPerKg,
    });

    /*
     * First create the consumption record,
     * then update inventory.
     *
     * If inventory validation fails, no stock is changed.
     */
    const consumption = await FeedConsumption.create({
      farm,
      shed: shed || null,
      batch: batch || null,
      feedInventory,
      consumptionDate: consumptionDate || new Date(),
      feedType,
      quantityKg: quantity,
      birdCountAtConsumption: birdCount,
      feedPerBirdGram,
      costPerKg: finalCostPerKg,
      totalCost,
      feedingSession,
      recordedBy: req.user._id,
      notes,
    });

    try {
      await consumeInventoryStock(inventory, quantity);

      await inventory.save();
    } catch (inventoryError) {
      await FeedConsumption.deleteOne({
        _id: consumption._id,
      });

      return res.status(400).json({
        success: false,
        message: inventoryError.message || "Failed to update feed stock",
      });
    }

    const populatedConsumption = await FeedConsumption.findById(consumption._id)
      .populate("farm", "name code")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName")
      .populate("feedInventory", "feedName feedType currentStockKg unitCostPerKg status")
      .populate("recordedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Feed consumption recorded successfully",
      data: populatedConsumption,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getFeedConsumptions = async (req, res, next) => {
  try {
    const { farm, shed, batch, feedInventory, feedType, feedingSession, startDate, endDate, page = 1, limit = 20 } = req.query;

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

    if (shed) {
      query.shed = shed;
    }

    if (batch) {
      query.batch = batch;
    }

    if (feedInventory) {
      query.feedInventory = feedInventory;
    }

    if (feedType) {
      query.feedType = feedType;
    }

    if (feedingSession) {
      query.feedingSession = feedingSession;
    }

    if (startDate || endDate) {
      query.consumptionDate = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        query.consumptionDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        end.setHours(23, 59, 59, 999);

        query.consumptionDate.$lte = end;
      }
    }

    const pageNumber = Math.max(Number(page), 1);

    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      FeedConsumption.find(query)
        .populate("farm", "name code")
        .populate("shed", "name code")
        .populate("batch", "batchNumber batchName")
        .populate("feedInventory", "feedName feedType currentStockKg unitCostPerKg status")
        .populate("recordedBy", "name email")
        .sort({
          consumptionDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      FeedConsumption.countDocuments(query),
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
export const getFeedConsumptionById = async (req, res, next) => {
  try {
    const consumption = await FeedConsumption.findById(req.params.id)
      .populate("farm", "name code owner")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName currentQuantity")
      .populate("feedInventory", "feedName feedType currentStockKg unitCostPerKg status")
      .populate("recordedBy", "name email");

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: "Feed consumption record not found",
      });
    }

    if (String(consumption.farm.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: consumption,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateFeedConsumption = async (req, res, next) => {
  try {
    const consumption = await FeedConsumption.findById(req.params.id);

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: "Feed consumption record not found",
      });
    }

    const farmExists = await validateFarmOwnership(consumption.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /*
     * Historical report protection.
     *
     * If a report already contains this
     * consumption date, changing the source
     * record would make the snapshot inaccurate.
     */
    const reportExists = await hasFarmReportDependency({
      farm: consumption.farm,
      batch: consumption.batch,
      consumptionDate: consumption.consumptionDate,
    });

    if (reportExists) {
      return res.status(409).json({
        success: false,
        message: "Feed consumption cannot be edited because a historical farm report already covers this record date",
      });
    }

    const oldQuantity = Number(consumption.quantityKg || 0);

    const oldInventory = await FeedInventory.findOne({
      _id: consumption.feedInventory,
      farm: consumption.farm,
    });

    if (!oldInventory) {
      return res.status(404).json({
        success: false,
        message: "Original feed inventory not found",
      });
    }

    const { shed, batch, feedInventory, consumptionDate, feedType, quantityKg, birdCountAtConsumption, costPerKg, feedingSession, notes } = req.body;

    const newInventoryId = feedInventory || String(consumption.feedInventory);

    const newInventory = await FeedInventory.findOne({
      _id: newInventoryId,
      farm: consumption.farm,
    });

    if (!newInventory) {
      return res.status(404).json({
        success: false,
        message: "New feed inventory not found",
      });
    }

    const quantity = quantityKg !== undefined ? Number(quantityKg) : oldQuantity;

    const birdCount = birdCountAtConsumption !== undefined ? Number(birdCountAtConsumption) : Number(consumption.birdCountAtConsumption || 0);

    if (!isFiniteNumber(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity consumed must be greater than 0",
      });
    }

    if (!isFiniteNumber(birdCount) || birdCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bird count must be greater than 0",
      });
    }

    if (consumptionDate !== undefined && !isValidDate(consumptionDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consumption date",
      });
    }

    const finalShed = shed !== undefined ? shed : consumption.shed;

    const finalBatch = batch !== undefined ? batch : consumption.batch;

    if (finalShed) {
      const shedExists = await validateShed(finalShed, consumption.farm);

      if (!shedExists) {
        return res.status(404).json({
          success: false,
          message: "Shed not found for this farm",
        });
      }
    }

    if (finalBatch) {
      const batchExists = await validateBatch(finalBatch, consumption.farm, finalShed || null);

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found for this farm/shed",
        });
      }

      if (birdCount > Number(batchExists.currentQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: "Bird count cannot exceed current batch quantity",
        });
      }
    }

    const finalFeedType = feedType !== undefined ? feedType : consumption.feedType;

    if (!finalFeedType) {
      return res.status(400).json({
        success: false,
        message: "Feed type is required",
      });
    }

    if (newInventory.expiryDate && new Date(newInventory.expiryDate) < getToday()) {
      return res.status(400).json({
        success: false,
        message: "Cannot consume expired feed",
      });
    }

    const finalCostPerKg = costPerKg !== undefined && costPerKg !== null && costPerKg !== "" ? Number(costPerKg) : Number(newInventory.unitCostPerKg || 0);

    if (!isFiniteNumber(finalCostPerKg) || finalCostPerKg < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost per kg cannot be negative",
      });
    }

    /*
     * Work out the stock state before
     * changing either inventory.
     */
    const sameInventory = String(newInventory._id) === String(oldInventory._id);

    /*
     * SAME INVENTORY
     *
     * Restore old quantity first,
     * then consume the new quantity.
     */
    if (sameInventory) {
      await restoreInventoryStock(oldInventory, oldQuantity);

      if (Number(oldInventory.currentStockKg || 0) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient feed stock. Available stock: ${oldInventory.currentStockKg} kg`,
        });
      }

      await consumeInventoryStock(oldInventory, quantity);

      await oldInventory.save();
    } else {
      /*
       * DIFFERENT INVENTORY
       *
       * First check new inventory stock.
       * Only after validation restore old
       * inventory and consume new inventory.
       */
      if (Number(newInventory.currentStockKg || 0) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient new feed stock. Available stock: ${newInventory.currentStockKg} kg`,
        });
      }

      await restoreInventoryStock(oldInventory, oldQuantity);

      await consumeInventoryStock(newInventory, quantity);

      await oldInventory.save();
      await newInventory.save();
    }

    const { feedPerBirdGram, totalCost } = calculateValues({
      quantityKg: quantity,
      birdCount,
      costPerKg: finalCostPerKg,
    });

    consumption.shed = finalShed || null;

    consumption.batch = finalBatch || null;

    consumption.feedInventory = newInventory._id;

    if (consumptionDate !== undefined) {
      consumption.consumptionDate = consumptionDate;
    }

    consumption.feedType = finalFeedType;

    consumption.quantityKg = quantity;

    consumption.birdCountAtConsumption = birdCount;

    consumption.feedPerBirdGram = feedPerBirdGram;

    consumption.costPerKg = finalCostPerKg;

    consumption.totalCost = totalCost;

    if (feedingSession !== undefined) {
      consumption.feedingSession = feedingSession;
    }

    if (notes !== undefined) {
      consumption.notes = notes;
    }

    await consumption.save();

    const updatedConsumption = await FeedConsumption.findById(consumption._id)
      .populate("farm", "name code")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName")
      .populate("feedInventory", "feedName feedType currentStockKg unitCostPerKg status")
      .populate("recordedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Feed consumption updated successfully",
      data: updatedConsumption,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteFeedConsumption = async (req, res, next) => {
  try {
    const consumption = await FeedConsumption.findById(req.params.id);

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: "Feed consumption record not found",
      });
    }

    const farmExists = await validateFarmOwnership(consumption.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    /*
     * Protect historical report data.
     */
    const reportExists = await hasFarmReportDependency({
      farm: consumption.farm,
      batch: consumption.batch,
      consumptionDate: consumption.consumptionDate,
    });

    if (reportExists) {
      return res.status(409).json({
        success: false,
        message: "Feed consumption cannot be deleted because a historical farm report already covers this record date",
      });
    }

    const inventory = await FeedInventory.findOne({
      _id: consumption.feedInventory,
      farm: consumption.farm,
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Feed inventory not found",
      });
    }

    const quantity = Number(consumption.quantityKg || 0);

    await restoreInventoryStock(inventory, quantity);

    await inventory.save();

    await FeedConsumption.deleteOne({
      _id: consumption._id,
    });

    return res.status(200).json({
      success: true,
      message: "Feed consumption deleted and feed stock restored successfully",
    });
  } catch (error) {
    next(error);
  }
};
