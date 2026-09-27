import {
  type ComponentProps,
  useCallback,
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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';

import {
  getAdminBloodRequests,
  type AdminBloodRequest,
  type AdminBloodRequestPagination,
  type AdminBloodRequestStatus,
  type AdminBloodRequestSummary,
  type AdminBloodRequestUrgency,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// DESIGN
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

const PAGE_LIMIT = 10;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer: '#02040A',

  navy: '#050B19',

  card: '#091126',

  cardLight: '#101A35',

  border: '#243554',

  rowBorder: 'rgba(36,53,84,0.72)',

  red: '#DB0A0A',

  redBright: '#EF3340',

  white: '#FFFFFF',

  muted: '#7F889F',

  soft: '#B7C1D8',

  green: '#35C982',

  orange: '#F3A34A',

  blue: '#4A8CFF',
};

// ============================================================
// FILTER TYPES
// ============================================================

type StatusFilter =
  | 'all'
  | AdminBloodRequestStatus;

type UrgencyFilter =
  | 'all'
  | AdminBloodRequestUrgency;

type BloodTypeFilter =
  | 'all'
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

// ============================================================
// FILTER OPTIONS
// ============================================================

const STATUS_OPTIONS: {
  label: string;
  value: StatusFilter;
}[] = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Active',
    value: 'active',
  },
  {
    label: 'Fulfilled',
    value: 'fulfilled',
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
  },
];

const BLOOD_TYPE_OPTIONS: BloodTypeFilter[] = [
  'all',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

const URGENCY_OPTIONS: {
  label: string;
  value: UrgencyFilter;
}[] = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Urgent',
    value: 'urgent',
  },
  {
    label: 'Scheduled',
    value: 'needed',
  },
];

// ============================================================
// DEFAULT DATA
// ============================================================

const DEFAULT_SUMMARY:
  AdminBloodRequestSummary = {
    total: 0,

    active: 0,

    fulfilled: 0,

    cancelled: 0,

    urgent_active: 0,

    scheduled_active: 0,

    active_units_needed: 0,
  };

const DEFAULT_PAGINATION:
  AdminBloodRequestPagination = {
    page: 1,

    limit: PAGE_LIMIT,

    total: 0,

    total_pages: 0,
  };

// ============================================================
// SCREEN
// ============================================================

export default function AdminBloodRequestsScreen() {
  const {
    width,
    height,
  } = useWindowDimensions();

  // ==========================================================
  // RESPONSIVE IPAD CANVAS
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
  // s  = layout
  // fs = readable iPad-style text
  // ==========================================================

  const s = Math.max(
    tablet.scale,
    0.68
  );

  const fs = Math.max(
    tablet.scale,
    0.92
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<AdminProfile | null>(
    null
  );

  const [
    requests,
    setRequests,
  ] = useState<AdminBloodRequest[]>(
    []
  );

  const [
    summary,
    setSummary,
  ] = useState<AdminBloodRequestSummary>(
    DEFAULT_SUMMARY
  );

  const [
    pagination,
    setPagination,
  ] = useState<AdminBloodRequestPagination>(
    DEFAULT_PAGINATION
  );

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    'all'
  );

  const [
    bloodTypeFilter,
    setBloodTypeFilter,
  ] = useState<BloodTypeFilter>(
    'all'
  );

  const [
    urgencyFilter,
    setUrgencyFilter,
  ] = useState<UrgencyFilter>(
    'all'
  );

  const [
    searchDraft,
    setSearchDraft,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  // ==========================================================
  // LOAD REQUESTS
  // ==========================================================

  const loadRequests = useCallback(
    async (
      options?: {
        refresh?: boolean;
      }
    ) => {
      try {
        if (
          options?.refresh
        ) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const token =
          await getAdminAccessToken();

        const storedProfile =
          await getAdminProfile();

        // ----------------------------------------------------
        // ADMIN PROTECTION
        // ----------------------------------------------------

        if (
          !token ||
          storedProfile?.role !== 'admin'
        ) {
          await clearAdminSession();

          router.replace('/');

          return;
        }

        setProfile(
          storedProfile
        );

        // ----------------------------------------------------
        // REQUESTS
        // ----------------------------------------------------

        const result =
          await getAdminBloodRequests(
            token,
            {
              page,

              limit:
                PAGE_LIMIT,

              status:
                statusFilter,

              blood_type:
                bloodTypeFilter,

              urgency:
                urgencyFilter,

              search,
            }
          );

        setRequests(
          result.requests ||
            []
        );

        setSummary(
          result.summary ||
            DEFAULT_SUMMARY
        );

        setPagination(
          result.pagination ||
            DEFAULT_PAGINATION
        );
      } catch (
        loadError
      ) {
        console.log(
          'ADMIN BLOOD REQUESTS ERROR:',
          loadError
        );

        setRequests([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load blood requests.'
        );
      } finally {
        setLoading(false);

        setRefreshing(false);
      }
    },
    [
      page,
      statusFilter,
      bloodTypeFilter,
      urgencyFilter,
      search,
    ]
  );

  // ==========================================================
  // LOAD ON FOCUS / FILTER CHANGE
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

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
  // SEARCH
  // ==========================================================

  function handleSearch() {
    const cleaned =
      searchDraft.trim();

    setPage(1);

    setSearch(
      cleaned
    );
  }

  function clearSearch() {
    setSearchDraft('');

    setSearch('');

    setPage(1);
  }

  // ==========================================================
  // STATUS FILTER
  // ==========================================================

  function handleStatusFilter(
    value:
      StatusFilter
  ) {
    setStatusFilter(
      value
    );

    setPage(1);
  }

  // ==========================================================
  // BLOOD TYPE FILTER
  // ==========================================================

  function handleBloodTypeFilter(
    value:
      BloodTypeFilter
  ) {
    setBloodTypeFilter(
      value
    );

    setPage(1);
  }

  // ==========================================================
  // URGENCY FILTER
  // ==========================================================

  function handleUrgencyFilter(
    value:
      UrgencyFilter
  ) {
    setUrgencyFilter(
      value
    );

    setPage(1);
  }

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  function resetFilters() {
    setStatusFilter(
      'all'
    );

    setBloodTypeFilter(
      'all'
    );

    setUrgencyFilter(
      'all'
    );

    setSearchDraft('');

    setSearch('');

    setPage(1);
  }

  // ==========================================================
  // PAGINATION
  // ==========================================================

  function goPrevious() {
    if (
      page <= 1
    ) {
      return;
    }

    setPage(
      current =>
        current - 1
    );
  }

  function goNext() {
    if (
      page >=
      pagination.total_pages
    ) {
      return;
    }

    setPage(
      current =>
        current + 1
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

          Platform.OS !== 'web' &&
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
              {/* BRAND */}

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
                          26 * fs,
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
                          11 * fs,

                        letterSpacing:
                          1.5 * s,
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
                  style={[
                    styles.adminAvatar,

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
                      styles.adminAvatarText,

                      {
                        fontSize:
                          16 * fs,
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
                          14 * fs,
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
                          12 * fs,
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
                    30 * s,

                  paddingBottom:
                    38 * s,
                },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={
                    refreshing
                  }
                  onRefresh={() =>
                    loadRequests({
                      refresh:
                        true,
                    })
                  }
                  tintColor={
                    COLORS.redBright
                  }
                />
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* ==================================================
                  PAGE TITLE
              ================================================== */}

              <View
                style={[
                  styles.pageHeader,

                  {
                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.pageHeading
                  }
                >
                  <View
                    style={[
                      styles.pageIcon,

                      {
                        width:
                          48 * s,

                        height:
                          48 * s,

                        borderRadius:
                          12 * s,

                        marginRight:
                          13 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={
                        27 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />
                  </View>

                  <View>
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
                      Blood Requests
                    </Text>

                    <Text
                      style={[
                        styles.pageSubtitle,

                        {
                          fontSize:
                            14 * fs,

                          lineHeight:
                            21 * fs,

                          marginTop:
                            2 * s,
                        },
                      ]}
                    >
                      Monitor blood requests, demand, urgency, and fulfillment.
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={
                    loading
                  }
                  onPress={() =>
                    loadRequests()
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.refreshButton,

                    {
                      height:
                        46 * s,

                      borderRadius:
                        10 * s,

                      paddingHorizontal:
                        17 * s,

                      gap:
                        8 * s,
                    },

                    pressed &&
                      styles.buttonPressed,

                    loading &&
                      styles.disabled,
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
                          20 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.refreshButtonText,

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

              {/* ==================================================
                  SUMMARY
              ================================================== */}

              <View
                style={[
                  styles.summaryRow,

                  {
                    gap:
                      14 * s,

                    marginBottom:
                      22 * s,
                  },
                ]}
              >
                <SummaryCard
                  scale={s}
                  fontScale={fs}
                  icon="bloodtype"
                  label="ACTIVE REQUESTS"
                  value={
                    summary.active
                  }
                  description={`${summary.active_units_needed} units currently needed`}
                  accent="red"
                />

                <SummaryCard
                  scale={s}
                  fontScale={fs}
                  icon="priority-high"
                  label="URGENT"
                  value={
                    summary.urgent_active
                  }
                  description="Active urgent requests"
                  accent="orange"
                />

                <SummaryCard
                  scale={s}
                  fontScale={fs}
                  icon="event"
                  label="SCHEDULED"
                  value={
                    summary.scheduled_active
                  }
                  description="Requests with planned dates"
                  accent="blue"
                />

                <SummaryCard
                  scale={s}
                  fontScale={fs}
                  icon="check-circle"
                  label="FULFILLED"
                  value={
                    summary.fulfilled
                  }
                  description="Completed blood requests"
                  accent="green"
                />
              </View>

              {/* ==================================================
                  FILTER CARD
              ================================================== */}

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
                {/* SEARCH */}

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
                      styles.searchBox,

                      {
                        height:
                          48 * s,

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
                        21 * s
                      }
                      color={
                        COLORS.muted
                      }
                    />

                    <TextInput
                      value={
                        searchDraft
                      }
                      onChangeText={
                        setSearchDraft
                      }
                      onSubmitEditing={
                        handleSearch
                      }
                      placeholder="Search requester, email, facility, blood type, or request ID"
                      placeholderTextColor={
                        COLORS.muted
                      }
                      returnKeyType="search"
                      style={[
                        styles.searchInput,

                        {
                          fontSize:
                            14 * fs,

                          marginLeft:
                            9 * s,
                        },
                      ]}
                    />

                    {searchDraft ? (
                      <Pressable
                        onPress={
                          clearSearch
                        }
                        hitSlop={
                          10
                        }
                      >
                        <MaterialIcons
                          name="close"
                          size={
                            20 * s
                          }
                          color={
                            COLORS.soft
                          }
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={
                      handleSearch
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.searchButton,

                      {
                        height:
                          48 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          18 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
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

                  <Pressable
                    onPress={
                      resetFilters
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.resetButton,

                      {
                        height:
                          48 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          16 * s,

                        gap:
                          6 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="restart-alt"
                      size={
                        19 * s
                      }
                      color={
                        COLORS.soft
                      }
                    />

                    <Text
                      style={[
                        styles.resetButtonText,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    >
                      Reset
                    </Text>
                  </Pressable>
                </View>

                {/* STATUS */}

                <FilterSection
                  scale={s}
                  fontScale={fs}
                  title="STATUS"
                >
                  {STATUS_OPTIONS.map(
                    option => (
                      <FilterChip
                        key={
                          option.value
                        }
                        scale={s}
                        fontScale={fs}
                        label={
                          option.label
                        }
                        selected={
                          statusFilter ===
                          option.value
                        }
                        onPress={() =>
                          handleStatusFilter(
                            option.value
                          )
                        }
                      />
                    )
                  )}
                </FilterSection>

                {/* BLOOD TYPE */}

                <FilterSection
                  scale={s}
                  fontScale={fs}
                  title="BLOOD TYPE"
                >
                  {BLOOD_TYPE_OPTIONS.map(
                    bloodType => (
                      <FilterChip
                        key={
                          bloodType
                        }
                        scale={s}
                        fontScale={fs}
                        label={
                          bloodType ===
                          'all'
                            ? 'All'
                            : bloodType
                        }
                        selected={
                          bloodTypeFilter ===
                          bloodType
                        }
                        onPress={() =>
                          handleBloodTypeFilter(
                            bloodType
                          )
                        }
                        blood={
                          bloodType !==
                          'all'
                        }
                      />
                    )
                  )}
                </FilterSection>

                {/* URGENCY */}

                <FilterSection
                  scale={s}
                  fontScale={fs}
                  title="URGENCY"
                  last
                >
                  {URGENCY_OPTIONS.map(
                    option => (
                      <FilterChip
                        key={
                          option.value
                        }
                        scale={s}
                        fontScale={fs}
                        label={
                          option.label
                        }
                        selected={
                          urgencyFilter ===
                          option.value
                        }
                        onPress={() =>
                          handleUrgencyFilter(
                            option.value
                          )
                        }
                      />
                    )
                  )}
                </FilterSection>
              </View>

              {/* ==================================================
                  RESULTS CARD
              ================================================== */}

              <View
                style={[
                  styles.resultsCard,

                  {
                    borderRadius:
                      14 * s,
                  },
                ]}
              >
                {/* RESULTS HEADER */}

                <View
                  style={[
                    styles.resultsHeader,

                    {
                      minHeight:
                        70 * s,

                      paddingHorizontal:
                        20 * s,

                      paddingVertical:
                        14 * s,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.resultsTitle,

                        {
                          fontSize:
                            17 * fs,
                        },
                      ]}
                    >
                      Request Records
                    </Text>

                    <Text
                      style={[
                        styles.resultsSubtitle,

                        {
                          fontSize:
                            12 * fs,

                          marginTop:
                            2 * s,
                        },
                      ]}
                    >
                      {pagination.total}{' '}
                      {pagination.total ===
                      1
                        ? 'request'
                        : 'requests'}{' '}
                      found
                    </Text>
                  </View>

                  {search ? (
                    <View
                      style={[
                        styles.searchIndicator,

                        {
                          minHeight:
                            32 * s,

                          borderRadius:
                            16 * s,

                          paddingHorizontal:
                            11 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="search"
                        size={
                          15 * s
                        }
                        color={
                          COLORS.soft
                        }
                      />

                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.searchIndicatorText,

                          {
                            fontSize:
                              11 * fs,

                            marginLeft:
                              5 * s,
                          },
                        ]}
                      >
                        {search}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* LOADING */}

                {loading ? (
                  <View
                    style={[
                      styles.stateContainer,

                      {
                        minHeight:
                          300 * s,
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
                        styles.stateText,

                        {
                          fontSize:
                            14 * fs,

                          marginTop:
                            13 * s,
                        },
                      ]}
                    >
                      Loading blood requests...
                    </Text>
                  </View>
                ) : error ? (
                  /* ERROR */

                  <View
                    style={[
                      styles.stateContainer,

                      {
                        minHeight:
                          300 * s,
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
                        styles.errorTitle,

                        {
                          fontSize:
                            17 * fs,

                          marginTop:
                            12 * s,
                        },
                      ]}
                    >
                      Unable to Load Requests
                    </Text>

                    <Text
                      style={[
                        styles.stateText,

                        {
                          fontSize:
                            13 * fs,

                          lineHeight:
                            20 * fs,

                          marginTop:
                            5 * s,
                        },
                      ]}
                    >
                      {
                        error
                      }
                    </Text>

                    <Pressable
                      onPress={() =>
                        loadRequests()
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.retryButton,

                        {
                          height:
                            44 * s,

                          borderRadius:
                            9 * s,

                          paddingHorizontal:
                            18 * s,

                          marginTop:
                            18 * s,
                        },

                        pressed &&
                          styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.retryButtonText,

                          {
                            fontSize:
                              13 * fs,
                          },
                        ]}
                      >
                        Try Again
                      </Text>
                    </Pressable>
                  </View>
                ) : requests.length ===
                  0 ? (
                  /* EMPTY */

                  <View
                    style={[
                      styles.stateContainer,

                      {
                        minHeight:
                          300 * s,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIcon,

                        {
                          width:
                            60 * s,

                          height:
                            60 * s,

                          borderRadius:
                            30 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={
                          30 * s
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
                            17 * fs,

                          marginTop:
                            13 * s,
                        },
                      ]}
                    >
                      No blood requests found
                    </Text>

                    <Text
                      style={[
                        styles.stateText,

                        {
                          fontSize:
                            13 * fs,

                          lineHeight:
                            20 * fs,

                          marginTop:
                            5 * s,
                        },
                      ]}
                    >
                      Try changing the filters or search terms.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* ==========================================
                        TABLE
                    ========================================== */}

                    <View
                      style={
                        styles.table
                      }
                    >
                      {/* TABLE HEADER */}

                      <View
                        style={[
                          styles.tableHeader,

                          {
                            minHeight:
                              48 * s,

                            paddingHorizontal:
                              18 * s,
                          },
                        ]}
                      >
                        <TableHeaderCell
                          fontScale={fs}
                          flex={1.55}
                          text="REQUESTER"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={0.6}
                          text="BLOOD"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={0.55}
                          text="UNITS"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={1.45}
                          text="FACILITY"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={0.85}
                          text="URGENCY"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={0.85}
                          text="STATUS"
                        />

                        <TableHeaderCell
                          fontScale={fs}
                          flex={1}
                          text="CREATED"
                        />

                        <View
                          style={{
                            width:
                              40 * s,
                          }}
                        />
                      </View>

                      {/* TABLE ROWS */}

                      {requests.map(
                        (
                          request,
                          index
                        ) => (
                          <RequestRow
                            key={
                              request.id
                            }
                            request={
                              request
                            }
                            scale={s}
                            fontScale={fs}
                            last={
                              index ===
                              requests.length -
                                1
                            }
                          />
                        )
                      )}
                    </View>

                    {/* ==========================================
                        PAGINATION
                    ========================================== */}

                    <View
                      style={[
                        styles.pagination,

                        {
                          minHeight:
                            68 * s,

                          paddingHorizontal:
                            18 * s,

                          paddingVertical:
                            12 * s,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paginationText,

                          {
                            fontSize:
                              12 * fs,
                          },
                        ]}
                      >
                        Page{' '}
                        {pagination.page}{' '}
                        of{' '}
                        {Math.max(
                          pagination.total_pages,
                          1
                        )}
                      </Text>

                      <View
                        style={[
                          styles.paginationActions,

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
                          onPress={
                            goPrevious
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.pageButton,

                            {
                              height:
                                40 * s,

                              minWidth:
                                98 * s,

                              borderRadius:
                                9 * s,

                              gap:
                                5 * s,
                            },

                            page <=
                              1 &&
                              styles.disabled,

                            pressed &&
                              page >
                                1 &&
                              styles.buttonPressed,
                          ]}
                        >
                          <MaterialIcons
                            name="chevron-left"
                            size={
                              19 * s
                            }
                            color={
                              COLORS.soft
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
                            pagination.total_pages ===
                              0 ||
                            page >=
                              pagination.total_pages
                          }
                          onPress={
                            goNext
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.pageButton,

                            {
                              height:
                                40 * s,

                              minWidth:
                                82 * s,

                              borderRadius:
                                9 * s,

                              gap:
                                5 * s,
                            },

                            (
                              pagination.total_pages ===
                                0 ||
                              page >=
                                pagination.total_pages
                            ) &&
                              styles.disabled,

                            pressed &&
                              pagination.total_pages >
                                0 &&
                              page <
                                pagination.total_pages &&
                              styles.buttonPressed,
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
                              COLORS.soft
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {/* ==================================================
                BOTTOM NAV
            ================================================== */}

            <AdminBottomNav
              activeTab="requests"
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
  label,
  value,
  description,
  accent,
}: {
  scale: number;

  fontScale: number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  label: string;

  value: number;

  description: string;

  accent:
    | 'red'
    | 'orange'
    | 'green'
    | 'blue';
}) {
  const accentColor =
    accent === 'orange'
      ? COLORS.orange
      : accent === 'green'
        ? COLORS.green
        : accent === 'blue'
          ? COLORS.blue
          : COLORS.redBright;

  return (
    <View
      style={[
        styles.summaryCard,

        {
          minHeight:
            148 * scale,

          borderRadius:
            14 * scale,

          padding:
            18 * scale,
        },
      ]}
    >
      <View
        style={
          styles.summaryTop
        }
      >
        <View
          style={[
            styles.summaryIcon,

            {
              width:
                44 * scale,

              height:
                44 * scale,

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
              accentColor
            }
          />
        </View>

        <Text
          style={[
            styles.summaryValue,

            {
              fontSize:
                29 * fontScale,
            },
          ]}
        >
          {
            value
          }
        </Text>
      </View>

      <Text
        style={[
          styles.summaryLabel,

          {
            fontSize:
              12 * fontScale,

            marginTop:
              12 * scale,
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
          styles.summaryDescription,

          {
            fontSize:
              12 * fontScale,

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
// FILTER SECTION
// ============================================================

function FilterSection({
  scale,
  fontScale,
  title,
  children,
  last = false,
}: {
  scale: number;

  fontScale: number;

  title: string;

  children:
    React.ReactNode;

  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.filterSection,

        {
          marginTop:
            15 * scale,

          paddingBottom:
            last
              ? 0
              : 14 * scale,
        },

        !last &&
          styles.filterSectionBorder,
      ]}
    >
      <Text
        style={[
          styles.filterLabel,

          {
            fontSize:
              11 * fontScale,

            marginBottom:
              8 * scale,
          },
        ]}
      >
        {
          title
        }
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.filterChipRow,

          {
            gap:
              7 * scale,
          },
        ]}
      >
        {
          children
        }
      </ScrollView>
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
  blood = false,
}: {
  scale: number;

  fontScale: number;

  label: string;

  selected: boolean;

  onPress:
    () => void;

  blood?: boolean;
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
            36 * scale,

          borderRadius:
            18 * scale,

          paddingHorizontal:
            blood
              ? 14 * scale
              : 15 * scale,
        },

        selected &&
          styles.filterChipSelected,

        pressed &&
          styles.buttonPressed,
      ]}
    >
      {blood ? (
        <MaterialIcons
          name="bloodtype"
          size={
            15 * scale
          }
          color={
            selected
              ? COLORS.redBright
              : COLORS.muted
          }
        />
      ) : null}

      <Text
        style={[
          styles.filterChipText,

          {
            fontSize:
              12 * fontScale,

            marginLeft:
              blood
                ? 4 * scale
                : 0,
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
// TABLE HEADER
// ============================================================

function TableHeaderCell({
  fontScale,
  flex,
  text,
}: {
  fontScale: number;

  flex: number;

  text: string;
}) {
  return (
    <View
      style={{
        flex,
      }}
    >
      <Text
        style={[
          styles.tableHeaderText,

          {
            fontSize:
              11 * fontScale,
          },
        ]}
      >
        {
          text
        }
      </Text>
    </View>
  );
}

// ============================================================
// REQUEST ROW
// ============================================================

function RequestRow({
  request,
  scale,
  fontScale,
  last,
}: {
  request:
    AdminBloodRequest;

  scale: number;

  fontScale: number;

  last: boolean;
}) {
  const requesterName =
    getRequesterName(
      request
    );

  return (
    <Pressable
      onPress={() =>
        router.push(
          `/requests/${request.id}`
        )
      }
      style={({
        pressed,
      }) => [
        styles.requestRow,

        {
          minHeight:
            72 * scale,

          paddingHorizontal:
            18 * scale,

          paddingVertical:
            10 * scale,
        },

        last &&
          styles.noBottomBorder,

        pressed &&
          styles.requestRowPressed,
      ]}
    >
      {/* REQUESTER */}

      <View
        style={[
          styles.requesterCell,

          {
            flex:
              1.55,

            paddingRight:
              10 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.requesterAvatar,

            {
              width:
                38 * scale,

              height:
                38 * scale,

              borderRadius:
                19 * scale,

              marginRight:
                9 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.requesterAvatarText,

              {
                fontSize:
                  13 * fontScale,
              },
            ]}
          >
            {requesterName
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View
          style={
            styles.requesterInfo
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.primaryCellText,

              {
                fontSize:
                  13 * fontScale,
              },
            ]}
          >
            {
              requesterName
            }
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={[
              styles.secondaryCellText,

              {
                fontSize:
                  11.5 * fontScale,

                marginTop:
                  2 * scale,
              },
            ]}
          >
            {request.requester
              ?.email ||
              'Email unavailable'}
          </Text>
        </View>
      </View>

      {/* BLOOD */}

      <View
        style={{
          flex:
            0.6,
        }}
      >
        <View
          style={[
            styles.bloodBadge,

            {
              minWidth:
                46 * scale,

              height:
                34 * scale,

              borderRadius:
                8 * scale,

              paddingHorizontal:
                9 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.bloodBadgeText,

              {
                fontSize:
                  13 * fontScale,
              },
            ]}
          >
            {
              request.blood_type
            }
          </Text>
        </View>
      </View>

      {/* UNITS */}

      <View
        style={{
          flex:
            0.55,
        }}
      >
        <Text
          style={[
            styles.primaryCellText,

            {
              fontSize:
                13 * fontScale,
            },
          ]}
        >
          {
            request.units_needed
          }
        </Text>

        <Text
          style={[
            styles.secondaryCellText,

            {
              fontSize:
                11 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {request.units_needed ===
          1
            ? 'unit'
            : 'units'}
        </Text>
      </View>

      {/* FACILITY */}

      <View
        style={{
          flex:
            1.45,

          paddingRight:
            12 * scale,
        }}
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.primaryCellText,

            {
              fontSize:
                13 * fontScale,
            },
          ]}
        >
          {request.facility_name ||
            'Not provided'}
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.secondaryCellText,

            {
              fontSize:
                11.5 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {request.facility_address ||
            formatFacilityType(
              request.facility_type
            )}
        </Text>
      </View>

      {/* URGENCY */}

      <View
        style={{
          flex:
            0.85,
        }}
      >
        <UrgencyBadge
          urgency={
            request.urgency
          }
          scale={
            scale
          }
          fontScale={
            fontScale
          }
        />
      </View>

      {/* STATUS */}

      <View
        style={{
          flex:
            0.85,
        }}
      >
        <RequestStatusBadge
          status={
            request.status
          }
          scale={
            scale
          }
          fontScale={
            fontScale
          }
        />
      </View>

      {/* CREATED */}

      <View
        style={{
          flex:
            1,
        }}
      >
        <Text
          style={[
            styles.primaryCellText,

            {
              fontSize:
                12.5 * fontScale,
            },
          ]}
        >
          {formatDate(
            request.created_at
          )}
        </Text>

        <Text
          style={[
            styles.secondaryCellText,

            {
              fontSize:
                11 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {formatTime(
            request.created_at
          )}
        </Text>
      </View>

      {/* ACTION */}

      <View
        style={[
          styles.actionCell,

          {
            width:
              40 * scale,
          },
        ]}
      >
        <MaterialIcons
          name="chevron-right"
          size={
            23 * scale
          }
          color={
            COLORS.muted
          }
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// URGENCY BADGE
// ============================================================

function UrgencyBadge({
  urgency,
  scale,
  fontScale,
}: {
  urgency:
    AdminBloodRequestUrgency;

  scale:
    number;

  fontScale:
    number;
}) {
  const urgent =
    urgency ===
    'urgent';

  return (
    <View
      style={[
        styles.smallBadge,

        {
          minHeight:
            32 * scale,

          borderRadius:
            16 * scale,

          paddingHorizontal:
            9 * scale,
        },

        urgent
          ? styles.urgencyUrgent
          : styles.urgencyNeeded,
      ]}
    >
      <MaterialIcons
        name={
          urgent
            ? 'priority-high'
            : 'event'
        }
        size={
          14 * scale
        }
        color={
          urgent
            ? COLORS.orange
            : COLORS.blue
        }
      />

      <Text
        style={[
          styles.smallBadgeText,

          {
            fontSize:
              11 * fontScale,

            marginLeft:
              3 * scale,
          },

          urgent
            ? styles.urgencyUrgentText
            : styles.urgencyNeededText,
        ]}
      >
        {urgent
          ? 'Urgent'
          : 'Scheduled'}
      </Text>
    </View>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function RequestStatusBadge({
  status,
  scale,
  fontScale,
}: {
  status:
    AdminBloodRequestStatus;

  scale:
    number;

  fontScale:
    number;
}) {
  return (
    <View
      style={[
        styles.smallBadge,

        {
          minHeight:
            32 * scale,

          borderRadius:
            16 * scale,

          paddingHorizontal:
            10 * scale,
        },

        status ===
          'active' &&
          styles.statusActive,

        status ===
          'fulfilled' &&
          styles.statusFulfilled,

        status ===
          'cancelled' &&
          styles.statusCancelled,
      ]}
    >
      <Text
        style={[
          styles.smallBadgeText,

          {
            fontSize:
              11 * fontScale,
          },

          status ===
            'active' &&
            styles.statusActiveText,

          status ===
            'fulfilled' &&
            styles.statusFulfilledText,

          status ===
            'cancelled' &&
            styles.statusCancelledText,
        ]}
      >
        {
          formatValue(
            status
          )
        }
      </Text>
    </View>
  );
}

// ============================================================
// REQUESTER NAME
// ============================================================

function getRequesterName(
  request:
    AdminBloodRequest
) {
  const requester =
    request.requester;

  if (
    requester?.full_name
      ?.trim()
  ) {
    return requester.full_name.trim();
  }

  const name =
    [
      requester?.first_name,
      requester?.middle_name,
      requester?.last_name,
      requester?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return (
    name ||
    requester?.email ||
    'Unknown Requester'
  );
}

// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return '—';
  }

  return value
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

// ============================================================
// FACILITY TYPE
// ============================================================

function formatFacilityType(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return 'Address unavailable';
  }

  if (
    value ===
    'manual'
  ) {
    return 'Manually entered facility';
  }

  return formatValue(
    value
  );
}

// ============================================================
// DATE
// ============================================================

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
    return '—';
  }

  return date.toLocaleDateString(
    'en-PH',
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
// TIME
// ============================================================

function formatTime(
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
    return '—';
  }

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

    scroll: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
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

      gap: 14,
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
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',

      marginTop: 1,
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 11,
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    adminAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      maxWidth: 170,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      marginTop: 2,
    },

    // ========================================================
    // PAGE HEADER
    // ========================================================

    pageHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    pageHeading: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    pageIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

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

    refreshButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    refreshButtonText: {
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
      flex: 1,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    summaryTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    summaryIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    summaryValue: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    summaryLabel: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.3,
    },

    summaryDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // FILTERS
    // ========================================================

    filterCard: {
      borderWidth: 1,

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

    searchBox: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    searchInput: {
      flex: 1,

      height:
        '100%',

      padding: 0,

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

    resetButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    resetButtonText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterSection: {},

    filterSectionBorder: {
      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.rowBorder,
    },

    filterLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.5,
    },

    filterChipRow: {
      alignItems:
        'center',
    },

    filterChip: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    filterChipSelected: {
      borderColor:
        'rgba(239,51,64,0.65)',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    filterChipText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_500Medium',
    },

    filterChipTextSelected: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // RESULTS
    // ========================================================

    resultsCard: {
      overflow:
        'hidden',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    resultsHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    resultsTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    resultsSubtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    searchIndicator: {
      maxWidth: 270,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    searchIndicatorText: {
      flexShrink: 1,

      color:
        COLORS.soft,

      fontFamily:
        'Inter_500Medium',
    },

    // ========================================================
    // STATE
    // ========================================================

    stateContainer: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,
    },

    stateText: {
      maxWidth: 450,

      color:
        COLORS.muted,

      textAlign:
        'center',

      fontFamily:
        'Inter_400Regular',
    },

    errorTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
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

    retryButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    retryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // TABLE
    // ========================================================

    table: {
      width:
        '100%',
    },

    tableHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#0C1730',

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.border,
    },

    tableHeaderText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.4,
    },

    requestRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth: 1,

      borderBottomColor:
        COLORS.rowBorder,
    },

    requestRowPressed: {
      backgroundColor:
        '#0E1A34',
    },

    noBottomBorder: {
      borderBottomWidth: 0,
    },

    requesterCell: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    requesterAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    requesterAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    requesterInfo: {
      flex: 1,

      minWidth: 0,
    },

    primaryCellText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    secondaryCellText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    bloodBadge: {
      alignSelf:
        'flex-start',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        'rgba(239,51,64,0.48)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    bloodBadgeText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_600SemiBold',
    },

    smallBadge: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,
    },

    smallBadgeText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    urgencyUrgent: {
      borderColor:
        'rgba(243,163,74,0.45)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    urgencyUrgentText: {
      color:
        COLORS.orange,
    },

    urgencyNeeded: {
      borderColor:
        'rgba(74,140,255,0.42)',

      backgroundColor:
        'rgba(74,140,255,0.10)',
    },

    urgencyNeededText: {
      color:
        COLORS.blue,
    },

    statusActive: {
      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    statusActiveText: {
      color:
        COLORS.redBright,
    },

    statusFulfilled: {
      borderColor:
        'rgba(53,201,130,0.45)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    statusFulfilledText: {
      color:
        COLORS.green,
    },

    statusCancelled: {
      borderColor:
        'rgba(127,136,159,0.45)',

      backgroundColor:
        'rgba(127,136,159,0.10)',
    },

    statusCancelledText: {
      color:
        COLORS.muted,
    },

    actionCell: {
      alignItems:
        'flex-end',

      justifyContent:
        'center',
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

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,
    },

    paginationText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    paginationActions: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    pageButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    pageButtonText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SHARED
    // ========================================================

    buttonPressed: {
      opacity: 0.78,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity: 0.45,
    },
  });