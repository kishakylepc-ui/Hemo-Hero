import { useEffect } from 'react';

import { Platform } from 'react-native';

import { Stack } from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import SessionGuard from '../components/SessionGuard';

import {
  useFonts,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ------------------------------------------------------------
// NO BROWSER DIALOGS ON WEB
//
// The Admin Portal uses its own modals. Silence the browser's
// "localhost says..." alert/confirm/prompt in case a library
// calls them. confirm() answers yes so that flow continues.
// ------------------------------------------------------------

if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined'
) {
  window.alert = (message?: unknown) => {
    console.log('[alert suppressed]', message);
  };

  window.confirm = (message?: string) => {
    console.log('[confirm suppressed]', message);

    return true;
  };

  window.prompt = (message?: string) => {
    console.log('[prompt suppressed]', message);

    return null;
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,

    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // SessionGuard: protected pages, 15-minute inactivity
  // sign-out, and signing out every tab together.
  return (
    <SessionGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',

          contentStyle: {
            backgroundColor: '#050812',
          },
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Screen name="dashboard" />
      </Stack>
    </SessionGuard>
  );
}