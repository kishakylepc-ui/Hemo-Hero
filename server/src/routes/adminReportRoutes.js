const express =
  require('express');

const {
  getAdminReportSummary,
  getAdminReports,
  getAdminReportById,
  updateAdminReport,
} =
  require(
    '../controllers/adminReportController'
  );

const {
  requireAuth,
  requireAdmin,
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  activityLog,
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const router =
  express.Router();

// ============================================================
// ADMIN PROTECTION
//
// Every route below requires:
//
// 1. Valid authenticated session
// 2. Active public.users account
// 3. role === "admin"
// ============================================================

router.use(
  requireAuth,
  requireAdmin
);

// ============================================================
// ISSUE SUMMARY
//
// GET /api/admin/reports/summary
//
// Keep BEFORE /:id
// ============================================================

router.get(
  '/summary',
  getAdminReportSummary
);

// ============================================================
// ISSUE LIST
//
// GET /api/admin/reports
//
// Query examples:
//
// ?page=1
// ?limit=20
// ?status=open
// ?kind=report
// ?search=harassment
// ============================================================

router.get(
  '/',
  getAdminReports
);

// ============================================================
// UPDATE ISSUE STATUS / ADMIN NOTE
//
// PATCH /api/admin/reports/:id
//
// LOG:
// ADMIN_UPDATE_REPORT
// ============================================================

router.patch(
  '/:id',

  activityLog({
    action:
      'ADMIN_UPDATE_REPORT',

    module:
      'Issues',

    successDescription:
      'Administrator updated a user issue.',

    failureDescription:
      'Administrator attempt to update a user issue failed.',

    entityType:
      'user_report',

    // Log the status only - never the admin note text.
    metadata: ({ req }) => ({
      status:
        req.body?.status ||
        null,
    }),
  }),

  updateAdminReport
);

// ============================================================
// ISSUE DETAILS
//
// GET /api/admin/reports/:id
//
// Keep LAST so "summary" resolves through its own route first.
// ============================================================

router.get(
  '/:id',
  getAdminReportById
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;
