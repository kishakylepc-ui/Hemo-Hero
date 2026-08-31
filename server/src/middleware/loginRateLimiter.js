const { rateLimit } = require('express-rate-limit');

// ------------------------------------------------------------
// LOGIN RATE LIMITER
//
// Development/capstone protection against repeated failed
// login attempts.
//
// Current behavior:
// - Allows up to 5 failed login attempts per IP
// - Uses a 15-minute window
// - Successful logins do not count toward the limit
// - Attempt after the limit receives HTTP 429
//
// Note:
// This uses Express's default in-memory store. For a deployed
// production system, use a persistent/shared store.
// ------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 5,

  // Successful login responses do not remain counted.
  skipSuccessfulRequests: true,

  // Failed responses such as 401 should count.
  skipFailedRequests: false,

  // Return modern RateLimit headers.
  standardHeaders: true,

  // Disable old X-RateLimit-* headers.
  legacyHeaders: false,

  statusCode: 429,

  message: {
    error:
      'Too many failed login attempts. Please try again after 15 minutes.'
  }
});

module.exports = {
  loginLimiter
};