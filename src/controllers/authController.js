import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import env from "../config/env.js";

import generateOtp from "../utils/generateOtp.js";
import { encryptData, decryptData } from "../utils/cryptoToken.js";

import { sendVerificationOtpEmail, sendPasswordResetOtpEmail } from "../services/emailService.js";

const OTP_EXPIRY = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRY = 10 * 60 * 1000;

const createAccessToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const otp = generateOtp();

    const hashedPassword = await bcrypt.hash(password, 12);

    const registrationToken = encryptData({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      otp,
      expiresAt: Date.now() + OTP_EXPIRY,
    });

    await sendVerificationOtpEmail({
      name,
      email: normalizedEmail,
      otp,
    });

    return res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify your email.",
      registrationToken,
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationOtp = async (req, res, next) => {
  try {
    const { registrationToken } = req.body;

    let registrationData;

    try {
      registrationData = decryptData(registrationToken);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration session. Please register again.",
      });
    }

    const normalizedEmail = registrationData.email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const otp = generateOtp();

    const newRegistrationToken = encryptData({
      name: registrationData.name,
      email: normalizedEmail,
      phone: registrationData.phone,
      password: registrationData.password,
      otp,
      expiresAt: Date.now() + OTP_EXPIRY,
    });

    await sendVerificationOtpEmail({
      name: registrationData.name,
      email: normalizedEmail,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
      registrationToken: newRegistrationToken,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { registrationToken, otp } = req.body;

    let registrationData;

    try {
      registrationData = decryptData(registrationToken);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration session",
      });
    }

    if (Date.now() > registrationData.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    if (registrationData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const normalizedEmail = registrationData.email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const role = normalizedEmail === env.adminEmail ? "admin" : "customer";

    const user = await User.create({
      name: registrationData.name,
      email: normalizedEmail,
      phone: registrationData.phone,
      password: registrationData.password,
      role,
      isEmailVerified: true,
    });

    const accessToken = createAccessToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Email verified and account created successfully",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact the administrator.",
      });
    }

    const isAdminEmail = normalizedEmail === env.adminEmail;

    if (isAdminEmail && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    if (!user.role) {
      user.role = "customer";
      await user.save();
    }

    const accessToken = createAccessToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, a password reset OTP has been sent.",
      });
    }

    const otp = generateOtp();

    const resetToken = encryptData({
      userId: user._id.toString(),
      email: user.email,
      otp,
      expiresAt: Date.now() + OTP_EXPIRY,
    });

    await sendPasswordResetOtpEmail({
      name: user.name,
      email: user.email,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const { resetToken, otp } = req.body;

    let resetData;

    try {
      resetData = decryptData(resetToken);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset session",
      });
    }

    if (Date.now() > resetData.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (resetData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const verifiedResetToken = encryptData({
      userId: resetData.userId,
      email: resetData.email,
      verified: true,
      expiresAt: Date.now() + RESET_TOKEN_EXPIRY,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: verifiedResetToken,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    let resetData;

    try {
      resetData = decryptData(resetToken);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset session",
      });
    }

    if (!resetData.verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify the OTP first",
      });
    }

    if (Date.now() > resetData.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Reset session has expired",
      });
    }

    const user = await User.findById(resetData.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
};
