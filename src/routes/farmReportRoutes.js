import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import { generateFarmReport, getFarmReports, getFarmReportById, deleteFarmReport } from "../controllers/farmReportController.js";

const router = express.Router();

router.use(authMiddleware);

// Generate new farm report
router.post("/", generateFarmReport);

// Get all reports
router.get("/", getFarmReports);

// Get single report
router.get("/:id", getFarmReportById);

// Delete report
router.delete("/:id", deleteFarmReport);

export default router;
