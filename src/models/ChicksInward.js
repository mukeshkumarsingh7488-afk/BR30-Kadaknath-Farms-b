import mongoose from "mongoose";

const chicksInwardSchema = new mongoose.Schema(
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

    inwardNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },

    inwardDate: {
      type: Date,
      required: true,
      index: true,
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

    supplier: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
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

    quantityReceived: {
      type: Number,
      required: true,
      min: 1,
    },

    transportMortality: {
      quantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      reason: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
    },

    acceptedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    maleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    femaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
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

    invoiceImage: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: "",
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

chicksInwardSchema.index(
  {
    farm: 1,
    inwardNumber: 1,
  },
  {
    unique: true,
  }
);

chicksInwardSchema.index({
  farm: 1,
  inwardDate: -1,
});

chicksInwardSchema.index({
  batch: 1,
  inwardDate: -1,
});

const ChicksInward = mongoose.model("ChicksInward", chicksInwardSchema);

export default ChicksInward;
