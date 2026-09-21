import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 150,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
    },

    product: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      image: {
        type: String,
        required: true,
        trim: true,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      price: {
        type: Number,
        required: true,
        min: 0,
      },

      productAmount: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundMethod: {
      type: String,
      enum: ["UPI", "NET_BANKING", "BANK_TRANSFER", "OTHER"],
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    damageImage: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: ["REFUNDED"],
      default: "REFUNDED",
      index: true,
    },

    refundedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

refundSchema.index({
  orderNumber: 1,
  createdAt: -1,
});

refundSchema.index({
  user: 1,
  createdAt: -1,
});

const Refund = mongoose.model("Refund", refundSchema);

export default Refund;
