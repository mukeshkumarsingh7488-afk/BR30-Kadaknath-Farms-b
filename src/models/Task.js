import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    shed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shed",
      default: null,
      index: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    category: {
      type: String,
      enum: ["FEEDING", "CLEANING", "EGG_COLLECTION", "VACCINATION", "MEDICINE", "WATER", "BIOSECURITY", "MAINTENANCE", "BIRD_CHECK", "STOCK_CHECK", "OTHER"],
      default: "OTHER",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      default: null,
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"],
      default: "PENDING",
      index: true,
    },

    completionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    attachments: [
      {
        url: {
          type: String,
          trim: true,
          default: "",
        },

        publicId: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

    recurring: {
      enabled: {
        type: Boolean,
        default: false,
      },

      frequency: {
        type: String,
        enum: ["DAILY", "WEEKLY", "MONTHLY"],
        default: null,
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({
  farm: 1,
  dueDate: 1,
  status: 1,
});

taskSchema.index({
  farm: 1,
  assignedTo: 1,
  status: 1,
});

taskSchema.index({
  farm: 1,
  category: 1,
  dueDate: -1,
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
