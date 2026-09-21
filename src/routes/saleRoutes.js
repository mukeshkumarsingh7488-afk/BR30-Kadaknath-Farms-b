import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import { createSale, getSales, getSaleById, updateSale, deleteSale } from "../controllers/saleController.js";

const router = express.Router();

router.use(authMiddleware);

// Create sale
router.post("/", createSale);

// Get all sales
router.get("/", getSales);

// Get single sale
router.get("/:id", getSaleById);

// Update sale
router.put("/:id", updateSale);

// Delete sale
router.delete("/:id", deleteSale);

export default router;
