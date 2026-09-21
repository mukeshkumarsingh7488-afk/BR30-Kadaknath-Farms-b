import express from "express";

import { createPayroll, getPayrolls, getPayrollById, updatePayroll, deletePayroll } from "../controllers/payrollController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createPayroll);

router.get("/", getPayrolls);

router.get("/:id", getPayrollById);

router.put("/:id", updatePayroll);

router.delete("/:id", deletePayroll);

export default router;
