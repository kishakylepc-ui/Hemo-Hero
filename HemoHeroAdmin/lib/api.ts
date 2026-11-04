// ============================================================
// HEMO-HERO ADMIN
// API CLIENT
// ============================================================

import { Platform } from 'react-native';

import Constants from 'expo-constants';

import { clearAdminSession } from './session';

import { goToAdminSignIn } from './signInRoute';

import { isAdminRole } from './roles';

// ============================================================
// API ADDRESS
//
// The API server runs on the same computer as Expo, on port
// 5000. In a browser that is the computer that served the
// page; in Expo Go (an iPad) it is the computer Expo Go loaded
// the portal from. So the iPad finds the server on any Wi-Fi
// without editing .env (same as the mobile app).
//
// EXPO_PUBLIC_API_URL still wins when it names a real server
// (e.g. a deployed API). A localhost value is treated like
// "not set": on an iPad, localhost is the iPad itself.
// ============================================================

const DEFAULT_API_PORT = '5000';

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(
    url
  );
}

function resolveApiUrl() {
  const configured =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    '';

  if (
    configured &&
    !isLocalhostUrl(configured)
  ) {
    return configured;
  }

  // Keep the port from a localhost setting (e.g. :5001).
  const port =
    configured.match(
      /:(\d+)(\/|$)/
    )?.[1] ||
    DEFAULT_API_PORT;

  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined' &&
      window.location?.hostname
        ? window.location.hostname
        : 'localhost';

    return `http://${host}:${port}`;
  }

  // "192.168.1.5:8082" -> "192.168.1.5"
  const devServer =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    '';

  const host =
    devServer
      .split(':')[0]
      ?.trim();

  return `http://${host || 'localhost'}:${port}`;
}

export const API_URL =
  resolveApiUrl().replace(/\/+$/, '');

if (__DEV__) {
  console.log(
    '[Hemo-Hero Admin] API server:',
    API_URL
  );
}

// ============================================================
// GENERAL AUTH TYPES
// ============================================================

export type AdminProfile = {
  id: string;

  email?: string | null;

  // Signs in too (with the email).
  username?: string | null;

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

  // Photo proving the applicant's blood type (private link).
  blood_type_proof?: {
    available?: boolean;

    url?: string | null;

    uploaded_at?: string | null;

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

  // Date range as ISO times: from included, to not included.
  from?: string;

  to?: string;
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
  | 'cancelled'
  | 'expired';

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

  expired: number;

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

  // Super admin only: number of admin accounts.
  admins?: number;

  // Super admin only: the Status row on the Admins tab.
  admin_accounts?: {
    active: number;
    inactive: number;
    locked: number;
  };

  active: number;

  inactive: number;

  // Locked by an admin or after wrong passwords.
  locked?: number;
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

  // Signs in too (with the email); unique.
  username?: string | null;

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

  // Why an admin deactivated it (the person sees it too).
  deactivation_reason?: string | null;

  // They deactivated it themselves.
  deactivated_by_self?: boolean;

  // Users list: waiting on a review of the deactivation.
  review_pending?: boolean;

  // Locked by an admin (can't sign in until unlocked).
  is_locked?: boolean;

  locked_at?: string | null;

  locked_reason?: string | null;

  // Wrong-password lockout, while it matters.
  login_lockout?: {
    locked: boolean;
    locked_until: string | null;
    failed_attempts: number;
    lockouts: number;
    captcha_required: boolean;
  } | null;

  created_at?: string | null;

  updated_at?: string | null;

  donor?:
    AdminManagedUserDonor | null;
};

// Locked by an admin, or locked now after wrong passwords.
export function isUserLocked(
  user:
    | Pick<
        AdminManagedUser,
        'is_locked' | 'login_lockout'
      >
    | null
    | undefined
) {
  return Boolean(
    user?.is_locked ||
      user?.login_lockout?.locked
  );
}

export type AdminUserPagination = {
  page: number;

  limit: number;

  total: number;

  total_pages: number;
};

export type AdminUserStatusFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'locked'
  // Deactivated people who asked for a review.
  | 'review';

export type AdminUserFilters = {
  page?: number;

  limit?: number;

  search?: string;

  status?:
    AdminUserStatusFilter;

  // 'admin' lists admin accounts (super admin only).
  role?: 'user' | 'admin';
};

export type AdminUsersResponse = {
  users:
    AdminManagedUser[];

  pagination:
    AdminUserPagination;

  // Deactivated people waiting on a review.
  review_count?: number;
};

// A deactivated person's "please review my account" request.
export type AdminAccountReview = {
  id: string;

  status:
    | 'pending'
    | 'approved'
    | 'declined';

  message: string;

  // Shown to the person when declined.
  admin_note?: string | null;

  created_at: string;

  reviewed_at?: string | null;
};

export type AdminUserDetailResponse = {
  user:
    AdminManagedUser;

  // Their latest review request, if any.
  review?: AdminAccountReview | null;
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

  // Required; unique.
  username: string;

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

  // 'admin' is allowed for the super admin only.
  role?: 'user' | 'admin';
};

// ============================================================
// UPDATE USER INPUT
// ============================================================

export type AdminUpdateUserInput = {
  email?: string;

  username?: string;

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
// ADMIN NOTIFICATION TYPES
//
// Admins use the shared /api/notifications routes. The server
// only returns the signed-in admin's own notifications.
// ============================================================

export type AdminNotification = {
  id: string;

  user_id: string;

  // e.g. admin_donor_application, admin_user_report,
  // admin_urgent_blood_request
  type: string;

  title: string;

  message: string;

  data?: {
    // Admin Portal screen to open, e.g. '/issues/<id>'
    route?: string;

    [key: string]: unknown;
  } | null;

  is_read: boolean;

  read_at?: string | null;

  created_at: string;
};

export type AdminNotificationsResponse = {
  count: number;

  unread_count: number;

  notifications:
    AdminNotification[];
};

// ============================================================
// ADMIN ISSUE (USER REPORT) TYPES
// ============================================================

export type AdminReportKind =
  | 'feedback'
  | 'report';

export type AdminReportStatus =
  | 'open'
  | 'in_review'
  | 'resolved'
  | 'dismissed';

// What was done when the issue was closed. null = nothing
// beyond the status (plain Resolve / Dismiss, or still open).
export type AdminReportActionTaken =
  | 'warned'
  | 'deactivated'
  | 'request_removed'
  | 'request_kept';

// Actions on a report about a person.
export type AdminReportAction =
  | 'warn'
  | 'deactivate';

export type AdminReportUser = {
  id: string;

  email?: string | null;

  first_name?: string | null;

  middle_name?: string | null;

  last_name?: string | null;

  suffix?: string | null;

  full_name?: string | null;

  phone?: string | null;

  city?: string | null;

  province?: string | null;

  blood_type?: string | null;

  profile_photo_url?: string | null;

  role?: string | null;

  is_active?: boolean;
};

export type AdminReportRequest = {
  id: string;

  requester_id?: string | null;

  blood_type: string;

  units_needed: number;

  facility_name: string;

  urgency?: string | null;

  status: string;

  created_at?: string | null;

  // Hidden from nearby donors after several reports.
  flagged_at?: string | null;

  // Removed by an admin after review.
  removed_at?: string | null;

  removal_reason?: string | null;
};

export type AdminReport = {
  id: string;

  kind:
    AdminReportKind;

  reporter_id?: string | null;

  reported_user_id?: string | null;

  reporter_email?: string | null;

  reported_user_email?: string | null;

  request_id?: string | null;

  response_id?: string | null;

  reason?: string | null;

  details?: string | null;

  status:
    AdminReportStatus;

  admin_note?: string | null;

  action_taken?:
    AdminReportActionTaken | null;

  reviewed_by?: string | null;

  reviewed_at?: string | null;

  created_at: string;

  updated_at?: string | null;

  reporter?:
    AdminReportUser | null;

  reported_user?:
    AdminReportUser | null;

  reviewer?:
    AdminReportUser | null;

  // Only returned by the details endpoint.
  request?:
    AdminReportRequest | null;

  reported_user_report_count?:
    number;

  // 'No-show' reports against the reported person.
  reported_user_no_show_count?:
    number;

  // Earlier reports that ended in a warning for this person.
  reported_user_warning_count?:
    number;

  // Open reports about the request itself (false request,
  // asking for payment). Only for request-level reports.
  request_report_count?:
    number;
};

export type AdminReportSummary = {
  total: number;

  open: number;

  in_review: number;

  resolved: number;

  dismissed: number;

  reports: number;

  feedback: number;

  unresolved_reports: number;
};

export type AdminReportPagination = {
  page: number;

  limit: number;

  total: number;

  total_pages: number;
};

export type AdminReportFilters = {
  page?: number;

  limit?: number;

  status?:
    | 'all'
    | AdminReportStatus;

  kind?:
    | 'all'
    | AdminReportKind;

  search?: string;

  // Issues filed by OR about this user.
  user_id?: string;
};

export type AdminReportsResponse = {
  summary:
    AdminReportSummary;

  reports:
    AdminReport[];

  pagination:
    AdminReportPagination;

  filters?: {
    status?: string | null;

    kind?: string | null;

    search?: string | null;
  };
};

export type AdminUpdateReportInput = {
  status?:
    AdminReportStatus;

  admin_note?: string | null;
};

// ============================================================
// SESSION EXPIRY
//
// Error codes the server (authMiddleware.js) returns when the
// stored admin session can no longer be used. When one of these
// arrives from an authenticated request, the local session is
// cleared and the admin is sent back to the login screen.
// ============================================================

const SESSION_ENDED_CODES = [
  'AUTH_HEADER_MISSING',
  'AUTH_HEADER_INVALID',
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_REQUIRED',
  'USER_PROFILE_NOT_FOUND',
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_LOCKED',
  'ADMIN_REQUIRED',
];

// Prevents several failing requests from redirecting at once.
let handlingSessionEnd = false;

async function handleSessionEnded() {
  if (handlingSessionEnd) {
    return;
  }

  handlingSessionEnd = true;

  try {
    await clearAdminSession();

    goToAdminSignIn();
  } catch (error) {
    console.log(
      'SESSION END REDIRECT ERROR:',
      error
    );
  } finally {
    // Allow future sessions to be handled again.
    setTimeout(() => {
      handlingSessionEnd = false;
    }, 1500);
  }
}

// ============================================================
// API ERROR
//
// Keeps the server's reply, so a screen can act on its code
// (e.g. the sign-in lockout timer and CAPTCHA).
// ============================================================

export class AdminApiError extends Error {
  status: number;

  code: string | null;

  data: any;

  constructor(
    message: string,
    status: number,
    data: any
  ) {
    super(message);

    this.name =
      'AdminApiError';

    this.status =
      status;

    this.code =
      typeof data?.code ===
      'string'
        ? data.code
        : null;

    this.data =
      data;

    Object.setPrototypeOf(
      this,
      AdminApiError.prototype
    );
  }
}

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

  // Login and logout are excluded: a failed sign-in must show
  // its own message, and a sign-out already goes to sign-in
  // (with its own reason).
  const url =
    String(
      response.url || ''
    );

  if (
    (response.status === 401 ||
      response.status === 403) &&
    SESSION_ENDED_CODES.includes(
      data?.code
    ) &&
    !url.includes(
      '/api/auth/login'
    ) &&
    !url.includes(
      '/api/auth/logout'
    )
  ) {
    void handleSessionEnded();

    throw new Error(
      'Your session has ended. Please sign in again.'
    );
  }

  if (
    !response.ok
  ) {
    throw new AdminApiError(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}.`,

      response.status,

      data
    );
  }

  return data;
}

// ============================================================
// ADMIN LOGIN
// ============================================================

// A solved sign-in CAPTCHA, needed after a lockout.
export type CaptchaAnswer = {
  captcha_id: string;
  captcha_answer: string;
};

export async function loginAdmin(
  email: string,
  password: string,
  captcha?: CaptchaAnswer | null
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

            // Non-admin accounts get no session here, and the
            // attempt is logged as unauthorized access.
            portal:
              'admin',

            ...(captcha ||
              {}),
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
    !isAdminRole(
      data.profile.role
    )
  ) {
    throw new Error(
      'This account is not authorized to access the Hemo-Hero Admin Portal.'
    );
  }

  return data;
}

// ============================================================
// FIRST SIGN-IN: VERIFY EMAIL
//
// An account made by an administrator confirms its email with a
// code the first time it signs in. The right code signs in.
// ============================================================

export type AdminEmailVerification = {
  message: string;
  session?: AdminLoginResponse['session'];
  profile?: AdminLoginResponse['profile'];
};

export async function verifyAdminEmail(
  email: string,
  code: string
): Promise<AdminEmailVerification> {
  const response =
    await fetch(
      `${API_URL}/api/auth/verify-email`,
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

            code,

            portal:
              'admin',
          }),
      }
    );

  return parseResponse(
    response
  );
}

export async function resendAdminVerification(
  email: string
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/resend-verification`,
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
// SIGN-IN CAPTCHA
//
// A new picture to solve; the answer stays on the server.
// ============================================================

export type LoginCaptcha = {
  captcha_id: string;
  svg: string;
  expires_in_seconds: number;
};

export async function getLoginCaptcha(): Promise<LoginCaptcha> {
  const response =
    await fetch(
      `${API_URL}/api/auth/captcha`
    );

  return parseResponse(
    response
  );
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

// Step 2: the 6-digit code from the email. Returns a short-lived
// recovery token for step 3.
export async function verifyAdminRecoveryCode(
  email: string,
  code: string
): Promise<{
  message: string;
  recovery_token: string;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/verify-recovery-code`,
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

            code,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// Step 3: the new password. Every session of the account ends.
export async function resetAdminPassword(
  recoveryToken: string,
  password: string,
  confirmPassword: string
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/reset-password`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            recovery_token:
              recoveryToken,

            password,

            confirm_password:
              confirmPassword,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// SERVER VERSION
//
// GET /health needs no sign-in. Servers from before versioning
// don't report a version, which comes back as ''.
// ============================================================

export async function getServerVersion(): Promise<string> {
  const response =
    await fetch(
      `${API_URL}/health`
    );

  const data =
    await parseResponse(
      response
    );

  return String(
    data?.version || ''
  );
}

// ============================================================
// ADMIN OWN ACCOUNT (SETTINGS)
//
// Uses the shared /api/auth/me account routes.
// The server identifies the account from the token.
// ============================================================

export type AdminAccountUpdateInput = {
  username?: string;

  first_name?: string;

  middle_name?: string | null;

  last_name?: string;

  suffix?: string | null;

  phone?: string | null;
};

export type AdminReloginResponse = {
  message: string;

  // Password/email changes end the current session.
  requires_relogin: boolean;

  email?: string;
};

// GET /api/auth/me

export async function getAdminAccount(
  token: string
): Promise<{
  user:
    AdminManagedUser;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me`,
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

// PATCH /api/auth/me

export async function updateAdminAccount(
  token: string,
  input:
    AdminAccountUpdateInput
): Promise<{
  message: string;

  user:
    AdminManagedUser;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me`,
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

// PATCH /api/auth/me/password

export async function changeAdminPassword(
  token: string,
  input: {
    current_password: string;

    new_password: string;

    confirm_password: string;
  }
): Promise<AdminReloginResponse> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me/password`,
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

// PATCH /api/auth/me/email

// Change email, step 1: the server emails a 6-digit code to the
// new address. Nothing changes yet.
export async function requestAdminEmailChange(
  token: string,
  input: {
    current_password: string;

    new_email: string;

    confirm_email: string;
  }
): Promise<{
  message: string;
  new_email: string;
  resend_after_seconds: number;
  expires_in_seconds: number;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me/email/request`,
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
            current_password:
              input.current_password,

            new_email:
              input.new_email
                .trim()
                .toLowerCase(),

            confirm_email:
              input.confirm_email
                .trim()
                .toLowerCase(),
          }),
      }
    );

  return parseResponse(
    response
  );
}

// A new code (at most one a minute).
export async function resendAdminEmailChange(
  token: string,
  newEmail: string
): Promise<{
  message: string;
  resend_after_seconds: number;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me/email/resend`,
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
            new_email:
              newEmail,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// Change email, step 2. 'changed': done, sign in again with the
// new email. 'confirm_other': Supabase also sent a code to the
// other address (next_target), which must be entered too.
export type EmailChangeTarget =
  | 'new'
  | 'current';

export async function verifyAdminEmailChange(
  token: string,
  input: {
    new_email: string;
    code: string;
    target: EmailChangeTarget;
  }
): Promise<
  | {
      status: 'changed';
      message: string;
      email: string;
    }
  | {
      status: 'confirm_other';
      next_target: EmailChangeTarget;
      message: string;
    }
> {
  const response =
    await fetch(
      `${API_URL}/api/auth/me/email/verify`,
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
          JSON.stringify(
            input
          ),
      }
    );

  return parseResponse(
    response
  );
}

// POST /api/auth/logout
//
// Revokes the Supabase session on the server.

export async function logoutAdmin(
  token: string,
  options: {
    // Signed out automatically (logged as AUTO_LOGOUT).
    reason?: 'inactivity';
    idleMinutes?: number;
  } = {}
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/api/auth/logout`,
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
            reason:
              options.reason,

            idle_minutes:
              options.idleMinutes,
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

  if (filters.from) {
    params.set(
      'from',
      filters.from
    );
  }

  if (filters.to) {
    params.set(
      'to',
      filters.to
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
    filters.role ===
    'admin'
  ) {
    params.set(
      'role',
      'admin'
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

            username:
              input.username,

            role:
              input.role,

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

// The reason is required; the person sees it when they try
// to sign in.
export async function deactivateAdminUser(
  token: string,
  userId: string,
  reason: string
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

        body:
          JSON.stringify({
            reason,
          }),
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
// LOCK / UNLOCK / ROLE
//
// Locked accounts can't sign in until unlocked; Unlock also
// clears a lockout from wrong passwords. Role changes are for
// the super admin only.
// ============================================================

async function patchAdminUser(
  token: string,
  userId: string,
  action: 'lock' | 'unlock' | 'role',
  body: object = {}
): Promise<AdminUserActionResponse> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}/${action}`,
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
            body
          ),
      }
    );

  return parseResponse(
    response
  );
}

export function lockAdminUser(
  token: string,
  userId: string,
  reason: string
) {
  return patchAdminUser(
    token,
    userId,
    'lock',
    {
      reason:
        reason.trim(),
    }
  );
}

export function unlockAdminUser(
  token: string,
  userId: string
) {
  return patchAdminUser(
    token,
    userId,
    'unlock'
  );
}

export function changeAdminUserRole(
  token: string,
  userId: string,
  role: 'user' | 'admin'
) {
  return patchAdminUser(
    token,
    userId,
    'role',
    {
      role,
    }
  );
}

// ============================================================
// PERMANENTLY DELETE USER
// ============================================================

// The reason is required; it is shown if someone signs in with
// that email again.
export async function deleteAdminUser(
  token: string,
  userId: string,
  reason: string
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

        body:
          JSON.stringify({
            reason,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// DECLINE AN ACCOUNT REVIEW
//
// The account stays deactivated; the person sees the note.
// (Activating the account approves the request.)
// ============================================================

export async function declineAccountReview(
  token: string,
  userId: string,
  note: string
): Promise<{
  message: string;
  review: AdminAccountReview;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/users/${encodeURIComponent(
        userId
      )}/review/decline`,
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
// ADMIN NOTIFICATIONS
//
// GET   /api/notifications?limit=
// GET   /api/notifications/unread-count
// PATCH /api/notifications/:id/read
// PATCH /api/notifications/read-all
// ============================================================

export async function getAdminNotifications(
  token: string,
  limit = 30
): Promise<AdminNotificationsResponse> {
  const response =
    await fetch(
      `${API_URL}/api/notifications?limit=${encodeURIComponent(
        String(limit)
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

export async function getAdminUnreadNotificationCount(
  token: string
): Promise<{
  unread_count: number;
}> {
  const response =
    await fetch(
      `${API_URL}/api/notifications/unread-count`,
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

export async function markAdminNotificationRead(
  token: string,
  notificationId: string
): Promise<{
  message: string;

  notification:
    AdminNotification;
}> {
  const response =
    await fetch(
      `${API_URL}/api/notifications/${encodeURIComponent(
        notificationId
      )}/read`,
      {
        method:
          'PATCH',

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

export async function markAllAdminNotificationsRead(
  token: string
): Promise<{
  message: string;

  updated_count: number;
}> {
  const response =
    await fetch(
      `${API_URL}/api/notifications/read-all`,
      {
        method:
          'PATCH',

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
// ADMIN ISSUE SUMMARY
//
// GET /api/admin/reports/summary
// ============================================================

export async function getAdminReportSummary(
  token: string
): Promise<{
  summary:
    AdminReportSummary;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/reports/summary`,
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
// GET ADMIN ISSUES
//
// GET /api/admin/reports
// ============================================================

export async function getAdminReports(
  token: string,
  filters:
    AdminReportFilters = {}
): Promise<AdminReportsResponse> {
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
    filters.status &&
    filters.status !==
      'all'
  ) {
    params.set(
      'status',
      filters.status
    );
  }

  if (
    filters.kind &&
    filters.kind !==
      'all'
  ) {
    params.set(
      'kind',
      filters.kind
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
    filters.user_id
  ) {
    params.set(
      'user_id',
      filters.user_id
    );
  }

  const queryString =
    params.toString();

  const url =
    queryString
      ? `${API_URL}/api/admin/reports?${queryString}`
      : `${API_URL}/api/admin/reports`;

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
// GET ADMIN ISSUE DETAILS
//
// GET /api/admin/reports/:id
// ============================================================

export async function getAdminReportById(
  token: string,
  reportId: string
): Promise<{
  report:
    AdminReport;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/reports/${encodeURIComponent(
        reportId
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
// UPDATE ADMIN ISSUE
//
// PATCH /api/admin/reports/:id
// ============================================================

export async function updateAdminReport(
  token: string,
  reportId: string,
  input:
    AdminUpdateReportInput
): Promise<{
  message: string;

  report:
    AdminReport;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/reports/${encodeURIComponent(
        reportId
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
// ACT ON A REPORT ABOUT A PERSON
//
// POST /api/admin/reports/:id/action
//
// warn       -> the user receives adminNote as a warning
// deactivate -> the account is deactivated; this and their
//               other open chat reports are resolved
// ============================================================

export async function takeAdminReportAction(
  token: string,
  reportId: string,
  action:
    AdminReportAction,
  adminNote: string
): Promise<{
  message: string;

  closed_count: number;

  report:
    AdminReport;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/reports/${encodeURIComponent(
        reportId
      )}/action`,
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
            action,

            admin_note:
              adminNote,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// REVIEW A REPORTED BLOOD REQUEST
//
// PATCH /api/requests/admin/:id/remove  { note }  take it down
// PATCH /api/requests/admin/:id/keep    { note? } keep it up
// ============================================================

export async function removeAdminBloodRequest(
  token: string,
  requestId: string,
  note: string
): Promise<{ message: string }> {
  const response =
    await fetch(
      `${API_URL}/api/requests/admin/${encodeURIComponent(
        requestId
      )}/remove`,
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
          JSON.stringify({
            note,
          }),
      }
    );

  return parseResponse(
    response
  );
}

export async function keepAdminBloodRequest(
  token: string,
  requestId: string,
  note?: string
): Promise<{ message: string }> {
  const response =
    await fetch(
      `${API_URL}/api/requests/admin/${encodeURIComponent(
        requestId
      )}/keep`,
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
          JSON.stringify({
            note:
              note ||
              null,
          }),
      }
    );

  return parseResponse(
    response
  );
}

// ============================================================
// ADMIN DONATIONS (TRANSACTION RECORDS)
//
// Every donation the requester confirms is recorded here.
// It completes automatically unless a check flags it; admins
// only review flagged records ('needs_review').
// ============================================================

export type AdminDonationStatus =
  | 'completed'
  | 'needs_review'
  | 'rejected';

export type AdminDonationFeedback = {
  from_role:
    | 'donor'
    | 'requester';

  from_name?: string | null;

  rating: number;

  comment?: string | null;

  created_at: string;

  updated_at?: string | null;
};

export type AdminDonation = {
  id: string;

  request_id?: string | null;

  response_id?: string | null;

  donor_id?: string | null;

  requester_id?: string | null;

  // Snapshots saved when the donation was confirmed.
  donor_name?: string | null;

  requester_name?: string | null;

  blood_type: string;

  facility_name?: string | null;

  units_donated: number;

  donated_at: string;

  requester_note?: string | null;

  status:
    AdminDonationStatus;

  // Why the record was flagged, e.g. 'donor_disputed'.
  review_reasons?: string[];

  // Plain-language reasons (details endpoint only).
  review_reason_labels?: string[];

  // Donor's own report that the record is wrong.
  dispute_note?: string | null;

  disputed_at?: string | null;

  // Admin's review note, or the reason when rejected.
  admin_note?: string | null;

  // Admin who reviewed a flagged record, and when.
  verified_by?: string | null;

  verified_at?: string | null;

  created_at: string;

  updated_at?: string | null;

  // Current accounts + feedback (list endpoint only).
  donor?:
    | AdminReportUser
    | null;

  requester?:
    | AdminReportUser
    | null;

  feedback_count?: number;

  average_rating?: number | null;
};

export type AdminDonationSummary = {
  total: number;

  completed: number;

  needs_review: number;

  rejected: number;

  completed_units: number;

  feedback_count: number;

  average_rating: number | null;
};

export type AdminDonationFilters = {
  page?: number;

  limit?: number;

  status?:
    | 'all'
    | AdminDonationStatus;

  search?: string;
};

export type AdminDonationsResponse = {
  summary:
    AdminDonationSummary;

  donations:
    AdminDonation[];

  pagination:
    AdminReportPagination;
};

export type AdminDonationTimelineStep = {
  key: string;

  label: string;

  actor: string;

  at?: string | null;

  done: boolean;
};

export type AdminDonationDetail = {
  donation:
    AdminDonation;

  request: {
    id: string;

    requester_id?: string | null;

    blood_type: string;

    units_needed: number;

    facility_name: string;

    facility_address?: string | null;

    urgency?: string | null;

    needed_date?: string | null;

    needed_time?: string | null;

    message?: string | null;

    status: string;

    created_at?: string | null;

    fulfilled_at?: string | null;
  } | null;

  response: {
    id: string;

    status: string;

    message?: string | null;

    created_at?: string | null;

    updated_at?: string | null;
  } | null;

  schedule: {
    id: string;

    scheduled_at: string;

    note?: string | null;

    // 'proposed' until the other side agrees; null means it was
    // set before agreement existed (counts as agreed).
    status?: 'proposed' | 'agreed' | null;
  } | null;

  donor:
    | AdminReportUser
    | null;

  donor_application: {
    status?: string | null;

    blood_type?: string | null;

    has_donated_before?: boolean | null;

    last_donation_date?: string | null;

    last_donation_month?: number | null;

    last_donation_year?: number | null;

    availability_status?: string | null;
  } | null;

  requester:
    | AdminReportUser
    | null;

  // Admin who reviewed a flagged record.
  reviewer: {
    id: string;

    name?: string | null;
  } | null;

  // Both sides' feedback on this transaction.
  feedback:
    AdminDonationFeedback[];

  // Every donation on the same request (partial fulfilment).
  request_donations: {
    id: string;

    donor_name?: string | null;

    units_donated: number;

    donated_at: string;

    status:
      AdminDonationStatus;
  }[];

  timeline:
    AdminDonationTimelineStep[];
};

// ============================================================
// GET ADMIN DONATIONS
//
// GET /api/admin/donations
// ============================================================

export async function getAdminDonations(
  token: string,
  filters:
    AdminDonationFilters = {}
): Promise<AdminDonationsResponse> {
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
    filters.status &&
    filters.status !==
      'all'
  ) {
    params.set(
      'status',
      filters.status
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

  const queryString =
    params.toString();

  const response =
    await fetch(
      queryString
        ? `${API_URL}/api/admin/donations?${queryString}`
        : `${API_URL}/api/admin/donations`,
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
// GET ADMIN DONATION SUMMARY
//
// GET /api/admin/donations/summary
// ============================================================

// One week on the Analytics charts (Monday to Sunday,
// Philippine time).
export type AdminTrendWeek = {
  start: string;
  end: string;
  requests: number;
  donations: number;
  activity_successful: number;
  activity_failed: number;
};

export async function getAdminAnalyticsTrends(
  token: string,
  weeks = 12
): Promise<{
  weeks: AdminTrendWeek[];
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/analytics/trends?weeks=${weeks}`,
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

export async function getAdminDonationSummary(
  token: string
): Promise<{
  summary:
    AdminDonationSummary;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donations/summary`,
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
// GET ADMIN DONATION DETAILS
//
// GET /api/admin/donations/:id
// ============================================================

export async function getAdminDonationById(
  token: string,
  donationId: string
): Promise<AdminDonationDetail> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donations/${encodeURIComponent(
        donationId
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
// REVIEW DONATION RECORD
//
// PATCH /api/admin/donations/:id/approve  { admin_note? }
//   flagged record -> completed
// PATCH /api/admin/donations/:id/reject   { admin_note }
//   completed or flagged record -> rejected
// ============================================================

async function decideAdminDonation(
  token: string,
  donationId: string,
  decision:
    | 'approve'
    | 'reject',
  adminNote:
    | string
    | null
): Promise<{
  message: string;

  donation:
    AdminDonation;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/donations/${encodeURIComponent(
        donationId
      )}/${decision}`,
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
          JSON.stringify({
            admin_note:
              adminNote,
          }),
      }
    );

  return parseResponse(
    response
  );
}

export function approveAdminDonation(
  token: string,
  donationId: string,
  adminNote:
    | string
    | null = null
) {
  return decideAdminDonation(
    token,
    donationId,
    'approve',
    adminNote
  );
}

export function rejectAdminDonation(
  token: string,
  donationId: string,
  adminNote: string
) {
  return decideAdminDonation(
    token,
    donationId,
    'reject',
    adminNote
  );
}
// ============================================================
// DATABASE BACKUPS (super admin only)
//
// GET    /api/admin/backups
// POST   /api/admin/backups
// GET    /api/admin/backups/:id/download
// POST   /api/admin/backups/:id/restore
// DELETE /api/admin/backups/:id
// ============================================================

export type AdminBackupKind =
  | 'manual'
  | 'automatic'
  | 'before_restore';

export type AdminBackup = {
  id: string;

  kind: AdminBackupKind;

  size_bytes: number;

  // Rows saved per table.
  table_counts: Record<string, number>;

  total_rows: number;

  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;

  // Last time this backup was restored.
  restored_at?: string | null;
  restored_by?: string | null;
  restored_by_name?: string | null;

  download_name?: string;
};

export type AdminBackupSummary = {
  total: number;
  total_size_bytes: number;
  latest_at: string | null;

  // When the next daily backup is due (null before the first).
  next_automatic_at: string | null;

  // Automatic backups kept.
  automatic_kept: number;
};

export async function getAdminBackups(
  token: string
): Promise<{
  backups: AdminBackup[];
  summary: AdminBackupSummary;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/backups`,
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

export async function createAdminBackup(
  token: string
): Promise<{
  message: string;
  backup: AdminBackup;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/backups`,
      {
        method:
          'POST',

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

// A link that downloads the backup file (valid 5 minutes).
export async function getAdminBackupDownload(
  token: string,
  backupId: string
): Promise<{
  url: string;
  file_name: string;
  expires_in_seconds: number;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/backups/${encodeURIComponent(backupId)}/download`,
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

export async function restoreAdminBackup(
  token: string,
  backupId: string
): Promise<{
  message: string;
  backup: AdminBackup;

  // Rows put back per table.
  restored: Record<string, number>;

  // Made just before the restore, to undo it.
  safety_backup: AdminBackup;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/backups/${encodeURIComponent(backupId)}/restore`,
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
            confirm:
              'RESTORE',
          }),
      }
    );

  return parseResponse(
    response
  );
}

// Web only: the File comes from the browser's file picker.
export async function restoreAdminBackupFile(
  token: string,
  file: File
): Promise<{
  message: string;
  // Rows put back per table.
  restored: Record<string, number>;
  // Made just before the restore, to undo it.
  safety_backup: AdminBackup;
}> {
  const body =
    new FormData();

  body.append(
    'confirm',
    'RESTORE'
  );

  body.append(
    'backup',
    file
  );

  const response =
    await fetch(
      `${API_URL}/api/admin/backups/restore-file`,
      {
        method:
          'POST',
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        body,
      }
    );

  return parseResponse(
    response
  );
}

export async function deleteAdminBackup(
  token: string,
  backupId: string
): Promise<{
  message: string;
}> {
  const response =
    await fetch(
      `${API_URL}/api/admin/backups/${encodeURIComponent(backupId)}`,
      {
        method:
          'DELETE',

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
