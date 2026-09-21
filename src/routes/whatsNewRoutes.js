import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

import { getWhatsNewForUser, markWhatsNewViewed, markWhatsNewExplored, getAllWhatsNew, getWhatsNewById, createWhatsNew, updateWhatsNew, deleteWhatsNew, publishWhatsNew, unpublishWhatsNew, updateWhatsNewOrder, getWhatsNewStats } from "../controllers/whatsNewController.js";

import { validateWhatsNewBody } from "../validators/whatsNewValidator.js";

const router = express.Router();

/* =========================================================
   ADMIN ONLY
========================================================= */

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

/* =========================================================
   USER
========================================================= */

// Get What's New features for logged-in user
router.get("/", authMiddleware, getWhatsNewForUser);

// Mark feature as viewed
router.post("/:id/view", authMiddleware, markWhatsNewViewed);

// Mark feature as explored
router.post("/:id/explore", authMiddleware, markWhatsNewExplored);

/* =========================================================
   ADMIN
========================================================= */

// Get all features
router.get("/admin/all", authMiddleware, adminMiddleware, adminOnly, getAllWhatsNew);

// Stats
router.get("/admin/stats", authMiddleware, adminMiddleware, adminOnly, getWhatsNewStats);

// Get single feature
router.get("/admin/:id", authMiddleware, adminMiddleware, adminOnly, getWhatsNewById);

// Create
router.post("/admin", authMiddleware, adminMiddleware, adminOnly, validateWhatsNewBody, createWhatsNew);

// Update
router.put("/admin/:id", authMiddleware, adminMiddleware, adminOnly, validateWhatsNewBody, updateWhatsNew);

// Delete
router.delete("/admin/:id", authMiddleware, adminMiddleware, adminOnly, deleteWhatsNew);

// Publish
router.patch("/admin/:id/publish", authMiddleware, adminMiddleware, adminOnly, publishWhatsNew);

// Unpublish
router.patch("/admin/:id/unpublish", authMiddleware, adminMiddleware, adminOnly, unpublishWhatsNew);

// Reorder
router.patch("/admin/order", authMiddleware, adminMiddleware, adminOnly, updateWhatsNewOrder);

export default router;
