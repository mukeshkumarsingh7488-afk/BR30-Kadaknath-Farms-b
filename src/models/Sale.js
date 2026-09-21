import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      enum: ["LIVE_BIRD", "CHICK", "EGG", "HATCHING_EGG", "BREEDING_PAIR", "DRESSED_CHICKEN", "OTHER"],
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unit: {
      type: String,
      enum: ["PIECE", "KG", "DOZEN", "EGG", "PAIR"],
      default: "PIECE",
    },

    weightKg: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const saleSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    saleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },

    saleDate: {
      type: Date,
      required: true,
      index: true,
    },

    customer: {
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

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 150,
        default: "",
      },

      address: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one sale item is required",
      },
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CREDIT", "OTHER"],
      default: "CASH",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID"],
      default: "PAID",
      index: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "NOT_REQUIRED",
      index: true,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
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

saleSchema.index(
  {
    farm: 1,
    saleNumber: 1,
  },
  {
    unique: true,
  }
);

saleSchema.index({
  farm: 1,
  saleDate: -1,
});

saleSchema.index({
  farm: 1,
  paymentStatus: 1,
  saleDate: -1,
});

saleSchema.index({
  farm: 1,
  deliveryStatus: 1,
});

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
