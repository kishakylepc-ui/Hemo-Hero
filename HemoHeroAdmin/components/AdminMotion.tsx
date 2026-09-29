import {
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Easing,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// ============================================================
// HEMO-HERO ADMIN MOTION
//
// Small, shared entrance animation used across Admin screens.
//
// Design rules (keep it calm, not annoying):
// - short: 240ms
// - subtle: 10px slide + fade
// - plays ONCE when the element mounts (not on every refresh)
// - staggered sections use small delays (0 / 60 / 120ms)
//
// Lives outside /app so Expo Router does not treat it as a route.
// ============================================================

const DURATION = 240;

// Native driver is unavailable on web.
const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

export function FadeInView({
  children,
  delay = 0,
  offset = 10,
  style,
}: {
  children: ReactNode;

  // Milliseconds before this block starts animating.
  delay?: number;

  // Starting vertical offset in px.
  offset?: number;

  style?: StyleProp<ViewStyle>;
}) {
  const progress =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    const animation =
      Animated.timing(
        progress,
        {
          toValue: 1,
          duration: DURATION,
          delay,
          easing:
            Easing.out(
              Easing.cubic
            ),
          useNativeDriver:
            USE_NATIVE_DRIVER,
        }
      );

    animation.start();

    return () =>
      animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        style,

        {
          opacity: progress,

          transform: [
            {
              translateY:
                progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [offset, 0],
                }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
