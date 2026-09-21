import express from "express";

import { createVeterinaryHealthLog, getVeterinaryHealthLogs, getVeterinaryHealthLogById, updateVeterinaryHealthLog, deleteVeterinaryHealthLog } from "../controllers/veterinaryHealthLogController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createVeterinaryHealthLog);

router.get("/", getVeterinaryHealthLogs);

router.get("/:id", getVeterinaryHealthLogById);

router.put("/:id", updateVeterinaryHealthLog);

router.delete("/:id", deleteVeterinaryHealthLog);

export default router;
