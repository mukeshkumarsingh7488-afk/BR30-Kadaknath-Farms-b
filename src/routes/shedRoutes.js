import express from "express";

import { createShed, getSheds, getShedById, updateShed, deleteShed } from "../controllers/shedController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createShed);

router.get("/", getSheds);

router.get("/:id", getShedById);

router.put("/:id", updateShed);

router.delete("/:id", deleteShed);

export default router;
