// ============================================================
// HEMO-HERO AUTHORIZED FETCH
//
// Drop-in replacement for fetch() used by every lib file.
//
// Supabase access tokens expire after about an hour. When an
// authenticated request comes back 401, this:
//   1. exchanges the stored refresh token for a new session
//      (POST /api/auth/refresh) - shared by concurrent requests
//   2. saves the new tokens
//   3. retries the original request once with the new token
//
// If the session cannot be renewed (refresh token expired or
// account deactivated), the session is cleared and the user
// is returned to sign in.
// ============================================================

import {
  clearSession,
  getRefreshToken,
  saveSession,
} from './session';
import { goToSignIn } from './signInRoute';
import { API_URL } from './apiUrl';

// Requests that must never trigger a refresh.
const NO_REFRESH_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
];

// One refresh at a time; concurrent 401s wait for it.
let refreshInFlight:
  | Promise<string | null>
  | null = null;

let redirectingToSignIn = false;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function getAuthorizationHeader(
  headers: HeadersInit | undefined
): string | null {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get('Authorization');
  }

  if (Array.isArray(headers)) {
    const match = headers.find(
      ([key]) =>
        key.toLowerCase() ===
        'authorization'
    );

    return match ? match[1] : null;
  }

  const record =
    headers as Record<string, string>;

  return (
    record.Authorization ||
    record.authorization ||
    null
  );
}

function withAuthorization(
  headers: HeadersInit | undefined,
  token: string
): HeadersInit {
  if (headers instanceof Headers) {
    const copy = new Headers(headers);

    copy.set(
      'Authorization',
      `Bearer ${token}`
    );

    return copy;
  }

  const record: Record<string, string> =
    Array.isArray(headers)
      ? Object.fromEntries(headers)
      : {
          ...((headers as Record<string, string>) ||
            {}),
        };

  delete record.authorization;

  record.Authorization =
    `Bearer ${token}`;

  return record;
}

async function endSession() {
  await clearSession();

  if (redirectingToSignIn) {
    return;
  }

  redirectingToSignIn = true;

  try {
    goToSignIn();
  } catch (error) {
    console.log(
      'SESSION END REDIRECT ERROR:',
      error
    );
  } finally {
    setTimeout(() => {
      redirectingToSignIn = false;
    }, 1500);
  }
}

// ------------------------------------------------------------
// REFRESH
//
// Returns the new access token, or null when the session
// cannot be renewed.
// ------------------------------------------------------------

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken =
    await getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/auth/refresh`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          refresh_token:
            refreshToken,
        }),
      }
    );

    const data =
      await response
        .json()
        .catch(() => null);

    if (
      !response.ok ||
      !data?.session?.access_token
    ) {
      return null;
    }

    await saveSession(data.session);

    return data.session.access_token;
  } catch (error) {
    // Network problem: keep the session; the caller sees the
    // original 401 and can retry later.
    console.log(
      'SESSION REFRESH NETWORK ERROR:',
      error
    );

    throw error;
  }
}

function sharedRefresh() {
  if (!refreshInFlight) {
    refreshInFlight =
      refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

// ------------------------------------------------------------
// AUTHORIZED FETCH
// ------------------------------------------------------------

export async function authorizedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const response =
    await fetch(input, init);

  const hadToken = Boolean(
    getAuthorizationHeader(
      init.headers
    )
  );

  const skip =
    NO_REFRESH_PATHS.some(path =>
      input.includes(path)
    );

  if (!hadToken || skip) {
    return response;
  }

  // Deactivated or locked by an admin while signed in.
  if (response.status === 403) {
    const data =
      await response
        .clone()
        .json()
        .catch(() => null);

    if (
      data?.code ===
        'ACCOUNT_DEACTIVATED' ||
      data?.code ===
        'ACCOUNT_LOCKED'
    ) {
      await endSession();
    }

    return response;
  }

  if (response.status !== 401) {
    return response;
  }

  let newToken: string | null;

  try {
    newToken = await sharedRefresh();
  } catch {
    // Could not reach the server to refresh.
    return response;
  }

  if (!newToken) {
    await endSession();

    return response;
  }

  return fetch(input, {
    ...init,

    headers: withAuthorization(
      init.headers,
      newToken
    ),
  });
}
