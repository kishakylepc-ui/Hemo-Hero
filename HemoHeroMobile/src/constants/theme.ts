// ============================================================
// HEMO-HERO MOBILE THEME
//
// Single source of truth for the mobile look. Based on the
// Home dashboard palette (the most-used screens). Screens are
// migrated to these values one at a time.
// ============================================================

export const COLORS = {
  // Brand reds
  red: '#DB0A0A',
  redDark: '#8F1111',
  redDeep: '#A90909',
  redButton: '#B42323',

  // Bottom navigation
  nav: '#A90707',
  navInactive: '#D99191',

  // Surfaces
  page: '#FFF8F8',
  card: '#FFFFFF',
  white: '#FFFFFF',
  pinkLight: '#FFF0F0',
  pinkSoft: '#FDE7E7',

  // Text
  black: '#171717',
  muted: '#666666',
  lightMuted: '#969696',

  // Lines
  border: '#E4D7D7',
  divider: '#F1E6E6',

  // Status
  green: '#159447',
  greenLight: '#EAF7EF',
  orange: '#DF721D',
  orangeLight: '#FDF1E6',
  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  overlay: 'rgba(23,23,23,0.55)',
};

export const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
};

// Readable phone type scale (px).
export const TEXT = {
  title: 24,
  section: 17,
  body: 14,
  small: 12.5,
  tiny: 11,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Soft card shadow used across screens.
export const SHADOW = {
  shadowColor: '#8F1111',
  shadowOffset: {
    width: 0,
    height: 6,
  },
  shadowOpacity: 0.07,
  shadowRadius: 14,
  elevation: 3,
};
