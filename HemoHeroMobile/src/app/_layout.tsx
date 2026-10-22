import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import AppIntro from '../components/AppIntro';
import PushNotificationsBridge from '../components/PushNotificationsBridge';
import SessionTimeout from '../components/SessionTimeout';

SplashScreen.preventAutoHideAsync();

// ------------------------------------------------------------
// NO BROWSER DIALOGS ON WEB
//
// Hemo-Hero uses its own in-app modals. Silence the browser's
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
    Poppins_600SemiBold,
    Poppins_700Bold,

    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // SessionTimeout: 15-minute inactivity sign-out (and, on the
  // web, signing out every tab together).
  return (
    <SessionTimeout>
      <Stack
        screenOptions={{
          headerShown: false,

          // Short, subtle cross-fade between screens. Works for
          // both bottom-nav tab switches (router.replace) and
          // detail screens (router.push).
          animation: 'fade',
          animationDuration: 200,

          contentStyle: {
            backgroundColor: '#FFF8F8',
          },
        }}
      >
        {/* SIGN IN */}
        <Stack.Screen name="index" />

        {/* SIGN UP */}
        <Stack.Screen name="signup" />

        {/* EMAIL VERIFICATION */}
        <Stack.Screen
          name="verify-email"
        />

        {/* COMPLETE PROFILE FLOW */}
        <Stack.Screen
          name="complete-profile"
        />

        {/* WELCOME (new accounts; offers the Home tour) */}
        <Stack.Screen
          name="welcome"
          options={{
            gestureEnabled: false,
          }}
        />

        {/* USER DASHBOARD */}
        <Stack.Screen
          name="dashboard"
        />

        {/* Blood request */}

        <Stack.Screen
          name="blood-request"
          />
      </Stack>

      {/* Push notifications: setup + opening tapped ones */}
      <PushNotificationsBridge />

      {/* Opening animation, once per launch, over the first screen */}
      <AppIntro />
    </SessionTimeout>
  );
}