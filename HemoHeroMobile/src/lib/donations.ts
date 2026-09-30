import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';

// ============================================================
// BLOOD DONATIONS (TRANSACTION RECORD)
//
// The requester confirms an accepted donor's donation. It is
// recorded right away ('completed') unless an automatic check
// flags it for admin review ('needs_review'). Both sides can
// then leave feedback, and the donor can report a problem.
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type DonationStatus =
  | 'completed'
  | 'needs_review'
  | 'rejected';

export type DonationRole =
  | 'donor'
  | 'requester';

export type DonationFeedback = {
  from_role: DonationRole;

  rating: number;

  comment: string | null;

  created_at: string;

  updated_at?: string | null;
};

export type BloodDonation = {
  id: string;

  request_id: string | null;

  response_id: string | null;

  donor_id: string | null;

  requester_id: string | null;

  donor_name: string | null;

  requester_name: string | null;

  blood_type: string;

  facility_name: string | null;

  units_donated: number;

  donated_at: string;

  requester_note: string | null;

  status: DonationStatus;

  // Why a record is under review, e.g. 'donor_disputed'.
  review_reasons?: string[];

  // Admin's note when a flagged record was reviewed or rejected.
  admin_note: string | null;

  dispute_note?: string | null;

  verified_at: string | null;

  created_at: string;

  updated_at: string;

  // When the donor can donate again (donated_at + 90 days).
  next_eligible_at?: string | null;

  // Feedback both sides left (request donations and history).
  feedback?: DonationFeedback[];

  // History only: whether the signed-in user gave or received it.
  role?: DonationRole;
};

export type DonationSummary = {
  units_needed: number | null;

  recorded_count: number;

  recorded_units: number;

  completed_count: number;

  completed_units: number;

  needs_review_count: number;

  rejected_count: number;
};

export type MyDonationSummary =
  DonationSummary & {
    // Donations received for the user's own requests.
    received_count: number;

    last_completed_at: string | null;

    next_eligible_at: string | null;
  };

export type RecordDonationInput = {
  units_donated: number;

  // ISO timestamp; must not be in the future.
  donated_at: string;

  note?: string | null;
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

  if (
    !response.ok
  ) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

function jsonHeaders(
  token: string
) {
  return {
    Accept:
      'application/json',

    Authorization:
      `Bearer ${token}`,

    'Content-Type':
      'application/json',
  };
}

// ============================================================
// REQUESTER: CONFIRM A DONATION
// ============================================================

export async function recordDonation(
  token: string,
  requestId: string,
  responseId: string,
  input: RecordDonationInput
): Promise<{
  message: string;

  donation: BloodDonation;
}> {
  const response =
    await authorizedFetch(
      `${API_URL}/api/requests/${requestId}/responses/${responseId}/donation`,
      {
        method:
          'POST',

        headers:
          jsonHeaders(
            token
          ),

        body:
          JSON.stringify(
            input
          ),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// DONATIONS FOR A REQUEST
//
// Requester -> every donation; donor -> their own.
// ============================================================

export async function getRequestDonations(
  token: string,
  requestId: string
): Promise<{
  donations: BloodDonation[];

  summary: DonationSummary;
}> {
  const response =
    await authorizedFetch(
      `${API_URL}/api/requests/${requestId}/donations`,
      {
        method:
          'GET',

        headers: {
          Accept:
            'application/json',

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
// DONOR OR REQUESTER: TRANSACTION FEEDBACK
//
// Sending again updates your previous feedback.
// ============================================================

export async function submitDonationFeedback(
  token: string,
  requestId: string,
  donationId: string,
  input: {
    rating: number;

    comment?: string | null;
  }
): Promise<{
  message: string;
}> {
  const response =
    await authorizedFetch(
      `${API_URL}/api/requests/${requestId}/donations/${donationId}/feedback`,
      {
        method:
          'POST',

        headers:
          jsonHeaders(
            token
          ),

        body:
          JSON.stringify(
            input
          ),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// DONOR: REPORT A PROBLEM WITH THE RECORD
// ============================================================

export async function disputeDonation(
  token: string,
  requestId: string,
  donationId: string,
  note: string
): Promise<{
  message: string;

  donation: BloodDonation;
}> {
  const response =
    await authorizedFetch(
      `${API_URL}/api/requests/${requestId}/donations/${donationId}/dispute`,
      {
        method:
          'POST',

        headers:
          jsonHeaders(
            token
          ),

        body:
          JSON.stringify({
            note,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// DONOR: MY DONATION HISTORY
// ============================================================

export async function getMyDonations(
  token: string
): Promise<{
  donations: BloodDonation[];

  summary: MyDonationSummary;
}> {
  const response =
    await authorizedFetch(
      `${API_URL}/api/donations/me`,
      {
        method:
          'GET',

        headers: {
          Accept:
            'application/json',

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
// DISPLAY HELPERS
// ============================================================

export function getDonationStatusLabel(
  status: DonationStatus
) {
  switch (status) {
    case 'completed':
      return 'Recorded';

    case 'rejected':
      return 'Not accepted';

    default:
      return 'Under review';
  }
}

// Feedback one side left, if any.
export function getFeedbackFrom(
  donation: BloodDonation | null | undefined,
  role: DonationRole
) {
  return (
    donation?.feedback?.find(
      item =>
        item.from_role ===
        role
    ) ||
    null
  );
}
