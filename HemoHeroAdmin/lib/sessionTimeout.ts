import { Platform } from 'react-native';

import { logoutAdmin } from './api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminLastActivity,
  setAdminLogoutReason,
} from './session';

// ============================================================
// SESSION TIMEOUT (inactivity)
//
// After 15 minutes without a click, key press, scroll or touch
// the admin is signed out, with a warning 1 minute before (see
// components/SessionGuard.tsx). Activity in any tab counts for
// every tab, because the last-activity time is shared in
// localStorage, and the sign-out clears the session that all
// tabs share, so they all return to sign-in.
//
// For a demo, EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES in .env sets a
// shorter time (whole minutes, 1 to 120).
// ============================================================

function readTimeoutMinutes() {
  const value =
    Number(
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
  IDLE_TIMEOUT_MINUTES *
  60 *
  1000;

// The warning shows this long before the sign-out.
export const IDLE_WARNING_MS =
  Math.min(
    60 * 1000,
    IDLE_TIMEOUT_MS / 2
  );

// ------------------------------------------------------------
// IDLE CHECK
//
// True when the saved session has gone unused too long (e.g.
// the browser was closed and opened again later).
// ------------------------------------------------------------

export async function isAdminSessionIdle() {
  const lastActivity =
    await getAdminLastActivity();

  return (
    lastActivity !== null &&
    Date.now() -
      lastActivity >=
      IDLE_TIMEOUT_MS
  );
}

// ------------------------------------------------------------
// ONE TAB SIGNS OUT
//
// Every tab reaches the time limit together. Each writes its
// own claim, waits, and only the tab whose claim is still there
// tells the server, so the Log Trail gets one AUTO_LOGOUT.
// ------------------------------------------------------------

const SIGN_OUT_CLAIM_KEY =
  'hemohero_admin_sign_out_claim';

// Longer than the 1-second gap between tabs' checks.
const CLAIM_WAIT_MS =
  1500;

async function claimSignOut() {
  if (
    Platform.OS !== 'web' ||
    typeof window ===
      'undefined'
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
      setTimeout(
        resolve,
        CLAIM_WAIT_MS
      )
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
// 'signed_out'  this tab ended the session
// 'other_tab'   another tab is ending it (wait for it)
// 'no_session'  it had already ended
// ------------------------------------------------------------

export async function endIdleAdminSession(): Promise<
  | 'signed_out'
  | 'other_tab'
  | 'no_session'
> {
  if (
    !(await getAdminAccessToken())
  ) {
    return 'no_session';
  }

  if (
    !(await claimSignOut())
  ) {
    return 'other_tab';
  }

  // Read again: another tab may have finished meanwhile.
  const token =
    await getAdminAccessToken();

  if (!token) {
    return 'no_session';
  }

  // Before clearing, so every tab shows why.
  await setAdminLogoutReason(
    'inactivity'
  );

  try {
    await logoutAdmin(
      token,
      {
        reason:
          'inactivity',

        idleMinutes:
          IDLE_TIMEOUT_MINUTES,
      }
    );
  } catch (error) {
    // Still sign out on this device.
    console.log(
      'AUTO LOGOUT SERVER ERROR:',
      error
    );
  }

  await clearAdminSession();

  return 'signed_out';
}
