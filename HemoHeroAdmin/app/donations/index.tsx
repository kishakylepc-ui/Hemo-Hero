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
  getAdminDonations,
  type AdminDonation,
  type AdminDonationStatus,
  type AdminDonationSummary,
  type AdminProfile,
  type AdminReportPagination,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

import { isAdminRole } from '../../lib/roles';

// ============================================================
// DESIGN
//
// Layout follows the Donor Applications list
// (applications/index.tsx) for a consistent Admin UI.
//
// Every donation a requester confirms is recorded here. It
// completes automatically; admins only review records that an
// automatic check or the donor flagged ('needs_review').
// ============================================================

const PAGE_LIMIT = 12;

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

const EMPTY_SUMMARY: AdminDonationSummary = {
  total: 0,
  completed: 0,
  needs_review: 0,
  rejected: 0,
  completed_units: 0,
  feedback_count: 0,
  average_rating: null,
};

type StatusFilter =
  | 'all'
  | AdminDonationStatus;

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// DONATIONS LIST
// ============================================================

export default function AdminDonationsScreen() {

  // ==========================================================
  // RESPONSIVE IPAD FRAME
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [donations, setDonations] =
    useState<AdminDonation[]>([]);

  const [summary, setSummary] =
    useState<AdminDonationSummary>(EMPTY_SUMMARY);

  const [pagination, setPagination] =
    useState<AdminReportPagination>({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      total_pages: 0,
    });

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Opens on the full transaction history.
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  // After the first successful load, reloads keep the
  // table visible and only spin the Refresh button.
  const hasLoadedOnce = useRef(false);

  // ==========================================================
  // LOAD
  //
  // Runs on focus (e.g. returning from the details screen)
  // and whenever page / filters change.
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDonations();
    }, [
      page,
      searchFilter,
      statusFilter,
    ])
  );

  async function loadDonations() {
    try {
      if (hasLoadedOnce.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        !isAdminRole(savedProfile?.role)
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(savedProfile);

      const result =
        await getAdminDonations(token, {
          page,
          limit: PAGE_LIMIT,
          status: statusFilter,
          search: searchFilter || undefined,
        });

      setSummary(
        result.summary ||
          EMPTY_SUMMARY
      );

      setDonations(
        result.donations ||
          []
      );

      setPagination(
        result.pagination
      );

      if (
        result.pagination.page !==
        page
      ) {
        setPage(
          result.pagination.page
        );
      }

      hasLoadedOnce.current = true;
    } catch (error) {
      console.log(
        'ADMIN DONATIONS ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load donations.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ==========================================================
  // FILTER HANDLERS
  // ==========================================================

  function submitSearch() {
    setPage(1);

    setSearchFilter(
      searchInput
        .trim()
        .toLowerCase()
    );
  }

  function clearSearch() {
    setSearchInput('');
    setSearchFilter('');
    setPage(1);
  }

  function changeStatusFilter(
    status: StatusFilter
  ) {
    setPage(1);
    setStatusFilter(status);
  }

  function openDonation(
    donationId: string
  ) {
    router.push(
      `/donations/${donationId}` as any
    );
  }

  const hasFilters =
    Boolean(searchFilter) ||
    statusFilter !== 'all';

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
                      Donations
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
                      Every completed donation transaction. Only flagged records need your review.
                      {summary.needs_review > 0
                        ? `  ${summary.needs_review} ${
                            summary.needs_review === 1
                              ? 'record needs'
                              : 'records need'
                          } review.`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={loadDonations}
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
                  SUMMARY STRIP
              ================================================ */}

              <FadeInView delay={40}>
                <View
                  style={[
                    styles.summaryRow,

                    {
                      gap: 14 * s,
                      marginBottom: 22 * s,
                    },
                  ]}
                >
                  <SummaryTile
                    scale={s}
                    fontScale={fs}
                    icon="task-alt"
                    color={COLORS.green}
                    label="Completed Donations"
                    value={summary.completed}
                  />

                  <SummaryTile
                    scale={s}
                    fontScale={fs}
                    icon="bloodtype"
                    color={COLORS.redBright}
                    label="Bags Donated"
                    value={summary.completed_units}
                  />

                  <SummaryTile
                    scale={s}
                    fontScale={fs}
                    icon="star"
                    color={COLORS.orange}
                    label={`Avg. Feedback (${summary.feedback_count})`}
                    value={
                      summary.average_rating !== null
                        ? `${summary.average_rating.toFixed(1)} / 5`
                        : '—'
                    }
                  />

                  <SummaryTile
                    scale={s}
                    fontScale={fs}
                    icon="flag"
                    color={
                      summary.needs_review > 0
                        ? COLORS.orange
                        : COLORS.muted
                    }
                    label="Needs Review"
                    value={summary.needs_review}
                  />
                </View>
              </FadeInView>

              {/* ================================================
                  STATUS FILTERS (with counts) + SEARCH
              ================================================ */}

              <FadeInView delay={80}>
                <View
                  style={[
                    styles.filters,

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
                      changeStatusFilter('all')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Needs Review"
                    count={summary.needs_review}
                    active={
                      statusFilter ===
                      'needs_review'
                    }
                    warning
                    onPress={() =>
                      changeStatusFilter(
                        'needs_review'
                      )
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Completed"
                    count={summary.completed}
                    active={statusFilter === 'completed'}
                    positive
                    onPress={() =>
                      changeStatusFilter('completed')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Rejected"
                    count={summary.rejected}
                    active={statusFilter === 'rejected'}
                    onPress={() =>
                      changeStatusFilter('rejected')
                    }
                  />
                </View>

                <View
                  style={[
                    styles.toolbar,

                    {
                      gap: 12 * s,
                      marginBottom: 24 * s,
                    },
                  ]}
                >
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
                      value={searchInput}
                      onChangeText={setSearchInput}
                      onSubmitEditing={submitSearch}
                      returnKeyType="search"
                      placeholder="Search donor, requester, facility, or blood type"
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

                    {searchInput ? (
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
                    onPress={submitSearch}
                    style={({ pressed }) => [
                      styles.searchButton,

                      {
                        height: 44 * s,
                        paddingHorizontal: 22 * s,
                        borderRadius: 10 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.searchButtonText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>
              </FadeInView>

              {/* ================================================
                  TABLE
              ================================================ */}

              <FadeInView delay={120}>
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
                        ['Donor', styles.colDonor],
                        ['Requester', styles.colRequester],
                        ['Facility', styles.colFacility],
                        ['Bags', styles.colBags],
                        ['Donated', styles.colDate],
                        ['Status', styles.colStatus],
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
                    <View
                      style={[
                        styles.centerArea,

                        {
                          minHeight: 360 * s,
                        },
                      ]}
                    >
                      <ActivityIndicator
                        size="large"
                        color={COLORS.redBright}
                      />

                      <Text
                        style={[
                          styles.mutedText,

                          {
                            fontSize: 13 * fs,
                            marginTop: 14 * s,
                          },
                        ]}
                      >
                        Loading donations...
                      </Text>
                    </View>
                  ) : errorMessage ? (
                    <View
                      style={[
                        styles.centerArea,

                        {
                          minHeight: 360 * s,
                          paddingHorizontal: 30 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={42 * s}
                        color={COLORS.redBright}
                      />

                      <Text
                        style={[
                          styles.emptyTitle,

                          {
                            fontSize: 18 * fs,
                            marginTop: 14 * s,
                          },
                        ]}
                      >
                        Unable to Load Donations
                      </Text>

                      <Text
                        style={[
                          styles.mutedText,
                          styles.centerText,

                          {
                            fontSize: 13 * fs,
                            marginTop: 6 * s,
                          },
                        ]}
                      >
                        {errorMessage}
                      </Text>

                      <Pressable
                        onPress={loadDonations}
                        style={({ pressed }) => [
                          styles.searchButton,

                          {
                            height: 42 * s,
                            paddingHorizontal: 20 * s,
                            borderRadius: 9 * s,
                            marginTop: 18 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.searchButtonText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          Try Again
                        </Text>
                      </Pressable>
                    </View>
                  ) : donations.length === 0 ? (
                    <View
                      style={[
                        styles.centerArea,

                        {
                          minHeight: 360 * s,
                          paddingHorizontal: 30 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          searchFilter
                            ? 'search-off'
                            : statusFilter ===
                                'needs_review'
                              ? 'task-alt'
                              : 'volunteer-activism'
                        }
                        size={46 * s}
                        color={COLORS.muted}
                      />

                      <Text
                        style={[
                          styles.emptyTitle,

                          {
                            fontSize: 18 * fs,
                            marginTop: 14 * s,
                          },
                        ]}
                      >
                        {searchFilter
                          ? 'No Matching Donations'
                          : statusFilter ===
                              'needs_review'
                            ? 'All Caught Up'
                            : 'No Donations Yet'}
                      </Text>

                      <Text
                        style={[
                          styles.mutedText,
                          styles.centerText,

                          {
                            fontSize: 13 * fs,
                            marginTop: 6 * s,
                          },
                        ]}
                      >
                        {searchFilter
                          ? 'Try changing your search or status filter.'
                          : statusFilter ===
                              'needs_review'
                            ? 'No flagged records. Donations are being recorded automatically.'
                            : hasFilters
                              ? 'No donations have this status yet.'
                              : 'Donations confirmed by requesters will appear here.'}
                      </Text>
                    </View>
                  ) : (
                    donations.map(
                      (donation, index) => (
                        <FadeInView
                          key={donation.id}
                          // Small stagger, capped so long
                          // lists never feel slow.
                          delay={Math.min(index, 8) * 30}
                          offset={6}
                        >
                          <DonationRow
                            donation={donation}
                            scale={s}
                            fontScale={fs}
                            last={
                              index ===
                              donations.length - 1
                            }
                            onPress={() =>
                              openDonation(donation.id)
                            }
                          />
                        </FadeInView>
                      )
                    )
                  )}
                </View>
              </FadeInView>

              {/* ================================================
                  PAGINATION
              ================================================ */}

              {!loading &&
              !errorMessage &&
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
                      styles.mutedText,

                      {
                        fontSize: 12 * fs,
                      },
                    ]}
                  >
                    Page {pagination.page} of{' '}
                    {Math.max(pagination.total_pages, 1)} •{' '}
                    {pagination.total}{' '}
                    {pagination.total === 1
                      ? 'donation'
                      : 'donations'}
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

            <AdminBottomNav activeTab="donations" />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SUMMARY TILE
// ============================================================

function SummaryTile({
  scale,
  fontScale,
  icon,
  color,
  label,
  value,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  color: string;
  label: string;
  value: number | string;
}) {
  return (
    <View
      style={[
        styles.summaryTile,

        {
          padding: 16 * scale,
          borderRadius: 13 * scale,
          gap: 12 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,

          {
            width: 42 * scale,
            height: 42 * scale,
            borderRadius: 11 * scale,
            backgroundColor: `${color}1F`,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={22 * scale}
          color={color}
        />
      </View>

      <View style={styles.flexFill}>
        <Text
          style={[
            styles.summaryValue,

            {
              fontSize: 22 * fontScale,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.mutedText,

            {
              fontSize: 12 * fontScale,
              marginTop: 1 * scale,
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
// FILTER BUTTON (same design as Donor Applications)
// ============================================================

function FilterButton({
  scale,
  fontScale,
  label,
  count,
  active,
  warning = false,
  positive = false,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  count: number;
  active: boolean;
  warning?: boolean;
  positive?: boolean;
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

          warning &&
            count > 0 &&
            styles.filterCountWarning,

          positive &&
            styles.filterCountPositive,
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
// DONATION ROW
// ============================================================

function DonationRow({
  donation,
  scale,
  fontScale,
  last,
  onPress,
}: {
  donation: AdminDonation;
  scale: number;
  fontScale: number;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.donationRow,

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
      {/* DONOR + BLOOD TYPE */}

      <View
        style={[
          styles.colDonor,
          styles.donorCell,

          {
            gap: 11 * scale,
            paddingRight: 12 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.bloodBadge,

            {
              width: 44 * scale,
              height: 44 * scale,
              borderRadius: 11 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.bloodBadgeText,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {donation.blood_type}
          </Text>
        </View>

        <View style={styles.flexFill}>
          <Text
            numberOfLines={1}
            style={[
              styles.nameText,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {getDonorName(donation)}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.cellMuted,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 4 * scale,
              },
            ]}
          >
            {donation.donor?.email ||
              'Account deleted'}
          </Text>
        </View>
      </View>

      {/* REQUESTER */}

      <View
        style={[
          styles.colRequester,

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
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {donation.requester?.full_name ||
            donation.requester_name ||
            'Deleted account'}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 4 * scale,
            },
          ]}
        >
          Confirmed {formatDate(donation.created_at)}
        </Text>
      </View>

      {/* FACILITY */}

      <View
        style={[
          styles.colFacility,

          {
            paddingRight: 14 * scale,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
              lineHeight: 18 * fontScale,
            },
          ]}
        >
          {donation.facility_name ||
            '—'}
        </Text>
      </View>

      {/* BAGS */}

      <View style={styles.colBags}>
        <Text
          style={[
            styles.nameText,

            {
              fontSize: 14 * fontScale,
            },
          ]}
        >
          {donation.units_donated}
        </Text>
      </View>

      {/* DATE */}

      <View style={styles.colDate}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatDate(donation.donated_at)}
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
          {formatTime(donation.donated_at)}
        </Text>
      </View>

      {/* STATUS */}

      <View style={styles.colStatus}>
        <StatusPill
          status={donation.status}
          scale={scale}
          fontScale={fontScale}
        />

        {donation.average_rating ? (
          <View
            style={[
              styles.ratingRow,

              {
                gap: 3 * scale,
                marginTop: 6 * scale,
              },
            ]}
          >
            <MaterialIcons
              name="star"
              size={14 * scale}
              color={COLORS.orange}
            />

            <Text
              style={[
                styles.cellMuted,

                {
                  fontSize: 11.5 * fontScale,
                },
              ]}
            >
              {donation.average_rating.toFixed(1)} •{' '}
              {donation.feedback_count}{' '}
              {donation.feedback_count === 1
                ? 'rating'
                : 'ratings'}
            </Text>
          </View>
        ) : null}
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
// STATUS PILL
// ============================================================

function StatusPill({
  status,
  scale,
  fontScale,
}: {
  status: AdminDonationStatus;
  scale: number;
  fontScale: number;
}) {
  const palette =
    getStatusPalette(status);

  return (
    <View
      style={[
        styles.pill,

        {
          minWidth: 104 * scale,
          height: 32 * scale,
          borderRadius: 6 * scale,
          paddingHorizontal: 12 * scale,
          justifyContent: 'center',
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,

          {
            fontSize: 12 * fontScale,
            color: palette.color,
          },
        ]}
      >
        {palette.label}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getStatusPalette(
  status: AdminDonationStatus
) {
  switch (status) {
    case 'needs_review':
      return {
        label: 'Needs Review',
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'completed':
      return {
        label: 'Completed',
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    default:
      return {
        label: 'Rejected',
        color: COLORS.redBright,
        border: 'rgba(239,51,64,0.50)',
        background: 'rgba(239,51,64,0.12)',
      };
  }
}

function getDonorName(
  donation: AdminDonation
) {
  return (
    donation.donor?.full_name?.trim() ||
    [
      donation.donor?.first_name,
      donation.donor?.last_name,
    ]
      .filter(Boolean)
      .join(' ') ||
    donation.donor_name ||
    'Deleted account'
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

  // SUMMARY

  summaryRow: {
    flexDirection: 'row',
  },

  summaryTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  summaryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  // FILTER BUTTONS

  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

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

  filterCountWarning: {
    backgroundColor: 'rgba(243,163,74,0.20)',
  },

  filterCountPositive: {
    backgroundColor: 'rgba(53,201,130,0.18)',
  },

  filterCountText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },

  // TOOLBAR (search)

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInputContainer: {
    flex: 1,
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

  searchButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  searchButtonText: {
    color: COLORS.white,
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

  donationRow: {
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

  colDonor: {
    width: '24%',
  },

  colRequester: {
    width: '18%',
  },

  colFacility: {
    width: '21%',
  },

  colBags: {
    width: '7%',
  },

  colDate: {
    width: '12%',
  },

  colStatus: {
    width: '14%',
  },

  colAction: {
    width: '4%',
    alignItems: 'flex-end',
  },

  donorCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bloodBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  bloodBadgeText: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_700Bold',
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

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  // STATES

  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerText: {
    textAlign: 'center',
  },

  mutedText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
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
