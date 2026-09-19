const express =
  require('express');

const router =
  express.Router();

// ============================================================
// CONTROLLER
// ============================================================

const {
  getActivityLogs,
  getActivityLogSummary,
} = require(
  '../controllers/adminActivityLogController'
);

// ============================================================
// AUTHORIZATION
// ============================================================

const {
  requireAuth,
  requireAdmin,
} = require(
  '../middleware/authMiddleware'
);

// ============================================================
// ADMIN ACTIVITY LOG ROUTES
//
// All routes require:
// 1. Valid authenticated session
// 2. Admin role
// ============================================================

// ------------------------------------------------------------
// GET ACTIVITY LOG SUMMARY
//
// GET /api/admin/activity-logs/summary
// ------------------------------------------------------------

router.get(
  '/summary',
  requireAuth,
  requireAdmin,
  getActivityLogSummary
);

// ------------------------------------------------------------
// GET ACTIVITY LOGS
//
// GET /api/admin/activity-logs
//
// Optional query:
//
// ?page=1
// &limit=25
// &action=LOGIN
// &module=Authentication
// &success=true
// &user_email=user@email.com
// ------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireAdmin,
  getActivityLogs
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;