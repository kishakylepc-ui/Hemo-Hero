const express =
  require('express');

const {
  getAdminReportSummary,
  getAdminReports,
  getAdminReportById,
  updateAdminReport,
  takeAdminReportAction,
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
// ACT ON A REPORT (WARN / DEACTIVATE)
//
// POST /api/admin/reports/:id/action
//
// Body: { action: 'warn' | 'deactivate', admin_note }
//
// LOG:
// ADMIN_REPORT_ACTION
// ============================================================

function describeReportAction(
  req
) {
  return req.body?.action ===
    'deactivate'
    ? 'deactivate the reported user from an issue'
    : 'warn the reported user from an issue';
}

router.post(
  '/:id/action',

  activityLog({
    action:
      'ADMIN_REPORT_ACTION',

    module:
      'Issues',

    successDescription: ({ req }) =>
      req.body?.action ===
      'deactivate'
        ? 'Administrator deactivated a reported user and resolved the issue.'
        : 'Administrator warned a reported user and resolved the issue.',

    failureDescription: ({ req }) =>
      `Administrator attempt to ${describeReportAction(req)} failed.`,

    entityType:
      'user_report',

    // Log the action only - never the admin note text.
    metadata: ({ req }) => ({
      action:
        req.body?.action ||
        null,
    }),
  }),

  takeAdminReportAction
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
