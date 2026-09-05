const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5000';

// ============================================================
// BASE REQUEST
// ============================================================

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const response =
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

  let data: any = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

// ============================================================
// LOGIN
// ============================================================

export async function loginUser(
  email: string,
  password: string
) {
  return request(
    '/api/auth/login',
    {
      method: 'POST',

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),

        password,
      }),
    }
  );
}

// ============================================================
// REGISTER
// ============================================================

export async function registerUser(
  email: string,
  password: string,
  confirmPassword: string
) {
  return request(
    '/api/auth/register',
    {
      method: 'POST',

      body: JSON.stringify({
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

// ============================================================
// CURRENT USER
// ============================================================

export async function getCurrentUser(
  accessToken: string
) {
  return request(
    '/api/auth/me',
    {
      method: 'GET',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}

// ============================================================
// UPDATE PROFILE
// ============================================================

export type UpdateProfilePayload = {
  // Personal
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  suffix?: string | null;
  phone?: string | null;

  date_of_birth?: string;
  gender?: string;

  // Location
  barangay?: string;
  city?: string;
  province?: string;

  latitude?: number | null;
  longitude?: number | null;

  // Medical
  blood_type?: string | null;

  // Profile Photo
  profile_photo_url?:
    | string
    | null;

  // Onboarding
  complete_onboarding?: boolean;
};

export async function updateProfile(
  accessToken: string,
  profile:
    UpdateProfilePayload
) {
  return request(
    '/api/auth/me',
    {
      method: 'PATCH',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },

      body:
        JSON.stringify(
          profile
        ),
    }
  );
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

export async function forgotPassword(
  email: string
) {
  return request(
    '/api/auth/forgot-password',
    {
      method: 'POST',

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),
      }),
    }
  );
}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutUser(
  accessToken: string
) {
  return request(
    '/api/auth/logout',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );
}