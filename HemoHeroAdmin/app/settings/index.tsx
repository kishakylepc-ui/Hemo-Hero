import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
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
import AdminHeader from '../AdminHeader';

import {
  type AdminProfile,
} from '../../lib/api';

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

  green:
    '#35C982',

  orange:
    '#F3A34A',

  blue:
    '#6EA8FE',

  overlay:
    'rgba(0,0,0,0.76)',
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

  const fs =
    Math.max(
      tablet.scale,
      0.92
    );

  // ==========================================================
  // PROFILE
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

  // ==========================================================
  // NOTIFICATION PREFERENCES
  // ==========================================================

  const [
    donorApplicationAlerts,
    setDonorApplicationAlerts,
  ] =
    useState(
      true
    );

  const [
    bloodRequestAlerts,
    setBloodRequestAlerts,
  ] =
    useState(
      true
    );

  const [
    userAccountAlerts,
    setUserAccountAlerts,
  ] =
    useState(
      true
    );

  const [
    securityAlerts,
    setSecurityAlerts,
  ] =
    useState(
      true
    );

  // ==========================================================
  // MODALS
  // ==========================================================

  const [
    profileModalVisible,
    setProfileModalVisible,
  ] =
    useState(
      false
    );

  const [
    securityModalVisible,
    setSecurityModalVisible,
  ] =
    useState(
      false
    );

  const [
    sessionModalVisible,
    setSessionModalVisible,
  ] =
    useState(
      false
    );

  const [
    aboutModalVisible,
    setAboutModalVisible,
  ] =
    useState(
      false
    );

  const [
    passwordModalVisible,
    setPasswordModalVisible,
  ] =
    useState(
      false
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
  // ADMIN DISPLAY
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
      .charAt(
        0
      )
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

        <Text
          style={[
            styles.loadingText,

            {
              fontSize:
                13 * fs,

              marginTop:
                14 * s,
            },
          ]}
        >
          Loading settings...
        </Text>
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

            <AdminHeader
              profile={
                profile
              }
              scale={
                s
              }
              fontScale={
                fs
              }
              notificationCount={
                0
              }
            />

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
                    30 * s,

                  paddingBottom:
                    36 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* =================================================
                  PAGE TITLE
              ================================================= */}

              <View
                style={{
                  marginBottom:
                    24 * s,
                }}
              >
                <Text
                  style={[
                    styles.pageTitle,

                    {
                      fontSize:
                        30 * fs,

                      lineHeight:
                        38 * fs,
                    },
                  ]}
                >
                  Settings
                </Text>

                <Text
                  style={[
                    styles.pageSubtitle,

                    {
                      fontSize:
                        14 * fs,

                      marginTop:
                        4 * s,
                    },
                  ]}
                >
                  Manage administrator account settings, security, notifications, and portal preferences.
                </Text>
              </View>

              {/* =================================================
                  ADMINISTRATOR ACCOUNT
              ================================================= */}

              <SectionLabel
                scale={
                  s
                }
                fontScale={
                  fs
                }
              >
                ADMINISTRATOR ACCOUNT
              </SectionLabel>

              <View
                style={[
                  styles.profileCard,

                  {
                    padding:
                      22 * s,

                    borderRadius:
                      15 * s,

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
                    style={
                      styles.profileLeft
                    }
                  >
                    <View
                      style={[
                        styles.profileAvatar,

                        {
                          width:
                            68 * s,

                          height:
                            68 * s,

                          borderRadius:
                            34 * s,

                          marginRight:
                            17 * s,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileAvatarText,

                          {
                            fontSize:
                              21 * fs,
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
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.profileName,

                          {
                            fontSize:
                              18 * fs,
                          },
                        ]}
                      >
                        {
                          adminName
                        }
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.profileEmail,

                          {
                            fontSize:
                              12.5 * fs,

                            marginTop:
                              3 * s,
                          },
                        ]}
                      >
                        {profile?.email ||
                          'Administrator account'}
                      </Text>

                      <View
                        style={[
                          styles.profileBadges,

                          {
                            gap:
                              8 * s,

                            marginTop:
                              9 * s,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.adminBadge,

                            {
                              paddingHorizontal:
                                10 * s,

                              paddingVertical:
                                5 * s,

                              borderRadius:
                                9 * s,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="admin-panel-settings"
                            size={
                              13 * s
                            }
                            color={
                              COLORS.redBright
                            }
                          />

                          <Text
                            style={[
                              styles.adminBadgeText,

                              {
                                fontSize:
                                  10.5 * fs,
                              },
                            ]}
                          >
                            ADMINISTRATOR
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.activeBadge,

                            {
                              paddingHorizontal:
                                10 * s,

                              paddingVertical:
                                5 * s,

                              borderRadius:
                                9 * s,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.activeDot,

                              {
                                width:
                                  6 * s,

                                height:
                                  6 * s,

                                borderRadius:
                                  3 * s,
                              },
                            ]}
                          />

                          <Text
                            style={[
                              styles.activeBadgeText,

                              {
                                fontSize:
                                  10.5 * fs,
                              },
                            ]}
                          >
                            ACTIVE SESSION
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() =>
                      setProfileModalVisible(
                        true
                      )
                    }
                    style={({ pressed }) => [
                      styles.profileButton,

                      {
                        height:
                          42 * s,

                        paddingHorizontal:
                          15 * s,

                        borderRadius:
                          9 * s,

                        gap:
                          7 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="person-outline"
                      size={
                        18 * s
                      }
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={[
                        styles.profileButtonText,

                        {
                          fontSize:
                            12 * fs,
                        },
                      ]}
                    >
                      View Profile
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* =================================================
                  ACCOUNT + SECURITY
              ================================================= */}

              <View
                style={[
                  styles.twoColumns,

                  {
                    gap:
                      20 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                {/* ===============================================
                    ACCOUNT & PROFILE
                =============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <SectionLabel
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                  >
                    ACCOUNT & PROFILE
                  </SectionLabel>

                  <View
                    style={[
                      styles.settingsCard,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          20 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="person-outline"
                      title="Administrator Profile"
                      description="View the administrator name, email address, and assigned role."
                      onPress={() =>
                        setProfileModalVisible(
                          true
                        )
                      }
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="lock-outline"
                      title="Change Password"
                      description="Update the password used to sign in to the Admin Portal."
                      status="Setup required"
                      onPress={() =>
                        setPasswordModalVisible(
                          true
                        )
                      }
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="badge"
                      title="Account Role"
                      description="Administrator permissions and account access level."
                      value="Admin"
                    />
                  </View>
                </View>

                {/* ===============================================
                    SECURITY & SESSIONS
                =============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <SectionLabel
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                  >
                    SECURITY & SESSIONS
                  </SectionLabel>

                  <View
                    style={[
                      styles.settingsCard,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          20 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="security"
                      title="Account Security"
                      description="Review administrator security recommendations and access information."
                      onPress={() =>
                        setSecurityModalVisible(
                          true
                        )
                      }
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="devices"
                      title="Current Session"
                      description="View information about the currently authenticated admin session."
                      value="Active"
                      valueColor={
                        COLORS.green
                      }
                      onPress={() =>
                        setSessionModalVisible(
                          true
                        )
                      }
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="history"
                      title="Audit & Log Trails"
                      description="Review administrator actions and recorded system activity."
                      onPress={() =>
                        router.push(
                          '/activity-logs' as any
                        )
                      }
                    />
                  </View>
                </View>
              </View>

              {/* =================================================
                  NOTIFICATIONS
              ================================================= */}

              <SectionLabel
                scale={
                  s
                }
                fontScale={
                  fs
                }
              >
                NOTIFICATIONS
              </SectionLabel>

              <View
                style={[
                  styles.notificationCard,

                  {
                    padding:
                      20 * s,

                    borderRadius:
                      14 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sectionIntro,

                    {
                      marginBottom:
                        14 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sectionIntroIcon,

                      {
                        width:
                          38 * s,

                        height:
                          38 * s,

                        borderRadius:
                          10 * s,

                        marginRight:
                          11 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="notifications-none"
                      size={
                        20 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.sectionIntroText
                    }
                  >
                    <Text
                      style={[
                        styles.sectionIntroTitle,

                        {
                          fontSize:
                            14 * fs,
                        },
                      ]}
                    >
                      Admin Notification Preferences
                    </Text>

                    <Text
                      style={[
                        styles.sectionIntroDescription,

                        {
                          fontSize:
                            11.5 * fs,

                          lineHeight:
                            17 * fs,

                          marginTop:
                            2 * s,
                        },
                      ]}
                    >
                      Choose which important activities should be highlighted to administrators.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.preferenceGrid,

                    {
                      gap:
                        12 * s,
                    },
                  ]}
                >
                  <PreferenceTile
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                    icon="assignment"
                    title="Donor Applications"
                    description="New applications and application status activity."
                    value={
                      donorApplicationAlerts
                    }
                    onChange={
                      setDonorApplicationAlerts
                    }
                  />

                  <PreferenceTile
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                    icon="bloodtype"
                    title="Blood Requests"
                    description="New requests and important request updates."
                    value={
                      bloodRequestAlerts
                    }
                    onChange={
                      setBloodRequestAlerts
                    }
                  />

                  <PreferenceTile
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                    icon="manage-accounts"
                    title="User Account Activity"
                    description="Important changes involving registered user accounts."
                    value={
                      userAccountAlerts
                    }
                    onChange={
                      setUserAccountAlerts
                    }
                  />

                  <PreferenceTile
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                    icon="verified-user"
                    title="Security Alerts"
                    description="Security-related and administrator account notices."
                    value={
                      securityAlerts
                    }
                    onChange={
                      setSecurityAlerts
                    }
                  />
                </View>

                <View
                  style={[
                    styles.preferenceNotice,

                    {
                      padding:
                        11 * s,

                      borderRadius:
                        9 * s,

                      marginTop:
                        14 * s,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={
                      17 * s
                    }
                    color={
                      COLORS.blue
                    }
                  />

                  <Text
                    style={[
                      styles.preferenceNoticeText,

                      {
                        fontSize:
                          10.5 * fs,

                        lineHeight:
                          16 * fs,
                      },
                    ]}
                  >
                    These switches currently control the Admin Portal interface only. Server-saved notification preferences can be connected later.
                  </Text>
                </View>
              </View>

              {/* =================================================
                  SYSTEM + DATA
              ================================================= */}

              <View
                style={[
                  styles.twoColumns,

                  {
                    gap:
                      20 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                {/* ===============================================
                    SYSTEM PREFERENCES
                =============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <SectionLabel
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                  >
                    SYSTEM PREFERENCES
                  </SectionLabel>

                  <View
                    style={[
                      styles.settingsCard,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          20 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="dark-mode"
                      title="Appearance"
                      description="Visual theme used by the Hemo-Hero Admin Portal."
                      value="Dark"
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="dashboard"
                      title="Default Landing Page"
                      description="The first page shown after administrator sign-in."
                      value="Dashboard"
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="format-list-numbered"
                      title="Records Per Page"
                      description="Default number of records displayed in management tables."
                      value="12"
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="schedule"
                      title="Date & Time"
                      description="Date and time values follow the device and system locale."
                      value="System"
                    />
                  </View>
                </View>

                {/* ===============================================
                    DATA & RECORDS
                =============================================== */}

                <View
                  style={
                    styles.column
                  }
                >
                  <SectionLabel
                    scale={
                      s
                    }
                    fontScale={
                      fs
                    }
                  >
                    DATA & RECORDS
                  </SectionLabel>

                  <View
                    style={[
                      styles.settingsCard,

                      {
                        borderRadius:
                          14 * s,

                        paddingHorizontal:
                          20 * s,
                      },
                    ]}
                  >
                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="history"
                      title="System Log Trails"
                      description="View activity records created by administrator and system actions."
                      onPress={() =>
                        router.push(
                          '/activity-logs' as any
                        )
                      }
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="file-download"
                      title="Report Exports"
                      description="Export administrative reports and system records."
                      status="Not configured"
                    />

                    <Divider />

                    <SettingsRow
                      scale={
                        s
                      }
                      fontScale={
                        fs
                      }
                      icon="storage"
                      title="Data Management"
                      description="Application data is managed by the Hemo-Hero backend and database."
                      value="System"
                    />
                  </View>
                </View>
              </View>

              {/* =================================================
                  ABOUT
              ================================================= */}

              <SectionLabel
                scale={
                  s
                }
                fontScale={
                  fs
                }
              >
                ABOUT
              </SectionLabel>

              <View
                style={[
                  styles.aboutCard,

                  {
                    padding:
                      20 * s,

                    borderRadius:
                      14 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.aboutLeft
                  }
                >
                  <View
                    style={[
                      styles.aboutIcon,

                      {
                        width:
                          46 * s,

                        height:
                          46 * s,

                        borderRadius:
                          12 * s,

                        marginRight:
                          14 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={
                        24 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.aboutText
                    }
                  >
                    <Text
                      style={[
                        styles.aboutTitle,

                        {
                          fontSize:
                            14 * fs,
                        },
                      ]}
                    >
                      Hemo-Hero Admin Portal
                    </Text>

                    <Text
                      style={[
                        styles.aboutDescription,

                        {
                          fontSize:
                            11.5 * fs,

                          lineHeight:
                            17 * fs,

                          marginTop:
                            3 * s,
                        },
                      ]}
                    >
                      Administrative interface for managing users, donor applications, blood requests, and system records.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    setAboutModalVisible(
                      true
                    )
                  }
                  style={({ pressed }) => [
                    styles.aboutButton,

                    {
                      height:
                        40 * s,

                      paddingHorizontal:
                        14 * s,

                      borderRadius:
                        9 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.aboutButtonText,

                      {
                        fontSize:
                          11.5 * fs,
                      },
                    ]}
                  >
                    Portal Info
                  </Text>

                  <MaterialIcons
                    name="chevron-right"
                    size={
                      18 * s
                    }
                    color={
                      COLORS.white
                    }
                  />
                </Pressable>
              </View>

              {/* =================================================
                  ACCOUNT ACTIONS
              ================================================= */}

              <SectionLabel
                scale={
                  s
                }
                fontScale={
                  fs
                }
              >
                ACCOUNT ACTIONS
              </SectionLabel>

              <View
                style={[
                  styles.signOutCard,

                  {
                    minHeight:
                      100 * s,

                    paddingHorizontal:
                      22 * s,

                    borderRadius:
                      14 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.signOutLeft
                  }
                >
                  <View
                    style={[
                      styles.signOutIcon,

                      {
                        width:
                          44 * s,

                        height:
                          44 * s,

                        borderRadius:
                          11 * s,

                        marginRight:
                          14 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="logout"
                      size={
                        22 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.signOutText
                    }
                  >
                    <Text
                      style={[
                        styles.signOutTitle,

                        {
                          fontSize:
                            15 * fs,
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
                            12 * fs,

                          marginTop:
                            3 * s,
                        },
                      ]}
                    >
                      End the current administrator session on this device.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={
                    openLogout
                  }
                  style={({ pressed }) => [
                    styles.signOutButton,

                    {
                      height:
                        44 * s,

                      minWidth:
                        128 * s,

                      paddingHorizontal:
                        18 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.signOutButtonText,

                      {
                        fontSize:
                          12.5 * fs,
                      },
                    ]}
                  >
                    Sign Out
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            <AdminBottomNav
              activeTab="settings"
            />
          </SafeAreaView>
        </LinearGradient>

        {/* ======================================================
            PROFILE MODAL
        ====================================================== */}

        <Modal
          visible={
            profileModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setProfileModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFillObject
              }
              onPress={() =>
                setProfileModalVisible(
                  false
                )
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    500 * s,

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="person-outline"
                color={
                  COLORS.redBright
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Administrator Profile
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      12.5 * fs,

                    lineHeight:
                      19 * fs,

                    marginTop:
                      5 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                Account information associated with the currently signed-in administrator.
              </Text>

              <View
                style={[
                  styles.infoCard,

                  {
                    borderRadius:
                      12 * s,

                    paddingHorizontal:
                      15 * s,
                  },
                ]}
              >
                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Name"
                  value={
                    adminName
                  }
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Email"
                  value={
                    profile?.email ||
                    'Unavailable'
                  }
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Role"
                  value="Administrator"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Account Status"
                  value="Active"
                  last
                />
              </View>

              <Pressable
                onPress={() =>
                  setProfileModalVisible(
                    false
                  )
                }
                style={({ pressed }) => [
                  styles.primaryModalButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      20 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.primaryModalButtonText,

                    {
                      fontSize:
                        13 * fs,
                    },
                  ]}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ======================================================
            CHANGE PASSWORD MODAL
        ====================================================== */}

        <Modal
          visible={
            passwordModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setPasswordModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFillObject
              }
              onPress={() =>
                setPasswordModalVisible(
                  false
                )
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    470 * s,

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="lock-outline"
                color={
                  COLORS.orange
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Change Password
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      12.5 * fs,

                    lineHeight:
                      20 * fs,

                    marginTop:
                      6 * s,
                  },
                ]}
              >
                Password changes are not yet connected to an administrator password-update endpoint.
              </Text>

              <View
                style={[
                  styles.warningBox,

                  {
                    padding:
                      12 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      18 * s,
                  },
                ]}
              >
                <MaterialIcons
                  name="info-outline"
                  size={
                    18 * s
                  }
                  color={
                    COLORS.orange
                  }
                />

                <Text
                  style={[
                    styles.warningText,

                    {
                      fontSize:
                        11.5 * fs,

                      lineHeight:
                        18 * fs,
                    },
                  ]}
                >
                  This setting is shown because password management is normally part of an admin portal. It can be activated once the backend endpoint is added.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setPasswordModalVisible(
                    false
                  )
                }
                style={({ pressed }) => [
                  styles.primaryModalButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      20 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.primaryModalButtonText,

                    {
                      fontSize:
                        13 * fs,
                    },
                  ]}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ======================================================
            SECURITY MODAL
        ====================================================== */}

        <Modal
          visible={
            securityModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setSecurityModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFillObject
              }
              onPress={() =>
                setSecurityModalVisible(
                  false
                )
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    500 * s,

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="security"
                color={
                  COLORS.green
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Account Security
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      12.5 * fs,

                    lineHeight:
                      19 * fs,

                    marginTop:
                      5 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                Security information for the administrator account currently using the portal.
              </Text>

              <View
                style={[
                  styles.infoCard,

                  {
                    borderRadius:
                      12 * s,

                    paddingHorizontal:
                      15 * s,
                  },
                ]}
              >
                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Access Level"
                  value="Administrator"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Session Status"
                  value="Authenticated"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Audit Logging"
                  value="Available"
                  last
                />
              </View>

              <View
                style={[
                  styles.securityTip,

                  {
                    padding:
                      12 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                <MaterialIcons
                  name="verified-user"
                  size={
                    18 * s
                  }
                  color={
                    COLORS.green
                  }
                />

                <Text
                  style={[
                    styles.securityTipText,

                    {
                      fontSize:
                        11.5 * fs,

                      lineHeight:
                        18 * fs,
                    },
                  ]}
                >
                  Use a strong administrator password and sign out when the device is shared with another person.
                </Text>
              </View>

              <View
                style={[
                  styles.modalButtonRow,

                  {
                    gap:
                      10 * s,

                    marginTop:
                      20 * s,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    setSecurityModalVisible(
                      false
                    );

                    router.push(
                      '/activity-logs' as any
                    );
                  }}
                  style={({ pressed }) => [
                    styles.secondaryModalButton,

                    {
                      height:
                        48 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <MaterialIcons
                    name="history"
                    size={
                      18 * s
                    }
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={[
                      styles.secondaryModalButtonText,

                      {
                        fontSize:
                          12 * fs,
                      },
                    ]}
                  >
                    View Log Trails
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setSecurityModalVisible(
                      false
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryModalButton,
                    styles.flexModalButton,

                    {
                      height:
                        48 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryModalButtonText,

                      {
                        fontSize:
                          12 * fs,
                      },
                    ]}
                  >
                    Close
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ======================================================
            SESSION MODAL
        ====================================================== */}

        <Modal
          visible={
            sessionModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setSessionModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFillObject
              }
              onPress={() =>
                setSessionModalVisible(
                  false
                )
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    480 * s,

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="devices"
                color={
                  COLORS.blue
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Current Session
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      12.5 * fs,

                    lineHeight:
                      19 * fs,

                    marginTop:
                      5 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                Details about the administrator session currently active on this device.
              </Text>

              <View
                style={[
                  styles.infoCard,

                  {
                    borderRadius:
                      12 * s,

                    paddingHorizontal:
                      15 * s,
                  },
                ]}
              >
                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Administrator"
                  value={
                    adminName
                  }
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Role"
                  value="Admin"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Session"
                  value="Active"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Interface"
                  value="Admin Portal"
                  last
                />
              </View>

              <Pressable
                onPress={() =>
                  setSessionModalVisible(
                    false
                  )
                }
                style={({ pressed }) => [
                  styles.primaryModalButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      20 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.primaryModalButtonText,

                    {
                      fontSize:
                        13 * fs,
                    },
                  ]}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ======================================================
            ABOUT MODAL
        ====================================================== */}

        <Modal
          visible={
            aboutModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setAboutModalVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFillObject
              }
              onPress={() =>
                setAboutModalVisible(
                  false
                )
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    500 * s,

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="bloodtype"
                color={
                  COLORS.redBright
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Hemo-Hero Admin Portal
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      12.5 * fs,

                    lineHeight:
                      20 * fs,

                    marginTop:
                      6 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                Administrative interface for managing Hemo-Hero operations and records.
              </Text>

              <View
                style={[
                  styles.infoCard,

                  {
                    borderRadius:
                      12 * s,

                    paddingHorizontal:
                      15 * s,
                  },
                ]}
              >
                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Application"
                  value="Hemo-Hero"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Portal"
                  value="Administrator"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Interface"
                  value="Tablet / Desktop"
                />

                <InfoRow
                  scale={
                    s
                  }
                  fontScale={
                    fs
                  }
                  label="Theme"
                  value="Dark"
                  last
                />
              </View>

              <Pressable
                onPress={() =>
                  setAboutModalVisible(
                    false
                  )
                }
                style={({ pressed }) => [
                  styles.primaryModalButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,

                    marginTop:
                      20 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.primaryModalButtonText,

                    {
                      fontSize:
                        13 * fs,
                    },
                  ]}
                >
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ======================================================
            LOGOUT MODAL
        ====================================================== */}

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
                StyleSheet.absoluteFillObject
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

                  maxWidth:
                    '90%',

                  padding:
                    28 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <ModalIcon
                scale={
                  s
                }
                icon="logout"
                color={
                  COLORS.redBright
                }
              />

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * fs,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                Sign Out?
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    fontSize:
                      13 * fs,

                    lineHeight:
                      20 * fs,

                    marginTop:
                      6 * s,
                  },
                ]}
              >
                Are you sure you want to sign out of the Hemo-Hero Admin Portal?
              </Text>

              <View
                style={[
                  styles.modalButtonRow,

                  {
                    gap:
                      12 * s,

                    marginTop:
                      24 * s,
                  },
                ]}
              >
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
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,

                      {
                        fontSize:
                          13 * fs,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    loggingOut
                  }
                  onPress={
                    confirmLogout
                  }
                  style={({ pressed }) => [
                    styles.logoutConfirmButton,

                    {
                      height:
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,

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
                        styles.logoutConfirmText,

                        {
                          fontSize:
                            13 * fs,
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
// SECTION LABEL
// ============================================================

function SectionLabel({
  scale,
  fontScale,
  children,
}: {
  scale:
    number;

  fontScale:
    number;

  children:
    string;
}) {
  return (
    <Text
      style={[
        styles.sectionLabel,

        {
          fontSize:
            11 * fontScale,

          marginBottom:
            10 * scale,
        },
      ]}
    >
      {
        children
      }
    </Text>
  );
}

// ============================================================
// SETTINGS ROW
// ============================================================

function SettingsRow({
  scale,
  fontScale,
  icon,
  title,
  description,
  onPress,
  value,
  valueColor,
  status,
}: {
  scale:
    number;

  fontScale:
    number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  title:
    string;

  description:
    string;

  onPress?:
    () => void;

  value?:
    string;

  valueColor?:
    string;

  status?:
    string;
}) {
  return (
    <Pressable
      disabled={
        !onPress
      }
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
              42 * scale,

            height:
              42 * scale,

            borderRadius:
              10 * scale,

            marginRight:
              13 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={
            icon
          }
          size={
            21 * scale
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
                13 * fontScale,
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
              fontSize:
                11.5 * fontScale,

              lineHeight:
                17 * fontScale,

              marginTop:
                3 * scale,
            },
          ]}
        >
          {
            description
          }
        </Text>
      </View>

      {value ? (
        <Text
          style={[
            styles.settingsValue,

            {
              fontSize:
                11.5 * fontScale,

              color:
                valueColor ||
                COLORS.soft,
            },
          ]}
        >
          {
            value
          }
        </Text>
      ) : null}

      {status ? (
        <View
          style={[
            styles.statusBadge,

            {
              paddingHorizontal:
                8 * scale,

              paddingVertical:
                5 * scale,

              borderRadius:
                8 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,

              {
                fontSize:
                  9.5 * fontScale,
              },
            ]}
          >
            {
              status
            }
          </Text>
        </View>
      ) : null}

      {onPress ? (
        <MaterialIcons
          name="chevron-right"
          size={
            22 * scale
          }
          color={
            COLORS.muted
          }
          style={{
            marginLeft:
              7 * scale,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// ============================================================
// PREFERENCE TILE
// ============================================================

function PreferenceTile({
  scale,
  fontScale,
  icon,
  title,
  description,
  value,
  onChange,
}: {
  scale:
    number;

  fontScale:
    number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  title:
    string;

  description:
    string;

  value:
    boolean;

  onChange:
    (
      value:
        boolean
    ) => void;
}) {
  return (
    <View
      style={[
        styles.preferenceTile,

        {
          minHeight:
            102 * scale,

          padding:
            15 * scale,

          borderRadius:
            12 * scale,
        },
      ]}
    >
      <View
        style={
          styles.preferenceTileTop
        }
      >
        <View
          style={[
            styles.preferenceIcon,

            {
              width:
                37 * scale,

              height:
                37 * scale,

              borderRadius:
                9 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              icon
            }
            size={
              19 * scale
            }
            color={
              COLORS.redBright
            }
          />
        </View>

        <Pressable
          onPress={() =>
            onChange(
              !value
            )
          }
          style={[
            styles.toggle,

            {
              width:
                46 * scale,

              height:
                26 * scale,

              borderRadius:
                13 * scale,

              padding:
                3 * scale,
            },

            value &&
              styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,

              {
                width:
                  20 * scale,

                height:
                  20 * scale,

                borderRadius:
                  10 * scale,

                transform: [
                  {
                    translateX:
                      value
                        ? 20 *
                          scale
                        : 0,
                  },
                ],
              },
            ]}
          />
        </Pressable>
      </View>

      <Text
        style={[
          styles.preferenceTitle,

          {
            fontSize:
              12.5 * fontScale,

            marginTop:
              9 * scale,
          },
        ]}
      >
        {
          title
        }
      </Text>

      <Text
        style={[
          styles.preferenceDescription,

          {
            fontSize:
              10.5 * fontScale,

            lineHeight:
              15 * fontScale,

            marginTop:
              3 * scale,
          },
        ]}
      >
        {
          description
        }
      </Text>
    </View>
  );
}

// ============================================================
// MODAL ICON
// ============================================================

function ModalIcon({
  scale,
  icon,
  color,
}: {
  scale:
    number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  color:
    string;
}) {
  return (
    <View
      style={[
        styles.modalIcon,

        {
          width:
            56 * scale,

          height:
            56 * scale,

          borderRadius:
            28 * scale,
        },
      ]}
    >
      <MaterialIcons
        name={
          icon
        }
        size={
          27 * scale
        }
        color={
          color
        }
      />
    </View>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  scale,
  fontScale,
  label,
  value,
  last = false,
}: {
  scale:
    number;

  fontScale:
    number;

  label:
    string;

  value:
    string;

  last?:
    boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        {
          minHeight:
            52 * scale,

          paddingVertical:
            9 * scale,
        },

        last &&
          styles.infoRowLast,
      ]}
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize:
              11.5 * fontScale,
          },
        ]}
      >
        {
          label
        }
      </Text>

      <Text
        numberOfLines={
          1
        }
        style={[
          styles.infoValue,

          {
            fontSize:
              11.5 * fontScale,
          },
        ]}
      >
        {
          value
        }
      </Text>
    </View>
  );
}

// ============================================================
// DIVIDER
// ============================================================

function Divider() {
  return (
    <View
      style={
        styles.divider
      }
    />
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

    scroll: {
      flex:
        1,
    },

    content: {
      flexGrow:
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

    loadingText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // PAGE
    // ========================================================

    pageTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    pageSubtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    sectionLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.8,
    },

    // ========================================================
    // PROFILE
    // ========================================================

    profileCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    profileRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        16,
    },

    profileLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      minWidth:
        0,
    },

    profileAvatar: {
      flexShrink:
        0,

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

      minWidth:
        0,
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

    profileBadges: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',
    },

    adminBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.34)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    adminBadgeText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.35,
    },

    activeBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.30)',

      backgroundColor:
        'rgba(53,201,130,0.08)',
    },

    activeDot: {
      backgroundColor:
        COLORS.green,
    },

    activeBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.3,
    },

    profileButton: {
      flexDirection:
        'row',

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

    profileButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // COLUMNS
    // ========================================================

    twoColumns: {
      flexDirection:
        'row',
    },

    column: {
      flex:
        1,
    },

    // ========================================================
    // SETTINGS CARD
    // ========================================================

    settingsCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    settingsRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    settingsRowPressed: {
      backgroundColor:
        'rgba(255,255,255,0.025)',
    },

    settingsIcon: {
      flexShrink:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.22)',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    settingsText: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        10,
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

    settingsValue: {
      maxWidth:
        100,

      marginLeft:
        8,

      fontFamily:
        'Inter_600SemiBold',

      textAlign:
        'right',
    },

    statusBadge: {
      flexShrink:
        0,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    statusBadgeText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    divider: {
      height:
        1,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    notificationCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    sectionIntro: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    sectionIntroIcon: {
      flexShrink:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    sectionIntroText: {
      flex:
        1,
    },

    sectionIntroTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    sectionIntroDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    preferenceGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',
    },

    preferenceTile: {
      width:
        '49%',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    preferenceTileTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    preferenceIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    preferenceTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    preferenceDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    toggle: {
      justifyContent:
        'center',

      backgroundColor:
        '#28334C',
    },

    toggleActive: {
      backgroundColor:
        COLORS.red,
    },

    toggleThumb: {
      backgroundColor:
        COLORS.white,
    },

    preferenceNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(110,168,254,0.25)',

      backgroundColor:
        'rgba(110,168,254,0.06)',
    },

    preferenceNoticeText: {
      flex:
        1,

      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // ABOUT
    // ========================================================

    aboutCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        18,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    aboutLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    aboutIcon: {
      flexShrink:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.22)',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    aboutText: {
      flex:
        1,
    },

    aboutTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    aboutDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    aboutButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    aboutButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SIGN OUT
    // ========================================================

    signOutCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        16,

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.38)',

      backgroundColor:
        'rgba(65,17,31,0.48)',
    },

    signOutLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    signOutIcon: {
      flexShrink:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.28)',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    signOutText: {
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
        'rgba(239,51,64,0.55)',

      backgroundColor:
        COLORS.red,
    },

    signOutButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // MODALS
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
      alignItems:
        'center',

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
        0.42,

      shadowRadius:
        30,

      elevation:
        22,
    },

    modalIcon: {
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

    modalTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      textAlign:
        'center',
    },

    modalSubtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    infoCard: {
      width:
        '100%',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    infoRow: {
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

    infoRowLast: {
      borderBottomWidth:
        0,
    },

    infoLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',
    },

    infoValue: {
      maxWidth:
        '60%',

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      textAlign:
        'right',
    },

    warningBox: {
      width:
        '100%',

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.30)',

      backgroundColor:
        'rgba(243,163,74,0.06)',
    },

    warningText: {
      flex:
        1,

      color:
        '#E8C79F',

      fontFamily:
        'Inter_400Regular',
    },

    securityTip: {
      width:
        '100%',

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.26)',

      backgroundColor:
        'rgba(53,201,130,0.05)',
    },

    securityTipText: {
      flex:
        1,

      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    modalButtonRow: {
      width:
        '100%',

      flexDirection:
        'row',
    },

    primaryModalButton: {
      width:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    flexModalButton: {
      flex:
        1,

      width:
        'auto',
    },

    primaryModalButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    secondaryModalButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    secondaryModalButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
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
        COLORS.cardLight,
    },

    cancelButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    logoutConfirmButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    logoutConfirmText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // GENERIC
    // ========================================================

    pressed: {
      opacity:
        0.76,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity:
        0.48,
    },
  });