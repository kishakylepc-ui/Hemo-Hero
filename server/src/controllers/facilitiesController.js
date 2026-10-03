const {
  supabaseAdmin
} = require('../config/supabase');

// ============================================================
// HEMO-HERO
// VERIFIED NEARBY FACILITY DIRECTORY
//
// Sources facilities from Supabase instead of relying on
// slow/unreliable public Overpass servers.
//
// Facility types:
// - hospital
// - blood_bank
// - red_cross
// - medical_facility
// ============================================================

// ============================================================
// SETTINGS
// ============================================================

const DEFAULT_RADIUS_KM = 30;
const MAX_RADIUS_KM = 100;

// ============================================================
// HELPERS
// ============================================================

function toNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

// ============================================================
// HAVERSINE DISTANCE
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
      Math.PI /
      180;

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

  const startLatitude =
    toRadians(
      latitude1
    );

  const endLatitude =
    toRadians(
      latitude2
    );

  const a =
    Math.sin(
      latitudeDifference /
      2
    ) ** 2 +
    Math.cos(
      startLatitude
    ) *
      Math.cos(
        endLatitude
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

  return earthRadiusKm *
    c;
}

// ============================================================
// VALIDATE LOCATION
// ============================================================

function validateCoordinates(
  latitude,
  longitude
) {
  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      valid: false,
      error:
        'Latitude and longitude are required.'
    };
  }

  if (
    latitude < -90 ||
    latitude > 90
  ) {
    return {
      valid: false,
      error:
        'Invalid latitude.'
    };
  }

  if (
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      valid: false,
      error:
        'Invalid longitude.'
    };
  }

  return {
    valid: true
  };
}

// ============================================================
// GET /api/facilities/nearby
// ============================================================

async function getNearbyFacilities(
  req,
  res
) {
  try {
    // ========================================================
    // PARAMETERS
    // ========================================================

    const latitude =
      toNumber(
        req.query.latitude
      );

    const longitude =
      toNumber(
        req.query.longitude
      );

    const requestedRadius =
      toNumber(
        req.query.radius
      );

    // ========================================================
    // VALIDATION
    // ========================================================

    const validation =
      validateCoordinates(
        latitude,
        longitude
      );

    if (
      !validation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error
        });
    }

    // ========================================================
    // RADIUS
    // ========================================================

    const radiusKm =
      requestedRadius !==
        null &&
      requestedRadius > 0
        ? Math.min(
            requestedRadius,
            MAX_RADIUS_KM
          )
        : DEFAULT_RADIUS_KM;

    // ========================================================
    // GET VERIFIED / ACTIVE FACILITIES
    // ========================================================

    const {
      data:
        facilityRows,
      error:
        facilityError
    } =
      await supabaseAdmin
        .from(
          'facility_locations'
        )
        .select(`
          id,
          name,
          facility_type,
          category_label,
          address,
          latitude,
          longitude,
          is_verified,
          is_active
        `)
        .eq(
          'is_active',
          true
        );

    if (facilityError) {
      console.error(
        'FACILITY DIRECTORY ERROR:',
        facilityError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve nearby facilities.'
        });
    }

    // ========================================================
    // CALCULATE DISTANCE
    // ========================================================

    const facilities =
      (facilityRows || [])
        .map(
          facility => {
            const facilityLatitude =
              Number(
                facility.latitude
              );

            const facilityLongitude =
              Number(
                facility.longitude
              );

            const distanceKm =
              calculateDistanceKm(
                latitude,
                longitude,
                facilityLatitude,
                facilityLongitude
              );

            return {
              id:
                facility.id,

              name:
                facility.name,

              type:
                facility.facility_type,

              category_label:
                facility.category_label,

              address:
                facility.address,

              latitude:
                facilityLatitude,

              longitude:
                facilityLongitude,

              distance_km:
                Number(
                  distanceKm.toFixed(
                    2
                  )
                ),

              is_verified:
                facility.is_verified
            };
          }
        )
        .filter(
          facility =>
            facility.distance_km <=
            radiusKm
        );

    // ========================================================
    // SORT
    // ========================================================

    facilities.sort(
      (
        first,
        second
      ) =>
        first.distance_km -
        second.distance_km
    );

    // ========================================================
    // COUNTS
    // ========================================================

    const counts = {
      total:
        facilities.length,

      hospitals:
        facilities.filter(
          facility =>
            facility.type ===
            'hospital'
        ).length,

      blood_banks:
        facilities.filter(
          facility =>
            facility.type ===
            'blood_bank'
        ).length,

      red_cross:
        facilities.filter(
          facility =>
            facility.type ===
            'red_cross'
        ).length,

      other:
        facilities.filter(
          facility =>
            facility.type ===
            'medical_facility'
        ).length
    };

    console.log(
      'Facility directory results:',
      counts
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return res
      .status(200)
      .json({
        count:
          facilities.length,

        counts,

        search: {
          latitude,
          longitude,

          radius_km:
            radiusKm
        },

        source:
          'verified_directory',

        facilities
      });
  } catch (error) {
    console.error(
      'GET NEARBY FACILITIES ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to retrieve nearby facilities.'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getNearbyFacilities
};