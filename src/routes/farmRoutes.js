import express from "express";

import { createFarm, getFarms, getFarmById, updateFarm, deleteFarm } from "../controllers/farmController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createFarm);

router.get("/", getFarms);

router.get("/:id", getFarmById);

router.put("/:id", updateFarm);

router.delete("/:id", deleteFarm);

export default router;
