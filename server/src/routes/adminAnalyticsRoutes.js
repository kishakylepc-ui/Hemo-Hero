const express =
  require('express');

const {
  getAnalyticsTrends,
} =
  require(
    '../controllers/adminAnalyticsController'
  );

const {
  requireAuth,
  requireAdmin,
} =
  require(
    '../middleware/authMiddleware'
  );

const router =
  express.Router();

// =====================================
// ADMIN ACCESS
// =====================================

router.use(
  requireAuth,
  requireAdmin
);

// =====================================
// WEEKLY COUNTS FOR THE CHARTS
//
// GET /api/admin/analytics/trends
// =====================================

router.get(
  '/trends',
  getAnalyticsTrends
);

module.exports =
  router;
