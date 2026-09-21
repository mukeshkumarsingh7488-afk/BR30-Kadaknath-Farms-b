import express from "express";

import { createBatch, getBatches, getBatchById, updateBatch, deleteBatch } from "../controllers/batchController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createBatch);

router.get("/", getBatches);

router.get("/:id", getBatchById);

router.put("/:id", updateBatch);

router.delete("/:id", deleteBatch);

export default router;
