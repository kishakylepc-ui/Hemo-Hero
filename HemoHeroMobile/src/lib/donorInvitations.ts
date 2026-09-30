import {
  Platform,
} from 'react-native';
import { authorizedFetch } from './authFetch';

// ============================================================
// API URL
// ============================================================

const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000'
    : process.env.EXPO_PUBLIC_API_URL ||
      'http://localhost:5000';

// ============================================================
// TYPES
// ============================================================

export type DonorInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';

// ============================================================
// BLOOD REQUEST
// ============================================================

export type DonorInvitationBloodRequest = {
  id: string;

  requester_id: string;

  status: string;

  blood_type: string;

  units_needed?:
    | number
    | null;

  facility_name: string;

  facility_type?:
    | string
    | null;

  facility_address?:
    | string
    | null;

  urgency?:
    | string
    | null;

  needed_date?:
    | string
    | null;

  needed_time?:
    | string
    | null;

  message?:
    | string
    | null;

  created_at?:
    | string
    | null;
};

// ============================================================
// REQUESTER
// ============================================================

export type DonorInvitationRequester = {
  id: string;

  first_name?:
    | string
    | null;

  last_name?:
    | string
    | null;

  full_name: string;

  city?:
    | string
    | null;

  province?:
    | string
    | null;

  profile_photo_url?:
    | string
    | null;
};

// ============================================================
// DONOR RESPONSE
// ============================================================

export type InvitationDonorResponse = {
  id: string;

  request_id: string;

  donor_id: string;

  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';

  message?:
    | string
    | null;

  created_at?:
    | string
    | null;

  updated_at?:
    | string
    | null;
};

// ============================================================
// DONOR INVITATION
// ============================================================

export type DonorInvitation = {
  id: string;

  request_id: string;

  requester_id: string;

  donor_id: string;

  status:
    DonorInvitationStatus;

  message?:
    | string
    | null;

  responded_at?:
    | string
    | null;

  created_at: string;

  updated_at?:
    | string
    | null;

  request?:
    | DonorInvitationBloodRequest
    | null;

  requester?:
    | DonorInvitationRequester
    | null;
};

// ============================================================
// COUNTS
// ============================================================

export type DonorInvitationCounts = {
  total: number;

  pending: number;

  accepted: number;

  declined: number;

  cancelled: number;
};

// ============================================================
// RESPONSES
// ============================================================

export type SendDonorInvitationResponse = {
  message: string;

  invitation:
    DonorInvitation;
};

export type GetMyDonorInvitationsResponse = {
  count: number;

  counts:
    DonorInvitationCounts;

  invitations:
    DonorInvitation[];
};

export type AcceptDonorInvitationResponse = {
  message: string;

  invitation:
    DonorInvitation;

  response:
    InvitationDonorResponse;
};

export type DeclineDonorInvitationResponse = {
  message: string;

  invitation:
    DonorInvitation;
};

// ============================================================
// ERROR HELPER
// ============================================================

async function getErrorMessage(
  response: Response,
  fallback: string
) {
  try {
    const data =
      await response.json();

    if (
      data?.error &&
      typeof data.error ===
        'string'
    ) {
      return data.error;
    }

    if (
      data?.message &&
      typeof data.message ===
        'string'
    ) {
      return data.message;
    }
  } catch {
    // Ignore invalid JSON.
  }

  return fallback;
}

// ============================================================
// SEND DONOR INVITATION
//
// POST /api/requests/:requestId/invitations
// ============================================================

export async function sendDonorInvitation(
  accessToken: string,
  requestId: string,
  donorId: string,
  message?:
    | string
    | null
): Promise<SendDonorInvitationResponse> {
  const cleanRequestId =
    String(
      requestId ||
      ''
    ).trim();

  const cleanDonorId =
    String(
      donorId ||
      ''
    ).trim();

  const cleanMessage =
    message?.trim() ||
    null;

  if (
    !cleanRequestId
  ) {
    throw new Error(
      'Blood request ID is required.'
    );
  }

  if (
    !cleanDonorId
  ) {
    throw new Error(
      'Donor ID is required.'
    );
  }

  let response:
    Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/requests/${encodeURIComponent(
          cleanRequestId
        )}/invitations`,
        {
          method:
            'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              donor_id:
                cleanDonorId,

              message:
                cleanMessage,
            }),
        }
      );
  } catch (error) {
    console.log(
      'SEND DONOR INVITATION NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server. Make sure the backend is running.'
    );
  }

  if (
    !response.ok
  ) {
    const messageText =
      await getErrorMessage(
        response,
        'Unable to send donor invitation.'
      );

    throw new Error(
      messageText
    );
  }

  return (
    await response.json()
  ) as SendDonorInvitationResponse;
}

// ============================================================
// GET MY DONOR INVITATIONS
//
// GET /api/donor-invitations/me
// ============================================================

export async function getMyDonorInvitations(
  accessToken: string
): Promise<GetMyDonorInvitationsResponse> {
  let response:
    Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/donor-invitations/me`,
        {
          method:
            'GET',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );
  } catch (error) {
    console.log(
      'GET DONOR INVITATIONS NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server. Make sure the backend is running.'
    );
  }

  if (
    !response.ok
  ) {
    const messageText =
      await getErrorMessage(
        response,
        'Unable to retrieve donor invitations.'
      );

    throw new Error(
      messageText
    );
  }

  return (
    await response.json()
  ) as GetMyDonorInvitationsResponse;
}

// ============================================================
// ACCEPT DONOR INVITATION
//
// PATCH /api/donor-invitations/:invitationId/accept
// ============================================================

export async function acceptDonorInvitation(
  accessToken: string,
  invitationId: string
): Promise<AcceptDonorInvitationResponse> {
  const cleanInvitationId =
    String(
      invitationId ||
      ''
    ).trim();

  if (
    !cleanInvitationId
  ) {
    throw new Error(
      'Invitation ID is required.'
    );
  }

  let response:
    Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/donor-invitations/${encodeURIComponent(
          cleanInvitationId
        )}/accept`,
        {
          method:
            'PATCH',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },
        }
      );
  } catch (error) {
    console.log(
      'ACCEPT DONOR INVITATION NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server. Make sure the backend is running.'
    );
  }

  if (
    !response.ok
  ) {
    const messageText =
      await getErrorMessage(
        response,
        'Unable to accept donor invitation.'
      );

    throw new Error(
      messageText
    );
  }

  return (
    await response.json()
  ) as AcceptDonorInvitationResponse;
}

// ============================================================
// DECLINE DONOR INVITATION
//
// PATCH /api/donor-invitations/:invitationId/decline
// ============================================================

export async function declineDonorInvitation(
  accessToken: string,
  invitationId: string
): Promise<DeclineDonorInvitationResponse> {
  const cleanInvitationId =
    String(
      invitationId ||
      ''
    ).trim();

  if (
    !cleanInvitationId
  ) {
    throw new Error(
      'Invitation ID is required.'
    );
  }

  let response:
    Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/donor-invitations/${encodeURIComponent(
          cleanInvitationId
        )}/decline`,
        {
          method:
            'PATCH',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },
        }
      );
  } catch (error) {
    console.log(
      'DECLINE DONOR INVITATION NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server. Make sure the backend is running.'
    );
  }

  if (
    !response.ok
  ) {
    const messageText =
      await getErrorMessage(
        response,
        'Unable to decline donor invitation.'
      );

    throw new Error(
      messageText
    );
  }

  return (
    await response.json()
  ) as DeclineDonorInvitationResponse;
}