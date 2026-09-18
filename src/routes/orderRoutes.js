import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

import { createOrder, getMyOrders, getMyOrderById, verifyPaymentAndUpdateOrder, getAllOrdersForAdmin, updateOrderStatusByAdmin } from "../controllers/orderController.js";

const router = express.Router();

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Admin Orders
|--------------------------------------------------------------------------
*/

router.get("/admin/all", adminMiddleware, getAllOrdersForAdmin);
router.put("/admin/:id/status", adminMiddleware, updateOrderStatusByAdmin);

/*
|--------------------------------------------------------------------------
| Customer Orders
|--------------------------------------------------------------------------
*/

router.post("/", createOrder);

router.get("/", getMyOrders);

router.get("/:id", getMyOrderById);

router.post("/:orderId/verify-payment", verifyPaymentAndUpdateOrder);

export default router;
