import { useEffect } from 'react';
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
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,

    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
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

      {/* USER DASHBOARD */}
      <Stack.Screen
        name="dashboard"
      />
    </Stack>
  );
}