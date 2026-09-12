const express = require('express');

const router = express.Router();

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} = require('../controllers/authController');

const {
  requireAuth,
} = require('../middleware/authMiddleware');

const {
  loginLimiter,
} = require('../middleware/loginRateLimiter');

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Create account
router.post(
  '/register',
  register
);

// Verify signup OTP
router.post(
  '/verify-email',
  verifyEmail
);

// Resend signup verification OTP
router.post(
  '/resend-verification',
  resendVerification
);

// Login
router.post(
  '/login',
  loginLimiter,
  login
);

// Send password recovery OTP
router.post(
  '/forgot-password',
  forgotPassword
);

// Verify recovery OTP and change password
router.post(
  '/reset-password',
  resetPassword
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Logout
router.post(
  '/logout',
  requireAuth,
  logout
);

// Current profile
router.get(
  '/me',
  requireAuth,
  getProfile
);

// Update profile
router.patch(
  '/me',
  requireAuth,
  updateProfile
);

module.exports = router;