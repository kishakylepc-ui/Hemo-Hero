import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
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

import AdminBottomNav from '../AdminBottomNav';
import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

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
// DESIGN
//
// Layout follows the Donor Applications list for a consistent
// Admin UI.
// ============================================================

const PAGE_LIMIT = 15;

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

type StatusFilter =
  | 'all'
  | 'successful'
  | 'failed';

// Module names written by the server's activityLog() routes.
const MODULES = [
  'Authentication',
  'Profile',
  'Account Security',
  'User Management',
  'Donor Applications',
  'Blood Requests',
  'Donor Responses',
  'Donor Invitations',
  'Coordination',
  'Issues',
  'Notifications',
] as const;

// ============================================================
// SCREEN
// ============================================================

export default function ActivityLogsScreen() {

  // ==========================================================
  // RESPONSIVE TABLET FRAME
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [logs, setLogs] =
    useState<ActivityLog[]>([]);

  const [summary, setSummary] =
    useState<ActivityLogSummary>({
      total: 0,
      successful: 0,
      failed: 0,
    });

  const [pagination, setPagination] =
    useState<ActivityLogPagination>({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      total_pages: 0,
    });

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [emailInput, setEmailInput] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');

  const [moduleFilter, setModuleFilter] =
    useState<string>('all');

  const [selectedLog, setSelectedLog] =
    useState<ActivityLog | null>(null);

  const hasLoadedOnce = useRef(false);

  // ==========================================================
  // LOAD
  //
  // useFocusEffect: loads on first open, on filter/page
  // changes, and again whenever the screen regains focus so
  // new activity shows up.
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [
      page,
      emailFilter,
      statusFilter,
      moduleFilter,
    ])
  );

  async function loadLogs() {
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

      const success =
        statusFilter === 'successful'
          ? true
          : statusFilter === 'failed'
            ? false
            : undefined;

      const [
        summaryResult,
        logsResult,
      ] = await Promise.all([
        getAdminActivityLogSummary(token),

        getAdminActivityLogs(token, {
          page,
          limit: PAGE_LIMIT,
          user_email: emailFilter || undefined,
          success,
          module:
            moduleFilter === 'all'
              ? undefined
              : moduleFilter,
        }),
      ]);

      setSummary(summaryResult);

      setLogs(
        logsResult.logs ||
          []
      );

      setPagination(
        logsResult.pagination
      );

      hasLoadedOnce.current = true;
    } catch (error) {
      console.log(
        'ADMIN ACTIVITY LOG ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load activity logs.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ==========================================================
  // FILTERS
  // ==========================================================

  function submitSearch() {
    setPage(1);

    setEmailFilter(
      emailInput
        .trim()
        .toLowerCase()
    );
  }

  function clearSearch() {
    setEmailInput('');
    setEmailFilter('');
    setPage(1);
  }

  function changeStatusFilter(
    value: StatusFilter
  ) {
    setPage(1);
    setStatusFilter(value);
  }

  function changeModuleFilter(
    value: string
  ) {
    setPage(1);
    setModuleFilter(value);
  }

  function resetFilters() {
    setEmailInput('');
    setEmailFilter('');
    setStatusFilter('all');
    setModuleFilter('all');
    setPage(1);
  }

  const hasFilters =
    Boolean(emailFilter) ||
    statusFilter !== 'all' ||
    moduleFilter !== 'all';

  const successRate =
    summary.total > 0
      ? Math.round(
          (summary.successful /
            summary.total) *
            100
        )
      : null;

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
                      Log Trails
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
                      Audit trail of user and administrator actions.
                      {successRate !== null
                        ? `  ${successRate}% of ${summary.total.toLocaleString()} recorded actions succeeded.`
                        : ''}
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={loadLogs}
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
                  RESULT FILTERS + SEARCH
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
                    label="All Activity"
                    count={summary.total}
                    active={statusFilter === 'all'}
                    onPress={() =>
                      changeStatusFilter('all')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Successful"
                    count={summary.successful}
                    active={statusFilter === 'successful'}
                    tone="green"
                    onPress={() =>
                      changeStatusFilter('successful')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Failed"
                    count={summary.failed}
                    active={statusFilter === 'failed'}
                    tone="red"
                    onPress={() =>
                      changeStatusFilter('failed')
                    }
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
                      value={emailInput}
                      onChangeText={setEmailInput}
                      onSubmitEditing={submitSearch}
                      returnKeyType="search"
                      placeholder="Search by user email"
                      placeholderTextColor={COLORS.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      style={[
                        styles.searchInput,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    />

                    {emailInput ? (
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

                {/* MODULES */}

                <View
                  style={[
                    styles.wrapRow,

                    {
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
                    MODULE
                  </Text>

                  {['all', ...MODULES].map(module => (
                    <Pressable
                      key={module}
                      onPress={() =>
                        changeModuleFilter(module)
                      }
                      style={({ pressed }) => [
                        styles.chip,

                        {
                          height: 32 * s,
                          paddingHorizontal: 12 * s,
                          borderRadius: 8 * s,
                        },

                        moduleFilter === module &&
                          styles.chipActive,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,

                          {
                            fontSize: 12 * fs,
                          },

                          moduleFilter === module &&
                            styles.chipTextActive,
                        ]}
                      >
                        {module === 'all'
                          ? 'All'
                          : module}
                      </Text>
                    </Pressable>
                  ))}

                  {hasFilters ? (
                    <Pressable
                      onPress={resetFilters}
                      style={({ pressed }) => [
                        styles.resetButton,

                        {
                          height: 32 * s,
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
                        size={15 * s}
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
                        Reset
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
                        ['Activity', styles.colActivity],
                        ['User', styles.colUser],
                        ['Module', styles.colModule],
                        ['Result', styles.colStatus],
                        ['Date', styles.colDate],
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
                      text="Loading activity logs..."
                    />
                  ) : errorMessage && logs.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon="error-outline"
                      iconColor={COLORS.redBright}
                      title="Unable to Load Activity"
                      text={errorMessage}
                      actionLabel="Try Again"
                      onAction={loadLogs}
                    />
                  ) : logs.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon={
                        hasFilters
                          ? 'search-off'
                          : 'history'
                      }
                      title={
                        hasFilters
                          ? 'No Matching Activity'
                          : 'No Activity Yet'
                      }
                      text={
                        hasFilters
                          ? 'Try changing the email, result, or module filter.'
                          : 'Recorded actions will appear here.'
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
                    logs.map((log, index) => (
                      <FadeInView
                        key={log.id}
                        delay={Math.min(index, 8) * 25}
                        offset={6}
                      >
                        <ActivityRow
                          log={log}
                          scale={s}
                          fontScale={fs}
                          last={
                            index === logs.length - 1
                          }
                          onPress={() =>
                            setSelectedLog(log)
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
                    {pagination.total.toLocaleString()}{' '}
                    {pagination.total === 1
                      ? 'record'
                      : 'records'}
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

            <AdminBottomNav activeTab="activityLogs" />
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          LOG DETAILS
      ======================================================== */}

      <LogDetailsModal
        log={selectedLog}
        scale={s}
        fontScale={fs}
        onClose={() =>
          setSelectedLog(null)
        }
      />
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
  tone?: 'green' | 'red';
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

          tone === 'green' &&
            styles.filterCountGreen,

          tone === 'red' &&
            count > 0 &&
            styles.filterCountRed,
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
          {count.toLocaleString()}
        </Text>
      </View>
    </Pressable>
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
// ACTIVITY ROW
// ============================================================

function ActivityRow({
  log,
  scale,
  fontScale,
  last,
  onPress,
}: {
  log: ActivityLog;
  scale: number;
  fontScale: number;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tableRow,

        {
          minHeight: 76 * scale,
          paddingHorizontal: 22 * scale,
          paddingVertical: 11 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.rowPressed,
      ]}
    >
      {/* ACTIVITY */}

      <View
        style={[
          styles.colActivity,
          styles.row,

          {
            alignItems: 'center',
            paddingRight: 12 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.activityIcon,

            {
              width: 36 * scale,
              height: 36 * scale,
              borderRadius: 9 * scale,
              marginRight: 11 * scale,
            },

            !log.success &&
              styles.activityIconFailed,
          ]}
        >
          <MaterialIcons
            name={getActionIcon(log.action)}
            size={18 * scale}
            color={
              log.success
                ? COLORS.soft
                : COLORS.redBright
            }
          />
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
            {formatAction(log.action)}
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
            {log.description ||
              'Activity recorded.'}
          </Text>
        </View>
      </View>

      {/* USER */}

      <View
        style={[
          styles.colUser,

          {
            paddingRight: 10 * scale,
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
          {log.user_email ||
            'Unknown user'}
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
          {formatValue(log.user_role) || 'No role'}
        </Text>
      </View>

      {/* MODULE */}

      <View style={styles.colModule}>
        <View
          style={[
            styles.modulePill,

            {
              height: 28 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 6 * scale,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.modulePillText,

              {
                fontSize: 11.5 * fontScale,
              },
            ]}
          >
            {log.module || '—'}
          </Text>
        </View>
      </View>

      {/* RESULT */}

      <View style={styles.colStatus}>
        <View
          style={[
            styles.pill,

            {
              height: 28 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 14 * scale,
              gap: 6 * scale,
            },

            log.success
              ? styles.successPill
              : styles.failedPill,
          ]}
        >
          <View
            style={{
              width: 6 * scale,
              height: 6 * scale,
              borderRadius: 3 * scale,
              backgroundColor: log.success
                ? COLORS.green
                : COLORS.redBright,
            }}
          />

          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: log.success
                  ? COLORS.green
                  : COLORS.redBright,
              },
            ]}
          >
            {log.success
              ? 'Success'
              : 'Failed'}
          </Text>
        </View>
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
          {formatDate(log.created_at)}
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
          {formatTime(log.created_at)}
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
// LOG DETAILS MODAL
// ============================================================

function LogDetailsModal({
  log,
  scale,
  fontScale,
  onClose,
}: {
  log: ActivityLog | null;
  scale: number;
  fontScale: number;
  onClose: () => void;
}) {
  const metadataEntries =
    log?.metadata &&
    typeof log.metadata === 'object'
      ? Object.entries(log.metadata)
      : [];

  return (
    <Modal
      transparent
      visible={Boolean(log)}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {log ? (
          <View
            style={[
              styles.modalCard,

              {
                width: 620 * scale,
                maxWidth: '92%',
                maxHeight: '86%',
                borderRadius: 18 * scale,
                borderColor: log.success
                  ? COLORS.border
                  : 'rgba(239,51,64,0.55)',
              },
            ]}
          >
            {/* HEADER */}

            <View
              style={[
                styles.modalHeader,

                {
                  padding: 22 * scale,
                  gap: 12 * scale,
                },
              ]}
            >
              <View
                style={[
                  styles.activityIcon,

                  {
                    width: 44 * scale,
                    height: 44 * scale,
                    borderRadius: 11 * scale,
                  },

                  !log.success &&
                    styles.activityIconFailed,
                ]}
              >
                <MaterialIcons
                  name={getActionIcon(log.action)}
                  size={22 * scale}
                  color={
                    log.success
                      ? COLORS.soft
                      : COLORS.redBright
                  }
                />
              </View>

              <View style={styles.flexFill}>
                <Text
                  style={[
                    styles.modalTitle,

                    {
                      fontSize: 18 * fontScale,
                    },
                  ]}
                >
                  {formatAction(log.action)}
                </Text>

                <Text
                  style={[
                    styles.cellMuted,

                    {
                      fontSize: 12.5 * fontScale,
                      marginTop: 2 * scale,
                    },
                  ]}
                >
                  {log.description ||
                    'Activity recorded.'}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={8}
              >
                <MaterialIcons
                  name="close"
                  size={22 * scale}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{
                padding: 22 * scale,
                gap: 18 * scale,
              }}
            >
              <DetailGroup
                scale={scale}
                fontScale={fontScale}
                title="Event"
              >
                <DetailRow fontScale={fontScale} label="Result" value={log.success ? 'Successful' : 'Failed'} color={log.success ? COLORS.green : COLORS.redBright} />
                <DetailRow fontScale={fontScale} label="Module" value={log.module || '—'} />
                <DetailRow fontScale={fontScale} label="Date & time" value={formatDateTime(log.created_at)} />
                <DetailRow fontScale={fontScale} label="Action code" value={log.action || '—'} mono />
              </DetailGroup>

              <DetailGroup
                scale={scale}
                fontScale={fontScale}
                title="User"
              >
                <DetailRow fontScale={fontScale} label="Email" value={log.user_email || 'Unknown user'} />
                <DetailRow fontScale={fontScale} label="Role" value={formatValue(log.user_role) || '—'} />
                <DetailRow fontScale={fontScale} label="User ID" value={log.user_id || '—'} mono />
              </DetailGroup>

              <DetailGroup
                scale={scale}
                fontScale={fontScale}
                title="Request"
              >
                <DetailRow
                  fontScale={fontScale}
                  label="Route"
                  value={
                    [log.http_method, log.route]
                      .filter(Boolean)
                      .join(' ') || '—'
                  }
                  mono
                />
                <DetailRow
                  fontScale={fontScale}
                  label="HTTP status"
                  value={
                    log.status_code !== null &&
                    log.status_code !== undefined
                      ? String(log.status_code)
                      : '—'
                  }
                />
                <DetailRow fontScale={fontScale} label="IP address" value={log.ip_address || '—'} mono />
                <DetailRow fontScale={fontScale} label="Device" value={log.user_agent || '—'} />
              </DetailGroup>

              {log.entity_type || log.entity_id ? (
                <DetailGroup
                  scale={scale}
                  fontScale={fontScale}
                  title="Related Record"
                >
                  <DetailRow fontScale={fontScale} label="Type" value={formatValue(log.entity_type) || '—'} />
                  <DetailRow fontScale={fontScale} label="ID" value={log.entity_id || '—'} mono />
                </DetailGroup>
              ) : null}

              {metadataEntries.length > 0 ? (
                <DetailGroup
                  scale={scale}
                  fontScale={fontScale}
                  title="Details"
                >
                  {metadataEntries.map(([key, value]) => (
                    <DetailRow
                      key={key}
                      fontScale={fontScale}
                      label={formatValue(key) || key}
                      value={formatMetadataValue(value)}
                    />
                  ))}
                </DetailGroup>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DetailGroup({
  scale,
  fontScale,
  title,
  children,
}: {
  scale: number;
  fontScale: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text
        style={[
          styles.filterLabel,

          {
            fontSize: 11 * fontScale,
            marginBottom: 8 * scale,
          },
        ]}
      >
        {title.toUpperCase()}
      </Text>

      <View
        style={[
          styles.detailPanel,

          {
            borderRadius: 11 * scale,
            paddingHorizontal: 14 * scale,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function DetailRow({
  fontScale,
  label,
  value,
  color,
  mono = false,
}: {
  fontScale: number;
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text
        style={[
          styles.cellMuted,

          {
            fontSize: 12.5 * fontScale,
            width: '32%',
          },
        ]}
      >
        {label}
      </Text>

      <Text
        selectable
        style={[
          styles.detailValue,

          {
            fontSize: 12.5 * fontScale,
          },

          mono &&
            styles.mono,

          color
            ? { color }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatAction(
  action?: string | null
) {
  if (!action) {
    return 'Activity';
  }

  return String(action)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

function getActionIcon(
  action?: string | null
): IconName {
  const normalized =
    String(action || '').toUpperCase();

  if (normalized.includes('LOGIN')) return 'login';
  if (normalized.includes('LOGOUT')) return 'logout';

  if (
    normalized.includes('PASSWORD') ||
    normalized.includes('EMAIL') ||
    normalized.includes('RECOVERY')
  ) {
    return 'lock';
  }

  if (normalized.includes('APPROVE')) return 'check-circle';
  if (normalized.includes('REJECT')) return 'cancel';
  if (normalized.includes('REPORT')) return 'flag';
  if (normalized.includes('MESSAGE')) return 'chat';
  if (normalized.includes('SCHEDULE')) return 'event';
  if (normalized.includes('NOTIFICATION')) return 'notifications';
  if (normalized.includes('DELETE')) return 'delete-outline';
  if (normalized.includes('DEACTIVATE')) return 'person-off';
  if (normalized.includes('ACTIVATE')) return 'person-add';
  if (normalized.includes('CREATE') || normalized.includes('REGISTER')) return 'add-circle-outline';

  if (
    normalized.includes('UPDATE') ||
    normalized.includes('EDIT')
  ) {
    return 'edit';
  }

  if (normalized.includes('PROFILE')) return 'person';

  return 'history';
}

function formatValue(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

function formatMetadataValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.join(', ')
      : '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
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
      second: '2-digit',
    }
  );
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
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

  filterCountGreen: {
    backgroundColor: 'rgba(53,201,130,0.18)',
  },

  filterCountRed: {
    backgroundColor: 'rgba(239,51,64,0.22)',
  },

  filterCountText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },

  filterLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },

  searchInputContainer: {
    flex: 1,
    minWidth: 240,
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

  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  chipActive: {
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(219,10,10,0.15)',
  },

  chipText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  chipTextActive: {
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

  colActivity: {
    width: '33%',
  },

  colUser: {
    width: '22%',
  },

  colModule: {
    width: '15%',
  },

  colStatus: {
    width: '11%',
  },

  colDate: {
    width: '15%',
  },

  colAction: {
    width: '4%',
    alignItems: 'flex-end',
  },

  activityIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  activityIconFailed: {
    backgroundColor: 'rgba(239,51,64,0.12)',
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

  modulePill: {
    alignSelf: 'flex-start',
    maxWidth: '96%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  modulePillText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
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

  successPill: {
    borderColor: 'rgba(53,201,130,0.40)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  failedPill: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
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

  // MODAL

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(2,4,10,0.78)',
  },

  modalCard: {
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#0B142A',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  detailPanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  detailValue: {
    flex: 1,
    color: COLORS.white,
    fontFamily: 'Inter_500Medium',
  },

  mono: {
    fontFamily:
      Platform.OS === 'ios'
        ? 'Menlo'
        : 'monospace',
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
