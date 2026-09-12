// ============================================================
// HEMO-HERO API CLIENT
// ============================================================

import {
  Platform,
} from 'react-native';

// ============================================================
// API URL
// ============================================================

const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5000'
    : process.env.EXPO_PUBLIC_API_URL ||
      'http://localhost:5000';

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

  created_at: string;

  updated_at: string;
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
      await fetch(
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

export async function loginUser(
  email: string,
  password: string
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
        }),
    }
  );
}

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

export async function registerUser(
  email: string,
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

          password,

          confirm_password:
            confirmPassword,
        }),
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

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

export async function logoutUser(
  accessToken: string
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

  // ----------------------------------------------------------
  // WEB
  // ----------------------------------------------------------

  if (
    Platform.OS === 'web' &&
    photo.webFile
  ) {
    formData.append(
      'photo',
      photo.webFile,
      photo.fileName ||
        photo.webFile?.name ||
        'profile-photo.jpg'
    );
  } else {
    // --------------------------------------------------------
    // IOS / ANDROID
    // --------------------------------------------------------

    const fileName =
      photo.fileName ||
      `profile-${Date.now()}.jpg`;

    const mimeType =
      photo.mimeType ||
      'image/jpeg';

    formData.append(
      'photo',
      {
        uri:
          photo.uri,

        name:
          fileName,

        type:
          mimeType,
      } as any
    );
  }

  let response: Response;

  try {
    response =
      await fetch(
        `${API_URL}/api/auth/profile-photo`,
        {
          method:
            'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          /*
            IMPORTANT:

            Do not manually set Content-Type here.

            fetch will automatically create the proper
            multipart/form-data boundary.
          */

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