import express from "express";

import { createMortality, getMortalities, getMortalityById, updateMortality, deleteMortality } from "../controllers/mortalityController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createMortality);

router.get("/", getMortalities);

router.get("/:id", getMortalityById);

router.put("/:id", updateMortality);

router.delete("/:id", deleteMortality);

export default router;
