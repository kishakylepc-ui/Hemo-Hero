const express = require('express');

const router = express.Router();

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  forgotPassword,
  verifyRecoveryCode,
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

router.post(
  '/register',
  register
);

router.post(
  '/verify-email',
  verifyEmail
);

router.post(
  '/resend-verification',
  resendVerification
);

router.post(
  '/login',
  loginLimiter,
  login
);

router.post(
  '/forgot-password',
  forgotPassword
);

// Verify recovery OTP FIRST
router.post(
  '/verify-recovery-code',
  verifyRecoveryCode
);

// Change password only AFTER OTP verification
router.post(
  '/reset-password',
  resetPassword
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

router.post(
  '/logout',
  requireAuth,
  logout
);

router.get(
  '/me',
  requireAuth,
  getProfile
);

router.patch(
  '/me',
  requireAuth,
  updateProfile
);

module.exports = router;