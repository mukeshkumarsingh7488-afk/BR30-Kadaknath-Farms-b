import express from "express";
import multer from "multer";

import { createShedMaintenance, getShedMaintenances, getShedMaintenanceById, updateShedMaintenance, deleteShedMaintenance, uploadShedMaintenanceImage } from "../controllers/shedMaintenanceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  },
});

router.use(authMiddleware);

router.post("/upload-image", upload.single("image"), uploadShedMaintenanceImage);

router.post("/", createShedMaintenance);

router.get("/", getShedMaintenances);

router.get("/:id", getShedMaintenanceById);

router.put("/:id", updateShedMaintenance);

router.delete("/:id", deleteShedMaintenance);

export default router;
