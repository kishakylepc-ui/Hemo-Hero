const express =
  require('express');

const {
  requireAuth,
  requireAdmin
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  activityLog
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const {
  getDonorApplicationSummary,
  getDonorApplications,
  getDonorApplicationById,
  approveDonorApplication,
  rejectDonorApplication
} =
  require(
    '../controllers/adminDonorController'
  );

const router =
  express.Router();

// ============================================================
// ADMIN SECURITY
//
// Every route below requires:
//
// 1. Valid Supabase session
// 2. public.users.role === 'admin'
// ============================================================

router.use(
  requireAuth
);

router.use(
  requireAdmin
);

// ============================================================
// SUMMARY
//
// IMPORTANT:
// Keep this route BEFORE "/:id"
// ============================================================

router.get(
  '/summary',
  getDonorApplicationSummary
);

// ============================================================
// LIST
//
// GET /api/admin/donor-applications
//
// Optional:
// ?status=pending
// ?status=approved
// ?status=rejected
// ?status=withdrawn
// ============================================================

router.get(
  '/',
  getDonorApplications
);

// ============================================================
// DETAIL
//
// GET /api/admin/donor-applications/:id
// ============================================================

router.get(
  '/:id',
  getDonorApplicationById
);

// ============================================================
// APPROVE
//
// POST /api/admin/donor-applications/:id/approve
// ============================================================

router.post(
  '/:id/approve',

  activityLog({
    action:
      'APPROVE_DONOR_APPLICATION',

    module:
      'Donor Applications',

    successDescription:
      'Administrator approved a donor application.',

    failureDescription:
      'Donor application approval attempt failed.',

    entityType:
      'donor_application'
  }),

  approveDonorApplication
);

// ============================================================
// REJECT
//
// POST /api/admin/donor-applications/:id/reject
// ============================================================

router.post(
  '/:id/reject',

  activityLog({
    action:
      'REJECT_DONOR_APPLICATION',

    module:
      'Donor Applications',

    successDescription:
      'Administrator rejected a donor application.',

    failureDescription:
      'Donor application rejection attempt failed.',

    entityType:
      'donor_application'
  }),

  rejectDonorApplication
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;