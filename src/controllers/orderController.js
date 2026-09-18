import mongoose from "mongoose";

import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import env from "../config/env.js";
import User from "../models/User.js";

import { createPaytmTransaction, getPaytmTransactionStatus } from "../services/paytmService.js";

const generateOrderNumber = () => {
  const timestamp = Date.now().toString();

  const random = Math.floor(1000 + Math.random() * 9000);

  return `BR30-${timestamp}-${random}`;
};

const normalizeAddress = (data = {}) => ({
  fullName: String(data.fullName || "").trim(),

  phone: String(data.phone || "").trim(),

  email: String(data.email || "")
    .trim()
    .toLowerCase(),

  address: String(data.address || "").trim(),

  city: String(data.city || "").trim(),

  state: String(data.state || "").trim(),

  pincode: String(data.pincode || "").trim(),
});

const validateAddress = (address) => {
  const requiredFields = ["fullName", "phone", "email", "address", "city", "state", "pincode"];

  return requiredFields.filter((field) => !address[field]);
};

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { items, shippingAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty.",
      });
    }

    const address = normalizeAddress(shippingAddress);

    const missingFields = validateAddress(address);

    if (missingFields.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Please provide complete shipping information.",
        fields: missingFields,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Combine duplicate products
    |--------------------------------------------------------------------------
    */

    const requestedItems = new Map();

    for (const item of items) {
      const productId = item?.productId || item?.id;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(422).json({
          success: false,
          message: "Invalid product ID.",
        });
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(422).json({
          success: false,
          message: "Invalid product quantity.",
        });
      }

      const key = String(productId);

      requestedItems.set(key, (requestedItems.get(key) || 0) + quantity);
    }

    const productIds = [...requestedItems.keys()];

    const products = await Product.find({
      _id: {
        $in: productIds,
      },

      isActive: true,
    }).lean();

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are unavailable.",
      });
    }

    const orderItems = [];

    let subtotal = 0;

    for (const product of products) {
      const quantity = requestedItems.get(String(product._id));

      if (quantity > Number(product.stock)) {
        return res.status(400).json({
          success: false,

          message: `${product.name} does not have enough stock.`,

          productId: product._id,

          availableStock: product.stock,

          requestedQuantity: quantity,
        });
      }

      const price = Number(product.price);

      const itemTotal = price * quantity;

      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,

        name: product.name,

        slug: product.slug,

        price,

        unit: product.unit,

        quantity,

        image: product.image,

        total: itemTotal,
      });
    }

    const deliveryCharge = 0;

    const total = subtotal + deliveryCharge;

    if (total <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be greater than zero.",
      });
    }

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,

      user: userId,

      items: orderItems,

      shippingAddress: address,

      subtotal,

      deliveryCharge,

      total,

      paymentMethod: "PAYTM",

      paymentStatus: "PENDING",

      orderStatus: "PENDING",
    });

    let paytm;

    try {
      paytm = await createPaytmTransaction({
        orderId: orderNumber,

        amount: total,

        customerId: userId,
      });
    } catch (paytmError) {
      await Order.findByIdAndDelete(order._id);

      throw paytmError;
    }

    order.paytmOrderId = orderNumber;

    order.paymentStatus = "PROCESSING";

    await order.save();

    await Payment.create({
      order: order._id,

      user: userId,

      provider: "PAYTM",

      paytmOrderId: orderNumber,

      amount: total,

      currency: "INR",

      status: "PENDING",
    });

    return res.status(201).json({
      success: true,

      message: "Order created successfully.",

      order: {
        id: order._id,

        orderNumber: order.orderNumber,

        subtotal: order.subtotal,

        deliveryCharge: order.deliveryCharge,

        total: order.total,

        paymentMethod: order.paymentMethod,

        paymentStatus: order.paymentStatus,

        orderStatus: order.orderStatus,
      },

      payment: {
        provider: "PAYTM",
        orderId: orderNumber,
        txnToken: paytm.txnToken,
        mid: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: id,

      user: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPaymentAndUpdateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,

      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (!order.paytmOrderId) {
      return res.status(400).json({
        success: false,
        message: "Paytm order ID is missing.",
      });
    }

    const result = await getPaytmTransactionStatus(order.paytmOrderId);

    const body = result?.body || {};

    const resultInfo = body?.resultInfo || {};

    const payment = await Payment.findOne({
      order: order._id,
    });

    if (payment) {
      payment.rawResponse = result;

      payment.responseCode = resultInfo.resultCode || null;

      payment.responseMessage = resultInfo.resultMsg || null;

      payment.transactionId = body.txnId || null;
    }

    const isSuccess = body.resultStatus === "TXN_SUCCESS" && Number(body.txnAmount) === Number(order.total);

    if (isSuccess) {
      if (order.paymentStatus !== "PAID") {
        order.paymentStatus = "PAID";

        order.orderStatus = "CONFIRMED";

        order.paidAt = new Date();

        await order.save();

        if (payment) {
          payment.status = "SUCCESS";

          payment.paidAt = new Date();

          await payment.save();
        }
      }

      return res.json({
        success: true,

        paid: true,

        message: "Payment verified successfully.",

        order,
      });
    }

    if (body.resultStatus === "TXN_FAILURE") {
      order.paymentStatus = "FAILED";

      await order.save();

      if (payment) {
        payment.status = "FAILED";

        await payment.save();
      }

      return res.json({
        success: true,

        paid: false,

        message: resultInfo.resultMsg || "Payment failed.",

        order,
      });
    }

    if (payment) {
      payment.status = "PENDING";

      await payment.save();
    }

    return res.json({
      success: true,

      paid: false,

      message: resultInfo.resultMsg || "Payment is still being processed.",

      order,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersForAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate("user", "name email phone").sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatusByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, cancellationReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const allowedStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(422).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be changed.",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be changed.",
      });
    }

    if (orderStatus === "DELIVERED" && order.paymentStatus !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be marked as delivered before payment is completed.",
      });
    }

    if (orderStatus === "CANCELLED") {
      const reason = String(cancellationReason || "").trim();

      if (!reason) {
        return res.status(422).json({
          success: false,
          message: "Cancellation reason is required.",
        });
      }

      if (reason.length > 500) {
        return res.status(422).json({
          success: false,
          message: "Cancellation reason cannot exceed 500 characters.",
        });
      }

      order.cancelledAt = new Date();
      order.cancellationReason = reason;
    }

    order.orderStatus = orderStatus;

    await order.save();

    return res.json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    next(error);
  }
};
