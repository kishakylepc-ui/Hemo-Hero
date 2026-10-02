const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  endedTripFields
} = require(
  './tripService'
);

// ============================================================
// CLOSE WHAT'S STILL OPEN ON A CLOSED REQUEST
//
// Used whenever a request stops being active (fulfilled,
// cancelled, removed by an admin, or expired):
//   - pending donor offers   -> 'rejected'
//   - pending invitations    -> 'cancelled'
//   - live "on my way" trips -> ended (location cleared)
//
// Returns the donors whose offer or invitation was closed so the
// caller can tell them. Never throws.
// ============================================================

async function closeOpenOffers(
  requestId
) {
  const now =
    new Date()
      .toISOString();

  const closed = {
    pendingDonorIds: [],
    invitedDonorIds: []
  };

  try {
    const {
      data: offers,
      error: offersError
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .update({
          status:
            'rejected',

          updated_at:
            now
        })
        .eq(
          'request_id',
          requestId
        )
        .eq(
          'status',
          'pending'
        )
        .select(
          'donor_id'
        );

    if (offersError) {
      console.error(
        'CLOSE PENDING OFFERS ERROR:',
        offersError
      );
    } else {
      closed.pendingDonorIds =
        (offers || [])
          .map(row => row.donor_id)
          .filter(Boolean);
    }

    const {
      data: invitations,
      error: invitationsError
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
          'request_id',
          requestId
        )
        .eq(
          'status',
          'pending'
        )
        .select(
          'donor_id'
        );

    if (invitationsError) {
      console.error(
        'CLOSE PENDING INVITATIONS ERROR:',
        invitationsError
      );
    } else {
      closed.invitedDonorIds =
        (invitations || [])
          .map(row => row.donor_id)
          .filter(Boolean);
    }

    const {
      error: tripsError
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update(
          endedTripFields()
        )
        .eq(
          'request_id',
          requestId
        )
        .neq(
          'status',
          'ended'
        );

    if (tripsError) {
      console.error(
        'END REQUEST TRIPS ERROR:',
        tripsError
      );
    }
  } catch (error) {
    console.error(
      'CLOSE OPEN OFFERS ERROR:',
      error
    );
  }

  return closed;
}

module.exports = {
  closeOpenOffers
};
