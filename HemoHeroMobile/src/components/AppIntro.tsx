import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, {
  Path,
} from 'react-native-svg';

import { StatusBar } from 'expo-status-bar';

import {
  markIntroDone,
  waitForIntroRelease,
} from '../lib/appIntro';

// ============================================================
// APP INTRO (opening animation)
//
// Plays once when the app opens, over the first screen:
//   1. the Hemo-Hero logo beats like a heart, with a soft ring
//   2. a heartbeat (ECG) line draws under it
//   3. "Hemo-Hero" and the tagline rise in
//   4. a red circle grows from the logo and fades into the
//      sign-in screen's red header
//
// About 2.6 seconds; tapping skips ahead. With "reduce motion"
// on, it only fades out. It always ends, even if an animation
// is interrupted (MAX_INTRO_MS).
// ============================================================

const COLORS = {
  red: '#D2151A',
  redButton: '#B42323',
  white: '#FFFFFF',
  muted: '#7A6A6A',
  ring: '#E79A9C',
  desktop: '#242424',
};

// Same image and size as the native splash screen (app.json),
// so the hand-off doesn't jump.
const LOGO_SIZE = 200;

// The exit circle is drawn small and scaled up. Its size can't
// depend on the window: the web build pre-renders pages with no
// window, and the browser keeps that first size.
const CIRCLE_SIZE = 200;
const CIRCLE_SCALE = 18;

const LINE_WIDTH = 240;
const LINE_HEIGHT = 56;

// A single heartbeat across the line.
const ECG_PATH =
  'M0 30 H74 L84 30 L92 14 L102 48 L113 4 L124 54 L134 30 H168 L176 22 L184 30 H240';

// Hard limit before the intro gets out of the way.
const MAX_INTRO_MS = 4500;

const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

export default function AppIntro() {
  const [
    visible,
    setVisible,
  ] = useState(true);

  const logoScale = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const groupLift = useRef(new Animated.Value(0)).current;
  const lineReveal = useRef(new Animated.Value(0)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleLift = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const exiting = useRef(false);

  function timing(
    value: Animated.Value,
    toValue: number,
    duration: number,
    easing = Easing.out(Easing.cubic)
  ) {
    return Animated.timing(value, {
      toValue,
      duration,
      easing,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
  }

  // One "lub-dub" heartbeat with a ring pulse.
  function heartbeat() {
    return Animated.parallel([
      Animated.sequence([
        timing(logoScale, 1.12, 120, Easing.out(Easing.quad)),
        timing(logoScale, 0.98, 120, Easing.inOut(Easing.quad)),
        timing(logoScale, 1.07, 110, Easing.out(Easing.quad)),
        timing(logoScale, 1, 220, Easing.inOut(Easing.quad)),
      ]),

      Animated.sequence([
        Animated.parallel([
          timing(ringOpacity, 0.55, 80),
          timing(ringScale, 0.9, 80),
        ]),

        Animated.parallel([
          timing(ringOpacity, 0, 520),
          timing(ringScale, 1.7, 520),
        ]),
      ]),
    ]);
  }

  async function finish() {
    if (exiting.current) {
      return;
    }

    exiting.current = true;

    // The first screen may still be deciding where to go (e.g.
    // restoring a saved sign-in); wait so it doesn't flash.
    await waitForIntroRelease();

    // Red circle covers the screen, then everything fades into
    // the first screen (whose entrance starts now).
    Animated.sequence([
      Animated.parallel([
        timing(circleScale, CIRCLE_SCALE, 460, Easing.in(Easing.cubic)),
        timing(titleOpacity, 0, 220),
        timing(taglineOpacity, 0, 220),
      ]),

      Animated.delay(40),
    ]).start(() => {
      markIntroDone();

      timing(overlayOpacity, 0, 320, Easing.out(Easing.quad))
        .start(() => setVisible(false));

      // In case the fade is interrupted.
      setTimeout(() => setVisible(false), 600);
    });
  }

  useEffect(() => {
    let cancelled = false;

    const safety =
      setTimeout(finish, MAX_INTRO_MS);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduceMotion => {
        if (cancelled) {
          return;
        }

        if (reduceMotion) {
          exiting.current = true;

          waitForIntroRelease().then(() => {
            markIntroDone();

            timing(overlayOpacity, 0, 300)
              .start(() => setVisible(false));
          });

          return;
        }

        Animated.sequence([
          Animated.delay(150),

          heartbeat(),

          Animated.parallel([
            // Logo moves up to make room for the text.
            Animated.spring(groupLift, {
              toValue: -46,
              friction: 8,
              tension: 60,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),

            Animated.sequence([
              timing(lineOpacity, 1, 120),
              timing(lineReveal, 1, 900, Easing.inOut(Easing.cubic)),
            ]),

            Animated.sequence([
              Animated.delay(250),

              Animated.parallel([
                timing(titleOpacity, 1, 420),
                timing(titleLift, 0, 420),
              ]),

              timing(taglineOpacity, 1, 380),
            ]),

            Animated.sequence([
              Animated.delay(420),
              heartbeat(),
            ]),
          ]),

          Animated.delay(260),
        ]).start(() => {
          if (!cancelled) {
            finish();
          }
        });
      });

    return () => {
      cancelled = true;

      clearTimeout(safety);
    };
    // Runs once on launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
        },
      ]}
    >
      {/* Dark clock/battery on the white intro; the screen
          underneath restores its own style afterwards. */}
      <StatusBar style="dark" />

      <Pressable
        style={styles.stage}
        accessibilityRole="button"
        accessibilityLabel="Hemo-Hero. Tap to continue."
        onPress={finish}
      >
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.group,
              {
                transform: [
                  {
                    translateY: groupLift,
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: logoScale,
                  },
                ],
              }}
            >
              <Image
                source={require('../../assets/images/LifeLine (5).png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Pulse ring around the logo on each beat */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: ringOpacity,
                  transform: [
                    {
                      scale: ringScale,
                    },
                  ],
                },
              ]}
            />

            {/* Heartbeat line, revealed left to right */}
            <Animated.View
              style={[
                styles.lineBox,
                {
                  opacity: lineOpacity,
                },
              ]}
            >
              <Svg
                width={LINE_WIDTH}
                height={LINE_HEIGHT}
                viewBox={`0 0 ${LINE_WIDTH} 60`}
              >
                <Path
                  d={ECG_PATH}
                  stroke={COLORS.redButton}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.lineCover,
                  {
                    transform: [
                      {
                        translateX: lineReveal.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, LINE_WIDTH + 4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Animated.View>
          </Animated.View>
        </View>

        <View
          pointerEvents="none"
          style={styles.textBlock}
        >
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
                transform: [
                  {
                    translateY: titleLift,
                  },
                ],
              },
            ]}
          >
            Hemo-Hero
          </Animated.Text>

          <Animated.View
            style={{
              opacity: taglineOpacity,
            }}
          >
            <Text style={styles.tagline}>
              Connect to Donors Near You
            </Text>
          </Animated.View>
        </View>

        {/* Red circle that grows from the logo on the way out */}
        <View
          pointerEvents="none"
          style={styles.circleAnchor}
        >
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [
                  {
                    scale: circleScale,
                  },
                ],
              },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    // Web shows the app in a phone-width frame.
    backgroundColor:
      Platform.OS === 'web'
        ? COLORS.desktop
        : COLORS.white,
  },

  stage: {
    flex: 1,
    width:
      Platform.OS === 'web'
        ? 440
        : '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo only, so it sits exactly at the screen center (like
  // the native splash); the line hangs below it.
  group: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  // Outline only, so it never shows the logo image's white
  // square background.
  ring: {
    position: 'absolute',
    top: 25,
    left: 25,
    width: LOGO_SIZE - 50,
    height: LOGO_SIZE - 50,
    borderRadius: (LOGO_SIZE - 50) / 2,
    borderWidth: 3,
    borderColor: COLORS.ring,
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },

  lineBox: {
    position: 'absolute',
    top: LOGO_SIZE - 26,
    left: (LOGO_SIZE - LINE_WIDTH) / 2,
    width: LINE_WIDTH,
    height: LINE_HEIGHT,
    overflow: 'hidden',
  },

  // White cover sliding right uncovers the line.
  lineCover: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: LINE_WIDTH + 8,
    backgroundColor: COLORS.white,
  },

  // Below the raised logo and line (logo center ends 46 above
  // the screen center).
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: 90,
    alignItems: 'center',
  },

  title: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 40,
    letterSpacing: 0.3,
  },

  tagline: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  // Center of the logo (screen center, raised by the lift).
  circleAnchor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginTop: -46,
    width: 0,
    height: 0,
  },

  circle: {
    position: 'absolute',
    left: -CIRCLE_SIZE / 2,
    top: -CIRCLE_SIZE / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.red,
  },
});
