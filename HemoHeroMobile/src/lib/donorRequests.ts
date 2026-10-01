import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';

// ============================================================
// TYPES
// ============================================================

export type DonorBloodRequest = {
  id: string;
  blood_type: string;
  units_needed: number;
  facility_name: string;
  facility_type?: string | null;
  facility_address?: string | null;
  facility_latitude?: number | null;
  facility_longitude?: number | null;
  urgency: 'urgent' | 'needed';
  needed_date?: string | null;
  needed_time?: string | null;
  message?: string | null;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  created_at: string;
  // Under review after several reports.
  flagged_at?: string | null;
  // Taken down by an admin after review.
  removed_at?: string | null;
  removal_reason?: string | null;
};

export type DonorResponseStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  // Released after the requester reported a no-show.
  | 'no_show';

export type DonorResponse = {
  id: string;
  request_id: string;
  donor_id: string;
  status: DonorResponseStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
};

export type DonorResponseCounts = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  no_show?: number;
};

// ============================================================
// REQUEST HELPER
// ============================================================

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await authorizedFetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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
      data?.error || 'Unable to complete request.'
    );
  }

  return data;
}

// ============================================================
// GET DONOR VIEW
// ============================================================

export async function getDonorViewBloodRequest(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/donor-view`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// GET MY RESPONSE
// ============================================================

export async function getMyDonorResponse(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/my-response`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// GET RESPONSES FOR MY BLOOD REQUEST
// ============================================================

export async function getResponsesForMyBloodRequest(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/responses`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// RESPOND AS DONOR
// ============================================================

export async function respondToBloodRequest(
  accessToken: string,
  requestId: string,
  message?: string
) {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/respond`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: message?.trim() || null,
      }),
    }
  );
}

// ============================================================
// WITHDRAW RESPONSE
// ============================================================

export async function withdrawDonorResponse(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/response/withdraw`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// REPORT A BLOOD REQUEST
//
// False request, asking for payment, wrong details. Several
// separate reports hide it from nearby donors until an admin
// reviews it.
// ============================================================

export type RequestReportReason =
  | 'False request'
  | 'Asking for payment'
  | 'Misleading information'
  | 'Other';

export async function reportBloodRequest(
  accessToken: string,
  requestId: string,
  input: {
    reason: RequestReportReason;
    details?: string;
  }
): Promise<{
  message: string;
  flagged: boolean;
}> {
  return request(
    `/api/requests/${encodeURIComponent(requestId)}/report`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: input.reason,
        details: input.details?.trim() || null,
      }),
    }
  );
}
