import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  router,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';

import {
  clearAdminSession,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// IPAD PRO LANDSCAPE
// ============================================================

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

// ============================================================
// COLORS
//
// MATCHED TO DASHBOARD / APPLICATIONS / LOG TRAILS
// ============================================================

const COLORS = {
  outer:
    '#02040A',

  navy:
    '#050B19',

  card:
    '#091126',

  cardLight:
    '#101A35',

  border:
    '#243554',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  text:
    '#F7F8FC',

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  overlay:
    'rgba(0,0,0,0.74)',

  cancel:
    '#101A35',
};

// ============================================================
// TYPES
// ============================================================

type AdminProfile = {
  id?: string;

  email?: string;

  first_name?: string;

  middle_name?: string | null;

  last_name?: string;

  suffix?: string | null;

  role?: string;
};

// ============================================================
// SCREEN
// ============================================================

export default function AdminSettingsScreen() {
  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // RESPONSIVE TABLET FRAME
  // ==========================================================

  const tablet =
    useMemo(
      () => {
        if (
          Platform.OS !==
          'web'
        ) {
          return {
            width,
            height,

            scale:
              Math.min(
                width /
                  DESIGN_WIDTH,

                height /
                  DESIGN_HEIGHT
              ),
          };
        }

        const padding =
          24;

        const availableWidth =
          Math.max(
            width -
              padding * 2,

            320
          );

        const availableHeight =
          Math.max(
            height -
              padding * 2,

            320
          );

        const scale =
          Math.min(
            availableWidth /
              DESIGN_WIDTH,

            availableHeight /
              DESIGN_HEIGHT,

            1
          );

        return {
          width:
            DESIGN_WIDTH *
            scale,

          height:
            DESIGN_HEIGHT *
            scale,

          scale,
        };
      },
      [
        width,
        height,
      ]
    );

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    logoutVisible,
    setLogoutVisible,
  ] =
    useState(
      false
    );

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(
      false
    );

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(
    () => {
      loadProfile();
    },
    []
  );

  async function loadProfile() {
    try {
      const savedProfile =
        await getAdminProfile();

      if (
        !savedProfile ||
        savedProfile.role !==
          'admin'
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      setProfile(
        savedProfile
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN SETTINGS ERROR:',
        error
      );

      await clearAdminSession();

      router.replace(
        '/'
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  // ==========================================================
  // ADMIN NAME
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.middle_name,
      profile?.last_name,
      profile?.suffix,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(0)
      .toUpperCase();

  // ==========================================================
  // LOGOUT
  // ==========================================================

  function openLogout() {
    if (
      loggingOut
    ) {
      return;
    }

    setLogoutVisible(
      true
    );
  }

  function cancelLogout() {
    if (
      loggingOut
    ) {
      return;
    }

    setLogoutVisible(
      false
    );
  }

  async function confirmLogout() {
    if (
      loggingOut
    ) {
      return;
    }

    try {
      setLoggingOut(
        true
      );

      await clearAdminSession();

      setLogoutVisible(
        false
      );

      router.replace(
        '/'
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN LOGOUT ERROR:',
        error
      );
    } finally {
      setLoggingOut(
        false
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.redBright
          }
        />
      </View>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.outer
      }
    >
      <View
        style={[
          styles.ipadCanvas,

          {
            width:
              tablet.width,

            height:
              tablet.height,
          },

          Platform.OS !==
            'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar
          style="light"
        />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={
            styles.gradient
          }
        >
          <SafeAreaView
            style={
              styles.safeArea
            }
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <View
              style={[
                styles.header,

                {
                  height:
                    96 * s,

                  paddingHorizontal:
                    48 * s,
                },
              ]}
            >
              {/* ================================================
                  BRAND
              ================================================ */}

              <Pressable
                style={({ pressed }) => [
                  styles.brandArea,

                  pressed &&
                    styles.headerPressed,
                ]}
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <View
                  style={[
                    styles.logoCircle,

                    {
                      width:
                        52 * s,

                      height:
                        52 * s,

                      borderRadius:
                        26 * s,
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/hemo-hero-logo.png')}
                    style={{
                      width:
                        46 * s,

                      height:
                        46 * s,
                    }}
                    resizeMode="contain"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.brand,

                      {
                        fontSize:
                          27 * s,
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
                          9 * s,

                        letterSpacing:
                          1.6 * s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              {/* ================================================
                  ADMIN AREA
              ================================================ */}

              <View
                style={
                  styles.adminSection
                }
              >
                {/* ==============================================
                    NOTIFICATION
                ============================================== */}

                <Pressable
                  style={({ pressed }) => [
                    styles.notificationWrap,

                    pressed &&
                      styles.headerPressed,
                  ]}
                  onPress={() => {
                    console.log(
                      'Admin notifications'
                    );
                  }}
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={
                      24 * s
                    }
                    color={
                      COLORS.white
                    }
                  />

                  <View
                    style={[
                      styles.notificationBadge,

                      {
                        minWidth:
                          18 * s,

                        height:
                          18 * s,

                        borderRadius:
                          9 * s,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.notificationBadgeText,

                        {
                          fontSize:
                            9 * s,
                        },
                      ]}
                    >
                      3
                    </Text>
                  </View>
                </Pressable>

                {/* ==============================================
                    AVATAR
                ============================================== */}

                <View
                  style={[
                    styles.avatar,

                    {
                      width:
                        48 * s,

                      height:
                        48 * s,

                      borderRadius:
                        24 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,

                      {
                        fontSize:
                          15 * s,
                      },
                    ]}
                  >
                    {
                      adminInitial
                    }
                  </Text>
                </View>

                {/* ==============================================
                    ADMIN INFO
                ============================================== */}

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
                          12 * s,
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
                          10 * s,
                      },
                    ]}
                  >
                    Admin
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
              style={
                styles.scroll
              }
              contentContainerStyle={[
                styles.content,

                {
                  paddingHorizontal:
                    48 * s,

                  paddingTop:
                    32 * s,

                  paddingBottom:
                    30 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* ================================================
                  TITLE
              ================================================ */}

              <View
                style={{
                  marginBottom:
                    28 * s,
                }}
              >
                <Text
                  style={[
                    styles.title,

                    {
                      fontSize:
                        32 * s,

                      lineHeight:
                        40 * s,
                    },
                  ]}
                >
                  Settings
                </Text>

                <Text
                  style={[
                    styles.subtitle,

                    {
                      marginTop:
                        4 * s,

                      fontSize:
                        13 * s,
                    },
                  ]}
                >
                  Manage your administrator account and portal preferences.
                </Text>
              </View>

              {/* ================================================
                  ACCOUNT
              ================================================ */}

              <Text
                style={[
                  styles.sectionLabel,

                  {
                    fontSize:
                      10 * s,

                    marginBottom:
                      10 * s,
                  },
                ]}
              >
                ACCOUNT
              </Text>

              <View
                style={[
                  styles.card,

                  {
                    minHeight:
                      120 * s,

                    paddingHorizontal:
                      24 * s,

                    borderRadius:
                      14 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.profileRow
                  }
                >
                  <View
                    style={[
                      styles.profileAvatar,

                      {
                        width:
                          62 * s,

                        height:
                          62 * s,

                        borderRadius:
                          31 * s,

                        marginRight:
                          18 * s,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.profileAvatarText,

                        {
                          fontSize:
                            20 * s,
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
                      styles.profileBody
                    }
                  >
                    <Text
                      style={[
                        styles.profileName,

                        {
                          fontSize:
                            16 * s,
                        },
                      ]}
                    >
                      {
                        adminName
                      }
                    </Text>

                    <Text
                      style={[
                        styles.profileEmail,

                        {
                          fontSize:
                            11 * s,

                          marginTop:
                            3 * s,
                        },
                      ]}
                    >
                      {
                        profile?.email ||
                        'Administrator account'
                      }
                    </Text>

                    <View
                      style={[
                        styles.roleBadge,

                        {
                          marginTop:
                            8 * s,

                          paddingHorizontal:
                            10 * s,

                          paddingVertical:
                            4 * s,

                          borderRadius:
                            10 * s,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,

                          {
                            fontSize:
                              8 * s,
                          },
                        ]}
                      >
                        ADMINISTRATOR
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ================================================
                  TWO COLUMN SETTINGS
              ================================================ */}

              <View
                style={[
                  styles.columns,

                  {
                    gap:
                      20 * s,
                  },
                ]}
              >
                {/* ==============================================
                    SECURITY
                ============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <Text
                    style={[
                      styles.sectionLabel,

                      {
                        fontSize:
                          10 * s,

                        marginBottom:
                          10 * s,
                      },
                    ]}
                  >
                    SECURITY
                  </Text>

                  <View
                    style={[
                      styles.card,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          22 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      icon="lock-outline"
                      title="Change Password"
                      description="Update the password used to access the Admin Portal."
                      onPress={() => {
                        console.log(
                          'Change Password'
                        );
                      }}
                    />

                    <View
                      style={
                        styles.divider
                      }
                    />

                    <SettingsRow
                      scale={
                        s
                      }
                      icon="security"
                      title="Account Security"
                      description="Review administrator account and session security."
                      onPress={() => {
                        console.log(
                          'Account Security'
                        );
                      }}
                    />
                  </View>
                </View>

                {/* ==============================================
                    SYSTEM
                ============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <Text
                    style={[
                      styles.sectionLabel,

                      {
                        fontSize:
                          10 * s,

                        marginBottom:
                          10 * s,
                      },
                    ]}
                  >
                    SYSTEM
                  </Text>

                  <View
                    style={[
                      styles.card,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          22 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      icon="notifications-none"
                      title="Notification Preferences"
                      description="Manage alerts shown in the Admin Portal."
                      onPress={() => {
                        console.log(
                          'Notification Preferences'
                        );
                      }}
                    />

                    <View
                      style={
                        styles.divider
                      }
                    />

                    <SettingsRow
                      scale={
                        s
                      }
                      icon="tune"
                      title="Application Settings"
                      description="Configure general Hemo-Hero administration options."
                      onPress={() => {
                        console.log(
                          'Application Settings'
                        );
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* ================================================
                  ACCOUNT ACTIONS
              ================================================ */}

              <Text
                style={[
                  styles.sectionLabel,

                  {
                    fontSize:
                      10 * s,

                    marginTop:
                      26 * s,

                    marginBottom:
                      10 * s,
                  },
                ]}
              >
                ACCOUNT ACTIONS
              </Text>

              <View
                style={[
                  styles.signOutCard,

                  {
                    minHeight:
                      96 * s,

                    paddingHorizontal:
                      24 * s,

                    borderRadius:
                      14 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.signOutInfo
                  }
                >
                  <Text
                    style={[
                      styles.signOutTitle,

                      {
                        fontSize:
                          14 * s,
                      },
                    ]}
                  >
                    Sign Out
                  </Text>

                  <Text
                    style={[
                      styles.signOutDescription,

                      {
                        fontSize:
                          11 * s,

                        marginTop:
                          4 * s,
                      },
                    ]}
                  >
                    End your current administrator session.
                  </Text>
                </View>

                <Pressable
                  onPress={
                    openLogout
                  }
                  style={({ pressed }) => [
                    styles.signOutButton,

                    {
                      height:
                        46 * s,

                      minWidth:
                        135 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.signOutPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.signOutButtonText,

                      {
                        fontSize:
                          12 * s,
                      },
                    ]}
                  >
                    Sign Out
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* ==================================================
                SHARED BOTTOM NAV
            ================================================== */}

            <AdminBottomNav
              activeTab="settings"
            />
          </SafeAreaView>
        </LinearGradient>

        {/* ====================================================
            LOGOUT CONFIRMATION
        ==================================================== */}

        <Modal
          visible={
            logoutVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={
            cancelLogout
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFill
              }
              disabled={
                loggingOut
              }
              onPress={
                cancelLogout
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    430 * s,

                  paddingHorizontal:
                    30 * s,

                  paddingTop:
                    30 * s,

                  paddingBottom:
                    26 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      22 * s,
                  },
                ]}
              >
                Sign Out?
              </Text>

              <Text
                style={[
                  styles.modalMessage,

                  {
                    marginTop:
                      10 * s,

                    fontSize:
                      12 * s,

                    lineHeight:
                      20 * s,
                  },
                ]}
              >
                Are you sure you want to sign out of the Hemo-Hero Admin Portal?
              </Text>

              <View
                style={[
                  styles.modalButtons,

                  {
                    gap:
                      12 * s,

                    marginTop:
                      26 * s,
                  },
                ]}
              >
                {/* ============================================
                    CANCEL
                ============================================ */}

                <Pressable
                  disabled={
                    loggingOut
                  }
                  onPress={
                    cancelLogout
                  }
                  style={({ pressed }) => [
                    styles.cancelButton,

                    {
                      height:
                        50 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.modalPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelText,

                      {
                        fontSize:
                          12 * s,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                {/* ============================================
                    SIGN OUT
                ============================================ */}

                <Pressable
                  disabled={
                    loggingOut
                  }
                  onPress={
                    confirmLogout
                  }
                  style={({ pressed }) => [
                    styles.confirmButton,

                    {
                      height:
                        50 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.modalPressed,

                    loggingOut &&
                      styles.disabled,
                  ]}
                >
                  {loggingOut ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.confirmText,

                        {
                          fontSize:
                            12 * s,
                        },
                      ]}
                    >
                      Sign Out
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// ============================================================
// SETTINGS ROW
// ============================================================

function SettingsRow({
  scale,
  icon,
  title,
  description,
  onPress,
}: {
  scale: number;

  icon:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  title: string;

  description: string;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({ pressed }) => [
        styles.settingsRow,

        {
          minHeight:
            88 * scale,
        },

        pressed &&
          styles.settingsRowPressed,
      ]}
    >
      <View
        style={[
          styles.settingsIcon,

          {
            width:
              44 * scale,

            height:
              44 * scale,

            borderRadius:
              11 * scale,

            marginRight:
              14 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={
            icon
          }
          size={
            24 * scale
          }
          color={
            COLORS.redBright
          }
        />
      </View>

      <View
        style={
          styles.settingsText
        }
      >
        <Text
          style={[
            styles.settingsTitle,

            {
              fontSize:
                12 * scale,
            },
          ]}
        >
          {
            title
          }
        </Text>

        <Text
          style={[
            styles.settingsDescription,

            {
              marginTop:
                4 * scale,

              fontSize:
                10 * scale,

              lineHeight:
                15 * scale,
            },
          ]}
        >
          {
            description
          }
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={
          24 * scale
        }
        color={
          COLORS.muted
        }
      />
    </Pressable>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // DEVICE
    // ========================================================

    outer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    ipadCanvas: {
      overflow:
        'hidden',

      backgroundColor:
        COLORS.navy,

      borderRadius:
        Platform.OS ===
          'web'
          ? 24
          : 0,
    },

    nativeCanvas: {
      width:
        '100%',

      height:
        '100%',
    },

    gradient: {
      flex:
        1,
    },

    safeArea: {
      flex:
        1,
    },

    loadingScreen: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

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

      backgroundColor:
        COLORS.white,

      overflow:
        'hidden',
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
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',

      marginTop:
        1,
    },

    // ========================================================
    // ADMIN AREA
    // ========================================================

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    notificationWrap: {
      marginRight:
        4,

      position:
        'relative',

      width:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBadge: {
      position:
        'absolute',

      top:
        -4,

      right:
        -6,

      paddingHorizontal:
        4,

      backgroundColor:
        COLORS.redBright,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',
    },

    headerPressed: {
      opacity:
        0.68,
    },

    avatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ECECEC',
    },

    avatarText: {
      color:
        '#111111',

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminInfo: {
      minWidth:
        90,
    },

    adminName: {
      maxWidth:
        190,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // CONTENT
    // ========================================================

    scroll: {
      flex:
        1,
    },

    content: {
      flexGrow:
        1,
    },

    title: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    subtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // SECTIONS
    // ========================================================

    sectionLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        1,
    },

    card: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    // ========================================================
    // PROFILE
    // ========================================================

    profileRow: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    profileAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ECECEC',
    },

    profileAvatarText: {
      color:
        '#111111',

      fontFamily:
        'Poppins_600SemiBold',
    },

    profileBody: {
      flex:
        1,
    },

    profileName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    profileEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    roleBadge: {
      alignSelf:
        'flex-start',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.35)',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    roleBadgeText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.5,
    },

    // ========================================================
    // COLUMNS
    // ========================================================

    columns: {
      flexDirection:
        'row',
    },

    column: {
      flex:
        1,
    },

    divider: {
      height:
        1,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // SETTINGS ROW
    // ========================================================

    settingsRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    settingsRowPressed: {
      opacity:
        0.66,

      backgroundColor:
        'rgba(255,255,255,0.02)',
    },

    settingsIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.24)',

      backgroundColor:
        'rgba(239,51,64,0.09)',
    },

    settingsText: {
      flex:
        1,

      paddingRight:
        12,
    },

    settingsTitle: {
      color:
        COLORS.text,

      fontFamily:
        'Inter_600SemiBold',
    },

    settingsDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // SIGN OUT CARD
    // ========================================================

    signOutCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.40)',

      backgroundColor:
        'rgba(65,17,31,0.55)',
    },

    signOutInfo: {
      flex:
        1,
    },

    signOutTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    signOutDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    signOutButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.58)',

      backgroundColor:
        COLORS.red,
    },

    signOutPressed: {
      opacity:
        0.8,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    signOutButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // LOGOUT MODAL
    // ========================================================

    modalOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.overlay,
    },

    modalCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          12,
      },

      shadowOpacity:
        0.4,

      shadowRadius:
        28,

      elevation:
        20,
    },

    modalTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      textAlign:
        'center',
    },

    modalMessage: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    modalButtons: {
      flexDirection:
        'row',
    },

    cancelButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cancel,
    },

    confirmButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    cancelText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    confirmText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    modalPressed: {
      opacity:
        0.8,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity:
        0.55,
    },
  });