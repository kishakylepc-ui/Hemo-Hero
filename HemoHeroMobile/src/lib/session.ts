import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@hemohero/access_token';
const REFRESH_TOKEN_KEY = '@hemohero/refresh_token';

// Last touch or typing in the app. See sessionTimeout.ts.
const LAST_ACTIVITY_KEY = '@hemohero/last_activity';

// Why the last session ended, for the sign-in screen (and other
// browser tabs on the web). Kept until the next sign-in.
const LOGOUT_REASON_KEY = '@hemohero/logout_reason';

// On the web these are localStorage keys, so a tab can notice
// another tab's change (the "storage" event).
export const SESSION_STORAGE_KEYS = {
  accessToken: ACCESS_TOKEN_KEY,
  lastActivity: LAST_ACTIVITY_KEY,
};

export type LogoutReason =
  | 'inactivity'
  | 'signed_out';

export async function saveSession(session: any) {
  if (!session?.access_token) {
    return;
  }

  await AsyncStorage.setItem(
    ACCESS_TOKEN_KEY,
    session.access_token
  );

  if (session.refresh_token) {
    await AsyncStorage.setItem(
      REFRESH_TOKEN_KEY,
      session.refresh_token
    );
  }
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function getLastActivity(): Promise<number | null> {
  try {
    const value = Number(
      await AsyncStorage.getItem(LAST_ACTIVITY_KEY)
    );

    return Number.isFinite(value) && value > 0
      ? value
      : null;
  } catch {
    return null;
  }
}

export async function setLastActivity(time: number) {
  try {
    await AsyncStorage.setItem(
      LAST_ACTIVITY_KEY,
      String(time)
    );
  } catch (error) {
    console.log('SAVE LAST ACTIVITY ERROR:', error);
  }
}

export async function setLogoutReason(
  reason: LogoutReason | null
) {
  try {
    if (reason) {
      await AsyncStorage.setItem(
        LOGOUT_REASON_KEY,
        reason
      );
    } else {
      await AsyncStorage.removeItem(LOGOUT_REASON_KEY);
    }
  } catch (error) {
    console.log('SAVE LOGOUT REASON ERROR:', error);
  }
}

export async function getLogoutReason(): Promise<LogoutReason | null> {
  try {
    const value = await AsyncStorage.getItem(
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

// Work to do while the session still exists (e.g. turning off
// push notifications for this phone). Registered by the module
// that needs it, so this file imports nothing app-specific.
type SessionClearHandler = (
  accessToken: string | null
) => Promise<void> | void;

const clearHandlers: SessionClearHandler[] = [];

export function onSessionClear(
  handler: SessionClearHandler
) {
  clearHandlers.push(handler);
}

// Signing out never waits on the network for more than this.
const CLEAR_HANDLER_TIMEOUT_MS = 3000;

export async function clearSession() {
  const accessToken = await getAccessToken();

  await Promise.all(
    clearHandlers.map(handler =>
      Promise.race([
        Promise.resolve()
          .then(() => handler(accessToken))
          .catch(error =>
            console.log('SESSION CLEAR HANDLER ERROR:', error)
          ),

        new Promise(resolve =>
          setTimeout(resolve, CLEAR_HANDLER_TIMEOUT_MS)
        ),
      ])
    )
  );

  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    LAST_ACTIVITY_KEY,
  ]);
}