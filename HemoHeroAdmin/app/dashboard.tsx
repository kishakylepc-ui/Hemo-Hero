import {
  type ComponentProps,
  type ReactNode,
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
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../components/AdminCanvas';

import AdminBottomNav from '../components/AdminBottomNav';
import AdminHeader from '../components/AdminHeader';

import { FadeInView } from '../components/AdminMotion';

import {
  getAdminActivityLogs,
  getAdminBloodTypeDemand,
  getAdminDonorSummary,
  getAdminDonationSummary,
  getAdminReportSummary,
  getAdminUserSummary,
  type ActivityLog,
  type AdminBloodTypeDemandItem,
  type AdminBloodTypeDemandResponse,
  type AdminDonationSummary,
  type AdminProfile,
  type AdminReportSummary,
  type AdminUserSummary,
  type DonorApplicationSummary,
} from '../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../lib/session';

import { isAdminRole } from '../lib/roles';

// ============================================================
// DESIGN
//
// Card / section styling follows the Donor Applications
// screens for a consistent Admin UI.
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
  blue: '#4A8CFF',

  track: '#17233D',
  neutralBar: '#6E7E9C',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

type SectionErrors = {
  applications: string;
  users: string;
  issues: string;
  donations: string;
  demand: string;
  activity: string;
};

const EMPTY_ERRORS: SectionErrors = {
  applications: '',
  users: '',
  issues: '',
  donations: '',
  demand: '',
  activity: '',
};

// ============================================================
// DASHBOARD
// ============================================================

export default function AdminDashboardScreen() {

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

  const [applicationSummary, setApplicationSummary] =
    useState<DonorApplicationSummary | null>(null);

  const [userSummary, setUserSummary] =
    useState<AdminUserSummary | null>(null);

  const [issueSummary, setIssueSummary] =
    useState<AdminReportSummary | null>(null);

  const [donationSummary, setDonationSummary] =
    useState<AdminDonationSummary | null>(null);

  const [bloodDemand, setBloodDemand] =
    useState<AdminBloodTypeDemandResponse | null>(null);

  const [recentActivities, setRecentActivities] =
    useState<ActivityLog[]>([]);

  const [errors, setErrors] =
    useState<SectionErrors>(EMPTY_ERRORS);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasLoadedOnce = useRef(false);

  // ==========================================================
  // LOAD
  //
  // Reloads whenever the Dashboard gains focus, so counts are
  // current after reviewing an application or issue.
  // Each source loads independently; one failure only affects
  // its own card.
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  async function loadDashboard() {
    try {
      if (hasLoadedOnce.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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

      const [
        applicationsResult,
        usersResult,
        issuesResult,
        donationsResult,
        demandResult,
        activityResult,
      ] = await Promise.allSettled([
        getAdminDonorSummary(token),
        getAdminUserSummary(token),
        getAdminReportSummary(token),
        getAdminDonationSummary(token),
        getAdminBloodTypeDemand(token),
        getAdminActivityLogs(token, {
          page: 1,
          limit: 6,
        }),
      ]);

      const nextErrors: SectionErrors = {
        ...EMPTY_ERRORS,
      };

      if (applicationsResult.status === 'fulfilled') {
        setApplicationSummary(
          applicationsResult.value.summary
        );
      } else {
        nextErrors.applications = getErrorMessage(
          applicationsResult.reason,
          'Unable to load donor applications.'
        );
      }

      if (usersResult.status === 'fulfilled') {
        setUserSummary(
          usersResult.value.summary
        );
      } else {
        nextErrors.users = getErrorMessage(
          usersResult.reason,
          'Unable to load user accounts.'
        );
      }

      if (issuesResult.status === 'fulfilled') {
        setIssueSummary(
          issuesResult.value.summary
        );
      } else {
        nextErrors.issues = getErrorMessage(
          issuesResult.reason,
          'Unable to load issues.'
        );
      }

      if (donationsResult.status === 'fulfilled') {
        setDonationSummary(
          donationsResult.value.summary
        );
      } else {
        nextErrors.donations = getErrorMessage(
          donationsResult.reason,
          'Unable to load donations.'
        );
      }

      if (demandResult.status === 'fulfilled') {
        setBloodDemand(
          demandResult.value
        );
      } else {
        nextErrors.demand = getErrorMessage(
          demandResult.reason,
          'Unable to load blood type demand.'
        );
      }

      if (activityResult.status === 'fulfilled') {
        setRecentActivities(
          (activityResult.value.logs || [])
            .slice()
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 5)
        );
      } else {
        nextErrors.activity = getErrorMessage(
          activityResult.reason,
          'Unable to load recent activity.'
        );
      }

      setErrors(nextErrors);

      hasLoadedOnce.current = true;
    } catch (error) {
      console.log(
        'ADMIN DASHBOARD ERROR:',
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ==========================================================
  // DERIVED
  // ==========================================================

  const firstName =
    profile?.first_name?.trim() ||
    'Admin';

  const pendingApplications =
    applicationSummary?.pending ?? 0;

  const unresolvedIssues =
    (issueSummary?.open ?? 0) +
    (issueSummary?.in_review ?? 0);

  const urgentRequests =
    bloodDemand?.summary.urgent_requests ?? 0;

  // Donations are recorded automatically; only flagged
  // records need an admin.
  const donationsToReview =
    donationSummary?.needs_review ?? 0;

  const visibleBloodDemand =
    (bloodDemand?.demand || [])
      .filter(
        item =>
          item.request_count > 0 ||
          item.units_needed > 0
      )
      .sort(
        (a, b) =>
          b.units_needed - a.units_needed
      )
      .slice(0, 5);

  const highestUnits = Math.max(
    ...visibleBloodDemand.map(
      item => item.units_needed
    ),
    1
  );

  const today =
    new Date().toLocaleDateString(
      undefined,
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
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
                  paddingTop: 32 * s,
                  paddingBottom: 28 * s,
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
                      Welcome back, {firstName}
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
                      {today} • Here's what's happening in Hemo-Hero.
                    </Text>
                  </View>

                  <Pressable
                    disabled={loading || refreshing}
                    onPress={loadDashboard}
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
                    {loading || refreshing ? (
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

              {loading ? (
                <View
                  style={[
                    styles.centerArea,

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
                      styles.mutedText,

                      {
                        fontSize: 13 * fs,
                        marginTop: 14 * s,
                      },
                    ]}
                  >
                    Loading dashboard...
                  </Text>
                </View>
              ) : (
                <>
                  {/* ============================================
                      NEEDS ATTENTION
                  ============================================ */}

                  <FadeInView delay={50}>
                    <SectionLabel
                      scale={s}
                      fontScale={fs}
                      text="NEEDS ATTENTION"
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
                      <AttentionCard
                        scale={s}
                        fontScale={fs}
                        icon="assignment-ind"
                        title="Pending Applications"
                        value={pendingApplications}
                        error={errors.applications}
                        activeText={`${pendingApplications === 1 ? 'Donor is' : 'Donors are'} waiting for verification`}
                        clearText="No applications waiting"
                        actionLabel="Review"
                        onPress={() =>
                          router.push('/applications')
                        }
                      />

                      <AttentionCard
                        scale={s}
                        fontScale={fs}
                        icon="report-problem"
                        title="Unresolved Issues"
                        value={unresolvedIssues}
                        error={errors.issues}
                        activeText={
                          issueSummary?.open
                            ? `${issueSummary.open} open • ${issueSummary.in_review} in review`
                            : 'Reports and feedback in review'
                        }
                        clearText="No open reports or feedback"
                        actionLabel="View Issues"
                        onPress={() =>
                          router.push('/issues' as any)
                        }
                      />

                      <AttentionCard
                        scale={s}
                        fontScale={fs}
                        icon="priority-high"
                        title="Urgent Requests"
                        value={urgentRequests}
                        error={errors.demand}
                        activeText={`Urgent ${urgentRequests === 1 ? 'request needs' : 'requests need'} donors now`}
                        clearText="No urgent blood requests"
                        actionLabel="View Requests"
                        onPress={() =>
                          router.push('/requests')
                        }
                      />

                      <AttentionCard
                        scale={s}
                        fontScale={fs}
                        icon="volunteer-activism"
                        title="Donations to Review"
                        value={donationsToReview}
                        error={errors.donations}
                        activeText={
                          donationsToReview === 1
                            ? 'Flagged donation record'
                            : 'Flagged donation records'
                        }
                        clearText={`${donationSummary?.completed ?? 0} donations recorded automatically`}
                        actionLabel="View Donations"
                        onPress={() =>
                          router.push('/donations' as any)
                        }
                      />
                    </View>
                  </FadeInView>

                  {/* ============================================
                      OVERVIEW
                  ============================================ */}

                  <FadeInView delay={100}>
                    <SectionLabel
                      scale={s}
                      fontScale={fs}
                      text="OVERVIEW"
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
                      <StatCard
                        scale={s}
                        fontScale={fs}
                        icon="groups"
                        label="TOTAL USERS"
                        value={
                          errors.users
                            ? null
                            : userSummary?.total ?? 0
                        }
                        caption={
                          userSummary
                            ? `${userSummary.active} active • ${userSummary.inactive} inactive`
                            : 'Registered accounts'
                        }
                        onPress={() =>
                          router.push('/users')
                        }
                      />

                      <StatCard
                        scale={s}
                        fontScale={fs}
                        icon="verified"
                        iconColor={COLORS.green}
                        label="VERIFIED DONORS"
                        value={
                          errors.applications
                            ? null
                            : applicationSummary?.approved ?? 0
                        }
                        caption={`${applicationSummary?.total ?? 0} applications total`}
                        onPress={() =>
                          router.push('/applications')
                        }
                      />

                      <StatCard
                        scale={s}
                        fontScale={fs}
                        icon="assignment"
                        iconColor={COLORS.orange}
                        label="ACTIVE REQUESTS"
                        value={
                          errors.demand
                            ? null
                            : bloodDemand?.summary.active_requests ?? 0
                        }
                        caption={`${bloodDemand?.summary.scheduled_requests ?? 0} scheduled`}
                        onPress={() =>
                          router.push('/requests')
                        }
                      />

                      <StatCard
                        scale={s}
                        fontScale={fs}
                        icon="water-drop"
                        iconColor={COLORS.redBright}
                        label="UNITS NEEDED"
                        value={
                          errors.demand
                            ? null
                            : bloodDemand?.summary.units_needed ?? 0
                        }
                        caption="Across active requests"
                        onPress={() =>
                          router.push('/analytics')
                        }
                      />
                    </View>
                  </FadeInView>

                  {/* ============================================
                      DEMAND + ACTIVITY
                  ============================================ */}

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 18 * s,
                        alignItems: 'stretch',
                      },
                    ]}
                  >
                    <FadeInView
                      delay={150}
                      style={styles.flexFill}
                    >
                      <SectionCard
                        scale={s}
                        fontScale={fs}
                        icon="bloodtype"
                        title="Blood Type Demand"
                        description="Active requests by blood type"
                        badge={
                          bloodDemand?.highest_demand &&
                          !errors.demand
                            ? `${bloodDemand.highest_demand.blood_type} highest`
                            : undefined
                        }
                      >
                        {errors.demand ? (
                          <CardMessage
                            scale={s}
                            fontScale={fs}
                            error
                            title="Demand unavailable"
                            text={errors.demand}
                          />
                        ) : visibleBloodDemand.length === 0 ? (
                          <CardMessage
                            scale={s}
                            fontScale={fs}
                            icon="bloodtype"
                            title="No active blood requests"
                            text="Demand will appear when a request becomes active."
                          />
                        ) : (
                          visibleBloodDemand.map(
                            (item, index) => (
                              <BloodDemandRow
                                key={item.blood_type}
                                item={item}
                                highestUnits={highestUnits}
                                scale={s}
                                fontScale={fs}
                                highlight={
                                  item.blood_type ===
                                  bloodDemand?.highest_demand
                                    ?.blood_type
                                }
                                last={
                                  index ===
                                  visibleBloodDemand.length - 1
                                }
                              />
                            )
                          )
                        )}
                      </SectionCard>
                    </FadeInView>

                    <FadeInView
                      delay={200}
                      style={styles.flexFill}
                    >
                      <SectionCard
                        scale={s}
                        fontScale={fs}
                        icon="history"
                        title="Recent Activity"
                        description="Latest administrator and system events"
                        actionLabel="View All"
                        onAction={() =>
                          router.push('/activity-logs')
                        }
                      >
                        {errors.activity ? (
                          <CardMessage
                            scale={s}
                            fontScale={fs}
                            error
                            title="Activity unavailable"
                            text={errors.activity}
                          />
                        ) : recentActivities.length === 0 ? (
                          <CardMessage
                            scale={s}
                            fontScale={fs}
                            icon="history"
                            title="No recent activity"
                            text="New system events will appear here."
                          />
                        ) : (
                          recentActivities.map(
                            (activity, index) => (
                              <ActivityRow
                                key={activity.id}
                                activity={activity}
                                scale={s}
                                fontScale={fs}
                                last={
                                  index ===
                                  recentActivities.length - 1
                                }
                              />
                            )
                          )
                        )}
                      </SectionCard>
                    </FadeInView>
                  </View>
                </>
              )}
            </ScrollView>

            <AdminBottomNav activeTab="dashboard" />
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
// ATTENTION CARD
//
// Red when something needs action, calm green when clear.
// ============================================================

function AttentionCard({
  scale,
  fontScale,
  icon,
  title,
  value,
  error,
  activeText,
  clearText,
  actionLabel,
  onPress,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  value: number;
  error: string;
  activeText: string;
  clearText: string;
  actionLabel: string;
  onPress: () => void;
}) {
  const active =
    !error &&
    value > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.attentionCard,

        {
          padding: 20 * scale,
          borderRadius: 14 * scale,
          minHeight: 150 * scale,
        },

        active &&
          styles.attentionCardActive,

        pressed &&
          styles.pressed,
      ]}
    >
      <View style={styles.attentionTop}>
        <View
          style={[
            styles.attentionIcon,

            {
              width: 44 * scale,
              height: 44 * scale,
              borderRadius: 12 * scale,
            },

            active
              ? styles.attentionIconActive
              : styles.attentionIconClear,
          ]}
        >
          <MaterialIcons
            name={
              error
                ? 'error-outline'
                : active
                  ? icon
                  : 'check-circle'
            }
            size={24 * scale}
            color={
              error
                ? COLORS.muted
                : active
                  ? COLORS.redBright
                  : COLORS.green
            }
          />
        </View>

        <Text
          style={[
            styles.attentionValue,

            {
              fontSize: 30 * fontScale,
              lineHeight: 36 * fontScale,
            },

            active &&
              styles.attentionValueActive,
          ]}
        >
          {error ? '—' : value}
        </Text>
      </View>

      <Text
        style={[
          styles.cardTitle,

          {
            fontSize: 15 * fontScale,
            marginTop: 14 * scale,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.mutedText,

          {
            fontSize: 12.5 * fontScale,
            marginTop: 3 * scale,
          },
        ]}
      >
        {error
          ? 'Unavailable'
          : active
            ? activeText
            : clearText}
      </Text>

      <View
        style={[
          styles.attentionAction,

          {
            marginTop: 12 * scale,
            gap: 3 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.attentionActionText,

            {
              fontSize: 12.5 * fontScale,
            },

            active &&
              styles.attentionActionTextActive,
          ]}
        >
          {actionLabel}
        </Text>

        <MaterialIcons
          name="arrow-forward"
          size={15 * scale}
          color={
            active
              ? COLORS.redBright
              : COLORS.soft
          }
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  scale,
  fontScale,
  icon,
  iconColor = COLORS.soft,
  label,
  value,
  caption,
  onPress,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  iconColor?: string;
  label: string;
  value: number | null;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.flexFill,

        {
          padding: 18 * scale,
          borderRadius: 14 * scale,
        },

        pressed &&
          styles.pressed,
      ]}
    >
      <View style={styles.attentionTop}>
        <View
          style={[
            styles.statIcon,

            {
              width: 40 * scale,
              height: 40 * scale,
              borderRadius: 11 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={22 * scale}
            color={iconColor}
          />
        </View>

        <MaterialIcons
          name="chevron-right"
          size={21 * scale}
          color={COLORS.muted}
        />
      </View>

      <Text
        style={[
          styles.statLabel,

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
          styles.statValue,

          {
            fontSize: 28 * fontScale,
            lineHeight: 36 * fontScale,
          },

          value === null && {
            color: COLORS.muted,
          },
        ]}
      >
        {value === null ? '—' : value}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.mutedText,

          {
            fontSize: 11.5 * fontScale,
          },
        ]}
      >
        {value === null
          ? 'Unavailable'
          : caption}
      </Text>
    </Pressable>
  );
}

// ============================================================
// SECTION CARD
// ============================================================

function SectionCard({
  scale,
  fontScale,
  icon,
  title,
  description,
  badge,
  actionLabel,
  onAction,
  children,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  description: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,

        {
          padding: 21 * scale,
          borderRadius: 15 * scale,
          minHeight: 340 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            marginBottom: 12 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width: 40 * scale,
              height: 40 * scale,
              borderRadius: 10 * scale,
              marginRight: 11 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={22 * scale}
            color={COLORS.redBright}
          />
        </View>

        <View style={styles.flexFill}>
          <Text
            style={[
              styles.cardTitle,

              {
                fontSize: 16 * fontScale,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.mutedText,

              {
                fontSize: 12.5 * fontScale,
                marginTop: 2 * scale,
              },
            ]}
          >
            {description}
          </Text>
        </View>

        {badge ? (
          <View
            style={[
              styles.highBadge,

              {
                height: 30 * scale,
                borderRadius: 15 * scale,
                paddingHorizontal: 11 * scale,
                gap: 3 * scale,
              },
            ]}
          >
            <MaterialIcons
              name="priority-high"
              size={14 * scale}
              color={COLORS.redBright}
            />

            <Text
              style={[
                styles.highBadgeText,

                {
                  fontSize: 11.5 * fontScale,
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
              styles.smallButton,

              {
                height: 34 * scale,
                borderRadius: 8 * scale,
                paddingLeft: 12 * scale,
                paddingRight: 8 * scale,
              },

              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.smallButtonText,

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

      {children}
    </View>
  );
}

// ============================================================
// CARD MESSAGE (empty / error)
// ============================================================

function CardMessage({
  scale,
  fontScale,
  error = false,
  icon = 'inbox',
  title,
  text,
}: {
  scale: number;
  fontScale: number;
  error?: boolean;
  icon?: IconName;
  title: string;
  text: string;
}) {
  return (
    <View
      style={[
        styles.centerArea,
        styles.flexFill,

        {
          paddingVertical: 30 * scale,
          paddingHorizontal: 18 * scale,
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
        ]}
      >
        <MaterialIcons
          name={
            error
              ? 'error-outline'
              : icon
          }
          size={26 * scale}
          color={
            error
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
          styles.mutedText,
          styles.centerText,

          {
            fontSize: 12 * fontScale,
            lineHeight: 18 * fontScale,
            marginTop: 3 * scale,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ============================================================
// BLOOD DEMAND ROW
// ============================================================

function BloodDemandRow({
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
  const progress = Math.max(
    6,
    Math.min(
      100,
      (item.units_needed / highestUnits) * 100
    )
  );

  return (
    <View
      style={[
        styles.listRow,

        {
          minHeight: 52 * scale,
          paddingVertical: 7 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      <View
        style={[
          styles.bloodCircle,

          {
            width: 38 * scale,
            height: 38 * scale,
            borderRadius: 19 * scale,
          },

          highlight &&
            styles.bloodCircleHighlight,
        ]}
      >
        <Text
          style={[
            styles.bloodText,

            {
              fontSize: 13 * fontScale,
            },

            highlight && {
              color: COLORS.redBright,
            },
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
        <View style={styles.spaceBetween}>
          <Text
            style={[
              styles.rowTitle,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {item.units_needed}{' '}
            {item.units_needed === 1
              ? 'unit'
              : 'units'}{' '}
            needed
          </Text>

          <Text
            style={[
              styles.mutedText,

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

        <View
          style={[
            styles.progressTrack,

            {
              height: 6 * scale,
              borderRadius: 3 * scale,
              marginTop: 6 * scale,
            },
          ]}
        >
          <View
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 3 * scale,
              backgroundColor: highlight
                ? COLORS.redBright
                : COLORS.neutralBar,
            }}
          />
        </View>
      </View>

      <View
        style={[
          styles.urgentSlot,

          {
            width: 76 * scale,
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
// ACTIVITY ROW
// ============================================================

function ActivityRow({
  activity,
  scale,
  fontScale,
  last,
}: {
  activity: ActivityLog;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push('/activity-logs')
      }
      style={({ pressed }) => [
        styles.listRow,

        {
          minHeight: 54 * scale,
          paddingVertical: 8 * scale,
        },

        last &&
          styles.noBorder,

        pressed && {
          opacity: 0.7,
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

          !activity.success &&
            styles.activityIconFailed,
        ]}
      >
        <MaterialIcons
          name={getActivityIcon(activity.action)}
          size={18 * scale}
          color={
            activity.success
              ? COLORS.soft
              : COLORS.redBright
          }
        />
      </View>

      <View
        style={[
          styles.flexFill,

          {
            paddingRight: 8 * scale,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {formatActivityAction(activity.action)}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.mutedText,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {activity.user_email ||
            activity.user_role ||
            'System activity'}
          {activity.module
            ? ` • ${activity.module}`
            : ''}
        </Text>
      </View>

      <View style={styles.activityRight}>
        <Text
          numberOfLines={1}
          style={[
            styles.mutedText,

            {
              fontSize: 11 * fontScale,
            },
          ]}
        >
          {formatActivityDate(activity.created_at)}
        </Text>

        <View
          style={{
            width: 7 * scale,
            height: 7 * scale,
            borderRadius: 4 * scale,
            marginTop: 5 * scale,
            backgroundColor: activity.success
              ? COLORS.green
              : COLORS.redBright,
          }}
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}

// Older entries used another name for the same action.
const ACTION_ALIASES: Record<string, string> = {
  UPDATE_PROFILE: 'EDIT_PROFILE',
};

function formatActivityAction(
  action?: string | null
) {
  if (!action) {
    return 'Activity';
  }

  return (ACTION_ALIASES[action] || String(action))
    .toLowerCase()
    .split('_')
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

function getActivityIcon(
  action?: string | null
): IconName {
  const normalized =
    String(action || '').toUpperCase();

  if (normalized.includes('LOCKOUT')) return 'lock-clock';
  if (normalized.includes('CAPTCHA')) return 'security';
  if (normalized.includes('UNLOCK')) return 'lock-open';
  if (normalized.includes('LOCK_USER')) return 'lock';
  if (normalized.includes('ROLE')) return 'admin-panel-settings';
  if (normalized.includes('LOGIN')) return 'login';
  if (normalized.includes('AUTO_LOGOUT')) return 'timer-off';
  if (normalized.includes('LOGOUT')) return 'logout';

  if (
    normalized.includes('PASSWORD') ||
    normalized.includes('EMAIL')
  ) {
    return 'lock';
  }

  if (normalized.includes('APPROVE')) return 'check-circle';

  if (
    normalized.includes('REJECT') ||
    normalized.includes('FAIL')
  ) {
    return 'cancel';
  }

  if (normalized.includes('REPORT')) return 'flag';

  if (
    normalized.includes('UPDATE') ||
    normalized.includes('EDIT')
  ) {
    return 'edit';
  }

  if (normalized.includes('CREATE')) return 'add-circle-outline';
  if (normalized.includes('DELETE')) return 'delete-outline';

  if (
    normalized.includes('PROFILE') ||
    normalized.includes('USER') ||
    normalized.includes('ACCOUNT')
  ) {
    return 'person';
  }

  return 'history';
}

function formatActivityDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(
      undefined,
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
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

  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

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

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
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

  sectionLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
  },

  // ATTENTION

  attentionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  attentionCardActive: {
    borderColor: 'rgba(239,51,64,0.55)',
    backgroundColor: 'rgba(65,17,31,0.62)',
  },

  attentionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  attentionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  attentionIconActive: {
    backgroundColor: 'rgba(239,51,64,0.14)',
  },

  attentionIconClear: {
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  attentionValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  attentionValueActive: {
    color: COLORS.redBright,
  },

  attentionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  attentionActionText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  attentionActionTextActive: {
    color: COLORS.redBright,
  },

  // STATS

  statIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  statLabel: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },

  statValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  // SECTION CARD

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  cardTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  highBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.36)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  highBadgeText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  smallButtonText: {
    marginRight: 2,
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  messageCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  messageTitle: {
    color: COLORS.white,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },

  // LIST ROWS

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  rowTitle: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  bloodCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  bloodCircleHighlight: {
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  bloodText: {
    color: COLORS.soft,
    fontFamily: 'Poppins_600SemiBold',
  },

  progressTrack: {
    overflow: 'hidden',
    width: '100%',
    backgroundColor: COLORS.track,
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

  activityIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  activityIconFailed: {
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  activityRight: {
    width: 78,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // INTERACTION

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  disabled: {
    opacity: 0.55,
  },
});
