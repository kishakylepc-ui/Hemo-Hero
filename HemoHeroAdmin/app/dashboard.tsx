import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminBottomNav from './AdminBottomNav';
import AdminHeader from './AdminHeader';

import {
  getAdminActivityLogs,
  getAdminBloodTypeDemand,
  getAdminDonorSummary,
  type ActivityLog,
  type AdminBloodTypeDemandItem,
  type AdminBloodTypeDemandResponse,
  type AdminProfile,
  type DonorApplicationSummary,
} from '../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../lib/session';

// ============================================================
// DESIGN SIZE
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer: '#02040A',
  navy: '#050B19',

  card: '#091126',
  cardLight: '#101A35',

  border: '#243554',

  red: '#DB0A0A',
  redBright: '#EF3340',

  white: '#FFFFFF',

  muted: '#7F889F',
  soft: '#B7C1D8',

  green: '#35C982',
  orange: '#F3A34A',
};

// ============================================================
// DASHBOARD
// ============================================================

export default function AdminDashboardScreen() {
  const { width, height } = useWindowDimensions();

  // ==========================================================
  // RESPONSIVE IPAD FRAME
  // ==========================================================

  const tablet = useMemo(() => {
    if (Platform.OS !== 'web') {
      return {
        width,
        height,

        scale: Math.min(
          width / DESIGN_WIDTH,
          height / DESIGN_HEIGHT
        ),
      };
    }

    const padding = 24;

    const availableWidth = Math.max(
      width - padding * 2,
      320
    );

    const availableHeight = Math.max(
      height - padding * 2,
      320
    );

    const scale = Math.min(
      availableWidth / DESIGN_WIDTH,
      availableHeight / DESIGN_HEIGHT,
      1
    );

    return {
      width: DESIGN_WIDTH * scale,
      height: DESIGN_HEIGHT * scale,
      scale,
    };
  }, [width, height]);

  // ==========================================================
  // SCALE
  //
  // s  = layout / dimensions
  // fs = readable font scale
  // ==========================================================

  const s = Math.max(
    tablet.scale,
    0.68
  );

  const fs = Math.max(
    tablet.scale,
    0.9
  );

  const headerFs = Math.max(
    tablet.scale,
    0.92
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(
      null
    );

  const [summary, setSummary] =
    useState<DonorApplicationSummary | null>(
      null
    );

  const [bloodDemand, setBloodDemand] =
    useState<AdminBloodTypeDemandResponse | null>(
      null
    );

  const [
    bloodDemandError,
    setBloodDemandError,
  ] = useState('');

  const [
    recentActivities,
    setRecentActivities,
  ] = useState<ActivityLog[]>([]);

  const [
    recentActivityError,
    setRecentActivityError,
  ] = useState('');

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      setBloodDemandError('');
      setRecentActivityError('');

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      // ------------------------------------------------------
      // ADMIN PROTECTION
      // ------------------------------------------------------

      if (
        !token ||
        savedProfile?.role !== 'admin'
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(savedProfile);

      // ------------------------------------------------------
      // APPLICATION SUMMARY
      // ------------------------------------------------------

      try {
        const result =
          await getAdminDonorSummary(
            token
          );

        setSummary(
          result.summary
        );
      } catch (error) {
        console.log(
          'ADMIN DASHBOARD SUMMARY ERROR:',
          error
        );

        setSummary(null);
      }

      // ------------------------------------------------------
      // BLOOD TYPE DEMAND
      // ------------------------------------------------------

      try {
        const result =
          await getAdminBloodTypeDemand(
            token
          );

        setBloodDemand(
          result
        );
      } catch (error) {
        console.log(
          'ADMIN BLOOD DEMAND ERROR:',
          error
        );

        setBloodDemand(null);

        setBloodDemandError(
          error instanceof Error
            ? error.message
            : 'Unable to load blood type demand.'
        );
      }

      // ------------------------------------------------------
      // RECENT ACTIVITY
      // ------------------------------------------------------

      try {
        const result =
          await getAdminActivityLogs(
            token,
            {
              page: 1,
              limit: 6,
            }
          );

        const latestActivities =
          (result.logs || [])
            .slice()
            .sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            )
            .slice(0, 4);

        setRecentActivities(
          latestActivities
        );
      } catch (error) {
        console.log(
          'ADMIN DASHBOARD ACTIVITY ERROR:',
          error
        );

        setRecentActivities([]);

        setRecentActivityError(
          error instanceof Error
            ? error.message
            : 'Unable to load recent activity.'
        );
      }
    } catch (error) {
      console.log(
        'ADMIN DASHBOARD ERROR:',
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // BLOOD DEMAND DISPLAY
  // ==========================================================

  const visibleBloodDemand =
    (
      bloodDemand?.demand ||
      []
    )
      .filter(
        item =>
          item.request_count > 0 ||
          item.units_needed > 0
      )
      .slice(0, 4);

  const highestUnits =
    Math.max(
      ...visibleBloodDemand.map(
        item =>
          item.units_needed
      ),
      1
    );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.ipadCanvas,

          {
            width:
              tablet.width,

            height:
              tablet.height,
          },

          Platform.OS !== 'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar style="light" />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={styles.gradient}
        >
          <SafeAreaView
            style={styles.safeArea}
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <AdminHeader
              profile={profile}
              scale={s}
              fontScale={headerFs}
              notificationCount={0}
            />

            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
              style={styles.scroll}
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
                  TITLE
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
                          30 * fs,

                        lineHeight:
                          38 * fs,
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
                          14 * fs,

                        lineHeight:
                          21 * fs,

                        marginTop:
                          4 * s,
                      },
                    ]}
                  >
                    Here's what's happening in Hemo-Hero today.
                  </Text>
                </View>

                {/* REFRESH */}

                <Pressable
                  disabled={loading}
                  onPress={
                    loadDashboard
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
                              13 * fs,
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
                      scale={s}
                      fontScale={fs}
                      icon="assignment"
                      title="TOTAL APPLICATIONS"
                      value={
                        summary?.total ??
                        0
                      }
                    />

                    <StatCard
                      scale={s}
                      fontScale={fs}
                      icon="verified"
                      title="VERIFIED DONORS"
                      value={
                        summary?.approved ??
                        0
                      }
                      positive
                    />

                    <StatCard
                      scale={s}
                      fontScale={fs}
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
                      scale={s}
                      fontScale={fs}
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
                          112 * s,

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
                              18 * fs,
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
                              14 * fs,

                            lineHeight:
                              21 * fs,

                            marginTop:
                              3 * s,
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
                      onPress={() =>
                        router.push(
                          '/applications'
                        )
                      }
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
                    >
                      <Text
                        style={[
                          styles.reviewText,

                          {
                            fontSize:
                              13 * fs,
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
                            335 * s,

                          borderRadius:
                            14 * s,

                          padding:
                            22 * s,
                        },
                      ]}
                    >
                      {/* HEADER */}

                      <View
                        style={
                          styles.demandHeader
                        }
                      >
                        <View
                          style={
                            styles.demandHeading
                          }
                        >
                          <View
                            style={[
                              styles.demandHeaderIcon,

                              {
                                width:
                                  44 * s,

                                height:
                                  44 * s,

                                borderRadius:
                                  11 * s,
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
                              styles.demandHeadingText
                            }
                          >
                            <Text
                              style={[
                                styles.cardTitle,

                                {
                                  fontSize:
                                    18 * fs,
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
                                    13 * fs,

                                  lineHeight:
                                    18 * fs,

                                  marginTop:
                                    2 * s,
                                },
                              ]}
                            >
                              Current active blood requests
                            </Text>
                          </View>
                        </View>

                        {bloodDemand
                          ?.highest_demand ? (
                          <View
                            style={[
                              styles.highDemandBadge,

                              {
                                minHeight:
                                  34 * s,

                                borderRadius:
                                  17 * s,

                                paddingHorizontal:
                                  11 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="priority-high"
                              size={
                                15 * s
                              }
                              color={
                                COLORS.redBright
                              }
                            />

                            <Text
                              style={[
                                styles.highDemandBadgeText,

                                {
                                  fontSize:
                                    11 * fs,
                                },
                              ]}
                            >
                              {
                                bloodDemand
                                  .highest_demand
                                  .blood_type
                              }{' '}
                              highest
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* ERROR */}

                      {bloodDemandError ? (
                        <View
                          style={
                            styles.centerMessage
                          }
                        >
                          <MaterialIcons
                            name="error-outline"
                            size={
                              30 * s
                            }
                            color={
                              COLORS.redBright
                            }
                          />

                          <Text
                            style={[
                              styles.messageTitle,

                              {
                                fontSize:
                                  14 * fs,

                                marginTop:
                                  9 * s,
                              },
                            ]}
                          >
                            Demand unavailable
                          </Text>

                          <Text
                            style={[
                              styles.messageText,

                              {
                                fontSize:
                                  12 * fs,

                                lineHeight:
                                  18 * fs,

                                marginTop:
                                  3 * s,
                              },
                            ]}
                          >
                            Unable to load active blood request demand.
                          </Text>
                        </View>
                      ) : !bloodDemand ||
                        bloodDemand.summary
                          .active_requests ===
                          0 ? (
                        /* EMPTY */

                        <View
                          style={
                            styles.centerMessage
                          }
                        >
                          <View
                            style={[
                              styles.emptyCircle,

                              {
                                width:
                                  50 * s,

                                height:
                                  50 * s,

                                borderRadius:
                                  25 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="bloodtype"
                              size={
                                27 * s
                              }
                              color={
                                COLORS.muted
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.messageTitle,

                              {
                                fontSize:
                                  14 * fs,

                                marginTop:
                                  10 * s,
                              },
                            ]}
                          >
                            No active blood requests
                          </Text>

                          <Text
                            style={[
                              styles.messageText,

                              {
                                fontSize:
                                  12 * fs,

                                lineHeight:
                                  18 * fs,

                                marginTop:
                                  3 * s,
                              },
                            ]}
                          >
                            Demand information will appear when a request becomes active.
                          </Text>
                        </View>
                      ) : (
                        <>
                          {/* SUMMARY */}

                          <View
                            style={[
                              styles.demandSummary,

                              {
                                gap:
                                  8 * s,

                                marginTop:
                                  14 * s,
                              },
                            ]}
                          >
                            <DemandMiniStat
                              scale={s}
                              fontScale={fs}
                              value={
                                bloodDemand
                                  .summary
                                  .active_requests
                              }
                              label="Active"
                              icon="assignment"
                            />

                            <DemandMiniStat
                              scale={s}
                              fontScale={fs}
                              value={
                                bloodDemand
                                  .summary
                                  .units_needed
                              }
                              label="Units"
                              icon="water-drop"
                            />

                            <DemandMiniStat
                              scale={s}
                              fontScale={fs}
                              value={
                                bloodDemand
                                  .summary
                                  .urgent_requests
                              }
                              label="Urgent"
                              icon="priority-high"
                              urgent
                            />
                          </View>

                          {/* DEMAND LIST */}

                          <View
                            style={[
                              styles.demandList,

                              {
                                marginTop:
                                  12 * s,
                              },
                            ]}
                          >
                            {visibleBloodDemand.map(
                              (
                                item,
                                index
                              ) => (
                                <BloodDemandRow
                                  key={
                                    item.blood_type
                                  }
                                  item={
                                    item
                                  }
                                  highestUnits={
                                    highestUnits
                                  }
                                  scale={s}
                                  fontScale={fs}
                                  highlight={
                                    index === 0
                                  }
                                  last={
                                    index ===
                                    visibleBloodDemand.length -
                                      1
                                  }
                                />
                              )
                            )}
                          </View>
                        </>
                      )}
                    </View>

                    {/* ==========================================
                        RECENT ACTIVITY
                    ========================================== */}

                    <View
                      style={[
                        styles.largeCard,

                        {
                          minHeight:
                            335 * s,

                          borderRadius:
                            14 * s,

                          padding:
                            22 * s,
                        },
                      ]}
                    >
                      {/* HEADER */}

                      <View
                        style={
                          styles.activityCardHeader
                        }
                      >
                        <View
                          style={
                            styles.activityHeading
                          }
                        >
                          <View
                            style={[
                              styles.activityHeaderIcon,

                              {
                                width:
                                  44 * s,

                                height:
                                  44 * s,

                                borderRadius:
                                  11 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="history"
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
                              styles.activityHeadingText
                            }
                          >
                            <Text
                              style={[
                                styles.cardTitle,

                                {
                                  fontSize:
                                    18 * fs,
                                },
                              ]}
                            >
                              Recent Activity
                            </Text>

                            <Text
                              numberOfLines={1}
                              style={[
                                styles.cardDescription,

                                {
                                  fontSize:
                                    13 * fs,

                                  lineHeight:
                                    18 * fs,

                                  marginTop:
                                    2 * s,
                                },
                              ]}
                            >
                              Latest administrator and system events
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          onPress={() =>
                            router.push(
                              '/activity-logs'
                            )
                          }
                          style={({ pressed }) => [
                            styles.viewAllButton,

                            {
                              height:
                                38 * s,

                              borderRadius:
                                8 * s,

                              paddingHorizontal:
                                12 * s,
                            },

                            pressed &&
                              styles.viewAllPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.viewAllText,

                              {
                                fontSize:
                                  12 * fs,
                              },
                            ]}
                          >
                            View All
                          </Text>

                          <MaterialIcons
                            name="chevron-right"
                            size={
                              18 * s
                            }
                            color={
                              COLORS.soft
                            }
                          />
                        </Pressable>
                      </View>

                      {/* ERROR */}

                      {recentActivityError ? (
                        <View
                          style={
                            styles.centerMessage
                          }
                        >
                          <MaterialIcons
                            name="error-outline"
                            size={
                              30 * s
                            }
                            color={
                              COLORS.redBright
                            }
                          />

                          <Text
                            style={[
                              styles.messageTitle,

                              {
                                fontSize:
                                  14 * fs,

                                marginTop:
                                  9 * s,
                              },
                            ]}
                          >
                            Activity unavailable
                          </Text>

                          <Text
                            style={[
                              styles.messageText,

                              {
                                fontSize:
                                  12 * fs,

                                marginTop:
                                  3 * s,
                              },
                            ]}
                          >
                            Unable to load recent activity.
                          </Text>
                        </View>
                      ) : recentActivities.length ===
                        0 ? (
                        /* EMPTY */

                        <View
                          style={
                            styles.centerMessage
                          }
                        >
                          <View
                            style={[
                              styles.emptyCircle,

                              {
                                width:
                                  50 * s,

                                height:
                                  50 * s,

                                borderRadius:
                                  25 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="history"
                              size={
                                27 * s
                              }
                              color={
                                COLORS.muted
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.messageTitle,

                              {
                                fontSize:
                                  14 * fs,

                                marginTop:
                                  10 * s,
                              },
                            ]}
                          >
                            No recent activity
                          </Text>

                          <Text
                            style={[
                              styles.messageText,

                              {
                                fontSize:
                                  12 * fs,

                                marginTop:
                                  3 * s,
                              },
                            ]}
                          >
                            New system events will appear here.
                          </Text>
                        </View>
                      ) : (
                        /* ACTIVITY LIST */

                        <View
                          style={[
                            styles.activityList,

                            {
                              marginTop:
                                12 * s,
                            },
                          ]}
                        >
                          {recentActivities.map(
                            (
                              activity,
                              index
                            ) => (
                              <DashboardActivityRow
                                key={
                                  activity.id
                                }
                                activity={
                                  activity
                                }
                                scale={s}
                                fontScale={fs}
                                last={
                                  index ===
                                  recentActivities.length -
                                    1
                                }
                              />
                            )
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* ==================================================
                BOTTOM NAV
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
  fontScale,
  icon,
  title,
  value,
  alert = false,
  positive = false,
  onPress,
}: {
  scale: number;
  fontScale: number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  title: string;

  value: number;

  alert?: boolean;

  positive?: boolean;

  onPress?: () => void;
}) {
  const content = (
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
            name={icon}
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
              12 * fontScale,

            marginTop:
              15 * scale,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.statValue,

          {
            fontSize:
              30 * fontScale,

            marginTop:
              3 * scale,
          },

          alert &&
            styles.statValueAlert,
        ]}
      >
        {value}
      </Text>
    </>
  );

  if (onPress) {
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
        {content}
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
      {content}
    </View>
  );
}

// ============================================================
// DEMAND MINI STAT
// ============================================================

function DemandMiniStat({
  scale,
  fontScale,
  value,
  label,
  icon,
  urgent = false,
}: {
  scale: number;
  fontScale: number;

  value: number;

  label: string;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  urgent?: boolean;
}) {
  return (
    <View
      style={[
        styles.demandMiniStat,

        {
          minHeight:
            58 * scale,

          borderRadius:
            10 * scale,

          paddingHorizontal:
            10 * scale,
        },

        urgent &&
          styles.demandMiniStatUrgent,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={
          18 * scale
        }
        color={
          urgent
            ? COLORS.redBright
            : COLORS.soft
        }
      />

      <View
        style={{
          marginLeft:
            7 * scale,
        }}
      >
        <Text
          style={[
            styles.demandMiniValue,

            {
              fontSize:
                17 * fontScale,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.demandMiniLabel,

            {
              fontSize:
                11 * fontScale,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// BLOOD DEMAND ROW
// ============================================================

function BloodDemandRow({
  item,
  highestUnits,
  scale,
  fontScale,
  highlight,
  last,
}: {
  item:
    AdminBloodTypeDemandItem;

  highestUnits:
    number;

  scale:
    number;

  fontScale:
    number;

  highlight:
    boolean;

  last:
    boolean;
}) {
  const progress =
    Math.max(
      8,
      Math.min(
        100,
        (
          item.units_needed /
          highestUnits
        ) *
          100
      )
    );

  return (
    <View
      style={[
        styles.demandRow,

        {
          minHeight:
            49 * scale,

          paddingVertical:
            6 * scale,
        },

        last &&
          styles.noBottomBorder,
      ]}
    >
      <View
        style={[
          styles.bloodTypeCircle,

          {
            width:
              36 * scale,

            height:
              36 * scale,

            borderRadius:
              18 * scale,
          },

          highlight &&
            styles.bloodTypeCircleHighlight,
        ]}
      >
        <Text
          style={[
            styles.bloodTypeText,

            {
              fontSize:
                13 * fontScale,
            },

            highlight &&
              styles.bloodTypeTextHighlight,
          ]}
        >
          {item.blood_type}
        </Text>
      </View>

      <View
        style={[
          styles.demandRowBody,

          {
            marginLeft:
              10 * scale,
          },
        ]}
      >
        <View
          style={
            styles.demandRowTop
          }
        >
          <Text
            style={[
              styles.demandRowLabel,

              {
                fontSize:
                  13 * fontScale,
              },
            ]}
          >
            {item.units_needed}{' '}
            {item.units_needed === 1
              ? 'unit'
              : 'units'}{' '}
            needed
          </Text>

          <Text
            style={[
              styles.demandRowMeta,

              {
                fontSize:
                  11 * fontScale,
              },
            ]}
          >
            {item.request_count}{' '}
            {item.request_count === 1
              ? 'request'
              : 'requests'}
          </Text>
        </View>

        <View
          style={[
            styles.demandProgressTrack,

            {
              height:
                5 * scale,

              borderRadius:
                3 * scale,

              marginTop:
                5 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.demandProgressFill,

              {
                width:
                  `${progress}%`,

                borderRadius:
                  3 * scale,
              },

              highlight &&
                styles.demandProgressHighlight,
            ]}
          />
        </View>
      </View>

      {item.urgent_requests >
      0 ? (
        <View
          style={[
            styles.urgentCount,

            {
              marginLeft:
                8 * scale,

              paddingHorizontal:
                8 * scale,

              minHeight:
                24 * scale,

              borderRadius:
                12 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.urgentCountText,

              {
                fontSize:
                  11 * fontScale,
              },
            ]}
          >
            {item.urgent_requests}{' '}
            urgent
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// ACTIVITY ROW
// ============================================================

function DashboardActivityRow({
  activity,
  scale,
  fontScale,
  last,
}: {
  activity:
    ActivityLog;

  scale:
    number;

  fontScale:
    number;

  last:
    boolean;
}) {
  const action =
    formatActivityAction(
      activity.action
    );

  const time =
    formatActivityDate(
      activity.created_at
    );

  return (
    <Pressable
      onPress={() =>
        router.push(
          '/activity-logs'
        )
      }
      style={({ pressed }) => [
        styles.activityRow,

        {
          minHeight:
            54 * scale,

          paddingVertical:
            7 * scale,
        },

        last &&
          styles.noBottomBorder,

        pressed &&
          styles.activityRowPressed,
      ]}
    >
      <View
        style={[
          styles.activityRowIcon,

          {
            width:
              35 * scale,

            height:
              35 * scale,

            borderRadius:
              9 * scale,

            marginRight:
              10 * scale,
          },

          !activity.success &&
            styles.activityRowIconFailed,
        ]}
      >
        <MaterialIcons
          name={
            getActivityIcon(
              activity.action
            )
          }
          size={
            18 * scale
          }
          color={
            activity.success
              ? COLORS.soft
              : COLORS.redBright
          }
        />
      </View>

      <View
        style={
          styles.activityRowBody
        }
      >
        <Text
          numberOfLines={1}
          style={[
            styles.activityRowTitle,

            {
              fontSize:
                13 * fontScale,
            },
          ]}
        >
          {action}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.activityRowMeta,

            {
              fontSize:
                11.5 * fontScale,

              lineHeight:
                16 * fontScale,

              marginTop:
                1 * scale,
            },
          ]}
        >
          {activity.user_email ||
            activity.user_role ||
            'System activity'}

          {activity.module
            ? ` • ${activity.module}`
            : ''}
        </Text>
      </View>

      <View
        style={
          styles.activityRowRight
        }
      >
        <Text
          numberOfLines={1}
          style={[
            styles.activityTime,

            {
              fontSize:
                11 * fontScale,
            },
          ]}
        >
          {time}
        </Text>

        <View
          style={[
            styles.activityStatusDot,

            {
              width:
                7 * scale,

              height:
                7 * scale,

              borderRadius:
                4 * scale,

              marginTop:
                5 * scale,
            },

            activity.success
              ? styles.activityStatusSuccess
              : styles.activityStatusFailed,
          ]}
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// FORMAT ACTIVITY ACTION
// ============================================================

function formatActivityAction(
  action?: string | null
) {
  if (!action) {
    return 'Activity';
  }

  return String(action)
    .toLowerCase()
    .split('_')
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

// ============================================================
// ACTIVITY ICON
// ============================================================

function getActivityIcon(
  action?: string | null
):
  ComponentProps<
    typeof MaterialIcons
  >['name'] {
  const normalized =
    String(
      action || ''
    ).toUpperCase();

  if (
    normalized.includes(
      'LOGIN'
    )
  ) {
    return 'login';
  }

  if (
    normalized.includes(
      'LOGOUT'
    )
  ) {
    return 'logout';
  }

  if (
    normalized.includes(
      'PASSWORD'
    ) ||
    normalized.includes(
      'EMAIL'
    )
  ) {
    return 'lock';
  }

  if (
    normalized.includes(
      'APPROVE'
    )
  ) {
    return 'check-circle';
  }

  if (
    normalized.includes(
      'REJECT'
    ) ||
    normalized.includes(
      'FAIL'
    )
  ) {
    return 'cancel';
  }

  if (
    normalized.includes(
      'UPDATE'
    ) ||
    normalized.includes(
      'EDIT'
    )
  ) {
    return 'edit';
  }

  if (
    normalized.includes(
      'CREATE'
    )
  ) {
    return 'add-circle-outline';
  }

  if (
    normalized.includes(
      'DELETE'
    )
  ) {
    return 'delete-outline';
  }

  if (
    normalized.includes(
      'PROFILE'
    ) ||
    normalized.includes(
      'USER'
    ) ||
    normalized.includes(
      'ACCOUNT'
    )
  ) {
    return 'person';
  }

  return 'history';
}

// ============================================================
// FORMAT ACTIVITY DATE
// ============================================================

function formatActivityDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  const now =
    new Date();

  const sameDay =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(
      'en-PH',
      {
        hour:
          'numeric',

        minute:
          '2-digit',

        hour12:
          true,
      }
    );
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      month:
        'short',

      day:
        'numeric',
    }
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
      flex: 1,

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
      flex: 1,
    },

    safeArea: {
      flex: 1,
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
      position:
        'relative',

      width:
        30,

      marginRight:
        4,

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

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redBright,
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
        100,
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
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // CONTENT
    // ========================================================

    scroll: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
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
    // STAT CARDS
    // ========================================================

    statRow: {
      flexDirection:
        'row',
    },

    statCard: {
      flex: 1,

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
        0.3,
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
    // NEEDS ATTENTION
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
      flex: 1,
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

      alignItems:
        'stretch',
    },

    largeCard: {
      flex: 1,

      justifyContent:
        'flex-start',

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

    // ========================================================
    // BLOOD DEMAND HEADER
    // ========================================================

    demandHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    demandHeading: {
      flex: 1,

      minWidth: 0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    demandHeadingText: {
      flex: 1,

      minWidth: 0,

      marginLeft: 11,
    },

    demandHeaderIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    highDemandBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 3,

      marginLeft: 8,

      borderWidth: 1,

      borderColor:
        'rgba(239,51,64,0.36)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    highDemandBadgeText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // BLOOD DEMAND SUMMARY
    // ========================================================

    demandSummary: {
      flexDirection:
        'row',
    },

    demandMiniStat: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    demandMiniStatUrgent: {
      borderColor:
        'rgba(239,51,64,0.34)',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    demandMiniValue: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    demandMiniLabel: {
      marginTop:
        -1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',
    },

    // ========================================================
    // BLOOD DEMAND ROW
    // ========================================================

    demandList: {
      flex: 1,
    },

    demandRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        'rgba(36,53,84,0.58)',
    },

    bloodTypeCircle: {
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

    bloodTypeCircleHighlight: {
      borderColor:
        'rgba(239,51,64,0.50)',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    bloodTypeText: {
      color:
        COLORS.soft,

      fontFamily:
        'Poppins_600SemiBold',
    },

    bloodTypeTextHighlight: {
      color:
        COLORS.redBright,
    },

    demandRowBody: {
      flex: 1,

      minWidth: 0,
    },

    demandRowTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    demandRowLabel: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    demandRowMeta: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    demandProgressTrack: {
      overflow:
        'hidden',

      width:
        '100%',

      backgroundColor:
        '#17233D',
    },

    demandProgressFill: {
      height:
        '100%',

      backgroundColor:
        '#6E7E9C',
    },

    demandProgressHighlight: {
      backgroundColor:
        COLORS.redBright,
    },

    urgentCount: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.38)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    urgentCountText: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // ACTIVITY
    // ========================================================

    activityCardHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    activityHeading: {
      flex: 1,

      minWidth: 0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    activityHeaderIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 11,

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    activityHeadingText: {
      flex: 1,

      minWidth: 0,
    },

    viewAllButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft: 10,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    viewAllPressed: {
      opacity:
        0.72,

      transform: [
        {
          scale:
            0.98,
        },
      ],
    },

    viewAllText: {
      marginRight: 2,

      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    activityList: {
      flex: 1,
    },

    activityRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        'rgba(36,53,84,0.58)',
    },

    noBottomBorder: {
      borderBottomWidth: 0,
    },

    activityRowPressed: {
      opacity: 0.7,
    },

    activityRowIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    activityRowIconFailed: {
      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    activityRowBody: {
      flex: 1,

      minWidth: 0,

      paddingRight: 8,
    },

    activityRowTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    activityRowMeta: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    activityRowRight: {
      width: 78,

      alignItems:
        'flex-end',

      justifyContent:
        'center',
    },

    activityTime: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    activityStatusDot: {},

    activityStatusSuccess: {
      backgroundColor:
        COLORS.green,
    },

    activityStatusFailed: {
      backgroundColor:
        COLORS.redBright,
    },

    // ========================================================
    // EMPTY / ERROR STATES
    // ========================================================

    centerMessage: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 18,
    },

    emptyCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    messageTitle: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Poppins_600SemiBold',
    },

    messageText: {
      maxWidth: 300,

      color:
        COLORS.muted,

      textAlign:
        'center',

      fontFamily:
        'Inter_400Regular',
    },
  });