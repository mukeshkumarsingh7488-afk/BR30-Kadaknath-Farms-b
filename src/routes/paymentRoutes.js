import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import { paytmCallback, getPaymentStatus } from "../controllers/paymentController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Paytm Callback
|--------------------------------------------------------------------------
| Paytm server calls this endpoint.
| Authentication middleware must NOT be used here.
|--------------------------------------------------------------------------
*/

router.post("/paytm/callback", paytmCallback);

/*
|--------------------------------------------------------------------------
| Customer Payment Status
|--------------------------------------------------------------------------
*/

router.get("/:orderId/status", authMiddleware, getPaymentStatus);

export default router;
