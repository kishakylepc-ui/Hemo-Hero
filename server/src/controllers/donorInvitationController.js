const {
  supabaseAdmin,
} = require('../config/supabase');

const {
  createNotification,
} = require('../services/notificationService');

const {
  setActivityEntity,
} = require('../middleware/activityLogMiddleware');

const {
  normalizeBloodType,
  getCompatibleDonorTypes,
  areRedBloodCellsCompatible,
} = require('../utils/bloodCompatibility');

const {
  getNextEligibleDate,
  isEligibleToDonate,
  formatEligibleDate
} = require(
  '../services/eligibilityService'
);

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

  const cleaned = String(value).trim();

  return cleaned || null;
}

function getRequestId(req) {
  return String(
    req.params.id || ''
  ).trim();
}

function getInvitationId(req) {
  return String(
    req.params.invitationId || ''
  ).trim();
}

// ============================================================
// GET OWNED BLOOD REQUEST
// ============================================================

async function getOwnedBloodRequest(
  requestId,
  requesterId
) {
  const {
    data: bloodRequest,
    error: requestError,
  } = await supabaseAdmin
    .from('blood_requests')
    .select(`
      id,
      requester_id,
      status,
      blood_type,
      units_needed,
      facility_name,
      facility_type,
      facility_address,
      urgency,
      needed_date,
      needed_time,
      message,
      created_at
    `)
    .eq('id', requestId)
    .eq('requester_id', requesterId)
    .maybeSingle();

  if (requestError) {
    console.error(
      'GET OWNED REQUEST FOR INVITATION ERROR:',
      requestError
    );

    throw new Error(
      'Unable to retrieve blood request.'
    );
  }

  return bloodRequest || null;
}

// ============================================================
// GET VERIFIED DONOR
// ============================================================

async function getVerifiedDonor(donorId) {
  const {
    data: donorApplication,
    error: donorError,
  } = await supabaseAdmin
    .from('donor_applications')
    .select(`
      user_id,
      status,
      blood_type,
      availability_status,
      allow_urgent_requests,
      travel_radius_km,
      last_donation_date
    `)
    .eq('user_id', donorId)
    .maybeSingle();

  if (donorError) {
    console.error(
      'GET INVITATION DONOR ERROR:',
      donorError
    );

    throw new Error(
      'Unable to verify donor.'
    );
  }

  return donorApplication || null;
}

// ============================================================
// GET SAFE USER
// ============================================================

async function getSafeUser(userId) {
  const {
    data: user,
    error: userError,
  } = await supabaseAdmin
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
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    console.error(
      'GET INVITATION USER ERROR:',
      userError
    );

    return null;
  }

  if (!user) {
    return null;
  }

  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id:
      user.id,

    first_name:
      user.first_name || null,

    last_name:
      user.last_name || null,

    full_name:
      fullName || 'Hemo-Hero User',

    city:
      user.city || null,

    province:
      user.province || null,

    profile_photo_url:
      user.profile_photo_url || null,
  };
}

// ============================================================
// ENRICH INVITATIONS
// ============================================================

async function enrichInvitations(invitations) {
  if (
    !Array.isArray(invitations) ||
    invitations.length === 0
  ) {
    return [];
  }

  const requestIds = [
    ...new Set(
      invitations
        .map(
          invitation =>
            invitation.request_id
        )
        .filter(Boolean)
    ),
  ];

  const requesterIds = [
    ...new Set(
      invitations
        .map(
          invitation =>
            invitation.requester_id
        )
        .filter(Boolean)
    ),
  ];

  // ----------------------------------------------------------
  // BLOOD REQUESTS
  // ----------------------------------------------------------

  let bloodRequests = [];

  if (requestIds.length > 0) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from('blood_requests')
      .select(`
        id,
        requester_id,
        status,
        blood_type,
        units_needed,
        facility_name,
        facility_type,
        facility_address,
        urgency,
        needed_date,
        needed_time,
        message,
        created_at
      `)
      .in(
        'id',
        requestIds
      );

    if (error) {
      console.error(
        'ENRICH INVITATION REQUESTS ERROR:',
        error
      );

      throw new Error(
        'Unable to load invitation blood request information.'
      );
    }

    bloodRequests =
      data || [];
  }

  // ----------------------------------------------------------
  // REQUESTERS
  // ----------------------------------------------------------

  let users = [];

  if (requesterIds.length > 0) {
    const {
      data,
      error,
    } = await supabaseAdmin
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
        requesterIds
      );

    if (error) {
      console.error(
        'ENRICH INVITATION USERS ERROR:',
        error
      );

      throw new Error(
        'Unable to load invitation requester information.'
      );
    }

    users =
      data || [];
  }

  // ----------------------------------------------------------
  // MAPS
  // ----------------------------------------------------------

  const requestMap =
    new Map();

  for (
    const request of
    bloodRequests
  ) {
    requestMap.set(
      request.id,
      request
    );
  }

  const userMap =
    new Map();

  for (
    const user of
    users
  ) {
    const fullName = [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

    userMap.set(
      user.id,
      {
        id:
          user.id,

        first_name:
          user.first_name ||
          null,

        last_name:
          user.last_name ||
          null,

        full_name:
          fullName ||
          'Hemo-Hero User',

        city:
          user.city ||
          null,

        province:
          user.province ||
          null,

        profile_photo_url:
          user.profile_photo_url ||
          null,
      }
    );
  }

  return invitations.map(
    invitation => ({
      ...invitation,

      request:
        requestMap.get(
          invitation.request_id
        ) ||
        null,

      requester:
        userMap.get(
          invitation.requester_id
        ) ||
        null,
    })
  );
}

// ============================================================
// NOTIFY DONOR
// ============================================================

async function notifyDonorAboutInvitation(
  invitation,
  bloodRequest,
  requester
) {
  if (
    !invitation?.donor_id ||
    !invitation?.id
  ) {
    return;
  }

  const requesterName =
    requester?.first_name ||
    requester?.full_name ||
    'A Hemo-Hero user';

  await createNotification({
    userId:
      invitation.donor_id,

    type:
      'request',

    title:
      'Blood Donation Help Request',

    message:
      `${requesterName} is asking for your help with a ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name}.`,

    data: {
      kind:
        'donor_invitation',

      invitation_id:
        invitation.id,

      request_id:
        bloodRequest.id,

      requester_id:
        bloodRequest.requester_id,

      blood_type:
        bloodRequest.blood_type,

      facility_name:
        bloodRequest.facility_name,
    },
  });
}

// ============================================================
// NOTIFY REQUESTER - ACCEPTED
// ============================================================

async function notifyRequesterInvitationAccepted(
  invitation,
  bloodRequest,
  response
) {
  if (
    !invitation?.requester_id
  ) {
    return;
  }

  await createNotification({
    userId:
      invitation.requester_id,

    type:
      'donor_response_received',

    title:
      'Donor Accepted Your Request',

    message:
      `A verified donor accepted your request for help with the ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name}.`,

    data: {
      kind:
        'donor_invitation_accepted',

      invitation_id:
        invitation.id,

      request_id:
        bloodRequest.id,

      response_id:
        response?.id ||
        null,

      donor_id:
        invitation.donor_id,

      blood_type:
        bloodRequest.blood_type,

      facility_name:
        bloodRequest.facility_name,
    },
  });
}

// ============================================================
// NOTIFY REQUESTER - DECLINED
// ============================================================

async function notifyRequesterInvitationDeclined(
  invitation,
  bloodRequest
) {
  if (
    !invitation?.requester_id
  ) {
    return;
  }

  await createNotification({
    userId:
      invitation.requester_id,

    type:
      'system',

    title:
      'Donor Invitation Update',

    message:
      `The donor was unable to accept your help request for the ${bloodRequest.blood_type} blood request at ${bloodRequest.facility_name}.`,

    data: {
      kind:
        'donor_invitation_declined',

      invitation_id:
        invitation.id,

      request_id:
        bloodRequest.id,

      donor_id:
        invitation.donor_id,

      blood_type:
        bloodRequest.blood_type,

      facility_name:
        bloodRequest.facility_name,
    },
  });
}

// ============================================================
// POST /api/requests/:id/invitations
// ============================================================

async function sendDonorInvitation(
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
            'Unauthorized',
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
            'Request ID is required.',
        });
    }

    const donorId =
      String(
        req.body?.donor_id ||
        ''
      ).trim();

    if (
      !donorId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Donor ID is required.',
        });
    }

    if (
      donorId ===
      requesterId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You cannot invite yourself to your own blood request.',
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
            'Message must not exceed 250 characters.',
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
            'Blood request not found.',
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
            'Only active blood requests can invite donors.',
        });
    }

    const donorApplication =
      await getVerifiedDonor(
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
            'This user is not currently a verified donor.',
        });
    }

    // A deactivated account can't answer an invitation.
    const {
      data: donorAccount,
      error: donorAccountError,
    } = await supabaseAdmin
      .from('users')
      .select('is_active')
      .eq('id', donorId)
      .maybeSingle();

    if (donorAccountError) {
      console.error(
        'INVITATION DONOR ACCOUNT ERROR:',
        donorAccountError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify donor.',
        });
    }

    if (
      !donorAccount ||
      donorAccount.is_active ===
        false
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor is currently unavailable.',
        });
    }

    // --------------------------------------------------------
    // RED BLOOD CELL COMPATIBILITY
    // --------------------------------------------------------

    if (
      !areRedBloodCellsCompatible(
        bloodRequest.blood_type,
        donorApplication.blood_type
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor\'s blood type is not compatible with the blood type required by this request.',

          required_blood_type:
            normalizeBloodType(
              bloodRequest.blood_type
            ),

          donor_blood_type:
            normalizeBloodType(
              donorApplication.blood_type
            ),

          compatible_donor_types:
            getCompatibleDonorTypes(
              bloodRequest.blood_type
            ),
        });
    }

    if (
      donorApplication
        .availability_status !==
      'available'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor is currently unavailable.',
        });
    }

    if (
      !isEligibleToDonate(
        donorApplication.last_donation_date
      )
    ) {
      return res
        .status(409)
        .json({
          code:
            'DONOR_NOT_YET_ELIGIBLE',

          error:
            `This donor donated recently and can donate again from ${formatEligibleDate(
              getNextEligibleDate(
                donorApplication.last_donation_date
              )
            )}.`,
        });
    }

    if (
      bloodRequest.urgency ===
        'urgent' &&
      !donorApplication
        .allow_urgent_requests
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor is not accepting urgent requests.',
        });
    }

    const {
      data:
        existingInvitation,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
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
        'CHECK DONOR INVITATION ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify existing donor invitation.',
        });
    }

    // --------------------------------------------------------
    // EXISTING INVITATION ENTITY
    // --------------------------------------------------------

    if (
      existingInvitation?.id
    ) {
      setActivityEntity(
        res,
        'donor_invitation',
        existingInvitation.id
      );
    }

    if (
      existingInvitation?.status ===
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'You have already invited this donor to this blood request.',

          invitation:
            existingInvitation,
        });
    }

    if (
      existingInvitation?.status ===
      'accepted'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor has already accepted your invitation.',

          invitation:
            existingInvitation,
        });
    }

    let invitation =
      null;

    // ========================================================
    // REACTIVATE DECLINED / CANCELLED INVITATION
    // ========================================================

    if (
      existingInvitation
    ) {
      const {
        data:
          updatedInvitation,

        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            'blood_request_invitations'
          )
          .update({
            requester_id:
              requesterId,

            status:
              'pending',

            message:
              message ||
              null,

            responded_at:
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            existingInvitation.id
          )
          .select()
          .single();

      if (
        updateError
      ) {
        console.error(
          'REACTIVATE DONOR INVITATION ERROR:',
          updateError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to send donor invitation.',
          });
      }

      invitation =
        updatedInvitation;
    } else {
      // ======================================================
      // CREATE INVITATION
      // ======================================================

      const {
        data:
          createdInvitation,

        error:
          insertError,
      } =
        await supabaseAdmin
          .from(
            'blood_request_invitations'
          )
          .insert({
            request_id:
              requestId,

            requester_id:
              requesterId,

            donor_id:
              donorId,

            status:
              'pending',

            message:
              message ||
              null,
          })
          .select()
          .single();

      if (
        insertError
      ) {
        console.error(
          'CREATE DONOR INVITATION ERROR:',
          insertError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to send donor invitation.',
          });
      }

      invitation =
        createdInvitation;
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_invitation',
      invitation.id
    );

    const requester =
      await getSafeUser(
        requesterId
      );

    await notifyDonorAboutInvitation(
      invitation,
      bloodRequest,
      requester
    );

    return res
      .status(
        existingInvitation
          ? 200
          : 201
      )
      .json({
        message:
          'Donor invitation sent successfully.',

        invitation: {
          ...invitation,

          request:
            bloodRequest,

          requester,
        },
      });
  } catch (
    error
  ) {
    console.error(
      'SEND DONOR INVITATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error',
      });
  }
}

// ============================================================
// GET /api/donor-invitations/me
// ============================================================

async function getMyDonorInvitations(
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
            'Unauthorized',
        });
    }

    const {
      data:
        invitations,

      error:
        invitationsError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
        )
        .select('*')
        .eq(
          'donor_id',
          donorId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (
      invitationsError
    ) {
      console.error(
        'GET MY DONOR INVITATIONS ERROR:',
        invitationsError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor invitations.',
        });
    }

    const enriched =
      await enrichInvitations(
        invitations ||
        []
      );

    const counts = {
      total:
        enriched.length,

      pending:
        0,

      accepted:
        0,

      declined:
        0,

      cancelled:
        0,
    };

    for (
      const invitation of
      enriched
    ) {
      if (
        invitation.status ===
        'pending'
      ) {
        counts.pending +=
          1;
      }

      if (
        invitation.status ===
        'accepted'
      ) {
        counts.accepted +=
          1;
      }

      if (
        invitation.status ===
        'declined'
      ) {
        counts.declined +=
          1;
      }

      if (
        invitation.status ===
        'cancelled'
      ) {
        counts.cancelled +=
          1;
      }
    }

    return res
      .status(200)
      .json({
        count:
          enriched.length,

        counts,

        invitations:
          enriched,
      });
  } catch (
    error
  ) {
    console.error(
      'GET MY DONOR INVITATIONS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error',
      });
  }
}

// ============================================================
// PATCH /api/donor-invitations/:invitationId/accept
// ============================================================

async function acceptDonorInvitation(
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
            'Unauthorized',
        });
    }

    const invitationId =
      getInvitationId(
        req
      );

    if (
      !invitationId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invitation ID is required.',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_invitation',
      invitationId
    );

    const {
      data:
        invitation,

      error:
        invitationError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
        )
        .select('*')
        .eq(
          'id',
          invitationId
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      invitationError
    ) {
      console.error(
        'ACCEPT DONOR INVITATION LOOKUP ERROR:',
        invitationError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor invitation.',
        });
    }

    if (
      !invitation
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor invitation not found.',
        });
    }

    setActivityEntity(
      res,
      'donor_invitation',
      invitation.id
    );

    if (
      invitation.status ===
      'accepted'
    ) {
      return res
        .status(409)
        .json({
          error:
            'You have already accepted this invitation.',
        });
    }

    if (
      invitation.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only pending donor invitations can be accepted.',
        });
    }

    const {
      data:
        bloodRequest,

      error:
        requestError,
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
          facility_name,
          facility_type,
          facility_address,
          urgency,
          needed_date,
          needed_time,
          message
        `)
        .eq(
          'id',
          invitation.request_id
        )
        .maybeSingle();

    if (
      requestError
    ) {
      console.error(
        'ACCEPT INVITATION REQUEST LOOKUP ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.',
        });
    }

    if (
      !bloodRequest
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request no longer exists.',
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
            'This blood request is no longer active.',
        });
    }

    if (
      bloodRequest.requester_id !==
      invitation.requester_id
    ) {
      return res
        .status(409)
        .json({
          error:
            'This invitation no longer matches the blood request owner.',
        });
    }

    const donorApplication =
      await getVerifiedDonor(
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
            'Your donor verification is no longer active.',
        });
    }

    // --------------------------------------------------------
    // WAITING PERIOD SINCE THE LAST DONATION
    // --------------------------------------------------------

    if (
      !isEligibleToDonate(
        donorApplication.last_donation_date
      )
    ) {
      const nextEligible =
        getNextEligibleDate(
          donorApplication.last_donation_date
        );

      return res
        .status(409)
        .json({
          code:
            'DONOR_NOT_YET_ELIGIBLE',

          error:
            `You donated recently. You can donate again from ${formatEligibleDate(
              nextEligible
            )}.`,

          next_eligible_at:
            nextEligible.toISOString(),
        });
    }

    // --------------------------------------------------------
    // RED BLOOD CELL COMPATIBILITY
    // --------------------------------------------------------

    if (
      !areRedBloodCellsCompatible(
        bloodRequest.blood_type,
        donorApplication.blood_type
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'Your verified blood type is not compatible with the blood type required by this request.',

          required_blood_type:
            normalizeBloodType(
              bloodRequest.blood_type
            ),

          donor_blood_type:
            normalizeBloodType(
              donorApplication.blood_type
            ),

          compatible_donor_types:
            getCompatibleDonorTypes(
              bloodRequest.blood_type
            ),
        });
    }

    const {
      data:
        existingResponse,

      error:
        responseLookupError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select('*')
        .eq(
          'request_id',
          bloodRequest.id
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      responseLookupError
    ) {
      console.error(
        'ACCEPT INVITATION RESPONSE LOOKUP ERROR:',
        responseLookupError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to prepare donor response.',
        });
    }

    let donorResponse =
      null;

    if (
      existingResponse
    ) {
      const {
        data:
          updatedResponse,

        error:
          responseUpdateError,
      } =
        await supabaseAdmin
          .from(
            'blood_request_responses'
          )
          .update({
            status:
              'accepted',

            message:
              invitation.message ||
              existingResponse.message ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            existingResponse.id
          )
          .select()
          .single();

      if (
        responseUpdateError
      ) {
        console.error(
          'ACCEPT INVITATION UPDATE RESPONSE ERROR:',
          responseUpdateError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to accept donor invitation.',
          });
      }

      donorResponse =
        updatedResponse;
    } else {
      const {
        data:
          createdResponse,

        error:
          responseInsertError,
      } =
        await supabaseAdmin
          .from(
            'blood_request_responses'
          )
          .insert({
            request_id:
              bloodRequest.id,

            donor_id:
              donorId,

            status:
              'accepted',

            message:
              invitation.message ||
              null,
          })
          .select()
          .single();

      if (
        responseInsertError
      ) {
        console.error(
          'ACCEPT INVITATION CREATE RESPONSE ERROR:',
          responseInsertError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to accept donor invitation.',
          });
      }

      donorResponse =
        createdResponse;
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updatedInvitation,

      error:
        invitationUpdateError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
        )
        .update({
          status:
            'accepted',

          responded_at:
            now,

          updated_at:
            now,
        })
        .eq(
          'id',
          invitation.id
        )
        .eq(
          'status',
          'pending'
        )
        .select()
        .maybeSingle();

    if (
      invitationUpdateError
    ) {
      console.error(
        'MARK DONOR INVITATION ACCEPTED ERROR:',
        invitationUpdateError
      );

      return res
        .status(500)
        .json({
          error:
            'The donor response was created, but the invitation status could not be updated.',
        });
    }

    if (
      !updatedInvitation
    ) {
      return res
        .status(409)
        .json({
          error:
            'This invitation is no longer pending.',
        });
    }

    setActivityEntity(
      res,
      'donor_invitation',
      updatedInvitation.id
    );

    await notifyRequesterInvitationAccepted(
      updatedInvitation,
      bloodRequest,
      donorResponse
    );

    return res
      .status(200)
      .json({
        message:
          'Donor invitation accepted successfully.',

        invitation:
          updatedInvitation,

        response:
          donorResponse,
      });
  } catch (
    error
  ) {
    console.error(
      'ACCEPT DONOR INVITATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error',
      });
  }
}

// ============================================================
// PATCH /api/donor-invitations/:invitationId/decline
// ============================================================

async function declineDonorInvitation(
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
            'Unauthorized',
        });
    }

    const invitationId =
      getInvitationId(
        req
      );

    if (
      !invitationId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invitation ID is required.',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_invitation',
      invitationId
    );

    const {
      data:
        invitation,

      error:
        invitationError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
        )
        .select('*')
        .eq(
          'id',
          invitationId
        )
        .eq(
          'donor_id',
          donorId
        )
        .maybeSingle();

    if (
      invitationError
    ) {
      console.error(
        'DECLINE DONOR INVITATION LOOKUP ERROR:',
        invitationError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor invitation.',
        });
    }

    if (
      !invitation
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor invitation not found.',
        });
    }

    setActivityEntity(
      res,
      'donor_invitation',
      invitation.id
    );

    if (
      invitation.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            invitation.status ===
              'accepted'
              ? 'An accepted invitation cannot be declined.'
              : 'Only pending donor invitations can be declined.',
        });
    }

    const {
      data:
        bloodRequest,

      error:
        requestError,
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
          invitation.request_id
        )
        .maybeSingle();

    if (
      requestError
    ) {
      console.error(
        'DECLINE INVITATION REQUEST LOOKUP ERROR:',
        requestError
      );
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updatedInvitation,

      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_invitations'
        )
        .update({
          status:
            'declined',

          responded_at:
            now,

          updated_at:
            now,
        })
        .eq(
          'id',
          invitation.id
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
        'DECLINE DONOR INVITATION ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to decline donor invitation.',
        });
    }

    if (
      !updatedInvitation
    ) {
      return res
        .status(409)
        .json({
          error:
            'This invitation is no longer pending.',
        });
    }

    setActivityEntity(
      res,
      'donor_invitation',
      updatedInvitation.id
    );

    if (
      bloodRequest
    ) {
      await notifyRequesterInvitationDeclined(
        updatedInvitation,
        bloodRequest
      );
    }

    return res
      .status(200)
      .json({
        message:
          'Donor invitation declined.',

        invitation:
          updatedInvitation,
      });
  } catch (
    error
  ) {
    console.error(
      'DECLINE DONOR INVITATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendDonorInvitation,
  getMyDonorInvitations,
  acceptDonorInvitation,
  declineDonorInvitation,
};