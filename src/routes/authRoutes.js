import express from "express";
import { validationResult } from "express-validator";

import { register, resendVerificationOtp, verifyEmail, login, forgotPassword, verifyResetOtp, resetPassword } from "../controllers/authController.js";

import { registerValidator, resendVerificationOtpValidator, verifyEmailValidator, loginValidator, forgotPasswordValidator, verifyResetOtpValidator, resetPasswordValidator } from "../validators/authValidator.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
| POST /api/auth/register
*/
router.post("/register", registerValidator, validate, register);

/*
|--------------------------------------------------------------------------
| Resend Verification OTP
|--------------------------------------------------------------------------
| POST /api/auth/resend-otp
*/
router.post("/resend-otp", resendVerificationOtpValidator, validate, resendVerificationOtp);

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
| POST /api/auth/verify-email
*/
router.post("/verify-email", verifyEmailValidator, validate, verifyEmail);

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
| POST /api/auth/login
*/
router.post("/login", loginValidator, validate, login);

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
| POST /api/auth/forgot-password
*/
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);

/*
|--------------------------------------------------------------------------
| Verify Reset OTP
|--------------------------------------------------------------------------
| POST /api/auth/verify-reset-otp
*/
router.post("/verify-reset-otp", verifyResetOtpValidator, validate, verifyResetOtp);

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
| POST /api/auth/reset-password
*/
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);

/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
| GET /api/auth/me
*/
router.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      permissions: Array.isArray(req.user.permissions) ? req.user.permissions : [],
      isEmailVerified: req.user.isEmailVerified,
      isBlocked: req.user.isBlocked,
    },
  });
});

export default router;
