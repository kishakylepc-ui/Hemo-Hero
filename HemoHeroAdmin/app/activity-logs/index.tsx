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
import AdminHeader from '../AdminHeader';

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

  blue:
    '#6EA8FE',

  rowBorder:
    'rgba(36,53,84,0.78)',
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

  // ==========================================================
  // SCALE
  // ==========================================================

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

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

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
    value:
      StatusFilter
  ) {
    setPage(
      1
    );

    setStatusFilter(
      value
    );
  }

  function changeModuleFilter(
    value:
      ModuleFilter
  ) {
    setPage(
      1
    );

    setModuleFilter(
      value
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
                    32 * s,

                  paddingBottom:
                    32 * s,
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
                    Log Trails
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,

                      {
                        fontSize:
                          14 * fs,

                        marginTop:
                          4 * s,
                      },
                    ]}
                  >
                    Review recorded user and system activities.
                  </Text>
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
                  style={({
                    pressed,
                  }) => [
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
                  fontScale={
                    fs
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
                  fontScale={
                    fs
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
                  fontScale={
                    fs
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
                      14 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                {/* EMAIL SEARCH */}

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
                        COLORS.muted
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      style={[
                        styles.searchInput,

                        {
                          fontSize:
                            13 * fs,
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
                    style={({
                      pressed,
                    }) => [
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
                            13 * fs,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>

                {/* MODULE FILTER */}

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
                          11 * fs,

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
                    fontScale={
                      fs
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
                    fontScale={
                      fs
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
                    fontScale={
                      fs
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
                    fontScale={
                      fs
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

                {/* STATUS FILTER */}

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
                          11 * fs,

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
                    fontScale={
                      fs
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
                    fontScale={
                      fs
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
                    fontScale={
                      fs
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
                          12 * fs,
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
                        52 * s,

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
                          11 * fs,
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
                          11 * fs,
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
                          11 * fs,
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
                          11 * fs,
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
                          11 * fs,
                      },
                    ]}
                  >
                    DATE / TIME
                  </Text>
                </View>

                {/* LOADING */}

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
                            12 * fs,

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
                            18 * fs,

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
                            12 * fs,

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
                        fontScale={
                          fs
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
                          11.5 * fs,
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
                      style={({
                        pressed,
                      }) => [
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
                              12 * fs,
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
                      style={({
                        pressed,
                      }) => [
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
                              12 * fs,
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
  fontScale,
  icon,
  title,
  value,
  color,
}: {
  scale:
    number;

  fontScale:
    number;

  icon:
    | 'history'
    | 'check-circle'
    | 'error';

  title:
    string;

  value:
    number;

  color:
    string;
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
                11 * fontScale,
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
                28 * fontScale,
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
  fontScale,
  label,
  selected,
  onPress,
}: {
  scale:
    number;

  fontScale:
    number;

  label:
    string;

  selected:
    boolean;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
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
              12 * fontScale,
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
  fontScale,
}: {
  log:
    ActivityLog;

  scale:
    number;

  fontScale:
    number;
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
      {/* ACTIVITY */}

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
                  12.5 * fontScale,
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
                  11.5 * fontScale,

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

      {/* USER */}

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
                12.5 * fontScale,
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
                11.5 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {log.user_role ||
            'No role'}
        </Text>
      </View>

      {/* MODULE */}

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
                12.5 * fontScale,
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
                11.5 * fontScale,

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

      {/* STATUS */}

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
                  11.5 * fontScale,
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

      {/* DATE */}

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
                12.5 * fontScale,
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
                11.5 * fontScale,

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
  action:
    string
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
  action:
    string
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
  value:
    string
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

    refreshText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

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
        COLORS.soft,

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
        COLORS.cardLight,
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
        COLORS.cardLight,
    },

    filterChipSelected: {
      borderColor:
        COLORS.redBright,

      backgroundColor:
        'rgba(219,10,10,0.15)',
    },

    filterChipText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterChipTextSelected: {
      color:
        COLORS.white,
    },

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
        'rgba(12,20,40,0.94)',
    },

    tableHeaderText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

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
        COLORS.rowBorder,
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

    statusBadge: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderWidth:
        1,
    },

    statusDot: {},

    successBadge: {
      borderColor:
        'rgba(53,201,130,0.35)',

      backgroundColor:
        'rgba(53,201,130,0.12)',
    },

    failedBadge: {
      borderColor:
        'rgba(239,51,64,0.40)',

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

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    pageButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

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