import {
  Image,
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

import {
  type AdminProfile,
} from '../lib/api';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  cardLight:
    '#101A35',

  border:
    '#243554',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',
};

// ============================================================
// TYPES
// ============================================================

type AdminHeaderProps = {
  profile:
    AdminProfile | null;

  scale:
    number;

  fontScale:
    number;

  notificationCount?:
    number;

  onNotificationPress?:
    () => void;
};

// ============================================================
// HEADER
// ============================================================

export default function AdminHeader({
  profile,
  scale,
  fontScale,
  notificationCount = 0,
  onNotificationPress,
}: AdminHeaderProps) {
  // ==========================================================
  // ADMIN NAME
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(0)
      .toUpperCase();

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  function handleNotificationPress() {
    if (
      onNotificationPress
    ) {
      onNotificationPress();

      return;
    }

    // Keep the bell functional without routing to a screen
    // that may not exist yet.
    console.log(
      'Admin notifications'
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={[
        styles.header,

        {
          height:
            96 * scale,

          paddingHorizontal:
            48 * scale,
        },
      ]}
    >
      {/* ======================================================
          BRAND
      ====================================================== */}

      <Pressable
        onPress={() =>
          router.replace(
            '/dashboard'
          )
        }
        style={({
          pressed,
        }) => [
          styles.brandArea,

          pressed &&
            styles.pressed,
        ]}
      >
        <View
          style={[
            styles.logoCircle,

            {
              width:
                52 * scale,

              height:
                52 * scale,

              borderRadius:
                26 * scale,
            },
          ]}
        >
          <Image
            source={require('../assets/images/hemo-hero-logo.png')}
            resizeMode="contain"
            style={{
              width:
                46 * scale,

              height:
                46 * scale,
            }}
          />
        </View>

        <View>
          <Text
            style={[
              styles.brand,

              {
                fontSize:
                  26 * fontScale,

                lineHeight:
                  31 * fontScale,
              },
            ]}
          >
            <Text
              style={
                styles.brandRed
              }
            >
              Hemo-
            </Text>

            Hero
          </Text>

          <Text
            style={[
              styles.portal,

              {
                fontSize:
                  11 * fontScale,

                lineHeight:
                  15 * fontScale,

                letterSpacing:
                  1.4 * scale,
              },
            ]}
          >
            ADMIN PORTAL
          </Text>
        </View>
      </Pressable>

      {/* ======================================================
          RIGHT SIDE
      ====================================================== */}

      <View
        style={[
          styles.rightSection,

          {
            gap:
              18 * scale,
          },
        ]}
      >
        {/* ====================================================
            NOTIFICATION BELL

            This bell stays in EVERY Admin header.
        ==================================================== */}

        <Pressable
          onPress={
            handleNotificationPress
          }
          style={({
            pressed,
          }) => [
            styles.notificationButton,

            {
              width:
                46 * scale,

              height:
                46 * scale,

              borderRadius:
                23 * scale,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <MaterialIcons
            name="notifications-none"
            size={
              24 * scale
            }
            color={
              COLORS.white
            }
          />

          {notificationCount >
          0 ? (
            <View
              style={[
                styles.notificationBadge,

                {
                  minWidth:
                    18 * scale,

                  height:
                    18 * scale,

                  borderRadius:
                    9 * scale,

                  paddingHorizontal:
                    4 * scale,
                },
              ]}
            >
              <Text
                style={[
                  styles.notificationBadgeText,

                  {
                    fontSize:
                      10 * fontScale,
                  },
                ]}
              >
                {notificationCount >
                99
                  ? '99+'
                  : notificationCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* ====================================================
            DIVIDER
        ==================================================== */}

        <View
          style={[
            styles.divider,

            {
              height:
                36 * scale,
            },
          ]}
        />

        {/* ====================================================
            ADMIN PROFILE
        ==================================================== */}

        <Pressable
          onPress={() =>
            router.push(
              '/settings'
            )
          }
          style={({
            pressed,
          }) => [
            styles.adminArea,

            {
              gap:
                11 * scale,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <View
            style={[
              styles.adminAvatar,

              {
                width:
                  48 * scale,

                height:
                  48 * scale,

                borderRadius:
                  24 * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.adminAvatarText,

                {
                  fontSize:
                    16 * fontScale,
                },
              ]}
            >
              {
                adminInitial
              }
            </Text>
          </View>

          <View
            style={
              styles.adminInfo
            }
          >
            <Text
              numberOfLines={
                1
              }
              style={[
                styles.adminName,

                {
                  fontSize:
                    14 * fontScale,

                  lineHeight:
                    19 * fontScale,
                },
              ]}
            >
              {
                adminName
              }
            </Text>

            <Text
              style={[
                styles.adminRole,

                {
                  fontSize:
                    12 * fontScale,

                  lineHeight:
                    17 * fontScale,
                },
              ]}
            >
              Admin
            </Text>
          </View>

          <MaterialIcons
            name="keyboard-arrow-down"
            size={
              20 * scale
            }
            color={
              COLORS.muted
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    // ========================================================
    // BRAND
    // ========================================================

    brandArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.white,
    },

    brand: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portal: {
      marginTop:
        1,

      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // RIGHT
    // ========================================================

    rightSection: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    // ========================================================
    // NOTIFICATION
    // ========================================================

    notificationButton: {
      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    notificationBadge: {
      position:
        'absolute',

      top:
        -3,

      right:
        -3,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        2,

      borderColor:
        '#050B19',

      backgroundColor:
        COLORS.redBright,
    },

    notificationBadgeText: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Inter_700Bold',
    },

    divider: {
      width:
        1,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // ADMIN
    // ========================================================

    adminArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingVertical:
        4,
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    adminAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminInfo: {
      minWidth:
        0,
    },

    adminName: {
      maxWidth:
        175,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      marginTop:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // INTERACTION
    // ========================================================

    pressed: {
      opacity:
        0.76,
    },
  });