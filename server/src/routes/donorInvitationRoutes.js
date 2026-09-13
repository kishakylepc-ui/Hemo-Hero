const express =
  require('express');

const {
  getMyDonorInvitations,

  acceptDonorInvitation,

  declineDonorInvitation
} =
  require('../controllers/donorInvitationController');

const {
  requireAuth
} =
  require('../middleware/authMiddleware');

const {
  requireApprovedDonor
} =
  require('../middleware/donorMiddleware');

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
// ============================================================

router.get(
  '/me',
  requireApprovedDonor,
  getMyDonorInvitations
);

// ============================================================
// ACCEPT INVITATION
// ============================================================

router.patch(
  '/:invitationId/accept',
  requireApprovedDonor,
  acceptDonorInvitation
);

// ============================================================
// DECLINE INVITATION
// ============================================================

router.patch(
  '/:invitationId/decline',
  requireApprovedDonor,
  declineDonorInvitation
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;