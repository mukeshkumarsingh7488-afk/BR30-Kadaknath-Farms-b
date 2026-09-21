import express from "express";

import { createWaterQuality, getWaterQualities, getWaterQualityById, updateWaterQuality, deleteWaterQuality } from "../controllers/waterQualityController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createWaterQuality);

router.get("/", getWaterQualities);

router.get("/:id", getWaterQualityById);

router.put("/:id", updateWaterQuality);

router.delete("/:id", deleteWaterQuality);

export default router;
