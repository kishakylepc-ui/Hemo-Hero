import {
  Platform,
} from 'react-native';

// ============================================================
// API URL
// ============================================================

const API_URL = (
  Platform.OS === 'web'
    ? 'http://localhost:5000'
    : process.env.EXPO_PUBLIC_API_URL ||
      'http://localhost:5000'
).replace(/\/+$/, '');

// ============================================================
// TYPES
// ============================================================

export type PublicDonorProfile = {
  id: string;

  full_name: string;

  first_name?: string | null;

  last_name?: string | null;

  profile_photo_url?: string | null;

  blood_type: string;

  verified: boolean;

  availability_status:
    | 'available'
    | 'unavailable';

  allow_urgent_requests: boolean;

  city?: string | null;

  province?: string | null;

  location?: string | null;

  distance_km?: number | null;

  travel_radius_km?: number | null;

  has_donated_before: boolean;

  last_donation_date?: string | null;

  reviewed_at?: string | null;

  updated_at?: string | null;
};

export type PublicDonorProfileResponse = {
  donor: PublicDonorProfile;
};

// ============================================================
// OPTIONS
// ============================================================

export type GetPublicDonorProfileOptions = {
  latitude?: number | null;

  longitude?: number | null;
};

// ============================================================
// GET PUBLIC DONOR PROFILE
//
// GET /api/donors/:id
//
// Optional:
// latitude
// longitude
//
// The backend uses requester coordinates only to calculate
// distance. Exact donor coordinates are never returned.
// ============================================================

export async function getPublicDonorProfile(
  accessToken: string,
  donorId: string,
  options: GetPublicDonorProfileOptions = {}
): Promise<PublicDonorProfileResponse> {
  // ==========================================================
  // VALIDATE DONOR ID
  // ==========================================================

  const cleanDonorId =
    String(
      donorId || ''
    ).trim();

  if (
    !cleanDonorId
  ) {
    throw new Error(
      'Donor ID is required.'
    );
  }

  // ==========================================================
  // LOCATION
  // ==========================================================

  const {
    latitude = null,
    longitude = null,
  } =
    options;

  const hasLatitude =
    latitude !== null &&
    latitude !== undefined;

  const hasLongitude =
    longitude !== null &&
    longitude !== undefined;

  if (
    hasLatitude !==
    hasLongitude
  ) {
    throw new Error(
      'Latitude and longitude must be provided together.'
    );
  }

  if (
    hasLatitude &&
    hasLongitude
  ) {
    if (
      !Number.isFinite(
        latitude
      ) ||
      Number(
        latitude
      ) < -90 ||
      Number(
        latitude
      ) > 90
    ) {
      throw new Error(
        'Invalid latitude.'
      );
    }

    if (
      !Number.isFinite(
        longitude
      ) ||
      Number(
        longitude
      ) < -180 ||
      Number(
        longitude
      ) > 180
    ) {
      throw new Error(
        'Invalid longitude.'
      );
    }
  }

  // ==========================================================
  // QUERY PARAMETERS
  // ==========================================================

  const params =
    new URLSearchParams();

  if (
    hasLatitude &&
    hasLongitude
  ) {
    params.set(
      'latitude',
      String(
        latitude
      )
    );

    params.set(
      'longitude',
      String(
        longitude
      )
    );
  }

  const query =
    params.toString();

  const url =
    `${API_URL}/api/donors/${encodeURIComponent(
      cleanDonorId
    )}${
      query
        ? `?${query}`
        : ''
    }`;

  // ==========================================================
  // REQUEST
  // ==========================================================

  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers: {
          Accept:
            'application/json',

          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  let data:
    any =
    null;

  try {
    data =
      await response.json();
  } catch {
    data =
      null;
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    !response.ok
  ) {
    throw new Error(
      data?.error ||
      'Unable to load donor profile.'
    );
  }

  if (
    !data?.donor
  ) {
    throw new Error(
      'Donor profile was not returned.'
    );
  }

  // ==========================================================
  // NORMALIZE RESPONSE
  // ==========================================================

  const donor:
    PublicDonorProfile = {
      id:
        String(
          data.donor.id ||
          ''
        ),

      full_name:
        String(
          data.donor.full_name ||
          'Hemo-Hero Donor'
        ),

      first_name:
        data.donor.first_name ||
        null,

      last_name:
        data.donor.last_name ||
        null,

      profile_photo_url:
        data.donor.profile_photo_url ||
        null,

      blood_type:
        String(
          data.donor.blood_type ||
          ''
        ),

      verified:
        data.donor.verified ===
        true,

      availability_status:
        data.donor.availability_status ===
        'unavailable'
          ? 'unavailable'
          : 'available',

      allow_urgent_requests:
        data.donor.allow_urgent_requests ===
        true,

      city:
        data.donor.city ||
        null,

      province:
        data.donor.province ||
        null,

      location:
        data.donor.location ||
        null,

      distance_km:
        data.donor.distance_km ===
          null ||
        data.donor.distance_km ===
          undefined
          ? null
          : Number(
              data.donor
                .distance_km
            ),

      travel_radius_km:
        data.donor.travel_radius_km ===
          null ||
        data.donor.travel_radius_km ===
          undefined
          ? null
          : Number(
              data.donor
                .travel_radius_km
            ),

      has_donated_before:
        data.donor.has_donated_before ===
        true,

      last_donation_date:
        data.donor.last_donation_date ||
        null,

      reviewed_at:
        data.donor.reviewed_at ||
        null,

      updated_at:
        data.donor.updated_at ||
        null,
    };

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    donor,
  };
}