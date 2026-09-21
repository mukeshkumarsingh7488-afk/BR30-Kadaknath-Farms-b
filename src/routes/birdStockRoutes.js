import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import { getBirdStock, getBirdStockByBatch } from "../controllers/birdStockController.js";

const router = express.Router();

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Bird Stock
|--------------------------------------------------------------------------
| GET /api/bird-stock?farm=FARM_ID
|--------------------------------------------------------------------------
*/
router.get("/", getBirdStock);

/*
|--------------------------------------------------------------------------
| Single Batch Bird Stock
|--------------------------------------------------------------------------
| GET /api/bird-stock/:farm/:batchId
|--------------------------------------------------------------------------
*/
router.get("/:farm/:batchId", getBirdStockByBatch);

export default router;
