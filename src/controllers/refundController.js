import mongoose from "mongoose";

import Order from "../models/Order.js";
import Refund from "../models/Refund.js";
import Payment from "../models/Payment.js";
import cloudinary from "../config/cloudinary.js";

const getCustomerData = (order) => {
  return {
    name: order.shippingAddress?.fullName || "",
    email: order.shippingAddress?.email || "",
    phone: order.shippingAddress?.phone || "",
  };
};

const uploadRefundImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return resolve(null);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "br30-kadaknath-farms/refunds",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(file.buffer);
  });
};

/*
|--------------------------------------------------------------------------
| Get Order Data For Refund
|--------------------------------------------------------------------------
*/

export const getOrderForRefund = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
    }).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const payment = await Payment.findOne({
      order: order._id,
    }).sort({ createdAt: -1 });

    const customer = getCustomerData(order);

    const products = order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      productAmount: item.total,
    }));

    return res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          deliveryCharge: order.deliveryCharge,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
        },

        customer,

        payment: payment
          ? {
              provider: payment.provider,
              paytmOrderId: payment.paytmOrderId,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              transactionId: payment.transactionId,
              paidAt: payment.paidAt,
            }
          : null,

        products,
      },
    });
  } catch (error) {
    console.error("Get order for refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order data.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Create Refund
|--------------------------------------------------------------------------
*/

export const createRefund = async (req, res) => {
  try {
    const { orderNumber, productId, refundAmount, refundMethod, transactionId, reason } = req.body;

    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid product is required.",
      });
    }

    if (refundAmount === undefined || refundAmount === null || refundAmount === "" || Number.isNaN(Number(refundAmount))) {
      return res.status(400).json({
        success: false,
        message: "Refund amount is required.",
      });
    }

    const amount = Number(refundAmount);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than 0.",
      });
    }

    const allowedMethods = ["UPI", "NET_BANKING", "BANK_TRANSFER", "OTHER"];

    if (!allowedMethods.includes(refundMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund method.",
      });
    }

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Original transaction/reference ID is required.",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Refund/cancellation reason is required.",
      });
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const selectedProduct = order.items.find((item) => String(item.productId) === String(productId));

    if (!selectedProduct) {
      return res.status(404).json({
        success: false,
        message: "Selected product was not found in this order.",
      });
    }

    const productAmount = Number(selectedProduct.total);

    if (amount > productAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot be greater than product amount of ₹${productAmount}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Previous Refund
    |--------------------------------------------------------------------------
    */

    const previousRefunds = await Refund.find({
      order: order._id,
      "product.productId": selectedProduct.productId,
    });

    const alreadyRefunded = previousRefunds.reduce((sum, refund) => sum + Number(refund.refundAmount || 0), 0);

    const remainingRefund = productAmount - alreadyRefunded;

    if (amount > remainingRefund) {
      return res.status(400).json({
        success: false,
        message: `Only ₹${remainingRefund} refund amount is remaining for this product.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Damage Image
    |--------------------------------------------------------------------------
    */

    const damageImage = await uploadRefundImage(req.file);

    const customer = getCustomerData(order);

    const refund = await Refund.create({
      order: order._id,

      orderNumber: order.orderNumber,

      user: order.user,

      customer,

      product: {
        productId: selectedProduct.productId,
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        image: selectedProduct.image,
        unit: selectedProduct.unit,
        quantity: selectedProduct.quantity,
        price: selectedProduct.price,
        productAmount,
      },

      refundAmount: amount,

      refundMethod,

      transactionId: transactionId.trim(),

      reason: reason.trim(),

      damageImage,

      status: "REFUNDED",

      refundedAt: new Date(),
    });

    /*
    |--------------------------------------------------------------------------
    | Update Order Payment Status
    |--------------------------------------------------------------------------
    */

    const totalRefunded = await Refund.aggregate([
      {
        $match: {
          order: order._id,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$refundAmount",
          },
        },
      },
    ]);

    const refundedAmount = Number(totalRefunded[0]?.total || 0);

    if (refundedAmount >= Number(order.total)) {
      order.paymentStatus = "REFUNDED";
    }

    await order.save();

    return res.status(201).json({
      success: true,
      message: "Refund added successfully.",
      data: refund,
    });
  } catch (error) {
    console.error("Create refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create refund.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get All Refunds For Admin
|--------------------------------------------------------------------------
*/

export const getAllRefundsForAdmin = async (req, res) => {
  try {
    const refunds = await Refund.find().populate("order", "orderNumber total paymentStatus orderStatus").populate("user", "name email phone").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: refunds.length,
      data: refunds,
    });
  } catch (error) {
    console.error("Get all refunds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch refunds.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Single Refund
|--------------------------------------------------------------------------
*/

export const getRefundById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund ID.",
      });
    }

    const refund = await Refund.findById(id).populate("order", "orderNumber total paymentStatus orderStatus").populate("user", "name email phone");

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    console.error("Get refund by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch refund.",
    });
  }
};
