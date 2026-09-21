import mongoose from "mongoose";

const eggCollectionSchema = new mongoose.Schema(
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

    collectionDate: {
      type: Date,
      required: true,
      index: true,
    },

    collectionSession: {
      type: String,
      enum: ["MORNING", "AFTERNOON", "EVENING"],
      default: "MORNING",
      index: true,
    },

    eggType: {
      type: String,
      enum: ["TABLE_EGG", "HATCHING_EGG", "DAMAGED_EGG", "CRACKED_EGG", "SMALL_EGG", "OTHER"],
      default: "TABLE_EGG",
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    goodEggs: {
      type: Number,
      default: 0,
      min: 0,
    },

    damagedEggs: {
      type: Number,
      default: 0,
      min: 0,
    },

    crackedEggs: {
      type: Number,
      default: 0,
      min: 0,
    },

    dirtyEggs: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageWeightGram: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalWeightKg: {
      type: Number,
      min: 0,
      default: 0,
    },

    collectedBy: {
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

eggCollectionSchema.index({
  farm: 1,
  batch: 1,
  collectionDate: -1,
});

eggCollectionSchema.index({
  shed: 1,
  collectionDate: -1,
});

eggCollectionSchema.index({
  farm: 1,
  eggType: 1,
  collectionDate: -1,
});

const EggCollection = mongoose.model("EggCollection", eggCollectionSchema);

export default EggCollection;
