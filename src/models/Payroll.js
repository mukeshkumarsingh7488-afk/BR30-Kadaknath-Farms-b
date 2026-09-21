import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
      index: true,
    },

    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    payrollMonth: {
      type: Date,
      required: true,
      index: true,
    },

    paymentType: {
      type: String,
      enum: ["MONTHLY", "DAILY_WAGE", "WEEKLY", "HOURLY", "CONTRACT"],
      default: "MONTHLY",
      index: true,
    },

    totalWorkingDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    halfDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    leaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    basicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    dailyRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    hourlyRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },

    netSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"],
      default: "PENDING",
      index: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"],
      default: "CASH",
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    processedBy: {
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

payrollSchema.index(
  {
    farm: 1,
    staff: 1,
    payrollMonth: 1,
  },
  {
    unique: true,
  }
);

payrollSchema.index({
  farm: 1,
  payrollMonth: -1,
});

payrollSchema.index({
  farm: 1,
  paymentStatus: 1,
});

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;
