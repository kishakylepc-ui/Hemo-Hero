const {
  supabaseAdmin
} = require('../config/supabase');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  createNotification,
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

// Reasons a person can give when reporting a blood request
// from its page (must match the mobile ReportRequestSheet).
const REQUEST_REPORT_REASONS = [
  'False request',
  'Asking for payment',
  'Misleading information',
  'Other'
];

// Separate people reporting one request before it is hidden
// from nearby donors pending admin review.
const REQUEST_FLAG_THRESHOLD = 3;

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

    viewerRole:
      isRequester
        ? 'requester'
        : 'donor',

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
// SHARED: USER EMAIL + NAME
// ============================================================

async function getUserBasics(
  userId
) {
  if (!userId) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from('users')
      .select(
        'id, email, first_name, last_name'
      )
      .eq(
        'id',
        userId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'USER REPORT USER LOOKUP ERROR:',
      error
    );
  }

  return data || null;
}

function displayName(
  user,
  fallback
) {
  return (
    [
      user?.first_name,
      user?.last_name
    ]
      .filter(Boolean)
      .join(' ') ||
    fallback
  );
}

// ============================================================
// POST /api/requests/:id/responses/:responseId/no-show
//
// Body: { details?: string }
//
// A participant reports that the other person didn't come at
// the agreed time. Allowed only after the scheduled time has
// passed and while no donation is recorded for this
// conversation. Saved as a 'No-show' report for admin review;
// the other person is notified so they can explain.
// ============================================================

async function submitNoShowReport(
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
      cleanText(
        req.params.id
      );

    const responseId =
      cleanText(
        req.params.responseId
      );

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
    // MEETING TIME MUST HAVE PASSED
    // --------------------------------------------------------

    const {
      data:
        schedule,
      error:
        scheduleError
    } =
      await supabaseAdmin
        .from(
          'blood_request_coordination_schedules'
        )
        .select(
          'scheduled_at'
        )
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'response_id',
          responseId
        )
        .maybeSingle();

    if (scheduleError) {
      console.error(
        'NO-SHOW SCHEDULE LOOKUP ERROR:',
        scheduleError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to check the meeting time.'
        });
    }

    if (!schedule) {
      return res
        .status(409)
        .json({
          error:
            'Set a meeting time first. A no-show can be reported after the agreed time passes.'
        });
    }

    if (
      new Date(
        schedule.scheduled_at
      ).getTime() >
      Date.now()
    ) {
      return res
        .status(409)
        .json({
          error:
            'The meeting time hasn’t passed yet.'
        });
    }

    // --------------------------------------------------------
    // NOT AFTER A RECORDED DONATION
    // --------------------------------------------------------

    const {
      data:
        donations,
      error:
        donationError
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id'
        )
        .eq(
          'response_id',
          responseId
        )
        .neq(
          'status',
          'rejected'
        )
        .limit(1);

    if (donationError) {
      console.error(
        'NO-SHOW DONATION LOOKUP ERROR:',
        donationError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to check the donation record.'
        });
    }

    if (
      donations?.length
    ) {
      return res
        .status(409)
        .json({
          error:
            'A donation is already recorded for this conversation.'
        });
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const [
      reporter,
      reported
    ] =
      await Promise.all([
        getUserBasics(
          reporterId
        ),

        getUserBasics(
          participants.otherUserId
        )
      ]);

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
          kind:
            'report',

          reporter_id:
            reporterId,

          reported_user_id:
            participants.otherUserId ||
            null,

          reporter_email:
            reporter?.email ||
            req.dbUser?.email ||
            null,

          reported_user_email:
            reported?.email ||
            null,

          request_id:
            participants.requestId,

          response_id:
            participants.responseId,

          reason:
            'No-show',

          details
        })
        .select(
          'id, kind, reason, status, created_at'
        )
        .single();

    if (insertError) {
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
        'NO-SHOW REPORT INSERT ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to submit your report. Please try again.'
        });
    }

    setActivityEntity(
      res,
      'user_report',
      createdReport.id
    );

    const reporterIsRequester =
      participants.viewerRole ===
      'requester';

    // --------------------------------------------------------
    // RELEASE THE DONOR (requester reported the donor)
    //
    // The offer becomes 'no_show': the request is back to
    // looking for donors, the chat stays readable, and no
    // donation can be recorded for this offer.
    // --------------------------------------------------------

    let released =
      false;

    if (reporterIsRequester) {
      const {
        data:
          releasedRows,
        error:
          releaseError
      } =
        await supabaseAdmin
          .from(
            'blood_request_responses'
          )
          .update({
            status:
              'no_show',

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'id',
            responseId
          )
          .eq(
            'status',
            'accepted'
          )
          .select(
            'id'
          );

      if (releaseError) {
        console.error(
          'NO-SHOW RELEASE ERROR:',
          releaseError
        );
      }

      released =
        Boolean(
          releasedRows?.length
        );
    }

    // --------------------------------------------------------
    // NOTIFY THE OTHER PERSON + ADMINS (never throw)
    // --------------------------------------------------------

    if (
      participants.otherUserId
    ) {
      void createNotification({
        userId:
          participants.otherUserId,

        type:
          'coordination_no_show',

        title:
          'Missed Donation Meeting',

        message:
          reporterIsRequester
            ? `${displayName(
                reporter,
                'The requester'
              )} reported that you didn't come at the agreed time, so your acceptance for this request was released. If this is a mistake, reply in the chat.`
            : `${displayName(
                reporter,
                'The donor'
              )} reported that you weren't there at the agreed time. If this is a mistake, reply in the chat.`,

        data: {
          request_id:
            requestId,

          response_id:
            responseId,

          report_id:
            createdReport.id,

          recipient_role:
            reporterIsRequester
              ? 'donor'
              : 'requester'
        }
      });
    }

    void notifyAdmins({
      type:
        'admin_user_report',

      title:
        'New report: No-show',

      message:
        reporterIsRequester
          ? 'A requester reported that their accepted donor didn’t show up.'
          : 'A donor reported that the requester wasn’t there at the agreed time.',

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
          'Your no-show report has been submitted.',

        // The donor's acceptance was released (requester only).
        released,

        report:
          createdReport
      });
  } catch (error) {
    console.error(
      'SUBMIT NO-SHOW REPORT ERROR:',
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
// POST /api/requests/:id/report
//
// Body: { reason, details? }
//
// Anyone except the requester can report a blood request as
// false (fake, asking for money, wrong details). After
// REQUEST_FLAG_THRESHOLD separate open reports the request is
// hidden from nearby donors until an admin reviews it.
// ============================================================

async function submitRequestReport(
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
      cleanText(
        req.params.id
      );

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const reason =
      cleanText(
        req.body?.reason
      );

    if (
      !REQUEST_REPORT_REASONS.includes(
        reason
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please select a valid reason.'
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

    // --------------------------------------------------------
    // REQUEST
    // --------------------------------------------------------

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
          'id, requester_id, status, flagged_at, removed_at'
        )
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (requestError) {
      console.error(
        'REQUEST REPORT LOOKUP ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (!bloodRequest) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      bloodRequest.requester_id ===
      reporterId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You can’t report your own request.'
        });
    }

    if (
      bloodRequest.removed_at
    ) {
      return res
        .status(409)
        .json({
          error:
            'This request was already removed by Hemo-Hero.'
        });
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const [
      reporter,
      requester
    ] =
      await Promise.all([
        getUserBasics(
          reporterId
        ),

        getUserBasics(
          bloodRequest.requester_id
        )
      ]);

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
          kind:
            'report',

          reporter_id:
            reporterId,

          reported_user_id:
            bloodRequest.requester_id,

          reporter_email:
            reporter?.email ||
            req.dbUser?.email ||
            null,

          reported_user_email:
            requester?.email ||
            null,

          request_id:
            bloodRequest.id,

          response_id:
            null,

          reason,

          details
        })
        .select(
          'id, kind, reason, status, created_at'
        )
        .single();

    if (insertError) {
      if (
        insertError.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            error:
              'You already reported this request. Hemo-Hero will review it.'
          });
      }

      console.error(
        'REQUEST REPORT INSERT ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to submit your report. Please try again.'
        });
    }

    setActivityEntity(
      res,
      'user_report',
      createdReport.id
    );

    // --------------------------------------------------------
    // AUTO-HIDE AFTER SEVERAL SEPARATE REPORTS
    // --------------------------------------------------------

    let flagged =
      Boolean(
        bloodRequest.flagged_at
      );

    if (
      !flagged &&
      bloodRequest.status ===
        'active'
    ) {
      const {
        data:
          openReports,
        error:
          countError
      } =
        await supabaseAdmin
          .from(
            'user_reports'
          )
          .select(
            'reporter_id'
          )
          .eq(
            'request_id',
            bloodRequest.id
          )
          .eq(
            'kind',
            'report'
          )
          .is(
            'response_id',
            null
          )
          .in(
            'status',
            [
              'open',
              'in_review'
            ]
          );

      if (countError) {
        console.error(
          'REQUEST REPORT COUNT ERROR:',
          countError
        );
      }

      const reporters =
        new Set(
          (openReports || [])
            .map(
              row =>
                row.reporter_id
            )
            .filter(Boolean)
        );

      if (
        reporters.size >=
        REQUEST_FLAG_THRESHOLD
      ) {
        const {
          error:
            flagError
        } =
          await supabaseAdmin
            .from(
              'blood_requests'
            )
            .update({
              flagged_at:
                new Date()
                  .toISOString()
            })
            .eq(
              'id',
              bloodRequest.id
            )
            .is(
              'flagged_at',
              null
            );

        if (flagError) {
          console.error(
            'REQUEST FLAG ERROR:',
            flagError
          );
        } else {
          flagged = true;

          void notifyAdmins({
            type:
              'admin_request_flagged',

            title:
              'Request hidden for review',

            message:
              `${reporters.size} people reported a blood request. It is hidden from nearby donors until you review it.`,

            data: {
              report_id:
                createdReport.id,

              request_id:
                bloodRequest.id,

              route:
                `/issues/${createdReport.id}`
            }
          });
        }
      }
    }

    void notifyAdmins({
      type:
        'admin_user_report',

      title:
        `New report: ${reason}`,

      message:
        'A user reported a blood request.',

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
          'Thank you. Hemo-Hero will review this request.',

        flagged,

        report:
          createdReport
      });
  } catch (error) {
    console.error(
      'SUBMIT REQUEST REPORT ERROR:',
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
  submitConversationReport,
  submitNoShowReport,
  submitRequestReport
};
