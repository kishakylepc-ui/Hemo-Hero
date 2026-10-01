const {
  supabaseAdmin
} = require('../config/supabase');

const {
  createNotifications,
  notifyAdmins
} = require(
  '../services/notificationService'
);

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

// ============================================================
// CONSTANTS
// ============================================================

const VALID_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
];

const VALID_URGENCY = [
  'urgent',
  'needed'
];

const VALID_FACILITY_SOURCES = [
  'nearby',
  'manual'
];

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const cleaned =
    String(value).trim();

  return cleaned || null;
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

function isValidLatitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(value) {
  return (
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function combineNeededDateTime(
  date,
  time
) {
  if (
    !date ||
    !time
  ) {
    return null;
  }

  const combined =
    new Date(
      `${date}T${time}:00`
    );

  if (
    Number.isNaN(
      combined.getTime()
    )
  ) {
    return null;
  }

  return combined;
}

// ============================================================
// VALIDATE REQUEST BODY
// ============================================================

function validateBloodRequest(body) {
  const bloodType =
    cleanText(
      body.blood_type
    );

  const unitsNeeded =
    Number(
      body.units_needed
    );

  const facilitySource =
    cleanText(
      body.facility_source
    );

  const facilityId =
    cleanText(
      body.facility_id
    );

  const facilityName =
    cleanText(
      body.facility_name
    );

  const facilityType =
    cleanText(
      body.facility_type
    );

  const facilityAddress =
    cleanText(
      body.facility_address
    );

  const latitude =
    body.facility_latitude ===
      null ||
    body.facility_latitude ===
      undefined ||
    body.facility_latitude ===
      ''
      ? null
      : Number(
          body.facility_latitude
        );

  const longitude =
    body.facility_longitude ===
      null ||
    body.facility_longitude ===
      undefined ||
    body.facility_longitude ===
      ''
      ? null
      : Number(
          body.facility_longitude
        );

  const urgency =
    cleanText(
      body.urgency
    );

  const neededDate =
    cleanText(
      body.needed_date
    );

  const neededTime =
    cleanText(
      body.needed_time
    );

  const message =
    cleanText(
      body.message
    );

  // ----------------------------------------------------------
  // BLOOD TYPE
  // ----------------------------------------------------------

  if (
    !bloodType ||
    !VALID_BLOOD_TYPES.includes(
      bloodType
    )
  ) {
    return {
      error:
        'Please provide a valid blood type.'
    };
  }

  // ----------------------------------------------------------
  // UNITS
  // ----------------------------------------------------------

  if (
    !Number.isInteger(
      unitsNeeded
    ) ||
    unitsNeeded < 1 ||
    unitsNeeded > 20
  ) {
    return {
      error:
        'Units needed must be between 1 and 20.'
    };
  }

  // ----------------------------------------------------------
  // FACILITY SOURCE
  // ----------------------------------------------------------

  if (
    !facilitySource ||
    !VALID_FACILITY_SOURCES.includes(
      facilitySource
    )
  ) {
    return {
      error:
        'Invalid facility source.'
    };
  }

  // ----------------------------------------------------------
  // FACILITY NAME
  // ----------------------------------------------------------

  if (!facilityName) {
    return {
      error:
        'Hospital or blood center name is required.'
    };
  }

  // ----------------------------------------------------------
  // MANUAL FACILITY
  // ----------------------------------------------------------

  if (
    facilitySource ===
    'manual'
  ) {
    if (!facilityAddress) {
      return {
        error:
          'Facility address is required when entering a facility manually.'
      };
    }
  }

  // ----------------------------------------------------------
  // NEARBY FACILITY
  // ----------------------------------------------------------

  if (
    facilitySource ===
    'nearby'
  ) {
    if (
      latitude === null ||
      longitude === null
    ) {
      return {
        error:
          'Selected nearby facility must include valid coordinates.'
      };
    }

    if (
      !isValidLatitude(
        latitude
      )
    ) {
      return {
        error:
          'Invalid facility latitude.'
      };
    }

    if (
      !isValidLongitude(
        longitude
      )
    ) {
      return {
        error:
          'Invalid facility longitude.'
      };
    }
  }

  // ----------------------------------------------------------
  // URGENCY
  // ----------------------------------------------------------

  if (
    !urgency ||
    !VALID_URGENCY.includes(
      urgency
    )
  ) {
    return {
      error:
        'Please select a valid urgency.'
    };
  }

  // ----------------------------------------------------------
  // NEEDED DATE / TIME
  // ----------------------------------------------------------

  if (
    urgency ===
    'needed'
  ) {
    if (
      !neededDate ||
      !neededTime
    ) {
      return {
        error:
          'Needed date and time are required.'
      };
    }

    const combined =
      combineNeededDateTime(
        neededDate,
        neededTime
      );

    if (!combined) {
      return {
        error:
          'Invalid needed date or time.'
      };
    }

    if (
      combined.getTime() <=
      Date.now()
    ) {
      return {
        error:
          'Needed date and time must be in the future.'
      };
    }
  }

  // ----------------------------------------------------------
  // MESSAGE
  // ----------------------------------------------------------

  if (
    message &&
    message.length > 250
  ) {
    return {
      error:
        'Message must not exceed 250 characters.'
    };
  }

  return {
    data: {
      blood_type:
        bloodType,

      units_needed:
        unitsNeeded,

      facility_source:
        facilitySource,

      facility_id:
        facilitySource ===
          'nearby'
          ? facilityId
          : null,

      facility_name:
        facilityName,

      facility_type:
        facilitySource ===
          'manual'
          ? 'manual'
          : facilityType,

      facility_address:
        facilityAddress,

      facility_latitude:
        facilitySource ===
          'nearby'
          ? latitude
          : null,

      facility_longitude:
        facilitySource ===
          'nearby'
          ? longitude
          : null,

      urgency,

      needed_date:
        urgency ===
          'needed'
          ? neededDate
          : null,

      needed_time:
        urgency ===
          'needed'
          ? neededTime
          : null,

      message:
        message || null
    }
  };
}

// ============================================================
// POST /api/requests
// ============================================================

async function createBloodRequest(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const validation =
      validateBloodRequest(
        req.body
      );

    if (
      validation.error
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error
        });
    }

    // --------------------------------------------------------
    // PREVENT MULTIPLE ACTIVE REQUESTS
    // --------------------------------------------------------

    const {
      data:
        existingRequest,
      error:
        existingRequestError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(
          'id,status,created_at'
        )
        .eq(
          'requester_id',
          requesterId
        )
        .eq(
          'status',
          'active'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      existingRequestError
    ) {
      console.error(
        'CHECK ACTIVE REQUEST ERROR:',
        existingRequestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify active blood requests.'
        });
    }

    if (
      existingRequest
    ) {
      return res
        .status(409)
        .json({
          error:
            'You already have an active blood request.',

          request:
            existingRequest
        });
    }

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    const requestData = {
      requester_id:
        requesterId,

      ...validation.data,

      status:
        'active'
    };

    const {
      data:
        createdRequest,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .insert(
          requestData
        )
        .select()
        .single();

    if (insertError) {
      console.error(
        'CREATE BLOOD REQUEST ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to create blood request.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Store the actual newly created blood request ID.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'blood_request',
      createdRequest.id
    );

    // --------------------------------------------------------
    // ADMIN NOTIFICATION (urgent requests only)
    //
    // Fire-and-forget: notifyAdmins never throws.
    // --------------------------------------------------------

    if (
      createdRequest.urgency ===
      'urgent'
    ) {
      void notifyAdmins({
        type:
          'admin_urgent_blood_request',

        title:
          'Urgent blood request',

        message:
          `${createdRequest.units_needed} ${
            Number(createdRequest.units_needed) === 1
              ? 'unit'
              : 'units'
          } of ${createdRequest.blood_type} needed urgently at ${
            createdRequest.facility_name ||
            'a facility'
          }.`,

        data: {
          request_id:
            createdRequest.id,

          route:
            `/requests/${createdRequest.id}`
        }
      });
    }

    return res
      .status(201)
      .json({
        message:
          'Blood request created successfully.',

        request:
          createdRequest
      });
  } catch (error) {
    console.error(
      'CREATE BLOOD REQUEST ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/requests/my
// ============================================================

async function getMyBloodRequests(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select('*')
        .eq(
          'requester_id',
          requesterId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      console.error(
        'GET MY BLOOD REQUESTS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood requests.'
        });
    }

    return res
      .status(200)
      .json({
        count:
          data?.length || 0,

        requests:
          data || []
      });
  } catch (error) {
    console.error(
      'GET MY BLOOD REQUESTS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/requests/my/active
// ============================================================

async function getMyActiveBloodRequest(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select('*')
        .eq(
          'requester_id',
          requesterId
        )
        .eq(
          'status',
          'active'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        'GET ACTIVE REQUEST ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve active blood request.'
        });
    }

    return res
      .status(200)
      .json({
        request:
          data || null
      });
  } catch (error) {
    console.error(
      'GET ACTIVE REQUEST ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/requests/:id
// ============================================================

async function getBloodRequestById(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
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

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select('*')
        .eq(
          'id',
          requestId
        )
        .eq(
          'requester_id',
          requesterId
        )
        .maybeSingle();

    if (error) {
      console.error(
        'GET REQUEST ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (!data) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    return res
      .status(200)
      .json({
        request:
          data
      });
  } catch (error) {
    console.error(
      'GET REQUEST ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/requests/:id/donor-view
// ============================================================

async function getDonorViewBloodRequestById(
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

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const {
      data,
      error
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
          created_at,
          flagged_at,
          removed_at,
          removal_reason
        `)
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (error) {
      console.error(
        'GET DONOR REQUEST VIEW ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (!data) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      data.requester_id ===
      viewerId
    ) {
      return res
        .status(400)
        .json({
          error:
            'This is your own blood request.'
        });
    }

    // A closed request stays visible to donors who took part
    // (offered, were invited, or have a donation record), so
    // they can still see the outcome and leave feedback.
    if (
      data.status !==
      'active'
    ) {
      const [
        responseResult,
        invitationResult
      ] =
        await Promise.all([
          supabaseAdmin
            .from(
              'blood_request_responses'
            )
            .select('id')
            .eq(
              'request_id',
              requestId
            )
            .eq(
              'donor_id',
              viewerId
            )
            .limit(1),

          supabaseAdmin
            .from(
              'blood_request_invitations'
            )
            .select('id')
            .eq(
              'request_id',
              requestId
            )
            .eq(
              'donor_id',
              viewerId
            )
            .limit(1)
        ]);

      const tookPart =
        (responseResult.data || [])
          .length > 0 ||
        (invitationResult.data || [])
          .length > 0;

      if (!tookPart) {
        return res
          .status(409)
          .json({
            error:
              'This blood request is no longer active.'
          });
      }
    }

    const {
      requester_id,
      ...safeRequest
    } = data;

    return res
      .status(200)
      .json({
        request:
          safeRequest
      });
  } catch (error) {
    console.error(
      'GET DONOR REQUEST VIEW ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// PATCH /api/requests/:id/fulfill
// ============================================================

async function fulfillBloodRequest(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
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

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const {
      data:
        existingRequest,
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
          status,
          blood_type,
          units_needed,
          facility_name
        `)
        .eq(
          'id',
          requestId
        )
        .eq(
          'requester_id',
          requesterId
        )
        .maybeSingle();

    if (requestError) {
      console.error(
        'FULFILL REQUEST LOOKUP ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (!existingRequest) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      existingRequest.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            existingRequest.status ===
              'fulfilled'
              ? 'This blood request has already been fulfilled.'
              : 'Only active blood requests can be marked as fulfilled.'
        });
    }

    // --------------------------------------------------------
    // ACCEPTED DONORS
    // --------------------------------------------------------

    const {
      data:
        acceptedResponses,
      error:
        acceptedResponsesError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select(
          'id,donor_id,status'
        )
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'status',
          'accepted'
        );

    if (
      acceptedResponsesError
    ) {
      console.error(
        'FULFILL REQUEST ACCEPTED DONORS ERROR:',
        acceptedResponsesError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify accepted donors.'
        });
    }

    const acceptedDonorCount =
      acceptedResponses?.length ||
      0;

    if (
      acceptedDonorCount ===
      0
    ) {
      return res
        .status(409)
        .json({
          error:
            'Accept at least one donor offer before marking this request as fulfilled.'
        });
    }

    // --------------------------------------------------------
    // CONFIRMED DONATIONS
    //
    // A request is fulfilled only after the requester has
    // confirmed at least one donation (pending or verified),
    // so every fulfilled request has a stored donation record.
    // --------------------------------------------------------

    const {
      data:
        confirmedDonations,
      error:
        donationsError
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id,units_donated'
        )
        .eq(
          'request_id',
          requestId
        )
        .neq(
          'status',
          'rejected'
        );

    if (donationsError) {
      console.error(
        'FULFILL REQUEST DONATIONS ERROR:',
        donationsError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify confirmed donations.'
        });
    }

    if (
      !confirmedDonations?.length
    ) {
      return res
        .status(409)
        .json({
          error:
            'Confirm at least one donor\'s donation before marking this request as fulfilled.'
        });
    }

    // --------------------------------------------------------
    // FULFILL
    // --------------------------------------------------------

    const {
      data:
        updatedRequest,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .update({
          status:
            'fulfilled',

          fulfilled_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          requestId
        )
        .eq(
          'requester_id',
          requesterId
        )
        .eq(
          'status',
          'active'
        )
        .select()
        .maybeSingle();

    if (updateError) {
      console.error(
        'FULFILL REQUEST UPDATE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to mark blood request as fulfilled.'
        });
    }

    if (!updatedRequest) {
      return res
        .status(409)
        .json({
          error:
            'This blood request is no longer active.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'blood_request',
      updatedRequest.id ||
      requestId
    );

    // --------------------------------------------------------
    // NOTIFY ACCEPTED DONORS
    // --------------------------------------------------------

    const donorIds =
      [
        ...new Set(
          (
            acceptedResponses ||
            []
          )
            .map(
              response =>
                response.donor_id
            )
            .filter(Boolean)
        )
      ];

    await createNotifications(
      donorIds.map(
        donorId => ({
          userId:
            donorId,

          type:
            'blood_request_fulfilled',

          title:
            'Blood Request Fulfilled',

          message:
            `The ${existingRequest.blood_type} blood request at ${existingRequest.facility_name} has been marked as fulfilled.`,

          data: {
            request_id:
              requestId,

            blood_type:
              existingRequest.blood_type,

            facility_name:
              existingRequest.facility_name,

            status:
              'fulfilled'
          }
        })
      )
    );

    return res
      .status(200)
      .json({
        message:
          'Blood request marked as fulfilled successfully.',

        accepted_donor_count:
          acceptedDonorCount,

        confirmed_donation_count:
          confirmedDonations.length,

        request:
          updatedRequest
      });
  } catch (error) {
    console.error(
      'FULFILL BLOOD REQUEST ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// PATCH /api/requests/:id/cancel
// ============================================================

async function cancelBloodRequest(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (!requesterId) {
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

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const {
      data:
        existingRequest,
      error:
        findError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(`
          id,
          status,
          blood_type,
          facility_name
        `)
        .eq(
          'id',
          requestId
        )
        .eq(
          'requester_id',
          requesterId
        )
        .maybeSingle();

    if (findError) {
      console.error(
        'FIND REQUEST ERROR:',
        findError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (
      !existingRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      existingRequest.status !==
      'active'
    ) {
      return res
        .status(400)
        .json({
          error:
            'Only active blood requests can be cancelled.'
        });
    }

    // --------------------------------------------------------
    // CONFIRMED DONATIONS BLOCK CANCELLING
    //
    // Once a donation is confirmed the request was (at least
    // partly) met, so it should be fulfilled, not cancelled.
    // --------------------------------------------------------

    const {
      data:
        confirmedDonations,
      error:
        donationsError
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id'
        )
        .eq(
          'request_id',
          requestId
        )
        .neq(
          'status',
          'rejected'
        )
        .limit(1);

    if (donationsError) {
      console.error(
        'CANCEL REQUEST DONATIONS ERROR:',
        donationsError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to check confirmed donations.'
        });
    }

    if (
      confirmedDonations?.length
    ) {
      return res
        .status(409)
        .json({
          error:
            'This request already has a confirmed donation. Mark it as fulfilled instead of cancelling.'
        });
    }

    // --------------------------------------------------------
    // FIND INVOLVED DONORS BEFORE CANCELLING
    // --------------------------------------------------------

    const {
      data:
        donorResponses,
      error:
        donorResponsesError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select(
          'donor_id,status'
        )
        .eq(
          'request_id',
          requestId
        )
        .in(
          'status',
          [
            'pending',
            'accepted'
          ]
        );

    if (
      donorResponsesError
    ) {
      console.error(
        'CANCEL REQUEST DONOR LOOKUP ERROR:',
        donorResponsesError
      );
    }

    // --------------------------------------------------------
    // CANCEL
    // --------------------------------------------------------

    const {
      data:
        updatedRequest,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .update({
          status:
            'cancelled',

          cancelled_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          requestId
        )
        .eq(
          'requester_id',
          requesterId
        )
        .select()
        .single();

    if (updateError) {
      console.error(
        'CANCEL REQUEST ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to cancel blood request.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'blood_request',
      updatedRequest.id ||
      requestId
    );

    // --------------------------------------------------------
    // NOTIFY DONORS
    // --------------------------------------------------------

    const donorIds =
      [
        ...new Set(
          (
            donorResponses ||
            []
          )
            .map(
              response =>
                response.donor_id
            )
            .filter(Boolean)
        )
      ];

    await createNotifications(
      donorIds.map(
        donorId => ({
          userId:
            donorId,

          type:
            'blood_request_cancelled',

          title:
            'Blood Request Cancelled',

          message:
            `The ${existingRequest.blood_type} blood request at ${existingRequest.facility_name} has been cancelled.`,

          data: {
            request_id:
              requestId,

            blood_type:
              existingRequest.blood_type,

            facility_name:
              existingRequest.facility_name,

            status:
              'cancelled'
          }
        })
      )
    );

    return res
      .status(200)
      .json({
        message:
          'Blood request cancelled successfully.',

        request:
          updatedRequest
      });
  } catch (error) {
    console.error(
      'CANCEL REQUEST ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createBloodRequest,

  getMyBloodRequests,

  getMyActiveBloodRequest,

  getBloodRequestById,

  getDonorViewBloodRequestById,

  fulfillBloodRequest,

  cancelBloodRequest
};