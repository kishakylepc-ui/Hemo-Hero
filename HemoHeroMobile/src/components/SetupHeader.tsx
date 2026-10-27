import {
  type ReactNode,
} from 'react';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

import {
  HERO_WAVE_HEIGHT,
  HeroDrop,
  HeroWave,
} from './HeroArt';

import {
  ProgressFill,
} from './Motion';

// ============================================================
// SETUP HEADER (complete your profile)
//
// The sign-in screens' red top (see-through drop, wave into
// the white form) with a back button, the step's title, and
// three labeled step bars; the current step's bar fills in.
// The done screen passes no step and a `badge` instead, shown
// above a centered title. Draws behind the status bar: pass
// the top safe-area inset.
// ============================================================

const COLORS = {
  top: '#E0141A',
  middle: '#A10F12',
  bottom: '#8F1111',
  white: '#FFFFFF',
  subtitle: 'rgba(255,255,255,0.88)',
  button: 'rgba(255,255,255,0.16)',
  barEmpty: 'rgba(255,255,255,0.3)',
  labelDim: 'rgba(255,255,255,0.72)',
};

const STEPS = [
  'Personal',
  'Location',
  'Medical',
];

export default function SetupHeader({
  topInset,
  title,
  subtitle,
  step,
  onBack,
  badge,
}: {
  topInset: number;
  title: string;
  subtitle?: string;
  // 1 to 3; leave out on the done screen.
  step?: 1 | 2 | 3;
  onBack?: () => void;
  // Shown above a centered title (the done screen's check).
  badge?: ReactNode;
}) {
  const centered =
    Boolean(badge);

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

        {
          paddingTop:
            topInset +
            (centered ? 36 : 10),
        },
      ]}
    >
      <HeroDrop
        width={170}
        style={[
          styles.drop,

          {
            top: topInset - 24,
          },
        ]}
      />

      {onBack ? (
        <TouchableOpacity
          style={
            styles.back
          }
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>
      ) : null}

      <View
        style={[
          styles.text,
          centered &&
            styles.textCentered,
        ]}
      >
        {badge}

        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            centered &&
              styles.titleCentered,
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              centered &&
                styles.subtitleCentered,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {step ? (
        <View
          style={
            styles.steps
          }
          accessibilityLabel={`Step ${step} of ${STEPS.length}`}
        >
          {/* Finished steps stay filled; this step fills in. */}
          <View
            style={
              styles.row
            }
          >
            {STEPS.map(
              (label, index) => (
                <ProgressFill
                  key={label}
                  filled={
                    index < step
                  }
                  animate={
                    index ===
                    step - 1
                  }
                  style={
                    styles.bar
                  }
                  fillStyle={
                    styles.barFill
                  }
                />
              )
            )}
          </View>

          <View
            style={
              styles.row
            }
          >
            {STEPS.map(
              (label, index) => (
                <Text
                  key={label}
                  numberOfLines={1}
                  style={[
                    styles.label,
                    index ===
                      step - 1 &&
                      styles.labelActive,
                  ]}
                >
                  {index + 1} · {label}
                </Text>
              )
            )}
          </View>
        </View>
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
    paddingBottom:
      HERO_WAVE_HEIGHT + 8,
    overflow: 'hidden',
    // The white form overlaps the last 2px, so no seam shows.
    marginBottom: -2,
  },

  drop: {
    right: -42,
  },

  back: {
    width: 44,
    height: 44,
    marginLeft: -8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.button,
  },

  text: {
    marginTop: 14,
  },

  textCentered: {
    marginTop: 0,
    alignItems: 'center',
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    lineHeight: 30,
  },

  titleCentered: {
    marginTop: 18,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 4,
    color: COLORS.subtitle,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  subtitleCentered: {
    textAlign: 'center',
  },

  steps: {
    marginTop: 16,
    gap: 6,
  },

  row: {
    flexDirection: 'row',
    gap: 6,
  },

  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.barEmpty,
  },

  barFill: {
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },

  label: {
    flex: 1,
    color: COLORS.labelDim,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },

  labelActive: {
    color: COLORS.white,
  },
});
