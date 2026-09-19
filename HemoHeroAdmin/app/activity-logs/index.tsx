import {
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
  TextInput,
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
  getAdminActivityLogs,
  getAdminActivityLogSummary,
  type ActivityLog,
  type ActivityLogPagination,
  type ActivityLogSummary,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// IPAD PRO DESIGN
// ============================================================

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

const PAGE_LIMIT =
  15;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer:
    '#02040A',

  navy:
    '#071126',

  card:
    '#0D1830',

  cardLight:
    '#14223F',

  border:
    '#243554',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#909BB7',

  green:
    '#38C983',

  blue:
    '#6EA8FE',
};

// ============================================================
// FILTER TYPES
// ============================================================

type StatusFilter =
  | 'all'
  | 'successful'
  | 'failed';

type ModuleFilter =
  | 'all'
  | 'Authentication'
  | 'Profile'
  | 'Account Security';

// ============================================================
// SCREEN
// ============================================================

export default function ActivityLogsScreen() {
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
    logs,
    setLogs,
  ] =
    useState<ActivityLog[]>(
      []
    );

  const [
    summary,
    setSummary,
  ] =
    useState<ActivityLogSummary>({
      total:
        0,

      successful:
        0,

      failed:
        0,
    });

  const [
    pagination,
    setPagination,
  ] =
    useState<ActivityLogPagination>({
      page:
        1,

      limit:
        PAGE_LIMIT,

      total:
        0,

      total_pages:
        0,
    });

  const [
    page,
    setPage,
  ] =
    useState(
      1
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ''
    );

  const [
    emailInput,
    setEmailInput,
  ] =
    useState(
      ''
    );

  const [
    emailFilter,
    setEmailFilter,
  ] =
    useState(
      ''
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      'all'
    );

  const [
    moduleFilter,
    setModuleFilter,
  ] =
    useState<ModuleFilter>(
      'all'
    );

  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(
    () => {
      loadLogs();
    },
    [
      page,
      emailFilter,
      statusFilter,
      moduleFilter,
    ]
  );

  async function loadLogs(
    refreshOnly = false
  ) {
    try {
      if (
        refreshOnly
      ) {
        setRefreshing(
          true
        );
      } else {
        setLoading(
          true
        );
      }

      setErrorMessage(
        ''
      );

      // ------------------------------------------------------
      // SESSION
      // ------------------------------------------------------

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      // ------------------------------------------------------
      // ADMIN PROTECTION
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
      // STATUS FILTER
      // ------------------------------------------------------

      let success:
        | boolean
        | undefined =
        undefined;

      if (
        statusFilter ===
        'successful'
      ) {
        success =
          true;
      }

      if (
        statusFilter ===
        'failed'
      ) {
        success =
          false;
      }

      // ------------------------------------------------------
      // LOAD SUMMARY + LOGS
      // ------------------------------------------------------

      const [
        summaryResult,
        logsResult,
      ] =
        await Promise.all([
          getAdminActivityLogSummary(
            token
          ),

          getAdminActivityLogs(
            token,
            {
              page,

              limit:
                PAGE_LIMIT,

              user_email:
                emailFilter ||
                undefined,

              success,

              module:
                moduleFilter ===
                'all'
                  ? undefined
                  : moduleFilter,
            }
          ),
        ]);

      setSummary(
        summaryResult
      );

      setLogs(
        logsResult.logs ||
          []
      );

      setPagination(
        logsResult.pagination
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN ACTIVITY LOG ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to load activity logs.'
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
  // SEARCH
  // ==========================================================

  function submitSearch() {
    setPage(
      1
    );

    setEmailFilter(
      emailInput
        .trim()
        .toLowerCase()
    );
  }

  function clearSearch() {
    setEmailInput(
      ''
    );

    setEmailFilter(
      ''
    );

    setPage(
      1
    );
  }

  // ==========================================================
  // FILTERS
  // ==========================================================

  function changeStatusFilter(
    value: StatusFilter
  ) {
    setPage(
      1
    );

    setStatusFilter(
      value
    );
  }

  function changeModuleFilter(
    value: ModuleFilter
  ) {
    setPage(
      1
    );

    setModuleFilter(
      value
    );
  }

  // ==========================================================
  // ADMIN DISPLAY
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

        <LinearGradient
          colors={[
            '#102454',
            COLORS.navy,
            '#050B19',
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
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
                style={({ pressed }) => [
                  styles.brandButton,

                  pressed &&
                    styles.pressed,
                ]}
              >
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
                        1.8 * s,
                    },
                  ]}
                >
                  ADMIN PORTAL
                </Text>
              </Pressable>

              {/* ================================================
                  ADMIN
              ================================================ */}

              <View
                style={
                  styles.adminSection
                }
              >
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

                <View>
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
                    Administrator
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
                    28 * s,

                  paddingBottom:
                    36 * s,
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
                      24 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.titleLeft
                  }
                >
                  <Pressable
                    onPress={() =>
                      router.replace(
                        '/dashboard'
                      )
                    }
                    style={({ pressed }) => [
                      styles.backButton,

                      {
                        width:
                          43 * s,

                        height:
                          43 * s,

                        borderRadius:
                          11 * s,

                        marginRight:
                          14 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </Pressable>

                  <View>
                    <Text
                      style={[
                        styles.title,

                        {
                          fontSize:
                            30 * s,

                          lineHeight:
                            38 * s,
                        },
                      ]}
                    >
                      Log Trails
                    </Text>

                    <Text
                      style={[
                        styles.subtitle,

                        {
                          fontSize:
                            12 * s,

                          marginTop:
                            3 * s,
                        },
                      ]}
                    >
                      Review recorded user and system activities.
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={
                    refreshing
                  }
                  onPress={() =>
                    loadLogs(
                      true
                    )
                  }
                  style={({ pressed }) => [
                    styles.refreshButton,

                    {
                      height:
                        45 * s,

                      paddingHorizontal:
                        18 * s,

                      borderRadius:
                        10 * s,

                      gap:
                        8 * s,
                    },

                    pressed &&
                      styles.pressed,

                    refreshing &&
                      styles.disabled,
                  ]}
                >
                  {refreshing ? (
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
                          20 * s
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
                  SUMMARY
              ================================================ */}

              <View
                style={[
                  styles.summaryRow,

                  {
                    gap:
                      16 * s,

                    marginBottom:
                      20 * s,
                  },
                ]}
              >
                <SummaryCard
                  scale={
                    s
                  }
                  icon="history"
                  title="TOTAL ACTIVITIES"
                  value={
                    summary.total
                  }
                  color={
                    COLORS.blue
                  }
                />

                <SummaryCard
                  scale={
                    s
                  }
                  icon="check-circle"
                  title="SUCCESSFUL"
                  value={
                    summary.successful
                  }
                  color={
                    COLORS.green
                  }
                />

                <SummaryCard
                  scale={
                    s
                  }
                  icon="error"
                  title="FAILED"
                  value={
                    summary.failed
                  }
                  color={
                    COLORS.redBright
                  }
                />
              </View>

              {/* ================================================
                  FILTER CARD
              ================================================ */}

              <View
                style={[
                  styles.filterCard,

                  {
                    padding:
                      18 * s,

                    borderRadius:
                      15 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                {/* ==============================================
                    EMAIL SEARCH
                ============================================== */}

                <View
                  style={[
                    styles.searchRow,

                    {
                      gap:
                        10 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.searchInputContainer,

                      {
                        height:
                          45 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          14 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={
                        20 * s
                      }
                      color={
                        COLORS.muted
                      }
                    />

                    <TextInput
                      value={
                        emailInput
                      }
                      onChangeText={
                        setEmailInput
                      }
                      onSubmitEditing={
                        submitSearch
                      }
                      placeholder="Search by user email"
                      placeholderTextColor={
                        '#66738F'
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      style={[
                        styles.searchInput,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    />

                    {emailInput ? (
                      <Pressable
                        onPress={
                          clearSearch
                        }
                      >
                        <MaterialIcons
                          name="close"
                          size={
                            19 * s
                          }
                          color={
                            COLORS.muted
                          }
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={
                      submitSearch
                    }
                    style={({ pressed }) => [
                      styles.searchButton,

                      {
                        height:
                          45 * s,

                        paddingHorizontal:
                          20 * s,

                        borderRadius:
                          10 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.searchButtonText,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>

                {/* ==============================================
                    MODULE FILTER
                ============================================== */}

                <View
                  style={[
                    styles.filterSection,

                    {
                      marginTop:
                        15 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,

                      {
                        fontSize:
                          9 * s,

                        marginRight:
                          10 * s,
                      },
                    ]}
                  >
                    MODULE
                  </Text>

                  <FilterChip
                    scale={
                      s
                    }
                    label="All"
                    selected={
                      moduleFilter ===
                      'all'
                    }
                    onPress={() =>
                      changeModuleFilter(
                        'all'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Authentication"
                    selected={
                      moduleFilter ===
                      'Authentication'
                    }
                    onPress={() =>
                      changeModuleFilter(
                        'Authentication'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Profile"
                    selected={
                      moduleFilter ===
                      'Profile'
                    }
                    onPress={() =>
                      changeModuleFilter(
                        'Profile'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Account Security"
                    selected={
                      moduleFilter ===
                      'Account Security'
                    }
                    onPress={() =>
                      changeModuleFilter(
                        'Account Security'
                      )
                    }
                  />
                </View>

                {/* ==============================================
                    STATUS FILTER
                ============================================== */}

                <View
                  style={[
                    styles.filterSection,

                    {
                      marginTop:
                        10 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,

                      {
                        fontSize:
                          9 * s,

                        marginRight:
                          10 * s,
                      },
                    ]}
                  >
                    STATUS
                  </Text>

                  <FilterChip
                    scale={
                      s
                    }
                    label="All"
                    selected={
                      statusFilter ===
                      'all'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'all'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Successful"
                    selected={
                      statusFilter ===
                      'successful'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'successful'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Failed"
                    selected={
                      statusFilter ===
                      'failed'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'failed'
                      )
                    }
                  />
                </View>
              </View>

              {/* ================================================
                  ERROR
              ================================================ */}

              {errorMessage ? (
                <View
                  style={[
                    styles.errorCard,

                    {
                      borderRadius:
                        12 * s,

                      padding:
                        14 * s,

                      marginBottom:
                        18 * s,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={
                      21 * s
                    }
                    color={
                      COLORS.redBright
                    }
                  />

                  <Text
                    style={[
                      styles.errorText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    {
                      errorMessage
                    }
                  </Text>
                </View>
              ) : null}

              {/* ================================================
                  TABLE
              ================================================ */}

              <View
                style={[
                  styles.tableCard,

                  {
                    borderRadius:
                      15 * s,
                  },
                ]}
              >
                {/* ==============================================
                    TABLE HEADER
                ============================================== */}

                <View
                  style={[
                    styles.tableHeader,

                    {
                      minHeight:
                        49 * s,

                      paddingHorizontal:
                        17 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colActivity,

                      {
                        fontSize:
                          9 * s,
                      },
                    ]}
                  >
                    ACTIVITY
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colUser,

                      {
                        fontSize:
                          9 * s,
                      },
                    ]}
                  >
                    USER
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colModule,

                      {
                        fontSize:
                          9 * s,
                      },
                    ]}
                  >
                    MODULE
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colStatus,

                      {
                        fontSize:
                          9 * s,
                      },
                    ]}
                  >
                    STATUS
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colDate,

                      {
                        fontSize:
                          9 * s,
                      },
                    ]}
                  >
                    DATE / TIME
                  </Text>
                </View>

                {/* ==============================================
                    LOADING
                ============================================== */}

                {loading ? (
                  <View
                    style={[
                      styles.loading,

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
                            11 * s,

                          marginTop:
                            12 * s,
                        },
                      ]}
                    >
                      Loading activity logs...
                    </Text>
                  </View>
                ) : logs.length ===
                  0 ? (
                  // ============================================
                  // EMPTY
                  // ============================================

                  <View
                    style={[
                      styles.emptyState,

                      {
                        minHeight:
                          330 * s,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIcon,

                        {
                          width:
                            68 * s,

                          height:
                            68 * s,

                          borderRadius:
                            34 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="history"
                        size={
                          34 * s
                        }
                        color={
                          COLORS.muted
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.emptyTitle,

                        {
                          fontSize:
                            17 * s,

                          marginTop:
                            15 * s,
                        },
                      ]}
                    >
                      No activity logs found
                    </Text>

                    <Text
                      style={[
                        styles.emptyText,

                        {
                          fontSize:
                            11 * s,

                          marginTop:
                            5 * s,
                        },
                      ]}
                    >
                      Try changing your search or filters.
                    </Text>
                  </View>
                ) : (
                  logs.map(
                    log => (
                      <ActivityRow
                        key={
                          log.id
                        }
                        log={
                          log
                        }
                        scale={
                          s
                        }
                      />
                    )
                  )
                )}
              </View>

              {/* ================================================
                  PAGINATION
              ================================================ */}

              {!loading &&
              pagination.total >
                0 ? (
                <View
                  style={[
                    styles.pagination,

                    {
                      marginTop:
                        17 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.paginationText,

                      {
                        fontSize:
                          10 * s,
                      },
                    ]}
                  >
                    Showing page{' '}
                    {
                      pagination.page
                    }{' '}
                    of{' '}
                    {
                      Math.max(
                        pagination.total_pages,
                        1
                      )
                    }{' '}
                    •{' '}
                    {
                      pagination.total
                    }{' '}
                    total records
                  </Text>

                  <View
                    style={[
                      styles.paginationButtons,

                      {
                        gap:
                          8 * s,
                      },
                    ]}
                  >
                    <Pressable
                      disabled={
                        page <=
                        1
                      }
                      onPress={() =>
                        setPage(
                          current =>
                            Math.max(
                              current -
                                1,
                              1
                            )
                        )
                      }
                      style={({ pressed }) => [
                        styles.pageButton,

                        {
                          height:
                            39 * s,

                          paddingHorizontal:
                            14 * s,

                          borderRadius:
                            9 * s,
                        },

                        pressed &&
                          styles.pressed,

                        page <=
                          1 &&
                          styles.disabled,
                      ]}
                    >
                      <MaterialIcons
                        name="chevron-left"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.pageButtonText,

                          {
                            fontSize:
                              10 * s,
                          },
                        ]}
                      >
                        Previous
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        page >=
                        pagination.total_pages
                      }
                      onPress={() =>
                        setPage(
                          current =>
                            current +
                            1
                        )
                      }
                      style={({ pressed }) => [
                        styles.pageButton,

                        {
                          height:
                            39 * s,

                          paddingHorizontal:
                            14 * s,

                          borderRadius:
                            9 * s,
                        },

                        pressed &&
                          styles.pressed,

                        page >=
                          pagination.total_pages &&
                          styles.disabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,

                          {
                            fontSize:
                              10 * s,
                          },
                        ]}
                      >
                        Next
                      </Text>

                      <MaterialIcons
                        name="chevron-right"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.white
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {/* ==================================================
                SHARED ADMIN HOTBAR
            ================================================== */}

            <AdminBottomNav
              activeTab="activityLogs"
            />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  scale,
  icon,
  title,
  value,
  color,
}: {
  scale: number;

  icon:
    | 'history'
    | 'check-circle'
    | 'error';

  title: string;

  value: number;

  color: string;
}) {
  return (
    <View
      style={[
        styles.summaryCard,

        {
          minHeight:
            112 * scale,

          padding:
            18 * scale,

          borderRadius:
            14 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,

          {
            width:
              42 * scale,

            height:
              42 * scale,

            borderRadius:
              11 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={
            icon
          }
          size={
            23 * scale
          }
          color={
            color
          }
        />
      </View>

      <View
        style={
          styles.summaryContent
        }
      >
        <Text
          style={[
            styles.summaryTitle,

            {
              fontSize:
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
            styles.summaryValue,

            {
              fontSize:
                28 * scale,
            },
          ]}
        >
          {
            value
          }
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// FILTER CHIP
// ============================================================

function FilterChip({
  scale,
  label,
  selected,
  onPress,
}: {
  scale: number;

  label: string;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({ pressed }) => [
        styles.filterChip,

        {
          minHeight:
            32 * scale,

          paddingHorizontal:
            12 * scale,

          borderRadius:
            8 * scale,
        },

        selected &&
          styles.filterChipSelected,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,

          {
            fontSize:
              9 * scale,
          },

          selected &&
            styles.filterChipTextSelected,
        ]}
      >
        {
          label
        }
      </Text>
    </Pressable>
  );
}

// ============================================================
// ACTIVITY ROW
// ============================================================

function ActivityRow({
  log,
  scale,
}: {
  log: ActivityLog;

  scale: number;
}) {
  const actionLabel =
    formatAction(
      log.action
    );

  const dateLabel =
    formatDate(
      log.created_at
    );

  const userLabel =
    log.user_email ||
    'Unknown user';

  return (
    <View
      style={[
        styles.tableRow,

        {
          minHeight:
            70 * scale,

          paddingHorizontal:
            17 * scale,

          paddingVertical:
            10 * scale,
        },
      ]}
    >
      {/* ======================================================
          ACTIVITY
      ====================================================== */}

      <View
        style={[
          styles.colActivity,
          styles.activityCell,
        ]}
      >
        <View
          style={[
            styles.activityIcon,

            {
              width:
                34 * scale,

              height:
                34 * scale,

              borderRadius:
                9 * scale,

              marginRight:
                10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              getActionIcon(
                log.action
              )
            }
            size={
              18 * scale
            }
            color={
              COLORS.redBright
            }
          />
        </View>

        <View
          style={
            styles.activityTextWrap
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.rowPrimary,

              {
                fontSize:
                  10 * scale,
              },
            ]}
          >
            {
              actionLabel
            }
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={[
              styles.rowSecondary,

              {
                fontSize:
                  9 * scale,

                marginTop:
                  2 * scale,
              },
            ]}
          >
            {log.description ||
              'Activity recorded.'}
          </Text>
        </View>
      </View>

      {/* ======================================================
          USER
      ====================================================== */}

      <View
        style={
          styles.colUser
        }
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowPrimary,

            {
              fontSize:
                10 * scale,
            },
          ]}
        >
          {
            userLabel
          }
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowSecondary,

            {
              fontSize:
                9 * scale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {log.user_role ||
            'No role'}
        </Text>
      </View>

      {/* ======================================================
          MODULE
      ====================================================== */}

      <View
        style={
          styles.colModule
        }
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowPrimary,

            {
              fontSize:
                10 * scale,
            },
          ]}
        >
          {
            log.module
          }
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowSecondary,

            {
              fontSize:
                9 * scale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {log.http_method ||
            '—'}{' '}
          {log.status_code ??
            ''}
        </Text>
      </View>

      {/* ======================================================
          STATUS
      ====================================================== */}

      <View
        style={
          styles.colStatus
        }
      >
        <View
          style={[
            styles.statusBadge,

            {
              minHeight:
                27 * scale,

              paddingHorizontal:
                10 * scale,

              borderRadius:
                14 * scale,
            },

            log.success
              ? styles.successBadge
              : styles.failedBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,

              {
                width:
                  6 * scale,

                height:
                  6 * scale,

                borderRadius:
                  3 * scale,
              },

              log.success
                ? styles.successDot
                : styles.failedDot,
            ]}
          />

          <Text
            style={[
              styles.statusText,

              {
                fontSize:
                  9 * scale,
              },

              log.success
                ? styles.successText
                : styles.failedText,
            ]}
          >
            {log.success
              ? 'Successful'
              : 'Failed'}
          </Text>
        </View>
      </View>

      {/* ======================================================
          DATE
      ====================================================== */}

      <View
        style={
          styles.colDate
        }
      >
        <Text
          style={[
            styles.rowPrimary,

            {
              fontSize:
                10 * scale,
            },
          ]}
        >
          {
            dateLabel.date
          }
        </Text>

        <Text
          style={[
            styles.rowSecondary,

            {
              fontSize:
                9 * scale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {
            dateLabel.time
          }
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// ACTION FORMATTER
// ============================================================

function formatAction(
  action: string
) {
  return String(
    action ||
      'Activity'
  )
    .toLowerCase()
    .split('_')
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(
          1
        )
    )
    .join(' ');
}

// ============================================================
// ACTION ICON
// ============================================================

function getActionIcon(
  action: string
):
  | 'login'
  | 'logout'
  | 'person'
  | 'edit'
  | 'lock'
  | 'history' {
  const normalized =
    String(
      action
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
      'UPDATE'
    )
  ) {
    return 'edit';
  }

  if (
    normalized.includes(
      'PROFILE'
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
// DATE FORMATTER
// ============================================================

function formatDate(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date:
        'Unknown',

      time:
        '',
    };
  }

  return {
    date:
      date.toLocaleDateString(
        'en-PH',
        {
          month:
            'short',

          day:
            'numeric',

          year:
            'numeric',
        }
      ),

    time:
      date.toLocaleTimeString(
        'en-PH',
        {
          hour:
            'numeric',

          minute:
            '2-digit',

          hour12:
            true,
        }
      ),
  };
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

    scroll: {
      flex:
        1,
    },

    content: {
      flexGrow:
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

    brandButton: {
      alignSelf:
        'center',
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
        'Inter_700Bold',
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        11,
    },

    avatar: {
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

    avatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      maxWidth:
        180,

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

    titleLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
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

    refreshButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    refreshText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryRow: {
      flexDirection:
        'row',
    },

    summaryCard: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    summaryIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    summaryContent: {
      marginLeft:
        14,

      flex:
        1,
    },

    summaryTitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.4,
    },

    summaryValue: {
      marginTop:
        1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    // ========================================================
    // FILTERS
    // ========================================================

    filterCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    searchRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    searchInputContainer: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        '#091327',
    },

    searchInput: {
      flex:
        1,

      height:
        '100%',

      paddingVertical:
        0,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      outlineStyle:
        'none',
    } as any,

    searchButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    searchButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        7,
    },

    filterLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.6,
    },

    filterChip: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        '#091327',
    },

    filterChipSelected: {
      borderColor:
        'rgba(239,51,64,0.75)',

      backgroundColor:
        'rgba(239,51,64,0.14)',
    },

    filterChipText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterChipTextSelected: {
      color:
        COLORS.redBright,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.55)',

      backgroundColor:
        'rgba(80,16,30,0.55)',
    },

    errorText: {
      flex:
        1,

      color:
        '#FFB8BE',

      fontFamily:
        'Inter_500Medium',
    },

    // ========================================================
    // TABLE
    // ========================================================

    tableCard: {
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
        COLORS.cardLight,
    },

    tableHeaderText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.45,
    },

    tableRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        'rgba(36,53,84,0.65)',
    },

    colActivity: {
      width:
        '30%',
    },

    colUser: {
      width:
        '25%',
    },

    colModule: {
      width:
        '18%',
    },

    colStatus: {
      width:
        '14%',
    },

    colDate: {
      width:
        '13%',
    },

    activityCell: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    activityIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    activityTextWrap: {
      flex:
        1,

      paddingRight:
        10,
    },

    rowPrimary: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    rowSecondary: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    statusDot: {},

    successBadge: {
      backgroundColor:
        'rgba(56,201,131,0.12)',
    },

    failedBadge: {
      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    successDot: {
      backgroundColor:
        COLORS.green,
    },

    failedDot: {
      backgroundColor:
        COLORS.redBright,
    },

    statusText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    successText: {
      color:
        COLORS.green,
    },

    failedText: {
      color:
        COLORS.redBright,
    },

    // ========================================================
    // LOADING / EMPTY
    // ========================================================

    loading: {
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

    emptyState: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
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
    },

    // ========================================================
    // PAGINATION
    // ========================================================

    pagination: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    paginationText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    paginationButtons: {
      flexDirection:
        'row',
    },

    pageButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    pageButtonText: {
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
        0.75,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity:
        0.42,
    },
  });