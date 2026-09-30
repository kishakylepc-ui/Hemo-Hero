import {
  Platform,
} from 'react-native';

import Constants from 'expo-constants';

// ============================================================
// HEMO-HERO API ADDRESS
//
// The API server runs on the same computer as the Expo dev
// server (Metro), on port 5000. Expo Go already knows that
// computer's address - it is how the phone loaded the app - so
// the API address is built from it. This works on any Wi-Fi or
// phone hotspot without editing .env (Expo "LAN" mode, the
// default for `npx expo start`).
//
// EXPO_PUBLIC_API_URL, when set, overrides this (for example a
// deployed server). Leave it unset for local development.
// ============================================================

const API_PORT = 5000;

// Host of the computer running `npx expo start`, e.g.
// "192.168.1.5" from "192.168.1.5:8081". Null outside of
// development (e.g. a store build).
function getDevServerHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    '';

  const host =
    hostUri
      .split(':')[0]
      ?.trim();

  return host || null;
}

function resolveApiUrl() {
  const override =
    process.env.EXPO_PUBLIC_API_URL?.trim();

  if (override) {
    return override;
  }

  // Web: the computer that served the page (localhost, or its
  // IP when the page is opened from another device).
  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined' &&
      window.location?.hostname
        ? window.location.hostname
        : 'localhost';

    return `http://${host}:${API_PORT}`;
  }

  return `http://${
    getDevServerHost() ||
    'localhost'
  }:${API_PORT}`;
}

export const API_URL =
  resolveApiUrl().replace(
    /\/+$/,
    ''
  );

if (__DEV__) {
  console.log(
    '[Hemo-Hero] API server:',
    API_URL
  );
}
