import {
  useEffect,
  useRef,
} from 'react';

import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FadeInView,
  PressableScale,
} from '../components/Motion';

import {
  COLORS,
  FONTS,
} from '../constants/theme';

// ============================================================
// WELCOME
//
// Shown once to new accounts, right after Complete Profile. The
// logo springs in and then beats like a heart (same feel as the
// opening animation), and the person chooses whether to take the
// tour: it highlights the real buttons on Home
// (/dashboard?tour=1). Skipping goes straight to Home. With
// "reduce motion" on, nothing loops.
// ============================================================

const HEADER_TOP = '#D2151A';

const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

export default function WelcomeScreen() {
  const logoScale =
    useRef(
      new Animated.Value(0.6)
    ).current;

  const logoOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const ringScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const ringOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  function timing(
    value: Animated.Value,
    toValue: number,
    duration: number,
    easing = Easing.out(Easing.quad)
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
        timing(logoScale, 1.1, 120),
        timing(logoScale, 0.98, 120, Easing.inOut(Easing.quad)),
        timing(logoScale, 1.06, 110),
        timing(logoScale, 1, 220, Easing.inOut(Easing.quad)),
      ]),

      Animated.sequence([
        Animated.parallel([
          timing(ringOpacity, 0.6, 80),
          timing(ringScale, 0.95, 80),
        ]),

        Animated.parallel([
          timing(ringOpacity, 0, 700),
          timing(ringScale, 1.6, 700),
        ]),
      ]),
    ]);
  }

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;

    function showStill() {
      logoScale.setValue(1);
      logoOpacity.setValue(1);
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduceMotion => {
        if (cancelled) {
          return;
        }

        if (reduceMotion) {
          showStill();

          return;
        }

        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 5,
            tension: 70,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),

          timing(logoOpacity, 1, 320),
        ]).start(() => {
          if (cancelled) {
            return;
          }

          loop =
            Animated.loop(
              Animated.sequence([
                heartbeat(),
                Animated.delay(1400),
              ])
            );

          loop.start();
        });
      });

    return () => {
      cancelled = true;
      loop?.stop();
    };
    // Runs once; the animated values never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTour() {
    router.replace({
      pathname: '/dashboard',
      params: {
        tour: '1',
      },
    } as any);
  }

  function skipTour() {
    router.replace('/dashboard');
  }

  // Android back button skips the tour.
  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          skipTour();

          return true;
        }
      );

    return () =>
      subscription.remove();
  }, []);

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <LinearGradient
          colors={[
            HEADER_TOP,
            COLORS.redDark,
          ]}
          style={styles.flex}
        >
          <SafeAreaView
            style={styles.flex}
            edges={['top', 'bottom']}
          >
            <StatusBar style="light" />

            <View style={styles.circleTop} />
            <View style={styles.circleBottom} />

            {/* LOGO + GREETING */}

            <View style={styles.hero}>
              <View style={styles.logoArea}>
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

                <Animated.View
                  style={[
                    styles.logoCircle,

                    {
                      opacity: logoOpacity,

                      transform: [
                        {
                          scale: logoScale,
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/LifeLine (5).png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>

              <FadeInView
                delay={380}
                offset={14}
              >
                <Text style={styles.kicker}>
                  Welcome to
                </Text>

                <Text style={styles.title}>
                  Hemo-Hero
                </Text>
              </FadeInView>

              <FadeInView
                delay={480}
                offset={14}
              >
                <Text style={styles.subtitle}>
                  Connecting people who need blood with
                  verified donors nearby.
                </Text>
              </FadeInView>
            </View>

            {/* OPTIONAL TOUR */}

            <FadeInView
              delay={640}
              offset={18}
              style={styles.sheet}
            >
              <View style={styles.sheetHeader}>
                <View style={styles.sheetIcon}>
                  <MaterialIcons
                    name="explore"
                    size={22}
                    color={COLORS.redButton}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={styles.sheetTitle}>
                    Want a quick tour?
                  </Text>

                  <Text style={styles.sheetText}>
                    We'll point out the main buttons on your Home
                    screen. It takes less than a minute.
                  </Text>
                </View>
              </View>

              <PressableScale
                style={styles.primaryButton}
                accessibilityRole="button"
                onPress={startTour}
              >
                <Text style={styles.primaryText}>
                  Show me around
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={19}
                  color={COLORS.white}
                />
              </PressableScale>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                onPress={skipTour}
              >
                <Text style={styles.secondaryText}>
                  Skip for now
                </Text>
              </TouchableOpacity>

              <Text style={styles.note}>
                You can take the tour later from Help.
              </Text>
            </FadeInView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Platform.OS === 'web'
        ? '#242424'
        : COLORS.page,
  },

  phone: {
    width:
      Platform.OS === 'web'
        ? 440
        : '100%',
    height: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  flex: {
    flex: 1,
  },

  circleTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    left: -130,
    top: -70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  circleBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    right: -140,
    top: 260,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  hero: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoArea: {
    width: 190,
    height: 190,
    marginBottom: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.75)',
  },

  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },

  logo: {
    width: 116,
    height: 116,
  },

  kicker: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    textAlign: 'center',
  },

  title: {
    marginTop: 2,
    color: COLORS.white,
    fontFamily: FONTS.heading,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.86)',
    fontFamily: FONTS.body,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
  },

  sheet: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.white,
  },

  sheetHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },

  sheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  sheetTitle: {
    color: COLORS.black,
    fontFamily: FONTS.heading,
    fontSize: 17,
  },

  sheetText: {
    marginTop: 3,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 19,
  },

  primaryButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: COLORS.redButton,
  },

  primaryText: {
    color: COLORS.white,
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
  },

  secondaryButton: {
    height: 46,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryText: {
    color: COLORS.redButton,
    fontFamily: FONTS.headingSemi,
    fontSize: 14.5,
  },

  note: {
    color: COLORS.lightMuted,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
  },
});
