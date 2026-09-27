const express =
  require('express');

const {
  createBloodRequest,
  getMyBloodRequests,
  getMyActiveBloodRequest,
  getBloodRequestById,
  getDonorViewBloodRequestById,
  fulfillBloodRequest,
  cancelBloodRequest,
} =
  require(
    '../controllers/bloodRequestController'
  );

const {
  getAdminBloodRequests,
  getAdminBloodTypeDemand,
  getAdminBloodRequestById,
} =
  require(
    '../controllers/adminBloodRequestController'
  );

const {
  respondToBloodRequest,
  getMyDonorResponse,
  withdrawDonorResponse,
  getResponsesForMyBloodRequest,
  acceptDonorResponse,
  rejectDonorResponse,
} =
  require(
    '../controllers/donorResponseController'
  );

const {
  sendDonorInvitation,
} =
  require(
    '../controllers/donorInvitationController'
  );

const {
  getCoordinationInbox,
  getCoordination,
  getCoordinationMessages,
  sendCoordinationMessage,
  setCoordinationSchedule,
} =
  require(
    '../controllers/coordinationController'
  );

const {
  requireAuth,
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  requireApprovedDonor,
} =
  require(
    '../middleware/donorMiddleware'
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
// AUTHENTICATION
// ============================================================

router.use(
  requireAuth
);

// ============================================================
// COORDINATION INBOX
//
// Must stay above parameterized /:id routes.
// ============================================================

router.get(
  '/coordination/inbox',
  getCoordinationInbox
);

// ============================================================
// ADMIN BLOOD REQUESTS
//
// ADMIN ONLY
//
// GET /api/requests/admin
//
// Supports:
// - status
// - blood_type
// - urgency
// - search
// - page
// - limit
//
// Admin authorization is checked inside the controller.
//
// IMPORTANT:
// These routes MUST remain above /:id routes.
// ============================================================

router.get(
  '/admin',
  getAdminBloodRequests
);

// ============================================================
// ADMIN BLOOD TYPE DEMAND
//
// GET /api/requests/admin/demand
//
// Used by the Admin Dashboard.
// Must remain ABOVE /admin/:id.
// ============================================================

router.get(
  '/admin/demand',
  getAdminBloodTypeDemand
);

// ============================================================
// ADMIN BLOOD REQUEST DETAILS
//
// GET /api/requests/admin/:id
//
// Returns:
// - blood request
// - requester information
// - donor responses
// - donor information
// - response summary
//
// Must remain above general /:id routes.
// ============================================================

router.get(
  '/admin/:id',
  getAdminBloodRequestById
);

// ============================================================
// CREATE BLOOD REQUEST
// ============================================================

router.post(
  '/',

  activityLog({
    action:
      'CREATE_BLOOD_REQUEST',

    module:
      'Blood Requests',

    successDescription:
      'User created a blood request.',

    failureDescription:
      'Blood request creation attempt failed.',

    entityType:
      'blood_request',
  }),

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
//
// GET /api/requests/:id/donor-view
// ============================================================

router.get(
  '/:id/donor-view',
  getDonorViewBloodRequestById
);

// ============================================================
// REQUEST OWNER - INVITE DONOR
//
// POST /api/requests/:id/invitations
// ============================================================

router.post(
  '/:id/invitations',

  activityLog({
    action:
      'SEND_DONOR_INVITATION',

    module:
      'Donor Invitations',

    successDescription:
      'User invited a donor to a blood request.',

    failureDescription:
      'Donor invitation attempt failed.',

    entityType:
      'donor_invitation',
  }),

  sendDonorInvitation
);

// ============================================================
// DONOR RESPONSE
//
// POST /api/requests/:id/respond
// ============================================================

router.post(
  '/:id/respond',

  requireApprovedDonor,

  activityLog({
    action:
      'RESPOND_TO_BLOOD_REQUEST',

    module:
      'Donor Responses',

    successDescription:
      'Donor responded to a blood request.',

    failureDescription:
      'Donor response attempt failed.',

    entityType:
      'donor_response',
  }),

  respondToBloodRequest
);

// ============================================================
// CURRENT DONOR RESPONSE
//
// GET /api/requests/:id/my-response
// ============================================================

router.get(
  '/:id/my-response',
  getMyDonorResponse
);

// ============================================================
// WITHDRAW DONOR RESPONSE
//
// PATCH /api/requests/:id/response/withdraw
// ============================================================

router.patch(
  '/:id/response/withdraw',

  activityLog({
    action:
      'WITHDRAW_DONOR_RESPONSE',

    module:
      'Donor Responses',

    successDescription:
      'Donor withdrew their response to a blood request.',

    failureDescription:
      'Donor response withdrawal attempt failed.',

    entityType:
      'donor_response',
  }),

  withdrawDonorResponse
);

// ============================================================
// REQUEST OWNER - GET RESPONSES
//
// GET /api/requests/:id/responses
// ============================================================

router.get(
  '/:id/responses',
  getResponsesForMyBloodRequest
);

// ============================================================
// REQUEST OWNER - ACCEPT DONOR RESPONSE
//
// PATCH /api/requests/:id/responses/:responseId/accept
// ============================================================

router.patch(
  '/:id/responses/:responseId/accept',

  activityLog({
    action:
      'ACCEPT_DONOR_RESPONSE',

    module:
      'Donor Responses',

    successDescription:
      'Blood request owner accepted a donor response.',

    failureDescription:
      'Donor response acceptance attempt failed.',

    entityType:
      'donor_response',
  }),

  acceptDonorResponse
);

// ============================================================
// REQUEST OWNER - REJECT DONOR RESPONSE
//
// PATCH /api/requests/:id/responses/:responseId/reject
// ============================================================

router.patch(
  '/:id/responses/:responseId/reject',

  activityLog({
    action:
      'REJECT_DONOR_RESPONSE',

    module:
      'Donor Responses',

    successDescription:
      'Blood request owner rejected a donor response.',

    failureDescription:
      'Donor response rejection attempt failed.',

    entityType:
      'donor_response',
  }),

  rejectDonorResponse
);

// ============================================================
// DONATION COORDINATION
//
// Accessible only by:
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

// ============================================================
// SEND COORDINATION MESSAGE
//
// POST /api/requests/:id/responses/:responseId/messages
// ============================================================

router.post(
  '/:id/responses/:responseId/messages',

  activityLog({
    action:
      'SEND_COORDINATION_MESSAGE',

    module:
      'Coordination',

    successDescription:
      'User sent a donation coordination message.',

    failureDescription:
      'Coordination message attempt failed.',

    entityType:
      'coordination_message',
  }),

  sendCoordinationMessage
);

// ============================================================
// SET COORDINATION SCHEDULE
//
// PUT /api/requests/:id/responses/:responseId/schedule
// ============================================================

router.put(
  '/:id/responses/:responseId/schedule',

  activityLog({
    action:
      'SET_COORDINATION_SCHEDULE',

    module:
      'Coordination',

    successDescription:
      'User updated the donation coordination schedule.',

    failureDescription:
      'Coordination schedule update attempt failed.',

    entityType:
      'coordination_schedule',
  }),

  setCoordinationSchedule
);

// ============================================================
// REQUEST OWNER - FULFILL
//
// PATCH /api/requests/:id/fulfill
// ============================================================

router.patch(
  '/:id/fulfill',

  activityLog({
    action:
      'FULFILL_BLOOD_REQUEST',

    module:
      'Blood Requests',

    successDescription:
      'User marked a blood request as fulfilled.',

    failureDescription:
      'Blood request fulfillment attempt failed.',

    entityType:
      'blood_request',
  }),

  fulfillBloodRequest
);

// ============================================================
// CANCEL OWN REQUEST
//
// PATCH /api/requests/:id/cancel
// ============================================================

router.patch(
  '/:id/cancel',

  activityLog({
    action:
      'CANCEL_BLOOD_REQUEST',

    module:
      'Blood Requests',

    successDescription:
      'User cancelled a blood request.',

    failureDescription:
      'Blood request cancellation attempt failed.',

    entityType:
      'blood_request',
  }),

  cancelBloodRequest
);

// ============================================================
// OWNER DETAILS
//
// GET /api/requests/:id
//
// KEEP THIS LAST.
// ============================================================

router.get(
  '/:id',
  getBloodRequestById
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;