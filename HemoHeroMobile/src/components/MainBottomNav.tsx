import type {
  Ref,
} from 'react';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewInstance,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  router,
  usePathname,
} from 'expo-router';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useUnreadMessages,
} from '../lib/useUnreadMessages';

// ============================================================
// FLOATING PILL
//
// A rounded red bar floating over the bottom of the screen,
// with content scrolling behind it. On newer iPhones it sits
// just above the home bar.
//
// Screens add useBottomNavSpace() to the end padding of their
// scroll content so the last item can scroll up above the pill.
// ============================================================

const PILL_HEIGHT =
  64;

const PILL_SIDE_MARGIN =
  16;

// The home-bar area is mostly empty space, so the pill tucks a
// little into it; phones without one (and web) get a small gap.
const HOME_BAR_TUCK =
  8;

const MIN_BOTTOM_GAP =
  12;

function getBottomGap(
  insetBottom: number
) {
  return Math.max(
    insetBottom -
      HOME_BAR_TUCK,
    MIN_BOTTOM_GAP
  );
}

// How much of the bottom of the screen the pill covers.
export function useBottomNavSpace() {
  const insets =
    useSafeAreaInsets();

  return (
    PILL_HEIGHT +
    getBottomGap(
      insets.bottom
    )
  );
}

// ============================================================
// TYPES
// ============================================================

export type MainNavTab =
  | 'home'
  | 'search'
  | 'chat'
  | 'requests'
  | 'profile';

// Each tab's own screen.
const TAB_ROUTES: Record<
  MainNavTab,
  string
> = {
  home:
    '/dashboard',

  search:
    '/search',

  chat:
    '/chat',

  requests:
    '/requests',

  profile:
    '/profile',
};

type MainBottomNavProps = {
  // Highlighted tab. Detail screens highlight the tab they
  // belong to (e.g. a request page highlights Requests).
  activeTab?:
    | MainNavTab
    | null;

  // The pill itself, e.g. for the Home tour to measure.
  pillRef?:
    Ref<ViewInstance>;
};

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  redDark: '#A90707',

  white: '#FFFFFF',

  inactive: '#D99191',

  activeBackground:
    'rgba(255,255,255,0.16)',
};

// ============================================================
// MAIN BOTTOM NAVIGATION
// ============================================================

export default function MainBottomNav({
  activeTab = null,
  pillRef,
}: MainBottomNavProps) {
  const insets =
    useSafeAreaInsets();

  const pathname =
    usePathname();

  const unreadMessages =
    useUnreadMessages();

  // ==========================================================
  // NAVIGATION
  //
  // Already on the tab's screen: nothing to do. Otherwise go
  // back to it if it's open underneath (e.g. Home under
  // Notifications, Requests under a request page), or replace
  // the current screen with it.
  // ==========================================================

  function navigate(
    tab: MainNavTab
  ) {
    const route =
      TAB_ROUTES[tab];

    if (
      pathname ===
      route
    ) {
      return;
    }

    router.dismissTo(
      route as any
    );
  }

  // ==========================================================
  // NAVIGATION ITEMS
  // ==========================================================

  const items: Array<{
    key:
      MainNavTab;

    label:
      string;

    inactiveIcon:
      keyof typeof MaterialIcons.glyphMap;

    activeIcon:
      keyof typeof MaterialIcons.glyphMap;
  }> = [
    {
      key:
        'home',

      label:
        'Home',

      inactiveIcon:
        'home',

      activeIcon:
        'home',
    },

    {
      key:
        'search',

      label:
        'Search',

      inactiveIcon:
        'person-search',

      activeIcon:
        'person-search',
    },

    {
      key:
        'chat',

      label:
        'Chat',

      inactiveIcon:
        'chat-bubble-outline',

      activeIcon:
        'chat-bubble',
    },

    {
      key:
        'requests',

      label:
        'Requests',

      inactiveIcon:
        'bloodtype',

      activeIcon:
        'bloodtype',
    },

    {
      key:
        'profile',

      label:
        'Profile',

      inactiveIcon:
        'person-outline',

      activeIcon:
        'person',
    },
  ];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      ref={pillRef}
      collapsable={false}
      style={[
        styles.pill,

        {
          bottom:
            getBottomGap(
              insets.bottom
            ),
        },
      ]}
    >
      {items.map(
        item => {
          const active =
            activeTab ===
            item.key;

          const badge =
            item.key ===
              'chat' &&
            unreadMessages >
              0
              ? unreadMessages > 9
                ? '9+'
                : String(
                    unreadMessages
                  )
              : '';

          return (
            <TouchableOpacity
              key={
                item.key
              }
              style={[
                styles.navItem,

                active &&
                  styles.navItemActive,
              ]}
              activeOpacity={
                pathname ===
                TAB_ROUTES[item.key]
                  ? 1
                  : 0.75
              }
              accessibilityRole="button"
              accessibilityLabel={
                badge
                  ? `${item.label}, ${unreadMessages} unread`
                  : item.label
              }
              accessibilityState={{
                selected:
                  active,
              }}
              onPress={() =>
                navigate(
                  item.key
                )
              }
            >
              <View>
                <MaterialIcons
                  name={
                    active
                      ? item.activeIcon
                      : item.inactiveIcon
                  }
                  size={
                    item.key ===
                    'search'
                      ? 24
                      : 25
                  }
                  color={
                    active
                      ? COLORS.white
                      : COLORS.inactive
                  }
                />

                {badge ? (
                  <View
                    style={
                      styles.badge
                    }
                  >
                    <Text
                      numberOfLines={1}
                      style={
                        styles.badgeText
                      }
                    >
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                numberOfLines={1}
                style={
                  active
                    ? styles.navTextActive
                    : styles.navText
                }
              >
                {
                  item.label
                }
              </Text>
            </TouchableOpacity>
          );
        }
      )}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    pill: {
      position:
        'absolute',

      left:
        PILL_SIDE_MARGIN,

      right:
        PILL_SIDE_MARGIN,

      height:
        PILL_HEIGHT,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      paddingHorizontal:
        6,

      paddingVertical:
        6,

      borderRadius:
        PILL_HEIGHT / 2,

      borderWidth:
        1,

      borderColor:
        'rgba(255,255,255,0.12)',

      backgroundColor:
        COLORS.redDark,

      // Floating shadow; elevation also keeps the pill above
      // the content scrolling behind it on Android.
      shadowColor:
        '#5A0000',

      shadowOpacity:
        0.3,

      shadowRadius:
        18,

      shadowOffset: {
        width: 0,
        height: 8,
      },

      elevation:
        14,
    },

    navItem: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        2,

      marginHorizontal:
        2,

      borderRadius:
        (PILL_HEIGHT - 12) / 2,
    },

    // Unread messages on the Chat tab.
    badge: {
      position:
        'absolute',

      top:
        -4,

      right:
        -9,

      minWidth:
        17,

      height:
        17,

      paddingHorizontal:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        8.5,

      borderWidth:
        1.5,

      borderColor:
        COLORS.redDark,

      backgroundColor:
        COLORS.white,
    },

    badgeText: {
      color:
        COLORS.redDark,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        10,

      lineHeight:
        12,
    },

    navItemActive: {
      backgroundColor:
        COLORS.activeBackground,
    },

    navTextActive: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11,
    },

    navText: {
      color:
        COLORS.inactive,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11,
    },
  });
