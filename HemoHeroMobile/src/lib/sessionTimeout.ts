import { Platform } from 'react-native';

import {
  getCurrentUser,
  logoutUser,
} from './api';

import { unregisterPushNotifications } from './pushNotifications';

import {
  clearSession,
  getAccessToken,
  getLastActivity,
  setLogoutReason,
} from './session';

// ============================================================
// SESSION TIMEOUT (inactivity)
//
// After 15 minutes without a touch or typing in the app, the
// user is signed out, with a warning 1 minute before (see
// components/SessionTimeout.tsx). Time spent with the app in the
// background or closed counts too: reopening it after 15
// minutes signs out.
//
// For a demo, EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES in .env sets a
// shorter time (whole minutes, 1 to 120).
// ============================================================

function readTimeoutMinutes() {
  const value = Number(
    process.env
      .EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES
  );

  return Number.isInteger(value) &&
    value >= 1 &&
    value <= 120
    ? value
    : 15;
}

export const IDLE_TIMEOUT_MINUTES =
  readTimeoutMinutes();

export const IDLE_TIMEOUT_MS =
  IDLE_TIMEOUT_MINUTES * 60 * 1000;

// The warning shows this long before the sign-out.
export const IDLE_WARNING_MS = Math.min(
  60 * 1000,
  IDLE_TIMEOUT_MS / 2
);

// ------------------------------------------------------------
// IDLE CHECK
// ------------------------------------------------------------

export async function isSessionIdle() {
  const lastActivity =
    await getLastActivity();

  return (
    lastActivity !== null &&
    Date.now() - lastActivity >=
      IDLE_TIMEOUT_MS
  );
}

// ------------------------------------------------------------
// ONE BROWSER TAB SIGNS OUT (web)
//
// Tabs reach the time limit together. Each writes its own
// claim, waits, and only the tab whose claim is still there
// tells the server, so the Log Trail gets one AUTO_LOGOUT.
// ------------------------------------------------------------

const SIGN_OUT_CLAIM_KEY =
  '@hemohero/sign_out_claim';

const CLAIM_WAIT_MS = 1500;

async function claimSignOut() {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined'
  ) {
    return true;
  }

  try {
    const claim =
      `${Date.now()}:${Math.random()}`;

    window.localStorage.setItem(
      SIGN_OUT_CLAIM_KEY,
      claim
    );

    await new Promise(resolve =>
      setTimeout(resolve, CLAIM_WAIT_MS)
    );

    return (
      window.localStorage.getItem(
        SIGN_OUT_CLAIM_KEY
      ) === claim
    );
  } catch {
    return true;
  }
}

// ------------------------------------------------------------
// SIGN OUT FOR INACTIVITY
//
// 'signed_out'  this app ended the session
// 'other_tab'   another browser tab is ending it
// 'no_session'  it had already ended
// ------------------------------------------------------------

export async function endIdleSession(): Promise<
  'signed_out' | 'other_tab' | 'no_session'
> {
  if (!(await getAccessToken())) {
    return 'no_session';
  }

  if (!(await claimSignOut())) {
    return 'other_tab';
  }

  let token = await getAccessToken();

  if (!token) {
    return 'no_session';
  }

  // The access token may have expired while the app was in the
  // background. Any signed-in request renews it, so the server
  // can still record the sign-out and drop this phone's push
  // token.
  try {
    await getCurrentUser(token);
  } catch {
    // Renewal failed: the session already ended.
  }

  token = await getAccessToken();

  // Before clearing, so other tabs show why.
  await setLogoutReason('inactivity');

  if (token) {
    // While the token still works (logout revokes it).
    await unregisterPushNotifications(token);

    try {
      await logoutUser(token, {
        reason: 'inactivity',
        idleMinutes: IDLE_TIMEOUT_MINUTES,
      });
    } catch (error) {
      // Still sign out on this phone.
      console.log(
        'AUTO LOGOUT SERVER ERROR:',
        error
      );
    }
  }

  await clearSession();

  return 'signed_out';
}
