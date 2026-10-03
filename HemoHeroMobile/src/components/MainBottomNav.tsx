import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

// ============================================================
// TYPES
// ============================================================

export type MainNavTab =
  | 'home'
  | 'search'
  | 'chat'
  | 'requests'
  | 'profile';

type MainBottomNavProps = {
  activeTab?:
    | MainNavTab
    | null;
};

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  redDark: '#A90707',

  white: '#FFFFFF',

  inactive: '#D99191',
};

// ============================================================
// MAIN BOTTOM NAVIGATION
// ============================================================

export default function MainBottomNav({
  activeTab = null,
}: MainBottomNavProps) {
  // ==========================================================
  // NAVIGATION
  // ==========================================================

  function navigate(
    tab: MainNavTab
  ) {
    if (
      tab ===
      activeTab
    ) {
      return;
    }

    switch (
      tab
    ) {
      // ------------------------------------------------------
      // HOME
      // ------------------------------------------------------

      case 'home':
        router.replace(
          '/dashboard' as any
        );

        return;

      // ------------------------------------------------------
      // SEARCH
      // ------------------------------------------------------

      case 'search':
        router.replace(
          '/search' as any
        );

        return;

      // ------------------------------------------------------
      // CHAT
      // ------------------------------------------------------

      case 'chat':
        router.replace(
          '/chat' as any
        );

        return;

      // ------------------------------------------------------
      // REQUESTS
      // ------------------------------------------------------

      case 'requests':
        router.replace(
          '/requests' as any
        );

        return;

      // ------------------------------------------------------
      // PROFILE
      // ------------------------------------------------------

      case 'profile':
        router.replace(
          '/profile' as any
        );

        return;
    }
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
      style={
        styles.bottomNav
      }
    >
      {items.map(
        item => {
          const active =
            activeTab ===
            item.key;

          return (
            <TouchableOpacity
              key={
                item.key
              }
              style={
                styles.navItem
              }
              activeOpacity={
                active
                  ? 1
                  : 0.75
              }
              accessibilityRole="button"
              accessibilityLabel={
                item.label
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
              <MaterialIcons
                name={
                  active
                    ? item.activeIcon
                    : item.inactiveIcon
                }
                size={
                  item.key ===
                  'search'
                    ? 27
                    : 28
                }
                color={
                  active
                    ? COLORS.white
                    : COLORS.inactive
                }
              />

              <Text
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
    bottomNav: {
      height:
        76,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-around',

      paddingHorizontal:
        4,

      backgroundColor:
        COLORS.redDark,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        'rgba(255,255,255,0.15)',
    },

    navItem: {
      flex:
        1,

      height:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,
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