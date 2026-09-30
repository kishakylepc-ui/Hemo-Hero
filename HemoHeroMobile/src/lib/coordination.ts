import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';

// ============================================================
// TYPES
// ============================================================

export type CoordinationPerson = {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  full_name: string;
  city?: string | null;
  province?: string | null;
  role: 'requester' | 'donor';
  blood_type?: string | null;
  verified?: boolean;
  availability_status?: string | null;
  travel_radius_km?: number | null;
};

export type CoordinationRequest = {
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
};

export type CoordinationResponse = {
  id: string;
  request_id: string;
  donor_id: string;
  status: string;
  message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CoordinationSchedule = {
  id: string;
  request_id: string;
  response_id: string;
  scheduled_at: string;
  note?: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type CoordinationSession = {
  request: CoordinationRequest;
  response: CoordinationResponse;
  requester: CoordinationPerson;
  donor: CoordinationPerson;
  viewer_role: 'requester' | 'donor';
  schedule: CoordinationSchedule | null;
};

export type CoordinationMessage = {
  id: string;
  request_id: string;
  response_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: CoordinationPerson | null;
  is_mine: boolean;
};

export type CoordinationInboxItem = {
  request_id: string;
  response_id: string;
  viewer_role: 'requester' | 'donor';
  other_participant: CoordinationPerson;
  blood_type: string;
  units_needed: number;
  facility_name: string;
  request_status: CoordinationRequest['status'];
  response_status: 'accepted';
  latest_message: {
    id: string;
    message: string;
    created_at: string;
    is_mine: boolean;
  } | null;
  schedule: CoordinationSchedule | null;
  last_activity_at: string | null;
};

// ============================================================
// RESPONSE HELPER
// ============================================================

async function parseResponse(response: Response) {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
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
// GET COORDINATION SESSION
// ============================================================

export async function getCoordinationSession(
  token: string,
  requestId: string,
  responseId: string
): Promise<{ coordination: CoordinationSession }> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/${requestId}/responses/${responseId}/coordination`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseResponse(response);
}

// ============================================================
// GET MESSAGES
// ============================================================

export async function getCoordinationMessages(
  token: string,
  requestId: string,
  responseId: string
): Promise<{
  count: number;
  messages: CoordinationMessage[];
}> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/${requestId}/responses/${responseId}/messages`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseResponse(response);
}

// ============================================================
// SEND MESSAGE
// ============================================================

export async function sendCoordinationMessage(
  token: string,
  requestId: string,
  responseId: string,
  message: string
): Promise<{
  message: string;
  data: CoordinationMessage;
}> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/${requestId}/responses/${responseId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );

  return parseResponse(response);
}

// ============================================================
// SET / UPDATE SCHEDULE
// ============================================================

export async function saveCoordinationSchedule(
  token: string,
  requestId: string,
  responseId: string,
  scheduledAt: string,
  note?: string
): Promise<{
  message: string;
  schedule: CoordinationSchedule;
}> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/${requestId}/responses/${responseId}/schedule`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduled_at: scheduledAt,
        note: note?.trim() || null,
      }),
    }
  );

  return parseResponse(response);
}

// ============================================================
// SUBMIT FEEDBACK / REPORT
//
// The server derives who is being reported from this
// conversation. The client never sends a user id.
// ============================================================

export type CoordinationSupportKind =
  | 'feedback'
  | 'report';

export async function submitCoordinationSupport(
  token: string,
  requestId: string,
  responseId: string,
  input: {
    kind: CoordinationSupportKind;
    reason?: string;
    details: string;
  }
): Promise<{
  message: string;
  report: {
    id: string;
    kind: CoordinationSupportKind;
    reason: string | null;
    status: string;
    created_at: string;
  };
}> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/${requestId}/responses/${responseId}/reports`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: input.kind,
        reason:
          input.kind === 'report'
            ? input.reason || null
            : null,
        details: input.details.trim(),
      }),
    }
  );

  return parseResponse(response);
}

// ============================================================
// GET COORDINATION INBOX
// ============================================================

export class CoordinationInboxError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'CoordinationInboxError';
  }
}

export async function getCoordinationInbox(
  token: string,
  signal?: AbortSignal
): Promise<{
  count: number;
  conversations: CoordinationInboxItem[];
}> {
  const response = await authorizedFetch(
    `${API_URL}/api/requests/coordination/inbox`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    }
  );

  try {
    return await parseResponse(response);
  } catch (error) {
    throw new CoordinationInboxError(
      error instanceof Error
        ? error.message
        : 'Unable to load donation conversations.',
      response.status
    );
  }
}