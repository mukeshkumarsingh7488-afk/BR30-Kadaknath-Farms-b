import VeterinaryHealthLog from "../models/VeterinaryHealthLog.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";
import Medicine from "../models/Medicine.js";

const getToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isValidDate = (value) => {
  if (!value) {
    return true;
  }

  return !Number.isNaN(new Date(value).getTime());
};

const isFiniteNumber = (value) => {
  return Number.isFinite(Number(value));
};

const validateFarmOwnership = async (farmId, userId) => {
  return Farm.findOne({
    _id: farmId,
    owner: userId,
  });
};

const validateShed = async (shedId, farmId) => {
  if (!shedId) {
    return null;
  }

  return Shed.findOne({
    _id: shedId,
    farm: farmId,
  });
};

const validateBatch = async (batchId, farmId, shedId = null) => {
  if (!batchId) {
    return null;
  }

  const query = {
    _id: batchId,
    farm: farmId,
  };

  if (shedId) {
    query.shed = shedId;
  }

  return Batch.findOne(query);
};

const validateMedicine = async (medicineId, farmId) => {
  if (!medicineId) {
    return null;
  }

  return Medicine.findOne({
    _id: medicineId,
    farm: farmId,
  });
};

const calculateTotalCost = (visitCost, medicineCost) => {
  return Number(visitCost || 0) + Number(medicineCost || 0);
};

// CREATE
export const createVeterinaryHealthLog = async (req, res, next) => {
  try {
    const { farm, shed, batch, date, visitType, diseaseName, symptoms, affectedBirds, severity, diagnosis, treatment, veterinarian, visitCost = 0, medicineCost = 0, recoveryStatus, followUpDate, notes } = req.body;

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

    if (!visitType) {
      return res.status(400).json({
        success: false,
        message: "Visit type is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Health log date is required",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Health log date is invalid",
      });
    }

    if (followUpDate && !isValidDate(followUpDate)) {
      return res.status(400).json({
        success: false,
        message: "Follow-up date is invalid",
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

    let batchExists = null;

    if (batch) {
      batchExists = await validateBatch(batch, farm, shed || null);

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found for this farm/shed",
        });
      }
    }

    if (!isFiniteNumber(affectedBirds)) {
      return res.status(400).json({
        success: false,
        message: "Affected birds must be a valid number",
      });
    }

    const finalAffectedBirds = Number(affectedBirds || 0);

    if (finalAffectedBirds < 0) {
      return res.status(400).json({
        success: false,
        message: "Affected birds cannot be negative",
      });
    }

    if (batchExists && finalAffectedBirds > Number(batchExists.currentQuantity || 0)) {
      return res.status(400).json({
        success: false,
        message: "Affected birds cannot exceed current batch quantity",
      });
    }

    if (!isFiniteNumber(visitCost)) {
      return res.status(400).json({
        success: false,
        message: "Visit cost must be a valid number",
      });
    }

    if (!isFiniteNumber(medicineCost)) {
      return res.status(400).json({
        success: false,
        message: "Medicine cost must be a valid number",
      });
    }

    const finalVisitCost = Number(visitCost || 0);

    const finalMedicineCost = Number(medicineCost || 0);

    if (finalVisitCost < 0 || finalMedicineCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Costs cannot be negative",
      });
    }

    if (treatment?.medicine) {
      const medicineExists = await validateMedicine(treatment.medicine, farm);

      if (!medicineExists) {
        return res.status(404).json({
          success: false,
          message: "Treatment medicine not found",
        });
      }
    }

    const totalCost = calculateTotalCost(finalVisitCost, finalMedicineCost);

    const healthLog = await VeterinaryHealthLog.create({
      farm,
      shed: shed || null,
      batch: batch || null,
      date,
      visitType,
      diseaseName: diseaseName?.trim(),
      symptoms: symptoms?.trim(),
      affectedBirds: finalAffectedBirds,
      severity,
      diagnosis: diagnosis?.trim(),
      treatment,
      veterinarian,
      visitCost: finalVisitCost,
      medicineCost: finalMedicineCost,
      totalCost,
      recoveryStatus,
      followUpDate,
      reportedBy: req.user._id,
      notes,
    });

    const populatedLog = await VeterinaryHealthLog.findById(healthLog._id)
      .populate("farm", "name code")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName currentQuantity")
      .populate("treatment.medicine", "name type currentStock unitCost status")
      .populate("reportedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Veterinary health log created successfully",
      data: populatedLog,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getVeterinaryHealthLogs = async (req, res, next) => {
  try {
    const { farm, shed, batch, visitType, severity, recoveryStatus, startDate, endDate, page = 1, limit = 20 } = req.query;

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

    if (visitType) {
      query.visitType = visitType;
    }

    if (severity) {
      query.severity = severity;
    }

    if (recoveryStatus) {
      query.recoveryStatus = recoveryStatus;
    }

    if (startDate || endDate) {
      if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
        return res.status(400).json({
          success: false,
          message: "Start date or end date is invalid",
        });
      }

      query.date = {};

      if (startDate) {
        query.date.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);

        end.setHours(23, 59, 59, 999);

        query.date.$lte = end;
      }
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      VeterinaryHealthLog.find(query)
        .populate("farm", "name code")
        .populate("shed", "name code")
        .populate("batch", "batchNumber batchName currentQuantity")
        .populate("treatment.medicine", "name type currentStock unitCost status")
        .populate("reportedBy", "name email")
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      VeterinaryHealthLog.countDocuments(query),
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
export const getVeterinaryHealthLogById = async (req, res, next) => {
  try {
    const healthLog = await VeterinaryHealthLog.findById(req.params.id)
      .populate("farm", "name code owner")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName currentQuantity")
      .populate("treatment.medicine", "name type currentStock unitCost status")
      .populate("reportedBy", "name email");

    if (!healthLog) {
      return res.status(404).json({
        success: false,
        message: "Veterinary health log not found",
      });
    }

    if (String(healthLog.farm.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: healthLog,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateVeterinaryHealthLog = async (req, res, next) => {
  try {
    const healthLog = await VeterinaryHealthLog.findById(req.params.id);

    if (!healthLog) {
      return res.status(404).json({
        success: false,
        message: "Veterinary health log not found",
      });
    }

    const farmExists = await validateFarmOwnership(healthLog.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { shed, batch, date, visitType, diseaseName, symptoms, affectedBirds, severity, diagnosis, treatment, veterinarian, visitCost, medicineCost, recoveryStatus, followUpDate, notes } = req.body;

    const finalShed = shed !== undefined ? shed || null : healthLog.shed;

    const finalBatch = batch !== undefined ? batch || null : healthLog.batch;

    const finalAffectedBirds = affectedBirds !== undefined ? Number(affectedBirds) : Number(healthLog.affectedBirds || 0);

    const finalVisitCost = visitCost !== undefined ? Number(visitCost) : Number(healthLog.visitCost || 0);

    const finalMedicineCost = medicineCost !== undefined ? Number(medicineCost) : Number(healthLog.medicineCost || 0);

    if (date !== undefined && !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Health log date is invalid",
      });
    }

    if (followUpDate !== undefined && followUpDate !== null && !isValidDate(followUpDate)) {
      return res.status(400).json({
        success: false,
        message: "Follow-up date is invalid",
      });
    }

    if (!isFiniteNumber(finalAffectedBirds)) {
      return res.status(400).json({
        success: false,
        message: "Affected birds must be a valid number",
      });
    }

    if (!isFiniteNumber(finalVisitCost) || !isFiniteNumber(finalMedicineCost)) {
      return res.status(400).json({
        success: false,
        message: "Costs must be valid numbers",
      });
    }

    if (finalAffectedBirds < 0) {
      return res.status(400).json({
        success: false,
        message: "Affected birds cannot be negative",
      });
    }

    if (finalVisitCost < 0 || finalMedicineCost < 0) {
      return res.status(400).json({
        success: false,
        message: "Costs cannot be negative",
      });
    }

    if (finalShed) {
      const shedExists = await validateShed(finalShed, healthLog.farm);

      if (!shedExists) {
        return res.status(404).json({
          success: false,
          message: "Shed not found for this farm",
        });
      }
    }

    if (finalBatch) {
      const batchExists = await validateBatch(finalBatch, healthLog.farm, finalShed || null);

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found for this farm/shed",
        });
      }

      if (finalAffectedBirds > Number(batchExists.currentQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: "Affected birds cannot exceed current batch quantity",
        });
      }
    }

    if (treatment !== undefined && treatment?.medicine) {
      const medicineExists = await validateMedicine(treatment.medicine, healthLog.farm);

      if (!medicineExists) {
        return res.status(404).json({
          success: false,
          message: "Treatment medicine not found",
        });
      }
    }

    if (visitType !== undefined && !visitType) {
      return res.status(400).json({
        success: false,
        message: "Visit type cannot be empty",
      });
    }

    healthLog.shed = finalShed || null;

    healthLog.batch = finalBatch || null;

    if (date !== undefined) {
      healthLog.date = date;
    }

    if (visitType !== undefined) {
      healthLog.visitType = visitType;
    }

    if (diseaseName !== undefined) {
      healthLog.diseaseName = diseaseName?.trim();
    }

    if (symptoms !== undefined) {
      healthLog.symptoms = symptoms?.trim();
    }

    healthLog.affectedBirds = finalAffectedBirds;

    if (severity !== undefined) {
      healthLog.severity = severity;
    }

    if (diagnosis !== undefined) {
      healthLog.diagnosis = diagnosis?.trim();
    }

    if (treatment !== undefined) {
      healthLog.treatment = treatment;
    }

    if (veterinarian !== undefined) {
      healthLog.veterinarian = veterinarian;
    }

    healthLog.visitCost = finalVisitCost;

    healthLog.medicineCost = finalMedicineCost;

    healthLog.totalCost = calculateTotalCost(finalVisitCost, finalMedicineCost);

    if (recoveryStatus !== undefined) {
      healthLog.recoveryStatus = recoveryStatus;
    }

    if (followUpDate !== undefined) {
      healthLog.followUpDate = followUpDate;
    }

    if (notes !== undefined) {
      healthLog.notes = notes;
    }

    await healthLog.save();

    const updatedLog = await VeterinaryHealthLog.findById(healthLog._id)
      .populate("farm", "name code")
      .populate("shed", "name code")
      .populate("batch", "batchNumber batchName currentQuantity")
      .populate("treatment.medicine", "name type currentStock unitCost status")
      .populate("reportedBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Veterinary health log updated successfully",
      data: updatedLog,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteVeterinaryHealthLog = async (req, res, next) => {
  try {
    const healthLog = await VeterinaryHealthLog.findById(req.params.id);

    if (!healthLog) {
      return res.status(404).json({
        success: false,
        message: "Veterinary health log not found",
      });
    }

    const farmExists = await validateFarmOwnership(healthLog.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await VeterinaryHealthLog.deleteOne({
      _id: healthLog._id,
    });

    return res.status(200).json({
      success: true,
      message: "Veterinary health log deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
