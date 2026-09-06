const express =
  require('express');

const {
  getNearbyBloodRequests,
} =
  require('../controllers/nearbyBloodRequestController');

const {
  requireAuth,
} =
  require('../middleware/authMiddleware');

const router =
  express.Router();

// ============================================================
// ALL ROUTES REQUIRE LOGIN
// ============================================================

router.use(
  requireAuth
);

// ============================================================
// GET NEARBY BLOOD REQUESTS
//
// Mounted at:
//
// /api/requests/nearby
// ============================================================

router.get(
  '/',
  getNearbyBloodRequests
);

module.exports =
  router;