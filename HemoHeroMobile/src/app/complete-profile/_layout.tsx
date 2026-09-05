import { Stack } from 'expo-router';

export default function CompleteProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="personal" />
      <Stack.Screen name="location" />
      <Stack.Screen name="medical" />
      <Stack.Screen name="success" />
    </Stack>
  );
}