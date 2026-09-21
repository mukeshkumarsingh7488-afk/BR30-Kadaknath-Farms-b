import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import uploadSingleImage from "../middleware/upload.js";

import { getOrderForRefund, createRefund, getAllRefundsForAdmin, getRefundById } from "../controllers/refundController.js";

const router = express.Router();

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Admin Refunds
|--------------------------------------------------------------------------
*/

router.get("/admin/order/:orderNumber", adminMiddleware, getOrderForRefund);

router.post("/admin", adminMiddleware, uploadSingleImage("damageImage"), createRefund);

router.get("/admin/all", adminMiddleware, getAllRefundsForAdmin);

router.get("/admin/:id", adminMiddleware, getRefundById);

export default router;
