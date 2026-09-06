const express =
  require('express');

const {
  createBloodRequest,
  getMyBloodRequests,
  getMyActiveBloodRequest,
  getBloodRequestById,
  getDonorViewBloodRequestById,
  cancelBloodRequest
} =
  require('../controllers/bloodRequestController');

const {
  respondToBloodRequest,
  getMyDonorResponse,
  withdrawDonorResponse,
  getResponsesForMyBloodRequest
} =
  require('../controllers/donorResponseController');

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
// CREATE BLOOD REQUEST
// ============================================================

router.post(
  '/',
  createBloodRequest
);

// ============================================================
// CURRENT USER REQUESTS
// ============================================================

router.get(
  '/my',
  getMyBloodRequests
);

router.get(
  '/my/active',
  getMyActiveBloodRequest
);

// ============================================================
// SAFE DONOR VIEW
// ============================================================

router.get(
  '/:id/donor-view',
  getDonorViewBloodRequestById
);

// ============================================================
// DONOR RESPONSE
//
// IMPORTANT:
// Only APPROVED donor applications may respond.
// ============================================================

router.post(
  '/:id/respond',
  requireApprovedDonor,
  respondToBloodRequest
);

router.get(
  '/:id/my-response',
  getMyDonorResponse
);

router.patch(
  '/:id/response/withdraw',
  withdrawDonorResponse
);

// ============================================================
// REQUEST OWNER - RESPONSES
// ============================================================

router.get(
  '/:id/responses',
  getResponsesForMyBloodRequest
);

// ============================================================
// CANCEL OWN REQUEST
// ============================================================

router.patch(
  '/:id/cancel',
  cancelBloodRequest
);

// ============================================================
// OWNER DETAILS
//
// KEEP LAST.
// ============================================================

router.get(
  '/:id',
  getBloodRequestById
);

module.exports =
  router;