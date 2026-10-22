import AsyncStorage
  from '@react-native-async-storage/async-storage';

import type {
  AdminProfile,
  AuthSession,
} from './api';

// ============================================================
// STORAGE KEYS
// ============================================================

const ACCESS_TOKEN_KEY =
  'hemohero_admin_access_token';

const REFRESH_TOKEN_KEY =
  'hemohero_admin_refresh_token';

const PROFILE_KEY =
  'hemohero_admin_profile';

const REMEMBER_KEY =
  'hemohero_admin_remember_me';

// Last click, key press, scroll or touch (any tab). See
// sessionTimeout.ts.
const LAST_ACTIVITY_KEY =
  'hemohero_admin_last_activity';

// Why the last session ended, for the sign-in screen of every
// open tab. Kept until the next sign-in.
const LOGOUT_REASON_KEY =
  'hemohero_admin_logout_reason';

// On the web these are localStorage keys, so a tab can notice
// another tab's change (the "storage" event).
export const ADMIN_STORAGE_KEYS = {
  accessToken:
    ACCESS_TOKEN_KEY,

  lastActivity:
    LAST_ACTIVITY_KEY,

  logoutReason:
    LOGOUT_REASON_KEY,
};

export type AdminLogoutReason =
  | 'inactivity'
  | 'signed_out';

// ============================================================
// SAVE SESSION
// ============================================================

export async function saveAdminSession(
  session: AuthSession,
  profile: AdminProfile,
  rememberMe: boolean
) {
  await AsyncStorage.setItem(
    ACCESS_TOKEN_KEY,
    session.access_token
  );

  // A new session starts active.
  await AsyncStorage.setItem(
    LAST_ACTIVITY_KEY,
    String(Date.now())
  );

  await AsyncStorage.removeItem(
    LOGOUT_REASON_KEY
  );

  await AsyncStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(profile)
  );

  await AsyncStorage.setItem(
    REMEMBER_KEY,
    rememberMe ? 'true' : 'false'
  );

  if (session.refresh_token) {
    await AsyncStorage.setItem(
      REFRESH_TOKEN_KEY,
      session.refresh_token
    );
  } else {
    await AsyncStorage.removeItem(
      REFRESH_TOKEN_KEY
    );
  }
}

// ============================================================
// ACCESS TOKEN
// ============================================================

export async function getAdminAccessToken() {
  return AsyncStorage.getItem(
    ACCESS_TOKEN_KEY
  );
}

// ============================================================
// REFRESH TOKEN
// ============================================================

export async function getAdminRefreshToken() {
  return AsyncStorage.getItem(
    REFRESH_TOKEN_KEY
  );
}

// ============================================================
// PROFILE
// ============================================================

export async function getAdminProfile():
  Promise<AdminProfile | null> {
  const value =
    await AsyncStorage.getItem(
      PROFILE_KEY
    );

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ============================================================
// UPDATE STORED PROFILE
//
// Used after the admin edits their own profile in Settings so
// the shared AdminHeader shows the new name on every screen.
// The access token is not changed.
// ============================================================

export async function updateStoredAdminProfile(
  profile: AdminProfile
) {
  await AsyncStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(profile)
  );
}

// ============================================================
// REMEMBER ME
// ============================================================

export async function getRememberAdmin() {
  const value =
    await AsyncStorage.getItem(
      REMEMBER_KEY
    );

  return value === 'true';
}

// ============================================================
// LAST ACTIVITY
// ============================================================

export async function getAdminLastActivity():
  Promise<number | null> {
  try {
    const value =
      Number(
        await AsyncStorage.getItem(
          LAST_ACTIVITY_KEY
        )
      );

    return Number.isFinite(value) &&
      value > 0
      ? value
      : null;
  } catch {
    return null;
  }
}

export async function setAdminLastActivity(
  time: number
) {
  try {
    await AsyncStorage.setItem(
      LAST_ACTIVITY_KEY,
      String(time)
    );
  } catch (error) {
    console.log(
      'SAVE LAST ACTIVITY ERROR:',
      error
    );
  }
}

// ============================================================
// SIGN-OUT REASON
// ============================================================

export async function setAdminLogoutReason(
  reason: AdminLogoutReason
) {
  try {
    await AsyncStorage.setItem(
      LOGOUT_REASON_KEY,
      reason
    );
  } catch (error) {
    console.log(
      'SAVE LOGOUT REASON ERROR:',
      error
    );
  }
}

export async function getAdminLogoutReason():
  Promise<AdminLogoutReason | null> {
  try {
    const value =
      await AsyncStorage.getItem(
        LOGOUT_REASON_KEY
      );

    return value === 'inactivity' ||
      value === 'signed_out'
      ? value
      : null;
  } catch {
    return null;
  }
}

// ============================================================
// SIGN-IN LOCK (this browser / iPad)
//
// The server keeps the real lockout, so refreshing never clears
// it. This copy only lets the sign-in screen show the countdown
// and the CAPTCHA again right after a refresh, before the next
// attempt. Not part of the session: signing out keeps it.
// ============================================================

const LOGIN_LOCK_KEY =
  'hemohero_admin_login_lock';

export type SavedLoginLock = {
  email: string;

  // When the lockout ends, by this device's clock. null when
  // only the CAPTCHA is needed.
  lockedUntil: number | null;

  captchaRequired: boolean;
};

export async function saveAdminLoginLock(
  lock: SavedLoginLock
) {
  try {
    await AsyncStorage.setItem(
      LOGIN_LOCK_KEY,
      JSON.stringify(lock)
    );
  } catch (error) {
    console.log(
      'SAVE LOGIN LOCK ERROR:',
      error
    );
  }
}

export async function getAdminLoginLock():
  Promise<SavedLoginLock | null> {
  try {
    const value =
      await AsyncStorage.getItem(
        LOGIN_LOCK_KEY
      );

    if (!value) {
      return null;
    }

    const lock =
      JSON.parse(value);

    if (
      typeof lock?.email !==
      'string'
    ) {
      return null;
    }

    return {
      email:
        lock.email,

      lockedUntil:
        typeof lock.lockedUntil ===
        'number'
          ? lock.lockedUntil
          : null,

      captchaRequired:
        lock.captchaRequired ===
        true,
    };
  } catch {
    return null;
  }
}

export async function clearAdminLoginLock() {
  try {
    await AsyncStorage.removeItem(
      LOGIN_LOCK_KEY
    );
  } catch (error) {
    console.log(
      'CLEAR LOGIN LOCK ERROR:',
      error
    );
  }
}

// ============================================================
// CLEAR SESSION
// ============================================================

export async function clearAdminSession() {
  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    PROFILE_KEY,
    REMEMBER_KEY,
    LAST_ACTIVITY_KEY,
  ]);
}