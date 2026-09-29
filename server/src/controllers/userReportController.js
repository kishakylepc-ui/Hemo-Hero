const {
  supabaseAdmin
} = require('../config/supabase');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  notifyAdmins
} = require(
  '../services/notificationService'
);

// ============================================================
// USER REPORT CONTROLLER
//
// Lets a participant of a donation coordination conversation
// submit FEEDBACK or a REPORT about the other participant.
//
// Security rules:
// - The reporter is always the authenticated user.
// - The reported person is ALWAYS derived from the
//   conversation (request + accepted response). The client
//   cannot choose who is being reported.
// - Only the requester or the accepted donor may submit.
// ============================================================

// ============================================================
// CONSTANTS
// ============================================================

// Must match the mobile REPORT_REASONS list and the
// user_reports_reason_check database constraint.
const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Misleading information',
  'Other'
];

const REPORT_KINDS = [
  'feedback',
  'report'
];

const MAX_DETAILS_LENGTH =
  2000;

// ============================================================
// HELPERS
// ============================================================

function getAuthenticatedUserId(req) {
  return (
    req.dbUser?.id ||
    req.authUser?.id ||
    null
  );
}

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const cleaned =
    String(value).trim();

  return cleaned || null;
}

// ============================================================
// LOAD CONVERSATION PARTICIPANTS
//
// Returns the two participants of an accepted coordination,
// or an { error, status } object.
// ============================================================

async function getConversationParticipants(
  requestId,
  responseId,
  viewerId
) {
  // ----------------------------------------------------------
  // BLOOD REQUEST
  // ----------------------------------------------------------

  const {
    data:
      bloodRequest,
    error:
      requestError
  } =
    await supabaseAdmin
      .from(
        'blood_requests'
      )
      .select(
        'id, requester_id'
      )
      .eq(
        'id',
        requestId
      )
      .maybeSingle();

  if (requestError) {
    console.error(
      'USER REPORT REQUEST LOOKUP ERROR:',
      requestError
    );

    throw new Error(
      'Unable to retrieve blood request.'
    );
  }

  if (!bloodRequest) {
    return {
      error:
        'Blood request not found.',

      status:
        404
    };
  }

  // ----------------------------------------------------------
  // DONOR RESPONSE
  // ----------------------------------------------------------

  const {
    data:
      donorResponse,
    error:
      responseError
  } =
    await supabaseAdmin
      .from(
        'blood_request_responses'
      )
      .select(
        'id, request_id, donor_id, status'
      )
      .eq(
        'id',
        responseId
      )
      .eq(
        'request_id',
        requestId
      )
      .maybeSingle();

  if (responseError) {
    console.error(
      'USER REPORT RESPONSE LOOKUP ERROR:',
      responseError
    );

    throw new Error(
      'Unable to retrieve donor response.'
    );
  }

  if (!donorResponse) {
    return {
      error:
        'Donor response not found.',

      status:
        404
    };
  }

  // ----------------------------------------------------------
  // MUST BE AN ACCEPTED COORDINATION
  // ----------------------------------------------------------

  if (
    donorResponse.status !==
    'accepted'
  ) {
    return {
      error:
        'Feedback and reports are only available for accepted donor coordinations.',

      status:
        403
    };
  }

  // ----------------------------------------------------------
  // PARTICIPANT CHECK
  // ----------------------------------------------------------

  const isRequester =
    bloodRequest.requester_id ===
    viewerId;

  const isDonor =
    donorResponse.donor_id ===
    viewerId;

  if (
    !isRequester &&
    !isDonor
  ) {
    return {
      error:
        'You do not have access to this donor coordination.',

      status:
        403
    };
  }

  return {
    requestId:
      bloodRequest.id,

    responseId:
      donorResponse.id,

    otherUserId:
      isRequester
        ? donorResponse.donor_id
        : bloodRequest.requester_id
  };
}

// ============================================================
// POST /api/requests/:id/responses/:responseId/reports
//
// Body:
// {
//   kind:    'feedback' | 'report',
//   reason?: 'Spam' | 'Harassment' | 'Misleading information' | 'Other',
//   details: string
// }
//
// feedback -> details required
// report   -> reason required, details optional
// ============================================================

async function submitConversationReport(
  req,
  res
) {
  try {
    const reporterId =
      getAuthenticatedUserId(
        req
      );

    if (!reporterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      String(
        req.params.id ||
        ''
      ).trim();

    const responseId =
      String(
        req.params.responseId ||
        ''
      ).trim();

    if (
      !requestId ||
      !responseId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request and response are required.'
        });
    }

    // --------------------------------------------------------
    // VALIDATE BODY
    // --------------------------------------------------------

    const kind =
      cleanText(
        req.body?.kind
      );

    if (
      !REPORT_KINDS.includes(
        kind
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Kind must be "feedback" or "report".'
        });
    }

    const details =
      cleanText(
        req.body?.details
      );

    if (
      details &&
      details.length >
        MAX_DETAILS_LENGTH
    ) {
      return res
        .status(400)
        .json({
          error:
            `Details must not exceed ${MAX_DETAILS_LENGTH} characters.`
        });
    }

    let reason =
      null;

    if (
      kind ===
      'report'
    ) {
      reason =
        cleanText(
          req.body?.reason
        );

      if (
        !REPORT_REASONS.includes(
          reason
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Please select a valid report reason.'
          });
      }
    }

    if (
      kind ===
        'feedback' &&
      !details
    ) {
      return res
        .status(400)
        .json({
          error:
            'Feedback is required.'
        });
    }

    // --------------------------------------------------------
    // AUTHORIZE CONVERSATION + DERIVE REPORTED USER
    // --------------------------------------------------------

    const participants =
      await getConversationParticipants(
        requestId,
        responseId,
        reporterId
      );

    if (
      participants.error
    ) {
      return res
        .status(
          participants.status ||
          400
        )
        .json({
          error:
            participants.error
        });
    }

    // --------------------------------------------------------
    // EMAIL SNAPSHOT OF REPORTED USER
    // --------------------------------------------------------

    let reportedUserEmail =
      null;

    if (
      participants.otherUserId
    ) {
      const {
        data:
          reportedUser,
        error:
          reportedUserError
      } =
        await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq(
            'id',
            participants.otherUserId
          )
          .maybeSingle();

      if (reportedUserError) {
        console.error(
          'USER REPORT REPORTED USER LOOKUP ERROR:',
          reportedUserError
        );
      }

      reportedUserEmail =
        reportedUser?.email ||
        null;
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const {
      data:
        createdReport,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .insert({
          kind,

          reporter_id:
            reporterId,

          reported_user_id:
            participants.otherUserId ||
            null,

          reporter_email:
            req.dbUser?.email ||
            null,

          reported_user_email:
            reportedUserEmail,

          request_id:
            participants.requestId,

          response_id:
            participants.responseId,

          reason,

          details
        })
        .select(
          'id, kind, reason, status, created_at'
        )
        .single();

    if (insertError) {
      // Unique index: one unresolved report per conversation.
      if (
        insertError.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            error:
              'You already have an open report for this conversation. An administrator will review it.'
          });
      }

      console.error(
        'USER REPORT INSERT ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            kind === 'report'
              ? 'Unable to submit your report. Please try again.'
              : 'Unable to submit your feedback. Please try again.'
        });
    }

    setActivityEntity(
      res,
      'user_report',
      createdReport.id
    );

    // --------------------------------------------------------
    // ADMIN NOTIFICATION
    //
    // Fire-and-forget: notifyAdmins never throws.
    // Details text is NOT copied into the notification.
    // --------------------------------------------------------

    void notifyAdmins({
      type:
        'admin_user_report',

      title:
        kind === 'report'
          ? `New report: ${reason}`
          : 'New user feedback',

      message:
        kind === 'report'
          ? 'A user reported another participant in a donation coordination.'
          : 'A user shared feedback about a donation coordination.',

      data: {
        report_id:
          createdReport.id,

        route:
          `/issues/${createdReport.id}`
      }
    });

    return res
      .status(201)
      .json({
        message:
          kind === 'report'
            ? 'Your report has been submitted.'
            : 'Thank you for your feedback.',

        report:
          createdReport
      });
  } catch (
    error
  ) {
    console.error(
      'SUBMIT CONVERSATION REPORT ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to submit. Please try again.'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  submitConversationReport
};
