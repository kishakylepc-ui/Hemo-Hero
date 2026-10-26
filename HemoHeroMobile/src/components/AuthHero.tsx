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
import Svg, { Path } from 'react-native-svg';

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

// The wave's height; the form starts right below it.
const WAVE_HEIGHT = 56;

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
      <Svg
        width={large ? 230 : 160}
        height={large ? 300 : 210}
        viewBox="0 0 230 300"
        style={[
          styles.drop,

          {
            top:
              topInset +
              (large ? 4 : -24),
          },
        ]}
        pointerEvents="none"
      >
        <Path
          d="M115 10 C 160 80, 215 140, 215 195 A 100 100 0 0 1 15 195 C 15 140, 70 80, 115 10 Z"
          fill={COLORS.white}
          fillOpacity={0.1}
        />

        <Path
          d="M115 70 C 145 115, 175 150, 175 185 A 60 60 0 0 1 55 185 C 55 150, 85 115, 115 70 Z"
          fill={COLORS.white}
          fillOpacity={0.08}
        />
      </Svg>

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
      <Svg
        width="100%"
        height={WAVE_HEIGHT}
        viewBox="0 0 390 70"
        preserveAspectRatio="none"
        style={styles.wave}
        pointerEvents="none"
      >
        <Path
          d="M0 34 C 70 4, 140 4, 205 30 S 330 66, 390 26 V70 H0 Z"
          fill={COLORS.white}
        />
      </Svg>
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
    paddingBottom: WAVE_HEIGHT + 20,
  },

  heroSmall: {
    paddingBottom: WAVE_HEIGHT + 4,
  },

  drop: {
    position: 'absolute',
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

  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
  },
});
