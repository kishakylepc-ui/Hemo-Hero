import {
  Pressable,
  StyleSheet,
  Text,
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

export type AdminTab =
  | 'dashboard'
  | 'applications'
  | 'users'
  | 'requests'
  | 'analytics'
  | 'issues'
  | 'settings';

type Props = {
  activeTab: AdminTab;
};

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  background:
    '#080B14',

  border:
    '#1D2435',

  red:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#7D8497',
};

// ============================================================
// NAVIGATION ITEMS
// ============================================================

const NAV_ITEMS: {
  key: AdminTab;

  label: string;

  icon:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  route: string;
}[] = [
  {
    key:
      'dashboard',

    label:
      'Dashboard',

    icon:
      'dashboard',

    route:
      '/dashboard',
  },

  {
    key:
      'applications',

    label:
      'Applications',

    icon:
      'assignment',

    route:
      '/applications',
  },

  {
    key:
      'users',

    label:
      'Users',

    icon:
      'people',

    route:
      '/users',
  },

  {
    key:
      'requests',

    label:
      'Requests',

    icon:
      'bloodtype',

    route:
      '/requests',
  },

  {
    key:
      'analytics',

    label:
      'Analytics',

    icon:
      'analytics',

    route:
      '/analytics',
  },

  {
    key:
      'issues',

    label:
      'Issues',

    icon:
      'report-problem',

    route:
      '/issues',
  },

  {
    key:
      'settings',

    label:
      'Settings',

    icon:
      'settings',

    route:
      '/settings',
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function AdminBottomNav({
  activeTab,
}: Props) {
  return (
    <View
      style={
        styles.container
      }
    >
      {NAV_ITEMS.map(
        item => {
          const active =
            item.key ===
            activeTab;

          return (
            <Pressable
              key={
                item.key
              }
              onPress={() => {
                if (
                  active
                ) {
                  return;
                }

                router.replace(
                  item.route as never
                );
              }}
              style={({ pressed }) => [
                styles.navItem,

                pressed &&
                  !active &&
                  styles.navItemPressed,
              ]}
            >
              {/* ==============================================
                  ACTIVE INDICATOR
              ============================================== */}

              <View
                style={[
                  styles.activeLine,

                  active &&
                    styles.activeLineVisible,
                ]}
              />

              {/* ==============================================
                  ICON
              ============================================== */}

              <MaterialIcons
                name={
                  item.icon
                }
                size={25}
                color={
                  active
                    ? COLORS.white
                    : COLORS.muted
                }
              />

              {/* ==============================================
                  LABEL
              ============================================== */}

              <Text
                numberOfLines={1}
                style={[
                  styles.label,

                  active &&
                    styles.activeLabel,
                ]}
              >
                {
                  item.label
                }
              </Text>
            </Pressable>
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
    container: {
      height:
        78,

      flexDirection:
        'row',

      alignItems:
        'stretch',

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,
    },

    navItem: {
      flex:
        1,

      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingTop:
        7,

      paddingHorizontal:
        2,
    },

    navItemPressed: {
      opacity:
        0.65,
    },

    activeLine: {
      position:
        'absolute',

      top:
        -1,

      width:
        34,

      height:
        3,

      borderRadius:
        3,

      backgroundColor:
        'transparent',
    },

    activeLineVisible: {
      backgroundColor:
        COLORS.red,
    },

    label: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        9,

      textAlign:
        'center',
    },

    activeLabel: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },
  });