const express =
  require('express');

const {
  getAddressFromLocation,
} =
  require(
    '../controllers/geocodeController'
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
// ADDRESS FROM GPS (Complete Profile autofill)
// ============================================================

router.get(
  '/reverse',
  requireAuth,
  getAddressFromLocation
);

module.exports =
  router;
