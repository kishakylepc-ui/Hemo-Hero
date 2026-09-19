const express =
  require('express');

const {
  getMyDonorInvitations,
  acceptDonorInvitation,
  declineDonorInvitation
} =
  require(
    '../controllers/donorInvitationController'
  );

const {
  requireAuth
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  requireApprovedDonor
} =
  require(
    '../middleware/donorMiddleware'
  );

const {
  activityLog
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const router =
  express.Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(
  requireAuth
);

// ============================================================
// CURRENT DONOR INVITATIONS
//
// GET /api/donor-invitations/me
//
// This is a read-only request, so it is not added to the
// activity trail to avoid unnecessary repeated log entries.
// ============================================================

router.get(
  '/me',

  requireApprovedDonor,

  getMyDonorInvitations
);

// ============================================================
// ACCEPT INVITATION
//
// PATCH /api/donor-invitations/:invitationId/accept
//
// activityLog is placed BEFORE requireApprovedDonor so that
// unsuccessful attempts can also be captured.
// ============================================================

router.patch(
  '/:invitationId/accept',

  activityLog({
    action:
      'ACCEPT_DONOR_INVITATION',

    module:
      'Donor Invitations',

    successDescription:
      'Donor accepted a blood donation invitation.',

    failureDescription:
      'Donor invitation acceptance attempt failed.',

    entityType:
      'donor_invitation'
  }),

  requireApprovedDonor,

  acceptDonorInvitation
);

// ============================================================
// DECLINE INVITATION
//
// PATCH /api/donor-invitations/:invitationId/decline
//
// activityLog is placed BEFORE requireApprovedDonor so that
// unsuccessful attempts can also be captured.
// ============================================================

router.patch(
  '/:invitationId/decline',

  activityLog({
    action:
      'DECLINE_DONOR_INVITATION',

    module:
      'Donor Invitations',

    successDescription:
      'Donor declined a blood donation invitation.',

    failureDescription:
      'Donor invitation decline attempt failed.',

    entityType:
      'donor_invitation'
  }),

  requireApprovedDonor,

  declineDonorInvitation
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;