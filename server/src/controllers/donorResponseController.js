const {
  supabaseAdmin
} =
  require('../config/supabase');

const {
  createNotification
} =
  require(
    '../services/notificationService'
  );

const {
  setActivityEntity
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const {
  areRedBloodCellsCompatible,
  getCompatibleDonorTypes
} =
  require(
    '../utils/bloodCompatibility'
  );

// ============================================================
// HELPERS
// ============================================================

function getAuthenticatedUserId(
  req
) {
  return (
    req.user?.id ||
    req.authUser?.id ||
    req.dbUser?.id ||
    null
  );
}

function cleanText(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const cleaned =
    String(value)
      .trim();

  return (
    cleaned ||
    null
  );
}

function getRequestId(
  req
) {
  return String(
    req.params.id ||
    ''
  ).trim();
}

function getResponseId(
  req
) {
  return String(
    req.params.responseId ||
    ''
  ).trim();
}

// ============================================================
// NORMALIZE BLOOD TYPE
// ============================================================

function normalizeBloodType(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase();

  return (
    normalized ||
    null
  );
}

// ============================================================
// BLOOD TYPE COMPATIBILITY
//
// Hemo-Hero donor response rule (same as donor invitations):
// the donor's verified blood type must be red-cell compatible
// with the requested type.
//
// Request A+  -> donors O-, O+, A-, A+
// Request O-  -> donors O- only
//
// Final compatibility is always confirmed by blood-bank
// testing at the facility.
// ============================================================

function isCompatibleDonorBloodType(
  requestBloodType,
  donorBloodType
) {
  return areRedBloodCellsCompatible(
    requestBloodType,
    donorBloodType
  );
}

// ============================================================
// GET VERIFIED DONOR APPLICATION
// ============================================================

async function getVerifiedDonorApplication(
  donorId
) {
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
        status,
        blood_type,
        availability_status,
        travel_radius_km,
        allow_urgent_requests
      `)
      .eq(
        'user_id',
        donorId
      )
      .maybeSingle();

  if (
    donorApplicationError
  ) {
    console.error(
      'GET DONOR APPLICATION ERROR:',
      donorApplicationError
    );

    throw new Error(
      'Unable to verify donor information.'
    );
  }

  return (
    donorApplication ||
    null
  );
}

// ============================================================
// SAFE DONOR PROFILE
// ============================================================

function buildSafeDonorProfile(
  user,
  donorApplication
) {
  const firstName =
    user?.first_name ||
    null;

  const middleName =
    user?.middle_name ||
    null;

  const lastName =
    user?.last_name ||
    null;

  const suffix =
    user?.suffix ||
    null;

  const fullName =
    [
      firstName,
      middleName,
      lastName,
      suffix
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim() ||
    'Hemo-Hero Donor';

  return {
    id:
      user?.id ||
      donorApplication
        ?.user_id ||
      null,

    first_name:
      firstName,

    middle_name:
      middleName,

    last_name:
      lastName,

    suffix,

    full_name:
      fullName,

    city:
      user?.city ??
      null,

    province:
      user?.province ??
      null,

    blood_type:
      donorApplication
        ?.blood_type ||
      null,

    verification_status:
      donorApplication
        ?.status ||
      'not_registered',

    is_verified:
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
      null,

    allow_urgent_requests:
      Boolean(
        donorApplication
          ?.allow_urgent_requests
      )
  };
}

// ============================================================
// ENRICH RESPONSES
// ============================================================

async function enrichDonorResponses(
  responses
) {
  if (
    !Array.isArray(
      responses
    ) ||
    responses.length ===
      0
  ) {
    return [];
  }

  const donorIds =
    [
      ...new Set(
        responses
          .map(
            response =>
              response.donor_id
          )
          .filter(
            Boolean
          )
      )
    ];

  if (
    donorIds.length ===
    0
  ) {
    return responses.map(
      response => ({
        ...response,

        donor:
          null
      })
    );
  }

  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  const {
    data:
      users,
    error:
      usersError
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select('*')
      .in(
        'id',
        donorIds
      );

  if (
    usersError
  ) {
    console.error(
      'DONOR RESPONSE USERS ERROR:',
      usersError
    );

    throw new Error(
      'Unable to load donor profile information.'
    );
  }

  // ----------------------------------------------------------
  // DONOR APPLICATIONS
  // ----------------------------------------------------------

  const {
    data:
      donorApplications,
    error:
      donorApplicationsError
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select('*')
      .in(
        'user_id',
        donorIds
      );

  if (
    donorApplicationsError
  ) {
    console.error(
      'DONOR RESPONSE APPLICATIONS ERROR:',
      donorApplicationsError
    );

    throw new Error(
      'Unable to load donor verification information.'
    );
  }

  // ----------------------------------------------------------
  // MAPS
  // ----------------------------------------------------------

  const userMap =
    new Map();

  for (
    const user of
      users ||
      []
  ) {
    userMap.set(
      user.id,
      user
    );
  }

  const donorApplicationMap =
    new Map();

  for (
    const application of
      donorApplications ||
      []
  ) {
    donorApplicationMap.set(
      application.user_id,
      application
    );
  }

  return responses.map(
    response => {
      const user =
        userMap.get(
          response.donor_id
        );

      const donorApplication =
        donorApplicationMap.get(
          response.donor_id
        );

      return {
        ...response,

        donor:
          buildSafeDonorProfile(
            user,
            donorApplication
          )
      };
    }
  );
}

// ============================================================
// VERIFY REQUEST OWNER
// ============================================================

async function getOwnedBloodRequest(
  requestId,
  requesterId
) {
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

  if (
    requestError
  ) {
    console.error(
      'VERIFY REQUEST OWNER ERROR:',
      requestError
    );

    throw new Error(
      'Unable to retrieve blood request.'
    );
  }

  return (
    bloodRequest ||
    null
  );
}

// ============================================================
// NOTIFY REQUESTER ABOUT DONOR RESPONSE
// ============================================================

async function notifyRequesterAboutResponse(
  bloodRequest,
  response
) {
  if (
    !bloodRequest
      ?.requester_id ||
    !response?.id
  ) {
    return;
  }

  await createNotification({
    userId:
      bloodRequest
        .requester_id,

    type:
      'donor_response_received',

    title:
      'New Donor Response',

    message:
      `A verified donor responded to your ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name}.`,

    data: {
      request_id:
        bloodRequest.id,

      response_id:
        response.id,

      donor_id:
        response.donor_id,

      blood_type:
        bloodRequest.blood_type,

      facility_name:
        bloodRequest.facility_name
    }
  });
}

// ============================================================
// POST /api/requests/:id/respond
//
// VERIFIED DONOR OFFERS TO DONATE
// ============================================================

async function respondToBloodRequest(
  req,
  res
) {
  try {
    const donorId =
      getAuthenticatedUserId(
        req
      );

    if (
      !donorId
    ) {
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

    if (
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const message =
      cleanText(
        req.body?.message
      );

    if (
      message &&
      message.length >
        250
    ) {
      return res
        .status(400)
        .json({
          error:
            'Message must not exceed 250 characters.'
        });
    }

    // ========================================================
    // BLOOD REQUEST
    // ========================================================

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
          status,
          blood_type,
          facility_name,
          flagged_at
        `)
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (
      requestError
    ) {
      console.error(
        'DONOR RESPONSE REQUEST LOOKUP ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.'
        });
    }

    if (
      !bloodRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    // ========================================================
    // OWN REQUEST
    // ========================================================

    if (
      bloodRequest
        .requester_id ===
      donorId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You cannot respond to your own blood request.'
        });
    }

    // ========================================================
    // ACTIVE REQUEST
    // ========================================================

    if (
      bloodRequest.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This blood request is no longer active.'
        });
    }

    // Reported by several people and waiting for admin review.
    if (
      bloodRequest.flagged_at
    ) {
      return res
        .status(409)
        .json({
          error:
            'This request is under review by Hemo-Hero and isn’t accepting offers right now.'
        });
    }

    // ========================================================
    // VERIFIED DONOR
    // ========================================================

    const donorApplication =
      await getVerifiedDonorApplication(
        donorId
      );

    if (
      !donorApplication ||
      donorApplication.status !==
        'approved'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only verified donors can offer to donate.'
        });
    }

    // ========================================================
    // BLOOD TYPE COMPATIBILITY
    // ========================================================

    if (
      !isCompatibleDonorBloodType(
        bloodRequest.blood_type,
        donorApplication
          .blood_type
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'Your verified blood type is not compatible with the blood type required by this request.',

          required_blood_type:
            normalizeBloodType(
              bloodRequest
                .blood_type
            ),

          donor_blood_type:
            normalizeBloodType(
              donorApplication
                .blood_type
            ),

          compatible_donor_types:
            getCompatibleDonorTypes(
              bloodRequest
                .blood_type
            )
        });
    }

    // ========================================================
    // EXISTING RESPONSE
    // ========================================================

    const {
      data:
        existingResponse,
      error:
        existingError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select('*')
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        'CHECK DONOR RESPONSE ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify your donor response.'
        });
    }

    // --------------------------------------------------------
    // IF AN EXISTING RESPONSE EXISTS, USE ITS ID FOR AUDIT
    // --------------------------------------------------------

    if (
      existingResponse?.id
    ) {
      setActivityEntity(
        res,
        'donor_response',
        existingResponse.id
      );
    }

    // ========================================================
    // EXISTING PENDING / ACCEPTED RESPONSE
    // ========================================================

    if (
      existingResponse &&
      (
        existingResponse.status ===
          'pending' ||
        existingResponse.status ===
          'accepted'
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            existingResponse.status ===
              'accepted'
              ? 'Your donor response has already been accepted.'
              : 'You have already responded to this blood request.',

          response:
            existingResponse
        });
    }

    // ========================================================
    // REACTIVATE OLD RESPONSE
    // ========================================================

    if (
      existingResponse
    ) {
      const {
        data:
          updatedResponse,
        error:
          updateError
      } =
        await supabaseAdmin
          .from(
            'blood_request_responses'
          )
          .update({
            status:
              'pending',

            message:
              message ||
              null,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'id',
            existingResponse.id
          )
          .select()
          .single();

      if (
        updateError
      ) {
        console.error(
          'REACTIVATE DONOR RESPONSE ERROR:',
          updateError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to submit donor response.'
          });
      }

      // ------------------------------------------------------
      // ACTIVITY ENTITY
      // ------------------------------------------------------

      setActivityEntity(
        res,
        'donor_response',
        updatedResponse.id
      );

      await notifyRequesterAboutResponse(
        bloodRequest,
        updatedResponse
      );

      return res
        .status(200)
        .json({
          message:
            'Donor response submitted successfully.',

          response:
            updatedResponse
        });
    }

    // ========================================================
    // CREATE RESPONSE
    // ========================================================

    const {
      data:
        createdResponse,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .insert({
          request_id:
            requestId,

          donor_id:
            donorId,

          status:
            'pending',

          message:
            message ||
            null
        })
        .select()
        .single();

    if (
      insertError
    ) {
      console.error(
        'CREATE DONOR RESPONSE ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to submit donor response.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_response',
      createdResponse.id
    );

    await notifyRequesterAboutResponse(
      bloodRequest,
      createdResponse
    );

    return res
      .status(201)
      .json({
        message:
          'Donor response submitted successfully.',

        response:
          createdResponse
      });
  } catch (
    error
  ) {
    console.error(
      'RESPOND TO BLOOD REQUEST ERROR:',
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
// GET /api/requests/:id/my-response
// ============================================================

async function getMyDonorResponse(
  req,
  res
) {
  try {
    const donorId =
      getAuthenticatedUserId(
        req
      );

    if (
      !donorId
    ) {
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

    if (
      !requestId
    ) {
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
          'blood_request_responses'
        )
        .select('*')
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        'GET MY DONOR RESPONSE ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor response.'
        });
    }

    return res
      .status(200)
      .json({
        response:
          data ||
          null
      });
  } catch (
    error
  ) {
    console.error(
      'GET MY DONOR RESPONSE ERROR:',
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
// PATCH /api/requests/:id/response/withdraw
// ============================================================

async function withdrawDonorResponse(
  req,
  res
) {
  try {
    const donorId =
      getAuthenticatedUserId(
        req
      );

    if (
      !donorId
    ) {
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

    if (
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const {
      data:
        existingResponse,
      error:
        findError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select('*')
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      findError
    ) {
      console.error(
        'FIND DONOR RESPONSE ERROR:',
        findError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor response.'
        });
    }

    if (
      !existingResponse
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor response not found.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_response',
      existingResponse.id
    );

    if (
      existingResponse.status !==
      'pending'
    ) {
      return res
        .status(400)
        .json({
          error:
            existingResponse.status ===
              'accepted'
              ? 'An accepted donor response cannot be withdrawn here.'
              : 'Only pending donor responses can be withdrawn.'
        });
    }

    const {
      data:
        updatedResponse,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .update({
          status:
            'withdrawn',

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          existingResponse.id
        )
        .select()
        .single();

    if (
      updateError
    ) {
      console.error(
        'WITHDRAW DONOR RESPONSE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to withdraw donor response.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_response',
      updatedResponse.id
    );

    // ========================================================
    // REQUEST OWNER
    // ========================================================

    const {
      data:
        bloodRequest,
      error:
        bloodRequestError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(`
          id,
          requester_id,
          blood_type,
          facility_name
        `)
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (
      bloodRequestError
    ) {
      console.error(
        'WITHDRAW RESPONSE REQUEST LOOKUP ERROR:',
        bloodRequestError
      );
    }

    // ========================================================
    // NOTIFY REQUEST OWNER
    // ========================================================

    if (
      bloodRequest
        ?.requester_id
    ) {
      await createNotification({
        userId:
          bloodRequest.requester_id,

        type:
          'donor_response_withdrawn',

        title:
          'Donor Response Withdrawn',

        message:
          `A donor withdrew their response to your ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name}.`,

        data: {
          request_id:
            requestId,

          response_id:
            updatedResponse.id,

          donor_id:
            donorId
        }
      });
    }

    return res
      .status(200)
      .json({
        message:
          'Donor response withdrawn successfully.',

        response:
          updatedResponse
      });
  } catch (
    error
  ) {
    console.error(
      'WITHDRAW DONOR RESPONSE ERROR:',
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
// GET /api/requests/:id/responses
// ============================================================

async function getResponsesForMyBloodRequest(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (
      !requesterId
    ) {
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

    if (
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (
      !bloodRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    const {
      data:
        responses,
      error:
        responsesError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select('*')
        .eq(
          'request_id',
          requestId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (
      responsesError
    ) {
      console.error(
        'GET REQUEST RESPONSES ERROR:',
        responsesError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor responses.'
        });
    }

    const enrichedResponses =
      await enrichDonorResponses(
        responses ||
        []
      );

    const counts = {
      total:
        enrichedResponses.length,

      pending:
        0,

      accepted:
        0,

      rejected:
        0,

      withdrawn:
        0,

      no_show:
        0
    };

    for (
      const response of
        enrichedResponses
    ) {
      if (
        response.status ===
        'pending'
      ) {
        counts.pending +=
          1;
      }

      if (
        response.status ===
        'accepted'
      ) {
        counts.accepted +=
          1;
      }

      if (
        response.status ===
        'rejected'
      ) {
        counts.rejected +=
          1;
      }

      if (
        response.status ===
        'withdrawn'
      ) {
        counts.withdrawn +=
          1;
      }

      if (
        response.status ===
        'no_show'
      ) {
        counts.no_show +=
          1;
      }
    }

    return res
      .status(200)
      .json({
        count:
          enrichedResponses.length,

        counts,

        responses:
          enrichedResponses
      });
  } catch (
    error
  ) {
    console.error(
      'GET REQUEST RESPONSES ERROR:',
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
// PATCH /api/requests/:id/responses/:responseId/accept
// ============================================================

async function acceptDonorResponse(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (
      !requesterId
    ) {
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
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    if (
      !responseId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Response ID is required.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_response',
      responseId
    );

    // ========================================================
    // REQUEST
    // ========================================================

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (
      !bloodRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      bloodRequest.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only active blood requests can accept donor offers.'
        });
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    const {
      data:
        response,
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

    if (
      responseError
    ) {
      console.error(
        'ACCEPT DONOR RESPONSE LOOKUP ERROR:',
        responseError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor response.'
        });
    }

    if (
      !response
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor response not found.'
        });
    }

    if (
      response.status ===
      'accepted'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor offer has already been accepted.'
        });
    }

    if (
      response.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only pending donor offers can be accepted.'
        });
    }

    // ========================================================
    // DONOR VERIFICATION
    // ========================================================

    const donorApplication =
      await getVerifiedDonorApplication(
        response.donor_id
      );

    if (
      !donorApplication ||
      donorApplication.status !==
        'approved'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor is no longer a verified donor.'
        });
    }

    // ========================================================
    // BLOOD TYPE COMPATIBILITY REVALIDATION
    // ========================================================

    if (
      !isCompatibleDonorBloodType(
        bloodRequest.blood_type,
        donorApplication
          .blood_type
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor\'s verified blood type is not compatible with the blood type required by this request.',

          required_blood_type:
            normalizeBloodType(
              bloodRequest
                .blood_type
            ),

          donor_blood_type:
            normalizeBloodType(
              donorApplication
                .blood_type
            )
        });
    }

    // ========================================================
    // ACCEPT
    // ========================================================

    const {
      data:
        updatedResponse,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .update({
          status:
            'accepted',

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
          'pending'
        )
        .select()
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        'ACCEPT DONOR RESPONSE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to accept donor offer.'
        });
    }

    if (
      !updatedResponse
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor offer is no longer pending.'
        });
    }

    setActivityEntity(
      res,
      'donor_response',
      updatedResponse.id
    );

    // ========================================================
    // NOTIFY DONOR
    // ========================================================

    await createNotification({
      userId:
        response.donor_id,

      type:
        'donor_response_accepted',

      title:
        'Your Offer Was Accepted',

      message:
        `Your donor offer for the ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name} was accepted.`,

      data: {
        request_id:
          requestId,

        response_id:
          responseId,

        blood_type:
          bloodRequest.blood_type,

        facility_name:
          bloodRequest.facility_name
      }
    });

    const enriched =
      await enrichDonorResponses([
        updatedResponse
      ]);

    return res
      .status(200)
      .json({
        message:
          'Donor offer accepted successfully.',

        response:
          enriched[0] ||
          updatedResponse
      });
  } catch (
    error
  ) {
    console.error(
      'ACCEPT DONOR RESPONSE ERROR:',
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
// PATCH /api/requests/:id/responses/:responseId/reject
// ============================================================

async function rejectDonorResponse(
  req,
  res
) {
  try {
    const requesterId =
      getAuthenticatedUserId(
        req
      );

    if (
      !requesterId
    ) {
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
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    if (
      !responseId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Response ID is required.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_response',
      responseId
    );

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (
      !bloodRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    if (
      bloodRequest.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only active blood requests can manage donor offers.'
        });
    }

    const {
      data:
        response,
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

    if (
      responseError
    ) {
      console.error(
        'REJECT DONOR RESPONSE LOOKUP ERROR:',
        responseError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor response.'
        });
    }

    if (
      !response
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor response not found.'
        });
    }

    if (
      response.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            response.status ===
              'accepted'
              ? 'An accepted donor offer cannot be rejected here.'
              : 'Only pending donor offers can be rejected.'
        });
    }

    const {
      data:
        updatedResponse,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .update({
          status:
            'rejected',

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
          'pending'
        )
        .select()
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        'REJECT DONOR RESPONSE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to reject donor offer.'
        });
    }

    if (
      !updatedResponse
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor offer is no longer pending.'
        });
    }

    setActivityEntity(
      res,
      'donor_response',
      updatedResponse.id
    );

    // ========================================================
    // NOTIFY DONOR
    // ========================================================

    await createNotification({
      userId:
        response.donor_id,

      type:
        'donor_response_rejected',

      title:
        'Donor Offer Update',

      message:
        `Your donor offer for the ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name} was not selected.`,

      data: {
        request_id:
          requestId,

        response_id:
          responseId,

        blood_type:
          bloodRequest.blood_type,

        facility_name:
          bloodRequest.facility_name
      }
    });

    const enriched =
      await enrichDonorResponses([
        updatedResponse
      ]);

    return res
      .status(200)
      .json({
        message:
          'Donor offer rejected successfully.',

        response:
          enriched[0] ||
          updatedResponse
      });
  } catch (
    error
  ) {
    console.error(
      'REJECT DONOR RESPONSE ERROR:',
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
  respondToBloodRequest,

  getMyDonorResponse,

  withdrawDonorResponse,

  getResponsesForMyBloodRequest,

  acceptDonorResponse,

  rejectDonorResponse
};