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
// CLEAR SESSION
// ============================================================

export async function clearAdminSession() {
  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    PROFILE_KEY,
    REMEMBER_KEY,
  ]);
}