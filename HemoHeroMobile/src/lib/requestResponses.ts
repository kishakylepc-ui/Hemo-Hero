const API_URL =
  (
    process.env
      .EXPO_PUBLIC_API_URL ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

// ============================================================
// TYPES
// ============================================================

export type RequestDonorProfile = {
  id: string | null;

  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;

  full_name: string;

  city: string | null;
  province: string | null;

  blood_type: string | null;

  verification_status: string;

  is_verified: boolean;

  availability_status:
    | 'available'
    | 'unavailable'
    | string
    | null;

  travel_radius_km:
    | number
    | null;

  allow_urgent_requests:
    boolean;
};

export type RequestDonorResponse = {
  id: string;

  request_id: string;

  donor_id: string;

  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';

  message:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;

  donor:
    | RequestDonorProfile
    | null;
};

export type RequestResponseCounts = {
  total: number;

  pending: number;

  accepted: number;

  rejected: number;

  withdrawn: number;
};

export type RequestResponsesResult = {
  count: number;

  counts:
    RequestResponseCounts;

  responses:
    RequestDonorResponse[];
};

export type FulfillBloodRequestResult = {
  message: string;

  accepted_donor_count:
    number;

  request: any;
};

// ============================================================
// RESPONSE HELPER
// ============================================================

async function parseResponse(
  response: Response
) {
  let data: any =
    null;

  try {
    data =
      await response.json();
  } catch {
    data =
      null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

// ============================================================
// GET DONOR OFFERS
// ============================================================

export async function getRequestDonorResponses(
  token: string,
  requestId: string
): Promise<RequestResponsesResult> {
  const response =
    await fetch(
      `${API_URL}/api/requests/${requestId}/responses`,
      {
        method:
          'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// ACCEPT DONOR
// ============================================================

export async function acceptRequestDonorResponse(
  token: string,
  requestId: string,
  responseId: string
): Promise<{
  message: string;

  response:
    RequestDonorResponse;
}> {
  const response =
    await fetch(
      `${API_URL}/api/requests/${requestId}/responses/${responseId}/accept`,
      {
        method:
          'PATCH',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// REJECT DONOR
// ============================================================

export async function rejectRequestDonorResponse(
  token: string,
  requestId: string,
  responseId: string
): Promise<{
  message: string;

  response:
    RequestDonorResponse;
}> {
  const response =
    await fetch(
      `${API_URL}/api/requests/${requestId}/responses/${responseId}/reject`,
      {
        method:
          'PATCH',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// MARK REQUEST AS FULFILLED
// ============================================================

export async function fulfillBloodRequest(
  token: string,
  requestId: string
): Promise<FulfillBloodRequestResult> {
  const response =
    await fetch(
      `${API_URL}/api/requests/${requestId}/fulfill`,
      {
        method:
          'PATCH',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },
      }
    );

  return parseResponse(
    response
  );
}