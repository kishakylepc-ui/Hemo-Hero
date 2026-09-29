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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';
import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  getAdminReports,
  type AdminProfile,
  type AdminReport,
  type AdminReportKind,
  type AdminReportPagination,
  type AdminReportStatus,
  type AdminReportSummary,
  type AdminReportUser,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// DESIGN
//
// Layout follows the Donor Applications list
// (applications/index.tsx) for a consistent Admin UI.
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

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

const EMPTY_SUMMARY: AdminReportSummary = {
  total: 0,
  open: 0,
  in_review: 0,
  resolved: 0,
  dismissed: 0,
  reports: 0,
  feedback: 0,
  unresolved_reports: 0,
};

type StatusFilter =
  | 'all'
  | AdminReportStatus;

type KindFilter =
  | 'all'
  | AdminReportKind;

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// ISSUES LIST
// ============================================================

export default function AdminIssuesScreen() {
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

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [reports, setReports] =
    useState<AdminReport[]>([]);

  const [summary, setSummary] =
    useState<AdminReportSummary>(EMPTY_SUMMARY);

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

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [kindFilter, setKindFilter] =
    useState<KindFilter>('all');

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
      loadIssues();
    }, [
      page,
      searchFilter,
      statusFilter,
      kindFilter,
    ])
  );

  async function loadIssues() {
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
        savedProfile?.role !== 'admin'
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(savedProfile);

      const result =
        await getAdminReports(token, {
          page,
          limit: PAGE_LIMIT,
          status: statusFilter,
          kind: kindFilter,
          search: searchFilter || undefined,
        });

      setSummary(
        result.summary ||
          EMPTY_SUMMARY
      );

      setReports(
        result.reports ||
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
        'ADMIN ISSUES ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load issues.'
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

  function changeKindFilter(
    kind: KindFilter
  ) {
    setPage(1);
    setKindFilter(kind);
  }

  function openIssue(
    reportId: string
  ) {
    router.push(
      `/issues/${reportId}` as any
    );
  }

  const hasFilters =
    Boolean(searchFilter) ||
    statusFilter !== 'all' ||
    kindFilter !== 'all';

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
                      Issues
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
                      Review feedback and reports submitted from donation coordinations.
                      {summary.unresolved_reports > 0
                        ? `  ${summary.unresolved_reports} ${
                            summary.unresolved_reports === 1
                              ? 'report needs'
                              : 'reports need'
                          } attention.`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={loadIssues}
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
                    label="Open"
                    count={summary.open}
                    active={statusFilter === 'open'}
                    alert
                    onPress={() =>
                      changeStatusFilter('open')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="In Review"
                    count={summary.in_review}
                    active={statusFilter === 'in_review'}
                    warning
                    onPress={() =>
                      changeStatusFilter('in_review')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Resolved"
                    count={summary.resolved}
                    active={statusFilter === 'resolved'}
                    positive
                    onPress={() =>
                      changeStatusFilter('resolved')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Dismissed"
                    count={summary.dismissed}
                    active={statusFilter === 'dismissed'}
                    onPress={() =>
                      changeStatusFilter('dismissed')
                    }
                  />
                </View>

                {/* TYPE + SEARCH */}

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
                      styles.segment,

                      {
                        height: 44 * s,
                        borderRadius: 10 * s,
                        padding: 4 * s,
                        gap: 4 * s,
                      },
                    ]}
                  >
                    {(
                      [
                        ['all', 'All Types', summary.total],
                        ['report', 'Reports', summary.reports],
                        ['feedback', 'Feedback', summary.feedback],
                      ] as [KindFilter, string, number][]
                    ).map(([value, label, count]) => (
                      <Pressable
                        key={value}
                        onPress={() =>
                          changeKindFilter(value)
                        }
                        style={({ pressed }) => [
                          styles.segmentItem,

                          {
                            paddingHorizontal: 14 * s,
                            borderRadius: 7 * s,
                          },

                          kindFilter === value &&
                            styles.segmentItemActive,

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,

                            {
                              fontSize: 12.5 * fs,
                            },

                            kindFilter === value &&
                              styles.segmentTextActive,
                          ]}
                        >
                          {label}
                          <Text style={styles.segmentCount}>
                            {'  '}
                            {count}
                          </Text>
                        </Text>
                      </Pressable>
                    ))}
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
                      placeholder="Search name, email, reason, or details"
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
                        ['Type', styles.colType],
                        ['Submitted By', styles.colReporter],
                        ['About', styles.colReported],
                        ['Details', styles.colDetails],
                        ['Date', styles.colDate],
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
                        Loading issues...
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
                        Unable to Load Issues
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
                        onPress={loadIssues}
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
                  ) : reports.length === 0 ? (
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
                          hasFilters
                            ? 'search-off'
                            : 'verified-user'
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
                        {hasFilters
                          ? 'No Matching Issues'
                          : 'No Issues Reported'}
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
                        {hasFilters
                          ? 'Try changing your search, status, or type filter.'
                          : 'Feedback and reports from users will appear here.'}
                      </Text>
                    </View>
                  ) : (
                    reports.map(
                      (report, index) => (
                        <FadeInView
                          key={report.id}
                          // Small stagger, capped so long
                          // lists never feel slow.
                          delay={Math.min(index, 8) * 30}
                          offset={6}
                        >
                          <IssueRow
                            report={report}
                            scale={s}
                            fontScale={fs}
                            last={
                              index ===
                              reports.length - 1
                            }
                            onPress={() =>
                              openIssue(report.id)
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
                      ? 'issue'
                      : 'issues'}
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

            <AdminBottomNav activeTab="issues" />
          </SafeAreaView>
        </LinearGradient>
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
  alert = false,
  warning = false,
  positive = false,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  count: number;
  active: boolean;
  alert?: boolean;
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

          alert &&
            count > 0 &&
            styles.filterCountAlert,

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
// ISSUE ROW
// ============================================================

function IssueRow({
  report,
  scale,
  fontScale,
  last,
  onPress,
}: {
  report: AdminReport;
  scale: number;
  fontScale: number;
  last: boolean;
  onPress: () => void;
}) {
  const isReport =
    report.kind === 'report';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.issueRow,

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
      {/* TYPE */}

      <View style={styles.colType}>
        <View
          style={[
            styles.pill,

            {
              height: 30 * scale,
              borderRadius: 6 * scale,
              paddingHorizontal: 10 * scale,
              gap: 5 * scale,
            },

            isReport
              ? styles.reportPill
              : styles.feedbackPill,
          ]}
        >
          <MaterialIcons
            name={
              isReport
                ? 'flag'
                : 'chat-bubble-outline'
            }
            size={14 * scale}
            color={
              isReport
                ? COLORS.redBright
                : COLORS.blue
            }
          />

          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: isReport
                  ? COLORS.redBright
                  : COLORS.blue,
              },
            ]}
          >
            {isReport
              ? 'Report'
              : 'Feedback'}
          </Text>
        </View>

        {report.reason ? (
          <Text
            numberOfLines={1}
            style={[
              styles.cellMuted,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 5 * scale,
                paddingRight: 8 * scale,
              },
            ]}
          >
            {report.reason}
          </Text>
        ) : null}
      </View>

      {/* PEOPLE */}

      <PersonCell
        style={styles.colReporter}
        user={report.reporter}
        fallbackEmail={report.reporter_email}
        scale={scale}
        fontScale={fontScale}
      />

      <PersonCell
        style={styles.colReported}
        user={report.reported_user}
        fallbackEmail={report.reported_user_email}
        scale={scale}
        fontScale={fontScale}
      />

      {/* DETAILS */}

      <View style={styles.colDetails}>
        <Text
          numberOfLines={2}
          style={[
            report.details
              ? styles.cellText
              : styles.cellMuted,

            {
              fontSize: 12.5 * fontScale,
              lineHeight: 18 * fontScale,
              paddingRight: 14 * scale,
            },
          ]}
        >
          {report.details ||
            'No additional details'}
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
          {formatDate(report.created_at)}
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
          {formatTime(report.created_at)}
        </Text>
      </View>

      {/* STATUS */}

      <View style={styles.colStatus}>
        <StatusPill
          status={report.status}
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
// PERSON CELL
// ============================================================

function PersonCell({
  style,
  user,
  fallbackEmail,
  scale,
  fontScale,
}: {
  style: object;
  user?: AdminReportUser | null;
  fallbackEmail?: string | null;
  scale: number;
  fontScale: number;
}) {
  const deleted = !user;

  const name = deleted
    ? 'Deleted account'
    : user.full_name?.trim() ||
      user.email ||
      'Hemo-Hero User';

  return (
    <View
      style={[
        style,

        {
          paddingRight: 12 * scale,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          deleted
            ? styles.cellMuted
            : styles.nameText,

          {
            fontSize: 13 * fontScale,
          },
        ]}
      >
        {name}
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
          fallbackEmail ||
          'No email'}
      </Text>
    </View>
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
  status: AdminReportStatus;
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
          minWidth: 96 * scale,
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
  status: AdminReportStatus
) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        color: COLORS.redBright,
        border: 'rgba(239,51,64,0.50)',
        background: 'rgba(239,51,64,0.12)',
      };

    case 'in_review':
      return {
        label: 'In Review',
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'resolved':
      return {
        label: 'Resolved',
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    default:
      return {
        label: 'Dismissed',
        color: COLORS.muted,
        border: 'rgba(127,136,159,0.45)',
        background: 'rgba(127,136,159,0.10)',
      };
  }
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
    borderRadius:
      Platform.OS === 'web'
        ? 24
        : 0,
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

  filterCountAlert: {
    backgroundColor: 'rgba(239,51,64,0.22)',
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

  // TOOLBAR (type + search)

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
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

  segmentCount: {
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
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

  issueRow: {
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

  colType: {
    width: '14%',
  },

  colReporter: {
    width: '17%',
  },

  colReported: {
    width: '17%',
  },

  colDetails: {
    width: '25%',
  },

  colDate: {
    width: '11%',
  },

  colStatus: {
    width: '12%',
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

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  pillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  reportPill: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  feedbackPill: {
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
