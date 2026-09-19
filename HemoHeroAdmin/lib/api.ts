// ============================================================
// HEMO-HERO ADMIN
// API CLIENT
// ============================================================

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5000';

export const API_URL =
  RAW_API_URL.replace(/\/+$/, '');

// ============================================================
// TYPES
// ============================================================

export type AdminProfile = {
  id: string;

  email?: string | null;

  first_name?: string | null;

  middle_name?: string | null;

  last_name?: string | null;

  suffix?: string | null;

  role?: string | null;
};

export type AuthSession = {
  access_token: string;

  refresh_token?: string | null;

  expires_in?: number | null;

  expires_at?: number | null;

  token_type?: string | null;
};

export type AdminLoginResponse = {
  session: AuthSession;

  user: any;

  profile: AdminProfile;
};

// ============================================================
// DONOR APPLICATION TYPES
// ============================================================

export type DonorApplicationSummary = {
  total: number;

  pending: number;

  approved: number;

  rejected: number;

  withdrawn: number;
};

export type AdminDonorUser = {
  id: string;

  email?: string | null;

  first_name?: string | null;

  middle_name?: string | null;

  last_name?: string | null;

  suffix?: string | null;

  phone?: string | null;

  date_of_birth?: string | null;

  gender?: string | null;

  city?: string | null;

  province?: string | null;

  role?: string | null;
};

export type DonorApplication = {
  id: string;

  user_id: string;

  blood_type: string;

  has_donated_before: boolean;

  last_donation_date?: string | null;

  last_donation_facility?: string | null;

  current_latitude?: number | null;

  current_longitude?: number | null;

  travel_radius_km: number;

  availability_status:
    | 'available'
    | 'unavailable';

  allow_urgent_requests: boolean;

  verification_id_path?: string | null;

  consent_confirmed: boolean;

  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'withdrawn';

  admin_note?: string | null;

  reviewed_by?: string | null;

  reviewed_at?: string | null;

  submitted_at?: string | null;

  created_at?: string | null;

  updated_at?: string | null;

  user?: AdminDonorUser | null;

  verification?: {
    available?: boolean;

    url?: string | null;

    expires_in_seconds?: number;
  } | null;
};

// ============================================================
// ACTIVITY LOG TYPES
// ============================================================

export type ActivityLog = {
  id: string;

  user_id?: string | null;

  user_email?: string | null;

  user_role?: string | null;

  action: string;

  module: string;

  http_method?: string | null;

  route?: string | null;

  status_code?: number | null;

  success: boolean;

  description?: string | null;

  entity_type?: string | null;

  entity_id?: string | null;

  ip_address?: string | null;

  user_agent?: string | null;

  metadata?: Record<
    string,
    unknown
  > | null;

  created_at: string;
};

export type ActivityLogSummary = {
  total: number;

  successful: number;

  failed: number;
};

export type ActivityLogPagination = {
  page: number;

  limit: number;

  total: number;

  total_pages: number;
};

export type ActivityLogFilters = {
  page?: number;

  limit?: number;

  action?: string;

  module?: string;

  success?: boolean;

  user_email?: string;
};

export type ActivityLogResponse = {
  logs: ActivityLog[];

  pagination:
    ActivityLogPagination;

  filters?: {
    action?: string | null;

    module?: string | null;

    success?: boolean | null;

    user_email?: string | null;
  };
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

// ============================================================
// ADMIN LOGIN
// ============================================================

export async function loginAdmin(
  email: string,
  password: string
): Promise<AdminLoginResponse> {
  const response =
    await fetch(
      `${API_URL}/api/auth/login`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            email:
              email.trim(),

            password,
          }),
      }
    );

  const data =
    await parseResponse(
      response
    );

  if (
    !data?.session
      ?.access_token
  ) {
    throw new Error(
      'The server did not return a valid login session.'
    );
  }

  if (
    !data?.profile ||
    data.profile.role !==
      'admin'
  ) {
    throw new Error(
      'This account is not authorized to access the Hemo-Hero Admin Portal.'
    );
  }

  return data;
}

// ============================================================
// PASSWORD RESET
// ============================================================

export async function requestAdminPasswordReset(
  email: string
) {
  const response =
    await fetch(
      `${API_URL}/api/auth/forgot-password`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            email:
              email.trim(),
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// DONOR APPLICATION SUMMARY
// ============================================================

export async function getAdminDonorSummary(
  token: string
): Promise<{
  summary: DonorApplicationSummary;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications/summary`,
      {
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
// GET DONOR APPLICATIONS
// ============================================================

export async function getAdminDonorApplications(
  token: string,
  status?: string
): Promise<{
  applications: DonorApplication[];
}> {
  const query =
    status &&
    status !==
      'all'
      ? `?status=${encodeURIComponent(
          status
        )}`
      : '';

  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications${query}`,
      {
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
// GET DONOR APPLICATION DETAILS
// ============================================================

export async function getAdminDonorApplicationById(
  token: string,
  applicationId: string
): Promise<{
  application: DonorApplication;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications/${applicationId}`,
      {
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
// APPROVE DONOR
// ============================================================

export async function approveDonorApplication(
  token: string,
  applicationId: string,
  adminNote?: string
) {
  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications/${applicationId}/approve`,
      {
        method:
          'POST',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            admin_note:
              adminNote
                ?.trim() ||
              null,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// REJECT DONOR
// ============================================================

export async function rejectDonorApplication(
  token: string,
  applicationId: string,
  adminNote: string
) {
  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications/${applicationId}/reject`,
      {
        method:
          'POST',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            admin_note:
              adminNote.trim(),
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// ACTIVITY LOG SUMMARY
//
// ADMIN ONLY
// ============================================================

export async function getAdminActivityLogSummary(
  token: string
): Promise<ActivityLogSummary> {
  const response =
    await fetch(
      `${API_URL}/api/admin/activity-logs/summary`,
      {
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
// GET ACTIVITY LOGS
//
// ADMIN ONLY
// ============================================================

export async function getAdminActivityLogs(
  token: string,
  filters: ActivityLogFilters = {}
): Promise<ActivityLogResponse> {
  const params =
    new URLSearchParams();

  if (
    filters.page !==
    undefined
  ) {
    params.set(
      'page',
      String(
        filters.page
      )
    );
  }

  if (
    filters.limit !==
    undefined
  ) {
    params.set(
      'limit',
      String(
        filters.limit
      )
    );
  }

  if (
    filters.action
      ?.trim()
  ) {
    params.set(
      'action',
      filters.action.trim()
    );
  }

  if (
    filters.module
      ?.trim()
  ) {
    params.set(
      'module',
      filters.module.trim()
    );
  }

  if (
    typeof filters.success ===
    'boolean'
  ) {
    params.set(
      'success',
      String(
        filters.success
      )
    );
  }

  if (
    filters.user_email
      ?.trim()
  ) {
    params.set(
      'user_email',
      filters.user_email.trim()
    );
  }

  const queryString =
    params.toString();

  const url =
    queryString
      ? `${API_URL}/api/admin/activity-logs?${queryString}`
      : `${API_URL}/api/admin/activity-logs`;

  const response =
    await fetch(
      url,
      {
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