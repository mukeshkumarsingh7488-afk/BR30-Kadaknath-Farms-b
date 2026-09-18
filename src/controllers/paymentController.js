import mongoose from "mongoose";

import Order from "../models/Order.js";
import Payment from "../models/Payment.js";

import { getPaytmTransactionStatus, verifyPaytmCallback } from "../services/paytmService.js";

export const paytmCallback = async (req, res, next) => {
  try {
    const callbackData = req.body || {};

    const isValid = await verifyPaytmCallback(callbackData);

    if (!isValid) {
      return res.status(400).send("Invalid payment signature.");
    }

    const paytmOrderId = callbackData.ORDERID;

    if (!paytmOrderId) {
      return res.status(400).send("Paytm order ID is missing.");
    }

    const order = await Order.findOne({
      paytmOrderId,
    });

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    /*
    |--------------------------------------------------------------------------
    | Never trust callback result directly.
    | Ask Paytm for transaction status.
    |--------------------------------------------------------------------------
    */

    const result = await getPaytmTransactionStatus(paytmOrderId);

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

    const amountMatches = Number(body.txnAmount) === Number(order.total);

    if (body.resultStatus === "TXN_SUCCESS" && amountMatches) {
      /*
      |--------------------------------------------------------------------------
      | Idempotency
      |--------------------------------------------------------------------------
      | If callback comes more than once, we don't
      | change the order again.
      |--------------------------------------------------------------------------
      */

      if (order.paymentStatus !== "PAID") {
        order.paymentStatus = "PAID";

        order.orderStatus = "CONFIRMED";

        order.paidAt = new Date();

        await order.save();
      }

      if (payment) {
        payment.status = "SUCCESS";

        payment.paidAt = payment.paidAt || new Date();

        await payment.save();
      }
    } else if (body.resultStatus === "TXN_FAILURE") {
      order.paymentStatus = "FAILED";

      await order.save();

      if (payment) {
        payment.status = "FAILED";

        await payment.save();
      }
    } else {
      order.paymentStatus = "PROCESSING";

      await order.save();

      if (payment) {
        payment.status = "PENDING";

        await payment.save();
      }
    }

    return res.send("Payment response received successfully.");
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (req, res, next) => {
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
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const payment = await Payment.findOne({
      order: order._id,

      user: req.user._id,
    }).lean();

    return res.json({
      success: true,

      payment: payment
        ? {
            provider: payment.provider,

            amount: payment.amount,

            currency: payment.currency,

            status: payment.status,

            transactionId: payment.transactionId,

            paidAt: payment.paidAt,
          }
        : null,

      order: {
        id: order._id,

        orderNumber: order.orderNumber,

        paymentStatus: order.paymentStatus,

        orderStatus: order.orderStatus,

        total: order.total,
      },
    });
  } catch (error) {
    next(error);
  }
};
