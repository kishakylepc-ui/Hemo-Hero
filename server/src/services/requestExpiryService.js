const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  createNotification,
  createNotifications
} = require(
  './notificationService'
);

const {
  closeOpenOffers
} = require(
  './requestClosingService'
);

// ============================================================
// REQUEST EXPIRY
//
// Active requests are closed once they're clearly past their
// time, so they stop showing to donors and the requester can
// post again:
//   - scheduled: 24 hours after the needed date and time
//   - urgent: 3 days after posting
//   - no date: 7 days after posting
//
// A request with a recorded donation becomes 'fulfilled' (blood
// was received); otherwise 'expired'. Open offers and
// invitations close, trips end, and the requester and involved
// donors are notified.
//
// Runs shortly after the server starts, then every 30 minutes.
// ============================================================

const SWEEP_INTERVAL_MS =
  30 * 60 * 1000;

const FIRST_SWEEP_DELAY_MS =
  15 * 1000;

const HOUR_MS =
  60 * 60 * 1000;

const SCHEDULED_GRACE_MS =
  24 * HOUR_MS;

const URGENT_MAX_AGE_MS =
  3 * 24 * HOUR_MS;

const UNDATED_MAX_AGE_MS =
  7 * 24 * HOUR_MS;

const BATCH_LIMIT =
  200;

let sweeping = false;

// The needed date and time (ms), or null when the request has
// no date. Dates and times are entered in Philippine time; no
// time means the end of that day.
function getNeededTime(
  request
) {
  if (!request.needed_date) {
    return null;
  }

  const time =
    request.needed_time
      ? String(request.needed_time).slice(0, 5)
      : '23:59';

  const needed =
    Date.parse(
      `${String(request.needed_date).slice(0, 10)}T${time}:00+08:00`
    );

  return Number.isFinite(needed)
    ? needed
    : null;
}

// When the request stops being worth showing (ms).
function getDeadline(
  request
) {
  const createdAt =
    Date.parse(
      request.created_at
    );

  if (
    request.urgency ===
    'urgent'
  ) {
    return createdAt +
      URGENT_MAX_AGE_MS;
  }

  const needed =
    getNeededTime(
      request
    );

  if (needed !== null) {
    return needed +
      SCHEDULED_GRACE_MS;
  }

  return createdAt +
    UNDATED_MAX_AGE_MS;
}

// Latest time the donor and requester can agree to meet (ms):
// a scheduled request's needed date and time; otherwise when the
// request closes (urgent: 3 days after posting).
function getScheduleLimit(
  request
) {
  if (
    request.urgency !==
    'urgent'
  ) {
    const needed =
      getNeededTime(
        request
      );

    if (needed !== null) {
      return needed;
    }
  }

  return getDeadline(
    request
  );
}

async function getDonorIds(
  requestId,
  status
) {
  const {
    data,
    error
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
        requestId
      )
      .eq(
        'status',
        status
      );

  if (error) {
    console.error(
      'EXPIRY DONOR LOOKUP ERROR:',
      error
    );

    return [];
  }

  return (data || [])
    .map(row => row.donor_id)
    .filter(Boolean);
}

// ============================================================
// CLOSE ONE REQUEST
// ============================================================

async function closeStaleRequest(
  request
) {
  const {
    data: donations,
    error: donationsError
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
        request.id
      )
      .neq(
        'status',
        'rejected'
      )
      .limit(1);

  if (donationsError) {
    console.error(
      'EXPIRY DONATION CHECK ERROR:',
      donationsError
    );

    return null;
  }

  const fulfilled =
    Boolean(
      donations?.length
    );

  const acceptedDonorIds =
    await getDonorIds(
      request.id,
      'accepted'
    );

  const now =
    new Date()
      .toISOString();

  // Only if it's still active (the requester may have just
  // closed it).
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
                'expired',

              expired_at:
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
      'EXPIRE REQUEST ERROR:',
      updateError
    );

    return null;
  }

  if (!updated?.length) {
    return null;
  }

  const closed =
    await closeOpenOffers(
      request.id
    );

  const donorIds = [
    ...new Set([
      ...acceptedDonorIds,
      ...closed.pendingDonorIds,
      ...closed.invitedDonorIds
    ])
  ];

  const type =
    fulfilled
      ? 'blood_request_fulfilled'
      : 'blood_request_expired';

  const baseData = {
    request_id:
      request.id,

    blood_type:
      request.blood_type,

    facility_name:
      request.facility_name,

    status:
      fulfilled
        ? 'fulfilled'
        : 'expired',

    closed_automatically:
      true
  };

  await createNotification({
    userId:
      request.requester_id,

    type,

    title:
      fulfilled
        ? 'Request Closed'
        : 'Request Expired',

    message:
      fulfilled
        ? `Your ${request.blood_type} request at ${request.facility_name} was closed after its needed date. Your recorded donations are saved.`
        : `Your ${request.blood_type} request at ${request.facility_name} passed its needed date and expired. You can post a new one if you still need blood.`,

    data: {
      ...baseData,

      recipient_role:
        'requester'
    }
  });

  if (donorIds.length) {
    await createNotifications(
      donorIds.map(
        donorId => ({
          userId:
            donorId,

          type,

          title:
            fulfilled
              ? 'Blood Request Fulfilled'
              : 'Request Expired',

          message:
            fulfilled
              ? `The ${request.blood_type} blood request at ${request.facility_name} has been fulfilled. Thank you for helping.`
              : `The ${request.blood_type} blood request at ${request.facility_name} expired and no longer needs donors.`,

          data: {
            ...baseData,

            recipient_role:
              'donor'
          }
        })
      )
    );
  }

  return fulfilled
    ? 'fulfilled'
    : 'expired';
}

// ============================================================
// SWEEP
// ============================================================

async function expireStaleRequests() {
  if (sweeping) {
    return {
      expired: 0,
      fulfilled: 0
    };
  }

  sweeping = true;

  const counts = {
    expired: 0,
    fulfilled: 0
  };

  try {
    const {
      data: requests,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(
          'id,requester_id,blood_type,facility_name,urgency,needed_date,needed_time,created_at'
        )
        .eq(
          'status',
          'active'
        )
        .order(
          'created_at',
          {
            ascending:
              true
          }
        )
        .limit(
          BATCH_LIMIT
        );

    if (error) {
      console.error(
        'EXPIRY LOOKUP ERROR:',
        error
      );

      return counts;
    }

    const now =
      Date.now();

    for (const request of requests || []) {
      if (getDeadline(request) > now) {
        continue;
      }

      const result =
        await closeStaleRequest(
          request
        );

      if (result) {
        counts[result] += 1;
      }
    }

    if (
      counts.expired ||
      counts.fulfilled
    ) {
      console.log(
        `Request expiry: ${counts.expired} expired, ${counts.fulfilled} closed as fulfilled.`
      );
    }
  } catch (error) {
    console.error(
      'REQUEST EXPIRY ERROR:',
      error
    );
  } finally {
    sweeping = false;
  }

  return counts;
}

function startRequestExpiry() {
  const first =
    setTimeout(
      expireStaleRequests,
      FIRST_SWEEP_DELAY_MS
    );

  const repeat =
    setInterval(
      expireStaleRequests,
      SWEEP_INTERVAL_MS
    );

  // Don't keep the process alive just for the sweep.
  first.unref?.();
  repeat.unref?.();
}

module.exports = {
  expireStaleRequests,
  startRequestExpiry,
  getDeadline,
  getScheduleLimit
};
