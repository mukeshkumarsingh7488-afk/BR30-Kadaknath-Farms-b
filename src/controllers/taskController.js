import Task from "../models/Task.js";
import Farm from "../models/Farm.js";
import Shed from "../models/Shed.js";
import Batch from "../models/Batch.js";
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

const validateShedBelongsToFarm = async (shedId, farmId) => {
  if (!shedId) {
    return null;
  }

  if (!isValidObjectId(shedId) || !isValidObjectId(farmId)) {
    return null;
  }

  return Shed.findOne({
    _id: shedId,
    farm: farmId,
  });
};

const validateBatchBelongsToFarm = async (batchId, farmId) => {
  if (!batchId) {
    return null;
  }

  if (!isValidObjectId(batchId) || !isValidObjectId(farmId)) {
    return null;
  }

  return Batch.findOne({
    _id: batchId,
    farm: farmId,
  });
};

const validateUser = async (userId) => {
  if (!userId) {
    return null;
  }

  if (!isValidObjectId(userId)) {
    return null;
  }

  return User.findById(userId).select("_id name email phone role isBlocked");
};

const buildTaskPopulate = (query) => {
  return query.populate("farm", "name code").populate("shed", "name code").populate("batch", "batchNumber batchName").populate("assignedTo", "name email phone role").populate("assignedBy", "name email");
};

const allowedCategories = ["FEEDING", "CLEANING", "EGG_COLLECTION", "VACCINATION", "MEDICINE", "WATER", "BIOSECURITY", "MAINTENANCE", "BIRD_CHECK", "STOCK_CHECK", "OTHER"];

const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"];

const allowedRecurringFrequencies = ["DAILY", "WEEKLY", "MONTHLY"];

const validateCategory = (category) => {
  return allowedCategories.includes(category);
};

const validatePriority = (priority) => {
  return allowedPriorities.includes(priority);
};

const validateStatus = (status) => {
  return allowedStatuses.includes(status);
};

const normalizeBoolean = (value) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return null;
};

const validateRecurring = (recurring) => {
  if (recurring === undefined || recurring === null) {
    return {
      valid: true,
      value: {
        enabled: false,
      },
    };
  }

  if (typeof recurring !== "object" || Array.isArray(recurring)) {
    return {
      valid: false,
      message: "Invalid recurring task data",
    };
  }

  const enabled = recurring.enabled === undefined ? false : normalizeBoolean(recurring.enabled);

  if (enabled === null) {
    return {
      valid: false,
      message: "Recurring enabled must be true or false",
    };
  }

  if (!enabled) {
    return {
      valid: true,
      value: {
        enabled: false,
      },
    };
  }

  if (!recurring.frequency || !allowedRecurringFrequencies.includes(recurring.frequency)) {
    return {
      valid: false,
      message: "Recurring frequency must be DAILY, WEEKLY or MONTHLY",
    };
  }

  return {
    valid: true,
    value: {
      enabled: true,
      frequency: recurring.frequency,
    },
  };
};

const validateAttachments = (attachments) => {
  if (attachments === undefined) {
    return {
      valid: true,
      value: undefined,
    };
  }

  if (!Array.isArray(attachments)) {
    return {
      valid: false,
      message: "Attachments must be an array",
    };
  }

  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
      return {
        valid: false,
        message: "Invalid attachment data",
      };
    }

    if (attachment.url !== undefined && typeof attachment.url !== "string") {
      return {
        valid: false,
        message: "Attachment URL must be a string",
      };
    }

    if (attachment.publicId !== undefined && typeof attachment.publicId !== "string") {
      return {
        valid: false,
        message: "Attachment publicId must be a string",
      };
    }
  }

  return {
    valid: true,
    value: attachments,
  };
};

const validateAssignedUser = async (assignedTo) => {
  if (!assignedTo) {
    return {
      valid: true,
      user: null,
    };
  }

  if (!isValidObjectId(assignedTo)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid assigned user ID",
    };
  }

  const assignedUser = await validateUser(assignedTo);

  if (!assignedUser) {
    return {
      valid: false,
      status: 404,
      message: "Assigned user not found",
    };
  }

  if (assignedUser.isBlocked) {
    return {
      valid: false,
      status: 400,
      message: "Assigned user is blocked",
    };
  }

  if (!["staff", "admin"].includes(assignedUser.role)) {
    return {
      valid: false,
      status: 400,
      message: "Task can only be assigned to staff or admin users",
    };
  }

  return {
    valid: true,
    user: assignedUser,
  };
};

const validateTaskDates = (startDate, dueDate) => {
  if (startDate !== null && startDate !== undefined && startDate !== "" && !isValidDate(startDate)) {
    return "Invalid start date";
  }

  if (dueDate !== null && dueDate !== undefined && dueDate !== "" && !isValidDate(dueDate)) {
    return "Invalid due date";
  }

  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    return "Due date cannot be before start date";
  }

  return null;
};

const updateOverdueStatus = async (task) => {
  if (task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.dueDate) {
    const now = new Date();

    if (new Date(task.dueDate) < now) {
      task.status = "OVERDUE";
    }
  }
};

const createTask = async (req, res, next) => {
  try {
    const { farm, shed, batch, title, description, category, priority, assignedTo, startDate, dueDate, status, completionNote, attachments, recurring, notes } = req.body;

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

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (shed) {
      const shedDoc = await validateShedBelongsToFarm(shed, farm);

      if (!shedDoc) {
        return res.status(400).json({
          success: false,
          message: "Shed does not belong to the selected farm",
        });
      }
    }

    if (batch) {
      const batchDoc = await validateBatchBelongsToFarm(batch, farm);

      if (!batchDoc) {
        return res.status(400).json({
          success: false,
          message: "Batch does not belong to the selected farm",
        });
      }
    }

    if (category && !validateCategory(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task category",
      });
    }

    if (priority && !validatePriority(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    if (status && !validateStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    if (status === "OVERDUE") {
      return res.status(400).json({
        success: false,
        message: "OVERDUE status is managed automatically",
      });
    }

    const dateError = validateTaskDates(startDate, dueDate);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const assignedUserValidation = await validateAssignedUser(assignedTo);

    if (!assignedUserValidation.valid) {
      return res.status(assignedUserValidation.status).json({
        success: false,
        message: assignedUserValidation.message,
      });
    }

    const attachmentValidation = validateAttachments(attachments);

    if (!attachmentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: attachmentValidation.message,
      });
    }

    const recurringValidation = validateRecurring(recurring);

    if (!recurringValidation.valid) {
      return res.status(400).json({
        success: false,
        message: recurringValidation.message,
      });
    }

    const finalStatus = status || "PENDING";

    const task = await Task.create({
      farm,
      shed: shed || null,
      batch: batch || null,
      title: title.trim(),
      description: description?.trim() || "",
      category: category || "OTHER",
      priority: priority || "MEDIUM",
      assignedTo: assignedTo || null,
      assignedBy: req.user._id,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: finalStatus,
      completionNote: completionNote?.trim() || "",
      attachments: attachmentValidation.value || [],
      recurring: recurringValidation.value,
      notes: notes?.trim() || "",
    });

    if (task.status === "COMPLETED") {
      task.completedAt = new Date();
      await task.save();
    }

    const populatedTask = await buildTaskPopulate(Task.findById(task._id));

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const { farm, shed, batch, assignedTo, category, priority, status, fromDate, toDate, dueToday, overdue } = req.query;

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

    if (shed) {
      if (!isValidObjectId(shed)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shed ID",
        });
      }

      const shedDoc = await Shed.findOne({
        _id: shed,
        farm: filter.farm,
      });

      if (!shedDoc) {
        return res.status(403).json({
          success: false,
          message: "Shed does not belong to your farm",
        });
      }

      filter.shed = shed;
    }

    if (batch) {
      if (!isValidObjectId(batch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const batchDoc = await Batch.findOne({
        _id: batch,
        farm: filter.farm,
      });

      if (!batchDoc) {
        return res.status(403).json({
          success: false,
          message: "Batch does not belong to your farm",
        });
      }

      filter.batch = batch;
    }

    if (assignedTo) {
      if (!isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      filter.assignedTo = assignedTo;
    }

    if (category) {
      if (!validateCategory(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task category",
        });
      }

      filter.category = category;
    }

    if (priority) {
      if (!validatePriority(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      filter.priority = priority;
    }

    if (status) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
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
      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: "fromDate cannot be greater than toDate",
        });
      }
    }

    if (fromDate || toDate) {
      filter.dueDate = {};

      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);

        filter.dueDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        filter.dueDate.$lte = end;
      }
    }

    if (dueToday === "true") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      filter.dueDate = {
        $gte: start,
        $lte: end,
      };
    }

    if (overdue === "true") {
      filter.dueDate = {
        $lt: new Date(),
      };

      filter.status = {
        $nin: ["COMPLETED", "CANCELLED"],
      };
    }

    const tasks = await buildTaskPopulate(
      Task.find(filter).sort({
        dueDate: 1,
        priority: -1,
        createdAt: -1,
      })
    );

    for (const task of tasks) {
      const oldStatus = task.status;

      await updateOverdueStatus(task);

      if (task.status !== oldStatus) {
        await task.save();
      }
    }

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await buildTaskPopulate(Task.findById(id));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const farmId = task.farm?._id || task.farm;

    const farmDoc = await validateFarmOwnership(farmId, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const oldStatus = task.status;

    await updateOverdueStatus(task);

    if (task.status !== oldStatus) {
      await task.save();
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const farmDoc = await validateFarmOwnership(task.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { shed, batch, title, description, category, priority, assignedTo, startDate, dueDate, status, completionNote, attachments, recurring, notes } = req.body;

    if (shed !== undefined) {
      if (shed) {
        const shedDoc = await validateShedBelongsToFarm(shed, task.farm);

        if (!shedDoc) {
          return res.status(400).json({
            success: false,
            message: "Shed does not belong to the selected farm",
          });
        }
      }

      task.shed = shed || null;
    }

    if (batch !== undefined) {
      if (batch) {
        const batchDoc = await validateBatchBelongsToFarm(batch, task.farm);

        if (!batchDoc) {
          return res.status(400).json({
            success: false,
            message: "Batch does not belong to the selected farm",
          });
        }
      }

      task.batch = batch || null;
    }

    if (title !== undefined) {
      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Task title cannot be empty",
        });
      }

      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = description?.trim() || "";
    }

    if (category !== undefined) {
      if (!validateCategory(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task category",
        });
      }

      task.category = category;
    }

    if (priority !== undefined) {
      if (!validatePriority(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      task.priority = priority;
    }

    if (assignedTo !== undefined) {
      const assignedUserValidation = await validateAssignedUser(assignedTo);

      if (!assignedUserValidation.valid) {
        return res.status(assignedUserValidation.status).json({
          success: false,
          message: assignedUserValidation.message,
        });
      }

      task.assignedTo = assignedTo || null;
    }

    if (startDate !== undefined) {
      task.startDate = startDate || null;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate || null;
    }

    const dateError = validateTaskDates(task.startDate, task.dueDate);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    if (status !== undefined) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      if (status === "OVERDUE") {
        return res.status(400).json({
          success: false,
          message: "OVERDUE status is managed automatically",
        });
      }

      task.status = status;

      if (status === "COMPLETED") {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    if (completionNote !== undefined) {
      task.completionNote = completionNote?.trim() || "";
    }

    if (attachments !== undefined) {
      const attachmentValidation = validateAttachments(attachments);

      if (!attachmentValidation.valid) {
        return res.status(400).json({
          success: false,
          message: attachmentValidation.message,
        });
      }

      task.attachments = attachmentValidation.value;
    }

    if (recurring !== undefined) {
      const recurringValidation = validateRecurring(recurring);

      if (!recurringValidation.valid) {
        return res.status(400).json({
          success: false,
          message: recurringValidation.message,
        });
      }

      task.recurring = recurringValidation.value;
    }

    if (notes !== undefined) {
      task.notes = notes?.trim() || "";
    }

    await task.save();

    const updatedTask = await buildTaskPopulate(Task.findById(task._id));

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const farmDoc = await validateFarmOwnership(task.farm, req.user._id);

    if (!farmDoc) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createTask, getTasks, getTaskById, updateTask, deleteTask };
