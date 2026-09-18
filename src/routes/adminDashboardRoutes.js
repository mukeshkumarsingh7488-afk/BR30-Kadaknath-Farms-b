import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

import { getAdminDashboard } from "../controllers/adminDashboardController.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/", getAdminDashboard);

export default router;
