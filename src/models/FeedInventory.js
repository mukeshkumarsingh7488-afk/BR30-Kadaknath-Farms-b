import mongoose from "mongoose";

const feedInventorySchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    feedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    feedType: {
      type: String,
      enum: ["STARTER", "GROWER", "LAYER", "BREEDER", "PRE_STARTER", "FINISHER", "MEDICATED", "OTHER"],
      default: "OTHER",
      index: true,
    },

    brand: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    batchNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 100,
      default: "",
    },

    supplier: {
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

      address: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
    },

    purchaseDate: {
      type: Date,
      required: true,
      index: true,
    },

    quantityReceivedKg: {
      type: Number,
      required: true,
      min: 0,
    },

    quantityUsedKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStockKg: {
      type: Number,
      required: true,
      min: 0,
    },

    reorderLevelKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitCostPerKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPurchaseCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    storageLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "EXPIRED"],
      default: "AVAILABLE",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    addedBy: {
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

feedInventorySchema.index({
  farm: 1,
  purchaseDate: -1,
});

feedInventorySchema.index({
  farm: 1,
  feedType: 1,
  status: 1,
});

feedInventorySchema.index({
  farm: 1,
  expiryDate: 1,
});

const FeedInventory = mongoose.model("FeedInventory", feedInventorySchema);

export default FeedInventory;
