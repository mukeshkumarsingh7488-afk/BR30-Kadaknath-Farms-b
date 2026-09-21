import mongoose from "mongoose";

const farmExpenseSchema = new mongoose.Schema(
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

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
      index: true,
    },

    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["FEED", "MEDICINE", "VACCINE", "CHICKS", "BIRDS", "LABOR", "ELECTRICITY", "WATER", "MAINTENANCE", "TRANSPORT", "PACKAGING", "BIOSECURITY", "VETERINARY", "EQUIPMENT", "RENT", "MARKETING", "OTHER"],
      default: "OTHER",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "CREDIT", "OTHER"],
      default: "CASH",
    },

    paymentStatus: {
      type: String,
      enum: ["PAID", "PENDING", "PARTIAL"],
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

    vendor: {
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

      invoiceNumber: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },
    },

    recurring: {
      type: Boolean,
      default: false,
    },

    receiptImage: {
      url: {
        type: String,
        trim: true,
        default: "",
      },

      publicId: {
        type: String,
        trim: true,
        default: "",
      },
    },

    createdBy: {
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

farmExpenseSchema.index({
  farm: 1,
  expenseDate: -1,
});

farmExpenseSchema.index({
  farm: 1,
  category: 1,
  expenseDate: -1,
});

farmExpenseSchema.index({
  batch: 1,
  expenseDate: -1,
});

farmExpenseSchema.index({
  farm: 1,
  paymentStatus: 1,
});

const FarmExpense = mongoose.model("FarmExpense", farmExpenseSchema);

export default FarmExpense;
