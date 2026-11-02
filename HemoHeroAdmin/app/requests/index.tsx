import {
  type ComponentProps,
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminBottomNav from '../../components/AdminBottomNav';
import AdminHeader from '../../components/AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

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
  useLiveRefresh,
} from '../../lib/useLiveRefresh';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

import { isAdminRole } from '../../lib/roles';

// ============================================================
// DESIGN
//
// Layout follows the Donor Applications list for a consistent
// Admin UI. Uses the shared AdminHeader (real notification
// badge) instead of a copied header.
// ============================================================

const PAGE_LIMIT = 10;

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
  blue: '#4A8CFF',

  rowBorder: 'rgba(36,53,84,0.78)',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// FILTERS
// ============================================================

type StatusFilter =
  | 'all'
  | AdminBloodRequestStatus;

type UrgencyFilter =
  | 'all'
  | AdminBloodRequestUrgency;

const BLOOD_TYPES = [
  'all',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

type BloodTypeFilter =
  (typeof BLOOD_TYPES)[number];

const DEFAULT_SUMMARY: AdminBloodRequestSummary = {
  total: 0,
  active: 0,
  fulfilled: 0,
  cancelled: 0,
  expired: 0,
  urgent_active: 0,
  scheduled_active: 0,
  active_units_needed: 0,
};

const DEFAULT_PAGINATION: AdminBloodRequestPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  total_pages: 0,
};

// ============================================================
// SCREEN
// ============================================================

export default function AdminBloodRequestsScreen() {

  // ==========================================================
  // RESPONSIVE IPAD CANVAS
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [requests, setRequests] =
    useState<AdminBloodRequest[]>([]);

  const [summary, setSummary] =
    useState<AdminBloodRequestSummary>(DEFAULT_SUMMARY);

  const [pagination, setPagination] =
    useState<AdminBloodRequestPagination>(DEFAULT_PAGINATION);

  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [bloodTypeFilter, setBloodTypeFilter] =
    useState<BloodTypeFilter>('all');

  const [urgencyFilter, setUrgencyFilter] =
    useState<UrgencyFilter>('all');

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const hasLoadedOnce = useRef(false);

  // A live check that was overtaken by a newer load (e.g. after
  // changing a filter) is dropped.
  const loadGuard = useRef(0);

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadRequests = useCallback(async (live = false) => {
    if (!live) {
      loadGuard.current += 1;
    }

    const thisLoad =
      loadGuard.current;

    try {
      if (!live) {
        if (hasLoadedOnce.current) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');
      }

      const token =
        await getAdminAccessToken();

      const storedProfile =
        await getAdminProfile();

      if (
        !token ||
        !isAdminRole(storedProfile?.role)
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(storedProfile);

      const result =
        await getAdminBloodRequests(token, {
          page,
          limit: PAGE_LIMIT,
          status: statusFilter,
          blood_type: bloodTypeFilter,
          urgency: urgencyFilter,
          search,
        });

      if (thisLoad !== loadGuard.current) {
        return;
      }

      setError('');

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

      if (
        result.pagination &&
        result.pagination.page !== page
      ) {
        setPage(result.pagination.page);
      }

      hasLoadedOnce.current = true;
    } catch (loadError) {
      // A failed live check keeps what's on screen.
      if (live) {
        return;
      }

      console.log(
        'ADMIN BLOOD REQUESTS ERROR:',
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load blood requests.'
      );
    } finally {
      if (!live) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    page,
    statusFilter,
    bloodTypeFilter,
    urgencyFilter,
    search,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  useLiveRefresh(() =>
    loadRequests(true)
  );

  // ==========================================================
  // FILTER HANDLERS
  // ==========================================================

  function handleSearch() {
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function clearSearch() {
    setSearchDraft('');
    setSearch('');
    setPage(1);
  }

  function changeStatus(
    value: StatusFilter
  ) {
    setPage(1);
    setStatusFilter(value);
  }

  function changeBloodType(
    value: BloodTypeFilter
  ) {
    setPage(1);
    setBloodTypeFilter(value);
  }

  function changeUrgency(
    value: UrgencyFilter
  ) {
    setPage(1);
    setUrgencyFilter(value);
  }

  function resetFilters() {
    setStatusFilter('all');
    setBloodTypeFilter('all');
    setUrgencyFilter('all');
    setSearchDraft('');
    setSearch('');
    setPage(1);
  }

  const hasFilters =
    statusFilter !== 'all' ||
    bloodTypeFilter !== 'all' ||
    urgencyFilter !== 'all' ||
    Boolean(search);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.ipadCanvas,

          {
            width: tablet.width,
            height: tablet.height,
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
          <SafeAreaView style={styles.safeArea}>
            <AdminHeader
              profile={profile}
              scale={s}
              fontScale={fs}
            />

            <ScrollView
              style={styles.scroll}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadRequests()}
                  tintColor={COLORS.redBright}
                />
              }
              contentContainerStyle={[
                styles.content,

                {
                  paddingHorizontal: 48 * s,
                  paddingVertical: 32 * s,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* ================================================
                  TITLE
              ================================================ */}

              <FadeInView>
                <View
                  style={[
                    styles.titleRow,

                    {
                      marginBottom: 24 * s,
                    },
                  ]}
                >
                  <View style={styles.flexFill}>
                    <Text
                      style={[
                        styles.title,

                        {
                          fontSize: 30 * fs,
                          lineHeight: 38 * fs,
                        },
                      ]}
                    >
                      Blood Requests
                    </Text>

                    <Text
                      style={[
                        styles.subtitle,

                        {
                          fontSize: 13.5 * fs,
                          marginTop: 4 * s,
                        },
                      ]}
                    >
                      Monitor blood requests submitted by Hemo-Hero users.
                      {summary.active > 0
                        ? `  ${summary.active_units_needed} ${
                            summary.active_units_needed === 1
                              ? 'unit'
                              : 'units'
                          } currently needed across ${summary.active} active ${
                            summary.active === 1
                              ? 'request'
                              : 'requests'
                          }.`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={() => loadRequests()}
                    style={({ pressed }) => [
                      styles.refreshButton,

                      {
                        height: 44 * s,
                        minWidth: 116 * s,
                        paddingHorizontal: 16 * s,
                        borderRadius: 10 * s,
                        gap: 8 * s,
                      },

                      pressed &&
                        styles.pressed,

                      (loading || refreshing) &&
                        styles.disabled,
                    ]}
                  >
                    {refreshing ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.white}
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="refresh"
                          size={20 * s}
                          color={COLORS.white}
                        />

                        <Text
                          style={[
                            styles.refreshText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          Refresh
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </FadeInView>

              {/* ================================================
                  STATUS FILTERS (with counts)
              ================================================ */}

              <FadeInView delay={50}>
                <View
                  style={[
                    styles.wrapRow,

                    {
                      gap: 10 * s,
                      marginBottom: 14 * s,
                    },
                  ]}
                >
                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="All"
                    count={summary.total}
                    active={statusFilter === 'all'}
                    onPress={() =>
                      changeStatus('all')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Active"
                    count={summary.active}
                    active={statusFilter === 'active'}
                    tone="orange"
                    onPress={() =>
                      changeStatus('active')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Fulfilled"
                    count={summary.fulfilled}
                    active={statusFilter === 'fulfilled'}
                    tone="green"
                    onPress={() =>
                      changeStatus('fulfilled')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Cancelled"
                    count={summary.cancelled}
                    active={statusFilter === 'cancelled'}
                    onPress={() =>
                      changeStatus('cancelled')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Expired"
                    count={summary.expired ?? 0}
                    active={statusFilter === 'expired'}
                    onPress={() =>
                      changeStatus('expired')
                    }
                  />

                  <View
                    style={[
                      styles.activeInfo,

                      {
                        height: 44 * s,
                        paddingHorizontal: 14 * s,
                        borderRadius: 10 * s,
                        gap: 12 * s,
                      },
                    ]}
                  >
                    <InfoChip
                      scale={s}
                      fontScale={fs}
                      icon="priority-high"
                      color={COLORS.redBright}
                      text={`${summary.urgent_active} urgent active`}
                    />

                    <InfoChip
                      scale={s}
                      fontScale={fs}
                      icon="event"
                      color={COLORS.blue}
                      text={`${summary.scheduled_active} scheduled active`}
                    />
                  </View>
                </View>

                {/* URGENCY + SEARCH */}

                <View
                  style={[
                    styles.wrapRow,

                    {
                      gap: 12 * s,
                      marginBottom: 12 * s,
                    },
                  ]}
                >
                  <Segment
                    scale={s}
                    fontScale={fs}
                    value={urgencyFilter}
                    options={[
                      ['all', 'All Urgency'],
                      ['urgent', 'Urgent'],
                      ['needed', 'Scheduled'],
                    ]}
                    onChange={changeUrgency}
                  />

                  <View
                    style={[
                      styles.searchInputContainer,

                      {
                        height: 44 * s,
                        borderRadius: 10 * s,
                        paddingHorizontal: 14 * s,
                        gap: 9 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={20 * s}
                      color={COLORS.muted}
                    />

                    <TextInput
                      value={searchDraft}
                      onChangeText={setSearchDraft}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                      placeholder="Search requester, email, facility, or blood type"
                      placeholderTextColor={COLORS.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.searchInput,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    />

                    {searchDraft ? (
                      <Pressable
                        onPress={clearSearch}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name="close"
                          size={19 * s}
                          color={COLORS.muted}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={handleSearch}
                    style={({ pressed }) => [
                      styles.primaryButton,

                      {
                        height: 44 * s,
                        paddingHorizontal: 20 * s,
                        borderRadius: 10 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>

                {/* BLOOD TYPE */}

                <View
                  style={[
                    styles.wrapRow,

                    {
                      alignItems: 'center',
                      gap: 7 * s,
                      marginBottom: 24 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,

                      {
                        fontSize: 11 * fs,
                        marginRight: 6 * s,
                      },
                    ]}
                  >
                    BLOOD TYPE
                  </Text>

                  {BLOOD_TYPES.map(type => (
                    <Pressable
                      key={type}
                      onPress={() =>
                        changeBloodType(type)
                      }
                      style={({ pressed }) => [
                        styles.bloodChip,

                        {
                          height: 34 * s,
                          minWidth: 44 * s,
                          paddingHorizontal: 11 * s,
                          borderRadius: 8 * s,
                        },

                        bloodTypeFilter === type &&
                          styles.bloodChipActive,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bloodChipText,

                          {
                            fontSize: 12.5 * fs,
                          },

                          bloodTypeFilter === type &&
                            styles.bloodChipTextActive,
                        ]}
                      >
                        {type === 'all'
                          ? 'All'
                          : type}
                      </Text>
                    </Pressable>
                  ))}

                  {hasFilters ? (
                    <Pressable
                      onPress={resetFilters}
                      style={({ pressed }) => [
                        styles.resetButton,

                        {
                          height: 34 * s,
                          paddingHorizontal: 12 * s,
                          borderRadius: 8 * s,
                          marginLeft: 6 * s,
                          gap: 5 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <MaterialIcons
                        name="filter-alt-off"
                        size={16 * s}
                        color={COLORS.soft}
                      />

                      <Text
                        style={[
                          styles.resetText,

                          {
                            fontSize: 12 * fs,
                          },
                        ]}
                      >
                        Reset filters
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </FadeInView>

              {/* ================================================
                  TABLE
              ================================================ */}

              <FadeInView delay={100}>
                <View
                  style={[
                    styles.listCard,

                    {
                      borderRadius: 14 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tableHeader,

                      {
                        minHeight: 56 * s,
                        paddingHorizontal: 22 * s,
                      },
                    ]}
                  >
                    {(
                      [
                        ['Requester', styles.colRequester],
                        ['Blood', styles.colBlood],
                        ['Units', styles.colUnits],
                        ['Facility', styles.colFacility],
                        ['Urgency', styles.colUrgency],
                        ['Status', styles.colStatus],
                        ['Created', styles.colCreated],
                      ] as [string, object][]
                    ).map(([label, colStyle]) => (
                      <Text
                        key={label}
                        style={[
                          styles.tableHeaderText,
                          colStyle,

                          {
                            fontSize: 11.5 * fs,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    ))}

                    <View style={styles.colAction} />
                  </View>

                  {loading ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      loading
                      title=""
                      text="Loading blood requests..."
                    />
                  ) : error && requests.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon="error-outline"
                      iconColor={COLORS.redBright}
                      title="Unable to Load Requests"
                      text={error}
                      actionLabel="Try Again"
                      onAction={() => loadRequests()}
                    />
                  ) : requests.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon={
                        hasFilters
                          ? 'search-off'
                          : 'bloodtype'
                      }
                      title={
                        hasFilters
                          ? 'No Matching Requests'
                          : 'No Blood Requests Yet'
                      }
                      text={
                        hasFilters
                          ? 'Try changing your search or filters.'
                          : 'Blood requests created by users will appear here.'
                      }
                      actionLabel={
                        hasFilters
                          ? 'Reset Filters'
                          : undefined
                      }
                      onAction={
                        hasFilters
                          ? resetFilters
                          : undefined
                      }
                    />
                  ) : (
                    requests.map((request, index) => (
                      <FadeInView
                        key={request.id}
                        delay={Math.min(index, 8) * 30}
                        offset={6}
                      >
                        <RequestRow
                          request={request}
                          scale={s}
                          fontScale={fs}
                          last={
                            index === requests.length - 1
                          }
                        />
                      </FadeInView>
                    ))
                  )}
                </View>
              </FadeInView>

              {/* ================================================
                  PAGINATION
              ================================================ */}

              {!loading &&
              pagination.total > 0 ? (
                <View
                  style={[
                    styles.pagination,

                    {
                      marginTop: 17 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellMuted,

                      {
                        fontSize: 12 * fs,
                      },
                    ]}
                  >
                    Page {pagination.page} of{' '}
                    {Math.max(pagination.total_pages, 1)} •{' '}
                    {pagination.total}{' '}
                    {pagination.total === 1
                      ? 'request'
                      : 'requests'}
                  </Text>

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 8 * s,
                      },
                    ]}
                  >
                    <PageButton
                      scale={s}
                      fontScale={fs}
                      label="Previous"
                      icon="chevron-left"
                      disabled={page <= 1}
                      onPress={() =>
                        setPage(current =>
                          Math.max(current - 1, 1)
                        )
                      }
                    />

                    <PageButton
                      scale={s}
                      fontScale={fs}
                      label="Next"
                      icon="chevron-right"
                      iconRight
                      disabled={
                        pagination.total_pages === 0 ||
                        page >= pagination.total_pages
                      }
                      onPress={() =>
                        setPage(current => current + 1)
                      }
                    />
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <AdminBottomNav activeTab="requests" />
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
  fontScale,
  label,
  count,
  active,
  tone,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  count: number;
  active: boolean;
  tone?: 'orange' | 'green';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,

        {
          height: 44 * scale,
          paddingHorizontal: 16 * scale,
          borderRadius: 10 * scale,
          gap: 8 * scale,
        },

        active &&
          styles.filterButtonActive,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,

          {
            fontSize: 12.5 * fontScale,
          },

          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCount,

          {
            minWidth: 24 * scale,
            height: 24 * scale,
            borderRadius: 12 * scale,
            paddingHorizontal: 6 * scale,
          },

          tone === 'orange' &&
            count > 0 &&
            styles.filterCountOrange,

          tone === 'green' &&
            styles.filterCountGreen,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,

            {
              fontSize: 11 * fontScale,
            },
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function InfoChip({
  scale,
  fontScale,
  icon,
  color,
  text,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  color: string;
  text: string;
}) {
  return (
    <View
      style={[
        styles.row,

        {
          alignItems: 'center',
          gap: 5 * scale,
        },
      ]}
    >
      <MaterialIcons
        name={icon}
        size={16 * scale}
        color={color}
      />

      <Text
        style={[
          styles.cellText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ============================================================
// SEGMENT
// ============================================================

function Segment<T extends string>({
  scale,
  fontScale,
  value,
  options,
  onChange,
}: {
  scale: number;
  fontScale: number;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={[
        styles.segment,

        {
          height: 44 * scale,
          borderRadius: 10 * scale,
          padding: 4 * scale,
          gap: 4 * scale,
        },
      ]}
    >
      {options.map(([optionValue, label]) => (
        <Pressable
          key={optionValue}
          onPress={() =>
            onChange(optionValue)
          }
          style={({ pressed }) => [
            styles.segmentItem,

            {
              paddingHorizontal: 14 * scale,
              borderRadius: 7 * scale,
            },

            value === optionValue &&
              styles.segmentItemActive,

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.segmentText,

              {
                fontSize: 12.5 * fontScale,
              },

              value === optionValue &&
                styles.segmentTextActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ============================================================
// TABLE MESSAGE
// ============================================================

function TableMessage({
  scale,
  fontScale,
  loading = false,
  icon,
  iconColor = COLORS.muted,
  title,
  text,
  actionLabel,
  onAction,
}: {
  scale: number;
  fontScale: number;
  loading?: boolean;
  icon?: IconName;
  iconColor?: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={[
        styles.centerArea,

        {
          minHeight: 360 * scale,
          paddingHorizontal: 30 * scale,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.redBright}
        />
      ) : icon ? (
        <MaterialIcons
          name={icon}
          size={46 * scale}
          color={iconColor}
        />
      ) : null}

      {title ? (
        <Text
          style={[
            styles.emptyTitle,

            {
              fontSize: 18 * fontScale,
              marginTop: 14 * scale,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <Text
        style={[
          styles.cellMuted,
          styles.centerText,

          {
            fontSize: 13 * fontScale,
            marginTop: (title ? 6 : 14) * scale,
          },
        ]}
      >
        {text}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.primaryButton,

            {
              height: 42 * scale,
              paddingHorizontal: 20 * scale,
              borderRadius: 9 * scale,
              marginTop: 18 * scale,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ============================================================
// PAGE BUTTON
// ============================================================

function PageButton({
  scale,
  fontScale,
  label,
  icon,
  iconRight = false,
  disabled,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  icon: IconName;
  iconRight?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const iconNode = (
    <MaterialIcons
      name={icon}
      size={19 * scale}
      color={COLORS.white}
    />
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,

        {
          height: 40 * scale,
          paddingHorizontal: 14 * scale,
          borderRadius: 9 * scale,
        },

        pressed &&
          styles.pressed,

        disabled &&
          styles.disabled,
      ]}
    >
      {!iconRight ? iconNode : null}

      <Text
        style={[
          styles.pageButtonText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      {iconRight ? iconNode : null}
    </Pressable>
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
  request: AdminBloodRequest;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  const requesterName =
    getRequesterName(request);

  const urgent =
    request.urgency === 'urgent';

  const status =
    getStatusStyle(request.status);

  const neededBy =
    !urgent &&
    request.status === 'active'
      ? formatNeededBy(request)
      : '';

  return (
    <Pressable
      onPress={() =>
        router.push(
          `/requests/${request.id}` as any
        )
      }
      style={({ pressed }) => [
        styles.tableRow,

        {
          minHeight: 84 * scale,
          paddingHorizontal: 22 * scale,
          paddingVertical: 12 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.rowPressed,
      ]}
    >
      {/* REQUESTER */}

      <View
        style={[
          styles.colRequester,
          styles.row,

          {
            alignItems: 'center',
            paddingRight: 10 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,

            {
              width: 40 * scale,
              height: 40 * scale,
              borderRadius: 20 * scale,
              marginRight: 11 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {requesterName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.flexFill}>
          <Text
            numberOfLines={1}
            style={[
              styles.nameText,

              {
                fontSize: 13.5 * fontScale,
              },
            ]}
          >
            {requesterName}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.cellMuted,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 3 * scale,
              },
            ]}
          >
            {request.requester?.email ||
              'Email unavailable'}
          </Text>
        </View>
      </View>

      {/* BLOOD */}

      <View style={styles.colBlood}>
        <View
          style={[
            styles.bloodPill,

            {
              minWidth: 46 * scale,
              height: 30 * scale,
              borderRadius: 6 * scale,
              paddingHorizontal: 10 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.bloodPillText,

              {
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {request.blood_type}
          </Text>
        </View>
      </View>

      {/* UNITS */}

      <View style={styles.colUnits}>
        <Text
          style={[
            styles.nameText,

            {
              fontSize: 14 * fontScale,
            },
          ]}
        >
          {request.units_needed}
        </Text>

        <Text
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
            },
          ]}
        >
          {request.units_needed === 1
            ? 'unit'
            : 'units'}
        </Text>
      </View>

      {/* FACILITY */}

      <View
        style={[
          styles.colFacility,

          {
            paddingRight: 12 * scale,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {request.facility_name ||
            'Not provided'}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 3 * scale,
            },
          ]}
        >
          {request.facility_address ||
            formatValue(request.facility_type)}
        </Text>
      </View>

      {/* URGENCY */}

      <View style={styles.colUrgency}>
        <View
          style={[
            styles.pill,

            {
              height: 30 * scale,
              paddingHorizontal: 9 * scale,
              borderRadius: 6 * scale,
              gap: 4 * scale,
            },

            urgent
              ? styles.urgentPill
              : styles.scheduledPill,
          ]}
        >
          <MaterialIcons
            name={
              urgent
                ? 'priority-high'
                : 'event'
            }
            size={14 * scale}
            color={
              urgent
                ? COLORS.redBright
                : COLORS.blue
            }
          />

          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: urgent
                  ? COLORS.redBright
                  : COLORS.blue,
              },
            ]}
          >
            {urgent
              ? 'Urgent'
              : 'Scheduled'}
          </Text>
        </View>

        {neededBy ? (
          <Text
            numberOfLines={1}
            style={[
              styles.cellMuted,

              {
                fontSize: 11 * fontScale,
                marginTop: 4 * scale,
              },
            ]}
          >
            Needed {neededBy}
          </Text>
        ) : null}
      </View>

      {/* STATUS */}

      <View style={styles.colStatus}>
        <View
          style={[
            styles.pill,

            {
              minWidth: 92 * scale,
              height: 32 * scale,
              paddingHorizontal: 12 * scale,
              borderRadius: 6 * scale,
              borderColor: status.border,
              backgroundColor: status.background,
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: status.color,
              },
            ]}
          >
            {status.label}
          </Text>
        </View>
      </View>

      {/* CREATED */}

      <View style={styles.colCreated}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatDate(request.created_at)}
        </Text>

        <Text
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 3 * scale,
            },
          ]}
        >
          {formatTime(request.created_at)}
        </Text>
      </View>

      <View style={styles.colAction}>
        <MaterialIcons
          name="chevron-right"
          size={22 * scale}
          color={COLORS.white}
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getRequesterName(
  request: AdminBloodRequest
) {
  const requester =
    request.requester;

  return (
    requester?.full_name?.trim() ||
    [
      requester?.first_name,
      requester?.middle_name,
      requester?.last_name,
      requester?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    requester?.email ||
    'Unknown requester'
  );
}

function getStatusStyle(
  status: AdminBloodRequestStatus
) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'fulfilled':
      return {
        label: 'Fulfilled',
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    // Closed by the expiry sweep with no donation recorded.
    case 'expired':
      return {
        label: 'Expired',
        color: COLORS.soft,
        border: 'rgba(183,193,216,0.45)',
        background: 'rgba(183,193,216,0.10)',
      };

    default:
      return {
        label: 'Cancelled',
        color: COLORS.muted,
        border: 'rgba(127,136,159,0.45)',
        background: 'rgba(127,136,159,0.10)',
      };
  }
}

function formatNeededBy(
  request: AdminBloodRequest
) {
  if (!request.needed_date) {
    return '';
  }

  const match =
    request.needed_date.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  const date = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    : new Date(request.needed_date);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  );
}

function formatValue(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  return value
    .replace(/[_-]/g, ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

function formatTime(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.outer,
  },

  ipadCanvas: {
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },

  nativeCanvas: {
    width: '100%',
    height: '100%',
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

  row: {
    flexDirection: 'row',
  },

  wrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  flexFill: {
    flex: 1,
    minWidth: 0,
  },

  // TITLE

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  subtitle: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  refreshText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // FILTERS

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  filterButtonActive: {
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(219,10,10,0.15)',
  },

  filterText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  filterTextActive: {
    color: COLORS.white,
  },

  filterCount: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  filterCountOrange: {
    backgroundColor: 'rgba(243,163,74,0.22)',
  },

  filterCountGreen: {
    backgroundColor: 'rgba(53,201,130,0.18)',
  },

  filterCountText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },

  activeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(16,26,53,0.55)',
  },

  filterLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },

  segment: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  segmentItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentItemActive: {
    backgroundColor: COLORS.cardLight,
  },

  segmentText: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
  },

  segmentTextActive: {
    color: COLORS.white,
  },

  searchInputContainer: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,

  bloodChip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  bloodChipActive: {
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(219,10,10,0.15)',
  },

  bloodChipText: {
    color: COLORS.soft,
    fontFamily: 'Poppins_600SemiBold',
  },

  bloodChipTextActive: {
    color: COLORS.white,
  },

  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  resetText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // TABLE

  listCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(12,20,40,0.94)',
  },

  tableHeaderText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rowBorder,
  },

  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  colRequester: {
    width: '22%',
  },

  colBlood: {
    width: '8%',
  },

  colUnits: {
    width: '7%',
  },

  colFacility: {
    width: '21%',
  },

  colUrgency: {
    width: '13%',
  },

  colStatus: {
    width: '12%',
  },

  colCreated: {
    width: '13%',
  },

  colAction: {
    width: '4%',
    alignItems: 'flex-end',
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  avatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  nameText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  cellText: {
    color: COLORS.soft,
    fontFamily: 'Inter_500Medium',
  },

  cellMuted: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  bloodPill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C21319',
    backgroundColor: 'rgba(194,19,25,0.11)',
  },

  bloodPillText: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_600SemiBold',
  },

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  pillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  urgentPill: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  scheduledPill: {
    borderColor: 'rgba(74,140,255,0.45)',
    backgroundColor: 'rgba(74,140,255,0.10)',
  },

  // STATES

  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerText: {
    textAlign: 'center',
  },

  emptyTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  // PAGINATION

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  pageButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // INTERACTION

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },

  disabled: {
    opacity: 0.42,
  },
});
