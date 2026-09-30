import {
  Platform,
} from 'react-native';
import { authorizedFetch } from './authFetch';

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

export type NearbyDonor = {
  id: string;

  full_name: string;

  first_name?: string | null;

  last_name?: string | null;

  blood_type: string;

  city?: string | null;

  province?: string | null;

  profile_photo_url?: string | null;

  distance_km: number;

  verified: boolean;

  availability_status:
    | 'available'
    | 'unavailable';

  allow_urgent_requests: boolean;

  travel_radius_km?: number | null;

  reviewed_at?: string | null;

  updated_at?: string | null;
};

export type NearbyDonorSearch = {
  radius_km: number;

  blood_type?: string | null;

  urgent_only: boolean;
};

export type NearbyDonorResponse = {
  donors: NearbyDonor[];

  count: number;

  search: NearbyDonorSearch;
};

// ============================================================
// OPTIONS
// ============================================================

export type NearbyDonorOptions = {
  latitude: number;

  longitude: number;

  radiusKm?: number;

  /**
   * Recipient blood type.
   *
   * Example:
   * If A+ is passed, the backend returns donors whose blood
   * can donate red blood cells to an A+ recipient.
   */
  neededBloodType?: string | null;

  urgentOnly?: boolean;

  limit?: number;
};

// ============================================================
// GET NEARBY DONORS
//
// GET /api/donors/nearby
//
// Exact donor coordinates are never returned by the backend.
// ============================================================

export async function getNearbyDonors(
  accessToken: string,
  options: NearbyDonorOptions
): Promise<NearbyDonorResponse> {
  const {
    latitude,
    longitude,
    radiusKm = 25,
    neededBloodType = null,
    urgentOnly = false,
    limit = 50,
  } = options;

  // ==========================================================
  // VALIDATE LOCATION
  // ==========================================================

  if (
    !Number.isFinite(
      latitude
    ) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      'Invalid latitude.'
    );
  }

  if (
    !Number.isFinite(
      longitude
    ) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Invalid longitude.'
    );
  }

  // ==========================================================
  // QUERY
  // ==========================================================

  const params =
    new URLSearchParams();

  params.set(
    'latitude',
    String(latitude)
  );

  params.set(
    'longitude',
    String(longitude)
  );

  params.set(
    'radius',
    String(radiusKm)
  );

  params.set(
    'limit',
    String(limit)
  );

  if (
    neededBloodType
  ) {
    params.set(
      'blood_type',
      neededBloodType
    );
  }

  if (
    urgentOnly
  ) {
    params.set(
      'urgent',
      'true'
    );
  }

  const url =
    `${API_URL}/api/donors/nearby?${params.toString()}`;

  // ==========================================================
  // REQUEST
  // ==========================================================

  const response =
    await authorizedFetch(
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
      'Unable to load nearby donors.'
    );
  }

  // ==========================================================
  // NORMALIZE DONORS
  // ==========================================================

  const donors:
    NearbyDonor[] =
    Array.isArray(
      data?.donors
    )
      ? data.donors.map(
          (
            donor: any
          ) => ({
            id:
              String(
                donor?.id ||
                ''
              ),

            full_name:
              String(
                donor?.full_name ||
                'Hemo-Hero Donor'
              ),

            first_name:
              donor?.first_name ||
              null,

            last_name:
              donor?.last_name ||
              null,

            blood_type:
              String(
                donor?.blood_type ||
                ''
              ),

            city:
              donor?.city ||
              null,

            province:
              donor?.province ||
              null,

            profile_photo_url:
              donor?.profile_photo_url ||
              null,

            distance_km:
              Number(
                donor?.distance_km ||
                0
              ),

            verified:
              donor?.verified ===
              true,

            availability_status:
              donor?.availability_status ===
              'unavailable'
                ? 'unavailable'
                : 'available',

            allow_urgent_requests:
              donor?.allow_urgent_requests ===
              true,

            travel_radius_km:
              donor?.travel_radius_km ===
                null ||
              donor?.travel_radius_km ===
                undefined
                ? null
                : Number(
                    donor
                      .travel_radius_km
                  ),

            reviewed_at:
              donor?.reviewed_at ||
              null,

            updated_at:
              donor?.updated_at ||
              null,
          })
        )
      : [];

  // ==========================================================
  // RESPONSE
  // ==========================================================

  return {
    donors,

    count:
      Number(
        data?.count ||
        donors.length
      ),

    search: {
      radius_km:
        Number(
          data?.search
            ?.radius_km ||
          radiusKm
        ),

      blood_type:
        data?.search
          ?.blood_type ||
        neededBloodType ||
        null,

      urgent_only:
        data?.search
          ?.urgent_only ===
        true,
    },
  };
}