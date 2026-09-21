import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
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

    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },

    batchName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    birdType: {
      type: String,
      enum: ["CHICKS", "GROWER", "LAYER", "BREEDER", "LIVE_BIRDS"],
      default: "CHICKS",
      index: true,
    },

    breed: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Kadaknath",
    },

    source: {
      supplierName: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      supplierPhone: {
        type: String,
        trim: true,
        maxlength: 20,
        default: "",
      },

      supplierAddress: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
    },

    arrivalDate: {
      type: Date,
      required: true,
      index: true,
    },

    initialQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    initialMaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    initialFemaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentMaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentFemaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    expectedSaleAgeDays: {
      type: Number,
      default: 120,
      min: 1,
    },

    targetWeightKg: {
      type: Number,
      default: 1.5,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED", "QUARANTINE"],
      default: "ACTIVE",
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

batchSchema.index(
  {
    farm: 1,
    batchNumber: 1,
  },
  {
    unique: true,
  }
);

batchSchema.index({
  farm: 1,
  status: 1,
  arrivalDate: -1,
});

batchSchema.index({
  shed: 1,
  status: 1,
});

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
