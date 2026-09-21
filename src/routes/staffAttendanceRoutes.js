import express from "express";

import { createStaffAttendance, getStaffAttendances, getStaffAttendanceById, updateStaffAttendance, deleteStaffAttendance } from "../controllers/staffAttendanceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createStaffAttendance);

router.get("/", getStaffAttendances);

router.get("/:id", getStaffAttendanceById);

router.put("/:id", updateStaffAttendance);

router.delete("/:id", deleteStaffAttendance);

export default router;
