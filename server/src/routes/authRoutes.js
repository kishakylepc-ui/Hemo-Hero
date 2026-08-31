const express = require('express');

const router = express.Router();

const {
  register,
  login,
  logout,
  forgotPassword,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const { requireAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/loginRateLimiter');

// ------------------------------------------------------------
// PUBLIC AUTH ROUTES
// ------------------------------------------------------------

// Create a new account
router.post('/register', register);

// Login is protected by failed-attempt rate limiting
router.post('/login', loginLimiter, login);

// Request a password-reset email
router.post('/forgot-password', forgotPassword);

// ------------------------------------------------------------
// PROTECTED AUTH ROUTES
// Require a valid Supabase Bearer access token
// ------------------------------------------------------------

// Log out and revoke the current session
router.post('/logout', requireAuth, logout);

// Get the logged-in user's profile
router.get('/me', requireAuth, getProfile);

// Update allowed profile fields
router.patch('/me', requireAuth, updateProfile);

module.exports = router;