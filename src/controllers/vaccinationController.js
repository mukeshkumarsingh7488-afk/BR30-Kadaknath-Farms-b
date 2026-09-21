import Vaccination from "../models/Vaccination.js";
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

const calculateMedicineStatus = (currentStock, reorderLevel, expiryDate) => {
  const today = getToday();

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return "EXPIRED";
    }
  }

  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (currentStock <= reorderLevel) {
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

const calculateTotalCost = (birdsVaccinated, dosePerBird, vaccineQuantityUsed, unitCost) => {
  const birds = Number(birdsVaccinated || 0);
  const dose = Number(dosePerBird || 0);
  const quantity = Number(vaccineQuantityUsed || 0);
  const cost = Number(unitCost || 0);

  if (quantity > 0 && cost > 0) {
    return quantity * cost;
  }

  return birds * dose * cost;
};

const restoreMedicineStock = async (medicine, quantity) => {
  if (!medicine || quantity <= 0) {
    return;
  }

  const currentUsed = Number(medicine.quantityUsed || 0);

  if (quantity > currentUsed) {
    throw new Error("Medicine stock history is inconsistent. Cannot restore more vaccine stock than recorded usage.");
  }

  medicine.quantityUsed = currentUsed - quantity;

  medicine.currentStock = Number(medicine.quantityReceived || 0) - Number(medicine.quantityUsed || 0);

  medicine.status = calculateMedicineStatus(medicine.currentStock, Number(medicine.reorderLevel || 0), medicine.expiryDate);

  await medicine.save();
};

const consumeMedicineStock = async (medicine, quantity) => {
  if (!medicine || quantity <= 0) {
    return;
  }

  const currentStock = Number(medicine.currentStock || 0);

  if (quantity > currentStock) {
    throw new Error(`Insufficient vaccine stock. Available stock: ${currentStock}`);
  }

  medicine.quantityUsed = Number(medicine.quantityUsed || 0) + quantity;

  medicine.currentStock = Number(medicine.quantityReceived || 0) - Number(medicine.quantityUsed || 0);

  medicine.status = calculateMedicineStatus(medicine.currentStock, Number(medicine.reorderLevel || 0), medicine.expiryDate);

  await medicine.save();
};

// CREATE
export const createVaccination = async (req, res, next) => {
  try {
    const {
      farm,
      shed,
      batch,
      medicine,
      vaccineName,
      vaccinationDate,
      scheduledDate,
      ageInDays,
      diseaseTarget,
      dosePerBird,
      doseUnit,
      birdsScheduled,
      birdsVaccinated,
      vaccineQuantityUsed,
      administrationRoute,
      administeredBy,
      veterinarian,
      nextDueDate,
      adverseReaction,
      reactionDetails,
      notes,
      status,
    } = req.body;

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

    if (!vaccineName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vaccine name is required",
      });
    }

    if (!diseaseTarget?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Disease target is required",
      });
    }

    if (vaccinationDate && !isValidDate(vaccinationDate)) {
      return res.status(400).json({
        success: false,
        message: "Vaccination date is invalid",
      });
    }

    if (scheduledDate && !isValidDate(scheduledDate)) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date is invalid",
      });
    }

    if (nextDueDate && !isValidDate(nextDueDate)) {
      return res.status(400).json({
        success: false,
        message: "Next due date is invalid",
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

    let medicineExists = null;

    if (medicine) {
      medicineExists = await validateMedicine(medicine, farm);

      if (!medicineExists) {
        return res.status(404).json({
          success: false,
          message: "Medicine/Vaccine not found for this farm",
        });
      }

      if (medicineExists.type !== "VACCINE") {
        return res.status(400).json({
          success: false,
          message: "Selected medicine inventory item is not a vaccine",
        });
      }
    }

    const scheduled = birdsScheduled !== undefined ? Number(birdsScheduled) : 0;

    const vaccinated = birdsVaccinated !== undefined ? Number(birdsVaccinated) : 0;

    const dose = dosePerBird !== undefined ? Number(dosePerBird) : 0;

    const vaccineQuantity = vaccineQuantityUsed !== undefined ? Number(vaccineQuantityUsed) : 0;

    const finalAge = ageInDays !== undefined ? Number(ageInDays) : undefined;

    if (!isFiniteNumber(scheduled)) {
      return res.status(400).json({
        success: false,
        message: "Scheduled bird count must be a valid number",
      });
    }

    if (!isFiniteNumber(vaccinated)) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated bird count must be a valid number",
      });
    }

    if (!isFiniteNumber(dose)) {
      return res.status(400).json({
        success: false,
        message: "Dose per bird must be a valid number",
      });
    }

    if (!isFiniteNumber(vaccineQuantity)) {
      return res.status(400).json({
        success: false,
        message: "Vaccine quantity used must be a valid number",
      });
    }

    if (finalAge !== undefined && !isFiniteNumber(finalAge)) {
      return res.status(400).json({
        success: false,
        message: "Age in days must be a valid number",
      });
    }

    if (scheduled < 0) {
      return res.status(400).json({
        success: false,
        message: "Scheduled bird count cannot be negative",
      });
    }

    if (vaccinated < 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated bird count cannot be negative",
      });
    }

    if (vaccinated > scheduled && scheduled > 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated birds cannot exceed scheduled birds",
      });
    }

    if (batchExists && vaccinated > Number(batchExists.currentQuantity || 0)) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated birds cannot exceed current batch quantity",
      });
    }

    if (dose < 0 || vaccineQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Dose values cannot be negative",
      });
    }

    if (finalAge !== undefined && finalAge < 0) {
      return res.status(400).json({
        success: false,
        message: "Age in days cannot be negative",
      });
    }

    const finalStatus = status || (vaccinationDate ? "COMPLETED" : "SCHEDULED");

    if (!["SCHEDULED", "COMPLETED", "PARTIALLY_COMPLETED", "MISSED", "CANCELLED"].includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vaccination status",
      });
    }

    if (finalStatus === "COMPLETED" && !vaccinationDate) {
      return res.status(400).json({
        success: false,
        message: "Vaccination date is required for completed vaccination",
      });
    }

    if (finalStatus === "COMPLETED" && vaccinated <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated bird count must be greater than 0 for completed vaccination",
      });
    }

    if (finalStatus === "COMPLETED" && medicine && vaccineQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccine quantity used must be greater than 0 for completed vaccination",
      });
    }

    let totalCost = 0;

    if (medicineExists) {
      if (finalStatus === "COMPLETED" && vaccineQuantity > Number(medicineExists.currentStock || 0)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient vaccine stock. Available stock: ${medicineExists.currentStock}`,
        });
      }

      totalCost = calculateTotalCost(vaccinated, dose, vaccineQuantity, Number(medicineExists.unitCost || 0));
    }

    const vaccination = await Vaccination.create({
      farm,
      shed: shed || null,
      batch: batch || null,
      medicine: medicine || null,
      vaccineName: vaccineName.trim(),
      vaccinationDate,
      scheduledDate,
      ageInDays: finalAge,
      diseaseTarget: diseaseTarget.trim(),
      dosePerBird: dose,
      doseUnit,
      birdsScheduled: scheduled,
      birdsVaccinated: vaccinated,
      vaccineQuantityUsed: vaccineQuantity,
      totalCost,
      administrationRoute,
      administeredBy: administeredBy?.trim(),
      veterinarian,
      status: finalStatus,
      nextDueDate,
      adverseReaction,
      reactionDetails,
      notes,
    });

    try {
      if (medicineExists && vaccineQuantity > 0 && finalStatus === "COMPLETED") {
        await consumeMedicineStock(medicineExists, vaccineQuantity);
      }
    } catch (stockError) {
      await Vaccination.deleteOne({
        _id: vaccination._id,
      });

      return res.status(400).json({
        success: false,
        message: stockError.message,
      });
    }

    const populatedVaccination = await Vaccination.findById(vaccination._id).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName currentQuantity").populate("medicine", "name type currentStock unitCost status");

    return res.status(201).json({
      success: true,
      message: "Vaccination record created successfully",
      data: populatedVaccination,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getVaccinations = async (req, res, next) => {
  try {
    const { farm, shed, batch, medicine, status, startDate, endDate, page = 1, limit = 20 } = req.query;

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

    if (medicine) {
      query.medicine = medicine;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
        return res.status(400).json({
          success: false,
          message: "Start date or end date is invalid",
        });
      }

      const dateQuery = {};

      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        dateQuery.$lte = end;
      }

      query.$or = [
        {
          scheduledDate: dateQuery,
        },
        {
          vaccinationDate: dateQuery,
        },
      ];
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Vaccination.find(query)
        .populate("farm", "name code")
        .populate("shed", "name code")
        .populate("batch", "batchNumber batchName currentQuantity")
        .populate("medicine", "name type currentStock unitCost status")
        .sort({
          scheduledDate: 1,
          vaccinationDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Vaccination.countDocuments(query),
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
export const getVaccinationById = async (req, res, next) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id).populate("farm", "name code owner").populate("shed", "name code").populate("batch", "batchNumber batchName currentQuantity").populate("medicine", "name type currentStock unitCost status");

    if (!vaccination) {
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found",
      });
    }

    if (String(vaccination.farm.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: vaccination,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateVaccination = async (req, res, next) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);

    if (!vaccination) {
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found",
      });
    }

    const farmExists = await validateFarmOwnership(vaccination.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const oldMedicineId = vaccination.medicine ? vaccination.medicine.toString() : null;

    const oldQuantity = Number(vaccination.vaccineQuantityUsed || 0);

    const oldWasCompleted = vaccination.status === "COMPLETED" && oldMedicineId && oldQuantity > 0;

    const { shed, batch, medicine, vaccineName, vaccinationDate, scheduledDate, ageInDays, diseaseTarget, dosePerBird, doseUnit, birdsScheduled, birdsVaccinated, vaccineQuantityUsed, administrationRoute, administeredBy, veterinarian, status, nextDueDate, adverseReaction, reactionDetails, notes } =
      req.body;

    const finalMedicineId = medicine !== undefined ? medicine || null : oldMedicineId;

    const finalShed = shed !== undefined ? shed || null : vaccination.shed;

    const finalBatch = batch !== undefined ? batch || null : vaccination.batch;

    const finalBirdsScheduled = birdsScheduled !== undefined ? Number(birdsScheduled) : Number(vaccination.birdsScheduled || 0);

    const finalBirdsVaccinated = birdsVaccinated !== undefined ? Number(birdsVaccinated) : Number(vaccination.birdsVaccinated || 0);

    const finalQuantity = vaccineQuantityUsed !== undefined ? Number(vaccineQuantityUsed) : oldQuantity;

    const finalDose = dosePerBird !== undefined ? Number(dosePerBird) : Number(vaccination.dosePerBird || 0);

    const finalAge = ageInDays !== undefined ? Number(ageInDays) : vaccination.ageInDays;

    const finalStatus = status !== undefined ? status : vaccination.status;

    if (vaccinationDate !== undefined && !isValidDate(vaccinationDate)) {
      return res.status(400).json({
        success: false,
        message: "Vaccination date is invalid",
      });
    }

    if (scheduledDate !== undefined && !isValidDate(scheduledDate)) {
      return res.status(400).json({
        success: false,
        message: "Scheduled date is invalid",
      });
    }

    if (nextDueDate !== undefined && !isValidDate(nextDueDate)) {
      return res.status(400).json({
        success: false,
        message: "Next due date is invalid",
      });
    }

    if (!isFiniteNumber(finalBirdsScheduled) || !isFiniteNumber(finalBirdsVaccinated) || !isFiniteNumber(finalQuantity) || !isFiniteNumber(finalDose)) {
      return res.status(400).json({
        success: false,
        message: "Vaccination numeric values must be valid numbers",
      });
    }

    if (finalAge !== undefined && finalAge !== null && !isFiniteNumber(finalAge)) {
      return res.status(400).json({
        success: false,
        message: "Age in days must be a valid number",
      });
    }

    if (finalBirdsScheduled < 0) {
      return res.status(400).json({
        success: false,
        message: "Scheduled bird count cannot be negative",
      });
    }

    if (finalBirdsVaccinated < 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated bird count cannot be negative",
      });
    }

    if (finalBirdsVaccinated > finalBirdsScheduled && finalBirdsScheduled > 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated birds cannot exceed scheduled birds",
      });
    }

    if (finalQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccine quantity cannot be negative",
      });
    }

    if (finalDose < 0) {
      return res.status(400).json({
        success: false,
        message: "Dose per bird cannot be negative",
      });
    }

    if (finalAge !== undefined && finalAge !== null && finalAge < 0) {
      return res.status(400).json({
        success: false,
        message: "Age in days cannot be negative",
      });
    }

    const validStatuses = ["SCHEDULED", "COMPLETED", "PARTIALLY_COMPLETED", "MISSED", "CANCELLED"];

    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vaccination status",
      });
    }

    if (finalStatus === "COMPLETED" && !(vaccinationDate !== undefined ? vaccinationDate : vaccination.vaccinationDate)) {
      return res.status(400).json({
        success: false,
        message: "Vaccination date is required for completed vaccination",
      });
    }

    if (finalStatus === "COMPLETED" && finalBirdsVaccinated <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccinated bird count must be greater than 0 for completed vaccination",
      });
    }

    if (finalStatus === "COMPLETED" && finalMedicineId && finalQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vaccine quantity used must be greater than 0 for completed vaccination",
      });
    }

    if (finalShed) {
      const shedExists = await validateShed(finalShed, vaccination.farm);

      if (!shedExists) {
        return res.status(404).json({
          success: false,
          message: "Shed not found for this farm",
        });
      }
    }

    let batchExists = null;

    if (finalBatch) {
      batchExists = await validateBatch(finalBatch, vaccination.farm, finalShed || null);

      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "Batch not found for this farm/shed",
        });
      }

      if (finalBirdsVaccinated > Number(batchExists.currentQuantity || 0)) {
        return res.status(400).json({
          success: false,
          message: "Vaccinated birds cannot exceed current batch quantity",
        });
      }
    }

    let newMedicine = null;

    if (finalMedicineId) {
      newMedicine = await validateMedicine(finalMedicineId, vaccination.farm);

      if (!newMedicine) {
        return res.status(404).json({
          success: false,
          message: "Medicine/Vaccine not found",
        });
      }

      if (newMedicine.type !== "VACCINE") {
        return res.status(400).json({
          success: false,
          message: "Selected medicine inventory item is not a vaccine",
        });
      }
    }

    /*
      IMPORTANT:
      Check new stock requirement BEFORE restoring old stock.
      This prevents the old stock from being restored if
      the new vaccine stock is insufficient.
    */
    const newNeedsConsumption = finalStatus === "COMPLETED" && finalMedicineId && finalQuantity > 0;

    if (newNeedsConsumption) {
      const sameMedicine = oldMedicineId && String(finalMedicineId) === String(oldMedicineId);

      let availableStock = Number(newMedicine.currentStock || 0);

      /*
        If same medicine is being edited,
        old consumed quantity will be returned first.
        Therefore it is available for the new quantity.
      */
      if (sameMedicine && oldWasCompleted) {
        availableStock += oldQuantity;
      }

      if (finalQuantity > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient vaccine stock. Available stock: ${availableStock}`,
        });
      }
    }

    /*
      Restore old completed consumption first.
    */
    if (oldWasCompleted) {
      const oldMedicine = await Medicine.findById(oldMedicineId);

      if (!oldMedicine) {
        return res.status(409).json({
          success: false,
          message: "Original vaccine inventory no longer exists. Vaccination cannot be safely updated.",
        });
      }

      await restoreMedicineStock(oldMedicine, oldQuantity);
    }

    /*
      Apply new completed consumption.
    */
    if (newNeedsConsumption) {
      try {
        await consumeMedicineStock(newMedicine, finalQuantity);
      } catch (stockError) {
        /*
          Roll back old stock if new consumption fails.
        */
        if (oldWasCompleted) {
          const oldMedicine = await Medicine.findById(oldMedicineId);

          if (oldMedicine) {
            await consumeMedicineStock(oldMedicine, oldQuantity);
          }
        }

        return res.status(400).json({
          success: false,
          message: stockError.message,
        });
      }
    }

    let unitCost = 0;

    if (newMedicine) {
      unitCost = Number(newMedicine.unitCost || 0);
    } else if (oldMedicineId && !finalMedicineId) {
      unitCost = 0;
    }

    const totalCost = calculateTotalCost(finalBirdsVaccinated, finalDose, finalQuantity, unitCost);

    if (vaccineName !== undefined) {
      if (!vaccineName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vaccine name cannot be empty",
        });
      }

      vaccination.vaccineName = vaccineName.trim();
    }

    if (diseaseTarget !== undefined) {
      if (!diseaseTarget?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Disease target cannot be empty",
        });
      }

      vaccination.diseaseTarget = diseaseTarget.trim();
    }

    vaccination.shed = finalShed || null;

    vaccination.batch = finalBatch || null;

    vaccination.medicine = finalMedicineId || null;

    if (vaccinationDate !== undefined) {
      vaccination.vaccinationDate = vaccinationDate;
    }

    if (scheduledDate !== undefined) {
      vaccination.scheduledDate = scheduledDate;
    }

    if (ageInDays !== undefined) {
      vaccination.ageInDays = finalAge;
    }

    if (doseUnit !== undefined) {
      vaccination.doseUnit = doseUnit;
    }

    vaccination.dosePerBird = finalDose;

    vaccination.birdsScheduled = finalBirdsScheduled;

    vaccination.birdsVaccinated = finalBirdsVaccinated;

    vaccination.vaccineQuantityUsed = finalQuantity;

    vaccination.totalCost = totalCost;

    if (administrationRoute !== undefined) {
      vaccination.administrationRoute = administrationRoute;
    }

    if (administeredBy !== undefined) {
      vaccination.administeredBy = administeredBy?.trim();
    }

    if (veterinarian !== undefined) {
      vaccination.veterinarian = veterinarian;
    }

    vaccination.status = finalStatus;

    if (nextDueDate !== undefined) {
      vaccination.nextDueDate = nextDueDate;
    }

    if (adverseReaction !== undefined) {
      vaccination.adverseReaction = adverseReaction;
    }

    if (reactionDetails !== undefined) {
      vaccination.reactionDetails = reactionDetails;
    }

    if (notes !== undefined) {
      vaccination.notes = notes;
    }

    try {
      await vaccination.save();
    } catch (saveError) {
      /*
        Roll back medicine stock if vaccination
        document itself could not be saved.
      */
      if (newNeedsConsumption) {
        const medicineToRestore = await Medicine.findById(finalMedicineId);

        if (medicineToRestore) {
          await restoreMedicineStock(medicineToRestore, finalQuantity);
        }
      }

      if (oldWasCompleted) {
        const oldMedicine = await Medicine.findById(oldMedicineId);

        if (oldMedicine) {
          await consumeMedicineStock(oldMedicine, oldQuantity);
        }
      }

      throw saveError;
    }

    const updatedVaccination = await Vaccination.findById(vaccination._id).populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName currentQuantity").populate("medicine", "name type currentStock unitCost status");

    return res.status(200).json({
      success: true,
      message: "Vaccination record updated successfully",
      data: updatedVaccination,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteVaccination = async (req, res, next) => {
  try {
    const vaccination = await Vaccination.findById(req.params.id);

    if (!vaccination) {
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found",
      });
    }

    const farmExists = await validateFarmOwnership(vaccination.farm, req.user._id);

    if (!farmExists) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const shouldRestoreStock = vaccination.status === "COMPLETED" && vaccination.medicine && Number(vaccination.vaccineQuantityUsed || 0) > 0;

    let medicine = null;

    if (shouldRestoreStock) {
      medicine = await Medicine.findById(vaccination.medicine);

      if (!medicine) {
        return res.status(409).json({
          success: false,
          message: "Vaccine inventory no longer exists. Vaccination cannot be safely deleted.",
        });
      }

      const quantity = Number(vaccination.vaccineQuantityUsed || 0);

      if (quantity > Number(medicine.quantityUsed || 0)) {
        return res.status(409).json({
          success: false,
          message: "Vaccine stock history is inconsistent. Vaccination cannot be safely deleted.",
        });
      }
    }

    /*
      Restore stock before deleting the vaccination.
      If restore fails, vaccination remains untouched.
    */
    if (shouldRestoreStock) {
      await restoreMedicineStock(medicine, Number(vaccination.vaccineQuantityUsed || 0));
    }

    try {
      await Vaccination.deleteOne({
        _id: vaccination._id,
      });
    } catch (deleteError) {
      /*
        Roll back stock restoration if deletion fails.
      */
      if (shouldRestoreStock) {
        const medicineToConsume = await Medicine.findById(vaccination.medicine);

        if (medicineToConsume) {
          await consumeMedicineStock(medicineToConsume, Number(vaccination.vaccineQuantityUsed || 0));
        }
      }

      throw deleteError;
    }

    return res.status(200).json({
      success: true,
      message: "Vaccination record deleted and vaccine stock restored successfully",
    });
  } catch (error) {
    next(error);
  }
};
