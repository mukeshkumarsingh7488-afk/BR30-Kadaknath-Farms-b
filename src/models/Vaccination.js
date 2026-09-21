import mongoose from "mongoose";

const vaccinationSchema = new mongoose.Schema(
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

    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
      index: true,
    },

    vaccineName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    vaccinationDate: {
      type: Date,
      required: true,
      index: true,
    },

    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },

    ageInDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    diseaseTarget: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    dosePerBird: {
      type: Number,
      min: 0,
      default: 0,
    },

    doseUnit: {
      type: String,
      enum: ["ML", "LITRE", "GRAM", "DOSE", "TABLET", "DROP", "VIAL", "OTHER"],
      default: "DOSE",
    },

    birdsScheduled: {
      type: Number,
      required: true,
      min: 0,
    },

    birdsVaccinated: {
      type: Number,
      required: true,
      min: 0,
    },

    vaccineQuantityUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    administrationRoute: {
      type: String,
      enum: ["DRINKING_WATER", "EYE_DROP", "ORAL", "INJECTION", "SPRAY", "OTHER"],
      default: "DRINKING_WATER",
    },

    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "PARTIALLY_COMPLETED", "MISSED", "CANCELLED"],
      default: "COMPLETED",
      index: true,
    },

    nextDueDate: {
      type: Date,
      default: null,
      index: true,
    },

    adverseReaction: {
      type: Boolean,
      default: false,
    },

    reactionDetails: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
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

vaccinationSchema.index({
  farm: 1,
  batch: 1,
  vaccinationDate: -1,
});

vaccinationSchema.index({
  farm: 1,
  scheduledDate: 1,
  status: 1,
});

vaccinationSchema.index({
  shed: 1,
  vaccinationDate: -1,
});

const Vaccination = mongoose.model("Vaccination", vaccinationSchema);

export default Vaccination;
