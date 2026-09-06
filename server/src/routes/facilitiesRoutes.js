const express =
  require('express');

const {
  getNearbyFacilities,
} =
  require(
    '../controllers/facilitiesController'
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
// GET NEARBY HOSPITALS / BLOOD CENTERS
// ============================================================

router.get(
  '/nearby',
  requireAuth,
  getNearbyFacilities
);

module.exports =
  router;