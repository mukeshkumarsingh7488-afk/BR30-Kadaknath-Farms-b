import express from "express";

import { createFeedInventory, getFeedInventories, getFeedInventoryById, updateFeedInventory, deleteFeedInventory } from "../controllers/feedInventoryController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createFeedInventory);

router.get("/", getFeedInventories);

router.get("/:id", getFeedInventoryById);

router.put("/:id", updateFeedInventory);

router.delete("/:id", deleteFeedInventory);

export default router;
