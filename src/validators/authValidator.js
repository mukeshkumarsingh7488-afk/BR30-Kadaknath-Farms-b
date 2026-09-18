import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 80 }).withMessage("Name must be between 2 and 80 characters"),

  body("email").trim().isEmail().withMessage("Please enter a valid email").normalizeEmail(),

  body("phone")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid Indian mobile number"),

  body("password").isLength({ min: 8, max: 100 }).withMessage("Password must be between 8 and 100 characters"),
];

export const loginValidator = [body("email").trim().isEmail().withMessage("Please enter a valid email").normalizeEmail(), body("password").notEmpty().withMessage("Password is required")];

export const verifyEmailValidator = [
  body("registrationToken").notEmpty().withMessage("Registration token is required"),

  body("otp")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be 6 digits"),
];

export const resendVerificationOtpValidator = [body("registrationToken").notEmpty().withMessage("Registration token is required")];

export const forgotPasswordValidator = [body("email").trim().isEmail().withMessage("Please enter a valid email").normalizeEmail()];

export const verifyResetOtpValidator = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),

  body("otp")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be 6 digits"),
];

export const resetPasswordValidator = [body("resetToken").notEmpty().withMessage("Reset token is required"), body("newPassword").isLength({ min: 8, max: 100 }).withMessage("Password must be between 8 and 100 characters")];
