import express from "express";

import { createWeightGrowth, getWeightGrowthRecords, getWeightGrowthById, updateWeightGrowth, deleteWeightGrowth } from "../controllers/weightGrowthController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createWeightGrowth);

router.get("/", getWeightGrowthRecords);

router.get("/:id", getWeightGrowthById);

router.put("/:id", updateWeightGrowth);

router.delete("/:id", deleteWeightGrowth);

export default router;
