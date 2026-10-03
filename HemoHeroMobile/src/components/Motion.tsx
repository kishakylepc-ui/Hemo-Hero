import {
  type ReactNode,
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// ============================================================
// HEMO-HERO MOBILE MOTION
//
// Small, shared animations (same feel as the Admin Portal):
// - short (240ms), subtle (10px slide + fade)
// - plays once when an element mounts
// - press feedback is a quick 0.97 scale
// ============================================================

const DURATION = 240;

const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

// ------------------------------------------------------------
// FADE IN
// ------------------------------------------------------------

export function FadeInView({
  children,
  delay = 0,
  offset = 10,
  style,
}: {
  children: ReactNode;
  delay?: number;
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
          easing: Easing.out(
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

// ------------------------------------------------------------
// PULSE RING
//
// A soft ring that slowly grows and fades behind an icon to
// draw attention to a primary action (e.g. Create Request).
// Slow (2.4s) and low-contrast so it is not distracting.
// Render it as the first child of a centered icon container.
// ------------------------------------------------------------

export function PulseRing({
  size,
  color = 'rgba(255,255,255,0.55)',
  active = true,
}: {
  size: number;
  color?: string;
  active?: boolean;
}) {
  const progress =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);

      return;
    }

    const loop =
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(
            Easing.quad
          ),
          useNativeDriver:
            USE_NATIVE_DRIVER,
        })
      );

    loop.start();

    return () => loop.stop();
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,

        opacity:
          progress.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0.9, 0.2, 0],
          }),

        transform: [
          {
            scale:
              progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.55],
              }),
          },
        ],
      }}
    />
  );
}

// ------------------------------------------------------------
// PRESSABLE SCALE
//
// Drop-in for TouchableOpacity when a card or button should
// gently shrink while pressed. `containerStyle` sizes the
// touch area itself (e.g. a percentage width inside a grid).
// ------------------------------------------------------------

export function PressableScale({
  children,
  style,
  containerStyle,
  disabled,
  ...props
}: PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  function animateTo(
    value: number
  ) {
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 0,
      useNativeDriver:
        USE_NATIVE_DRIVER,
    }).start();
  }

  return (
    <Pressable
      {...props}
      style={containerStyle}
      disabled={disabled}
      onPressIn={event => {
        animateTo(0.97);
        props.onPressIn?.(event);
      }}
      onPressOut={event => {
        animateTo(1);
        props.onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[
          style,

          {
            transform: [{ scale }],
          },

          disabled && {
            opacity: 0.55,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
