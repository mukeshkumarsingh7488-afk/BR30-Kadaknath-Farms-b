import WaterQuality from "../models/WaterQuality.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";

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

const validateShedBelongsToFarm = async (shedId, farmId) => {
  if (!shedId) {
    return true;
  }

  if (!isValidObjectId(shedId) || !isValidObjectId(farmId)) {
    return false;
  }

  const shed = await Shed.findOne({
    _id: shedId,
    farm: farmId,
  });

  return Boolean(shed);
};

const validateNonNegativeNumbers = (body) => {
  const fields = ["ph", "tdsPpm", "hardnessPpm", "ammoniaPpm", "nitratePpm", "chlorinePpm", "temperatureCelsius"];

  for (const field of fields) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
      const value = Number(body[field]);

      if (!Number.isFinite(value) || value < 0) {
        return `${field} must be a valid non-negative number`;
      }
    }
  }

  if (body.ph !== undefined && body.ph !== null && body.ph !== "") {
    const ph = Number(body.ph);

    if (ph < 0 || ph > 14) {
      return "ph must be between 0 and 14";
    }
  }

  return null;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return null;
};

const normalizeMicrobialTest = (microbialTest) => {
  if (!microbialTest || typeof microbialTest !== "object") {
    return undefined;
  }

  const tested = normalizeBoolean(microbialTest.tested, false);

  if (tested === null) {
    return null;
  }

  const allowedResults = ["SAFE", "UNSAFE", "BORDERLINE", "NOT_TESTED"];

  const result = microbialTest.result || "NOT_TESTED";

  if (!allowedResults.includes(result)) {
    return null;
  }

  return {
    tested,
    result,
    details: microbialTest.details?.trim() || "",
  };
};

const validateOverallStatus = (status) => {
  const allowedStatuses = ["SAFE", "ACCEPTABLE", "NEEDS_TREATMENT", "UNSAFE"];

  if (!allowedStatuses.includes(status)) {
    return false;
  }

  return true;
};

const createWaterQuality = async (req, res, next) => {
  try {
    const { farm, shed, testDate, sampleLocation, source, ph, tdsPpm, hardnessPpm, ammoniaPpm, nitratePpm, chlorinePpm, temperatureCelsius, microbialTest, overallStatus, treatmentApplied, treatmentDetails, nextTestDate, notes } = req.body;

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

    if (shed) {
      const validShed = await validateShedBelongsToFarm(shed, farm);

      if (!validShed) {
        return res.status(400).json({
          success: false,
          message: "Shed does not belong to the selected farm",
        });
      }
    }

    if (!testDate) {
      return res.status(400).json({
        success: false,
        message: "Test date is required",
      });
    }

    if (!isValidDate(testDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test date",
      });
    }

    if (nextTestDate && !isValidDate(nextTestDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid next test date",
      });
    }

    if (!sampleLocation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sample location is required",
      });
    }

    if (!source) {
      return res.status(400).json({
        success: false,
        message: "Water source is required",
      });
    }

    const numericError = validateNonNegativeNumbers(req.body);

    if (numericError) {
      return res.status(400).json({
        success: false,
        message: numericError,
      });
    }

    const normalizedMicrobialTest = normalizeMicrobialTest(microbialTest);

    if (microbialTest !== undefined && normalizedMicrobialTest === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid microbial test data",
      });
    }

    let finalOverallStatus = overallStatus;

    if (!finalOverallStatus) {
      finalOverallStatus = normalizedMicrobialTest?.result === "UNSAFE" ? "UNSAFE" : "SAFE";
    }

    if (!validateOverallStatus(finalOverallStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid overall water quality status",
      });
    }

    const normalizedTreatmentApplied = normalizeBoolean(treatmentApplied, false);

    if (normalizedTreatmentApplied === null) {
      return res.status(400).json({
        success: false,
        message: "treatmentApplied must be true or false",
      });
    }

    const waterQuality = await WaterQuality.create({
      farm,
      shed: shed || null,
      testDate,
      sampleLocation: sampleLocation.trim(),
      source,
      ph,
      tdsPpm,
      hardnessPpm,
      ammoniaPpm,
      nitratePpm,
      chlorinePpm,
      temperatureCelsius,
      microbialTest: normalizedMicrobialTest,
      overallStatus: finalOverallStatus,
      treatmentApplied: normalizedTreatmentApplied,
      treatmentDetails: treatmentDetails?.trim() || "",
      nextTestDate: nextTestDate || null,
      testedBy: req.user._id,
      notes: notes?.trim() || "",
    });

    const populatedWaterQuality = await WaterQuality.findById(waterQuality._id).populate("farm", "name code").populate("shed", "name code").populate("testedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Water quality record created successfully",
      data: populatedWaterQuality,
    });
  } catch (error) {
    next(error);
  }
};

const getWaterQualities = async (req, res, next) => {
  try {
    const { farm, shed, source, overallStatus, fromDate, toDate } = req.query;

    const farmFilter = {};

    if (farm) {
      const farmDoc = await validateFarmOwnership(farm, req.user._id);

      if (!farmDoc) {
        return res.status(404).json({
          success: false,
          message: "Farm not found or access denied",
        });
      }

      farmFilter.farm = farm;
    } else {
      const farms = await Farm.find({
        owner: req.user._id,
      }).select("_id");

      farmFilter.farm = {
        $in: farms.map((item) => item._id),
      };
    }

    if (shed && !isValidObjectId(shed)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shed ID",
      });
    }

    if (shed) {
      if (farm) {
        const validShed = await validateShedBelongsToFarm(shed, farm);

        if (!validShed) {
          return res.status(400).json({
            success: false,
            message: "Shed does not belong to the selected farm",
          });
        }
      } else {
        const ownedShed = await Shed.findOne({
          _id: shed,
          farm: {
            $in: farmFilter.farm.$in,
          },
        });

        if (!ownedShed) {
          return res.status(403).json({
            success: false,
            message: "Shed does not belong to your farm",
          });
        }
      }
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
      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "fromDate cannot be greater than toDate",
        });
      }
    }

    if (overallStatus && !validateOverallStatus(overallStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid overall water quality status",
      });
    }

    const filter = {
      ...farmFilter,
    };

    if (shed) {
      filter.shed = shed;
    }

    if (source) {
      filter.source = source;
    }

    if (overallStatus) {
      filter.overallStatus = overallStatus;
    }

    if (fromDate || toDate) {
      filter.testDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);

        filter.testDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);

        filter.testDate.$lte = endDate;
      }
    }

    const records = await WaterQuality.find(filter).populate("farm", "name code").populate("shed", "name code").populate("testedBy", "name email").sort({
      testDate: -1,
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

const getWaterQualityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid water quality record ID",
      });
    }

    const record = await WaterQuality.findById(id).populate("farm", "name code").populate("shed", "name code").populate("testedBy", "name email");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Water quality record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(record.farm._id, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

const updateWaterQuality = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid water quality record ID",
      });
    }

    const record = await WaterQuality.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Water quality record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(record.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { shed, testDate, sampleLocation, source, ph, tdsPpm, hardnessPpm, ammoniaPpm, nitratePpm, chlorinePpm, temperatureCelsius, microbialTest, overallStatus, treatmentApplied, treatmentDetails, nextTestDate, notes } = req.body;

    if (shed !== undefined) {
      if (shed && !isValidObjectId(shed)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shed ID",
        });
      }

      const validShed = await validateShedBelongsToFarm(shed, record.farm);

      if (!validShed) {
        return res.status(400).json({
          success: false,
          message: "Shed does not belong to the selected farm",
        });
      }

      record.shed = shed || null;
    }

    if (testDate !== undefined) {
      if (!isValidDate(testDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid test date",
        });
      }

      record.testDate = testDate;
    }

    if (sampleLocation !== undefined) {
      if (!sampleLocation?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Sample location cannot be empty",
        });
      }

      record.sampleLocation = sampleLocation.trim();
    }

    if (source !== undefined) {
      if (!source) {
        return res.status(400).json({
          success: false,
          message: "Water source cannot be empty",
        });
      }

      record.source = source;
    }

    const numericError = validateNonNegativeNumbers(req.body);

    if (numericError) {
      return res.status(400).json({
        success: false,
        message: numericError,
      });
    }

    const numericFields = ["ph", "tdsPpm", "hardnessPpm", "ammoniaPpm", "nitratePpm", "chlorinePpm", "temperatureCelsius"];

    numericFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field] === "" || req.body[field] === null ? undefined : Number(req.body[field]);
      }
    });

    if (microbialTest !== undefined) {
      const normalizedMicrobialTest = normalizeMicrobialTest(microbialTest);

      if (normalizedMicrobialTest === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid microbial test data",
        });
      }

      record.microbialTest = normalizedMicrobialTest;
    }

    if (overallStatus !== undefined) {
      if (!validateOverallStatus(overallStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid overall water quality status",
        });
      }

      record.overallStatus = overallStatus;
    } else if (record.microbialTest?.result === "UNSAFE") {
      record.overallStatus = "UNSAFE";
    }

    if (treatmentApplied !== undefined) {
      const normalizedTreatmentApplied = normalizeBoolean(treatmentApplied);

      if (normalizedTreatmentApplied === null) {
        return res.status(400).json({
          success: false,
          message: "treatmentApplied must be true or false",
        });
      }

      record.treatmentApplied = normalizedTreatmentApplied;
    }

    if (treatmentDetails !== undefined) {
      record.treatmentDetails = treatmentDetails?.trim() || "";
    }

    if (nextTestDate !== undefined) {
      if (nextTestDate && !isValidDate(nextTestDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid next test date",
        });
      }

      record.nextTestDate = nextTestDate || null;
    }

    if (notes !== undefined) {
      record.notes = notes?.trim() || "";
    }

    await record.save();

    const updatedRecord = await WaterQuality.findById(record._id).populate("farm", "name code").populate("shed", "name code").populate("testedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Water quality record updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

const deleteWaterQuality = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid water quality record ID",
      });
    }

    const record = await WaterQuality.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Water quality record not found",
      });
    }

    const farmDoc = await validateFarmOwnership(record.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await WaterQuality.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Water quality record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createWaterQuality, getWaterQualities, getWaterQualityById, updateWaterQuality, deleteWaterQuality };
