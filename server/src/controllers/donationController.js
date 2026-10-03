const {
  supabaseAdmin
} =
  require('../config/supabase');

const {
  createNotification,
  createNotifications,
  notifyAdmins
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
  areRedBloodCellsCompatible
} =
  require(
    '../utils/bloodCompatibility'
  );

const {
  endTripForResponse
} =
  require(
    '../services/tripService'
  );

// ============================================================
// BLOOD DONATIONS (TRANSACTION RECORD)
//
// The last steps of the blood request transaction cycle:
//
//   Requester  confirms the accepted donor's donation.
//              The server runs automatic checks:
//                all pass -> 'completed' (recorded right away,
//                            donor's last donation date updated)
//                any fail -> 'needs_review'
//   Donor      may report a problem -> 'needs_review'
//   Both       leave feedback about the transaction
//   Admin      reviews ONLY flagged records:
//                mark valid -> 'completed'
//                reject     -> 'rejected' (note required; donor
//                              history change is undone)
// ============================================================

const DONATION_STATUSES = [
  'completed',
  'needs_review',
  'rejected'
];

// Whole-blood donors can usually donate again after ~3 months
// (shared with offers and invitations).
const {
  ELIGIBILITY_DAYS
} = require(
  '../services/eligibilityService'
);

// A donor gives one bag (450 mL) per donation (Philippine Red
// Cross). A request that needs more bags needs more donors.
const BAGS_PER_DONATION = 1;

const DAY_MS =
  24 * 60 * 60 * 1000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const USER_FIELDS = `
  id,
  email,
  first_name,
  middle_name,
  last_name,
  suffix,
  phone,
  barangay,
  city,
  province,
  blood_type,
  profile_photo_url,
  is_active
`;

// Plain-language reasons shown to admins and in notifications.
const REVIEW_REASON_LABELS = {
  donor_not_verified:
    'the donor is no longer a verified donor',

  blood_type_incompatible:
    'the donor\'s blood type is not compatible with the request',

  interval_under_90_days:
    'the donor donated less than 90 days before this donation',

  donor_disputed:
    'the donor reported a problem with this record'
};

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

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function getFullName(
  user
) {
  if (!user) {
    return null;
  }

  const name =
    [
      user.first_name,
      user.last_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  return (
    name ||
    user.email ||
    null
  );
}

function describeReasons(
  reasons
) {
  return (reasons || [])
    .map(
      reason =>
        REVIEW_REASON_LABELS[reason] ||
        reason
    )
    .join('; ');
}

// Calendar date of a timestamp in the Philippines (YYYY-MM-DD).
function toManilaDate(
  value
) {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Manila',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit'
    }
  ).format(
    new Date(value)
  );
}

function formatManilaDate(
  value
) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone:
        'Asia/Manila',

      month:
        'short',

      day:
        'numeric',

      year:
        'numeric'
    }
  ).format(
    new Date(value)
  );
}

function addDays(
  value,
  days
) {
  const date =
    new Date(value);

  date.setDate(
    date.getDate() +
      days
  );

  return date;
}

// Whole days between two YYYY-MM-DD dates (b - a).
function daysBetweenDates(
  a,
  b
) {
  return Math.round(
    (
      new Date(`${b}T00:00:00Z`).getTime() -
      new Date(`${a}T00:00:00Z`).getTime()
    ) /
      DAY_MS
  );
}

// Loads public.users rows for the given ids -> Map(id -> user).
async function loadUsers(
  ids
) {
  const uniqueIds =
    [
      ...new Set(
        (ids || [])
          .filter(Boolean)
      )
    ];

  if (
    uniqueIds.length ===
    0
  ) {
    return new Map();
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select(
        USER_FIELDS
      )
      .in(
        'id',
        uniqueIds
      );

  if (error) {
    console.error(
      'DONATION USERS LOOKUP ERROR:',
      error
    );

    return new Map();
  }

  return new Map(
    (data || []).map(
      user => [
        user.id,
        user
      ]
    )
  );
}

// Feedback rows for the given donations -> Map(donation_id -> rows).
async function loadFeedback(
  donationIds
) {
  const ids =
    [
      ...new Set(
        (donationIds || [])
          .filter(Boolean)
      )
    ];

  if (
    ids.length ===
    0
  ) {
    return new Map();
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'donation_feedback'
      )
      .select(`
        id,
        donation_id,
        from_user_id,
        to_user_id,
        from_role,
        rating,
        comment,
        created_at,
        updated_at
      `)
      .in(
        'donation_id',
        ids
      )
      .order(
        'created_at',
        {
          ascending:
            true
        }
      );

  if (error) {
    console.error(
      'DONATION FEEDBACK LOOKUP ERROR:',
      error
    );

    return new Map();
  }

  const grouped =
    new Map();

  for (const row of data || []) {
    const list =
      grouped.get(
        row.donation_id
      ) ||
      [];

    list.push(row);

    grouped.set(
      row.donation_id,
      list
    );
  }

  return grouped;
}

function buildDonationSummary(
  donations,
  unitsNeeded = null
) {
  const recorded =
    donations.filter(
      donation =>
        donation.status !==
        'rejected'
    );

  const completed =
    donations.filter(
      donation =>
        donation.status ===
        'completed'
    );

  const sumUnits =
    rows =>
      rows.reduce(
        (
          total,
          donation
        ) =>
          total +
          (Number(
            donation.units_donated
          ) || 0),
        0
      );

  return {
    units_needed:
      unitsNeeded,

    recorded_count:
      recorded.length,

    recorded_units:
      sumUnits(recorded),

    completed_count:
      completed.length,

    completed_units:
      sumUnits(completed),

    needs_review_count:
      donations.filter(
        donation =>
          donation.status ===
          'needs_review'
      ).length,

    rejected_count:
      donations.filter(
        donation =>
          donation.status ===
          'rejected'
      ).length
  };
}

// ============================================================
// AUTOMATIC CHECKS
//
// Run when the requester confirms a donation. Any failed
// check sends the record to admin review instead of
// completing it.
// ============================================================

async function runDonationChecks({
  donorId,
  requestBloodType,
  donatedAt
}) {
  const reasons = [];

  const {
    data:
      application,
    error
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select(
        'status,blood_type,last_donation_date'
      )
      .eq(
        'user_id',
        donorId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'DONATION CHECK APPLICATION ERROR:',
      error
    );

    throw new Error(
      'Unable to check the donor\'s record.'
    );
  }

  if (
    !application ||
    application.status !==
      'approved'
  ) {
    reasons.push(
      'donor_not_verified'
    );
  }

  if (
    application &&
    !areRedBloodCellsCompatible(
      requestBloodType,
      application.blood_type
    )
  ) {
    reasons.push(
      'blood_type_incompatible'
    );
  }

  if (
    application?.last_donation_date
  ) {
    const days =
      daysBetweenDates(
        String(
          application.last_donation_date
        ).slice(0, 10),
        toManilaDate(
          donatedAt
        )
      );

    if (
      days > 0 &&
      days <
        ELIGIBILITY_DAYS
    ) {
      reasons.push(
        'interval_under_90_days'
      );
    }
  }

  return reasons;
}

// ============================================================
// DONOR HISTORY
//
// A completed record becomes the donor's latest donation, so
// the "next donation" date in the app stays accurate. The
// previous values are saved on the record so a later
// rejection can undo the change.
// ============================================================

async function applyDonorHistory(
  donation
) {
  if (
    !donation.donor_id ||
    donation.donor_history_applied
  ) {
    return donation;
  }

  const {
    data:
      application,
    error
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select(`
        has_donated_before,
        last_donation_date,
        last_donation_month,
        last_donation_year
      `)
      .eq(
        'user_id',
        donation.donor_id
      )
      .maybeSingle();

  if (
    error ||
    !application
  ) {
    if (error) {
      console.error(
        'DONOR HISTORY LOOKUP ERROR:',
        error
      );
    }

    return donation;
  }

  const donatedDate =
    toManilaDate(
      donation.donated_at
    );

  // Never move an existing later date backwards.
  if (
    application.last_donation_date &&
    String(
      application.last_donation_date
    ).slice(0, 10) >=
      donatedDate
  ) {
    return donation;
  }

  const {
    error:
      updateError
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .update({
        has_donated_before:
          true,

        last_donation_date:
          donatedDate,

        // An exact date replaces any approximate month/year.
        last_donation_month:
          null,

        last_donation_year:
          null
      })
      .eq(
        'user_id',
        donation.donor_id
      );

  if (updateError) {
    console.error(
      'DONOR HISTORY UPDATE ERROR:',
      updateError
    );

    return donation;
  }

  const {
    data:
      updatedDonation,
    error:
      flagError
  } =
    await supabaseAdmin
      .from(
        'blood_donations'
      )
      .update({
        donor_history_applied:
          true,

        previous_donor_history: {
          has_donated_before:
            application.has_donated_before,

          last_donation_date:
            application.last_donation_date,

          last_donation_month:
            application.last_donation_month,

          last_donation_year:
            application.last_donation_year
        }
      })
      .eq(
        'id',
        donation.id
      )
      .select()
      .maybeSingle();

  if (flagError) {
    console.error(
      'DONOR HISTORY FLAG ERROR:',
      flagError
    );
  }

  return (
    updatedDonation ||
    donation
  );
}

async function revertDonorHistory(
  donation
) {
  if (
    !donation.donor_id ||
    !donation.donor_history_applied
  ) {
    return;
  }

  const {
    data:
      application,
    error
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select(
        'last_donation_date'
      )
      .eq(
        'user_id',
        donation.donor_id
      )
      .maybeSingle();

  if (
    error ||
    !application
  ) {
    return;
  }

  // Only undo when a later donation has not replaced it.
  if (
    String(
      application.last_donation_date ||
        ''
    ).slice(0, 10) ===
      toManilaDate(
        donation.donated_at
      ) &&
    donation.previous_donor_history
  ) {
    const previous =
      donation.previous_donor_history;

    const {
      error:
        restoreError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .update({
          has_donated_before:
            previous.has_donated_before ??
            false,

          last_donation_date:
            previous.last_donation_date ||
            null,

          last_donation_month:
            previous.last_donation_month ||
            null,

          last_donation_year:
            previous.last_donation_year ||
            null
        })
        .eq(
          'user_id',
          donation.donor_id
        );

    if (restoreError) {
      console.error(
        'DONOR HISTORY RESTORE ERROR:',
        restoreError
      );

      return;
    }
  }

  await supabaseAdmin
    .from(
      'blood_donations'
    )
    .update({
      donor_history_applied:
        false
    })
    .eq(
      'id',
      donation.id
    );
}

// ============================================================
// POST /api/requests/:id/responses/:responseId/donation
//
// REQUEST OWNER ONLY
//
// Confirms that an accepted donor donated at the facility.
//
// Body:
// {
//   units_donated?: number   (must be 1: one bag per donor)
//   donated_at?:    ISO date (default now, never in the future)
//   note?:          string   (max 500)
// }
// ============================================================

async function recordDonation(
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
      cleanText(
        req.params.id
      );

    const responseId =
      cleanText(
        req.params.responseId
      );

    if (
      !requestId ||
      !responseId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Request ID and donor offer ID are required.'
        });
    }

    // --------------------------------------------------------
    // REQUEST (must belong to the requester and be active)
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
          units_needed,
          facility_name,
          created_at
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
        'RECORD DONATION REQUEST LOOKUP ERROR:',
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

    if (
      bloodRequest.status !==
      'active'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Donations can only be confirmed while the blood request is active.'
        });
    }

    // --------------------------------------------------------
    // DONOR OFFER (must be accepted)
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
        .select(
          'id,request_id,donor_id,status'
        )
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
        'RECORD DONATION RESPONSE LOOKUP ERROR:',
        responseError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor offer.'
        });
    }

    if (!response) {
      return res
        .status(404)
        .json({
          error:
            'Donor offer not found.'
        });
    }

    if (
      response.status !==
      'accepted'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only accepted donors can have a donation confirmed.'
        });
    }

    // --------------------------------------------------------
    // ALREADY CONFIRMED?
    // --------------------------------------------------------

    const {
      data:
        existingDonations,
      error:
        existingError
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id'
        )
        .eq(
          'response_id',
          responseId
        )
        .neq(
          'status',
          'rejected'
        )
        .limit(1);

    if (existingError) {
      console.error(
        'RECORD DONATION EXISTING LOOKUP ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to check existing donations.'
        });
    }

    if (
      existingDonations?.length
    ) {
      return res
        .status(409)
        .json({
          error:
            'A donation has already been confirmed for this donor.'
        });
    }

    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

    const unitsDonated =
      req.body?.units_donated ===
        undefined ||
      req.body?.units_donated ===
        null
        ? BAGS_PER_DONATION
        : Number(
            req.body.units_donated
          );

    if (
      unitsDonated !==
      BAGS_PER_DONATION
    ) {
      return res
        .status(400)
        .json({
          error:
            'Each donor gives one bag (450 mL) per donation.'
        });
    }

    const donatedAtText =
      cleanText(
        req.body
          ?.donated_at
      );

    const donatedAt =
      donatedAtText
        ? new Date(
            donatedAtText
          )
        : new Date();

    if (
      Number.isNaN(
        donatedAt.getTime()
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid donation date.'
        });
    }

    // Small allowance for phone clock differences.
    if (
      donatedAt.getTime() >
      Date.now() +
        5 *
          60 *
          1000
    ) {
      return res
        .status(400)
        .json({
          error:
            'The donation date cannot be in the future.'
        });
    }

    // One day of slack for date-only picks across time zones.
    if (
      donatedAt.getTime() <
      new Date(
        bloodRequest.created_at
      ).getTime() -
        DAY_MS
    ) {
      return res
        .status(400)
        .json({
          error:
            'The donation date cannot be before the request was posted.'
        });
    }

    const note =
      cleanText(
        req.body?.note
      );

    if (
      note &&
      note.length >
        500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Note must not exceed 500 characters.'
        });
    }

    // --------------------------------------------------------
    // AUTOMATIC CHECKS
    // --------------------------------------------------------

    const reviewReasons =
      await runDonationChecks({
        donorId:
          response.donor_id,

        requestBloodType:
          bloodRequest.blood_type,

        donatedAt
      });

    const status =
      reviewReasons.length >
      0
        ? 'needs_review'
        : 'completed';

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const users =
      await loadUsers([
        response.donor_id,
        requesterId
      ]);

    const donorName =
      getFullName(
        users.get(
          response.donor_id
        )
      ) ||
      'Hemo-Hero Donor';

    const requesterName =
      getFullName(
        users.get(
          requesterId
        )
      ) ||
      'Hemo-Hero User';

    const {
      data:
        insertedDonation,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .insert({
          request_id:
            requestId,

          response_id:
            responseId,

          donor_id:
            response.donor_id,

          requester_id:
            requesterId,

          donor_name:
            donorName,

          requester_name:
            requesterName,

          blood_type:
            bloodRequest.blood_type,

          facility_name:
            bloodRequest.facility_name ||
            null,

          units_donated:
            unitsDonated,

          donated_at:
            donatedAt.toISOString(),

          requester_note:
            note,

          status,

          review_reasons:
            reviewReasons
        })
        .select()
        .single();

    if (insertError) {
      // Unique index: one completed/under-review record per offer.
      if (
        insertError.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            error:
              'A donation has already been confirmed for this donor.'
          });
      }

      console.error(
        'RECORD DONATION INSERT ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to confirm the donation.'
        });
    }

    setActivityEntity(
      res,
      'blood_donation',
      insertedDonation.id
    );

    const donation =
      status === 'completed'
        ? await applyDonorHistory(
            insertedDonation
          )
        : insertedDonation;

    // The donor made it: stop sharing their location.
    await endTripForResponse(
      responseId
    );

    // --------------------------------------------------------
    // NOTIFY DONOR (+ ADMINS only when flagged)
    // --------------------------------------------------------

    const nextEligibleAt =
      addDays(
        donation.donated_at,
        ELIGIBILITY_DAYS
      );

    await createNotification({
      userId:
        response.donor_id,

      type:
        'donation_recorded',

      title:
        status === 'completed'
          ? 'Donation Recorded'
          : 'Donation Confirmed',

      message:
        status === 'completed'
          ? `Thank you, hero! ${requesterName} confirmed your ${bloodRequest.blood_type} donation at ${bloodRequest.facility_name}. It is now on your donation record. You can donate again from ${formatManilaDate(
              nextEligibleAt
            )}. Tap to share feedback.`
          : `${requesterName} confirmed your ${bloodRequest.blood_type} donation at ${bloodRequest.facility_name}. Hemo-Hero will review the record shortly.`,

      data: {
        request_id:
          requestId,

        response_id:
          responseId,

        donation_id:
          donation.id,

        status,

        recipient_role:
          'donor'
      }
    });

    if (
      status ===
      'needs_review'
    ) {
      await notifyAdmins({
        type:
          'admin_donation_flagged',

        title:
          'Donation Needs Review',

        message:
          `${donorName}'s ${bloodRequest.blood_type} donation at ${bloodRequest.facility_name} was flagged: ${describeReasons(
            reviewReasons
          )}.`,

        data: {
          route:
            `/donations/${donation.id}`,

          donation_id:
            donation.id,

          request_id:
            requestId
        }
      });
    }

    return res
      .status(201)
      .json({
        message:
          status === 'completed'
            ? 'Donation recorded.'
            : 'Donation confirmed. Hemo-Hero will review the record.',

        donation
      });
  } catch (error) {
    console.error(
      'RECORD DONATION ERROR:',
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
// SHARED: LOAD A DONATION FOR A PARTICIPANT
//
// Used by feedback and dispute. Returns null after sending an
// error response.
// ============================================================

async function getParticipantDonation(
  req,
  res
) {
  const userId =
    getAuthenticatedUserId(
      req
    );

  if (!userId) {
    res
      .status(401)
      .json({
        error:
          'Unauthorized'
      });

    return null;
  }

  const requestId =
    cleanText(
      req.params.id
    );

  const donationId =
    cleanText(
      req.params.donationId
    );

  if (
    !requestId ||
    !donationId ||
    !UUID_PATTERN.test(
      donationId
    )
  ) {
    res
      .status(400)
      .json({
        error:
          'Invalid donation.'
      });

    return null;
  }

  setActivityEntity(
    res,
    'blood_donation',
    donationId
  );

  const {
    data:
      donation,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_donations'
      )
      .select('*')
      .eq(
        'id',
        donationId
      )
      .eq(
        'request_id',
        requestId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'PARTICIPANT DONATION LOOKUP ERROR:',
      error
    );

    res
      .status(500)
      .json({
        error:
          'Unable to retrieve donation.'
      });

    return null;
  }

  if (
    !donation ||
    (
      donation.donor_id !==
        userId &&
      donation.requester_id !==
        userId
    )
  ) {
    res
      .status(404)
      .json({
        error:
          'Donation not found.'
      });

    return null;
  }

  return {
    userId,

    donation,

    role:
      donation.donor_id ===
      userId
        ? 'donor'
        : 'requester'
  };
}

// ============================================================
// POST /api/requests/:id/donations/:donationId/feedback
//
// DONOR OR REQUESTER of the donation
//
// Body: { rating: 1-5, comment?: string (max 500) }
//
// One feedback per side; sending again updates it.
// ============================================================

async function submitDonationFeedback(
  req,
  res
) {
  try {
    const context =
      await getParticipantDonation(
        req,
        res
      );

    if (!context) {
      return;
    }

    const {
      userId,
      donation,
      role
    } = context;

    if (
      donation.status ===
      'rejected'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Feedback cannot be added to a rejected donation record.'
        });
    }

    const rating =
      Number(
        req.body?.rating
      );

    if (
      !Number.isInteger(
        rating
      ) ||
      rating < 1 ||
      rating > 5
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please choose a rating from 1 to 5 stars.'
        });
    }

    const comment =
      cleanText(
        req.body?.comment
      );

    if (
      comment &&
      comment.length >
        500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Feedback must not exceed 500 characters.'
        });
    }

    const toUserId =
      role === 'donor'
        ? donation.requester_id
        : donation.donor_id;

    // Only notify the other side the first time.
    const {
      data:
        existing
    } =
      await supabaseAdmin
        .from(
          'donation_feedback'
        )
        .select(
          'id'
        )
        .eq(
          'donation_id',
          donation.id
        )
        .eq(
          'from_role',
          role
        )
        .maybeSingle();

    const {
      data:
        feedback,
      error
    } =
      await supabaseAdmin
        .from(
          'donation_feedback'
        )
        .upsert(
          {
            donation_id:
              donation.id,

            request_id:
              donation.request_id,

            from_user_id:
              userId,

            to_user_id:
              toUserId,

            from_role:
              role,

            rating,

            comment,

            updated_at:
              new Date()
                .toISOString()
          },
          {
            onConflict:
              'donation_id,from_role'
          }
        )
        .select()
        .single();

    if (error) {
      console.error(
        'DONATION FEEDBACK SAVE ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to save your feedback.'
        });
    }

    if (
      !existing &&
      toUserId
    ) {
      const fromName =
        role === 'donor'
          ? donation.donor_name ||
            'Your donor'
          : donation.requester_name ||
            'The requester';

      await createNotification({
        userId:
          toUserId,

        type:
          'donation_feedback_received',

        title:
          'New Feedback',

        message:
          `${fromName} rated your ${donation.blood_type} donation transaction ${rating}/5${
            comment
              ? `: "${comment}"`
              : '.'
          }`,

        data: {
          request_id:
            donation.request_id,

          donation_id:
            donation.id,

          rating,

          recipient_role:
            role === 'donor'
              ? 'requester'
              : 'donor'
        }
      });
    }

    return res
      .status(200)
      .json({
        message:
          existing
            ? 'Your feedback was updated.'
            : 'Thank you for your feedback.',

        feedback
      });
  } catch (error) {
    console.error(
      'SUBMIT DONATION FEEDBACK ERROR:',
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
// POST /api/requests/:id/donations/:donationId/dispute
//
// DONOR ONLY
//
// "This record isn't right" - sends a completed record to
// admin review. Body: { note: string (5-500) }
// ============================================================

async function disputeDonation(
  req,
  res
) {
  try {
    const context =
      await getParticipantDonation(
        req,
        res
      );

    if (!context) {
      return;
    }

    const {
      donation,
      role
    } = context;

    if (
      role !==
      'donor'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Only the donor can report a problem with this record.'
        });
    }

    if (
      donation.status !==
      'completed'
    ) {
      return res
        .status(409)
        .json({
          error:
            donation.status ===
            'needs_review'
              ? 'This record is already being reviewed by Hemo-Hero.'
              : 'This record has already been rejected.'
        });
    }

    const note =
      cleanText(
        req.body?.note
      );

    if (
      !note ||
      note.length <
        5
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please tell us what is wrong with this record.'
        });
    }

    if (
      note.length >
      500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Your note must not exceed 500 characters.'
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updated,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .update({
          status:
            'needs_review',

          review_reasons:
            [
              ...new Set([
                ...(donation.review_reasons ||
                  []),
                'donor_disputed'
              ])
            ],

          dispute_note:
            note,

          disputed_at:
            now,

          updated_at:
            now
        })
        .eq(
          'id',
          donation.id
        )
        .eq(
          'status',
          'completed'
        )
        .select()
        .maybeSingle();

    if (error) {
      console.error(
        'DISPUTE DONATION ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to report this problem.'
        });
    }

    if (!updated) {
      return res
        .status(409)
        .json({
          error:
            'This record changed. Please refresh and try again.'
        });
    }

    await createNotification({
      userId:
        updated.requester_id,

      type:
        'donation_disputed',

      title:
        'Donation Under Review',

      message:
        `${updated.donor_name || 'The donor'} reported a problem with the ${updated.blood_type} donation record. Hemo-Hero will review it.`,

      data: {
        request_id:
          updated.request_id,

        donation_id:
          updated.id,

        status:
          'needs_review',

        recipient_role:
          'requester'
      }
    });

    await notifyAdmins({
      type:
        'admin_donation_flagged',

      title:
        'Donation Disputed',

      message:
        `${updated.donor_name || 'A donor'} reported a problem with a ${updated.blood_type} donation record at ${updated.facility_name}.`,

      data: {
        route:
          `/donations/${updated.id}`,

        donation_id:
          updated.id,

        request_id:
          updated.request_id
      }
    });

    return res
      .status(200)
      .json({
        message:
          'Thanks for letting us know. Hemo-Hero will review this record.',

        donation:
          updated
      });
  } catch (error) {
    console.error(
      'DISPUTE DONATION ERROR:',
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
// GET /api/requests/:id/donations
//
// Request owner -> every donation on the request
// Donor         -> only their own donation on the request
//
// Each donation includes the feedback both sides left.
// ============================================================

async function getRequestDonations(
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
      cleanText(
        req.params.id
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
        bloodRequest,
      error:
        requestError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(
          'id,requester_id,units_needed,status'
        )
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (requestError) {
      console.error(
        'REQUEST DONATIONS LOOKUP ERROR:',
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

    const isOwner =
      bloodRequest.requester_id ===
      userId;

    // A donor may only see donations for a request they
    // offered to help with.
    if (!isOwner) {
      const {
        data:
          ownResponses,
        error:
          ownResponseError
      } =
        await supabaseAdmin
          .from(
            'blood_request_responses'
          )
          .select(
            'id'
          )
          .eq(
            'request_id',
            requestId
          )
          .eq(
            'donor_id',
            userId
          )
          .limit(1);

      if (ownResponseError) {
        console.error(
          'REQUEST DONATIONS ACCESS CHECK ERROR:',
          ownResponseError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to retrieve donations.'
          });
      }

      if (
        !ownResponses?.length
      ) {
        return res
          .status(404)
          .json({
            error:
              'Blood request not found.'
          });
      }
    }

    let donationQuery =
      supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(`
          id,
          request_id,
          response_id,
          donor_id,
          requester_id,
          donor_name,
          requester_name,
          blood_type,
          facility_name,
          units_donated,
          donated_at,
          requester_note,
          status,
          review_reasons,
          admin_note,
          dispute_note,
          verified_at,
          created_at,
          updated_at
        `)
        .eq(
          'request_id',
          requestId
        );

    if (!isOwner) {
      donationQuery =
        donationQuery.eq(
          'donor_id',
          userId
        );
    }

    const {
      data:
        donations,
      error:
        donationsError
    } =
      await donationQuery.order(
        'created_at',
        {
          ascending:
            false
        }
      );

    if (donationsError) {
      console.error(
        'REQUEST DONATIONS ERROR:',
        donationsError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donations.'
        });
    }

    const rows =
      donations ||
      [];

    const feedback =
      await loadFeedback(
        rows.map(
          donation =>
            donation.id
        )
      );

    return res
      .status(200)
      .json({
        donations:
          rows.map(
            donation => ({
              ...donation,

              next_eligible_at:
                addDays(
                  donation.donated_at,
                  ELIGIBILITY_DAYS
                ).toISOString(),

              feedback:
                (
                  feedback.get(
                    donation.id
                  ) ||
                  []
                ).map(
                  item => ({
                    from_role:
                      item.from_role,

                    rating:
                      item.rating,

                    comment:
                      item.comment,

                    created_at:
                      item.created_at,

                    updated_at:
                      item.updated_at
                  })
                )
            })
          ),

        summary:
          buildDonationSummary(
            rows,
            Number(
              bloodRequest.units_needed
            ) || null
          )
      });
  } catch (error) {
    console.error(
      'GET REQUEST DONATIONS ERROR:',
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
// GET /api/donations/me
//
// The signed-in user's donation history in both roles:
// donations they gave (role 'donor') and donations they
// received for their requests (role 'requester'), each with
// the feedback both sides left.
//
// The summary (and 90-day eligibility) counts only donations
// the user gave.
// ============================================================

async function getMyDonations(
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

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(`
          id,
          request_id,
          response_id,
          donor_id,
          requester_id,
          donor_name,
          requester_name,
          blood_type,
          facility_name,
          units_donated,
          donated_at,
          status,
          review_reasons,
          admin_note,
          created_at
        `)
        .or(
          `donor_id.eq.${userId},requester_id.eq.${userId}`
        )
        .order(
          'donated_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      console.error(
        'MY DONATIONS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve your donations.'
        });
    }

    const rows =
      data ||
      [];

    const feedbackByDonation =
      await loadFeedback(
        rows.map(
          donation =>
            donation.id
        )
      );

    const donations =
      rows.map(
        donation => ({
          ...donation,

          role:
            donation.donor_id ===
            userId
              ? 'donor'
              : 'requester',

          feedback:
            (
              feedbackByDonation.get(
                donation.id
              ) ||
              []
            ).map(
              row => ({
                from_role:
                  row.from_role,

                rating:
                  row.rating,

                comment:
                  row.comment,

                created_at:
                  row.created_at,

                updated_at:
                  row.updated_at
              })
            )
        })
      );

    const given =
      donations.filter(
        donation =>
          donation.role ===
          'donor'
      );

    const lastCompleted =
      given.find(
        donation =>
          donation.status ===
          'completed'
      ) ||
      null;

    return res
      .status(200)
      .json({
        donations,

        summary: {
          ...buildDonationSummary(
            given
          ),

          received_count:
            donations.length -
            given.length,

          last_completed_at:
            lastCompleted
              ?.donated_at ||
            null,

          next_eligible_at:
            lastCompleted
              ? addDays(
                  lastCompleted.donated_at,
                  ELIGIBILITY_DAYS
                ).toISOString()
              : null
        }
      });
  } catch (error) {
    console.error(
      'GET MY DONATIONS ERROR:',
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
// ADMIN: SUMMARY
//
// GET /api/admin/donations/summary
// ============================================================

async function buildAdminSummary(
  donations
) {
  const summary =
    buildDonationSummary(
      donations
    );

  const {
    data:
      ratings,
    error
  } =
    await supabaseAdmin
      .from(
        'donation_feedback'
      )
      .select(
        'rating'
      );

  if (error) {
    console.error(
      'ADMIN FEEDBACK SUMMARY ERROR:',
      error
    );
  }

  const ratingRows =
    ratings ||
    [];

  const averageRating =
    ratingRows.length > 0
      ? Math.round(
          (
            ratingRows.reduce(
              (
                total,
                row
              ) =>
                total +
                (Number(
                  row.rating
                ) || 0),
              0
            ) /
            ratingRows.length
          ) *
            10
        ) / 10
      : null;

  return {
    total:
      donations.length,

    completed:
      summary.completed_count,

    needs_review:
      summary.needs_review_count,

    rejected:
      summary.rejected_count,

    completed_units:
      summary.completed_units,

    feedback_count:
      ratingRows.length,

    average_rating:
      averageRating
  };
}

async function getAdminDonationSummary(
  req,
  res
) {
  try {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id,status,units_donated'
        );

    if (error) {
      console.error(
        'ADMIN DONATION SUMMARY ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donation summary.'
        });
    }

    return res
      .status(200)
      .json({
        summary:
          await buildAdminSummary(
            data || []
          )
      });
  } catch (error) {
    console.error(
      'ADMIN DONATION SUMMARY ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load donation summary.'
      });
  }
}

// ============================================================
// ADMIN: LIST (every recorded transaction)
//
// GET /api/admin/donations
//
// ?page=1
// &limit=20
// &status=all|completed|needs_review|rejected
// &search=text   (donor, requester, facility, blood type)
// ============================================================

async function getAdminDonations(
  req,
  res
) {
  try {
    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const limit =
      Math.min(
        parsePositiveInteger(
          req.query.limit,
          20
        ),
        100
      );

    const requestedStatus =
      (
        cleanText(
          req.query.status
        ) || ''
      ).toLowerCase();

    const status =
      DONATION_STATUSES.includes(
        requestedStatus
      )
        ? requestedStatus
        : 'all';

    const search =
      (
        cleanText(
          req.query.search
        ) || ''
      ).toLowerCase();

    // Summary always describes the whole system.
    const {
      data:
        rows,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      console.error(
        'ADMIN GET DONATIONS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donations.'
        });
    }

    const allDonations =
      rows ||
      [];

    const filtered =
      allDonations.filter(
        donation => {
          if (
            status !==
              'all' &&
            donation.status !==
              status
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return [
            donation.donor_name,
            donation.requester_name,
            donation.facility_name,
            donation.blood_type
          ].some(
            value =>
              String(
                value || ''
              )
                .toLowerCase()
                .includes(
                  search
                )
          );
        }
      );

    const total =
      filtered.length;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total /
              limit
          );

    const safePage =
      totalPages === 0
        ? 1
        : Math.min(
            page,
            totalPages
          );

    const start =
      (safePage - 1) *
      limit;

    const pageRows =
      filtered.slice(
        start,
        start +
          limit
      );

    // Current names / photos + feedback for the visible page.
    const [
      users,
      feedback
    ] =
      await Promise.all([
        loadUsers(
          pageRows.flatMap(
            donation => [
              donation.donor_id,
              donation.requester_id
            ]
          )
        ),

        loadFeedback(
          pageRows.map(
            donation =>
              donation.id
          )
        )
      ]);

    return res
      .status(200)
      .json({
        summary:
          await buildAdminSummary(
            allDonations
          ),

        donations:
          pageRows.map(
            donation => {
              const ratings =
                (
                  feedback.get(
                    donation.id
                  ) ||
                  []
                ).map(
                  item =>
                    Number(
                      item.rating
                    )
                );

              return {
                ...donation,

                donor:
                  users.get(
                    donation.donor_id
                  ) ||
                  null,

                requester:
                  users.get(
                    donation.requester_id
                  ) ||
                  null,

                feedback_count:
                  ratings.length,

                average_rating:
                  ratings.length > 0
                    ? Math.round(
                        (
                          ratings.reduce(
                            (
                              totalRating,
                              value
                            ) =>
                              totalRating +
                              value,
                            0
                          ) /
                          ratings.length
                        ) *
                          10
                      ) / 10
                    : null
              };
            }
          ),

        pagination: {
          page:
            safePage,

          limit,

          total,

          total_pages:
            totalPages
        },

        filters: {
          status,

          search:
            search ||
            null
        }
      });
  } catch (error) {
    console.error(
      'ADMIN GET DONATIONS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to retrieve donations.'
      });
  }
}

// ============================================================
// ADMIN: DETAILS
//
// GET /api/admin/donations/:id
//
// The donation with the whole transaction around it: request,
// donor offer, donor + application, requester, schedule, other
// donations on the request, both sides' feedback and a
// timeline.
// ============================================================

function buildTimeline({
  request,
  response,
  schedule,
  donation,
  feedback
}) {
  const steps = [
    {
      key:
        'request_posted',

      label:
        'Blood request posted',

      actor:
        'Requester',

      at:
        request?.created_at ||
        null,

      done:
        Boolean(request)
    },
    {
      key:
        'offer_sent',

      label:
        'Donor offered to donate',

      actor:
        'Donor',

      at:
        response?.created_at ||
        null,

      done:
        Boolean(response)
    },
    {
      key:
        'offer_accepted',

      label:
        'Requester accepted the donor',

      actor:
        'Requester',

      at:
        response?.updated_at ||
        null,

      done:
        Boolean(response)
    },
    {
      key:
        'donation_scheduled',

      label:
        'Donation scheduled',

      actor:
        'Requester & Donor',

      at:
        schedule?.scheduled_at ||
        null,

      done:
        Boolean(schedule)
    },
    {
      key:
        'donation_confirmed',

      label:
        'Requester confirmed the donation',

      actor:
        'Requester',

      at:
        donation.created_at,

      done:
        true
    }
  ];

  const autoReasons =
    (donation.review_reasons || [])
      .filter(
        reason =>
          reason !==
          'donor_disputed'
      );

  steps.push({
    key:
      'recorded',

    label:
      autoReasons.length > 0
        ? 'Flagged by automatic checks'
        : 'Recorded automatically (all checks passed)',

    actor:
      'System',

    at:
      donation.created_at,

    done:
      autoReasons.length ===
      0
  });

  if (donation.disputed_at) {
    steps.push({
      key:
        'donor_disputed',

      label:
        'Donor reported a problem',

      actor:
        'Donor',

      at:
        donation.disputed_at,

      done:
        true
    });
  }

  if (
    donation.status ===
      'needs_review' ||
    donation.verified_at
  ) {
    steps.push({
      key:
        'admin_decision',

      label:
        donation.status ===
        'rejected'
          ? 'Rejected by admin'
          : donation.status ===
              'needs_review'
            ? 'Waiting for admin review'
            : 'Marked valid by admin',

      actor:
        'Admin',

      at:
        donation.verified_at ||
        null,

      done:
        donation.status !==
        'needs_review'
    });
  }

  const latestFeedback =
    feedback[feedback.length - 1] ||
    null;

  steps.push({
    key:
      'feedback',

    label:
      feedback.length >= 2
        ? 'Both sides shared feedback'
        : feedback.length === 1
          ? `${
              feedback[0].from_role ===
              'donor'
                ? 'Donor'
                : 'Requester'
            } shared feedback`
          : 'Waiting for feedback',

    actor:
      'Donor & Requester',

    at:
      latestFeedback?.created_at ||
      null,

    done:
      feedback.length > 0
  });

  return steps;
}

async function getAdminDonationById(
  req,
  res
) {
  try {
    const donationId =
      cleanText(
        req.params.id
      );

    if (
      !donationId ||
      !UUID_PATTERN.test(
        donationId
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid donation ID.'
        });
    }

    const {
      data:
        donation,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .select('*')
        .eq(
          'id',
          donationId
        )
        .maybeSingle();

    if (error) {
      console.error(
        'ADMIN DONATION LOOKUP ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donation.'
        });
    }

    if (!donation) {
      return res
        .status(404)
        .json({
          error:
            'Donation not found.'
        });
    }

    // --------------------------------------------------------
    // RELATED RECORDS (in parallel; each may be missing)
    // --------------------------------------------------------

    const [
      requestResult,
      responseResult,
      scheduleResult,
      applicationResult,
      requestDonationsResult
    ] =
      await Promise.all([
        donation.request_id
          ? supabaseAdmin
              .from(
                'blood_requests'
              )
              .select('*')
              .eq(
                'id',
                donation.request_id
              )
              .maybeSingle()
          : Promise.resolve({
              data: null
            }),

        donation.response_id
          ? supabaseAdmin
              .from(
                'blood_request_responses'
              )
              .select('*')
              .eq(
                'id',
                donation.response_id
              )
              .maybeSingle()
          : Promise.resolve({
              data: null
            }),

        donation.response_id
          ? supabaseAdmin
              .from(
                'blood_request_coordination_schedules'
              )
              .select(
                'id,scheduled_at,note,updated_at'
              )
              .eq(
                'response_id',
                donation.response_id
              )
              .maybeSingle()
          : Promise.resolve({
              data: null
            }),

        donation.donor_id
          ? supabaseAdmin
              .from(
                'donor_applications'
              )
              .select(`
                status,
                blood_type,
                has_donated_before,
                last_donation_date,
                last_donation_month,
                last_donation_year,
                availability_status
              `)
              .eq(
                'user_id',
                donation.donor_id
              )
              .maybeSingle()
          : Promise.resolve({
              data: null
            }),

        donation.request_id
          ? supabaseAdmin
              .from(
                'blood_donations'
              )
              .select(`
                id,
                donor_name,
                units_donated,
                donated_at,
                status
              `)
              .eq(
                'request_id',
                donation.request_id
              )
              .order(
                'created_at',
                {
                  ascending:
                    true
                }
              )
          : Promise.resolve({
              data: []
            })
      ]);

    for (const result of [
      requestResult,
      responseResult,
      scheduleResult,
      applicationResult,
      requestDonationsResult
    ]) {
      if (result.error) {
        console.error(
          'ADMIN DONATION RELATED LOOKUP ERROR:',
          result.error
        );
      }
    }

    const [
      users,
      feedbackMap
    ] =
      await Promise.all([
        loadUsers([
          donation.donor_id,
          donation.requester_id,
          donation.verified_by
        ]),

        loadFeedback([
          donation.id
        ])
      ]);

    const request =
      requestResult.data ||
      null;

    const response =
      responseResult.data ||
      null;

    const schedule =
      scheduleResult.data ||
      null;

    const feedback =
      feedbackMap.get(
        donation.id
      ) ||
      [];

    const reviewer =
      users.get(
        donation.verified_by
      ) ||
      null;

    return res
      .status(200)
      .json({
        donation: {
          ...donation,

          review_reason_labels:
            (donation.review_reasons || [])
              .map(
                reason =>
                  REVIEW_REASON_LABELS[reason] ||
                  reason
              )
        },

        request,

        response,

        schedule,

        donor:
          users.get(
            donation.donor_id
          ) ||
          null,

        donor_application:
          applicationResult.data ||
          null,

        requester:
          users.get(
            donation.requester_id
          ) ||
          null,

        reviewer:
          reviewer
            ? {
                id:
                  reviewer.id,

                name:
                  getFullName(
                    reviewer
                  )
              }
            : null,

        feedback:
          feedback.map(
            item => ({
              from_role:
                item.from_role,

              from_name:
                item.from_role ===
                'donor'
                  ? donation.donor_name
                  : donation.requester_name,

              rating:
                item.rating,

              comment:
                item.comment,

              created_at:
                item.created_at,

              updated_at:
                item.updated_at
            })
          ),

        request_donations:
          requestDonationsResult.data ||
          [],

        timeline:
          buildTimeline({
            request,
            response,
            schedule,
            donation,
            feedback
          })
      });
  } catch (error) {
    console.error(
      'ADMIN GET DONATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to retrieve donation.'
      });
  }
}

// ============================================================
// ADMIN: REVIEW
//
// PATCH /api/admin/donations/:id/approve  { admin_note? }
//   Only for records that need review -> 'completed'.
//
// PATCH /api/admin/donations/:id/reject   { admin_note }
//   For completed or flagged records -> 'rejected'.
//   Undoes the donor history change; the requester may
//   confirm the donation again.
// ============================================================

async function getDonationForReview(
  req,
  res
) {
  const donationId =
    cleanText(
      req.params.id
    );

  if (
    !donationId ||
    !UUID_PATTERN.test(
      donationId
    )
  ) {
    res
      .status(400)
      .json({
        error:
          'Invalid donation ID.'
      });

    return null;
  }

  setActivityEntity(
    res,
    'blood_donation',
    donationId
  );

  const {
    data:
      donation,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_donations'
      )
      .select('*')
      .eq(
        'id',
        donationId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'ADMIN DONATION REVIEW LOOKUP ERROR:',
      error
    );

    res
      .status(500)
      .json({
        error:
          'Unable to retrieve donation.'
      });

    return null;
  }

  if (!donation) {
    res
      .status(404)
      .json({
        error:
          'Donation not found.'
      });

    return null;
  }

  return donation;
}

async function approveAdminDonation(
  req,
  res
) {
  try {
    const adminId =
      getAuthenticatedUserId(
        req
      );

    const donation =
      await getDonationForReview(
        req,
        res
      );

    if (!donation) {
      return;
    }

    if (
      donation.status !==
      'needs_review'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only records that need review can be marked valid.'
        });
    }

    const adminNote =
      cleanText(
        req.body
          ?.admin_note
      );

    if (
      adminNote &&
      adminNote.length >
        1000
    ) {
      return res
        .status(400)
        .json({
          error:
            'Admin note must not exceed 1000 characters.'
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updated,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .update({
          status:
            'completed',

          admin_note:
            adminNote,

          verified_by:
            adminId,

          verified_at:
            now,

          updated_at:
            now
        })
        .eq(
          'id',
          donation.id
        )
        .eq(
          'status',
          'needs_review'
        )
        .select()
        .maybeSingle();

    if (error) {
      console.error(
        'ADMIN APPROVE DONATION ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to update donation.'
        });
    }

    if (!updated) {
      return res
        .status(409)
        .json({
          error:
            'This record is no longer waiting for review.'
        });
    }

    const completed =
      await applyDonorHistory(
        updated
      );

    await createNotifications([
      {
        userId:
          completed.donor_id,

        type:
          'donation_verified',

        title:
          'Donation Recorded',

        message:
          `Hemo-Hero reviewed your ${completed.blood_type} donation at ${completed.facility_name} and it is now on your donation record. Thank you, hero!`,

        data: {
          request_id:
            completed.request_id,

          donation_id:
            completed.id,

          status:
            'completed',

          recipient_role:
            'donor'
        }
      },
      {
        userId:
          completed.requester_id,

        type:
          'donation_verified',

        title:
          'Donation Recorded',

        message:
          `Hemo-Hero reviewed ${completed.donor_name || 'your donor'}'s ${completed.blood_type} donation and it is now recorded.`,

        data: {
          request_id:
            completed.request_id,

          donation_id:
            completed.id,

          status:
            'completed',

          recipient_role:
            'requester'
        }
      }
    ]);

    return res
      .status(200)
      .json({
        message:
          'Donation marked as valid.',

        donation:
          completed
      });
  } catch (error) {
    console.error(
      'ADMIN APPROVE DONATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to update donation.'
      });
  }
}

async function rejectAdminDonation(
  req,
  res
) {
  try {
    const adminId =
      getAuthenticatedUserId(
        req
      );

    const adminNote =
      cleanText(
        req.body
          ?.admin_note
      );

    // Validate before looking anything up.
    if (
      !adminNote ||
      adminNote.length <
        5
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please explain why this donation record is being rejected.'
        });
    }

    if (
      adminNote.length >
      1000
    ) {
      return res
        .status(400)
        .json({
          error:
            'Admin note must not exceed 1000 characters.'
        });
    }

    const donation =
      await getDonationForReview(
        req,
        res
      );

    if (!donation) {
      return;
    }

    if (
      donation.status ===
      'rejected'
    ) {
      return res
        .status(409)
        .json({
          error:
            'This record has already been rejected.'
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updated,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_donations'
        )
        .update({
          status:
            'rejected',

          admin_note:
            adminNote,

          verified_by:
            adminId,

          verified_at:
            now,

          updated_at:
            now
        })
        .eq(
          'id',
          donation.id
        )
        .neq(
          'status',
          'rejected'
        )
        .select()
        .maybeSingle();

    if (error) {
      console.error(
        'ADMIN REJECT DONATION ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to reject donation.'
        });
    }

    if (!updated) {
      return res
        .status(409)
        .json({
          error:
            'This record has already been rejected.'
        });
    }

    await revertDonorHistory(
      updated
    );

    await createNotifications([
      {
        userId:
          updated.requester_id,

        type:
          'donation_rejected',

        title:
          'Donation Record Rejected',

        message:
          `Hemo-Hero could not accept ${updated.donor_name || 'the donor'}'s donation record: ${adminNote} You can confirm it again with the correct details.`,

        data: {
          request_id:
            updated.request_id,

          response_id:
            updated.response_id,

          donation_id:
            updated.id,

          status:
            'rejected',

          recipient_role:
            'requester'
        }
      },
      {
        userId:
          updated.donor_id,

        type:
          'donation_rejected',

        title:
          'Donation Record Rejected',

        message:
          `Your ${updated.blood_type} donation record at ${updated.facility_name} was rejected: ${adminNote}`,

        data: {
          request_id:
            updated.request_id,

          response_id:
            updated.response_id,

          donation_id:
            updated.id,

          status:
            'rejected',

          recipient_role:
            'donor'
        }
      }
    ]);

    return res
      .status(200)
      .json({
        message:
          'Donation record rejected.',

        donation:
          updated
      });
  } catch (error) {
    console.error(
      'ADMIN REJECT DONATION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to reject donation.'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  recordDonation,

  submitDonationFeedback,

  disputeDonation,

  getRequestDonations,

  getMyDonations,

  getAdminDonationSummary,

  getAdminDonations,

  getAdminDonationById,

  approveAdminDonation,

  rejectAdminDonation
};
