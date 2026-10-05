import {
  type ComponentProps,
  useCallback,
  useMemo,
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

import { isAdminRole } from '../../lib/roles';

// ============================================================
// CONSTANTS
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

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

  rowBorder: 'rgba(36,53,84,0.78)',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

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

  // ==========================================================
  // IPAD PRO CANVAS
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [applications, setApplications] =
    useState<DonorApplication[]>([]);

  const [summary, setSummary] =
    useState<DonorApplicationSummary | null>(null);

  const [filter, setFilter] =
    useState<ApplicationFilter>('pending');

  // Typed text vs. the search that is applied (on Search / Enter).
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  // After the first successful load, reloads keep the table
  // visible instead of flashing a full spinner.
  const hasLoadedOnce = useRef(false);

  // ==========================================================
  // LOAD
  //
  // useFocusEffect alone covers both the first load and filter
  // changes (it re-runs when `filter` changes while focused).
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [filter])
  );

  async function loadApplications() {
    try {
      if (hasLoadedOnce.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

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

      const [
        applicationResult,
        summaryResult,
      ] = await Promise.all([
        getAdminDonorApplications(
          token,
          filter === 'all'
            ? undefined
            : filter
        ),

        getAdminDonorSummary(token),
      ]);

      setApplications(
        applicationResult?.applications ||
          []
      );

      setSummary(
        summaryResult?.summary ||
          null
      );

      hasLoadedOnce.current = true;
    } catch (loadError) {
      console.log(
        'ADMIN APPLICATIONS ERROR:',
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load donor applications.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function changeFilter(
    next: ApplicationFilter
  ) {
    if (next === filter) {
      return;
    }

    setFilter(next);
  }

  function openApplication(
    applicationId: string
  ) {
    router.push(
      `/applications/${applicationId}` as any
    );
  }

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
  }

  // ==========================================================
  // SEARCH + ORDER
  //
  // Search runs on the loaded list (name, email, blood type).
  // Pending applications are shown oldest first so the
  // longest-waiting applicant is reviewed first.
  // ==========================================================

  const visibleApplications = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const filtered = query
      ? applications.filter(application => {
          const user =
            getApplicant(application);

          return [
            getApplicantName(application),
            user?.email,
            application.blood_type,
          ].some(value =>
            String(value || '')
              .toLowerCase()
              .includes(query)
          );
        })
      : applications;

    if (filter !== 'pending') {
      return filtered;
    }

    return filtered
      .slice()
      .sort(
        (a, b) =>
          getSubmittedTime(a) -
          getSubmittedTime(b)
      );
  }, [applications, search, filter]);

  const pendingCount =
    summary?.pending ?? 0;

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
                  onRefresh={loadApplications}
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
                      Donor Applications
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
                      Review and verify donor registrations and identity documents.
                      {pendingCount > 0
                        ? `  ${pendingCount} ${
                            pendingCount === 1
                              ? 'application is'
                              : 'applications are'
                          } waiting for review.`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={loadApplications}
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
                  FILTERS + SEARCH
              ================================================ */}

              <FadeInView delay={50}>
                <View
                  style={[
                    styles.toolbar,

                    {
                      gap: 10 * s,
                      marginBottom: 24 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.filters,

                      {
                        gap: 10 * s,
                      },
                    ]}
                  >
                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="All"
                      count={summary?.total ?? 0}
                      active={filter === 'all'}
                      onPress={() =>
                        changeFilter('all')
                      }
                    />

                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="Pending"
                      count={summary?.pending ?? 0}
                      active={filter === 'pending'}
                      alert
                      onPress={() =>
                        changeFilter('pending')
                      }
                    />

                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="Approved"
                      count={summary?.approved ?? 0}
                      active={filter === 'approved'}
                      positive
                      onPress={() =>
                        changeFilter('approved')
                      }
                    />

                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="Rejected"
                      count={summary?.rejected ?? 0}
                      active={filter === 'rejected'}
                      onPress={() =>
                        changeFilter('rejected')
                      }
                    />

                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="Withdrawn"
                      count={summary?.withdrawn ?? 0}
                      active={filter === 'withdrawn'}
                      onPress={() =>
                        changeFilter('withdrawn')
                      }
                    />
                  </View>

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
                      placeholder="Search name, email, or blood type"
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
              </FadeInView>

              {/* ================================================
                  APPLICATION TABLE
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
                        ['Donor', styles.colApplicant],
                        ['Blood Type', styles.colBlood],
                        ['Donor History', styles.colHistory],
                        ['Availability', styles.colAvailability],
                        ['Radius', styles.colRadius],
                        ['Submitted', styles.colSubmitted],
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
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      loading
                      title=""
                      text="Loading donor applications..."
                    />
                  ) : error ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon="error-outline"
                      iconColor={COLORS.redBright}
                      title="Unable to Load Applications"
                      text={error}
                      actionLabel="Try Again"
                      onAction={loadApplications}
                    />
                  ) : visibleApplications.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon={
                        search
                          ? 'search-off'
                          : 'assignment-turned-in'
                      }
                      title={
                        search
                          ? 'No Matching Applications'
                          : 'No Applications Found'
                      }
                      text={
                        search
                          ? 'Try a different name, email, or blood type.'
                          : filter === 'all'
                            ? 'There are no donor applications yet.'
                            : `There are no ${filter} donor applications right now.`
                      }
                    />
                  ) : (
                    visibleApplications.map(
                      (application, index) => (
                        <FadeInView
                          key={application.id}
                          delay={Math.min(index, 8) * 30}
                          offset={6}
                        >
                          <ApplicationRow
                            application={application}
                            scale={s}
                            fontScale={fs}
                            last={
                              index ===
                              visibleApplications.length - 1
                            }
                            onPress={() =>
                              openApplication(
                                application.id
                              )
                            }
                          />
                        </FadeInView>
                      )
                    )
                  )}
                </View>
              </FadeInView>

              {!loading &&
              !error &&
              visibleApplications.length > 0 ? (
                <Text
                  style={[
                    styles.cellMuted,

                    {
                      fontSize: 12 * fs,
                      marginTop: 14 * s,
                    },
                  ]}
                >
                  Showing {visibleApplications.length}{' '}
                  {visibleApplications.length === 1
                    ? 'application'
                    : 'applications'}
                  {filter === 'pending'
                    ? ' • oldest first'
                    : ''}
                </Text>
              ) : null}
            </ScrollView>

            <AdminBottomNav activeTab="applications" />
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
  alert = false,
  positive = false,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  count: number;
  active: boolean;
  alert?: boolean;
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

          alert &&
            count > 0 &&
            styles.filterCountAlert,

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
// TABLE MESSAGE (loading / error / empty)
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
// APPLICATION ROW
// ============================================================

function ApplicationRow({
  application,
  scale,
  fontScale,
  last,
  onPress,
}: {
  application: DonorApplication;
  scale: number;
  fontScale: number;
  last: boolean;
  onPress: () => void;
}) {
  const user =
    getApplicant(application);

  const available =
    application.availability_status ===
    'available';

  const waitingDays =
    application.status === 'pending'
      ? getWaitingDays(application)
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.applicationRow,

        {
          minHeight: 88 * scale,
          paddingHorizontal: 22 * scale,
          paddingVertical: 12 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.rowPressed,
      ]}
    >
      {/* DONOR */}

      <View
        style={[
          styles.colApplicant,

          {
            paddingRight: 12 * scale,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.nameText,

            {
              fontSize: 13.5 * fontScale,
            },
          ]}
        >
          {getApplicantName(application)}
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
          {user?.email ||
            'Email unavailable'}
        </Text>
      </View>

      {/* BLOOD TYPE */}

      <View style={styles.colBlood}>
        <View
          style={[
            styles.bloodPill,

            {
              minWidth: 46 * scale,
              height: 30 * scale,
              borderRadius: 6 * scale,
              paddingHorizontal: 11 * scale,
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
            {application.blood_type}
          </Text>
        </View>
      </View>

      {/* DONOR HISTORY */}

      <View style={styles.colHistory}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {application.has_donated_before
            ? 'Repeat donor'
            : 'First-time'}
        </Text>
      </View>

      {/* AVAILABILITY */}

      <View style={styles.colAvailability}>
        <View
          style={[
            styles.inlineValue,

            {
              gap: 7 * scale,
            },
          ]}
        >
          <View
            style={[
              {
                width: 8 * scale,
                height: 8 * scale,
                borderRadius: 4 * scale,
              },

              available
                ? styles.greenDot
                : styles.grayDot,
            ]}
          />

          <Text
            style={[
              styles.cellText,

              {
                fontSize: 12.5 * fontScale,
              },
            ]}
          >
            {available
              ? 'Available'
              : 'Unavailable'}
          </Text>
        </View>
      </View>

      {/* RADIUS */}

      <View style={styles.colRadius}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {application.travel_radius_km} km
        </Text>
      </View>

      {/* SUBMITTED */}

      <View style={styles.colSubmitted}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatDate(
            application.submitted_at ||
              application.created_at
          )}
        </Text>

        {waitingDays !== null ? (
          <Text
            style={[
              styles.waitingText,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 3 * scale,
              },

              waitingDays >= 3 &&
                styles.waitingLong,
            ]}
          >
            {waitingDays === 0
              ? 'Submitted today'
              : `Waiting ${waitingDays} ${
                  waitingDays === 1
                    ? 'day'
                    : 'days'
                }`}
          </Text>
        ) : null}
      </View>

      {/* STATUS */}

      <View style={styles.colStatus}>
        <StatusBadge
          status={application.status}
          scale={scale}
          fontScale={fontScale}
        />
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
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
  scale,
  fontScale,
}: {
  status: string;
  scale: number;
  fontScale: number;
}) {
  const normalized =
    String(status).toLowerCase();

  return (
    <View
      style={[
        styles.statusPill,

        {
          minWidth: 96 * scale,
          height: 32 * scale,
          borderRadius: 6 * scale,
          paddingHorizontal: 12 * scale,
        },

        normalized === 'pending' &&
          styles.pendingPill,

        normalized === 'approved' &&
          styles.approvedPill,

        normalized === 'rejected' &&
          styles.rejectedPill,

        normalized === 'withdrawn' &&
          styles.withdrawnPill,
      ]}
    >
      <Text
        style={[
          styles.statusPillText,

          {
            fontSize: 12 * fontScale,
          },

          normalized === 'pending' &&
            styles.pendingPillText,

          normalized === 'approved' &&
            styles.approvedPillText,

          normalized === 'rejected' &&
            styles.rejectedPillText,

          normalized === 'withdrawn' &&
            styles.withdrawnPillText,
        ]}
      >
        {normalized.charAt(0).toUpperCase() +
          normalized.slice(1)}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

// Some older API responses used `profile` or `applicant`
// instead of `user`; keep supporting them.
function getApplicant(
  application: DonorApplication
) {
  const raw =
    application as any;

  return (
    application.user ||
    raw.profile ||
    raw.applicant ||
    null
  );
}

function getApplicantName(
  application: DonorApplication
) {
  const user =
    getApplicant(application);

  return (
    [
      user?.first_name,
      user?.middle_name,
      user?.last_name,
      user?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    'Applicant'
  );
}

function getSubmittedTime(
  application: DonorApplication
) {
  const time = new Date(
    application.submitted_at ||
      application.created_at ||
      ''
  ).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
}

function getWaitingDays(
  application: DonorApplication
) {
  const time =
    getSubmittedTime(application);

  if (!time) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - time) / DAY_MS
    )
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
    return value;
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

  // FILTERS + SEARCH

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

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

  filterCountAlert: {
    backgroundColor: 'rgba(239,51,64,0.22)',
  },

  filterCountPositive: {
    backgroundColor: 'rgba(53,201,130,0.18)',
  },

  filterCountText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
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

  applicationRow: {
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

  colApplicant: {
    width: '24%',
  },

  colBlood: {
    width: '10%',
  },

  colHistory: {
    width: '12%',
  },

  colAvailability: {
    width: '13%',
  },

  colRadius: {
    width: '8%',
  },

  colSubmitted: {
    width: '15%',
  },

  colStatus: {
    width: '14%',
  },

  colAction: {
    width: '4%',
    alignItems: 'flex-end',
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

  waitingText: {
    color: COLORS.orange,
    fontFamily: 'Inter_500Medium',
  },

  waitingLong: {
    color: COLORS.redBright,
  },

  inlineValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  greenDot: {
    backgroundColor: COLORS.green,
  },

  grayDot: {
    backgroundColor: COLORS.muted,
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

  statusPill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  pendingPill: {
    borderColor: 'rgba(243,163,74,0.55)',
    backgroundColor: 'rgba(243,163,74,0.12)',
  },

  pendingPillText: {
    color: COLORS.orange,
  },

  approvedPill: {
    borderColor: 'rgba(53,201,130,0.50)',
    backgroundColor: 'rgba(53,201,130,0.12)',
  },

  approvedPillText: {
    color: COLORS.green,
  },

  rejectedPill: {
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  rejectedPillText: {
    color: COLORS.redBright,
  },

  withdrawnPill: {
    borderColor: 'rgba(127,136,159,0.45)',
    backgroundColor: 'rgba(127,136,159,0.10)',
  },

  withdrawnPillText: {
    color: COLORS.muted,
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

  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  primaryButtonText: {
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
