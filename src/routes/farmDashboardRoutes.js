import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import { getFarmDashboard } from "../controllers/farmDashboardController.js";

const router = express.Router();

router.use(authMiddleware);

// Farm Dashboard
router.get("/", getFarmDashboard);

export default router;
