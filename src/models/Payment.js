import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["PAYTM"],
      default: "PAYTM",
      required: true,
    },

    paytmOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED"],
      default: "INITIATED",
      index: true,
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    responseCode: {
      type: String,
      default: null,
    },

    responseMessage: {
      type: String,
      default: null,
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({
  user: 1,
  createdAt: -1,
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
