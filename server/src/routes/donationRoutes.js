const express =
  require('express');

const {
  getMyDonations,
} =
  require(
    '../controllers/donationController'
  );

const {
  requireAuth,
} =
  require(
    '../middleware/authMiddleware'
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
// MY DONATION HISTORY
//
// GET /api/donations/me
// ============================================================

router.get(
  '/me',
  getMyDonations
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;
