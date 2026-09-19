const path =
  require('path');

const crypto =
  require('crypto');

const {
  supabaseAdmin
} = require('../config/supabase');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

// ============================================================
// CONSTANTS
// ============================================================

const VALID_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-'
];

const VALID_RADII = [
  5,
  10,
  20,
  30,
  50
];

const VALID_AVAILABILITY = [
  'available',
  'unavailable'
];

// ============================================================
// NEARBY DONOR SEARCH
// ============================================================

const DEFAULT_SEARCH_RADIUS_KM =
  25;

const MIN_SEARCH_RADIUS_KM =
  1;

const MAX_SEARCH_RADIUS_KM =
  100;

const DEFAULT_DONOR_LIMIT =
  50;

const MAX_DONOR_LIMIT =
  100;

// ============================================================
// RED BLOOD CELL COMPATIBILITY
//
// Key = recipient/requested blood type
// Value = donor blood types that may donate red blood cells
// to that recipient.
// ============================================================

const COMPATIBLE_DONOR_TYPES = {
  'O-': [
    'O-'
  ],

  'O+': [
    'O-',
    'O+'
  ],

  'A-': [
    'O-',
    'A-'
  ],

  'A+': [
    'O-',
    'O+',
    'A-',
    'A+'
  ],

  'B-': [
    'O-',
    'B-'
  ],

  'B+': [
    'O-',
    'O+',
    'B-',
    'B+'
  ],

  'AB-': [
    'O-',
    'A-',
    'B-',
    'AB-'
  ],

  'AB+': [
    'O-',
    'O+',
    'A-',
    'A+',
    'B-',
    'B+',
    'AB-',
    'AB+'
  ]
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

  const text =
    String(value)
      .trim();

  return text || null;
}

function calculateAge(
  dateOfBirth
) {
  if (
    !dateOfBirth
  ) {
    return null;
  }

  const birthDate =
    new Date(
      `${dateOfBirth}T00:00:00`
    );

  if (
    Number.isNaN(
      birthDate.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

function toBoolean(
  value
) {
  return (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
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
// SEARCH QUERY BOOLEAN
// ============================================================

function parseQueryBoolean(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return false;
  }

  const text =
    String(value)
      .trim()
      .toLowerCase();

  return (
    text === 'true' ||
    text === '1' ||
    text === 'yes'
  );
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
// SAFE FULL NAME
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
// GET /api/donors/me
// ============================================================

async function getMyDonorApplication(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (
      !userId
    ) {
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
          'donor_applications'
        )
        .select(`
          id,
          user_id,
          blood_type,
          has_donated_before,
          last_donation_date,
          last_donation_facility,
          current_latitude,
          current_longitude,
          travel_radius_km,
          availability_status,
          allow_urgent_requests,
          consent_confirmed,
          status,
          admin_note,
          reviewed_at,
          submitted_at,
          created_at,
          updated_at
        `)
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        'GET DONOR APPLICATION ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor application.'
        });
    }

    return res
      .status(200)
      .json({
        application:
          data ||
          null,

        can_respond:
          data?.status ===
          'approved'
      });
  } catch (
    error
  ) {
    console.error(
      'GET DONOR APPLICATION ERROR:',
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
// GET /api/donors/nearby
// ============================================================

async function getNearbyDonors(
  req,
  res
) {
  try {
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
    // SEARCH LOCATION
    // ========================================================

    const latitude =
      toNumberOrNull(
        req.query.latitude
      );

    const longitude =
      toNumberOrNull(
        req.query.longitude
      );

    if (
      !isValidLatitude(
        latitude
      ) ||
      !isValidLongitude(
        longitude
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Valid latitude and longitude are required.'
        });
    }

    // ========================================================
    // SEARCH RADIUS
    // ========================================================

    const rawRadius =
      req.query.radius ===
        undefined
        ? DEFAULT_SEARCH_RADIUS_KM
        : Number(
            req.query.radius
          );

    if (
      !Number.isFinite(
        rawRadius
      ) ||
      rawRadius <
        MIN_SEARCH_RADIUS_KM ||
      rawRadius >
        MAX_SEARCH_RADIUS_KM
    ) {
      return res
        .status(400)
        .json({
          error:
            `Search radius must be between ${MIN_SEARCH_RADIUS_KM} and ${MAX_SEARCH_RADIUS_KM} kilometers.`
        });
    }

    const radiusKm =
      rawRadius;

    // ========================================================
    // RESULT LIMIT
    // ========================================================

    const rawLimit =
      req.query.limit ===
        undefined
        ? DEFAULT_DONOR_LIMIT
        : Number(
            req.query.limit
          );

    if (
      !Number.isFinite(
        rawLimit
      ) ||
      rawLimit <=
        0
    ) {
      return res
        .status(400)
        .json({
          error:
            'limit must be a positive number.'
        });
    }

    const limit =
      Math.min(
        MAX_DONOR_LIMIT,
        Math.max(
          1,
          Math.floor(
            rawLimit
          )
        )
      );

    // ========================================================
    // BLOOD TYPE
    // ========================================================

    let requestedBloodType =
      null;

    if (
      req.query.blood_type !==
        undefined &&
      req.query.blood_type !==
        null &&
      String(
        req.query.blood_type
      ).trim() !==
        ''
    ) {
      requestedBloodType =
        String(
          req.query.blood_type
        )
          .trim()
          .toUpperCase();

      if (
        !VALID_BLOOD_TYPES.includes(
          requestedBloodType
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Please provide a valid blood type.'
          });
      }
    }

    // ========================================================
    // URGENT FILTER
    // ========================================================

    const urgentOnly =
      parseQueryBoolean(
        req.query.urgent
      );

    // ========================================================
    // DONOR APPLICATION QUERY
    // ========================================================

    let donorQuery =
      supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(`
          id,
          user_id,
          blood_type,
          current_latitude,
          current_longitude,
          travel_radius_km,
          availability_status,
          allow_urgent_requests,
          status,
          reviewed_at,
          updated_at
        `)
        .eq(
          'status',
          'approved'
        )
        .eq(
          'availability_status',
          'available'
        )
        .neq(
          'user_id',
          currentUserId
        )
        .not(
          'current_latitude',
          'is',
          null
        )
        .not(
          'current_longitude',
          'is',
          null
        );

    if (
      requestedBloodType
    ) {
      const compatibleTypes =
        COMPATIBLE_DONOR_TYPES[
          requestedBloodType
        ] ||
        [];

      donorQuery =
        donorQuery.in(
          'blood_type',
          compatibleTypes
        );
    }

    if (
      urgentOnly
    ) {
      donorQuery =
        donorQuery.eq(
          'allow_urgent_requests',
          true
        );
    }

    const {
      data:
        donorApplications,
      error:
        donorError
    } =
      await donorQuery;

    if (
      donorError
    ) {
      console.error(
        'SEARCH DONORS ERROR:',
        donorError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to search for donors.'
        });
    }

    const applications =
      Array.isArray(
        donorApplications
      )
        ? donorApplications
        : [];

    if (
      applications.length ===
      0
    ) {
      return res
        .status(200)
        .json({
          donors:
            [],

          count:
            0,

          search: {
            radius_km:
              radiusKm,

            blood_type:
              requestedBloodType,

            urgent_only:
              urgentOnly
          }
        });
    }

    // ========================================================
    // DISTANCE FILTER
    // ========================================================

    const candidates =
      applications
        .map(
          application => {
            const donorLatitude =
              toNumberOrNull(
                application
                  .current_latitude
              );

            const donorLongitude =
              toNumberOrNull(
                application
                  .current_longitude
              );

            if (
              !isValidLatitude(
                donorLatitude
              ) ||
              !isValidLongitude(
                donorLongitude
              )
            ) {
              return null;
            }

            const distance =
              calculateDistanceKm(
                latitude,
                longitude,
                donorLatitude,
                donorLongitude
              );

            const donorTravelRadius =
              Number(
                application
                  .travel_radius_km
              );

            if (
              distance >
              radiusKm
            ) {
              return null;
            }

            if (
              Number.isFinite(
                donorTravelRadius
              ) &&
              donorTravelRadius >
                0 &&
              distance >
                donorTravelRadius
            ) {
              return null;
            }

            return {
              application,
              distance_km:
                distance
            };
          }
        )
        .filter(Boolean);

    if (
      candidates.length ===
      0
    ) {
      return res
        .status(200)
        .json({
          donors:
            [],

          count:
            0,

          search: {
            radius_km:
              radiusKm,

            blood_type:
              requestedBloodType,

            urgent_only:
              urgentOnly
          }
        });
    }

    // ========================================================
    // FETCH SAFE USER PROFILE DATA
    // ========================================================

    const donorUserIds =
      candidates.map(
        item =>
          item.application
            .user_id
      );

    const {
      data:
        donorUsers,
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
        .in(
          'id',
          donorUserIds
        );

    if (
      userError
    ) {
      console.error(
        'SEARCH DONOR PROFILE ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor profiles.'
        });
    }

    const userMap =
      new Map();

    for (
      const user of
        donorUsers ||
        []
    ) {
      userMap.set(
        user.id,
        user
      );
    }

    const safeDonors =
      candidates
        .map(
          item => {
            const application =
              item.application;

            const user =
              userMap.get(
                application
                  .user_id
              );

            if (
              !user
            ) {
              return null;
            }

            return {
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

              blood_type:
                application
                  .blood_type,

              city:
                user.city ||
                null,

              province:
                user.province ||
                null,

              profile_photo_url:
                user.profile_photo_url ||
                null,

              distance_km:
                Number(
                  item
                    .distance_km
                    .toFixed(1)
                ),

              verified:
                true,

              availability_status:
                application
                  .availability_status,

              allow_urgent_requests:
                Boolean(
                  application
                    .allow_urgent_requests
                ),

              travel_radius_km:
                Number(
                  application
                    .travel_radius_km
                ) ||
                null,

              reviewed_at:
                application
                  .reviewed_at ||
                null,

              updated_at:
                application
                  .updated_at ||
                null
            };
          }
        )
        .filter(Boolean)
        .sort(
          (
            first,
            second
          ) =>
            first.distance_km -
            second.distance_km
        );

    const totalCount =
      safeDonors.length;

    const limitedDonors =
      safeDonors.slice(
        0,
        limit
      );

    return res
      .status(200)
      .json({
        donors:
          limitedDonors,

        count:
          totalCount,

        search: {
          radius_km:
            radiusKm,

          blood_type:
            requestedBloodType,

          urgent_only:
            urgentOnly
        }
      });
  } catch (
    error
  ) {
    console.error(
      'GET NEARBY DONORS ERROR:',
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
// POST /api/donors/verification-id
// ============================================================

async function uploadVerificationId(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (
      !userId
    ) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    if (
      !req.file
    ) {
      return res
        .status(400)
        .json({
          error:
            'Verification ID image is required.'
        });
    }

    // --------------------------------------------------------
    // FILE EXTENSION
    // --------------------------------------------------------

    const originalExtension =
      path
        .extname(
          req.file.originalname ||
          ''
        )
        .toLowerCase();

    let extension =
      originalExtension;

    if (
      ![
        '.jpg',
        '.jpeg',
        '.png',
        '.webp'
      ].includes(
        extension
      )
    ) {
      switch (
        req.file.mimetype
      ) {
        case 'image/png':
          extension =
            '.png';
          break;

        case 'image/webp':
          extension =
            '.webp';
          break;

        default:
          extension =
            '.jpg';
      }
    }

    // --------------------------------------------------------
    // PRIVATE PATH
    // --------------------------------------------------------

    const randomId =
      crypto
        .randomBytes(12)
        .toString('hex');

    const storagePath =
      `${userId}/${Date.now()}-${randomId}${extension}`;

    // --------------------------------------------------------
    // UPLOAD
    // --------------------------------------------------------

    const {
      data,
      error
    } =
      await supabaseAdmin
        .storage
        .from(
          'donor-verification'
        )
        .upload(
          storagePath,
          req.file.buffer,
          {
            contentType:
              req.file.mimetype,

            upsert:
              false
          }
        );

    if (
      error
    ) {
      console.error(
        'DONOR ID UPLOAD ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to upload verification ID.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // The uploaded storage path uniquely identifies the
    // verification document without recording its contents.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_verification',
      data.path
    );

    return res
      .status(201)
      .json({
        message:
          'Verification ID uploaded successfully.',

        path:
          data.path
      });
  } catch (
    error
  ) {
    console.error(
      'DONOR ID UPLOAD ERROR:',
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
// POST /api/donors/apply
// ============================================================

async function submitDonorApplication(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (
      !userId
    ) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    // --------------------------------------------------------
    // GET USER PROFILE
    // --------------------------------------------------------

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
          date_of_birth
        `)
        .eq(
          'id',
          userId
        )
        .maybeSingle();

    if (
      userError
    ) {
      console.error(
        'GET DONOR PROFILE ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify your profile.'
        });
    }

    if (
      !user
    ) {
      return res
        .status(404)
        .json({
          error:
            'User profile not found.'
        });
    }

    // --------------------------------------------------------
    // AGE REQUIREMENT
    // --------------------------------------------------------

    const age =
      calculateAge(
        user.date_of_birth
      );

    if (
      age === null
    ) {
      return res
        .status(400)
        .json({
          error:
            'Complete your date of birth before applying as a donor.'
        });
    }

    if (
      age < 18
    ) {
      return res
        .status(403)
        .json({
          error:
            'You must be at least 18 years old to register as a donor.'
        });
    }

    // --------------------------------------------------------
    // INPUTS
    // --------------------------------------------------------

    const bloodType =
      cleanText(
        req.body.blood_type
      );

    const hasDonatedBefore =
      toBoolean(
        req.body
          .has_donated_before
      );

    const lastDonationDate =
      cleanText(
        req.body
          .last_donation_date
      );

    const lastDonationFacility =
      cleanText(
        req.body
          .last_donation_facility
      );

    const latitude =
      toNumberOrNull(
        req.body
          .current_latitude
      );

    const longitude =
      toNumberOrNull(
        req.body
          .current_longitude
      );

    const travelRadiusKm =
      Number(
        req.body
          .travel_radius_km
      );

    const availabilityStatus =
      cleanText(
        req.body
          .availability_status
      );

    const allowUrgentRequests =
      toBoolean(
        req.body
          .allow_urgent_requests
      );

    const verificationIdPath =
      cleanText(
        req.body
          .verification_id_path
      );

    const consentConfirmed =
      toBoolean(
        req.body
          .consent_confirmed
      );

    // --------------------------------------------------------
    // BLOOD TYPE
    // --------------------------------------------------------

    if (
      !bloodType ||
      !VALID_BLOOD_TYPES.includes(
        bloodType
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please select a valid blood type.'
        });
    }

    // --------------------------------------------------------
    // DONATION HISTORY
    // --------------------------------------------------------

    if (
      hasDonatedBefore &&
      lastDonationDate
    ) {
      const donationDate =
        new Date(
          `${lastDonationDate}T00:00:00`
        );

      if (
        Number.isNaN(
          donationDate
            .getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid last donation date.'
          });
      }

      if (
        donationDate
          .getTime() >
        Date.now()
      ) {
        return res
          .status(400)
          .json({
            error:
              'Last donation date cannot be in the future.'
          });
      }
    }

    // --------------------------------------------------------
    // LOCATION
    // --------------------------------------------------------

    if (
      !isValidLatitude(
        latitude
      ) ||
      !isValidLongitude(
        longitude
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'A valid current location is required.'
        });
    }

    // --------------------------------------------------------
    // TRAVEL RADIUS
    // --------------------------------------------------------

    if (
      !VALID_RADII.includes(
        travelRadiusKm
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please select a valid travel distance.'
        });
    }

    // --------------------------------------------------------
    // AVAILABILITY
    // --------------------------------------------------------

    if (
      !availabilityStatus ||
      !VALID_AVAILABILITY.includes(
        availabilityStatus
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please select a valid availability status.'
        });
    }

    // --------------------------------------------------------
    // VERIFICATION DOCUMENT
    // --------------------------------------------------------

    if (
      !verificationIdPath
    ) {
      return res
        .status(400)
        .json({
          error:
            'Verification ID is required.'
        });
    }

    if (
      !verificationIdPath.startsWith(
        `${userId}/`
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid verification document.'
        });
    }

    // --------------------------------------------------------
    // CONSENT
    // --------------------------------------------------------

    if (
      !consentConfirmed
    ) {
      return res
        .status(400)
        .json({
          error:
            'You must confirm the donor verification consent.'
        });
    }

    // --------------------------------------------------------
    // EXISTING APPLICATION
    // --------------------------------------------------------

    const {
      data:
        existingApplication,
      error:
        existingError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(
          'id,status'
        )
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        'CHECK DONOR APPLICATION ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify existing donor application.'
        });
    }

    // --------------------------------------------------------
    // EXISTING ENTITY FOR FAILED/REAPPLICATION ATTEMPTS
    // --------------------------------------------------------

    if (
      existingApplication?.id
    ) {
      setActivityEntity(
        res,
        'donor_application',
        existingApplication.id
      );
    }

    if (
      existingApplication
        ?.status ===
      'approved'
    ) {
      return res
        .status(409)
        .json({
          error:
            'You are already an approved donor.'
        });
    }

    if (
      existingApplication
        ?.status ===
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Your donor application is already under review.'
        });
    }

    const applicationData = {
      user_id:
        userId,

      blood_type:
        bloodType,

      has_donated_before:
        hasDonatedBefore,

      last_donation_date:
        hasDonatedBefore
          ? lastDonationDate
          : null,

      last_donation_facility:
        hasDonatedBefore
          ? lastDonationFacility
          : null,

      current_latitude:
        latitude,

      current_longitude:
        longitude,

      travel_radius_km:
        travelRadiusKm,

      availability_status:
        availabilityStatus,

      allow_urgent_requests:
        allowUrgentRequests,

      verification_id_path:
        verificationIdPath,

      consent_confirmed:
        true,

      status:
        'pending',

      admin_note:
        null,

      reviewed_by:
        null,

      reviewed_at:
        null,

      submitted_at:
        new Date()
          .toISOString()
    };

    // --------------------------------------------------------
    // REAPPLICATION
    // --------------------------------------------------------

    if (
      existingApplication
    ) {
      const {
        data:
          updatedApplication,
        error:
          updateError
      } =
        await supabaseAdmin
          .from(
            'donor_applications'
          )
          .update(
            applicationData
          )
          .eq(
            'id',
            existingApplication
              .id
          )
          .select()
          .single();

      if (
        updateError
      ) {
        console.error(
          'UPDATE DONOR APPLICATION ERROR:',
          updateError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to submit donor application.'
          });
      }

      // ------------------------------------------------------
      // ACTIVITY ENTITY
      // ------------------------------------------------------

      setActivityEntity(
        res,
        'donor_application',
        updatedApplication.id
      );

      return res
        .status(200)
        .json({
          message:
            'Donor application submitted successfully.',

          application:
            updatedApplication
        });
    }

    // --------------------------------------------------------
    // NEW APPLICATION
    // --------------------------------------------------------

    const {
      data:
        createdApplication,
      error:
        insertError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .insert(
          applicationData
        )
        .select()
        .single();

    if (
      insertError
    ) {
      console.error(
        'CREATE DONOR APPLICATION ERROR:',
        insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to submit donor application.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      createdApplication.id
    );

    return res
      .status(201)
      .json({
        message:
          'Donor application submitted successfully.',

        application:
          createdApplication
      });
  } catch (
    error
  ) {
    console.error(
      'SUBMIT DONOR APPLICATION ERROR:',
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
// PATCH /api/donors/me/withdraw
// ============================================================

async function withdrawDonorApplication(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (
      !userId
    ) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const {
      data:
        application,
      error:
        findError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (
      findError
    ) {
      console.error(
        'GET DONOR APPLICATION ERROR:',
        findError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor application.'
        });
    }

    if (
      !application
    ) {
      return res
        .status(404)
        .json({
          error:
            'Donor application not found.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      application.id
    );

    if (
      application.status !==
      'pending'
    ) {
      return res
        .status(400)
        .json({
          error:
            'Only pending donor applications can be withdrawn.'
        });
    }

    const {
      data:
        updatedApplication,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .update({
          status:
            'withdrawn'
        })
        .eq(
          'id',
          application.id
        )
        .select()
        .single();

    if (
      updateError
    ) {
      console.error(
        'WITHDRAW DONOR APPLICATION ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to withdraw donor application.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      updatedApplication.id
    );

    return res
      .status(200)
      .json({
        message:
          'Donor application withdrawn successfully.',

        application:
          updatedApplication
      });
  } catch (
    error
  ) {
    console.error(
      'WITHDRAW DONOR APPLICATION ERROR:',
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
  getMyDonorApplication,
  getNearbyDonors,
  uploadVerificationId,
  submitDonorApplication,
  withdrawDonorApplication
};