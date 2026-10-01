const {
  supabaseAdmin,
} = require('../config/supabase');

const {
  getCompatibleRecipientTypesForDonor,
} = require('../utils/bloodCompatibility');

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 100;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// ============================================================
// GET AUTHENTICATED USER ID
// ============================================================

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.authUser?.id ||
    req.dbUser?.id ||
    null
  );
}

// ============================================================
// CONVERT TO NUMBER
// ============================================================

function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }

  return number;
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
// HAVERSINE DISTANCE
//
// Calculates distance between two GPS points.
//
// Result:
// kilometers
// ============================================================

function calculateDistanceKm(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadiusKm =
    6371;

  const toRadians =
    degrees =>
      degrees *
      (
        Math.PI /
        180
      );

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

  const lat1 =
    toRadians(
      latitude1
    );

  const lat2 =
    toRadians(
      latitude2
    );

  const a =
    Math.sin(
      latitudeDifference /
        2
    ) ** 2 +
    Math.cos(
      lat1
    ) *
      Math.cos(
        lat2
      ) *
      Math.sin(
        longitudeDifference /
          2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        a
      ),
      Math.sqrt(
        1 -
          a
      )
    );

  return (
    earthRadiusKm *
    c
  );
}

// ============================================================
// FORMAT DISTANCE
// ============================================================

function roundDistance(
  distance
) {
  return (
    Math.round(
      distance *
        100
    ) /
    100
  );
}

// ============================================================
// GET APPROVED DONOR BLOOD TYPE
//
// If the current user is an approved donor, nearby requests
// are restricted to the donor's exact verified blood type.
//
// Example:
//
// Verified donor AB-
// -> only AB- blood requests
//
// Verified donor O+
// -> only O+ blood requests
//
// If the user is not an approved donor, we leave the nearby
// request endpoint usable for other app areas such as general
// dashboard browsing.
//
// Actual donor response submission is still protected by the
// donor response controller.
// ============================================================

async function getApprovedDonorBloodType(
  userId
) {
  const {
    data:
      donorApplication,
    error:
      donorApplicationError,
  } =
    await supabaseAdmin
      .from(
        'donor_applications'
      )
      .select(`
        user_id,
        status,
        blood_type
      `)
      .eq(
        'user_id',
        userId
      )
      .maybeSingle();

  if (
    donorApplicationError
  ) {
    console.log(
      'NEARBY REQUEST DONOR LOOKUP ERROR:',
      donorApplicationError
    );

    throw new Error(
      'Unable to verify donor information.'
    );
  }

  if (
    !donorApplication ||
    donorApplication.status !==
      'approved'
  ) {
    return null;
  }

  return normalizeBloodType(
    donorApplication.blood_type
  );
}

// ============================================================
// GET NEARBY BLOOD REQUESTS
//
// GET
// /api/requests/nearby
//
// Query parameters:
//
// latitude
// longitude
// radius
// limit
//
// Approved donors automatically receive requests that exactly
// match their verified blood type.
// ============================================================

async function getNearbyBloodRequests(
  req,
  res
) {
  try {
    // ========================================================
    // AUTHENTICATED USER
    // ========================================================

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
            'Unable to identify authenticated user.',
        });
    }

    // ========================================================
    // VERIFIED DONOR BLOOD TYPE
    // ========================================================

    const donorBloodType =
      await getApprovedDonorBloodType(
        requesterId
      );

    // ========================================================
    // COORDINATES
    // ========================================================

    const latitude =
      toNumber(
        req.query.latitude
      );

    const longitude =
      toNumber(
        req.query.longitude
      );

    if (
      latitude === null ||
      longitude === null
    ) {
      return res
        .status(400)
        .json({
          error:
            'Latitude and longitude are required.',
        });
    }

    if (
      latitude <
        -90 ||
      latitude >
        90
    ) {
      return res
        .status(400)
        .json({
          error:
            'Latitude must be between -90 and 90.',
        });
    }

    if (
      longitude <
        -180 ||
      longitude >
        180
    ) {
      return res
        .status(400)
        .json({
          error:
            'Longitude must be between -180 and 180.',
        });
    }

    // ========================================================
    // RADIUS
    // ========================================================

    let radiusKm =
      toNumber(
        req.query.radius
      );

    if (
      radiusKm === null
    ) {
      radiusKm =
        DEFAULT_RADIUS_KM;
    }

    radiusKm =
      Math.min(
        Math.max(
          radiusKm,
          1
        ),
        MAX_RADIUS_KM
      );

    // ========================================================
    // LIMIT
    // ========================================================

    let resultLimit =
      parseInt(
        req.query.limit,
        10
      );

    if (
      !Number.isInteger(
        resultLimit
      )
    ) {
      resultLimit =
        DEFAULT_LIMIT;
    }

    resultLimit =
      Math.min(
        Math.max(
          resultLimit,
          1
        ),
        MAX_LIMIT
      );

    // ========================================================
    // BUILD ACTIVE REQUEST QUERY
    //
    // Privacy:
    // We do NOT use a patient's personal/home coordinates.
    //
    // Distance is based only on the selected hospital,
    // clinic, or blood facility.
    // ========================================================

    let requestQuery =
      supabaseAdmin
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
          created_at
        `)
        .eq(
          'status',
          'active'
        )
        // Reported by several people: hidden until an admin
        // reviews it.
        .is(
          'flagged_at',
          null
        )
        .neq(
          'requester_id',
          requesterId
        )
        .not(
          'facility_latitude',
          'is',
          null
        )
        .not(
          'facility_longitude',
          'is',
          null
        );

    // ========================================================
    // BLOOD TYPE COMPATIBILITY FILTER
    //
    // Only applied when the authenticated user is an approved
    // donor with a verified blood type.
    //
    // Hemo-Hero rule (same as responses and invitations):
    // show requests whose blood type this donor can give
    // red cells to, e.g. an O- donor sees every request.
    // ========================================================

    if (
      donorBloodType
    ) {
      requestQuery =
        requestQuery.in(
          'blood_type',
          getCompatibleRecipientTypesForDonor(
            donorBloodType
          )
        );
    }

    // ========================================================
    // RUN DATABASE QUERY
    // ========================================================

    const {
      data,
      error,
    } =
      await requestQuery
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(
          200
        );

    if (
      error
    ) {
      console.log(
        'GET NEARBY BLOOD REQUESTS DATABASE ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load nearby blood requests.',
        });
    }

    // ========================================================
    // CALCULATE DISTANCE
    // ========================================================

    const nearbyRequests =
      (
        data ||
        []
      )
        .map(
          request => {
            const facilityLatitude =
              Number(
                request
                  .facility_latitude
              );

            const facilityLongitude =
              Number(
                request
                  .facility_longitude
              );

            if (
              !Number.isFinite(
                facilityLatitude
              ) ||
              !Number.isFinite(
                facilityLongitude
              )
            ) {
              return null;
            }

            const distanceKm =
              calculateDistanceKm(
                latitude,
                longitude,
                facilityLatitude,
                facilityLongitude
              );

            return {
              ...request,

              distance_km:
                roundDistance(
                  distanceKm
                ),
            };
          }
        )

        // ----------------------------------------------------
        // REMOVE INVALID COORDINATES
        // ----------------------------------------------------

        .filter(
          Boolean
        )

        // ----------------------------------------------------
        // ONLY REQUESTS INSIDE SELECTED RADIUS
        // ----------------------------------------------------

        .filter(
          request =>
            request
              .distance_km <=
            radiusKm
        )

        // ====================================================
        // SORTING
        //
        // 1. Urgent first
        // 2. Nearest first
        // 3. Newer request first
        // ====================================================

        .sort(
          (
            requestA,
            requestB
          ) => {
            const urgentA =
              requestA
                .urgency ===
              'urgent'
                ? 0
                : 1;

            const urgentB =
              requestB
                .urgency ===
              'urgent'
                ? 0
                : 1;

            if (
              urgentA !==
              urgentB
            ) {
              return (
                urgentA -
                urgentB
              );
            }

            if (
              requestA
                .distance_km !==
              requestB
                .distance_km
            ) {
              return (
                requestA
                  .distance_km -
                requestB
                  .distance_km
              );
            }

            return (
              new Date(
                requestB
                  .created_at
              ).getTime() -
              new Date(
                requestA
                  .created_at
              ).getTime()
            );
          }
        )

        .slice(
          0,
          resultLimit
        );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res
      .status(200)
      .json({
        requests:
          nearbyRequests,

        count:
          nearbyRequests.length,

        search: {
          latitude,
          longitude,

          radius_km:
            radiusKm,
        },

        donor_filter:
          donorBloodType
            ? {
                enabled:
                  true,

                blood_type:
                  donorBloodType,
              }
            : {
                enabled:
                  false,

                blood_type:
                  null,
              },
      });
  } catch (
    error
  ) {
    console.log(
      'GET NEARBY BLOOD REQUESTS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Unable to load nearby blood requests.',
      });
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getNearbyBloodRequests,
};