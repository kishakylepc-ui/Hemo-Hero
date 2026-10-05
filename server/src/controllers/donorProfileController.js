const {
  supabaseAdmin
} =
  require('../config/supabase');

const {
  getDonorStats
} = require(
  '../services/donorStatsService'
);

const {
  getNextEligibleDate,
  isEligibleToDonate
} = require(
  '../services/eligibilityService'
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

function toNumberOrNull(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function isValidLatitude(
  value
) {
  return (
    value !== null &&
    value >= -90 &&
    value <= 90
  );
}

function isValidLongitude(
  value
) {
  return (
    value !== null &&
    value >= -180 &&
    value <= 180
  );
}

// ============================================================
// DISTANCE
// ============================================================

function calculateDistanceKm(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadiusKm =
    6371;

  function toRadians(
    degrees
  ) {
    return (
      degrees *
      Math.PI /
      180
    );
  }

  const latitudeDifference =
    toRadians(
      latitude2 -
      latitude1
    );

  const longitudeDifference =
    toRadians(
      longitude2 -
      longitude1
    );

  const firstLatitude =
    toRadians(
      latitude1
    );

  const secondLatitude =
    toRadians(
      latitude2
    );

  const a =
    Math.sin(
      latitudeDifference /
      2
    ) ** 2 +
    Math.cos(
      firstLatitude
    ) *
    Math.cos(
      secondLatitude
    ) *
    Math.sin(
      longitudeDifference /
      2
    ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    );

  return (
    earthRadiusKm *
    c
  );
}

// ============================================================
// FULL NAME
// ============================================================

function buildFullName(
  user
) {
  return [
    user?.first_name,
    user?.middle_name,
    user?.last_name,
    user?.suffix
  ]
    .filter(Boolean)
    .join(' ')
    .trim() ||
    'Hemo-Hero Donor';
}

// ============================================================
// GET /api/donors/:id
//
// PUBLIC / PRIVACY-SAFE DONOR PROFILE
//
// Optional query:
//
// latitude
// longitude
//
// If requester coordinates are supplied, the backend calculates
// donor distance without exposing the donor's coordinates.
// ============================================================

async function getPublicDonorProfile(
  req,
  res
) {
  try {
    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const currentUserId =
      getAuthenticatedUserId(
        req
      );

    if (
      !currentUserId
    ) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    // ========================================================
    // DONOR ID
    // ========================================================

    const donorId =
      String(
        req.params.id ||
        ''
      ).trim();

    if (
      !donorId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Donor ID is required.'
        });
    }

    // ========================================================
    // PREVENT VIEWING SELF AS SEARCH RESULT
    // ========================================================

    if (
      donorId ===
      currentUserId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You cannot open yourself as a donor search result.'
        });
    }

    // ========================================================
    // DONOR APPLICATION
    // ========================================================

    const {
      data:
        donorApplication,
      error:
        donorError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(`
          id,
          user_id,
          blood_type,
          has_donated_before,
          last_donation_date,
          last_donation_month,
          last_donation_year,
          last_donation_facility,
          current_latitude,
          current_longitude,
          travel_radius_km,
          availability_status,
          allow_urgent_requests,
          status,
          reviewed_at,
          submitted_at,
          updated_at
        `)
        .eq(
          'user_id',
          donorId
        )
        .eq(
          'status',
          'approved'
        )
        .maybeSingle();

    if (
      donorError
    ) {
      console.error(
        'GET PUBLIC DONOR APPLICATION ERROR:',
        donorError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor profile.'
        });
    }

    if (
      !donorApplication
    ) {
      return res
        .status(404)
        .json({
          error:
            'Verified donor not found.'
        });
    }

    // ========================================================
    // USER PROFILE
    //
    // Intentionally select only privacy-safe fields.
    // ========================================================

    const {
      data:
        user,
      error:
        userError
    } =
      await supabaseAdmin
        .from(
          'users'
        )
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
        .eq(
          'id',
          donorId
        )
        .maybeSingle();

    if (
      userError
    ) {
      console.error(
        'GET PUBLIC DONOR USER ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor profile.'
        });
    }

    if (
      !user
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor profile not found.'
        });
    }

    // ========================================================
    // OPTIONAL REQUESTER LOCATION
    // ========================================================

    const requesterLatitude =
      toNumberOrNull(
        req.query.latitude
      );

    const requesterLongitude =
      toNumberOrNull(
        req.query.longitude
      );

    let distanceKm =
      null;

    const hasLatitude =
      requesterLatitude !==
      null;

    const hasLongitude =
      requesterLongitude !==
      null;

    if (
      hasLatitude !==
      hasLongitude
    ) {
      return res
        .status(400)
        .json({
          error:
            'latitude and longitude must be provided together.'
        });
    }

    if (
      hasLatitude &&
      hasLongitude
    ) {
      if (
        !isValidLatitude(
          requesterLatitude
        ) ||
        !isValidLongitude(
          requesterLongitude
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid latitude or longitude.'
          });
      }

      const donorLatitude =
        toNumberOrNull(
          donorApplication
            .current_latitude
        );

      const donorLongitude =
        toNumberOrNull(
          donorApplication
            .current_longitude
        );

      if (
        isValidLatitude(
          donorLatitude
        ) &&
        isValidLongitude(
          donorLongitude
        )
      ) {
        distanceKm =
          Number(
            calculateDistanceKm(
              requesterLatitude,
              requesterLongitude,
              donorLatitude,
              donorLongitude
            ).toFixed(1)
          );
      }
    }

    // ========================================================
    // LOCATION
    // ========================================================

    const location =
      [
        user.city,
        user.province
      ]
        .filter(Boolean)
        .join(', ') ||
      null;

    // First day they may donate again, while in the 90-day
    // wait after a donation (null = can donate).
    const restingUntil =
      isEligibleToDonate(
        donorApplication
          .last_donation_date
      )
        ? null
        : getNextEligibleDate(
            donorApplication
              .last_donation_date
          ).toISOString();

    // ========================================================
    // SAFE RESPONSE
    //
    // NEVER RETURN:
    //
    // - donor latitude
    // - donor longitude
    // - email
    // - phone
    // - barangay
    // - verification document
    // ========================================================

    // Completed donations and requester ratings.
    const stats =
      (
        await getDonorStats([
          user.id
        ])
      ).get(user.id);

    return res
      .status(200)
      .json({
        donor: {
          ...stats,

          id:
            user.id,

          full_name:
            buildFullName(
              user
            ),

          first_name:
            user.first_name ||
            null,

          last_name:
            user.last_name ||
            null,

          profile_photo_url:
            user.profile_photo_url ||
            null,

          blood_type:
            donorApplication
              .blood_type,

          verified:
            true,

          // Off during the 90-day wait after a donation.
          availability_status:
            restingUntil
              ? 'unavailable'
              : donorApplication
                  .availability_status,

          next_eligible_at:
            restingUntil,

          allow_urgent_requests:
            Boolean(
              donorApplication
                .allow_urgent_requests
            ),

          city:
            user.city ||
            null,

          province:
            user.province ||
            null,

          location,

          distance_km:
            distanceKm,

          travel_radius_km:
            Number(
              donorApplication
                .travel_radius_km
            ) ||
            null,

          has_donated_before:
            Boolean(
              donorApplication
                .has_donated_before
            ),

          // Exact date, when the donor knew it.
          last_donation_date:
            donorApplication
              .last_donation_date ||
            null,

          // Approximate month (1-12) and year, used only when the
          // donor did not remember the exact date. The two are
          // never both set; clients must not present the
          // approximate values as an exact day.
          last_donation_month:
            donorApplication
              .last_donation_month ||
            null,

          last_donation_year:
            donorApplication
              .last_donation_year ||
            null,

          reviewed_at:
            donorApplication
              .reviewed_at ||
            null,

          updated_at:
            donorApplication
              .updated_at ||
            null
        }
      });
  } catch (
    error
  ) {
    console.error(
      'GET PUBLIC DONOR PROFILE ERROR:',
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
// EXPORT
// ============================================================

module.exports = {
  getPublicDonorProfile
};