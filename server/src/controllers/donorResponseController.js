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
    // REACTIVATE PREVIOUS WITHDRAWN / REJECTED RESPONSE
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
              message || null
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
            'withdrawn'
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
// We will use this on the requester side next.
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
          'id,requester_id,status'
        )
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

    return res
      .status(200)
      .json({
        count:
          responses?.length || 0,

        responses:
          responses || []
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
  getResponsesForMyBloodRequest
};