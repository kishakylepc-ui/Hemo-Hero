const {
  supabaseAdmin
} = require('../config/supabase');

const {
  createNotification
} = require('../services/notificationService');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  getScheduleLimit
} = require(
  '../services/requestExpiryService'
);

// ============================================================
// HELPERS
// ============================================================

// "Wed, Oct 8, 2:30 PM" in Philippine time.
function formatManilaDateTime(
  ms
) {
  return new Date(ms)
    .toLocaleString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      }
    );
}

// ISO time of the latest allowed meeting, or null.
function getScheduleLimitIso(
  request
) {
  const limit =
    getScheduleLimit(
      request
    );

  return Number.isFinite(limit)
    ? new Date(limit).toISOString()
    : null;
}

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.authUser?.id ||
    req.dbUser?.id ||
    null
  );
}

function getRequestId(req) {
  return String(
    req.params.id ||
    ''
  ).trim();
}

function getResponseId(req) {
  return String(
    req.params.responseId ||
    ''
  ).trim();
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
// NOTIFICATION HELPERS
// ============================================================

function getOtherParticipantId(
  context,
  currentUserId
) {
  if (
    currentUserId ===
    context.requester_user_id
  ) {
    return context.donor_user_id;
  }

  if (
    currentUserId ===
    context.donor_user_id
  ) {
    return context.requester_user_id;
  }

  return null;
}

function getParticipantRole(
  context,
  userId
) {
  if (
    userId ===
    context.requester_user_id
  ) {
    return 'requester';
  }

  if (
    userId ===
    context.donor_user_id
  ) {
    return 'donor';
  }

  return null;
}

function getParticipantName(
  context,
  userId
) {
  if (
    userId ===
    context.requester_user_id
  ) {
    return (
      context.requester
        ?.full_name ||
      'Requester'
    );
  }

  if (
    userId ===
    context.donor_user_id
  ) {
    return (
      context.donor
        ?.full_name ||
      'Donor'
    );
  }

  return 'Hemo-Hero User';
}

function getMessagePreview(
  message
) {
  const cleaned =
    String(
      message ||
      ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  if (
    cleaned.length <=
    100
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    97
  )}...`;
}

// ============================================================
// SAFE PROFILE
// ============================================================

function buildSafeProfile(user) {
  if (!user) {
    return null;
  }

  const fullName =
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim() ||
    'Hemo-Hero User';

  return {
    id:
      user.id,

    first_name:
      user.first_name ??
      null,

    middle_name:
      user.middle_name ??
      null,

    last_name:
      user.last_name ??
      null,

    suffix:
      user.suffix ??
      null,

    full_name:
      fullName,

    city:
      user.city ??
      null,

    province:
      user.province ??
      null,

    // Shown as the avatar in chats.
    profile_photo_url:
      user.profile_photo_url ??
      null
  };
}

// ============================================================
// GET COORDINATION CONTEXT
//
// Only:
// - the blood request owner
// - the accepted donor
//
// can access this coordination session.
// ============================================================

async function getCoordinationContext(
  requestId,
  responseId,
  viewerId
) {
  // ----------------------------------------------------------
  // REQUEST
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
      .select(`
        id,
        requester_id,
        blood_type,
        units_needed,
        facility_name,
        facility_type,
        facility_address,
        facility_latitude,
        facility_longitude,
        urgency,
        needed_date,
        needed_time,
        message,
        status,
        created_at
      `)
      .eq(
        'id',
        requestId
      )
      .maybeSingle();

  if (requestError) {
    console.error(
      'COORDINATION REQUEST LOOKUP ERROR:',
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
  // RESPONSE
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
      .select('*')
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
      'COORDINATION RESPONSE LOOKUP ERROR:',
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
  // MUST BE ACCEPTED (or released after a no-show, which stays
  // readable so both people can still talk it through)
  // ----------------------------------------------------------

  if (
    donorResponse.status !==
      'accepted' &&
    donorResponse.status !==
      'no_show'
  ) {
    return {
      error:
        'Coordination is only available for accepted donors.',

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

  // ----------------------------------------------------------
  // PROFILES
  // ----------------------------------------------------------

  const userIds =
    [
      bloodRequest.requester_id,
      donorResponse.donor_id
    ];

  const {
    data:
      users,
    error:
      usersError
  } =
    await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        city,
        province,
        profile_photo_url
      `)
      .in(
        'id',
        userIds
      );

  if (usersError) {
    console.error(
      'COORDINATION USERS ERROR:',
      usersError
    );

    throw new Error(
      'Unable to load coordination participants.'
    );
  }

  const requesterUser =
    users?.find(
      user =>
        user.id ===
        bloodRequest.requester_id
    ) ||
    null;

  const donorUser =
    users?.find(
      user =>
        user.id ===
        donorResponse.donor_id
    ) ||
    null;

  // ----------------------------------------------------------
  // DONOR VERIFICATION
  // ----------------------------------------------------------

  const {
    data:
      donorApplication,
    error:
      donorApplicationError
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select(`
        user_id,
        blood_type,
        status,
        availability_status,
        travel_radius_km
      `)
      .eq(
        'user_id',
        donorResponse.donor_id
      )
      .maybeSingle();

  if (
    donorApplicationError
  ) {
    console.error(
      'COORDINATION DONOR APPLICATION ERROR:',
      donorApplicationError
    );
  }

  // ----------------------------------------------------------
  // SAFE REQUEST
  // ----------------------------------------------------------

  const {
    requester_id,
    ...safeRequest
  } =
    bloodRequest;

  return {
    request:
      safeRequest,

    response:
      donorResponse,

    requester_user_id:
      bloodRequest.requester_id,

    donor_user_id:
      donorResponse.donor_id,

    requester: {
      ...buildSafeProfile(
        requesterUser
      ),

      role:
        'requester'
    },

    donor: {
      ...buildSafeProfile(
        donorUser
      ),

      role:
        'donor',

      blood_type:
        donorApplication
          ?.blood_type ||
        null,

      verified:
        donorApplication
          ?.status ===
        'approved',

      availability_status:
        donorApplication
          ?.availability_status ||
        null,

      travel_radius_km:
        donorApplication
          ?.travel_radius_km ??
        null
    },

    viewer_role:
      isRequester
        ? 'requester'
        : 'donor'
  };
}

// ============================================================
// GET
// /api/requests/:id/responses/:responseId/coordination
// ============================================================

async function getCoordination(
  req,
  res
) {
  try {
    const viewerId =
      getAuthenticatedUserId(
        req
      );

    if (!viewerId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(
        req
      );

    const responseId =
      getResponseId(
        req
      );

    if (
      !requestId ||
      !responseId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID and response ID are required.'
        });
    }

    const context =
      await getCoordinationContext(
        requestId,
        responseId,
        viewerId
      );

    if (
      context.error
    ) {
      return res
        .status(
          context.status ||
          400
        )
        .json({
          error:
            context.error
        });
    }

    // --------------------------------------------------------
    // SCHEDULE
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
        .select('*')
        .eq(
          'response_id',
          responseId
        )
        .maybeSingle();

    if (
      scheduleError
    ) {
      console.error(
        'GET COORDINATION SCHEDULE ERROR:',
        scheduleError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donation schedule.'
        });
    }

    return res
      .status(200)
      .json({
        coordination: {
          request:
            context.request,

          response:
            context.response,

          requester:
            context.requester,

          donor:
            context.donor,

          viewer_role:
            context.viewer_role,

          schedule:
            schedule ||
            null,

          // Latest meeting time the schedule may use.
          schedule_limit:
            getScheduleLimitIso(
              context.request
            )
        }
      });
  } catch (error) {
    console.error(
      'GET COORDINATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error'
      });
  }
}

// ============================================================
// GET MESSAGES
// /api/requests/:id/responses/:responseId/messages
// ============================================================

async function getCoordinationMessages(
  req,
  res
) {
  try {
    const viewerId =
      getAuthenticatedUserId(
        req
      );

    if (!viewerId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(
        req
      );

    const responseId =
      getResponseId(
        req
      );

    const context =
      await getCoordinationContext(
        requestId,
        responseId,
        viewerId
      );

    if (
      context.error
    ) {
      return res
        .status(
          context.status ||
          400
        )
        .json({
          error:
            context.error
        });
    }

    const {
      data:
        messages,
      error:
        messagesError
    } =
      await supabaseAdmin
        .from(
          'blood_request_coordination_messages'
        )
        .select('*')
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'response_id',
          responseId
        )
        .order(
          'created_at',
          {
            ascending:
              true
          }
        );

    if (
      messagesError
    ) {
      console.error(
        'GET COORDINATION MESSAGES ERROR:',
        messagesError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load messages.'
        });
    }

    const profiles =
      new Map();

    profiles.set(
      context.requester.id,
      context.requester
    );

    profiles.set(
      context.donor.id,
      context.donor
    );

    const safeMessages =
      (
        messages ||
        []
      ).map(
        message => ({
          ...message,

          sender:
            profiles.get(
              message.sender_id
            ) ||
            null,

          is_mine:
            message.sender_id ===
            viewerId
        })
      );

    return res
      .status(200)
      .json({
        count:
          safeMessages.length,

        messages:
          safeMessages
      });
  } catch (error) {
    console.error(
      'GET COORDINATION MESSAGES ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error'
      });
  }
}

// ============================================================
// POST MESSAGE
// /api/requests/:id/responses/:responseId/messages
// ============================================================

async function sendCoordinationMessage(
  req,
  res
) {
  try {
    const senderId =
      getAuthenticatedUserId(
        req
      );

    if (!senderId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(
        req
      );

    const responseId =
      getResponseId(
        req
      );

    const message =
      cleanText(
        req.body?.message
      );

    if (!message) {
      return res
        .status(400)
        .json({
          error:
            'Message is required.'
        });
    }

    if (
      message.length >
      1000
    ) {
      return res
        .status(400)
        .json({
          error:
            'Message must not exceed 1000 characters.'
        });
    }

    const context =
      await getCoordinationContext(
        requestId,
        responseId,
        senderId
      );

    if (
      context.error
    ) {
      return res
        .status(
          context.status ||
          400
        )
        .json({
          error:
            context.error
        });
    }

    // --------------------------------------------------------
    // COMPLETED/CANCELLED REQUEST = READ ONLY
    // --------------------------------------------------------

    if (
      context.request.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Messages can no longer be sent because this blood request is closed.'
        });
    }

    const {
      data:
        createdMessage,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'blood_request_coordination_messages'
        )
        .insert({
          request_id:
            requestId,

          response_id:
            responseId,

          sender_id:
            senderId,

          message
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        'SEND COORDINATION MESSAGE ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to send message.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Store the actual created coordination message ID.
    // The message text itself is NOT copied into the audit log.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'coordination_message',
      createdMessage.id
    );

    const sender =
      senderId ===
      context.requester_user_id
        ? context.requester
        : context.donor;

    // ========================================================
    // NOTIFY OTHER PARTICIPANT
    // ========================================================

    const recipientId =
      getOtherParticipantId(
        context,
        senderId
      );

    if (
      recipientId
    ) {
      const senderName =
        getParticipantName(
          context,
          senderId
        );

      const senderRole =
        getParticipantRole(
          context,
          senderId
        );

      const recipientRole =
        getParticipantRole(
          context,
          recipientId
        );

      const preview =
        getMessagePreview(
          message
        );

      // Every message alerts the other person (in-app and
      // push), shown like a chat app: sender as the title, the
      // message underneath.
      await createNotification({
        userId:
          recipientId,

        type:
          'coordination_message',

        title:
          senderName,

        message:
          preview,

        data: {
          request_id:
            requestId,

          response_id:
            responseId,

          message_id:
            createdMessage.id,

          sender_id:
            senderId,

          sender_role:
            senderRole,

          recipient_role:
            recipientRole,

          blood_type:
            context.request
              .blood_type,

          facility_name:
            context.request
              .facility_name
        }
      });
    }

    return res
      .status(201)
      .json({
        message:
          'Message sent successfully.',

        data: {
          ...createdMessage,

          sender,

          is_mine:
            true
        }
      });
  } catch (error) {
    console.error(
      'SEND COORDINATION MESSAGE ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error'
      });
  }
}

// ============================================================
// PUT SCHEDULE
// /api/requests/:id/responses/:responseId/schedule
// ============================================================

async function setCoordinationSchedule(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(
        req
      );

    const responseId =
      getResponseId(
        req
      );

    const scheduledAtText =
      cleanText(
        req.body
          ?.scheduled_at
      );

    const note =
      cleanText(
        req.body?.note
      );

    if (
      !scheduledAtText
    ) {
      return res
        .status(400)
        .json({
          error:
            'Donation schedule is required.'
        });
    }

    const scheduledAt =
      new Date(
        scheduledAtText
      );

    if (
      Number.isNaN(
        scheduledAt.getTime()
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid donation schedule.'
        });
    }

    if (
      scheduledAt.getTime() <=
      Date.now()
    ) {
      return res
        .status(400)
        .json({
          error:
            'Donation schedule must be in the future.'
        });
    }

    if (
      note &&
      note.length >
      500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Schedule note must not exceed 500 characters.'
        });
    }

    const context =
      await getCoordinationContext(
        requestId,
        responseId,
        userId
      );

    if (
      context.error
    ) {
      return res
        .status(
          context.status ||
          400
        )
        .json({
          error:
            context.error
        });
    }

    if (
      context.request.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'The donation schedule cannot be changed because this blood request is closed.'
        });
    }

    if (
      context.response.status ===
      'no_show'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor was marked as a no-show, so the meeting time can’t be changed.'
        });
    }

    // Meet no later than the request's time: the needed date and
    // time, or when an urgent request closes.
    const scheduleLimit =
      getScheduleLimit(
        context.request
      );

    const isUrgent =
      context.request.urgency ===
      'urgent';

    const limitText =
      formatManilaDateTime(
        scheduleLimit
      );

    if (
      Date.now() >=
      scheduleLimit
    ) {
      return res
        .status(409)
        .json({
          error:
            isUrgent
              ? 'This urgent request is closing, so a meeting time can no longer be set.'
              : `This request's time (${limitText}) has passed, so a meeting time can no longer be set.`
        });
    }

    if (
      scheduledAt.getTime() >
      scheduleLimit
    ) {
      return res
        .status(400)
        .json({
          error:
            isUrgent
              ? `This urgent request closes on ${limitText}. Pick a time before then.`
              : context.request.needed_date
                ? `The blood is needed by ${limitText}. Pick a time on or before then.`
                : `This request closes on ${limitText}. Pick a time before then.`
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        existingSchedule,
      error:
        existingScheduleError
    } =
      await supabaseAdmin
        .from(
          'blood_request_coordination_schedules'
        )
        .select(
          'id'
        )
        .eq(
          'response_id',
          responseId
        )
        .maybeSingle();

    if (
      existingScheduleError
    ) {
      console.error(
        'CHECK COORDINATION SCHEDULE ERROR:',
        existingScheduleError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to check donation schedule.'
        });
    }

    // --------------------------------------------------------
    // EXISTING ACTIVITY ENTITY
    //
    // If this is an update, attach the existing schedule ID
    // before saving so a failed update can still identify the
    // schedule that was targeted.
    // --------------------------------------------------------

    if (
      existingSchedule?.id
    ) {
      setActivityEntity(
        res,
        'coordination_schedule',
        existingSchedule.id
      );
    }

    let schedule;
    let scheduleError;

    if (
      existingSchedule
    ) {
      const result =
        await supabaseAdmin
          .from(
            'blood_request_coordination_schedules'
          )
          .update({
            scheduled_at:
              scheduledAt.toISOString(),

            note:
              note ||
              null,

            updated_by:
              userId,

            updated_at:
              now
          })
          .eq(
            'id',
            existingSchedule.id
          )
          .select()
          .single();

      schedule =
        result.data;

      scheduleError =
        result.error;
    } else {
      const result =
        await supabaseAdmin
          .from(
            'blood_request_coordination_schedules'
          )
          .insert({
            request_id:
              requestId,

            response_id:
              responseId,

            scheduled_at:
              scheduledAt.toISOString(),

            note:
              note ||
              null,

            created_by:
              userId,

            updated_by:
              userId
          })
          .select()
          .single();

      schedule =
        result.data;

      scheduleError =
        result.error;
    }

    if (
      scheduleError
    ) {
      console.error(
        'SAVE COORDINATION SCHEDULE ERROR:',
        scheduleError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to save donation schedule.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Store the actual created/updated schedule UUID.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'coordination_schedule',
      schedule.id
    );

    // ========================================================
    // NOTIFY OTHER PARTICIPANT ABOUT SCHEDULE
    // ========================================================

    const recipientId =
      getOtherParticipantId(
        context,
        userId
      );

    if (
      recipientId
    ) {
      const senderName =
        getParticipantName(
          context,
          userId
        );

      const senderRole =
        getParticipantRole(
          context,
          userId
        );

      const recipientRole =
        getParticipantRole(
          context,
          recipientId
        );

      await createNotification({
        userId:
          recipientId,

        type:
          'coordination_schedule',

        title:
          existingSchedule
            ? 'Donation Schedule Updated'
            : 'Donation Schedule Set',

        message:
          existingSchedule
            ? `${senderName} updated the donation schedule. Open the coordination chat to review the latest details.`
            : `${senderName} set a donation schedule. Open the coordination chat to review the details.`,

        data: {
          request_id:
            requestId,

          response_id:
            responseId,

          schedule_id:
            schedule.id,

          scheduled_at:
            schedule.scheduled_at,

          note:
            schedule.note ||
            null,

          updated_by:
            userId,

          sender_role:
            senderRole,

          recipient_role:
            recipientRole,

          blood_type:
            context.request
              .blood_type,

          facility_name:
            context.request
              .facility_name
        }
      });
    }

    return res
      .status(200)
      .json({
        message:
          existingSchedule
            ? 'Donation schedule updated successfully.'
            : 'Donation schedule created successfully.',

        schedule
      });
  } catch (error) {
    console.error(
      'SET COORDINATION SCHEDULE ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error'
      });
  }
}

// ============================================================
// ACCEPTED DONATION CONVERSATIONS
// GET /api/requests/coordination/inbox
//
// Uses existing tables and explicit safe fields.
// No client-supplied user ID.
// ============================================================

const INBOX_RESPONSE_FIELDS =
  'id,request_id,donor_id,status,created_at,updated_at';

const INBOX_REQUEST_FIELDS =
  'id,requester_id,blood_type,units_needed,facility_name,status,created_at';

const INBOX_PERSON_FIELDS =
  'id,first_name,middle_name,last_name,suffix,city,province,profile_photo_url';

const INBOX_SCHEDULE_FIELDS =
  'id,request_id,response_id,scheduled_at,note,created_by,updated_by,created_at,updated_at';

const INBOX_DONATION_FIELDS =
  'id,response_id,status,units_donated,donated_at,created_at';

// Notifications that belong to one conversation (unread badge).
const COORDINATION_NOTIFICATION_TYPES = [
  'coordination_message',
  'coordination_schedule',
  'coordination_trip_started',
  'coordination_trip_near',
  'coordination_trip_arrived'
];

const INBOX_TRIP_FIELDS =
  'response_id,status,distance_m,eta_seconds,started_at,location_updated_at,arrived_at';

// Newest record per conversation, preferring one that was not
// rejected (a rejected record can be confirmed again).
function pickInboxDonation(
  rows
) {
  const sorted =
    [...rows].sort(
      (
        a,
        b
      ) =>
        inboxTimestamp(
          b.created_at
        ) -
        inboxTimestamp(
          a.created_at
        )
    );

  return (
    sorted.find(
      row =>
        row.status !==
        'rejected'
    ) ||
    sorted[0] ||
    null
  );
}

// Live trip summary for an open conversation.
function buildInboxTrip(
  row,
  response,
  request
) {
  if (
    !row ||
    response.status !==
      'accepted' ||
    request.status !==
      'active'
  ) {
    return null;
  }

  return {
    status:
      row.status,

    distance_m:
      row.distance_m,

    eta_seconds:
      row.eta_seconds,

    location_updated_at:
      row.location_updated_at ||
      row.started_at,

    arrived_at:
      row.arrived_at
  };
}

// ============================================================
// READ INBOX ROWS
// ============================================================

async function readInboxRows(
  makeQuery
) {
  const rows = [];

  let offset =
    0;

  while (true) {
    const {
      data,
      error
    } =
      await makeQuery()
        .range(
          offset,
          offset + 199
        );

    if (error) {
      throw error;
    }

    if (
      !data?.length
    ) {
      return rows;
    }

    rows.push(
      ...data
    );

    offset +=
      data.length;
  }
}

// ============================================================
// READ INBOX ROWS BY IDS
// ============================================================

async function readInboxRowsByIds(
  ids,
  makeQuery
) {
  const uniqueIds = [
    ...new Set(
      ids.filter(Boolean)
    )
  ];

  const rows = [];

  for (
    let start = 0;
    start <
    uniqueIds.length;
    start += 100
  ) {
    const batch =
      uniqueIds.slice(
        start,
        start + 100
      );

    rows.push(
      ...await readInboxRows(
        () =>
          makeQuery(
            batch
          )
      )
    );
  }

  return rows;
}

// ============================================================
// MAP INBOX WITH LIMITED CONCURRENCY
// ============================================================

async function mapInboxWithConcurrency(
  items,
  mapItem
) {
  const results =
    new Array(
      items.length
    );

  let next =
    0;

  await Promise.all(
    Array.from({
      length:
        Math.min(
          6,
          items.length
        )
    }).map(
      async () => {
        while (
          next <
          items.length
        ) {
          const index =
            next++;

          results[
            index
          ] =
            await mapItem(
              items[
                index
              ]
            );
        }
      }
    )
  );

  return results;
}

// ============================================================
// INBOX TIMESTAMP
// ============================================================

function inboxTimestamp(
  value
) {
  const timestamp =
    Date.parse(
      value ||
      ''
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

// ============================================================
// GET COORDINATION INBOX
// ============================================================

async function getCoordinationInbox(
  req,
  res
) {
  const viewerId =
    getAuthenticatedUserId(
      req
    );

  if (!viewerId) {
    return res
      .status(401)
      .json({
        error:
          'Unauthorized'
      });
  }

  try {
    // --------------------------------------------------------
    // SCOPE ENTRY QUERIES TO AUTHENTICATED USER
    // --------------------------------------------------------

    const [
      ownedRequests,
      donorResponses
    ] =
      await Promise.all([
        readInboxRows(
          () =>
            supabaseAdmin
              .from(
                'blood_requests'
              )
              .select(
                'id'
              )
              .eq(
                'requester_id',
                viewerId
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        ),

        readInboxRows(
          () =>
            supabaseAdmin
              .from(
                'blood_request_responses'
              )
              .select(
                INBOX_RESPONSE_FIELDS
              )
              .eq(
                'donor_id',
                viewerId
              )
              .in(
                'status',
                [
                  'accepted',
                  'no_show'
                ]
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        )
      ]);

    // --------------------------------------------------------
    // REQUESTER RESPONSES
    // --------------------------------------------------------

    const requesterResponses =
      await readInboxRowsByIds(
        ownedRequests.map(
          row =>
            row.id
        ),

        ids =>
          supabaseAdmin
            .from(
              'blood_request_responses'
            )
            .select(
              INBOX_RESPONSE_FIELDS
            )
            .in(
              'request_id',
              ids
            )
            .in(
              'status',
              [
                'accepted',
                'no_show'
              ]
            )
            .order(
              'id',
              {
                ascending:
                  true
              }
            )
      );

    // --------------------------------------------------------
    // UNIQUE RESPONSES
    // --------------------------------------------------------

    const responses = [
      ...new Map(
        [
          ...donorResponses,
          ...requesterResponses
        ].map(
          response => [
            response.id,
            response
          ]
        )
      ).values()
    ];

    if (
      !responses.length
    ) {
      return res
        .status(200)
        .json({
          count:
            0,

          conversations:
            []
        });
    }

    // --------------------------------------------------------
    // REQUESTS
    // --------------------------------------------------------

    const requests =
      await readInboxRowsByIds(
        responses.map(
          row =>
            row.request_id
        ),

        ids =>
          supabaseAdmin
            .from(
              'blood_requests'
            )
            .select(
              INBOX_REQUEST_FIELDS
            )
            .in(
              'id',
              ids
            )
            .order(
              'id',
              {
                ascending:
                  true
              }
            )
      );

    const requestMap =
      new Map(
        requests.map(
          row => [
            row.id,
            row
          ]
        )
      );

    // --------------------------------------------------------
    // RECHECK MEMBERSHIP
    // --------------------------------------------------------

    const visibleResponses =
      responses.filter(
        response => {
          const request =
            requestMap.get(
              response.request_id
            );

          return (
            request &&
            (
              response.status ===
                'accepted' ||
              response.status ===
                'no_show'
            ) &&
            (
              request.requester_id ===
                viewerId ||
              response.donor_id ===
                viewerId
            )
          );
        }
      );

    if (
      !visibleResponses.length
    ) {
      return res
        .status(200)
        .json({
          count:
            0,

          conversations:
            []
        });
    }

    // --------------------------------------------------------
    // PEOPLE
    // --------------------------------------------------------

    const personIds =
      visibleResponses.map(
        response => {
          const request =
            requestMap.get(
              response.request_id
            );

          return (
            request.requester_id ===
            viewerId
              ? response.donor_id
              : request.requester_id
          );
        }
      );

    const donorIds =
      visibleResponses
        .filter(
          response =>
            requestMap.get(
              response.request_id
            ).requester_id ===
            viewerId
        )
        .map(
          row =>
            row.donor_id
        );

    // --------------------------------------------------------
    // PEOPLE / APPLICATIONS / SCHEDULES
    // --------------------------------------------------------

    const [
      people,
      applications,
      schedules,
      donations,
      unreadNotifications,
      trips
    ] =
      await Promise.all([
        readInboxRowsByIds(
          personIds,

          ids =>
            supabaseAdmin
              .from(
                'users'
              )
              .select(
                INBOX_PERSON_FIELDS
              )
              .in(
                'id',
                ids
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        ),

        readInboxRowsByIds(
          donorIds,

          ids =>
            supabaseAdmin
              .from(
                'donor_applications'
              )
              .select(
                'user_id,status,blood_type'
              )
              .in(
                'user_id',
                ids
              )
              .order(
                'user_id',
                {
                  ascending:
                    true
                }
              )
        ),

        readInboxRowsByIds(
          visibleResponses.map(
            row =>
              row.id
          ),

          ids =>
            supabaseAdmin
              .from(
                'blood_request_coordination_schedules'
              )
              .select(
                INBOX_SCHEDULE_FIELDS
              )
              .in(
                'response_id',
                ids
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        ),

        readInboxRowsByIds(
          visibleResponses.map(
            row =>
              row.id
          ),

          ids =>
            supabaseAdmin
              .from(
                'blood_donations'
              )
              .select(
                INBOX_DONATION_FIELDS
              )
              .in(
                'response_id',
                ids
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        ),

        // Only the viewer's own unread conversation alerts.
        readInboxRows(
          () =>
            supabaseAdmin
              .from(
                'notifications'
              )
              .select(
                'id,data'
              )
              .eq(
                'user_id',
                viewerId
              )
              .eq(
                'is_read',
                false
              )
              .in(
                'type',
                COORDINATION_NOTIFICATION_TYPES
              )
              .order(
                'id',
                {
                  ascending:
                    true
                }
              )
        ),

        // Live "on the way" trips (optional detail).
        readInboxRowsByIds(
          visibleResponses.map(
            row =>
              row.id
          ),

          ids =>
            supabaseAdmin
              .from(
                'blood_request_trips'
              )
              .select(
                INBOX_TRIP_FIELDS
              )
              .in(
                'response_id',
                ids
              )
              .neq(
                'status',
                'ended'
              )
              .order(
                'response_id',
                {
                  ascending:
                    true
                }
              )
        ).catch(tripError => {
          console.error(
            'COORDINATION INBOX TRIPS ERROR:',
            tripError
          );

          return [];
        })
      ]);

    const tripMap =
      new Map(
        trips.map(
          row => [
            row.response_id,
            row
          ]
        )
      );

    // Donation record per conversation, and who has rated it.
    const donationsByResponse =
      new Map();

    for (const row of donations) {
      const list =
        donationsByResponse.get(
          row.response_id
        ) ||
        [];

      list.push(row);

      donationsByResponse.set(
        row.response_id,
        list
      );
    }

    const inboxDonations =
      new Map();

    for (const [
      id,
      rows
    ] of donationsByResponse) {
      inboxDonations.set(
        id,
        pickInboxDonation(
          rows
        )
      );
    }

    const feedbackRows =
      await readInboxRowsByIds(
        [
          ...inboxDonations.values()
        ]
          .filter(Boolean)
          .map(
            row =>
              row.id
          ),

        ids =>
          supabaseAdmin
            .from(
              'donation_feedback'
            )
            .select(
              'id,donation_id,from_role,rating'
            )
            .in(
              'donation_id',
              ids
            )
            .order(
              'id',
              {
                ascending:
                  true
              }
            )
      );

    function buildInboxDonation(
      donation,
      viewerRole
    ) {
      if (!donation) {
        return null;
      }

      const ratings =
        feedbackRows.filter(
          row =>
            row.donation_id ===
            donation.id
        );

      const ratingFrom =
        role =>
          ratings.find(
            row =>
              row.from_role ===
              role
          )
            ?.rating ||
          null;

      return {
        id:
          donation.id,

        status:
          donation.status,

        units_donated:
          donation.units_donated,

        donated_at:
          donation.donated_at,

        my_rating:
          ratingFrom(
            viewerRole
          ),

        their_rating:
          ratingFrom(
            viewerRole ===
            'requester'
              ? 'donor'
              : 'requester'
          )
      };
    }

    const unreadByResponse =
      new Map();

    for (const row of unreadNotifications) {
      const id =
        row.data
          ?.response_id;

      if (id) {
        unreadByResponse.set(
          id,
          (
            unreadByResponse.get(
              id
            ) ||
            0
          ) +
            1
        );
      }
    }

    const personMap =
      new Map(
        people.map(
          row => [
            row.id,
            row
          ]
        )
      );

    const applicationMap =
      new Map(
        applications.map(
          row => [
            row.user_id,
            row
          ]
        )
      );

    const scheduleMap =
      new Map(
        schedules.map(
          row => [
            row.response_id,
            row
          ]
        )
      );

    // --------------------------------------------------------
    // BUILD CONVERSATIONS
    // --------------------------------------------------------

    const conversations =
      await mapInboxWithConcurrency(
        visibleResponses,

        async response => {
          const request =
            requestMap.get(
              response.request_id
            );

          const viewerRole =
            request.requester_id ===
            viewerId
              ? 'requester'
              : 'donor';

          const otherId =
            viewerRole ===
            'requester'
              ? response.donor_id
              : request.requester_id;

          const otherRole =
            viewerRole ===
            'requester'
              ? 'donor'
              : 'requester';

          const application =
            applicationMap.get(
              otherId
            );

          const otherParticipant = {
            ...buildSafeProfile(
              personMap.get(
                otherId
              ) || {
                id:
                  otherId
              }
            ),

            role:
              otherRole,

            ...(
              otherRole ===
              'donor'
                ? {
                    verified:
                      application
                        ?.status ===
                      'approved',

                    blood_type:
                      application
                        ?.blood_type ||
                      null
                  }
                : {}
            )
          };

          const candidateSchedule =
            scheduleMap.get(
              response.id
            );

          const schedule =
            candidateSchedule
              ?.request_id ===
            request.id
              ? candidateSchedule
              : null;

          // --------------------------------------------------
          // LATEST MESSAGE
          // --------------------------------------------------

          const {
            data:
              message,
            error:
              messageError
          } =
            await supabaseAdmin
              .from(
                'blood_request_coordination_messages'
              )
              .select(
                'id,message,created_at,sender_id'
              )
              .eq(
                'request_id',
                request.id
              )
              .eq(
                'response_id',
                response.id
              )
              .order(
                'created_at',
                {
                  ascending:
                    false
                }
              )
              .order(
                'id',
                {
                  ascending:
                    false
                }
              )
              .limit(1)
              .maybeSingle();

          if (
            messageError
          ) {
            throw messageError;
          }

          const latestMessage =
            message
              ? {
                  id:
                    message.id,

                  message:
                    message.message,

                  created_at:
                    message.created_at,

                  is_mine:
                    message.sender_id ===
                    viewerId
                }
              : null;

          const activity = [
            message
              ?.created_at,

            schedule
              ?.updated_at,

            schedule
              ?.created_at,

            response
              .updated_at,

            response
              .created_at,

            request
              .created_at
          ]
            .filter(
              value =>
                inboxTimestamp(
                  value
                ) >
                0
            )
            .sort(
              (
                a,
                b
              ) =>
                inboxTimestamp(
                  b
                ) -
                inboxTimestamp(
                  a
                )
            )[0] ||
            null;

          return {
            request_id:
              request.id,

            response_id:
              response.id,

            viewer_role:
              viewerRole,

            other_participant:
              otherParticipant,

            blood_type:
              request.blood_type,

            units_needed:
              request.units_needed,

            facility_name:
              request.facility_name,

            request_status:
              request.status,

            response_status:
              response.status,

            latest_message:
              latestMessage,

            schedule,

            donation:
              buildInboxDonation(
                inboxDonations.get(
                  response.id
                ),
                viewerRole
              ),

            unread_count:
              unreadByResponse.get(
                response.id
              ) ||
              0,

            // Donor travelling to the facility (null when none).
            trip:
              buildInboxTrip(
                tripMap.get(
                  response.id
                ),
                response,
                request
              ),

            last_activity_at:
              activity
          };
        }
      );

    conversations.sort(
      (
        a,
        b
      ) =>
        inboxTimestamp(
          b.last_activity_at
        ) -
          inboxTimestamp(
            a.last_activity_at
          ) ||
        a.response_id
          .localeCompare(
            b.response_id
          )
    );

    return res
      .status(200)
      .json({
        count:
          conversations.length,

        conversations
      });
  } catch (error) {
    console.error(
      'GET COORDINATION INBOX ERROR:',
      error?.code ||
      'QUERY_FAILED'
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load donation conversations. Please try again.'
      });
  }
}

// ============================================================
// MARK CONVERSATION READ
//
// PATCH /api/requests/:id/responses/:responseId/read
//
// Marks the viewer's own unread message/schedule alerts for
// this conversation as read (clears the inbox badge). Only the
// signed-in user's notifications are ever touched.
// ============================================================

async function markCoordinationRead(
  req,
  res
) {
  const viewerId =
    getAuthenticatedUserId(
      req
    );

  if (!viewerId) {
    return res
      .status(401)
      .json({
        error:
          'Unauthorized'
      });
  }

  const responseId =
    getResponseId(
      req
    );

  if (!responseId) {
    return res
      .status(400)
      .json({
        error:
          'Conversation ID is required.'
      });
  }

  try {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .update({
          is_read:
            true,

          read_at:
            new Date()
              .toISOString()
        })
        .eq(
          'user_id',
          viewerId
        )
        .eq(
          'is_read',
          false
        )
        .in(
          'type',
          COORDINATION_NOTIFICATION_TYPES
        )
        .eq(
          'data->>response_id',
          responseId
        )
        .select(
          'id'
        );

    if (error) {
      throw error;
    }

    return res
      .status(200)
      .json({
        updated:
          (data || [])
            .length
      });
  } catch (error) {
    console.error(
      'MARK COORDINATION READ ERROR:',
      error?.code ||
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to update this conversation.'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Shared with the trip controller (participant check).
  getCoordinationContext,

  getCoordinationInbox,

  markCoordinationRead,

  getCoordination,

  getCoordinationMessages,

  sendCoordinationMessage,

  setCoordinationSchedule
};