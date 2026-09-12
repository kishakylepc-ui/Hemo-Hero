const express =
  require('express');

const {
  createBloodRequest,

  getMyBloodRequests,

  getMyActiveBloodRequest,

  getBloodRequestById,

  getDonorViewBloodRequestById,

  fulfillBloodRequest,

  cancelBloodRequest
} =
  require('../controllers/bloodRequestController');

const {
  respondToBloodRequest,

  getMyDonorResponse,

  withdrawDonorResponse,

  getResponsesForMyBloodRequest,

  acceptDonorResponse,

  rejectDonorResponse
} =
  require('../controllers/donorResponseController');

const {
  getCoordinationInbox,

  getCoordination,

  getCoordinationMessages,

  sendCoordinationMessage,

  setCoordinationSchedule
} =
  require('../controllers/coordinationController');

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

// Inbox belongs before parameterized routes and after requireAuth.
router.get('/coordination/inbox', getCoordinationInbox);

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
// ============================================================

router.post(
  '/:id/respond',
  requireApprovedDonor,
  respondToBloodRequest
);

// ============================================================
// CURRENT DONOR RESPONSE
// ============================================================

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
// REQUEST OWNER - ACCEPT / REJECT
// ============================================================

router.patch(
  '/:id/responses/:responseId/accept',
  acceptDonorResponse
);

router.patch(
  '/:id/responses/:responseId/reject',
  rejectDonorResponse
);

// ============================================================
// DONATION COORDINATION
//
// Accessible ONLY by:
// - request owner
// - accepted donor
// ============================================================

router.get(
  '/:id/responses/:responseId/coordination',
  getCoordination
);

router.get(
  '/:id/responses/:responseId/messages',
  getCoordinationMessages
);

router.post(
  '/:id/responses/:responseId/messages',
  sendCoordinationMessage
);

router.put(
  '/:id/responses/:responseId/schedule',
  setCoordinationSchedule
);

// ============================================================
// REQUEST OWNER - FULFILL
// ============================================================

router.patch(
  '/:id/fulfill',
  fulfillBloodRequest
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