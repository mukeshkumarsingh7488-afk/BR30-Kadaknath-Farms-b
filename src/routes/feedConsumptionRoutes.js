import express from "express";

import { createFeedConsumption, getFeedConsumptions, getFeedConsumptionById, updateFeedConsumption, deleteFeedConsumption } from "../controllers/feedConsumptionController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createFeedConsumption);

router.get("/", getFeedConsumptions);

router.get("/:id", getFeedConsumptionById);

router.put("/:id", updateFeedConsumption);

router.delete("/:id", deleteFeedConsumption);

export default router;
