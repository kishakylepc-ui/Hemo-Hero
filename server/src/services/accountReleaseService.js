const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  createNotifications
} = require(
  './notificationService'
);

const {
  closeOpenOffers
} = require(
  './requestClosingService'
);

const {
  endTripForResponse
} = require(
  './tripService'
);

// ============================================================
// RELEASE A DEACTIVATED ACCOUNT
//
// A deactivated person can't sign in, so nothing they're part
// of should keep waiting on them. Runs after any deactivation
// (Users module, an Issue, or the person deleting their own
// account).
//
// As a donor (only on requests that are still active):
//   - pending offers                       -> 'withdrawn'
//   - accepted offers with no recorded
//     donation                             -> 'withdrawn'
//     (the request looks for donors again; trip ended)
//   - pending invitations                  -> 'cancelled'
//   Each requester is told.
//
// As a requester:
//   - active requests -> 'fulfilled' if a donation is already
//     recorded, otherwise 'cancelled'; open offers and
//     invitations close and trips end (closeOpenOffers).
//   The donors involved are told.
//
// An offer with a recorded donation is left as it is: that
// donation already happened. Activating the account again
// restores nothing.
//
// Never throws. Returns counts for the admin's message.
// ============================================================

const OPEN_OFFER_STATUSES = [
  'pending',
  'accepted'
];

function uniqueIds(
  values
) {
  return [
    ...new Set(
      (values || []).filter(Boolean)
    )
  ];
}

async function getFirstName(
  userId
) {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select(
        'first_name'
      )
      .eq(
        'id',
        userId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'RELEASE ACCOUNT NAME ERROR:',
      error
    );
  }

  return String(
    data?.first_name ||
    ''
  ).trim();
}

async function getRequestsById(
  requestIds
) {
  const ids =
    uniqueIds(
      requestIds
    );

  if (!ids.length) {
    return new Map();
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_requests'
      )
      .select(
        'id, requester_id, blood_type, facility_name, status'
      )
      .in(
        'id',
        ids
      );

  if (error) {
    console.error(
      'RELEASE ACCOUNT REQUEST LOOKUP ERROR:',
      error
    );

    return new Map();
  }

  return new Map(
    (data || []).map(
      request => [
        request.id,
        request
      ]
    )
  );
}

// Ids (response or request) that already have a donation that
// wasn't rejected, or null when the check failed (callers then
// leave those rows alone).
async function getIdsWithDonation(
  column,
  ids
) {
  if (!ids.length) {
    return new Set();
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_donations'
      )
      .select(
        column
      )
      .in(
        column,
        ids
      )
      .neq(
        'status',
        'rejected'
      );

  if (error) {
    console.error(
      'RELEASE ACCOUNT DONATION CHECK ERROR:',
      error
    );

    return null;
  }

  return new Set(
    (data || []).map(
      row => row[column]
    )
  );
}

// ============================================================
// AS A DONOR: OFFERS
// ============================================================

async function releaseDonorOffers(
  userId,
  result
) {
  const {
    data: offers,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_request_responses'
      )
      .select(
        'id, request_id, status'
      )
      .eq(
        'donor_id',
        userId
      )
      .in(
        'status',
        OPEN_OFFER_STATUSES
      );

  if (error) {
    console.error(
      'RELEASE ACCOUNT OFFERS ERROR:',
      error
    );

    return;
  }

  if (!offers?.length) {
    return;
  }

  const requests =
    await getRequestsById(
      offers.map(
        offer => offer.request_id
      )
    );

  const onActive =
    offers.filter(
      offer =>
        requests.get(
          offer.request_id
        )?.status ===
        'active'
    );

  const donated =
    await getIdsWithDonation(
      'response_id',
      onActive
        .filter(
          offer =>
            offer.status ===
            'accepted'
        )
        .map(
          offer => offer.id
        )
    );

  // If the check failed, only pending offers are released.
  const toRelease =
    onActive.filter(
      offer =>
        offer.status ===
          'pending' ||
        (
          donated &&
          !donated.has(
            offer.id
          )
        )
    );

  if (!toRelease.length) {
    return;
  }

  const {
    data: released,
    error: releaseError
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
      .in(
        'id',
        toRelease.map(
          offer => offer.id
        )
      )
      .in(
        'status',
        OPEN_OFFER_STATUSES
      )
      .select(
        'id'
      );

  if (releaseError) {
    console.error(
      'RELEASE ACCOUNT OFFER UPDATE ERROR:',
      releaseError
    );

    return;
  }

  const releasedIds =
    new Set(
      (released || []).map(
        row => row.id
      )
    );

  const releasedOffers =
    toRelease.filter(
      offer =>
        releasedIds.has(
          offer.id
        )
    );

  result.releasedOffers +=
    releasedOffers.length;

  for (const offer of releasedOffers) {
    if (
      offer.status ===
      'accepted'
    ) {
      await endTripForResponse(
        offer.id
      );
    }
  }

  const firstName =
    await getFirstName(
      userId
    );

  await createNotifications(
    releasedOffers.map(
      offer => {
        const request =
          requests.get(
            offer.request_id
          );

        const accepted =
          offer.status ===
          'accepted';

        return {
          userId:
            request.requester_id,

          type:
            'donor_response_withdrawn',

          title:
            accepted
              ? 'Donor No Longer Available'
              : 'Donor Response Withdrawn',

          message:
            accepted
              ? `${firstName || 'Your donor'} can no longer donate for your ${request.blood_type} request at ${request.facility_name}, so they were removed from it. Your request is open to other donors again.`
              : `A donor's offer for your ${request.blood_type} request at ${request.facility_name} is no longer available.`,

          data: {
            request_id:
              request.id,

            response_id:
              offer.id,

            donor_id:
              userId,

            recipient_role:
              'requester'
          }
        };
      }
    )
  );
}

// ============================================================
// AS A DONOR: INVITATIONS
// ============================================================

async function cancelDonorInvitations(
  userId,
  result
) {
  const now =
    new Date()
      .toISOString();

  const {
    data: invitations,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_request_invitations'
      )
      .update({
        status:
          'cancelled',

        responded_at:
          now,

        updated_at:
          now
      })
      .eq(
        'donor_id',
        userId
      )
      .eq(
        'status',
        'pending'
      )
      .select(
        'id, request_id, requester_id'
      );

  if (error) {
    console.error(
      'RELEASE ACCOUNT INVITATIONS ERROR:',
      error
    );

    return;
  }

  if (!invitations?.length) {
    return;
  }

  result.cancelledInvitations +=
    invitations.length;

  const requests =
    await getRequestsById(
      invitations.map(
        invitation => invitation.request_id
      )
    );

  await createNotifications(
    invitations
      .filter(
        invitation =>
          requests.has(
            invitation.request_id
          )
      )
      .map(
        invitation => {
          const request =
            requests.get(
              invitation.request_id
            );

          return {
            userId:
              invitation.requester_id,

            type:
              'system',

            title:
              'Donor Invitation Update',

            message:
              `The donor you invited for your ${request.blood_type} request at ${request.facility_name} is no longer available, so the invitation was cancelled.`,

            data: {
              kind:
                'donor_invitation_declined',

              invitation_id:
                invitation.id,

              request_id:
                request.id,

              donor_id:
                userId,

              blood_type:
                request.blood_type,

              facility_name:
                request.facility_name
            }
          };
        }
      )
  );
}

// ============================================================
// AS A REQUESTER: ACTIVE REQUESTS
// ============================================================

async function closeRequesterRequests(
  userId,
  result
) {
  const {
    data: requests,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_requests'
      )
      .select(
        'id, requester_id, blood_type, facility_name, status'
      )
      .eq(
        'requester_id',
        userId
      )
      .eq(
        'status',
        'active'
      );

  if (error) {
    console.error(
      'RELEASE ACCOUNT REQUESTS ERROR:',
      error
    );

    return;
  }

  if (!requests?.length) {
    return;
  }

  const fulfilledIds =
    await getIdsWithDonation(
      'request_id',
      requests.map(
        request => request.id
      )
    );

  // Can't tell fulfilled from cancelled, so leave them active.
  if (!fulfilledIds) {
    return;
  }

  for (const request of requests) {
    const fulfilled =
      fulfilledIds.has(
        request.id
      );

    // Accepted donors, looked up before anything changes.
    const {
      data: acceptedRows,
      error: acceptedError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select(
          'donor_id'
        )
        .eq(
          'request_id',
          request.id
        )
        .eq(
          'status',
          'accepted'
        );

    if (acceptedError) {
      console.error(
        'RELEASE ACCOUNT ACCEPTED DONORS ERROR:',
        acceptedError
      );
    }

    const now =
      new Date()
        .toISOString();

    const {
      data: updated,
      error: updateError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .update(
          fulfilled
            ? {
                status:
                  'fulfilled',

                fulfilled_at:
                  now
              }
            : {
                status:
                  'cancelled',

                cancelled_at:
                  now
              }
        )
        .eq(
          'id',
          request.id
        )
        .eq(
          'status',
          'active'
        )
        .select(
          'id'
        );

    if (updateError) {
      console.error(
        'RELEASE ACCOUNT CLOSE REQUEST ERROR:',
        updateError
      );

      continue;
    }

    if (!updated?.length) {
      continue;
    }

    result.closedRequests += 1;

    const closed =
      await closeOpenOffers(
        request.id
      );

    const donorIds =
      uniqueIds([
        ...(acceptedRows || []).map(
          row => row.donor_id
        ),

        ...closed.pendingDonorIds,
        ...closed.invitedDonorIds
      ]);

    await createNotifications(
      donorIds.map(
        donorId => ({
          userId:
            donorId,

          type:
            fulfilled
              ? 'blood_request_fulfilled'
              : 'blood_request_cancelled',

          title:
            'Blood Request Closed',

          message:
            fulfilled
              ? `The ${request.blood_type} request at ${request.facility_name} was closed because the requester can no longer use Hemo-Hero. Recorded donations are saved, and no one else needs to go.`
              : `The ${request.blood_type} request at ${request.facility_name} was closed because the requester can no longer use Hemo-Hero. You don't need to go.`,

          data: {
            request_id:
              request.id,

            blood_type:
              request.blood_type,

            facility_name:
              request.facility_name,

            status:
              fulfilled
                ? 'fulfilled'
                : 'cancelled',

            recipient_role:
              'donor'
          }
        })
      )
    );
  }
}

// ============================================================
// RUN ALL
// ============================================================

async function releaseDeactivatedAccount(
  userId
) {
  const result = {
    releasedOffers: 0,
    cancelledInvitations: 0,
    closedRequests: 0
  };

  if (!userId) {
    return result;
  }

  const steps = [
    releaseDonorOffers,
    cancelDonorInvitations,
    closeRequesterRequests
  ];

  // Each step on its own, so one failure doesn't stop the rest.
  for (const step of steps) {
    try {
      await step(
        userId,
        result
      );
    } catch (error) {
      console.error(
        'RELEASE ACCOUNT ERROR:',
        error
      );
    }
  }

  return result;
}

// "1 offer released and 2 requests closed." or '' when nothing
// was open.
function describeRelease(
  result
) {
  const plural = (count, word) =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

  const parts = [];

  if (result?.releasedOffers) {
    parts.push(
      `${plural(result.releasedOffers, 'offer')} released`
    );
  }

  if (result?.cancelledInvitations) {
    parts.push(
      `${plural(result.cancelledInvitations, 'invitation')} cancelled`
    );
  }

  if (result?.closedRequests) {
    parts.push(
      `${plural(result.closedRequests, 'request')} closed`
    );
  }

  if (!parts.length) {
    return '';
  }

  const last =
    parts.pop();

  return `${parts.length ? `${parts.join(', ')} and ${last}` : last}.`;
}

module.exports = {
  releaseDeactivatedAccount,
  describeRelease
};
