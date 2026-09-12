import { Platform } from 'react-native';

// ============================================================
// API URL
// ============================================================

const API_URL = (
  Platform.OS === 'web'
    ? 'http://localhost:5000'
    : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

// ============================================================
// TYPES
// ============================================================

export type NearbyBloodRequest = {
  id: string;
  requester_id: string;
  blood_type: string;
  units_needed: number;
  facility_name: string;
  facility_type?: string | null;
  facility_address?: string | null;
  facility_latitude: number;
  facility_longitude: number;
  urgency: 'urgent' | 'needed';
  needed_date?: string | null;
  needed_time?: string | null;
  message?: string | null;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  created_at: string;
  distance_km: number;
};

export type NearbyBloodRequestResponse = {
  requests: NearbyBloodRequest[];
  count: number;
  search: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
};

// ============================================================
// GET NEARBY BLOOD REQUESTS
// ============================================================

export async function getNearbyBloodRequests(
  accessToken: string,
  latitude: number,
  longitude: number,
  radiusKm = 25,
  limit = 3
): Promise<NearbyBloodRequestResponse> {
  const url =
    `${API_URL}/api/requests/nearby` +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&radius=${encodeURIComponent(radiusKm)}` +
    `&limit=${encodeURIComponent(limit)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to load nearby blood requests.'
    );
  }

  return {
    requests: Array.isArray(data?.requests) ? data.requests : [],
    count: Number(data?.count || 0),
    search: {
      latitude: Number(data?.search?.latitude || latitude),
      longitude: Number(data?.search?.longitude || longitude),
      radius_km: Number(data?.search?.radius_km || radiusKm),
    },
  };
}