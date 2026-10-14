import { Stack } from 'expo-router';

export default function CompleteProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Steps fade (same as the rest of the app) instead of
        // sliding like a slideshow: the header stays put and the
        // progress bar shows the move to the next step.
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="personal" />
      <Stack.Screen name="location" />
      <Stack.Screen name="medical" />
      <Stack.Screen name="success" />
    </Stack>
  );
}