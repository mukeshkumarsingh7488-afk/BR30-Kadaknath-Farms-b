import mongoose from "mongoose";

const feedConsumptionSchema = new mongoose.Schema(
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

    feedInventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedInventory",
      required: true,
      index: true,
    },

    consumptionDate: {
      type: Date,
      required: true,
      index: true,
    },

    feedType: {
      type: String,
      enum: ["STARTER", "GROWER", "LAYER", "BREEDER", "PRE_STARTER", "FINISHER", "MEDICATED", "OTHER"],
      default: "OTHER",
      index: true,
    },

    quantityKg: {
      type: Number,
      required: true,
      min: 0.01,
    },

    birdCountAtConsumption: {
      type: Number,
      required: true,
      min: 0,
    },

    feedPerBirdGram: {
      type: Number,
      default: 0,
      min: 0,
    },

    costPerKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    feedingSession: {
      type: String,
      enum: ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "FULL_DAY"],
      default: "FULL_DAY",
    },

    recordedBy: {
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

feedConsumptionSchema.index({
  farm: 1,
  batch: 1,
  consumptionDate: -1,
});

feedConsumptionSchema.index({
  shed: 1,
  consumptionDate: -1,
});

feedConsumptionSchema.index({
  feedInventory: 1,
  consumptionDate: -1,
});

const FeedConsumption = mongoose.model("FeedConsumption", feedConsumptionSchema);

export default FeedConsumption;
