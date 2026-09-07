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

// ============================================================
// SAFE DONOR PROFILE
//
// Do not expose private donor information here.
// Contact information can be added later only after the
// recipient accepts the donor.
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
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    'Hemo-Hero Donor';

  return {
    id:
      user?.id ||
      donorApplication?.user_id ||
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
      donorApplication?.blood_type ||
      null,

    verification_status:
      donorApplication?.status ||
      'not_registered',

    is_verified:
      donorApplication?.status ===
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
//
// Adds safe donor profile and approved donor information.
// ============================================================

async function enrichDonorResponses(
  responses
) {
  if (
    !Array.isArray(responses) ||
    responses.length === 0
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
          .filter(Boolean)
      )
    ];

  if (
    donorIds.length === 0
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
  // USER PROFILES
  // ----------------------------------------------------------

  const {
    data:
      users,
    error:
      usersError
  } =
    await supabaseAdmin
      .from('users')
      .select('*')
      .in(
        'id',
        donorIds
      );

  if (usersError) {
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
      users || []
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
      donorApplications || []
  ) {
    donorApplicationMap.set(
      application.user_id,
      application
    );
  }

  // ----------------------------------------------------------
  // RESULT
  // ----------------------------------------------------------

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

  if (requestError) {
    console.error(
      'VERIFY REQUEST OWNER ERROR:',
      requestError
    );

    throw new Error(
      'Unable to retrieve blood request.'
    );
  }

  return bloodRequest;
}

// ============================================================
// POST /api/requests/:id/respond
//
// DONOR RESPONDS TO AN ACTIVE REQUEST
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

    if (!donorId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

    if (!requestId) {
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
      message.length > 250
    ) {
      return res
        .status(400)
        .json({
          error:
            'Message must not exceed 250 characters.'
        });
    }

    // --------------------------------------------------------
    // FIND BLOOD REQUEST
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
        .select(`
          id,
          requester_id,
          status,
          blood_type,
          facility_name
        `)
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (requestError) {
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

    if (!bloodRequest) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    // --------------------------------------------------------
    // CANNOT RESPOND TO OWN REQUEST
    // --------------------------------------------------------

    if (
      bloodRequest.requester_id ===
      donorId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You cannot respond to your own blood request.'
        });
    }

    // --------------------------------------------------------
    // REQUEST MUST STILL BE ACTIVE
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // CHECK EXISTING RESPONSE
    // --------------------------------------------------------

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

    if (existingError) {
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
    // ALREADY ACTIVE
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // REACTIVATE WITHDRAWN / REJECTED RESPONSE
    // --------------------------------------------------------

    if (existingResponse) {
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
              message || null,

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

      if (updateError) {
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

      return res
        .status(200)
        .json({
          message:
            'Donor response submitted successfully.',

          response:
            updatedResponse
        });
    }

    // --------------------------------------------------------
    // CREATE NEW RESPONSE
    // --------------------------------------------------------

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
            message || null
        })
        .select()
        .single();

    if (insertError) {
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

    return res
      .status(201)
      .json({
        message:
          'Donor response submitted successfully.',

        response:
          createdResponse
      });
  } catch (error) {
    console.error(
      'RESPOND TO BLOOD REQUEST ERROR:',
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
// GET /api/requests/:id/my-response
//
// GET CURRENT DONOR'S RESPONSE
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

    if (!donorId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

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

    if (error) {
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
          data || null
      });
  } catch (error) {
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
//
// DONOR WITHDRAWS A PENDING RESPONSE
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

    if (!donorId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

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

    if (findError) {
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

    if (!existingResponse) {
      return res
        .status(404)
        .json({
          error:
            'Donor response not found.'
        });
    }

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

    if (updateError) {
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

    return res
      .status(200)
      .json({
        message:
          'Donor response withdrawn successfully.',

        response:
          updatedResponse
      });
  } catch (error) {
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
//
// REQUEST OWNER ONLY
//
// Returns donor response + SAFE donor profile.
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

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    // --------------------------------------------------------
    // VERIFY OWNERSHIP
    // --------------------------------------------------------

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (!bloodRequest) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.'
        });
    }

    // --------------------------------------------------------
    // RESPONSES
    // --------------------------------------------------------

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

    if (responsesError) {
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
        responses || []
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
  } catch (error) {
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
//
// REQUEST OWNER ACCEPTS A DONOR OFFER
//
// IMPORTANT:
// Accepting one donor DOES NOT reject the others.
// A blood request can require multiple donors/units.
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

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

    const responseId =
      getResponseId(req);

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    if (!responseId) {
      return res
        .status(400)
        .json({
          error:
            'Response ID is required.'
        });
    }

    // --------------------------------------------------------
    // VERIFY REQUEST OWNER
    // --------------------------------------------------------

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (!bloodRequest) {
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

    // --------------------------------------------------------
    // FIND RESPONSE
    // --------------------------------------------------------

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

    if (responseError) {
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

    if (!response) {
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

    // --------------------------------------------------------
    // DONOR MUST STILL BE VERIFIED
    // --------------------------------------------------------

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
          availability_status
        `)
        .eq(
          'user_id',
          response.donor_id
        )
        .maybeSingle();

    if (
      donorApplicationError
    ) {
      console.error(
        'ACCEPT DONOR VERIFICATION ERROR:',
        donorApplicationError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify donor status.'
        });
    }

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

    // --------------------------------------------------------
    // ACCEPT
    // --------------------------------------------------------

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

    if (updateError) {
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

    if (!updatedResponse) {
      return res
        .status(409)
        .json({
          error:
            'This donor offer is no longer pending.'
        });
    }

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
  } catch (error) {
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
//
// REQUEST OWNER REJECTS A PENDING DONOR OFFER
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

    if (!requesterId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const requestId =
      getRequestId(req);

    const responseId =
      getResponseId(req);

    if (!requestId) {
      return res
        .status(400)
        .json({
          error:
            'Request ID is required.'
        });
    }

    if (!responseId) {
      return res
        .status(400)
        .json({
          error:
            'Response ID is required.'
        });
    }

    // --------------------------------------------------------
    // VERIFY REQUEST OWNER
    // --------------------------------------------------------

    const bloodRequest =
      await getOwnedBloodRequest(
        requestId,
        requesterId
      );

    if (!bloodRequest) {
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

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

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

    if (responseError) {
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

    if (!response) {
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

    // --------------------------------------------------------
    // REJECT
    // --------------------------------------------------------

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

    if (updateError) {
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

    if (!updatedResponse) {
      return res
        .status(409)
        .json({
          error:
            'This donor offer is no longer pending.'
        });
    }

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
  } catch (error) {
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