// ============================================================
// HEMO-HERO API CLIENT
// ============================================================

import { authorizedFetch } from './authFetch';
import { appendImage } from './imageUpload';
import { API_URL } from './apiUrl';

// ============================================================
// API ERROR
// ============================================================

export class ApiError
  extends Error {
  status: number;

  data: any;

  constructor(
    message: string,
    status: number,
    data: any
  ) {
    super(message);

    this.name =
      'ApiError';

    this.status =
      status;

    this.data =
      data;

    Object.setPrototypeOf(
      this,
      ApiError.prototype
    );
  }
}

// ============================================================
// TYPES
// ============================================================

export type ProfilePhotoFile = {
  uri: string;

  fileName?:
    | string
    | null;

  mimeType?:
    | string
    | null;

  webFile?: any;
};

// ------------------------------------------------------------
// FACILITY
// ------------------------------------------------------------

export type NearbyFacility = {
  id: string;

  name: string;

  type:
    | 'hospital'
    | 'blood_bank'
    | 'red_cross'
    | 'medical_facility'
    | string;

  address?:
    | string
    | null;

  latitude: number;

  longitude: number;

  distance_km: number;

  category_label?: string;
};

// ------------------------------------------------------------
// BLOOD REQUEST
// ------------------------------------------------------------

export type BloodRequestStatus =
  | 'active'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';

export type BloodRequestUrgency =
  | 'urgent'
  | 'needed';

export type BloodRequestFacilitySource =
  | 'nearby'
  | 'manual';

export type CreateBloodRequestInput = {
  blood_type: string;

  units_needed: number;

  facility_source:
    BloodRequestFacilitySource;

  facility_id?:
    | string
    | null;

  facility_name: string;

  facility_type?:
    | string
    | null;

  facility_address?:
    | string
    | null;

  facility_latitude?:
    | number
    | null;

  facility_longitude?:
    | number
    | null;

  urgency:
    BloodRequestUrgency;

  needed_date?:
    | string
    | null;

  needed_time?:
    | string
    | null;

  message?:
    | string
    | null;
};

export type BloodRequest = {
  id: string;

  requester_id: string;

  blood_type: string;

  units_needed: number;

  facility_source:
    BloodRequestFacilitySource;

  facility_id?:
    | string
    | null;

  facility_name: string;

  facility_type?:
    | string
    | null;

  facility_address?:
    | string
    | null;

  facility_latitude?:
    | number
    | null;

  facility_longitude?:
    | number
    | null;

  urgency:
    BloodRequestUrgency;

  needed_date?:
    | string
    | null;

  needed_time?:
    | string
    | null;

  message?:
    | string
    | null;

  status:
    BloodRequestStatus;

  fulfilled_at?:
    | string
    | null;

  cancelled_at?:
    | string
    | null;

  // Hidden from nearby donors after several reports, until
  // an admin reviews it.
  flagged_at?:
    | string
    | null;

  // Taken down by an admin after review (status cancelled).
  removed_at?:
    | string
    | null;

  removal_reason?:
    | string
    | null;

  created_at: string;

  updated_at: string;
};

// ------------------------------------------------------------
// NOTIFICATION
// ------------------------------------------------------------

export type NotificationType =
  | 'request'
  | 'match'
  | 'system'
  | 'donor_response_received'
  | 'donor_response_withdrawn'
  | 'donor_response_accepted'
  | 'donor_response_rejected'
  | 'blood_request_fulfilled'
  | 'blood_request_cancelled'
  | 'blood_request_removed'
  | 'blood_request_expired'
  | 'donor_application_approved'
  | 'donor_application_rejected'
  | 'coordination_message'
  | 'coordination_schedule'
  | 'coordination_no_show'
  | 'coordination_trip_started'
  | 'coordination_trip_near'
  | 'coordination_trip_arrived'
  | 'donation_recorded'
  | 'donation_verified'
  | 'donation_rejected'
  | 'donation_disputed'
  | 'donation_feedback_received'
  // Issues: an admin closed your report / warned you.
  | 'report_reviewed'
  | 'account_warning'
  | string;

export type NotificationData = {
  request_id?:
    | string
    | null;

  response_id?:
    | string
    | null;

  donor_id?:
    | string
    | null;

  blood_type?:
    | string
    | null;

  facility_name?:
    | string
    | null;

  status?:
    | string
    | null;

  // Donation notifications go to both sides of the
  // transaction; this says which one received it.
  recipient_role?:
    | 'donor'
    | 'requester'
    | null;

  // report_reviewed / account_warning
  report_id?:
    | string
    | null;

  report_kind?:
    | 'feedback'
    | 'report'
    | null;

  [key: string]:
    unknown;
};

export type AppNotification = {
  id: string;

  user_id: string;

  type:
    NotificationType;

  title: string;

  message: string;

  related_request_id?:
    | string
    | null;

  data:
    NotificationData;

  is_read: boolean;

  read_at?:
    | string
    | null;

  created_at: string;
};

// ============================================================
// GENERIC API REQUEST
// ============================================================

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  let response: Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}${endpoint}`,
        {
          ...options,

          headers: {
            'Content-Type':
              'application/json',

            ...(options.headers ||
              {}),
          },
        }
      );
  } catch (error) {
    console.log(
      'API NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server. Make sure the backend is running.'
    );
  }

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
    console.log(
      'API ERROR:',
      response.status,
      data
    );

    throw new ApiError(
      data?.error ||
        data?.message ||
        `Request failed (${response.status})`,

      response.status,

      data
    );
  }

  return data;
}

// ============================================================
// AUTHENTICATION
// ============================================================

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

// A solved sign-in CAPTCHA, needed after a lockout.
export type CaptchaAnswer = {
  captcha_id: string;
  captcha_answer: string;
};

export async function loginUser(
  email: string,
  password: string,
  captcha?: CaptchaAnswer | null
) {
  return request(
    '/api/auth/login',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),

          password,

          ...(captcha ||
            {}),
        }),
    }
  );
}

// ------------------------------------------------------------
// SIGN-IN CAPTCHA
//
// A new picture to solve; the answer stays on the server.
// ------------------------------------------------------------

export type LoginCaptcha = {
  captcha_id: string;
  svg: string;
  expires_in_seconds: number;
};

export async function getLoginCaptcha(): Promise<LoginCaptcha> {
  return request(
    '/api/auth/captcha',
    {
      method:
        'GET',
    }
  );
}

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

export async function registerUser(
  email: string,
  username: string,
  password: string,
  confirmPassword: string
) {
  return request(
    '/api/auth/register',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),

          username,

          password,

          confirm_password:
            confirmPassword,
        }),
    }
  );
}

// ------------------------------------------------------------
// USERNAME AVAILABLE? (while typing)
// ------------------------------------------------------------

export async function checkUsernameAvailable(
  username: string
): Promise<{
  available: boolean;
  username?: string;
  error?: string | null;
}> {
  return request(
    `/api/auth/username-available?username=${encodeURIComponent(
      username
    )}`,
    {
      method:
        'GET',
    }
  );
}

// ------------------------------------------------------------
// VERIFY EMAIL
// ------------------------------------------------------------

export async function verifyEmail(
  email: string,
  code: string
) {
  return request(
    '/api/auth/verify-email',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),

          code:
            code.trim(),
        }),
    }
  );
}

// ------------------------------------------------------------
// RESEND VERIFICATION
// ------------------------------------------------------------

export async function resendVerification(
  email: string
) {
  return request(
    '/api/auth/resend-verification',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),
        }),
    }
  );
}

// ------------------------------------------------------------
// FORGOT PASSWORD
// ------------------------------------------------------------

export async function forgotPassword(
  email: string
) {
  return request(
    '/api/auth/forgot-password',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),
        }),
    }
  );
}

// ------------------------------------------------------------
// VERIFY RECOVERY CODE
// ------------------------------------------------------------

export async function verifyRecoveryCode(
  email: string,
  code: string
) {
  return request(
    '/api/auth/verify-recovery-code',
    {
      method:
        'POST',

      body:
        JSON.stringify({
          email:
            email
              .trim()
              .toLowerCase(),

          code:
            code.trim(),
        }),
    }
  );
}

// ------------------------------------------------------------
// RESET PASSWORD
// ------------------------------------------------------------

export async function resetPassword(
  recoveryToken: string,
  password: string,
  confirmPassword: string
) {
  return request(
    '/api/auth/reset-password',
    {
      method:
        'POST',

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
}

// ============================================================
// CURRENT ACCOUNT
// ============================================================

// ------------------------------------------------------------
// CURRENT USER
// ------------------------------------------------------------

export async function getCurrentUser(
  accessToken: string
) {
  return request(
    '/api/auth/me',
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// UPDATE PROFILE
// ------------------------------------------------------------

export async function updateProfile(
  accessToken: string,
  profileData: Record<
    string,
    unknown
  >
) {
  return request(
    '/api/auth/me',
    {
      method:
        'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify(
          profileData
        ),
    }
  );
}

// ============================================================
// ACCOUNT SECURITY
// ============================================================

// ------------------------------------------------------------
// CHANGE PASSWORD
//
// PATCH /api/auth/me/password
// ------------------------------------------------------------

export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  return request(
    '/api/auth/me/password',
    {
      method:
        'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify({
          current_password:
            currentPassword,

          new_password:
            newPassword,

          confirm_password:
            confirmPassword,
        }),
    }
  );
}

// ------------------------------------------------------------
// CHANGE EMAIL
//
// PATCH /api/auth/me/email
// ------------------------------------------------------------

// Change email, step 1: the server emails a 6-digit code to the
// new address. Nothing changes yet.
export async function requestEmailChange(
  accessToken: string,
  currentPassword: string,
  newEmail: string,
  confirmEmail: string
): Promise<{
  message: string;
  new_email: string;
  resend_after_seconds: number;
  expires_in_seconds: number;
}> {
  return request(
    '/api/auth/me/email/request',
    {
      method:
        'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify({
          current_password:
            currentPassword,

          new_email:
            newEmail
              .trim()
              .toLowerCase(),

          confirm_email:
            confirmEmail
              .trim()
              .toLowerCase(),
        }),
    }
  );
}

// A new code (at most one a minute).
export async function resendEmailChange(
  accessToken: string,
  newEmail: string
): Promise<{
  message: string;
  resend_after_seconds: number;
}> {
  return request(
    '/api/auth/me/email/resend',
    {
      method:
        'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify({
          new_email:
            newEmail,
        }),
    }
  );
}

// Change email, step 2. 'changed': done, sign in again with the
// new email. 'confirm_other': Supabase also sent a code to the
// other address (next_target), which must be entered too.
export type EmailChangeTarget =
  | 'new'
  | 'current';

export async function verifyEmailChange(
  accessToken: string,
  newEmail: string,
  code: string,
  target: EmailChangeTarget
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
  return request(
    '/api/auth/me/email/verify',
    {
      method:
        'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify({
          new_email:
            newEmail,

          code,

          target,
        }),
    }
  );
}

// ------------------------------------------------------------
// DEACTIVATE ACCOUNT
//
// DELETE /api/auth/me
// ------------------------------------------------------------

export async function deactivateAccount(
  accessToken: string
) {
  return request(
    '/api/auth/me',
    {
      method:
        'DELETE',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// PERMANENTLY DELETE ACCOUNT
//
// DELETE /api/auth/me/permanent
// ------------------------------------------------------------

export async function deleteAccountPermanently(
  accessToken: string,
  currentPassword: string,
  confirmation: string
) {
  return request(
    '/api/auth/me/permanent',
    {
      method:
        'DELETE',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify({
          current_password:
            currentPassword,

          confirmation:
            confirmation
              .trim()
              .toUpperCase(),
        }),
    }
  );
}


// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

export async function logoutUser(
  accessToken: string,
  options: {
    // Signed out automatically (logged as AUTO_LOGOUT).
    reason?: 'inactivity';
    idleMinutes?: number;
  } = {}
) {
  return request(
    '/api/auth/logout',
    {
      method:
        'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
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
}

// ============================================================
// PROFILE PHOTO
// ============================================================

// ------------------------------------------------------------
// UPLOAD / REPLACE PROFILE PHOTO
// ------------------------------------------------------------

export async function uploadProfilePhoto(
  accessToken: string,
  photo: ProfilePhotoFile
) {
  const formData =
    new FormData();

  // Phone photos must be attached as File objects (SDK 57
  // fetch); see lib/imageUpload.
  try {
    await appendImage(
      formData,
      'photo',
      photo
    );
  } catch (error) {
    console.log(
      'PROFILE PHOTO READ ERROR:',
      error
    );

    throw new Error(
      'Unable to read the selected photo. Please choose another one.'
    );
  }

  let response: Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/auth/profile-photo`,
        {
          method:
            'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            formData,
        }
      );
  } catch (error) {
    console.log(
      'PROFILE PHOTO NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server.'
    );
  }

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
    console.log(
      'PROFILE PHOTO API ERROR:',
      response.status,
      data
    );

    throw new ApiError(
      data?.error ||
        data?.message ||
        `Profile photo upload failed (${response.status})`,

      response.status,

      data
    );
  }

  return data;
}

// ------------------------------------------------------------
// BLOOD TYPE WITH PROOF
//
// PUT /api/auth/me/blood-type
// A blood type is only saved together with a photo that proves
// it (blood donor card, blood typing or lab result).
// ------------------------------------------------------------

export async function saveBloodTypeWithProof(
  accessToken: string,
  bloodType: string,
  proof: ProfilePhotoFile
) {
  const formData =
    new FormData();

  formData.append(
    'blood_type',
    bloodType
  );

  try {
    await appendImage(
      formData,
      'proof',
      proof
    );
  } catch (error) {
    console.log(
      'BLOOD TYPE PROOF READ ERROR:',
      error
    );

    throw new Error(
      'Unable to read the selected photo. Please choose another one.'
    );
  }

  let response: Response;

  try {
    response =
      await authorizedFetch(
        `${API_URL}/api/auth/me/blood-type`,
        {
          method:
            'PUT',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            formData,
        }
      );
  } catch (error) {
    console.log(
      'BLOOD TYPE PROOF NETWORK ERROR:',
      error
    );

    throw new Error(
      'Unable to connect to the Hemo-Hero server.'
    );
  }

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
    throw new ApiError(
      data?.error ||
        data?.message ||
        `Saving your blood type failed (${response.status})`,

      response.status,

      data
    );
  }

  return data;
}

// ------------------------------------------------------------
// DELETE PROFILE PHOTO
// ------------------------------------------------------------

export async function deleteProfilePhoto(
  accessToken: string
) {
  return request(
    '/api/auth/profile-photo',
    {
      method:
        'DELETE',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// FACILITIES
// ============================================================

// ------------------------------------------------------------
// ADDRESS FROM GPS
//
// GET /api/geocode/reverse (OpenStreetMap). barangay_exact is
// true when the barangay comes from its mapped boundary; otherwise
// it is the nearest named area or street, for the person to check.
// ------------------------------------------------------------

export type AddressFromLocation = {
  barangay: string;
  city: string;
  province: string;
  barangay_exact: boolean;
};

export async function getAddressFromLocation(
  accessToken: string,
  latitude: number,
  longitude: number
): Promise<{
  address: AddressFromLocation;
  attribution: string;
}> {
  const query =
    new URLSearchParams({
      latitude:
        String(
          latitude
        ),

      longitude:
        String(
          longitude
        ),
    });

  return request(
    `/api/geocode/reverse?${query.toString()}`,
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

export async function getNearbyFacilities(
  accessToken: string,
  latitude: number,
  longitude: number
) {
  const query =
    new URLSearchParams({
      latitude:
        String(
          latitude
        ),

      longitude:
        String(
          longitude
        ),
    });

  return request(
    `/api/facilities/nearby?${query.toString()}`,
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// BLOOD REQUESTS
// ============================================================

// ------------------------------------------------------------
// CREATE BLOOD REQUEST
// ------------------------------------------------------------

export async function createBloodRequest(
  accessToken: string,
  requestData:
    CreateBloodRequestInput
) {
  return request(
    '/api/requests',
    {
      method:
        'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify(
          requestData
        ),
    }
  );
}

// ------------------------------------------------------------
// GET MY BLOOD REQUESTS
// ------------------------------------------------------------

export async function getMyBloodRequests(
  accessToken: string
) {
  return request(
    '/api/requests/my',
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// GET ACTIVE BLOOD REQUEST
// ------------------------------------------------------------

export async function getMyActiveBloodRequest(
  accessToken: string
) {
  return request(
    '/api/requests/my/active',
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// GET BLOOD REQUEST BY ID
// ------------------------------------------------------------

export async function getBloodRequestById(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(
      requestId
    )}`,
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// CANCEL BLOOD REQUEST
// ------------------------------------------------------------

export async function cancelBloodRequest(
  accessToken: string,
  requestId: string
) {
  return request(
    `/api/requests/${encodeURIComponent(
      requestId
    )}/cancel`,
    {
      method:
        'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================

// ------------------------------------------------------------
// GET NOTIFICATIONS
// ------------------------------------------------------------

export async function getNotifications(
  accessToken: string,
  limit = 50
) {
  const query =
    new URLSearchParams({
      limit:
        String(
          limit
        ),
    });

  return request(
    `/api/notifications?${query.toString()}`,
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// NOTIFICATION SETTINGS
//
// Which notifications alert the phone. The inbox keeps every
// notification either way.
// ------------------------------------------------------------

export type NotificationPreferences = {
  // Every phone alert on or off.
  push_enabled: boolean;

  // A requester asks you to donate.
  donation_requests: boolean;

  // Offers, accepted / declined offers, closed requests.
  request_updates: boolean;

  // Chat messages, meet-up times, live trips.
  messages: boolean;

  // Donation records and feedback.
  donations: boolean;
};

export async function getNotificationPreferences(
  accessToken: string
): Promise<{
  preferences: NotificationPreferences;
}> {
  return request(
    '/api/notifications/preferences',
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

export async function updateNotificationPreferences(
  accessToken: string,
  changes: Partial<NotificationPreferences>
): Promise<{
  message: string;
  preferences: NotificationPreferences;
}> {
  return request(
    '/api/notifications/preferences',
    {
      method:
        'PUT',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify(
          changes
        ),
    }
  );
}

// ------------------------------------------------------------
// GET UNREAD COUNT
// ------------------------------------------------------------

export async function getUnreadNotificationCount(
  accessToken: string
) {
  return request(
    '/api/notifications/unread-count',
    {
      method:
        'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// MARK ONE READ
// ------------------------------------------------------------

export async function markNotificationAsRead(
  accessToken: string,
  notificationId: string
) {
  return request(
    `/api/notifications/${encodeURIComponent(
      notificationId
    )}/read`,
    {
      method:
        'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ------------------------------------------------------------
// MARK ALL READ
// ------------------------------------------------------------

export async function markAllNotificationsAsRead(
  accessToken: string
) {
  return request(
    '/api/notifications/read-all',
    {
      method:
        'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

