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
// GENERAL AUTH TYPES
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

  last_donation_month?: number | null;

  last_donation_year?: number | null;

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
// BLOOD TYPE DEMAND TYPES
// ============================================================

export type AdminBloodTypeDemandItem = {
  blood_type: string;

  request_count: number;

  units_needed: number;

  urgent_requests: number;

  scheduled_requests: number;
};

export type AdminBloodTypeDemandSummary = {
  active_requests: number;

  units_needed: number;

  urgent_requests: number;

  scheduled_requests: number;
};

export type AdminBloodTypeDemandResponse = {
  summary:
    AdminBloodTypeDemandSummary;

  highest_demand:
    AdminBloodTypeDemandItem | null;

  demand:
    AdminBloodTypeDemandItem[];
};

// ============================================================
// ADMIN BLOOD REQUEST TYPES
// ============================================================

export type AdminBloodRequestStatus =
  | 'active'
  | 'fulfilled'
  | 'cancelled';

export type AdminBloodRequestUrgency =
  | 'urgent'
  | 'needed';

export type AdminBloodRequestUser = {
  id: string;

  email?: string | null;

  first_name?: string | null;

  middle_name?: string | null;

  last_name?: string | null;

  suffix?: string | null;

  full_name?: string | null;

  phone?: string | null;

  gender?: string | null;

  date_of_birth?: string | null;

  barangay?: string | null;

  city?: string | null;

  province?: string | null;

  blood_type?: string | null;

  profile_photo_url?: string | null;

  role?: string | null;

  is_active?: boolean;
};

export type AdminBloodRequest = {
  id: string;

  requester_id: string;

  blood_type: string;

  units_needed: number;

  facility_source?: string | null;

  facility_id?: string | null;

  facility_name: string;

  facility_type?: string | null;

  facility_address?: string | null;

  facility_latitude?: number | null;

  facility_longitude?: number | null;

  urgency:
    AdminBloodRequestUrgency;

  needed_date?: string | null;

  needed_time?: string | null;

  message?: string | null;

  status:
    AdminBloodRequestStatus;

  created_at?: string | null;

  updated_at?: string | null;

  requester?:
    AdminBloodRequestUser | null;
};

export type AdminBloodRequestSummary = {
  total: number;

  active: number;

  fulfilled: number;

  cancelled: number;

  urgent_active: number;

  scheduled_active: number;

  active_units_needed: number;
};

export type AdminBloodRequestPagination = {
  page: number;

  limit: number;

  total: number;

  total_pages: number;
};

export type AdminBloodRequestFilters = {
  page?: number;

  limit?: number;

  status?:
    | 'all'
    | AdminBloodRequestStatus;

  blood_type?: string;

  urgency?:
    | 'all'
    | AdminBloodRequestUrgency;

  search?: string;
};

export type AdminBloodRequestsResponse = {
  summary:
    AdminBloodRequestSummary;

  requests:
    AdminBloodRequest[];

  pagination:
    AdminBloodRequestPagination;

  filters?: {
    status?: string | null;

    blood_type?: string | null;

    urgency?: string | null;

    search?: string | null;
  };
};

// ============================================================
// ADMIN DONOR RESPONSE TYPES
// ============================================================

export type AdminBloodRequestDonorResponse = {
  id: string;

  request_id: string;

  donor_id: string;

  status: string;

  message?: string | null;

  created_at?: string | null;

  updated_at?: string | null;

  donor?:
    AdminBloodRequestUser | null;

  [key: string]:
    unknown;
};

export type AdminBloodRequestResponseSummary = {
  total: number;

  pending: number;

  accepted: number;

  rejected: number;

  withdrawn: number;
};

export type AdminBloodRequestDetailResponse = {
  request:
    AdminBloodRequest;

  response_summary:
    AdminBloodRequestResponseSummary;

  responses:
    AdminBloodRequestDonorResponse[];
};

// ============================================================
// ADMIN USER MANAGEMENT TYPES
// ============================================================

export type AdminUserSummary = {
  total: number;

  active: number;

  inactive: number;
};

export type AdminManagedUserDonor = {
  application_id?: string | null;

  status?: string | null;

  blood_type?: string | null;

  availability_status?: string | null;
};

export type AdminManagedUser = {
  id: string;

  email?: string | null;

  first_name?: string | null;

  middle_name?: string | null;

  last_name?: string | null;

  suffix?: string | null;

  full_name?: string | null;

  phone?: string | null;

  date_of_birth?: string | null;

  gender?: string | null;

  barangay?: string | null;

  city?: string | null;

  province?: string | null;

  blood_type?: string | null;

  profile_photo_url?: string | null;

  onboarding_complete?: boolean;

  role?: string | null;

  is_active: boolean;

  deactivated_at?: string | null;

  created_at?: string | null;

  updated_at?: string | null;

  donor?:
    AdminManagedUserDonor | null;
};

export type AdminUserPagination = {
  page: number;

  limit: number;

  total: number;

  total_pages: number;
};

export type AdminUserStatusFilter =
  | 'all'
  | 'active'
  | 'inactive';

export type AdminUserFilters = {
  page?: number;

  limit?: number;

  search?: string;

  status?:
    AdminUserStatusFilter;
};

export type AdminUsersResponse = {
  users:
    AdminManagedUser[];

  pagination:
    AdminUserPagination;
};

export type AdminUserDetailResponse = {
  user:
    AdminManagedUser;
};

export type AdminUserActionResponse = {
  message: string;

  user:
    AdminManagedUser;
};

// ============================================================
// CREATE USER INPUT
// ============================================================

export type AdminCreateUserInput = {
  email: string;

  password: string;

  confirm_password: string;

  first_name: string;

  middle_name?: string | null;

  last_name: string;

  suffix?: string | null;

  phone?: string | null;

  date_of_birth?: string | null;

  gender?: string | null;

  barangay?: string | null;

  city?: string | null;

  province?: string | null;
};

// ============================================================
// UPDATE USER INPUT
// ============================================================

export type AdminUpdateUserInput = {
  email?: string;

  first_name?: string;

  middle_name?: string | null;

  last_name?: string;

  suffix?: string | null;

  phone?: string | null;

  date_of_birth?: string | null;

  gender?: string | null;

  barangay?: string | null;

  city?: string | null;

  province?: string | null;
};

// ============================================================
// DELETE USER RESPONSE
// ============================================================

export type AdminDeleteUserResponse = {
  message: string;

  deleted: boolean;

  user_id: string;
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
  summary:
    DonorApplicationSummary;
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
  applications:
    DonorApplication[];
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
  application:
    DonorApplication;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donor-applications/${encodeURIComponent(
        applicationId
      )}`,
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
      `${API_URL}/api/admin/donor-applications/${encodeURIComponent(
        applicationId
      )}/approve`,
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
      `${API_URL}/api/admin/donor-applications/${encodeURIComponent(
        applicationId
      )}/reject`,
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
// ============================================================

export async function getAdminActivityLogs(
  token: string,
  filters:
    ActivityLogFilters = {}
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

// ============================================================
// BLOOD TYPE DEMAND
//
// GET /api/requests/admin/demand
// ============================================================

export async function getAdminBloodTypeDemand(
  token: string
): Promise<AdminBloodTypeDemandResponse> {
  const response =
    await fetch(
      `${API_URL}/api/requests/admin/demand`,
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
// ADMIN BLOOD REQUESTS
//
// GET /api/requests/admin
// ============================================================

export async function getAdminBloodRequests(
  token: string,
  filters:
    AdminBloodRequestFilters = {}
): Promise<AdminBloodRequestsResponse> {
  const params =
    new URLSearchParams();

  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // LIMIT
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (
    filters.status &&
    filters.status !==
      'all'
  ) {
    params.set(
      'status',
      filters.status
    );
  }

  // ----------------------------------------------------------
  // BLOOD TYPE
  // ----------------------------------------------------------

  if (
    filters.blood_type &&
    filters.blood_type !==
      'all'
  ) {
    params.set(
      'blood_type',
      filters.blood_type
    );
  }

  // ----------------------------------------------------------
  // URGENCY
  // ----------------------------------------------------------

  if (
    filters.urgency &&
    filters.urgency !==
      'all'
  ) {
    params.set(
      'urgency',
      filters.urgency
    );
  }

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (
    filters.search
      ?.trim()
  ) {
    params.set(
      'search',
      filters.search.trim()
    );
  }

  const queryString =
    params.toString();

  const url =
    queryString
      ? `${API_URL}/api/requests/admin?${queryString}`
      : `${API_URL}/api/requests/admin`;

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

// ============================================================
// ADMIN BLOOD REQUEST DETAILS
//
// GET /api/requests/admin/:id
// ============================================================

export async function getAdminBloodRequestById(
  token: string,
  requestId: string
): Promise<AdminBloodRequestDetailResponse> {
  const response =
    await fetch(
      `${API_URL}/api/requests/admin/${encodeURIComponent(
        requestId
      )}`,
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
// ADMIN USER SUMMARY
// ============================================================

export async function getAdminUserSummary(
  token: string
): Promise<{
  summary:
    AdminUserSummary;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/summary`,
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
// GET ADMIN USERS
// ============================================================

export async function getAdminUsers(
  token: string,
  filters:
    AdminUserFilters = {}
): Promise<AdminUsersResponse> {
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
    filters.search
      ?.trim()
  ) {
    params.set(
      'search',
      filters.search.trim()
    );
  }

  if (
    filters.status &&
    filters.status !==
      'all'
  ) {
    params.set(
      'status',
      filters.status
    );
  }

  const queryString =
    params.toString();

  const url =
    queryString
      ? `${API_URL}/api/admin/users?${queryString}`
      : `${API_URL}/api/admin/users`;

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

// ============================================================
// GET ADMIN USER DETAILS
// ============================================================

export async function getAdminUserById(
  token: string,
  userId: string
): Promise<AdminUserDetailResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}`,
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
// CREATE ADMIN USER
// ============================================================

export async function createAdminUser(
  token: string,
  input:
    AdminCreateUserInput
): Promise<AdminUserActionResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users`,
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
            email:
              input.email
                .trim()
                .toLowerCase(),

            password:
              input.password,

            confirm_password:
              input.confirm_password,

            first_name:
              input.first_name.trim(),

            middle_name:
              input.middle_name
                ?.trim() ||
              null,

            last_name:
              input.last_name.trim(),

            suffix:
              input.suffix
                ?.trim() ||
              null,

            phone:
              input.phone
                ?.trim() ||
              null,

            date_of_birth:
              input.date_of_birth
                ?.trim() ||
              null,

            gender:
              input.gender
                ?.trim() ||
              null,

            barangay:
              input.barangay
                ?.trim() ||
              null,

            city:
              input.city
                ?.trim() ||
              null,

            province:
              input.province
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
// UPDATE ADMIN USER
// ============================================================

export async function updateAdminUser(
  token: string,
  userId: string,
  input:
    AdminUpdateUserInput
): Promise<AdminUserActionResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}`,
      {
        method:
          'PATCH',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },

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
// DEACTIVATE USER
// ============================================================

export async function deactivateAdminUser(
  token: string,
  userId: string
): Promise<AdminUserActionResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}/deactivate`,
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
// ACTIVATE USER
// ============================================================

export async function activateAdminUser(
  token: string,
  userId: string
): Promise<AdminUserActionResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}/activate`,
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
// PERMANENTLY DELETE USER
// ============================================================

export async function deleteAdminUser(
  token: string,
  userId: string
): Promise<AdminDeleteUserResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}`,
      {
        method:
          'DELETE',

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