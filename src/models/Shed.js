import mongoose from "mongoose";

const shedSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    type: {
      type: String,
      enum: ["BROODING", "GROWER", "LAYER", "BREEDER", "HATCHING", "QUARANTINE", "MIXED"],
      default: "MIXED",
      index: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 0,
    },

    currentBirds: {
      type: Number,
      default: 0,
      min: 0,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
      index: true,
    },

    lastSanitizedAt: {
      type: Date,
      default: null,
    },

    nextSanitizationAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

shedSchema.index(
  {
    farm: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

shedSchema.index({
  farm: 1,
  status: 1,
});

const Shed = mongoose.model("Shed", shedSchema);

export default Shed;
