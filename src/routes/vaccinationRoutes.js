import express from "express";

import { createVaccination, getVaccinations, getVaccinationById, updateVaccination, deleteVaccination } from "../controllers/vaccinationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createVaccination);

router.get("/", getVaccinations);

router.get("/:id", getVaccinationById);

router.put("/:id", updateVaccination);

router.delete("/:id", deleteVaccination);

export default router;
