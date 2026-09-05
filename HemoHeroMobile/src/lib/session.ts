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

export async function clearSession() {
  await AsyncStorage.multiRemove([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
}