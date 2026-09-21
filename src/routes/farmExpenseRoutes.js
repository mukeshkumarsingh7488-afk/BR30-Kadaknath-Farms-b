import express from "express";

import { createFarmExpense, getFarmExpenses, getFarmExpenseById, updateFarmExpense, deleteFarmExpense } from "../controllers/farmExpenseController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createFarmExpense);

router.get("/", getFarmExpenses);

router.get("/:id", getFarmExpenseById);

router.put("/:id", updateFarmExpense);

router.delete("/:id", deleteFarmExpense);

export default router;
