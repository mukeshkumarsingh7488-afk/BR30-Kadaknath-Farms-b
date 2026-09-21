import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
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
      maxlength: 150,
    },

    type: {
      type: String,
      enum: ["MEDICINE", "VACCINE", "ANTIBIOTIC", "VITAMIN", "SUPPLEMENT", "DISINFECTANT", "OTHER"],
      default: "MEDICINE",
      index: true,
    },

    brand: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    composition: {
      type: String,
      trim: true,
      maxlength: 500,
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

    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },

    unit: {
      type: String,
      enum: ["ML", "LITRE", "GRAM", "KG", "TABLET", "DOSE", "VIAL", "BOTTLE", "PACK", "PIECE"],
      default: "BOTTLE",
    },

    quantityReceived: {
      type: Number,
      required: true,
      min: 0,
    },

    quantityUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStock: {
      type: Number,
      required: true,
      min: 0,
    },

    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitCost: {
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

    storageLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    storageTemperature: {
      type: String,
      trim: true,
      maxlength: 100,
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

medicineSchema.index({
  farm: 1,
  purchaseDate: -1,
});

medicineSchema.index({
  farm: 1,
  type: 1,
  status: 1,
});

medicineSchema.index({
  farm: 1,
  expiryDate: 1,
});

const Medicine = mongoose.model("Medicine", medicineSchema);

export default Medicine;
