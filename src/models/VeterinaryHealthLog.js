import mongoose from "mongoose";

const veterinaryHealthLogSchema = new mongoose.Schema(
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

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    visitType: {
      type: String,
      enum: ["ROUTINE_CHECKUP", "DISEASE", "INJURY", "EMERGENCY", "POST_VACCINATION", "FOLLOW_UP", "OTHER"],
      default: "ROUTINE_CHECKUP",
      index: true,
    },

    diseaseName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    symptoms: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    affectedBirds: {
      type: Number,
      default: 0,
      min: 0,
    },

    severity: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      default: "LOW",
    },

    diagnosis: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    treatment: {
      medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medicine",
        default: null,
      },

      medicineName: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      dosage: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      durationDays: {
        type: Number,
        min: 0,
        default: 0,
      },

      instructions: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
    },

    veterinarian: {
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

      clinic: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },
    },

    visitCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    medicineCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    recoveryStatus: {
      type: String,
      enum: ["UNDER_TREATMENT", "RECOVERED", "PARTIALLY_RECOVERED", "NOT_RECOVERED", "DECEASED", "OBSERVATION"],
      default: "UNDER_TREATMENT",
      index: true,
    },

    followUpDate: {
      type: Date,
      default: null,
      index: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

veterinaryHealthLogSchema.index({
  farm: 1,
  batch: 1,
  date: -1,
});

veterinaryHealthLogSchema.index({
  farm: 1,
  visitType: 1,
  date: -1,
});

veterinaryHealthLogSchema.index({
  shed: 1,
  date: -1,
});

veterinaryHealthLogSchema.index({
  farm: 1,
  recoveryStatus: 1,
});

const VeterinaryHealthLog = mongoose.model("VeterinaryHealthLog", veterinaryHealthLogSchema);

export default VeterinaryHealthLog;
