import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

// ============================================================
// HERO ART (sign-in screens and Home)
//
// The see-through blood drop and the liquid wave that the red
// tops share. Place both inside a red container with
// overflow: 'hidden'.
// ============================================================

const WHITE = '#FFFFFF';

// A large see-through drop; position it with `style`.
export function HeroDrop({
  width,
  style,
}: {
  width: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      width={width}
      height={(width * 300) / 230}
      viewBox="0 0 230 300"
      style={[
        styles.drop,
        style,
      ]}
      pointerEvents="none"
    >
      <Path
        d="M115 10 C 160 80, 215 140, 215 195 A 100 100 0 0 1 15 195 C 15 140, 70 80, 115 10 Z"
        fill={WHITE}
        fillOpacity={0.1}
      />

      <Path
        d="M115 70 C 145 115, 175 150, 175 185 A 60 60 0 0 1 55 185 C 55 150, 85 115, 115 70 Z"
        fill={WHITE}
        fillOpacity={0.08}
      />
    </Svg>
  );
}

// The wave along the bottom edge, in the color of what comes
// below it.
export const HERO_WAVE_HEIGHT = 56;

export function HeroWave({
  color,
}: {
  color: string;
}) {
  return (
    <Svg
      width="100%"
      height={HERO_WAVE_HEIGHT}
      viewBox="0 0 390 70"
      preserveAspectRatio="none"
      style={styles.wave}
      pointerEvents="none"
    >
      <Path
        d="M0 34 C 70 4, 140 4, 205 30 S 330 66, 390 26 V70 H0 Z"
        fill={color}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
  },

  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
  },
});
