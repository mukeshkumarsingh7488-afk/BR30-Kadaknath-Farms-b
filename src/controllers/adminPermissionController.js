import User from "../models/User.js";

import PERMISSIONS, { isValidPermission } from "../config/permissions.js";

const MANAGED_ROLES = ["staff", "fm", "security"];

const DEFAULT_PERMISSIONS = {
  staff: ["dashboard"],
  fm: ["dashboard", "farm-dashboard"],
  security: ["dashboard", "biosecurity"],
};

const getRolePermissions = async (req, res) => {
  try {
    const users = await User.find(
      {
        role: { $in: MANAGED_ROLES },
      },
      {
        role: 1,
        permissions: 1,
      }
    ).lean();

    const rolePermissions = {};

    for (const role of MANAGED_ROLES) {
      const roleUsers = users.filter((user) => user.role === role);

      if (roleUsers.length === 0) {
        rolePermissions[role] = [...(DEFAULT_PERMISSIONS[role] || [])];
        continue;
      }

      const roleUserWithPermissions = roleUsers.find((user) => Array.isArray(user.permissions));

      if (roleUserWithPermissions) {
        rolePermissions[role] = [...new Set(roleUserWithPermissions.permissions)];
      } else {
        rolePermissions[role] = [...(DEFAULT_PERMISSIONS[role] || [])];
      }
    }

    return res.status(200).json({
      success: true,
      roles: MANAGED_ROLES,
      permissions: rolePermissions,
      availablePermissions: PERMISSIONS,
    });
  } catch (error) {
    console.error("Get role permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load role permissions",
    });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!MANAGED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    const uniquePermissions = [...new Set(permissions)];

    const invalidPermissions = uniquePermissions.filter((permission) => !isValidPermission(permission));

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission found",
        invalidPermissions,
      });
    }

    const result = await User.updateMany(
      {
        role,
      },
      {
        $set: {
          permissions: uniquePermissions,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `${role} permissions updated successfully`,
      role,
      permissions: uniquePermissions,
      modifiedUsers: result.modifiedCount,
      matchedUsers: result.matchedCount,
    });
  } catch (error) {
    console.error("Update role permissions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update role permissions",
    });
  }
};

export { getRolePermissions, updateRolePermissions };
