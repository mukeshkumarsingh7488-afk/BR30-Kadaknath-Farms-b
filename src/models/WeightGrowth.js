import mongoose from "mongoose";

const weightGrowthSchema = new mongoose.Schema(
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

    ageInDays: {
      type: Number,
      required: true,
      min: 0,
    },

    sampleSize: {
      type: Number,
      required: true,
      min: 1,
    },

    averageWeightKg: {
      type: Number,
      required: true,
      min: 0,
    },

    minimumWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    maleAverageWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    femaleAverageWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalSampleWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    weightGainFromPreviousKg: {
      type: Number,
      default: 0,
    },

    averageDailyGainKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    targetAchievementPercentage: {
      type: Number,
      min: 0,
      default: 0,
    },

    measurementMethod: {
      type: String,
      enum: ["INDIVIDUAL", "SAMPLE_AVERAGE", "GROUP_WEIGHT"],
      default: "SAMPLE_AVERAGE",
    },

    measuredBy: {
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

weightGrowthSchema.index({
  farm: 1,
  batch: 1,
  date: -1,
});

weightGrowthSchema.index({
  shed: 1,
  date: -1,
});

const WeightGrowth = mongoose.model("WeightGrowth", weightGrowthSchema);

export default WeightGrowth;
