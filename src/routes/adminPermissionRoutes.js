import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

import { getRolePermissions, updateRolePermissions } from "../controllers/adminPermissionController.js";

const router = express.Router();

router.use(authMiddleware);

router.use(adminMiddleware);

router.get("/", getRolePermissions);

router.put("/:role", updateRolePermissions);

export default router;
