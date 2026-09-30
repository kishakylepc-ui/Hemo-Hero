import { Platform } from 'react-native';
import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';

// ============================================================
// TYPES
// ============================================================

export type DonorApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type DonorAvailabilityStatus =
  | 'available'
  | 'unavailable';

export type DonorApplication = {
  id: string;
  user_id: string;
  blood_type: string;
  has_donated_before: boolean;

  // Exact date (YYYY-MM-DD). Null when unknown or approximate.
  last_donation_date?: string | null;

  // Approximate last donation, used only when the exact date
  // was not remembered. Never set together with the exact date.
  last_donation_month?: number | null;
  last_donation_year?: number | null;

  last_donation_facility?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  travel_radius_km: number;
  availability_status: DonorAvailabilityStatus;
  allow_urgent_requests: boolean;
  consent_confirmed: boolean;
  status: DonorApplicationStatus;
  admin_note?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export type SubmitDonorApplicationInput = {
  blood_type: string;
  has_donated_before: boolean;

  // Send EITHER the exact date OR month + year, never both.
  // First-time donors send neither.
  last_donation_date?: string | null;
  last_donation_month?: number | null;
  last_donation_year?: number | null;

  last_donation_facility?: string | null;
  current_latitude: number;
  current_longitude: number;
  travel_radius_km: 5 | 10 | 20 | 30 | 50;
  availability_status: DonorAvailabilityStatus;
  allow_urgent_requests: boolean;
  verification_id_path: string;
  consent_confirmed: boolean;
};

export type VerificationImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: any;
};

// ============================================================
// JSON HELPER
// ============================================================

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// GET MY DONOR APPLICATION
// ============================================================

export async function getMyDonorApplication(
  accessToken: string
) {
  const response = await authorizedFetch(`${API_URL}/api/donors/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to retrieve donor application.'
    );
  }

  return data as {
    application: DonorApplication | null;
    can_respond: boolean;
  };
}

// ============================================================
// UPLOAD VERIFICATION ID
// ============================================================

export async function uploadDonorVerificationId(
  accessToken: string,
  asset: VerificationImageAsset
) {
  const formData = new FormData();

  const fileName =
    asset.fileName || `verification-${Date.now()}.jpg`;

  const mimeType = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web' && asset.file) {
    formData.append('file', asset.file, fileName);
  } else {
    formData.append(
      'file',
      {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any
    );
  }

  const response = await authorizedFetch(
    `${API_URL}/api/donors/verification-id`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to upload verification ID.'
    );
  }

  return data as {
    message: string;
    path: string;
  };
}

// ============================================================
// SUBMIT DONOR APPLICATION
// ============================================================

export async function submitDonorApplication(
  accessToken: string,
  input: SubmitDonorApplicationInput
) {
  const response = await authorizedFetch(
    `${API_URL}/api/donors/apply`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to submit donor application.'
    );
  }

  return data as {
    message: string;
    application: DonorApplication;
  };
}

// ============================================================
// WITHDRAW DONOR APPLICATION
// ============================================================

export async function withdrawDonorApplication(
  accessToken: string
) {
  const response = await authorizedFetch(
    `${API_URL}/api/donors/me/withdraw`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to withdraw donor application.'
    );
  }

  return data;
}