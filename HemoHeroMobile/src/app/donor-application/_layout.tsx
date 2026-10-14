import { Stack } from 'expo-router';

export default function DonorApplicationLayout() {
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
    />
  );
}
