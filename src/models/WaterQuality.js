import mongoose from "mongoose";

const waterQualitySchema = new mongoose.Schema(
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

    testDate: {
      type: Date,
      required: true,
      index: true,
    },

    sampleLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    source: {
      type: String,
      enum: ["BOREWELL", "TANK", "MUNICIPAL", "RAINWATER", "OTHER"],
      default: "BOREWELL",
      index: true,
    },

    ph: {
      type: Number,
      min: 0,
      max: 14,
      default: null,
    },

    tdsPpm: {
      type: Number,
      min: 0,
      default: null,
    },

    hardnessPpm: {
      type: Number,
      min: 0,
      default: null,
    },

    ammoniaPpm: {
      type: Number,
      min: 0,
      default: null,
    },

    nitratePpm: {
      type: Number,
      min: 0,
      default: null,
    },

    chlorinePpm: {
      type: Number,
      min: 0,
      default: null,
    },

    temperatureCelsius: {
      type: Number,
      default: null,
    },

    microbialTest: {
      tested: {
        type: Boolean,
        default: false,
      },

      result: {
        type: String,
        enum: ["SAFE", "UNSAFE", "BORDERLINE", "NOT_TESTED"],
        default: "NOT_TESTED",
      },

      details: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    overallStatus: {
      type: String,
      enum: ["SAFE", "ACCEPTABLE", "NEEDS_TREATMENT", "UNSAFE"],
      default: "SAFE",
      index: true,
    },

    treatmentApplied: {
      type: Boolean,
      default: false,
    },

    treatmentDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    nextTestDate: {
      type: Date,
      default: null,
      index: true,
    },

    testedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

waterQualitySchema.index({
  farm: 1,
  testDate: -1,
});

waterQualitySchema.index({
  shed: 1,
  testDate: -1,
});

waterQualitySchema.index({
  farm: 1,
  overallStatus: 1,
});

const WaterQuality = mongoose.model("WaterQuality", waterQualitySchema);

export default WaterQuality;
