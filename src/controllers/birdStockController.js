import mongoose from "mongoose";

import Farm from "../models/Farm.js";
import Batch from "../models/Batch.js";
import ChicksInward from "../models/ChicksInward.js";
import Mortality from "../models/Mortality.js";
import Sale from "../models/Sale.js";

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getPagination = (page, limit) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

const getFarmForUser = async (farmId, userId) => {
  if (!farmId || !isValidObjectId(farmId)) {
    return null;
  }

  return Farm.findOne({
    _id: farmId,
    owner: userId,
  });
};

/*
|--------------------------------------------------------------------------
| GET BIRD STOCK
|--------------------------------------------------------------------------
| Returns live bird stock batch-wise.
|
| Stock source:
| Batch.currentQuantity = current available birds
|
| Mortality:
| 1. Transport Mortality -> ChicksInward
| 2. Farm Mortality      -> Mortality
|
| Total Mortality:
| Transport Mortality + Farm Mortality
|
| Birds sold:
| LIVE_BIRD
| CHICK
| BREEDING_PAIR = 2 birds
|--------------------------------------------------------------------------
*/
export const getBirdStock = async (req, res, next) => {
  try {
    const { farm, batch, shed, status, birdType, search, page = 1, limit = 20 } = req.query;

    if (!farm) {
      return res.status(400).json({
        success: false,
        message: "Farm ID is required",
      });
    }

    if (!isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm ID",
      });
    }

    const farmData = await getFarmForUser(farm, req.user._id);

    if (!farmData) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    if (batch && !isValidObjectId(batch)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    if (shed && !isValidObjectId(shed)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shed ID",
      });
    }

    const { page: currentPage, limit: currentLimit, skip } = getPagination(page, limit);

    const batchQuery = {
      farm: farmData._id,
    };

    if (batch) {
      batchQuery._id = batch;
    }

    if (shed) {
      batchQuery.shed = shed;
    }

    if (status) {
      batchQuery.status = status.toUpperCase();
    }

    if (birdType) {
      batchQuery.birdType = birdType.toUpperCase();
    }

    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      batchQuery.$or = [
        {
          batchNumber: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          batchName: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          breed: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | GET PAGINATED BATCHES
    |--------------------------------------------------------------------------
    */
    const [batches, total] = await Promise.all([
      Batch.find(batchQuery)
        .populate("shed", "name code type capacity currentBirds")
        .sort({
          arrivalDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(currentLimit)
        .lean(),

      Batch.countDocuments(batchQuery),
    ]);

    /*
    |--------------------------------------------------------------------------
    | NO STOCK
    |--------------------------------------------------------------------------
    */
    if (!batches.length) {
      return res.status(200).json({
        success: true,
        message: "No bird stock found",

        data: [],

        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages: Math.ceil(total / currentLimit),
        },

        summary: {
          totalInitialBirds: 0,
          totalCurrentBirds: 0,
          totalMaleBirds: 0,
          totalFemaleBirds: 0,
          totalTransportMortality: 0,
          totalFarmMortality: 0,
          totalMortality: 0,
          totalBirdsSold: 0,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GET ALL MATCHING BATCH IDS
    |--------------------------------------------------------------------------
    | Summary pagination se independent rahega.
    |--------------------------------------------------------------------------
    */
    const allMatchingBatchIds = await Batch.find(batchQuery).select("_id").lean();

    const allBatchIds = allMatchingBatchIds.map((item) => item._id);

    /*
    |--------------------------------------------------------------------------
    | PAGINATED BATCH IDS
    |--------------------------------------------------------------------------
    */
    const batchIds = batches.map((item) => item._id);

    /*
    |--------------------------------------------------------------------------
    | TRANSPORT MORTALITY
    |--------------------------------------------------------------------------
    | Source: ChicksInward
    |
    | Batch.transportMortality is NOT used.
    |--------------------------------------------------------------------------
    */
    const transportMortalityData = await ChicksInward.aggregate([
      {
        $match: {
          farm: farmData._id,
          batch: {
            $in: allBatchIds,
          },
        },
      },
      {
        $group: {
          _id: "$batch",
          totalTransportMortality: {
            $sum: "$transportMortality.quantity",
          },
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | FARM MORTALITY
    |--------------------------------------------------------------------------
    | Source: Mortality
    |--------------------------------------------------------------------------
    */
    const mortalityData = await Mortality.aggregate([
      {
        $match: {
          farm: farmData._id,
          batch: {
            $in: allBatchIds,
          },
        },
      },
      {
        $group: {
          _id: "$batch",
          totalMortality: {
            $sum: "$quantity",
          },
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    | Only stock-impacting products are counted:
    |
    | LIVE_BIRD
    | CHICK
    | BREEDING_PAIR
    |
    | Breeding pair = 2 birds
    |--------------------------------------------------------------------------
    */
    const salesData = await Sale.aggregate([
      {
        $match: {
          farm: farmData._id,
          deliveryStatus: {
            $ne: "CANCELLED",
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          "items.batch": {
            $in: allBatchIds,
          },
          "items.productType": {
            $in: ["LIVE_BIRD", "CHICK", "BREEDING_PAIR"],
          },
        },
      },
      {
        $project: {
          batch: "$items.batch",
          productType: "$items.productType",
          quantity: "$items.quantity",
        },
      },
      {
        $group: {
          _id: "$batch",
          birdsSold: {
            $sum: {
              $cond: [
                {
                  $eq: ["$productType", "BREEDING_PAIR"],
                },
                {
                  $multiply: ["$quantity", 2],
                },
                "$quantity",
              ],
            },
          },
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | CREATE MAPS
    |--------------------------------------------------------------------------
    */
    const transportMortalityMap = new Map();

    transportMortalityData.forEach((item) => {
      transportMortalityMap.set(item._id.toString(), Number(item.totalTransportMortality || 0));
    });

    const mortalityMap = new Map();

    mortalityData.forEach((item) => {
      mortalityMap.set(item._id.toString(), Number(item.totalMortality || 0));
    });

    const salesMap = new Map();

    salesData.forEach((item) => {
      salesMap.set(item._id.toString(), Number(item.birdsSold || 0));
    });

    /*
    |--------------------------------------------------------------------------
    | BUILD STOCK RESPONSE
    |--------------------------------------------------------------------------
    */
    const stock = batches.map((item) => {
      const batchId = item._id.toString();

      const transportMortality = Number(transportMortalityMap.get(batchId) || 0);

      const farmMortality = Number(mortalityMap.get(batchId) || 0);

      const totalMortality = transportMortality + farmMortality;

      const birdsSold = Number(salesMap.get(batchId) || 0);

      const initialQuantity = Number(item.initialQuantity || 0);

      const currentQuantity = Number(item.currentQuantity || 0);

      const mortalityPercentage = initialQuantity > 0 ? Number(((totalMortality / initialQuantity) * 100).toFixed(2)) : 0;

      const stockUtilizationPercentage = initialQuantity > 0 ? Number((((initialQuantity - currentQuantity) / initialQuantity) * 100).toFixed(2)) : 0;

      return {
        batchId: item._id,

        batchNumber: item.batchNumber,

        batchName: item.batchName || "",

        birdType: item.birdType,

        breed: item.breed,

        shed: item.shed
          ? {
              id: item.shed._id,
              name: item.shed.name,
              code: item.shed.code,
              type: item.shed.type,
              capacity: item.shed.capacity,
              currentBirds: item.shed.currentBirds,
            }
          : null,

        arrivalDate: item.arrivalDate,

        initialQuantity,

        currentQuantity,

        initialMale: Number(item.initialMaleCount || 0),

        initialFemale: Number(item.initialFemaleCount || 0),

        currentMale: Number(item.currentMaleCount || 0),

        currentFemale: Number(item.currentFemaleCount || 0),

        /*
        |--------------------------------------------------------------------------
        | MORTALITY BREAKDOWN
        |--------------------------------------------------------------------------
        */
        transportMortality,

        farmMortality,

        totalMortality,

        mortalityPercentage,

        birdsSold,

        stockUtilizationPercentage,

        expectedSaleAgeDays: Number(item.expectedSaleAgeDays || 0),

        targetWeightKg: Number(item.targetWeightKg || 0),

        status: item.status,

        availableStock: currentQuantity,

        completedAt: item.completedAt || null,

        notes: item.notes || "",

        createdAt: item.createdAt,

        updatedAt: item.updatedAt,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    | Summary all filtered batches ka hoga.
    | Pagination se summary affect nahi hogi.
    |--------------------------------------------------------------------------
    */
    const summaryBatches = await Batch.find(batchQuery).select("_id initialQuantity currentQuantity currentMaleCount currentFemaleCount").lean();

    const summary = summaryBatches.reduce(
      (acc, item) => {
        const batchId = item._id.toString();

        const transportMortality = Number(transportMortalityMap.get(batchId) || 0);

        const farmMortality = Number(mortalityMap.get(batchId) || 0);

        const totalMortality = transportMortality + farmMortality;

        const birdsSold = Number(salesMap.get(batchId) || 0);

        acc.totalInitialBirds += Number(item.initialQuantity || 0);

        acc.totalCurrentBirds += Number(item.currentQuantity || 0);

        acc.totalMaleBirds += Number(item.currentMaleCount || 0);

        acc.totalFemaleBirds += Number(item.currentFemaleCount || 0);

        acc.totalTransportMortality += transportMortality;

        acc.totalFarmMortality += farmMortality;

        acc.totalMortality += totalMortality;

        acc.totalBirdsSold += birdsSold;

        return acc;
      },
      {
        totalInitialBirds: 0,
        totalCurrentBirds: 0,
        totalMaleBirds: 0,
        totalFemaleBirds: 0,
        totalTransportMortality: 0,
        totalFarmMortality: 0,
        totalMortality: 0,
        totalBirdsSold: 0,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */
    return res.status(200).json({
      success: true,

      message: "Bird stock fetched successfully",

      data: stock,

      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / currentLimit),
      },

      summary,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE BATCH STOCK
|--------------------------------------------------------------------------
*/
export const getBirdStockByBatch = async (req, res, next) => {
  try {
    const { farm, batchId } = req.params;

    if (!farm || !isValidObjectId(farm)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farm ID",
      });
    }

    if (!batchId || !isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const farmData = await getFarmForUser(farm, req.user._id);

    if (!farmData) {
      return res.status(404).json({
        success: false,
        message: "Farm not found or access denied",
      });
    }

    const batchData = await Batch.findOne({
      _id: batchId,
      farm: farmData._id,
    })
      .populate("shed", "name code type capacity currentBirds")
      .lean();

    if (!batchData) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | GET TRANSPORT MORTALITY + FARM MORTALITY + SALES
    |--------------------------------------------------------------------------
    */
    const [transportMortalityResult, mortalityResult, salesResult] = await Promise.all([
      /*
      |----------------------------------------------------------------------
      | Transport Mortality
      | Source: ChicksInward
      |----------------------------------------------------------------------
      */
      ChicksInward.aggregate([
        {
          $match: {
            farm: farmData._id,
            batch: batchData._id,
          },
        },
        {
          $group: {
            _id: null,
            totalTransportMortality: {
              $sum: "$transportMortality.quantity",
            },
          },
        },
      ]),

      /*
      |----------------------------------------------------------------------
      | Farm Mortality
      | Source: Mortality
      |----------------------------------------------------------------------
      */
      Mortality.aggregate([
        {
          $match: {
            farm: farmData._id,
            batch: batchData._id,
          },
        },
        {
          $group: {
            _id: null,
            totalMortality: {
              $sum: "$quantity",
            },
          },
        },
      ]),

      /*
      |----------------------------------------------------------------------
      | Sales
      |----------------------------------------------------------------------
      */
      Sale.aggregate([
        {
          $match: {
            farm: farmData._id,
            deliveryStatus: {
              $ne: "CANCELLED",
            },
          },
        },
        {
          $unwind: "$items",
        },
        {
          $match: {
            "items.batch": batchData._id,
            "items.productType": {
              $in: ["LIVE_BIRD", "CHICK", "BREEDING_PAIR"],
            },
          },
        },
        {
          $group: {
            _id: null,
            birdsSold: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$items.productType", "BREEDING_PAIR"],
                  },
                  {
                    $multiply: ["$items.quantity", 2],
                  },
                  "$items.quantity",
                ],
              },
            },
          },
        },
      ]),
    ]);

    const transportMortality = Number(transportMortalityResult[0]?.totalTransportMortality || 0);

    const farmMortality = Number(mortalityResult[0]?.totalMortality || 0);

    const totalMortality = transportMortality + farmMortality;

    const birdsSold = Number(salesResult[0]?.birdsSold || 0);

    const initialQuantity = Number(batchData.initialQuantity || 0);

    const currentQuantity = Number(batchData.currentQuantity || 0);

    const mortalityPercentage = initialQuantity > 0 ? Number(((totalMortality / initialQuantity) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,

      message: "Bird stock fetched successfully",

      data: {
        batchId: batchData._id,

        batchNumber: batchData.batchNumber,

        batchName: batchData.batchName || "",

        birdType: batchData.birdType,

        breed: batchData.breed,

        shed: batchData.shed
          ? {
              id: batchData.shed._id,
              name: batchData.shed.name,
              code: batchData.shed.code,
              type: batchData.shed.type,
              capacity: batchData.shed.capacity,
              currentBirds: batchData.shed.currentBirds,
            }
          : null,

        arrivalDate: batchData.arrivalDate,

        initialQuantity,

        currentQuantity,

        initialMale: Number(batchData.initialMaleCount || 0),

        initialFemale: Number(batchData.initialFemaleCount || 0),

        currentMale: Number(batchData.currentMaleCount || 0),

        currentFemale: Number(batchData.currentFemaleCount || 0),

        /*
        |--------------------------------------------------------------------------
        | MORTALITY BREAKDOWN
        |--------------------------------------------------------------------------
        */
        transportMortality,

        farmMortality,

        totalMortality,

        mortalityPercentage,

        birdsSold,

        availableStock: currentQuantity,

        expectedSaleAgeDays: Number(batchData.expectedSaleAgeDays || 0),

        targetWeightKg: Number(batchData.targetWeightKg || 0),

        status: batchData.status,

        completedAt: batchData.completedAt || null,

        notes: batchData.notes || "",

        createdAt: batchData.createdAt,

        updatedAt: batchData.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
