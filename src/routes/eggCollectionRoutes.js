import express from "express";

import { createEggCollection, getEggCollections, getEggCollectionById, updateEggCollection, deleteEggCollection } from "../controllers/eggCollectionController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createEggCollection);

router.get("/", getEggCollections);

router.get("/:id", getEggCollectionById);

router.put("/:id", updateEggCollection);

router.delete("/:id", deleteEggCollection);

export default router;
