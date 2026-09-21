import { isValidPermission } from "../config/permissions.js";

const permissionMiddleware = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admin has full access to all admin/farm permissions.
    if (req.user.role === "admin") {
      return next();
    }

    // Customer is never allowed to access admin/farm permission routes.
    if (req.user.role === "customer") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    // Only these roles can use page-level permissions.
    if (!["staff", "fm", "security"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    // Protect against invalid permission keys in route configuration.
    if (!isValidPermission(permission)) {
      return res.status(500).json({
        success: false,
        message: "Invalid permission configuration",
      });
    }

    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };
};

export default permissionMiddleware;
