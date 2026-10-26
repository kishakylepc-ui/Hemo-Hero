import {
  type ComponentProps,
} from 'react';

import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import {
  HERO_WAVE_HEIGHT,
  HeroDrop,
  HeroWave,
} from './HeroArt';

// ============================================================
// AUTH HERO (sign in, sign up, password reset, verify email)
//
// Red top with a large see-through blood drop, the logo and
// name, an optional headline, and a liquid wave where it meets
// the white form below. Draws behind the status bar: pass the
// top safe-area inset.
// ============================================================

const COLORS = {
  top: '#E0141A',
  middle: '#A10F12',
  bottom: '#8F1111',
  white: '#FFFFFF',
  subtitle: 'rgba(255,255,255,0.85)',
};

type AnimatedStyle =
  ComponentProps<typeof Animated.View>['style'];

export default function AuthHero({
  topInset,
  title,
  subtitle,
  size = 'small',
  logoStyle,
  textStyle,
}: {
  topInset: number;
  // Headline, e.g. "Give blood.\nSave lives."
  title?: string;
  subtitle?: string;
  // large: Sign In; small: everything else.
  size?: 'large' | 'small';
  // Optional entrance animations from the screen.
  logoStyle?: AnimatedStyle;
  textStyle?: AnimatedStyle;
}) {
  const large =
    size === 'large';

  return (
    <LinearGradient
      colors={[
        COLORS.top,
        COLORS.middle,
        COLORS.bottom,
      ]}
      locations={[
        0,
        0.6,
        1,
      ]}
      start={{
        x: 0.15,
        y: 0,
      }}
      end={{
        x: 0.85,
        y: 1,
      }}
      style={[
        styles.hero,

        large
          ? styles.heroLarge
          : styles.heroSmall,

        {
          paddingTop:
            topInset +
            (large ? 20 : 14),
        },
      ]}
    >
      {/* The see-through drop, partly off the right edge. */}
      <HeroDrop
        width={large ? 230 : 160}
        style={[
          styles.drop,

          {
            top:
              topInset +
              (large ? 4 : -24),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.brandRow,
          logoStyle,
        ]}
      >
        <View
          style={
            styles.logoCircle
          }
        >
          <Image
            source={require(
              '../../assets/images/LifeLine (5).png'
            )}
            style={
              styles.logoImage
            }
            resizeMode="contain"
          />
        </View>

        <Text
          style={
            styles.brandName
          }
        >
          Hemo-Hero
        </Text>
      </Animated.View>

      {title ? (
        <Animated.View
          style={[
            large
              ? styles.textLarge
              : styles.textSmall,
            textStyle,
          ]}
        >
          <Text
            style={
              large
                ? styles.titleLarge
                : styles.titleSmall
            }
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.subtitle
              }
            >
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Liquid edge into the white form. */}
      <HeroWave
        color={COLORS.white}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    overflow: 'hidden',
    // The white form overlaps the last 2px, so no seam shows
    // between the wave and the form.
    marginBottom: -2,
  },

  // Room under the text for the wave to sit in.
  heroLarge: {
    paddingBottom: HERO_WAVE_HEIGHT + 20,
  },

  heroSmall: {
    paddingBottom: HERO_WAVE_HEIGHT + 4,
  },

  drop: {
    right: -48,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },

  logoImage: {
    width: 36,
    height: 36,
  },

  brandName: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },

  textLarge: {
    marginTop: 22,
  },

  textSmall: {
    marginTop: 14,
  },

  titleLarge: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
    lineHeight: 42,
  },

  titleSmall: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    lineHeight: 32,
  },

  subtitle: {
    marginTop: 6,
    color: COLORS.subtitle,
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
    lineHeight: 21,
  },
});
