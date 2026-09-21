import mongoose from "mongoose";

const shedMaintenanceSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    maintenanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    maintenanceType: {
      type: String,
      enum: ["CLEANING", "SANITIZATION", "REPAIR", "ELECTRICAL", "PLUMBING", "VENTILATION", "EQUIPMENT", "STRUCTURAL", "PEST_CONTROL", "OTHER"],
      default: "OTHER",
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

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },

    completedDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    actualCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    vendor: {
      name: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 20,
        default: "",
      },

      company: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },
    },

    materialsUsed: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 150,
          default: "",
        },

        quantity: {
          type: Number,
          min: 0,
          default: 0,
        },

        unit: {
          type: String,
          trim: true,
          maxlength: 30,
          default: "",
        },

        cost: {
          type: Number,
          min: 0,
          default: 0,
        },
      },
    ],

    beforeImages: [
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

    afterImages: [
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

shedMaintenanceSchema.index({
  farm: 1,
  shed: 1,
  maintenanceDate: -1,
});

shedMaintenanceSchema.index({
  farm: 1,
  status: 1,
  scheduledDate: 1,
});

shedMaintenanceSchema.index({
  shed: 1,
  maintenanceType: 1,
  maintenanceDate: -1,
});

const ShedMaintenance = mongoose.model("ShedMaintenance", shedMaintenanceSchema);

export default ShedMaintenance;
