import express from "express";

import { createChicksInward, getChicksInwards, getChicksInwardById, updateChicksInward, deleteChicksInward } from "../controllers/chicksInwardController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import uploadSingleImage from "../middleware/upload.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", uploadSingleImage("invoiceImage"), createChicksInward);

router.get("/", getChicksInwards);

router.get("/:id", getChicksInwardById);

router.put("/:id", uploadSingleImage("invoiceImage"), updateChicksInward);

router.delete("/:id", deleteChicksInward);

export default router;
