import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
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
  useFocusEffect,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';

import {
  getAdminDonorApplications,
  getAdminDonorSummary,
  type AdminProfile,
  type DonorApplication,
  type DonorApplicationSummary,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
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

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  green:
    '#35C982',

  orange:
    '#F3A34A',

  rowBorder:
    'rgba(36,53,84,0.78)',
};

// ============================================================
// FILTER TYPE
// ============================================================

type ApplicationFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

// ============================================================
// SCREEN
// ============================================================

export default function ApplicationsScreen() {
  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // IPAD PRO CANVAS
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
    applications,
    setApplications,
  ] =
    useState<DonorApplication[]>(
      []
    );

  const [
    summary,
    setSummary,
  ] =
    useState<DonorApplicationSummary | null>(
      null
    );

  const [
    filter,
    setFilter,
  ] =
    useState<ApplicationFilter>(
      'pending'
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      loadApplications(
        false
      );
    },
    [
      filter,
    ]
  );

  useFocusEffect(
    useCallback(
      () => {
        loadApplications(
          false
        );
      },
      [
        filter,
      ]
    )
  );

  async function loadApplications(
    isRefresh: boolean
  ) {
    try {
      if (
        isRefresh
      ) {
        setRefreshing(
          true
        );
      } else {
        setLoading(
          true
        );
      }

      setError(
        ''
      );

      const token =
        await getAdminAccessToken();

      const storedProfile =
        await getAdminProfile();

      if (
        !token ||
        storedProfile?.role !==
          'admin'
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      setProfile(
        storedProfile
      );

      const [
        applicationResult,
        summaryResult,
      ] =
        await Promise.all([
          getAdminDonorApplications(
            token,

            filter ===
              'all'
              ? undefined
              : filter
          ),

          getAdminDonorSummary(
            token
          ),
        ]);

      console.log(
        'ADMIN APPLICATIONS RESPONSE:',
        applicationResult
      );

      setApplications(
        applicationResult
          ?.applications ||
          []
      );

      setSummary(
        summaryResult
          ?.summary ||
          null
      );
    } catch (
      loadError
    ) {
      console.log(
        'ADMIN APPLICATIONS ERROR:',
        loadError
      );

      setError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Unable to load donor applications.'
      );
    } finally {
      setLoading(
        false
      );

      setRefreshing(
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
      .filter(
        Boolean
      )
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  // ==========================================================
  // OPEN APPLICATION
  // ==========================================================

  function openApplication(
    applicationId: string
  ) {
    router.push(
      `/applications/${applicationId}` as any
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
            {/* ============================================== */}
            {/* HEADER */}
            {/* ============================================== */}

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
                          1.6 *
                          s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              {/* ADMIN */}

              <View
                style={
                  styles.adminSection
                }
              >
                <View
                  style={
                    styles.notificationWrap
                  }
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
                </View>

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
                    {adminName
                      .charAt(
                        0
                      )
                      .toUpperCase()}
                  </Text>
                </View>

                <View>
                  <Text
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

            {/* ============================================== */}
            {/* CONTENT */}
            {/* ============================================== */}

            <ScrollView
              style={
                styles.scroll
              }
              refreshControl={
                <RefreshControl
                  refreshing={
                    refreshing
                  }
                  onRefresh={() =>
                    loadApplications(
                      true
                    )
                  }
                  tintColor={
                    COLORS.redBright
                  }
                />
              }
              contentContainerStyle={[
                styles.content,

                {
                  paddingHorizontal:
                    48 * s,

                  paddingVertical:
                    32 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* TITLE */}

              <View
                style={{
                  marginBottom:
                    24 * s,
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
                  Donor Applications
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
                  Review and verify donor registrations and identity documents.
                </Text>
              </View>

              {/* ============================================== */}
              {/* FILTERS */}
              {/* ============================================== */}

              <View
                style={[
                  styles.filters,

                  {
                    gap:
                      10 * s,

                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <FilterButton
                  scale={
                    s
                  }
                  label="All"
                  count={
                    summary?.total ??
                    0
                  }
                  active={
                    filter ===
                    'all'
                  }
                  onPress={() =>
                    setFilter(
                      'all'
                    )
                  }
                />

                <FilterButton
                  scale={
                    s
                  }
                  label="Pending"
                  count={
                    summary?.pending ??
                    0
                  }
                  active={
                    filter ===
                    'pending'
                  }
                  alert
                  onPress={() =>
                    setFilter(
                      'pending'
                    )
                  }
                />

                <FilterButton
                  scale={
                    s
                  }
                  label="Approved"
                  count={
                    summary?.approved ??
                    0
                  }
                  active={
                    filter ===
                    'approved'
                  }
                  positive
                  onPress={() =>
                    setFilter(
                      'approved'
                    )
                  }
                />

                <FilterButton
                  scale={
                    s
                  }
                  label="Rejected"
                  count={
                    summary?.rejected ??
                    0
                  }
                  active={
                    filter ===
                    'rejected'
                  }
                  onPress={() =>
                    setFilter(
                      'rejected'
                    )
                  }
                />

                <FilterButton
                  scale={
                    s
                  }
                  label="Withdrawn"
                  count={
                    summary?.withdrawn ??
                    0
                  }
                  active={
                    filter ===
                    'withdrawn'
                  }
                  onPress={() =>
                    setFilter(
                      'withdrawn'
                    )
                  }
                />
              </View>

              {/* ============================================== */}
              {/* APPLICATION TABLE */}
              {/* ============================================== */}

              <View
                style={[
                  styles.listCard,

                  {
                    borderRadius:
                      14 * s,
                  },
                ]}
              >
                {/* TABLE HEADER */}

                <View
                  style={[
                    styles.tableHeader,

                    {
                      minHeight:
                        56 * s,

                      paddingHorizontal:
                        22 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.headerApplicant,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Donor
                  </Text>

                  <Text
                    style={[
                      styles.headerBlood,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Blood Type
                  </Text>

                  <Text
                    style={[
                      styles.headerAvailability,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Availability
                  </Text>

                  <Text
                    style={[
                      styles.headerRadius,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Radius
                  </Text>

                  <Text
                    style={[
                      styles.headerSubmitted,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Submitted
                  </Text>

                  <Text
                    style={[
                      styles.headerStatus,
                      styles.tableHeaderText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Status
                  </Text>

                  <View
                    style={
                      styles.headerAction
                    }
                  />
                </View>

                {/* LOADING */}

                {loading ? (
                  <View
                    style={[
                      styles.loadingArea,

                      {
                        minHeight:
                          360 * s,
                      },
                    ]}
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
                            12 * s,

                          marginTop:
                            14 * s,
                        },
                      ]}
                    >
                      Loading donor applications...
                    </Text>
                  </View>
                ) : error ? (
                  <View
                    style={[
                      styles.emptyArea,

                      {
                        minHeight:
                          360 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={
                        42 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />

                    <Text
                      style={[
                        styles.emptyTitle,

                        {
                          fontSize:
                            18 * s,

                          marginTop:
                            14 * s,
                        },
                      ]}
                    >
                      Unable to Load Applications
                    </Text>

                    <Text
                      style={[
                        styles.emptyText,

                        {
                          fontSize:
                            12 * s,

                          marginTop:
                            6 * s,
                        },
                      ]}
                    >
                      {
                        error
                      }
                    </Text>
                  </View>
                ) : applications.length ===
                  0 ? (
                  <View
                    style={[
                      styles.emptyArea,

                      {
                        minHeight:
                          360 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="assignment-turned-in"
                      size={
                        46 * s
                      }
                      color={
                        COLORS.muted
                      }
                    />

                    <Text
                      style={[
                        styles.emptyTitle,

                        {
                          fontSize:
                            18 * s,

                          marginTop:
                            14 * s,
                        },
                      ]}
                    >
                      No Applications Found
                    </Text>

                    <Text
                      style={[
                        styles.emptyText,

                        {
                          fontSize:
                            12 * s,

                          marginTop:
                            6 * s,
                        },
                      ]}
                    >
                      There are no{' '}
                      {filter ===
                      'all'
                        ? ''
                        : filter}{' '}
                      donor applications right now.
                    </Text>
                  </View>
                ) : (
                  applications.map(
                    application => (
                      <ApplicationRow
                        key={
                          application.id
                        }
                        application={
                          application
                        }
                        scale={
                          s
                        }
                        onPress={() =>
                          openApplication(
                            application.id
                          )
                        }
                      />
                    )
                  )
                )}
              </View>
            </ScrollView>

            {/* ============================================== */}
            {/* SHARED ADMIN BOTTOM NAVIGATION */}
            {/* ============================================== */}

            <AdminBottomNav
              activeTab="applications"
            />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  scale,
  label,
  count,
  active,
  alert = false,
  positive = false,
  onPress,
}: {
  scale: number;

  label: string;

  count: number;

  active: boolean;

  alert?: boolean;

  positive?: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={[
        styles.filterButton,

        {
          height:
            44 * scale,

          paddingHorizontal:
            16 * scale,

          borderRadius:
            10 * scale,

          gap:
            8 * scale,
        },

        active &&
          styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,

          {
            fontSize:
              11 * scale,
          },

          active &&
            styles.filterTextActive,
        ]}
      >
        {
          label
        }
      </Text>

      <View
        style={[
          styles.filterCount,

          {
            minWidth:
              24 * scale,

            height:
              24 * scale,

            borderRadius:
              12 * scale,

            paddingHorizontal:
              6 * scale,
          },

          alert &&
            styles.filterCountAlert,

          positive &&
            styles.filterCountPositive,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,

            {
              fontSize:
                10 * scale,
            },
          ]}
        >
          {
            count
          }
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================
// APPLICATION ROW
// ============================================================

function ApplicationRow({
  application,
  scale,
  onPress,
}: {
  application: DonorApplication;

  scale: number;

  onPress: () => void;
}) {
  const rawApplication =
    application as any;

  const user =
    application.user ||
    rawApplication.profile ||
    rawApplication.applicant ||
    null;

  const fullName =
    [
      user?.first_name,
      user?.middle_name,
      user?.last_name,
      user?.suffix,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  const displayName =
    fullName ||
    'Applicant';

  const displayEmail =
    user?.email ||
    'Email unavailable';

  const submitted =
    formatDate(
      application.submitted_at ||
        application.created_at
    );

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({ pressed }) => [
        styles.applicationRow,

        {
          minHeight:
            92 * scale,

          paddingHorizontal:
            22 * scale,
        },

        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={
          styles.applicantColumn
        }
      >
        <View
          style={
            styles.nameArea
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.applicantName,

              {
                fontSize:
                  13 * scale,
              },
            ]}
          >
            {
              displayName
            }
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={[
              styles.applicantEmail,

              {
                fontSize:
                  10 * scale,

                marginTop:
                  4 * scale,
              },
            ]}
          >
            {
              displayEmail
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.bloodColumn
        }
      >
        <BloodTypeBadge
          value={
            application.blood_type
          }
          scale={
            scale
          }
        />
      </View>

      <View
        style={
          styles.availabilityColumn
        }
      >
        <View
          style={
            styles.inlineValue
          }
        >
          <View
            style={[
              styles.dot,

              application.availability_status ===
              'available'
                ? styles.greenDot
                : styles.grayDot,
            ]}
          />

          <Text
            style={[
              styles.cellText,

              {
                fontSize:
                  11 * scale,
              },
            ]}
          >
            {application.availability_status ===
            'available'
              ? 'Available'
              : 'Unavailable'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.radiusColumn
        }
      >
        <Text
          style={[
            styles.cellText,

            {
              fontSize:
                11 * scale,
            },
          ]}
        >
          {application.travel_radius_km}{' '}
          km
        </Text>
      </View>

      <View
        style={
          styles.submittedColumn
        }
      >
        <Text
          style={[
            styles.cellMuted,

            {
              fontSize:
                11 * scale,
            },
          ]}
        >
          {
            submitted
          }
        </Text>
      </View>

      <View
        style={
          styles.statusColumn
        }
      >
        <StatusBadge
          status={
            application.status
          }
          scale={
            scale
          }
        />
      </View>

      <View
        style={
          styles.actionColumn
        }
      >
        <MaterialIcons
          name="chevron-right"
          size={
            22 * scale
          }
          color={
            COLORS.white
          }
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// BLOOD TYPE BADGE
// ============================================================

function BloodTypeBadge({
  value,
  scale,
}: {
  value: string;

  scale: number;
}) {
  return (
    <View
      style={[
        styles.bloodPill,

        {
          minWidth:
            44 * scale,

          height:
            30 * scale,

          borderRadius:
            6 * scale,

          paddingHorizontal:
            11 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.bloodPillText,

          {
            fontSize:
              11 * scale,
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
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
  scale,
}: {
  status: string;

  scale: number;
}) {
  const normalized =
    String(
      status
    ).toLowerCase();

  return (
    <View
      style={[
        styles.statusPill,

        {
          minWidth:
            96 * scale,

          height:
            32 * scale,

          borderRadius:
            6 * scale,

          paddingHorizontal:
            12 * scale,
        },

        normalized ===
          'pending' &&
          styles.pendingPill,

        normalized ===
          'approved' &&
          styles.approvedPill,

        normalized ===
          'rejected' &&
          styles.rejectedPill,

        normalized ===
          'withdrawn' &&
          styles.withdrawnPill,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,

          {
            fontSize:
              11 * scale,
          },

          normalized ===
            'pending' &&
            styles.pendingPillText,

          normalized ===
            'approved' &&
            styles.approvedPillText,

          normalized ===
            'rejected' &&
            styles.rejectedPillText,

          normalized ===
            'withdrawn' &&
            styles.withdrawnPillText,
        ]}
      >
        {
          statusLabel(
            normalized
          )
        }
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function statusLabel(
  value: string
) {
  if (
    !value
  ) {
    return '';
  }

  return (
    value
      .charAt(
        0
      )
      .toUpperCase() +
    value.slice(
      1
    )
  );
}

function formatDate(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
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
    // FILTERS
    // ========================================================

    filters: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',
    },

    filterButton: {
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

    filterButtonActive: {
      borderColor:
        COLORS.redBright,

      backgroundColor:
        'rgba(219,10,10,0.15)',
    },

    filterText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterTextActive: {
      color:
        COLORS.white,
    },

    filterCount: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    filterCountAlert: {
      backgroundColor:
        'rgba(239,51,64,0.22)',
    },

    filterCountPositive: {
      backgroundColor:
        'rgba(53,201,130,0.18)',
    },

    filterCountText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',
    },

    // ========================================================
    // TABLE
    // ========================================================

    listCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    tableHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,

      backgroundColor:
        'rgba(12,20,40,0.94)',
    },

    tableHeaderText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    headerApplicant: {
      flex:
        2.4,
    },

    headerBlood: {
      flex:
        1,
    },

    headerAvailability: {
      flex:
        1.1,
    },

    headerRadius: {
      flex:
        0.8,
    },

    headerSubmitted: {
      flex:
        1,
    },

    headerStatus: {
      flex:
        1,
    },

    headerAction: {
      width:
        40,
    },

    applicationRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.rowBorder,

      backgroundColor:
        'transparent',
    },

    rowPressed: {
      backgroundColor:
        'rgba(255,255,255,0.02)',
    },

    applicantColumn: {
      flex:
        2.4,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    nameArea: {
      flex:
        1,

      minWidth:
        0,
    },

    applicantName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    applicantEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    bloodColumn: {
      flex:
        1,

      alignItems:
        'flex-start',
    },

    bloodPill: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        '#C21319',

      backgroundColor:
        'rgba(194,19,25,0.10)',
    },

    bloodPillText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_600SemiBold',
    },

    availabilityColumn: {
      flex:
        1.1,
    },

    inlineValue: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    dot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,
    },

    greenDot: {
      backgroundColor:
        COLORS.green,
    },

    grayDot: {
      backgroundColor:
        COLORS.muted,
    },

    radiusColumn: {
      flex:
        0.8,
    },

    submittedColumn: {
      flex:
        1,
    },

    statusColumn: {
      flex:
        1,

      alignItems:
        'flex-start',
    },

    actionColumn: {
      width:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cellText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_500Medium',
    },

    cellMuted: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // STATUS
    // ========================================================

    statusPill: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    pendingPill: {
      borderColor:
        '#C96C1E',

      backgroundColor:
        'rgba(201,108,30,0.14)',
    },

    approvedPill: {
      borderColor:
        'rgba(53,201,130,0.45)',

      backgroundColor:
        'rgba(53,201,130,0.12)',
    },

    rejectedPill: {
      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    withdrawnPill: {
      borderColor:
        'rgba(144,155,183,0.40)',

      backgroundColor:
        'rgba(144,155,183,0.08)',
    },

    statusPillText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    pendingPillText: {
      color:
        COLORS.orange,
    },

    approvedPillText: {
      color:
        COLORS.green,
    },

    rejectedPillText: {
      color:
        COLORS.redBright,
    },

    withdrawnPillText: {
      color:
        COLORS.muted,
    },

    loadingArea: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    emptyArea: {
      paddingHorizontal:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    emptyText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },
  });