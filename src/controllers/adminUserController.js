import mongoose from "mongoose";
import User from "../models/User.js";
const USER_ROLES = ["customer", "staff", "admin", "fm", "security"];
const normalizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions || [],
    isBlocked: user.isBlocked,
    isEmailVerified: user.isEmailVerified,
    profilePicture: user.profilePicture,
    address: user.address,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
const validateUserId = (id) => mongoose.Types.ObjectId.isValid(id);
export const getUsers = async (req, res, next) => {
  try {
    const { search = "", role = "ALL", status = "ALL" } = req.query;
    const filter = { role: { $in: USER_ROLES } };
    if (role !== "ALL") {
      if (!USER_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role filter" });
      }
      filter.role = role;
    }
    if (status !== "ALL") {
      if (!["active", "blocked"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      filter.isBlocked = status === "blocked";
    }
    const cleanSearch = String(search).trim();
    if (cleanSearch) {
      const searchRegex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    const customersCount = await User.countDocuments({ role: "customer" });
    const staffCount = await User.countDocuments({ role: "staff" });
    const adminCount = await User.countDocuments({ role: "admin" });
    const fmCount = await User.countDocuments({ role: "fm" });
    const securityCount = await User.countDocuments({ role: "security" });
    const blockedCount = await User.countDocuments({ role: { $in: USER_ROLES }, isBlocked: true });
    return res.status(200).json({
      success: true,
      count: users.length,
      stats: {
        total: customersCount + staffCount + adminCount + fmCount + securityCount,
        customers: customersCount,
        staff: staffCount,
        admin: adminCount,
        fm: fmCount,
        security: securityCount,
        blocked: blockedCount,
      },
      users: users.map(normalizeUser),
    });
  } catch (error) {
    next(error);
  }
};
export const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: "staff" }).select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: staff.length, staff: staff.map(normalizeUser) });
  } catch (error) {
    next(error);
  }
};
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateUserId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot edit your own account from user management" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin account cannot be edited here" });
    }
    const { name, email, phone, fullName, addressLine1, addressLine2, city, state, pincode, landmark } = req.body;
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2 || cleanName.length > 80) {
        return res.status(422).json({ success: false, message: "Name must be between 2 and 80 characters" });
      }
      user.name = cleanName;
    }
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(422).json({ success: false, message: "Please enter a valid email address" });
      }
      const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "Email is already registered with another user" });
      }
      user.email = cleanEmail;
    }
    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (!cleanPhone || cleanPhone.length > 20) {
        return res.status(422).json({ success: false, message: "Please enter a valid phone number" });
      }
      user.phone = cleanPhone;
    }
    const addressFields = { fullName, addressLine1, addressLine2, city, state, pincode, landmark };
    const hasAddressUpdate = Object.values(addressFields).some((value) => value !== undefined);
    if (hasAddressUpdate) {
      user.address = user.address || {};
      Object.entries(addressFields).forEach(([field, value]) => {
        if (value !== undefined) {
          user.address[field] = String(value).trim();
        }
      });
    }
    await user.save();
    return res.status(200).json({ success: true, message: "User details updated successfully", user: normalizeUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Email is already registered with another user" });
    }
    next(error);
  }
};
export const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!validateUserId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid user role" });
    }
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot change your own role" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin account role cannot be changed here" });
    }
    user.role = role;
    await user.save();
    return res.status(200).json({ success: true, message: `User role changed to ${role}`, user: normalizeUser(user) });
  } catch (error) {
    next(error);
  }
};
export const toggleUserBlock = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateUserId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot block your own account" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin account cannot be blocked" });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    return res.status(200).json({ success: true, message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully", user: normalizeUser(user) });
  } catch (error) {
    next(error);
  }
};
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateUserId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Admin account cannot be deleted here" });
    }
    await User.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
