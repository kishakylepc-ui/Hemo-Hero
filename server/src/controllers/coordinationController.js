const {
  supabaseAdmin
} = require('../config/supabase');

// ============================================================
// HELPERS
// ============================================================

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
      .replace(/\s+/g, ' ')
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
  // MUST BE ACCEPTED
  // ----------------------------------------------------------

  if (
    donorResponse.status !==
    'accepted'
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
        province
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
            null
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

    const sender =
      senderId ===
      context.requester.id
        ? context.requester
        : context.donor;

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
// EXPORTS
// ============================================================

module.exports = {
  getCoordination,

  getCoordinationMessages,

  sendCoordinationMessage,

  setCoordinationSchedule
};