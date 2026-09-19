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
// Inbox belongs before parameterized routes.
// ============================================================

router.get(
  '/coordination/inbox',
  getCoordinationInbox
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
// ============================================================

router.get(
  '/:id/donor-view',
  getDonorViewBloodRequestById
);

// ============================================================
// REQUEST OWNER - INVITE DONOR
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
// ============================================================

router.get(
  '/:id/my-response',
  getMyDonorResponse
);

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
// REQUEST OWNER - RESPONSES
// ============================================================

router.get(
  '/:id/responses',
  getResponsesForMyBloodRequest
);

// ============================================================
// REQUEST OWNER - ACCEPT DONOR RESPONSE
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

// ============================================================
// SEND COORDINATION MESSAGE
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
// KEEP LAST.
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