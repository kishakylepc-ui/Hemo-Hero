import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@hemohero/access_token';
const REFRESH_TOKEN_KEY = '@hemohero/refresh_token';

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
  ]);
}