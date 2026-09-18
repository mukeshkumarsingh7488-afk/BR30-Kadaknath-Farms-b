import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [totalOrders, paidOrders, pendingOrders, confirmedOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, totalCustomers, totalStaff, blockedUsers, totalProducts, activeProducts, lowStockProducts, paidRevenueResult, paymentSuccessResult, recentOrders] =
      await Promise.all([
        // =========================
        // ORDERS
        // =========================

        Order.countDocuments(),

        Order.countDocuments({
          paymentStatus: "PAID",
        }),

        Order.countDocuments({
          orderStatus: "PENDING",
        }),

        Order.countDocuments({
          orderStatus: "CONFIRMED",
        }),

        Order.countDocuments({
          orderStatus: "PROCESSING",
        }),

        Order.countDocuments({
          orderStatus: "SHIPPED",
        }),

        Order.countDocuments({
          orderStatus: "DELIVERED",
        }),

        Order.countDocuments({
          orderStatus: "CANCELLED",
        }),

        // =========================
        // USERS
        // Admin is intentionally
        // excluded from total users.
        // =========================

        User.countDocuments({
          role: "customer",
        }),

        User.countDocuments({
          role: "staff",
        }),

        User.countDocuments({
          isBlocked: true,
          role: {
            $in: ["customer", "staff"],
          },
        }),

        // =========================
        // PRODUCTS
        // =========================

        Product.countDocuments(),

        Product.countDocuments({
          isActive: true,
        }),

        Product.countDocuments({
          stock: {
            $lte: 5,
          },
          isActive: true,
        }),

        // =========================
        // REVENUE FROM PAID ORDERS
        // =========================

        Order.aggregate([
          {
            $match: {
              paymentStatus: "PAID",
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$total",
              },
            },
          },
        ]),

        // =========================
        // SUCCESSFUL PAYMENTS
        // =========================

        Payment.aggregate([
          {
            $match: {
              status: "SUCCESS",
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$amount",
              },
            },
          },
        ]),

        // =========================
        // RECENT ORDERS
        // =========================

        Order.find()
          .select("orderNumber user shippingAddress total paymentStatus orderStatus createdAt items")
          .populate("user", "name email phone")
          .sort({
            createdAt: -1,
          })
          .limit(8)
          .lean(),
      ]);

    // =========================
    // CALCULATED VALUES
    // =========================

    // Admin is NOT included.
    const totalUsers = totalCustomers + totalStaff;

    // Revenue shown on Dashboard.
    const paidRevenue = paidRevenueResult[0]?.total || 0;

    // Total amount from successful Payment records.
    const paymentSuccessAmount = paymentSuccessResult[0]?.total || 0;

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          staff: totalStaff,
          blocked: blockedUsers,
        },

        orders: {
          total: totalOrders,
          paid: paidOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },

        products: {
          total: totalProducts,
          active: activeProducts,
          lowStock: lowStockProducts,
        },

        // Frontend expects revenue as a number.
        revenue: paidRevenue,

        // Kept separately in case we need it later.
        paymentSuccess: paymentSuccessAmount,

        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};
