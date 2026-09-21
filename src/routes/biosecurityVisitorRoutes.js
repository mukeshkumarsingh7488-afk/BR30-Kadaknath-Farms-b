import express from "express";

import { createBiosecurityVisitor, getBiosecurityVisitors, getBiosecurityVisitorById, updateBiosecurityVisitor, deleteBiosecurityVisitor } from "../controllers/biosecurityVisitorController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createBiosecurityVisitor);

router.get("/", getBiosecurityVisitors);

router.get("/:id", getBiosecurityVisitorById);

router.put("/:id", updateBiosecurityVisitor);

router.delete("/:id", deleteBiosecurityVisitor);

export default router;
