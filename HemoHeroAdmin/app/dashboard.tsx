import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
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

import AdminBottomNav from './AdminBottomNav';

import {
  getAdminDonorSummary,
  type AdminProfile,
  type DonorApplicationSummary,
} from '../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../lib/session';

// ============================================================
// IPAD PRO
// ============================================================

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

// ============================================================
// COLORS
//
// Matched to the Donor Applications module.
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

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  green:
    '#35C982',
};

// ============================================================
// SCREEN
// ============================================================

export default function AdminDashboardScreen() {
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
    summary,
    setSummary,
  ] =
    useState<DonorApplicationSummary | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  useEffect(
    () => {
      loadDashboard();
    },
    []
  );

  async function loadDashboard() {
    try {
      setLoading(
        true
      );

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      // ------------------------------------------------------
      // PROTECT ADMIN DASHBOARD
      // ------------------------------------------------------

      if (
        !token ||
        savedProfile?.role !==
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

      // ------------------------------------------------------
      // LOAD DASHBOARD SUMMARY
      // ------------------------------------------------------

      const result =
        await getAdminDonorSummary(
          token
        );

      setSummary(
        result.summary
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN DASHBOARD ERROR:',
        error
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

        {/* ====================================================
            SAME BACKGROUND PALETTE AS APPLICATIONS
        ==================================================== */}

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
                style={
                  styles.brandArea
                }
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
                    source={require('../assets/images/hemo-hero-logo.png')}
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
                  onPress={() => {
                    console.log(
                      'Admin notifications'
                    );
                  }}
                  style={({ pressed }) => [
                    styles.notificationWrap,

                    pressed &&
                      styles.headerButtonPressed,
                  ]}
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
                      !
                    </Text>
                  </View>
                </Pressable>

                {/* ==============================================
                    ADMIN AVATAR
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
                    ADMIN INFORMATION
                ============================================== */}

                <Pressable
                  onPress={() =>
                    router.push(
                      '/settings'
                    )
                  }
                  style={({ pressed }) => [
                    styles.adminInfoButton,

                    pressed &&
                      styles.adminInfoPressed,
                  ]}
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
                </Pressable>
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
                    34 * s,

                  paddingBottom:
                    28 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* ================================================
                  PAGE TITLE
              ================================================ */}

              <View
                style={[
                  styles.titleRow,

                  {
                    marginBottom:
                      28 * s,
                  },
                ]}
              >
                <View>
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
                    Welcome back, Admin
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,

                      {
                        fontSize:
                          13 * s,

                        marginTop:
                          4 * s,
                      },
                    ]}
                  >
                    Here's what's happening in Hemo-Hero today.
                  </Text>
                </View>

                {/* ==============================================
                    REFRESH
                ============================================== */}

                <Pressable
                  disabled={
                    loading
                  }
                  style={({ pressed }) => [
                    styles.refreshButton,

                    {
                      height:
                        46 * s,

                      paddingHorizontal:
                        18 * s,

                      borderRadius:
                        10 * s,

                      gap:
                        8 * s,
                    },

                    pressed &&
                      styles.refreshPressed,

                    loading &&
                      styles.refreshDisabled,
                  ]}
                  onPress={
                    loadDashboard
                  }
                >
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="refresh"
                        size={
                          21 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.refreshText,

                          {
                            fontSize:
                              11 * s,
                          },
                        ]}
                      >
                        Refresh
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* ================================================
                  LOADING
              ================================================ */}

              {loading ? (
                <View
                  style={[
                    styles.loading,

                    {
                      minHeight:
                        500 * s,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={
                      COLORS.redBright
                    }
                  />
                </View>
              ) : (
                <>
                  {/* ============================================
                      STAT CARDS
                  ============================================ */}

                  <View
                    style={[
                      styles.statRow,

                      {
                        gap:
                          18 * s,

                        marginBottom:
                          22 * s,
                      },
                    ]}
                  >
                    <StatCard
                      scale={
                        s
                      }
                      icon="assignment"
                      title="TOTAL APPLICATIONS"
                      value={
                        summary?.total ??
                        0
                      }
                    />

                    <StatCard
                      scale={
                        s
                      }
                      icon="verified"
                      title="VERIFIED DONORS"
                      value={
                        summary?.approved ??
                        0
                      }
                      positive
                    />

                    <StatCard
                      scale={
                        s
                      }
                      icon="pending-actions"
                      title="PENDING APPLICATIONS"
                      value={
                        summary?.pending ??
                        0
                      }
                      alert
                      onPress={() =>
                        router.push(
                          '/applications'
                        )
                      }
                    />

                    <StatCard
                      scale={
                        s
                      }
                      icon="cancel"
                      title="REJECTED"
                      value={
                        summary?.rejected ??
                        0
                      }
                    />
                  </View>

                  {/* ============================================
                      NEEDS ATTENTION
                  ============================================ */}

                  <View
                    style={[
                      styles.attention,

                      {
                        minHeight:
                          110 * s,

                        paddingHorizontal:
                          24 * s,

                        borderRadius:
                          14 * s,

                        marginBottom:
                          22 * s,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.attentionIcon,

                        {
                          width:
                            55 * s,

                          height:
                            55 * s,

                          borderRadius:
                            28 * s,

                          marginRight:
                            17 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="priority-high"
                        size={
                          29 * s
                        }
                        color={
                          COLORS.redBright
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.attentionBody
                      }
                    >
                      <Text
                        style={[
                          styles.attentionTitle,

                          {
                            fontSize:
                              18 * s,
                          },
                        ]}
                      >
                        Needs Attention
                      </Text>

                      <Text
                        style={[
                          styles.attentionText,

                          {
                            fontSize:
                              12 * s,

                            marginTop:
                              4 * s,
                          },
                        ]}
                      >
                        {summary?.pending ??
                          0}{' '}
                        donor{' '}
                        {(summary?.pending ??
                          0) === 1
                          ? 'application is'
                          : 'applications are'}{' '}
                        waiting for review.
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.reviewButton,

                        {
                          height:
                            48 * s,

                          paddingHorizontal:
                            20 * s,

                          borderRadius:
                            10 * s,
                        },

                        pressed &&
                          styles.reviewPressed,
                      ]}
                      onPress={() =>
                        router.push(
                          '/applications'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.reviewText,

                          {
                            fontSize:
                              12 * s,
                          },
                        ]}
                      >
                        Review Applications
                      </Text>
                    </Pressable>
                  </View>

                  {/* ============================================
                      LOWER DASHBOARD
                  ============================================ */}

                  <View
                    style={[
                      styles.lowerRow,

                      {
                        gap:
                          18 * s,
                      },
                    ]}
                  >
                    {/* ==========================================
                        BLOOD TYPE DEMAND
                    ========================================== */}

                    <View
                      style={[
                        styles.largeCard,

                        {
                          minHeight:
                            285 * s,

                          borderRadius:
                            14 * s,

                          padding:
                            27 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={
                          40 * s
                        }
                        color={
                          COLORS.redBright
                        }
                      />

                      <Text
                        style={[
                          styles.cardTitle,

                          {
                            fontSize:
                              19 * s,

                            marginTop:
                              15 * s,
                          },
                        ]}
                      >
                        Blood Type Demand
                      </Text>

                      <Text
                        style={[
                          styles.cardDescription,

                          {
                            fontSize:
                              12 * s,

                            lineHeight:
                              19 * s,

                            marginTop:
                              7 * s,
                          },
                        ]}
                      >
                        Live blood-request analytics will be connected here.
                      </Text>
                    </View>

                    {/* ==========================================
                        RECENT ACTIVITY
                    ========================================== */}

                    <View
                      style={[
                        styles.largeCard,

                        {
                          minHeight:
                            285 * s,

                          borderRadius:
                            14 * s,

                          padding:
                            27 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="history"
                        size={
                          40 * s
                        }
                        color={
                          COLORS.redBright
                        }
                      />

                      <Text
                        style={[
                          styles.cardTitle,

                          {
                            fontSize:
                              19 * s,

                            marginTop:
                              15 * s,
                          },
                        ]}
                      >
                        Recent Activity
                      </Text>

                      <Text
                        style={[
                          styles.cardDescription,

                          {
                            fontSize:
                              12 * s,

                            lineHeight:
                              19 * s,

                            marginTop:
                              7 * s,
                          },
                        ]}
                      >
                        Recent administrator and system activity will appear here.
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* ==================================================
                SHARED ADMIN BOTTOM NAV
            ================================================== */}

            <AdminBottomNav
              activeTab="dashboard"
            />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  scale,
  icon,
  title,
  value,
  alert = false,
  positive = false,
  onPress,
}: {
  scale: number;

  icon:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  title: string;

  value: number;

  alert?: boolean;

  positive?: boolean;

  onPress?: () => void;
}) {
  const content =
    (
      <>
        <View
          style={
            styles.statTop
          }
        >
          <View
            style={[
              styles.statIcon,

              {
                width:
                  48 * scale,

                height:
                  48 * scale,

                borderRadius:
                  12 * scale,
              },
            ]}
          >
            <MaterialIcons
              name={
                icon
              }
              size={
                26 * scale
              }
              color={
                alert
                  ? COLORS.redBright
                  : positive
                    ? COLORS.green
                    : COLORS.soft
              }
            />
          </View>

          {onPress ? (
            <MaterialIcons
              name="chevron-right"
              size={
                23 * scale
              }
              color={
                COLORS.muted
              }
            />
          ) : null}
        </View>

        <Text
          style={[
            styles.statTitle,

            {
              fontSize:
                10 * scale,

              marginTop:
                17 * scale,
            },
          ]}
        >
          {
            title
          }
        </Text>

        <Text
          style={[
            styles.statValue,

            {
              fontSize:
                32 * scale,

              marginTop:
                4 * scale,
            },

            alert &&
              styles.statValueAlert,
          ]}
        >
          {
            value
          }
        </Text>
      </>
    );

  if (
    onPress
  ) {
    return (
      <Pressable
        onPress={
          onPress
        }
        style={({ pressed }) => [
          styles.statCard,

          {
            minHeight:
              175 * scale,

            padding:
              20 * scale,

            borderRadius:
              14 * scale,
          },

          alert &&
            styles.statCardAlert,

          pressed &&
            styles.statCardPressed,
        ]}
      >
        {
          content
        }
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.statCard,

        {
          minHeight:
            175 * scale,

          padding:
            20 * scale,

          borderRadius:
            14 * scale,
        },

        alert &&
          styles.statCardAlert,
      ]}
    >
      {
        content
      }
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // PAGE
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
    // ADMIN HEADER
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

    headerButtonPressed: {
      opacity:
        0.65,
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

    adminInfoButton: {
      minWidth:
        90,
    },

    adminInfoPressed: {
      opacity:
        0.7,
    },

    adminName: {
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

    // ========================================================
    // TITLE
    // ========================================================

    titleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
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
    // REFRESH
    // ========================================================

    refreshButton: {
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
        COLORS.card,
    },

    refreshPressed: {
      opacity:
        0.76,

      transform: [
        {
          scale:
            0.98,
        },
      ],
    },

    refreshDisabled: {
      opacity:
        0.55,
    },

    refreshText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // LOADING
    // ========================================================

    loading: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ========================================================
    // STATS
    // ========================================================

    statRow: {
      flexDirection:
        'row',
    },

    statCard: {
      flex:
        1,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    statCardAlert: {
      borderColor:
        'rgba(239,51,64,0.58)',

      backgroundColor:
        'rgba(65,17,31,0.76)',
    },

    statCardPressed: {
      opacity:
        0.85,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },

    statTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    statIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    statTitle: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.5,
    },

    statValue: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    statValueAlert: {
      color:
        COLORS.redBright,
    },

    // ========================================================
    // ATTENTION
    // ========================================================

    attention: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.60)',

      backgroundColor:
        'rgba(68,15,28,0.57)',
    },

    attentionIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.13)',
    },

    attentionBody: {
      flex:
        1,
    },

    attentionTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    attentionText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    reviewButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    reviewPressed: {
      opacity:
        0.82,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    reviewText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // LOWER CARDS
    // ========================================================

    lowerRow: {
      flexDirection:
        'row',

      flex:
        1,
    },

    largeCard: {
      flex:
        1,

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    cardTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    cardDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },
  });