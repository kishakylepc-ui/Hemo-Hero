const express =
  require('express');

const {
  getAdminDonationSummary,
  getAdminDonations,
  getAdminDonationById,
  approveAdminDonation,
  rejectAdminDonation,
} =
  require(
    '../controllers/donationController'
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
// DONATION SUMMARY
//
// GET /api/admin/donations/summary
//
// Keep BEFORE /:id
// ============================================================

router.get(
  '/summary',
  getAdminDonationSummary
);

// ============================================================
// DONATION LIST (every recorded transaction)
//
// GET /api/admin/donations
//
// ?page=1
// &limit=20
// &status=all|completed|needs_review|rejected
// &search=text
// ============================================================

router.get(
  '/',
  getAdminDonations
);

// ============================================================
// MARK A FLAGGED DONATION VALID
//
// PATCH /api/admin/donations/:id/approve
//
// Only records that need review (failed an automatic check or
// were disputed by the donor). Everything else is recorded
// automatically, so admins never approve every donation.
//
// LOG:
// ADMIN_APPROVE_DONATION
// ============================================================

router.patch(
  '/:id/approve',

  activityLog({
    action:
      'ADMIN_APPROVE_DONATION',

    module:
      'Donations',

    successDescription:
      'Administrator marked a flagged donation record as valid.',

    failureDescription:
      'Administrator attempt to mark a donation record valid failed.',

    entityType:
      'blood_donation',
  }),

  approveAdminDonation
);

// ============================================================
// REJECT DONATION RECORD
//
// PATCH /api/admin/donations/:id/reject
//
// LOG:
// ADMIN_REJECT_DONATION
//
// The admin note (reason) is never logged.
// ============================================================

router.patch(
  '/:id/reject',

  activityLog({
    action:
      'ADMIN_REJECT_DONATION',

    module:
      'Donations',

    successDescription:
      'Administrator rejected a blood donation record.',

    failureDescription:
      'Administrator attempt to reject a blood donation failed.',

    entityType:
      'blood_donation',
  }),

  rejectAdminDonation
);

// ============================================================
// DONATION DETAILS
//
// GET /api/admin/donations/:id
//
// Keep LAST so "summary" resolves through its own route first.
// ============================================================

router.get(
  '/:id',
  getAdminDonationById
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;
