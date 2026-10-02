import {
  type ComponentProps,
  type ReactNode,
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
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminBottomNav from '../AdminBottomNav';
import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  getAdminActivityLogs,
  getAdminActivityLogSummary,
  getAdminBloodRequests,
  getAdminBloodTypeDemand,
  getAdminDonations,
  getAdminDonorSummary,
  getAdminReportSummary,
  getAdminUserSummary,
  type ActivityLog,
  type ActivityLogSummary,
  type AdminBloodRequestSummary,
  type AdminBloodTypeDemandItem,
  type AdminBloodTypeDemandResponse,
  type AdminDonation,
  type AdminDonationSummary,
  type AdminProfile,
  type AdminReportSummary,
  type AdminUserSummary,
  type DonorApplicationSummary,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// LIMITS
// ============================================================

// Server caps activity-log page size at 100.
const ACTIVITY_SAMPLE_LIMIT = 100;

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

  track: '#17233D',
  neutralBar: '#6E7E9C',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

type Tone =
  | 'neutral'
  | 'green'
  | 'red'
  | 'orange';

const TONE_COLORS: Record<Tone, string> = {
  neutral: COLORS.soft,
  green: COLORS.green,
  red: COLORS.redBright,
  orange: COLORS.orange,
};

// ============================================================
// SECTION ERRORS
// ============================================================

type SectionErrors = {
  users: string;
  applications: string;
  demand: string;
  requests: string;
  activity: string;
  modules: string;
  issues: string;
  donations: string;
};

const EMPTY_ERRORS: SectionErrors = {
  users: '',
  applications: '',
  demand: '',
  requests: '',
  activity: '',
  modules: '',
  issues: '',
  donations: '',
};

type ModuleStat = {
  module: string;
  total: number;
  failed: number;
};

// ============================================================
// ANALYTICS
// ============================================================

export default function AdminAnalyticsScreen() {

  // ==========================================================
  // RESPONSIVE IPAD FRAME
  // ==========================================================

  const tablet = useAdminCanvas();

  // ==========================================================
  // SCALE
  //
  // s  = layout / dimensions
  // fs = readable font scale
  // ==========================================================

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [userSummary, setUserSummary] =
    useState<AdminUserSummary | null>(null);

  const [applicationSummary, setApplicationSummary] =
    useState<DonorApplicationSummary | null>(null);

  const [bloodDemand, setBloodDemand] =
    useState<AdminBloodTypeDemandResponse | null>(null);

  const [requestSummary, setRequestSummary] =
    useState<AdminBloodRequestSummary | null>(null);

  const [activitySummary, setActivitySummary] =
    useState<ActivityLogSummary | null>(null);

  const [activitySample, setActivitySample] =
    useState<ActivityLog[]>([]);

  const [activityTotalLogs, setActivityTotalLogs] =
    useState(0);

  const [issueSummary, setIssueSummary] =
    useState<AdminReportSummary | null>(null);

  // Donations (the transaction record): totals plus the most
  // recent records for the blood-type and 30-day figures.
  const [donationSummary, setDonationSummary] =
    useState<AdminDonationSummary | null>(null);

  const [recentDonations, setRecentDonations] =
    useState<AdminDonation[]>([]);

  const [errors, setErrors] =
    useState<SectionErrors>(EMPTY_ERRORS);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  useEffect(() => {
    loadAnalytics(false);
  }, []);

  async function loadAnalytics(
    isRefresh: boolean
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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
      // LOAD EVERY SOURCE INDEPENDENTLY
      //
      // One failing endpoint should not hide the others.
      // ------------------------------------------------------

      const [
        usersResult,
        applicationsResult,
        demandResult,
        requestsResult,
        activitySummaryResult,
        activityLogsResult,
        issuesResult,
        donationsResult,
      ] = await Promise.allSettled([
        getAdminUserSummary(token),

        getAdminDonorSummary(token),

        getAdminBloodTypeDemand(token),

        // Only the system-wide summary is needed here.
        getAdminBloodRequests(token, {
          page: 1,
          limit: 1,
        }),

        getAdminActivityLogSummary(token),

        getAdminActivityLogs(token, {
          page: 1,
          limit: ACTIVITY_SAMPLE_LIMIT,
        }),

        getAdminReportSummary(token),

        // Summary + the latest 100 records.
        getAdminDonations(token, {
          page: 1,
          limit: 100,
        }),
      ]);

      const nextErrors: SectionErrors = {
        ...EMPTY_ERRORS,
      };

      // USERS

      if (usersResult.status === 'fulfilled') {
        setUserSummary(
          usersResult.value.summary
        );
      } else {
        console.log(
          'ADMIN ANALYTICS USERS ERROR:',
          usersResult.reason
        );

        setUserSummary(null);

        nextErrors.users = getErrorMessage(
          usersResult.reason,
          'Unable to load user accounts.'
        );
      }

      // DONOR APPLICATIONS

      if (applicationsResult.status === 'fulfilled') {
        setApplicationSummary(
          applicationsResult.value.summary
        );
      } else {
        console.log(
          'ADMIN ANALYTICS APPLICATIONS ERROR:',
          applicationsResult.reason
        );

        setApplicationSummary(null);

        nextErrors.applications = getErrorMessage(
          applicationsResult.reason,
          'Unable to load donor applications.'
        );
      }

      // BLOOD DEMAND

      if (demandResult.status === 'fulfilled') {
        setBloodDemand(
          demandResult.value
        );
      } else {
        console.log(
          'ADMIN ANALYTICS DEMAND ERROR:',
          demandResult.reason
        );

        setBloodDemand(null);

        nextErrors.demand = getErrorMessage(
          demandResult.reason,
          'Unable to load blood type demand.'
        );
      }

      // BLOOD REQUEST OUTCOMES

      if (requestsResult.status === 'fulfilled') {
        setRequestSummary(
          requestsResult.value.summary ||
            null
        );
      } else {
        console.log(
          'ADMIN ANALYTICS REQUESTS ERROR:',
          requestsResult.reason
        );

        setRequestSummary(null);

        nextErrors.requests = getErrorMessage(
          requestsResult.reason,
          'Unable to load blood request summary.'
        );
      }

      // ACTIVITY SUMMARY

      if (activitySummaryResult.status === 'fulfilled') {
        setActivitySummary(
          activitySummaryResult.value
        );
      } else {
        console.log(
          'ADMIN ANALYTICS ACTIVITY SUMMARY ERROR:',
          activitySummaryResult.reason
        );

        setActivitySummary(null);

        nextErrors.activity = getErrorMessage(
          activitySummaryResult.reason,
          'Unable to load activity summary.'
        );
      }

      // ACTIVITY MODULE SAMPLE

      if (activityLogsResult.status === 'fulfilled') {
        setActivitySample(
          activityLogsResult.value.logs ||
            []
        );

        setActivityTotalLogs(
          activityLogsResult.value.pagination
            ?.total ?? 0
        );
      } else {
        console.log(
          'ADMIN ANALYTICS ACTIVITY LOGS ERROR:',
          activityLogsResult.reason
        );

        setActivitySample([]);
        setActivityTotalLogs(0);

        nextErrors.modules = getErrorMessage(
          activityLogsResult.reason,
          'Unable to load activity by module.'
        );
      }

      // ISSUES

      if (issuesResult.status === 'fulfilled') {
        setIssueSummary(
          issuesResult.value.summary
        );
      } else {
        console.log(
          'ADMIN ANALYTICS ISSUES ERROR:',
          issuesResult.reason
        );

        setIssueSummary(null);

        nextErrors.issues = getErrorMessage(
          issuesResult.reason,
          'Unable to load issues.'
        );
      }

      // DONATIONS

      if (donationsResult.status === 'fulfilled') {
        setDonationSummary(
          donationsResult.value.summary
        );

        setRecentDonations(
          donationsResult.value.donations || []
        );
      } else {
        console.log(
          'ADMIN ANALYTICS DONATIONS ERROR:',
          donationsResult.reason
        );

        setDonationSummary(null);

        setRecentDonations([]);

        nextErrors.donations = getErrorMessage(
          donationsResult.reason,
          'Unable to load donations.'
        );
      }

      setErrors(nextErrors);

      setLastUpdated(new Date());
    } catch (error) {
      console.log(
        'ADMIN ANALYTICS ERROR:',
        error
      );

      setErrors({
        users: 'Unable to load analytics.',
        applications: 'Unable to load analytics.',
        demand: 'Unable to load analytics.',
        requests: 'Unable to load analytics.',
        activity: 'Unable to load analytics.',
        modules: 'Unable to load analytics.',
        issues: 'Unable to load analytics.',
        donations: 'Unable to load analytics.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const allFailed =
    Object.values(errors).every(
      message => message !== ''
    );

  const busy = loading || refreshing;

  // APPLICATIONS

  const reviewedApplications =
    (applicationSummary?.approved ?? 0) +
    (applicationSummary?.rejected ?? 0);

  const approvalRate = percentOf(
    applicationSummary?.approved ?? 0,
    reviewedApplications
  );

  // USERS

  const activeAccountRate = percentOf(
    userSummary?.active ?? 0,
    userSummary?.total ?? 0
  );

  // REQUEST OUTCOMES

  const closedRequests =
    (requestSummary?.fulfilled ?? 0) +
    (requestSummary?.cancelled ?? 0) +
    (requestSummary?.expired ?? 0);

  const fulfillmentRate = percentOf(
    requestSummary?.fulfilled ?? 0,
    closedRequests
  );

  // ISSUES
  //
  // Closed = resolved + dismissed.

  const closedIssues =
    (issueSummary?.resolved ?? 0) +
    (issueSummary?.dismissed ?? 0);

  const issueClosureRate = percentOf(
    closedIssues,
    issueSummary?.total ?? 0
  );

  // DONATIONS

  const donationRecordedRate = percentOf(
    donationSummary?.completed ?? 0,
    donationSummary?.total ?? 0
  );

  const monthAgo =
    Date.now() - 30 * 24 * 60 * 60 * 1000;

  const donationsLast30Days =
    recentDonations.filter(
      donation =>
        donation.status !== 'rejected' &&
        Date.parse(donation.donated_at) >= monthAgo
    ).length;

  // Bags from recorded donations, per blood type (largest first).
  const bagsByBloodType = Object.entries(
    recentDonations
      .filter(
        donation =>
          donation.status === 'completed'
      )
      .reduce<Record<string, number>>(
        (totals, donation) => {
          totals[donation.blood_type] =
            (totals[donation.blood_type] || 0) +
            (Number(donation.units_donated) || 0);

          return totals;
        },
        {}
      )
  ).sort((a, b) => b[1] - a[1]);

  const bagsTotal = bagsByBloodType.reduce(
    (sum, [, bags]) => sum + bags,
    0
  );

  // ACTIVITY

  const successRate = percentOf(
    activitySummary?.successful ?? 0,
    activitySummary?.total ?? 0
  );

  // BLOOD DEMAND

  const activeDemand = useMemo(
    () =>
      (bloodDemand?.demand || [])
        .filter(
          item =>
            item.request_count > 0 ||
            item.units_needed > 0
        )
        .sort(
          (a, b) =>
            b.units_needed - a.units_needed
        ),
    [bloodDemand]
  );

  const highestUnits = Math.max(
    ...activeDemand.map(
      item => item.units_needed
    ),
    1
  );

  // ACTIVITY BY MODULE

  const moduleStats = useMemo<ModuleStat[]>(() => {
    const grouped: Record<string, ModuleStat> = {};

    activitySample.forEach(log => {
      const key =
        log.module?.trim() || 'other';

      if (!grouped[key]) {
        grouped[key] = {
          module: key,
          total: 0,
          failed: 0,
        };
      }

      grouped[key].total += 1;

      if (!log.success) {
        grouped[key].failed += 1;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [activitySample]);

  const highestModuleTotal = Math.max(
    ...moduleStats.map(item => item.total),
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
            {/* ==================================================
                HEADER
            ================================================== */}

            <AdminHeader
              profile={profile}
              scale={s}
              fontScale={fs}
            />

            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,

                {
                  paddingHorizontal: 48 * s,
                  paddingTop: 34 * s,
                  paddingBottom: 28 * s,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* ================================================
                  TITLE
              ================================================ */}

              <View
                style={[
                  styles.titleRow,

                  {
                    marginBottom: 26 * s,
                  },
                ]}
              >
                <View style={styles.titleBody}>
                  <Text
                    style={[
                      styles.title,

                      {
                        fontSize: 30 * fs,
                        lineHeight: 38 * fs,
                      },
                    ]}
                  >
                    Analytics
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,

                      {
                        fontSize: 14 * fs,
                        lineHeight: 21 * fs,
                        marginTop: 4 * s,
                      },
                    ]}
                  >
                    System-wide insights from live Hemo-Hero data.
                    {lastUpdated
                      ? `  Updated ${formatTime(lastUpdated)}.`
                      : ''}
                  </Text>
                </View>

                {/* REFRESH */}

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    loadAnalytics(true)
                  }
                  style={({ pressed }) => [
                    styles.refreshButton,

                    {
                      height: 46 * s,
                      minWidth: 118 * s,
                      paddingHorizontal: 18 * s,
                      borderRadius: 10 * s,
                      gap: 8 * s,
                    },

                    pressed &&
                      styles.refreshPressed,

                    busy &&
                      styles.refreshDisabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="refresh"
                        size={21 * s}
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

              {/* ================================================
                  LOADING / TOTAL FAILURE / CONTENT
              ================================================ */}

              {loading ? (
                <View
                  style={[
                    styles.loading,

                    {
                      minHeight: 500 * s,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={COLORS.redBright}
                  />

                  <Text
                    style={[
                      styles.loadingText,

                      {
                        fontSize: 13 * fs,
                        marginTop: 14 * s,
                      },
                    ]}
                  >
                    Loading analytics...
                  </Text>
                </View>
              ) : allFailed ? (
                <View
                  style={[
                    styles.card,
                    styles.fullError,

                    {
                      minHeight: 420 * s,
                      borderRadius: 14 * s,
                      padding: 32 * s,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="cloud-off"
                    size={44 * s}
                    color={COLORS.redBright}
                  />

                  <Text
                    style={[
                      styles.messageTitle,

                      {
                        fontSize: 18 * fs,
                        marginTop: 14 * s,
                      },
                    ]}
                  >
                    Analytics unavailable
                  </Text>

                  <Text
                    style={[
                      styles.messageText,

                      {
                        fontSize: 13.5 * fs,
                        lineHeight: 20 * fs,
                        marginTop: 6 * s,
                        maxWidth: 440 * s,
                      },
                    ]}
                  >
                    {errors.users ||
                      'Unable to reach the Hemo-Hero server.'}{' '}
                    Check that the backend is running, then try again.
                  </Text>

                  <Pressable
                    onPress={() =>
                      loadAnalytics(false)
                    }
                    style={({ pressed }) => [
                      styles.primaryButton,

                      {
                        height: 46 * s,
                        paddingHorizontal: 22 * s,
                        borderRadius: 10 * s,
                        marginTop: 20 * s,
                        gap: 8 * s,
                      },

                      pressed &&
                        styles.primaryPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="refresh"
                      size={20 * s}
                      color={COLORS.white}
                    />

                    <Text
                      style={[
                        styles.primaryButtonText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <FadeInView>
                  {/* ============================================
                      SYSTEM OVERVIEW
                  ============================================ */}

                  <SectionLabel
                    scale={s}
                    fontScale={fs}
                    text="SYSTEM OVERVIEW"
                  />

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 16 * s,
                        marginBottom: 26 * s,
                      },
                    ]}
                  >
                    <OverviewCard
                      scale={s}
                      fontScale={fs}
                      icon="groups"
                      label="TOTAL USERS"
                      value={
                        errors.users
                          ? null
                          : userSummary?.total ?? 0
                      }
                      caption="Registered accounts"
                    />

                    <OverviewCard
                      scale={s}
                      fontScale={fs}
                      icon="how-to-reg"
                      label="ACTIVE USERS"
                      value={
                        errors.users
                          ? null
                          : userSummary?.active ?? 0
                      }
                      caption="Can sign in"
                      tone="green"
                    />

                    <OverviewCard
                      scale={s}
                      fontScale={fs}
                      icon="verified"
                      label="VERIFIED DONORS"
                      value={
                        errors.applications
                          ? null
                          : applicationSummary?.approved ?? 0
                      }
                      caption="Approved applications"
                      tone="green"
                    />

                    <OverviewCard
                      scale={s}
                      fontScale={fs}
                      icon="assignment"
                      label="ACTIVE REQUESTS"
                      value={
                        errors.demand
                          ? null
                          : bloodDemand?.summary
                              .active_requests ?? 0
                      }
                      caption="Open blood requests"
                      tone="orange"
                      onPress={() =>
                        router.push('/requests')
                      }
                    />

                    <OverviewCard
                      scale={s}
                      fontScale={fs}
                      icon="water-drop"
                      label="UNITS NEEDED"
                      value={
                        errors.demand
                          ? null
                          : bloodDemand?.summary
                              .units_needed ?? 0
                      }
                      caption="Across active requests"
                      tone="red"
                    />
                  </View>

                  {/* ============================================
                      APPLICATIONS + USERS
                  ============================================ */}

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 18 * s,
                        marginBottom: 18 * s,
                      },
                    ]}
                  >
                    {/* DONOR APPLICATIONS */}

                    <AnalyticsCard
                      scale={s}
                      style={{ flex: 1.35 }}
                    >
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="assignment-ind"
                        title="Donor Applications"
                        description="Status of every submitted donor application"
                        actionLabel="View"
                        onAction={() =>
                          router.push('/applications')
                        }
                      />

                      {errors.applications ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Applications unavailable"
                          text={errors.applications}
                        />
                      ) : !applicationSummary ||
                        applicationSummary.total === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="assignment"
                          title="No applications yet"
                          text="Application analytics will appear once donors apply."
                        />
                      ) : (
                        <View
                          style={[
                            styles.splitBody,

                            {
                              gap: 22 * s,
                              marginTop: 18 * s,
                            },
                          ]}
                        >
                          <RateBlock
                            scale={s}
                            fontScale={fs}
                            percent={approvalRate}
                            label="Approval rate"
                            detail={`${applicationSummary.approved} of ${reviewedApplications} reviewed`}
                            tone="green"
                          />

                          <View style={styles.flexFill}>
                            <MiniCountRow
                              scale={s}
                              fontScale={fs}
                              label="Total applications"
                              value={applicationSummary.total}
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Approved"
                              value={applicationSummary.approved}
                              total={applicationSummary.total}
                              tone="green"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Pending"
                              value={applicationSummary.pending}
                              total={applicationSummary.total}
                              tone="orange"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Rejected"
                              value={applicationSummary.rejected}
                              total={applicationSummary.total}
                              tone="red"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Withdrawn"
                              value={applicationSummary.withdrawn}
                              total={applicationSummary.total}
                              tone="neutral"
                              last
                            />
                          </View>
                        </View>
                      )}
                    </AnalyticsCard>

                    {/* USER ACCOUNTS */}

                    <AnalyticsCard
                      scale={s}
                      style={{ flex: 1 }}
                    >
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="manage-accounts"
                        title="User Accounts"
                        description="Active vs. deactivated accounts"
                        actionLabel="View"
                        onAction={() =>
                          router.push('/users')
                        }
                      />

                      {errors.users ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Accounts unavailable"
                          text={errors.users}
                        />
                      ) : !userSummary ||
                        userSummary.total === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="person-outline"
                          title="No user accounts"
                          text="Account analytics will appear once users register."
                        />
                      ) : (
                        <View
                          style={{
                            marginTop: 18 * s,
                          }}
                        >
                          <RateBlock
                            scale={s}
                            fontScale={fs}
                            percent={activeAccountRate}
                            label="Active accounts"
                            detail={`${userSummary.active} of ${userSummary.total} accounts`}
                            tone="green"
                            horizontal
                          />

                          <View
                            style={{
                              marginTop: 14 * s,
                            }}
                          >
                            <MiniCountRow
                              scale={s}
                              fontScale={fs}
                              label="Total accounts"
                              value={userSummary.total}
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Active"
                              value={userSummary.active}
                              total={userSummary.total}
                              tone="green"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Inactive"
                              value={userSummary.inactive}
                              total={userSummary.total}
                              tone="red"
                              last
                            />
                          </View>
                        </View>
                      )}
                    </AnalyticsCard>
                  </View>

                  {/* ============================================
                      BLOOD DEMAND + REQUEST OUTCOMES
                  ============================================ */}

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 18 * s,
                        marginBottom: 18 * s,
                      },
                    ]}
                  >
                    {/* BLOOD DEMAND */}

                    <AnalyticsCard
                      scale={s}
                      style={{ flex: 1.35 }}
                    >
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="bloodtype"
                        title="Blood Request Demand"
                        description="Active requests grouped by blood type"
                        badge={
                          !errors.demand &&
                          bloodDemand?.highest_demand
                            ? `${bloodDemand.highest_demand.blood_type} highest`
                            : undefined
                        }
                      />

                      {errors.demand ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Demand unavailable"
                          text={errors.demand}
                        />
                      ) : !bloodDemand ||
                        activeDemand.length === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="bloodtype"
                          title="No active blood requests"
                          text="Demand by blood type will appear when a request becomes active."
                        />
                      ) : (
                        <>
                          <View
                            style={[
                              styles.row,

                              {
                                gap: 10 * s,
                                marginTop: 16 * s,
                                marginBottom: 6 * s,
                              },
                            ]}
                          >
                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              icon="assignment"
                              label="Active"
                              value={
                                bloodDemand.summary
                                  .active_requests
                              }
                            />

                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              icon="water-drop"
                              label="Units"
                              value={
                                bloodDemand.summary
                                  .units_needed
                              }
                            />

                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              icon="priority-high"
                              label="Urgent"
                              value={
                                bloodDemand.summary
                                  .urgent_requests
                              }
                              tone="red"
                            />

                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              icon="event"
                              label="Scheduled"
                              value={
                                bloodDemand.summary
                                  .scheduled_requests
                              }
                            />
                          </View>

                          {activeDemand.map(
                            (item, index) => (
                              <DemandRow
                                key={item.blood_type}
                                item={item}
                                highestUnits={highestUnits}
                                scale={s}
                                fontScale={fs}
                                highlight={
                                  item.blood_type ===
                                  bloodDemand
                                    .highest_demand
                                    ?.blood_type
                                }
                                last={
                                  index ===
                                  activeDemand.length - 1
                                }
                              />
                            )
                          )}
                        </>
                      )}
                    </AnalyticsCard>

                    {/* REQUEST OUTCOMES */}

                    <AnalyticsCard
                      scale={s}
                      style={{ flex: 1 }}
                    >
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="fact-check"
                        title="Request Outcomes"
                        description="All blood requests by status"
                        actionLabel="View"
                        onAction={() =>
                          router.push('/requests')
                        }
                      />

                      {errors.requests ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Requests unavailable"
                          text={errors.requests}
                        />
                      ) : !requestSummary ||
                        requestSummary.total === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="assignment"
                          title="No blood requests yet"
                          text="Request outcomes will appear once requests are created."
                        />
                      ) : (
                        <View
                          style={{
                            marginTop: 18 * s,
                          }}
                        >
                          <RateBlock
                            scale={s}
                            fontScale={fs}
                            percent={fulfillmentRate}
                            label="Fulfillment rate"
                            detail={`${requestSummary.fulfilled} of ${closedRequests} closed requests`}
                            tone="green"
                            horizontal
                          />

                          <View
                            style={{
                              marginTop: 14 * s,
                            }}
                          >
                            <MiniCountRow
                              scale={s}
                              fontScale={fs}
                              label="Total requests"
                              value={requestSummary.total}
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Active"
                              value={requestSummary.active}
                              total={requestSummary.total}
                              tone="orange"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Fulfilled"
                              value={requestSummary.fulfilled}
                              total={requestSummary.total}
                              tone="green"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Cancelled"
                              value={requestSummary.cancelled}
                              total={requestSummary.total}
                              tone="neutral"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Expired"
                              value={requestSummary.expired ?? 0}
                              total={requestSummary.total}
                              tone="neutral"
                              last
                            />
                          </View>
                        </View>
                      )}
                    </AnalyticsCard>
                  </View>

                  {/* ============================================
                      ISSUES & REPORTS
                  ============================================ */}

                  <View
                    style={{
                      marginBottom: 18 * s,
                    }}
                  >
                    <AnalyticsCard scale={s}>
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="report-problem"
                        title="Issues & Reports"
                        description="Feedback and reports submitted from donation coordinations"
                        actionLabel="View Issues"
                        onAction={() =>
                          router.push('/issues' as any)
                        }
                      />

                      {errors.issues ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Issues unavailable"
                          text={errors.issues}
                        />
                      ) : !issueSummary ||
                        issueSummary.total === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="verified-user"
                          title="No issues reported"
                          text="Issue analytics will appear once users submit feedback or reports."
                        />
                      ) : (
                        <View
                          style={[
                            styles.splitBody,

                            {
                              gap: 22 * s,
                              marginTop: 18 * s,
                            },
                          ]}
                        >
                          <View style={styles.flexFill}>
                            <View
                              style={[
                                styles.row,

                                {
                                  gap: 10 * s,
                                  marginBottom: 14 * s,
                                },
                              ]}
                            >
                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="flag"
                                label="Reports"
                                value={issueSummary.reports}
                                tone="red"
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="chat-bubble-outline"
                                label="Feedback"
                                value={issueSummary.feedback}
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="warning-amber"
                                label="Unresolved reports"
                                value={issueSummary.unresolved_reports}
                                tone={
                                  issueSummary.unresolved_reports > 0
                                    ? 'red'
                                    : 'neutral'
                                }
                              />
                            </View>

                            <RateBlock
                              scale={s}
                              fontScale={fs}
                              percent={issueClosureRate}
                              label="Closed issues"
                              detail={`${closedIssues} of ${issueSummary.total} resolved or dismissed`}
                              tone="green"
                              horizontal
                            />
                          </View>

                          <View style={styles.verticalDivider} />

                          <View style={styles.flexFill}>
                            <MiniCountRow
                              scale={s}
                              fontScale={fs}
                              label="Total issues"
                              value={issueSummary.total}
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Open"
                              value={issueSummary.open}
                              total={issueSummary.total}
                              tone="red"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="In Review"
                              value={issueSummary.in_review}
                              total={issueSummary.total}
                              tone="orange"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Resolved"
                              value={issueSummary.resolved}
                              total={issueSummary.total}
                              tone="green"
                            />

                            <ProgressRow
                              scale={s}
                              fontScale={fs}
                              label="Dismissed"
                              value={issueSummary.dismissed}
                              total={issueSummary.total}
                              tone="neutral"
                              last
                            />
                          </View>
                        </View>
                      )}
                    </AnalyticsCard>
                  </View>

                  {/* ============================================
                      DONATIONS
                  ============================================ */}

                  <View
                    style={{
                      marginBottom: 18 * s,
                    }}
                  >
                    <AnalyticsCard scale={s}>
                      <CardHeader
                        scale={s}
                        fontScale={fs}
                        icon="volunteer-activism"
                        title="Donations"
                        description="Recorded blood donations and how they were confirmed"
                        actionLabel="View Donations"
                        onAction={() =>
                          router.push('/donations' as any)
                        }
                      />

                      {errors.donations ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="error"
                          title="Donations unavailable"
                          text={errors.donations}
                        />
                      ) : !donationSummary ||
                        donationSummary.total === 0 ? (
                        <SectionMessage
                          scale={s}
                          fontScale={fs}
                          type="empty"
                          icon="volunteer-activism"
                          title="No donations yet"
                          text="Donation analytics will appear once requesters confirm donations."
                        />
                      ) : (
                        <View
                          style={[
                            styles.splitBody,

                            {
                              gap: 22 * s,
                              marginTop: 18 * s,
                            },
                          ]}
                        >
                          <View style={styles.flexFill}>
                            <View
                              style={[
                                styles.row,

                                {
                                  gap: 10 * s,
                                  marginBottom: 14 * s,
                                },
                              ]}
                            >
                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="task-alt"
                                label="Recorded"
                                value={donationSummary.completed}
                                tone="green"
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="hourglass-top"
                                label="In review"
                                value={donationSummary.needs_review}
                                tone={
                                  donationSummary.needs_review > 0
                                    ? 'orange'
                                    : 'neutral'
                                }
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="water-drop"
                                label="Bags donated"
                                value={donationSummary.completed_units}
                                tone="red"
                              />
                            </View>

                            <RateBlock
                              scale={s}
                              fontScale={fs}
                              percent={donationRecordedRate}
                              label="Recorded without review"
                              detail={`${donationSummary.completed} of ${donationSummary.total} confirmations`}
                              tone="green"
                              horizontal
                            />
                          </View>

                          <View style={styles.verticalDivider} />

                          <View style={styles.flexFill}>
                            <MiniCountRow
                              scale={s}
                              fontScale={fs}
                              label="Last 30 days"
                              value={donationsLast30Days}
                            />

                            {donationSummary.average_rating !== null ? (
                              <MiniCountRow
                                scale={s}
                                fontScale={fs}
                                label={`Average rating (${donationSummary.feedback_count} ratings)`}
                                value={Number(
                                  donationSummary.average_rating.toFixed(1)
                                )}
                              />
                            ) : null}

                            {bagsByBloodType.slice(0, 4).map(
                              ([bloodType, bags], index, list) => (
                                <ProgressRow
                                  key={bloodType}
                                  scale={s}
                                  fontScale={fs}
                                  label={`${bloodType} bags`}
                                  value={bags}
                                  total={bagsTotal}
                                  tone="red"
                                  last={
                                    index === list.length - 1
                                  }
                                />
                              )
                            )}
                          </View>
                        </View>
                      )}
                    </AnalyticsCard>
                  </View>

                  {/* ============================================
                      SYSTEM ACTIVITY
                  ============================================ */}

                  <AnalyticsCard scale={s}>
                    <CardHeader
                      scale={s}
                      fontScale={fs}
                      icon="insights"
                      title="System Activity"
                      description="Recorded actions from the activity log"
                      actionLabel="Log Trails"
                      onAction={() =>
                        router.push('/activity-logs')
                      }
                    />

                    <View
                      style={[
                        styles.row,

                        {
                          gap: 22 * s,
                          marginTop: 18 * s,
                          alignItems: 'stretch',
                        },
                      ]}
                    >
                      {/* SUMMARY */}

                      <View style={styles.flexFill}>
                        {errors.activity ? (
                          <SectionMessage
                            scale={s}
                            fontScale={fs}
                            type="error"
                            title="Activity summary unavailable"
                            text={errors.activity}
                          />
                        ) : !activitySummary ||
                          activitySummary.total === 0 ? (
                          <SectionMessage
                            scale={s}
                            fontScale={fs}
                            type="empty"
                            icon="history"
                            title="No activity recorded"
                            text="System events will appear here once actions are logged."
                          />
                        ) : (
                          <>
                            <View
                              style={[
                                styles.row,

                                {
                                  gap: 10 * s,
                                  marginBottom: 14 * s,
                                },
                              ]}
                            >
                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="history"
                                label="Total"
                                value={activitySummary.total}
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="check-circle"
                                label="Successful"
                                value={activitySummary.successful}
                                tone="green"
                              />

                              <MiniStat
                                scale={s}
                                fontScale={fs}
                                icon="error-outline"
                                label="Failed"
                                value={activitySummary.failed}
                                tone="red"
                              />
                            </View>

                            <RateBlock
                              scale={s}
                              fontScale={fs}
                              percent={successRate}
                              label="Success rate"
                              detail={`${activitySummary.successful} of ${activitySummary.total} actions succeeded`}
                              tone={
                                successRate !== null &&
                                successRate < 80
                                  ? 'orange'
                                  : 'green'
                              }
                              horizontal
                            />
                          </>
                        )}
                      </View>

                      <View
                        style={[
                          styles.verticalDivider,
                        ]}
                      />

                      {/* BY MODULE */}

                      <View style={styles.flexFill}>
                        <View
                          style={[
                            styles.moduleHeader,

                            {
                              marginBottom: 8 * s,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.subheading,

                              {
                                fontSize: 14 * fs,
                              },
                            ]}
                          >
                            Activity by module
                          </Text>

                          {!errors.modules &&
                          activitySample.length > 0 ? (
                            <Text
                              style={[
                                styles.secondaryText,

                                {
                                  fontSize: 11.5 * fs,
                                },
                              ]}
                            >
                              Latest {activitySample.length}
                              {activityTotalLogs >
                              activitySample.length
                                ? ` of ${activityTotalLogs}`
                                : ''}{' '}
                              events
                            </Text>
                          ) : null}
                        </View>

                        {errors.modules ? (
                          <SectionMessage
                            scale={s}
                            fontScale={fs}
                            type="error"
                            title="Module breakdown unavailable"
                            text={errors.modules}
                          />
                        ) : moduleStats.length === 0 ? (
                          <SectionMessage
                            scale={s}
                            fontScale={fs}
                            type="empty"
                            icon="view-module"
                            title="No module activity"
                            text="Module usage will appear once actions are logged."
                          />
                        ) : (
                          moduleStats.map(
                            (item, index) => (
                              <ModuleRow
                                key={item.module}
                                item={item}
                                highest={highestModuleTotal}
                                scale={s}
                                fontScale={fs}
                                last={
                                  index ===
                                  moduleStats.length - 1
                                }
                              />
                            )
                          )
                        )}
                      </View>
                    </View>
                  </AnalyticsCard>
                </FadeInView>
              )}
            </ScrollView>

            {/* ==================================================
                BOTTOM NAV
            ================================================== */}

            <AdminBottomNav activeTab="analytics" />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SECTION LABEL
// ============================================================

function SectionLabel({
  scale,
  fontScale,
  text,
}: {
  scale: number;
  fontScale: number;
  text: string;
}) {
  return (
    <Text
      style={[
        styles.sectionLabel,

        {
          fontSize: 11 * fontScale,
          letterSpacing: 1.2 * scale,
          marginBottom: 12 * scale,
        },
      ]}
    >
      {text}
    </Text>
  );
}

// ============================================================
// ANALYTICS CARD
// ============================================================

function AnalyticsCard({
  scale,
  style,
  children,
}: {
  scale: number;
  style?: object;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,

        {
          borderRadius: 14 * scale,
          padding: 22 * scale,
          minHeight: 300 * scale,
        },

        style,
      ]}
    >
      {children}
    </View>
  );
}

// ============================================================
// CARD HEADER
// ============================================================

function CardHeader({
  scale,
  fontScale,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  badge,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardHeading}>
        <View
          style={[
            styles.cardHeaderIcon,

            {
              width: 44 * scale,
              height: 44 * scale,
              borderRadius: 11 * scale,
              marginRight: 11 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={24 * scale}
            color={COLORS.redBright}
          />
        </View>

        <View style={styles.flexFill}>
          <Text
            numberOfLines={1}
            style={[
              styles.cardTitle,

              {
                fontSize: 17 * fontScale,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.secondaryText,

              {
                fontSize: 12.5 * fontScale,
                lineHeight: 18 * fontScale,
                marginTop: 2 * scale,
              },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>

      {badge ? (
        <View
          style={[
            styles.badge,

            {
              minHeight: 32 * scale,
              borderRadius: 16 * scale,
              paddingHorizontal: 11 * scale,
              marginLeft: 8 * scale,
              gap: 3 * scale,
            },
          ]}
        >
          <MaterialIcons
            name="priority-high"
            size={15 * scale}
            color={COLORS.redBright}
          />

          <Text
            style={[
              styles.badgeText,

              {
                fontSize: 11 * fontScale,
              },
            ]}
          >
            {badge}
          </Text>
        </View>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.viewButton,

            {
              height: 36 * scale,
              borderRadius: 8 * scale,
              paddingLeft: 12 * scale,
              paddingRight: 8 * scale,
              marginLeft: 10 * scale,
            },

            pressed &&
              styles.viewPressed,
          ]}
        >
          <Text
            style={[
              styles.viewButtonText,

              {
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {actionLabel}
          </Text>

          <MaterialIcons
            name="chevron-right"
            size={18 * scale}
            color={COLORS.soft}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

// ============================================================
// OVERVIEW CARD
// ============================================================

function OverviewCard({
  scale,
  fontScale,
  icon,
  label,
  value,
  caption,
  tone = 'neutral',
  onPress,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  label: string;

  // null = this source failed to load
  value: number | null;

  caption: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.overviewTop}>
        <View
          style={[
            styles.overviewIcon,

            {
              width: 42 * scale,
              height: 42 * scale,
              borderRadius: 11 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={23 * scale}
            color={TONE_COLORS[tone]}
          />
        </View>

        {onPress ? (
          <MaterialIcons
            name="chevron-right"
            size={22 * scale}
            color={COLORS.muted}
          />
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.overviewLabel,

          {
            fontSize: 11 * fontScale,
            marginTop: 14 * scale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.overviewValue,

          {
            fontSize: 28 * fontScale,
            lineHeight: 36 * fontScale,
            marginTop: 2 * scale,
          },

          value === null &&
            styles.overviewValueMissing,
        ]}
      >
        {value === null
          ? '—'
          : formatNumber(value)}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.secondaryText,

          {
            fontSize: 11.5 * fontScale,
            marginTop: 2 * scale,
          },
        ]}
      >
        {value === null
          ? 'Unavailable'
          : caption}
      </Text>
    </>
  );

  const cardStyle = [
    styles.card,

    {
      flex: 1,
      minHeight: 160 * scale,
      padding: 18 * scale,
      borderRadius: 14 * scale,
    },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,

          pressed &&
            styles.cardPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {content}
    </View>
  );
}

// ============================================================
// RATE BLOCK
//
// Large percentage with a progress bar.
// percent = null when there is nothing to divide by.
// ============================================================

function RateBlock({
  scale,
  fontScale,
  percent,
  label,
  detail,
  tone,
  horizontal = false,
}: {
  scale: number;
  fontScale: number;
  percent: number | null;
  label: string;
  detail: string;
  tone: Tone;
  horizontal?: boolean;
}) {
  const color = TONE_COLORS[tone];

  return (
    <View
      style={[
        styles.rateBlock,

        {
          borderRadius: 12 * scale,
          padding: 16 * scale,
        },

        !horizontal && {
          width: 190 * scale,
          justifyContent: 'center',
        },
      ]}
    >
      <Text
        style={[
          styles.rateLabel,

          {
            fontSize: 11 * fontScale,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>

      <View
        style={[
          styles.rateValueRow,

          {
            marginTop: 4 * scale,
            gap: 10 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.rateValue,

            {
              fontSize: 28 * fontScale,
              lineHeight: 36 * fontScale,
              color:
                percent === null
                  ? COLORS.muted
                  : color,
            },
          ]}
        >
          {percent === null
            ? '—'
            : `${percent}%`}
        </Text>

        {horizontal ? (
          <Text
            numberOfLines={1}
            style={[
              styles.secondaryText,
              styles.flexFill,

              {
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {percent === null
              ? 'Not enough data yet'
              : detail}
          </Text>
        ) : null}
      </View>

      <ProgressBar
        scale={scale}
        percent={percent ?? 0}
        color={color}
        height={7}
        marginTop={8}
      />

      {!horizontal ? (
        <Text
          style={[
            styles.secondaryText,

            {
              fontSize: 12 * fontScale,
              lineHeight: 17 * fontScale,
              marginTop: 8 * scale,
            },
          ]}
        >
          {percent === null
            ? 'Not enough data yet'
            : detail}
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================

function ProgressBar({
  scale,
  percent,
  color,
  height = 6,
  marginTop = 6,
}: {
  scale: number;
  percent: number;
  color: string;
  height?: number;
  marginTop?: number;
}) {
  // Keep a visible sliver for small non-zero values.
  const width =
    percent <= 0
      ? 0
      : Math.max(3, Math.min(100, percent));

  return (
    <View
      style={[
        styles.progressTrack,

        {
          height: height * scale,
          borderRadius: (height / 2) * scale,
          marginTop: marginTop * scale,
        },
      ]}
    >
      <View
        style={{
          width: `${width}%`,
          height: '100%',
          borderRadius: (height / 2) * scale,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ============================================================
// PROGRESS ROW
// ============================================================

function ProgressRow({
  scale,
  fontScale,
  label,
  value,
  total,
  tone,
  last = false,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: number;
  total: number;
  tone: Tone;
  last?: boolean;
}) {
  const percent =
    percentOf(value, total) ?? 0;

  return (
    <View
      style={[
        styles.listRow,

        {
          paddingVertical: 9 * scale,
        },

        last &&
          styles.noBottomBorder,
      ]}
    >
      <View style={styles.progressRowTop}>
        <View
          style={[
            styles.progressRowLabelWrap,

            {
              gap: 8 * scale,
            },
          ]}
        >
          <View
            style={{
              width: 8 * scale,
              height: 8 * scale,
              borderRadius: 4 * scale,
              backgroundColor: TONE_COLORS[tone],
            }}
          />

          <Text
            style={[
              styles.rowLabel,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {label}
          </Text>
        </View>

        <Text
          style={[
            styles.rowValue,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {formatNumber(value)}
          <Text
            style={[
              styles.rowPercent,

              {
                fontSize: 11.5 * fontScale,
              },
            ]}
          >
            {'  '}
            {percent}%
          </Text>
        </Text>
      </View>

      <ProgressBar
        scale={scale}
        percent={percent}
        color={TONE_COLORS[tone]}
      />
    </View>
  );
}

// ============================================================
// MINI COUNT ROW
// ============================================================

function MiniCountRow({
  scale,
  fontScale,
  label,
  value,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: number;
}) {
  return (
    <View
      style={[
        styles.listRow,
        styles.progressRowTop,

        {
          paddingBottom: 9 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.secondaryText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.countValue,

          {
            fontSize: 16 * fontScale,
          },
        ]}
      >
        {formatNumber(value)}
      </Text>
    </View>
  );
}

// ============================================================
// MINI STAT
// ============================================================

function MiniStat({
  scale,
  fontScale,
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  label: string;
  value: number;
  tone?: Tone;
}) {
  return (
    <View
      style={[
        styles.miniStat,

        {
          minHeight: 58 * scale,
          borderRadius: 10 * scale,
          paddingHorizontal: 11 * scale,
        },

        tone === 'red' &&
          styles.miniStatRed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={19 * scale}
        color={TONE_COLORS[tone]}
      />

      <View
        style={{
          marginLeft: 8 * scale,
        }}
      >
        <Text
          style={[
            styles.miniValue,

            {
              fontSize: 17 * fontScale,
            },
          ]}
        >
          {formatNumber(value)}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.miniLabel,

            {
              fontSize: 11 * fontScale,
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
// DEMAND ROW
// ============================================================

function DemandRow({
  item,
  highestUnits,
  scale,
  fontScale,
  highlight,
  last,
}: {
  item: AdminBloodTypeDemandItem;
  highestUnits: number;
  scale: number;
  fontScale: number;
  highlight: boolean;
  last: boolean;
}) {
  const percent =
    (item.units_needed / highestUnits) * 100;

  return (
    <View
      style={[
        styles.listRow,
        styles.demandRow,

        {
          minHeight: 52 * scale,
          paddingVertical: 7 * scale,
        },

        last &&
          styles.noBottomBorder,
      ]}
    >
      <View
        style={[
          styles.bloodTypeCircle,

          {
            width: 38 * scale,
            height: 38 * scale,
            borderRadius: 19 * scale,
          },

          highlight &&
            styles.bloodTypeCircleHighlight,
        ]}
      >
        <Text
          style={[
            styles.bloodTypeText,

            {
              fontSize: 13 * fontScale,
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
          styles.flexFill,

          {
            marginLeft: 12 * scale,
          },
        ]}
      >
        <View style={styles.progressRowTop}>
          <Text
            style={[
              styles.rowLabel,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {formatNumber(item.units_needed)}{' '}
            {item.units_needed === 1
              ? 'unit'
              : 'units'}{' '}
            needed
          </Text>

          <Text
            style={[
              styles.secondaryText,

              {
                fontSize: 11.5 * fontScale,
              },
            ]}
          >
            {item.request_count}{' '}
            {item.request_count === 1
              ? 'request'
              : 'requests'}
          </Text>
        </View>

        <ProgressBar
          scale={scale}
          percent={percent}
          color={
            highlight
              ? COLORS.redBright
              : COLORS.neutralBar
          }
        />
      </View>

      <View
        style={[
          styles.urgentSlot,

          {
            width: 78 * scale,
            marginLeft: 10 * scale,
          },
        ]}
      >
        {item.urgent_requests > 0 ? (
          <View
            style={[
              styles.urgentPill,

              {
                minHeight: 24 * scale,
                borderRadius: 12 * scale,
                paddingHorizontal: 8 * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.urgentPillText,

                {
                  fontSize: 11 * fontScale,
                },
              ]}
            >
              {item.urgent_requests} urgent
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================
// MODULE ROW
// ============================================================

function ModuleRow({
  item,
  highest,
  scale,
  fontScale,
  last,
}: {
  item: ModuleStat;
  highest: number;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  return (
    <View
      style={[
        styles.listRow,

        {
          paddingVertical: 8 * scale,
        },

        last &&
          styles.noBottomBorder,
      ]}
    >
      <View style={styles.progressRowTop}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowLabel,
            styles.flexFill,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {formatModule(item.module)}
        </Text>

        <Text
          style={[
            styles.rowValue,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {formatNumber(item.total)}
          {item.failed > 0 ? (
            <Text
              style={[
                styles.failedText,

                {
                  fontSize: 11.5 * fontScale,
                },
              ]}
            >
              {'  '}
              {item.failed} failed
            </Text>
          ) : null}
        </Text>
      </View>

      <ProgressBar
        scale={scale}
        percent={(item.total / highest) * 100}
        color={COLORS.neutralBar}
      />
    </View>
  );
}

// ============================================================
// SECTION MESSAGE (EMPTY / ERROR)
// ============================================================

function SectionMessage({
  scale,
  fontScale,
  type,
  icon,
  title,
  text,
}: {
  scale: number;
  fontScale: number;
  type: 'empty' | 'error';
  icon?: IconName;
  title: string;
  text: string;
}) {
  const isError = type === 'error';

  return (
    <View
      style={[
        styles.centerMessage,

        {
          paddingVertical: 26 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.messageCircle,

          {
            width: 50 * scale,
            height: 50 * scale,
            borderRadius: 25 * scale,
          },

          isError &&
            styles.messageCircleError,
        ]}
      >
        <MaterialIcons
          name={
            isError
              ? 'error-outline'
              : icon || 'inbox'
          }
          size={26 * scale}
          color={
            isError
              ? COLORS.redBright
              : COLORS.muted
          }
        />
      </View>

      <Text
        style={[
          styles.messageTitle,

          {
            fontSize: 14 * fontScale,
            marginTop: 10 * scale,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.messageText,

          {
            fontSize: 12 * fontScale,
            lineHeight: 18 * fontScale,
            marginTop: 3 * scale,
            maxWidth: 320 * scale,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

// Returns a whole-number percentage, or null when
// there is nothing to divide by.
function percentOf(
  part: number,
  whole: number
): number | null {
  if (!whole || whole <= 0) {
    return null;
  }

  return Math.round(
    (part / whole) * 100
  );
}

function formatNumber(
  value: number
) {
  return Number(value || 0).toLocaleString(
    'en-PH'
  );
}

function formatModule(
  value: string
) {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ');
}

function formatTime(
  date: Date
) {
  return date.toLocaleTimeString(
    'en-PH',
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // ========================================================
  // PAGE
  // ========================================================

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

  // ========================================================
  // TITLE
  // ========================================================

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 16,
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  subtitle: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  sectionLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
  },

  // ========================================================
  // BUTTONS
  // ========================================================

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  refreshPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },

  refreshDisabled: {
    opacity: 0.55,
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

  primaryPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  primaryButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  viewPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },

  viewButtonText: {
    marginRight: 2,
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // ========================================================
  // LOADING / FULL ERROR
  // ========================================================

  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
  },

  fullError: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ========================================================
  // CARDS
  // ========================================================

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardHeading: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardHeaderIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  cardTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  subheading: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  secondaryText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.36)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  badgeText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  splitBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  verticalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },

  // ========================================================
  // OVERVIEW CARDS
  // ========================================================

  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  overviewLabel: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },

  overviewValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  overviewValueMissing: {
    color: COLORS.muted,
  },

  // ========================================================
  // RATE BLOCK
  // ========================================================

  rateBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  rateLabel: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
  },

  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rateValue: {
    fontFamily: 'Poppins_700Bold',
  },

  // ========================================================
  // PROGRESS / LIST ROWS
  // ========================================================

  progressTrack: {
    overflow: 'hidden',
    width: '100%',
    backgroundColor: COLORS.track,
  },

  listRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  noBottomBorder: {
    borderBottomWidth: 0,
  },

  progressRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressRowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowLabel: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  rowValue: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  rowPercent: {
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
  },

  countValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  failedText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_500Medium',
  },

  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ========================================================
  // MINI STATS
  // ========================================================

  miniStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  miniStatRed: {
    borderColor: 'rgba(239,51,64,0.34)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  miniValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  miniLabel: {
    marginTop: -1,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
  },

  // ========================================================
  // BLOOD DEMAND
  // ========================================================

  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bloodTypeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  bloodTypeCircleHighlight: {
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  bloodTypeText: {
    color: COLORS.soft,
    fontFamily: 'Poppins_600SemiBold',
  },

  bloodTypeTextHighlight: {
    color: COLORS.redBright,
  },

  urgentSlot: {
    alignItems: 'flex-end',
  },

  urgentPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.38)',
    backgroundColor: 'rgba(243,163,74,0.10)',
  },

  urgentPillText: {
    color: COLORS.orange,
    fontFamily: 'Inter_600SemiBold',
  },

  // ========================================================
  // EMPTY / ERROR MESSAGES
  // ========================================================

  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  messageCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  messageCircleError: {
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  messageTitle: {
    color: COLORS.white,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },

  messageText: {
    color: COLORS.muted,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
