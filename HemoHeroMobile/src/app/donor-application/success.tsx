import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../lib/fullScreen';

import AppModal, {
  type AppModalVariant,
} from '../../components/AppModal';

import {
  FadeInView,
  PressableScale,
} from '../../components/Motion';

import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOW,
} from '../../constants/theme';

import {
  getMyDonorApplication,
  withdrawDonorApplication,
  type DonorApplication,
  type DonorApplicationStatus,
} from '../../lib/donorApplication';

import {
  clearSession,
  getAccessToken,
} from '../../lib/session';

// ============================================================
// DONOR APPLICATION STATUS
//
// Shown after submitting an application and from the
// Dashboard donor card. Loads the REAL application from the
// server (the `status` link param is only a placeholder while
// loading).
// ============================================================

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

type ModalState = {
  visible: boolean;
  variant: AppModalVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

// How often a pending application is checked while this
// screen is open.
const LIVE_REFRESH_MS = 10 * 1000;

const CLOSED_MODAL: ModalState = {
  visible: false,
  variant: 'info',
  title: '',
  message: '',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ------------------------------------------------------------
// STATUS COPY
// ------------------------------------------------------------

const STATUS_CONTENT: Record<
  DonorApplicationStatus,
  {
    icon: IconName;
    title: string;
    description: string;
    label: string;
    color: string;
    tint: string;
  }
> = {
  pending: {
    icon: 'hourglass-top',
    title: 'Application under review',
    description:
      'Your donor application was submitted and is waiting for an administrator to review it.',
    label: 'Pending review',
    color: COLORS.orange,
    tint: COLORS.orangeLight,
  },

  approved: {
    icon: 'verified',
    title: 'You’re a verified donor!',
    description:
      'Your donor profile is active. You can now offer to donate to compatible blood requests.',
    label: 'Approved',
    color: COLORS.green,
    tint: COLORS.greenLight,
  },

  rejected: {
    icon: 'cancel',
    title: 'Application not approved',
    description:
      'Your application was reviewed but could not be approved. You can update your details and apply again.',
    label: 'Not approved',
    color: COLORS.red,
    tint: COLORS.pinkLight,
  },

  withdrawn: {
    icon: 'undo',
    title: 'Application withdrawn',
    description:
      'You withdrew your donor application. You can apply again whenever you are ready.',
    label: 'Withdrawn',
    color: COLORS.muted,
    tint: '#F2F2F2',
  },
};

const NEXT_STEPS: Record<
  DonorApplicationStatus,
  {
    icon: IconName;
    title: string;
    description: string;
  }[]
> = {
  pending: [
    {
      icon: 'manage-search',
      title: 'Administrator review',
      description:
        'Your blood details and donation history are checked.',
    },
    {
      icon: 'verified-user',
      title: 'Identity verification',
      description:
        'Your submitted government ID is verified privately.',
    },
    {
      icon: 'notifications-active',
      title: 'You’ll be notified',
      description:
        'You get a notification as soon as a decision is made.',
    },
  ],

  approved: [
    {
      icon: 'bloodtype',
      title: 'Browse blood requests',
      description:
        'Find compatible requests from people who need blood.',
    },
    {
      icon: 'volunteer-activism',
      title: 'Offer to donate',
      description:
        'Respond when you are available to help.',
    },
    {
      icon: 'forum',
      title: 'Coordinate safely',
      description:
        'Once accepted, chat with the requester to arrange the donation.',
    },
  ],

  rejected: [
    {
      icon: 'rate-review',
      title: 'Read the reviewer’s note',
      description:
        'The reason for the decision is shown below when available.',
    },
    {
      icon: 'edit-note',
      title: 'Update your details',
      description:
        'Make sure your information and ID are clear and correct.',
    },
    {
      icon: 'send',
      title: 'Apply again',
      description:
        'Submit a new application when you are ready.',
    },
  ],

  withdrawn: [
    {
      icon: 'send',
      title: 'Apply again anytime',
      description:
        'Start a new application whenever you are ready to donate.',
    },
  ],
};

// ============================================================
// SCREEN
// ============================================================

export default function DonorApplicationStatusScreen() {
  // Full screen: the red header reaches the top edge, with
  // its content kept below the clock.
  const insets = useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      status?: string;
    }>();

  const [application, setApplication] =
    useState<DonorApplication | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const [modal, setModal] =
    useState<ModalState>(CLOSED_MODAL);

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadApplication = useCallback(async () => {
    try {
      setLoadError('');

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace('/');

        return;
      }

      const result =
        await getMyDonorApplication(token);

      setApplication(
        result.application ||
          null
      );
    } catch (error) {
      console.log(
        'DONOR APPLICATION STATUS ERROR:',
        error
      );

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load your donor application.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // LIVE UPDATES
  //
  // An admin may decide while this screen is open. While the
  // application is pending it checks again every 10 seconds;
  // it also checks as soon as an application notification
  // arrives, when the app comes back to the front, and on
  // pull-to-refresh.
  // ==========================================================

  const pendingRef = useRef(true);

  useEffect(() => {
    pendingRef.current =
      !application ||
      application.status === 'pending';
  }, [application]);

  useFocusEffect(
    useCallback(() => {
      loadApplication();

      const timer = setInterval(() => {
        if (
          pendingRef.current &&
          AppState.currentState === 'active'
        ) {
          loadApplication();
        }
      }, LIVE_REFRESH_MS);

      const appState =
        AppState.addEventListener(
          'change',
          state => {
            if (state === 'active') {
              loadApplication();
            }
          }
        );

      const received =
        Platform.OS === 'web'
          ? null
          : Notifications.addNotificationReceivedListener(
              notification => {
                const type =
                  notification.request.content
                    .data?.type;

                if (
                  typeof type === 'string' &&
                  type.startsWith(
                    'donor_application'
                  )
                ) {
                  loadApplication();
                }
              }
            );

      return () => {
        clearInterval(timer);
        appState.remove();
        received?.remove();
      };
    }, [loadApplication])
  );

  async function handleRefresh() {
    setRefreshing(true);

    await loadApplication();

    setRefreshing(false);
  }

  // ==========================================================
  // STATUS
  //
  // Real status once loaded; the link param is only used while
  // the first load is in progress.
  // ==========================================================

  const paramStatus =
    (params.status as DonorApplicationStatus) ||
    'pending';

  const status: DonorApplicationStatus | null =
    application
      ? application.status
      : loading
        ? paramStatus in STATUS_CONTENT
          ? paramStatus
          : 'pending'
        : null;

  const content =
    status
      ? STATUS_CONTENT[status]
      : null;

  // ==========================================================
  // WITHDRAW
  // ==========================================================

  function closeModal() {
    setModal(CLOSED_MODAL);
  }

  function confirmWithdraw() {
    setModal({
      visible: true,
      variant: 'danger',
      title: 'Withdraw application?',
      message:
        'Your application will be removed from the review queue. You can apply again later, but you will need to submit it again.',
      confirmLabel: 'Withdraw',
      cancelLabel: 'Keep Application',
      onConfirm: performWithdraw,
    });
  }

  async function performWithdraw() {
    try {
      setWithdrawing(true);

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace('/');

        return;
      }

      await withdrawDonorApplication(token);

      await loadApplication();

      setModal({
        visible: true,
        variant: 'success',
        title: 'Application withdrawn',
        message:
          'Your donor application has been withdrawn. You can apply again whenever you are ready.',
      });
    } catch (error) {
      setModal({
        visible: true,
        variant: 'error',
        title: 'Unable to withdraw',
        message:
          error instanceof Error
            ? error.message
            : 'Please try again.',
      });
    } finally {
      setWithdrawing(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['left', 'right']}
        >
          <StatusBar style="light" />

          {/* HEADER */}

          <LinearGradient
            colors={['#D2151A', COLORS.redDark]}
            style={withStatusBar(styles.header, insets.top)}
          >
            <View style={shiftedDown(styles.headerCircleLeft, insets.top)} />
            <View style={shiftedDown(styles.headerCircleRight, insets.top)} />

            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to home"
                onPress={() =>
                  router.replace('/dashboard')
                }
                hitSlop={10}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={COLORS.white}
                />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>
                  Donor Application
                </Text>

                <Text style={styles.headerSubtitle}>
                  Your application status
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* BODY */}

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.red}
                colors={[COLORS.red]}
              />
            }
          >
            {loading && !application ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.red}
                />

                <Text style={styles.mutedText}>
                  Loading your application...
                </Text>
              </View>
            ) : loadError && !application ? (
              <FadeInView>
                <View style={[styles.card, styles.centerCard]}>
                  <MaterialIcons
                    name="cloud-off"
                    size={40}
                    color={COLORS.red}
                  />

                  <Text style={styles.heroTitle}>
                    Couldn’t load your application
                  </Text>

                  <Text style={styles.heroText}>
                    {loadError}
                  </Text>

                  <PrimaryButton
                    label="Try Again"
                    icon="refresh"
                    onPress={() => {
                      setLoading(true);
                      loadApplication();
                    }}
                  />
                </View>
              </FadeInView>
            ) : !content || !status ? (
              // No application yet
              <FadeInView>
                <View style={[styles.card, styles.centerCard]}>
                  <View
                    style={[
                      styles.heroIcon,
                      {
                        backgroundColor:
                          COLORS.pinkLight,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="volunteer-activism"
                      size={36}
                      color={COLORS.red}
                    />
                  </View>

                  <Text style={styles.heroTitle}>
                    You haven’t applied yet
                  </Text>

                  <Text style={styles.heroText}>
                    Become a verified donor and help people in your community who need blood.
                  </Text>

                  <PrimaryButton
                    label="Apply as a Donor"
                    icon="arrow-forward"
                    onPress={() =>
                      router.push(
                        '/donor-application/blood' as any
                      )
                    }
                  />
                </View>
              </FadeInView>
            ) : (
              <>
                {/* STATUS HERO */}

                <FadeInView>
                  <View style={[styles.card, styles.centerCard]}>
                    <View
                      style={[
                        styles.heroIcon,
                        {
                          backgroundColor:
                            content.tint,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={content.icon}
                        size={36}
                        color={content.color}
                      />
                    </View>

                    <Text style={styles.heroTitle}>
                      {content.title}
                    </Text>

                    <Text style={styles.heroText}>
                      {content.description}
                    </Text>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            content.tint,
                          borderColor:
                            content.color,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              content.color,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              content.color,
                          },
                        ]}
                      >
                        {content.label}
                      </Text>
                    </View>
                  </View>
                </FadeInView>

                {/* PROGRESS */}

                {application ? (
                  <FadeInView delay={60}>
                    <Text style={styles.sectionTitle}>
                      Progress
                    </Text>

                    <View style={styles.card}>
                      <ProgressStep
                        icon="send"
                        title="Submitted"
                        detail={formatDateTime(
                          application.submitted_at ||
                            application.created_at
                        )}
                        state="done"
                      />

                      <ProgressStep
                        icon="manage-search"
                        title="Under review"
                        detail={
                          status === 'pending'
                            ? 'In progress'
                            : status === 'withdrawn'
                              ? 'Stopped — you withdrew'
                              : 'Completed'
                        }
                        state={
                          status === 'pending'
                            ? 'active'
                            : status === 'withdrawn'
                              ? 'stopped'
                              : 'done'
                        }
                      />

                      <ProgressStep
                        icon={
                          status === 'rejected'
                            ? 'cancel'
                            : 'verified'
                        }
                        title={
                          status === 'approved'
                            ? 'Approved'
                            : status === 'rejected'
                              ? 'Not approved'
                              : 'Decision'
                        }
                        detail={
                          application.reviewed_at &&
                          (status === 'approved' ||
                            status === 'rejected')
                            ? formatDateTime(
                                application.reviewed_at
                              )
                            : 'Waiting'
                        }
                        state={
                          status === 'approved'
                            ? 'done'
                            : status === 'rejected'
                              ? 'failed'
                              : 'waiting'
                        }
                        last
                      />
                    </View>
                  </FadeInView>
                ) : null}

                {/* REVIEWER NOTE */}

                {application?.admin_note &&
                (status === 'rejected' ||
                  status === 'approved') ? (
                  <FadeInView delay={100}>
                    <View
                      style={[
                        styles.noteCard,
                        status === 'approved' &&
                          styles.noteCardApproved,
                      ]}
                    >
                      <MaterialIcons
                        name="rate-review"
                        size={20}
                        color={
                          status === 'approved'
                            ? COLORS.green
                            : COLORS.red
                        }
                      />

                      <View style={styles.flexFill}>
                        <Text style={styles.noteLabel}>
                          Note from the reviewer
                        </Text>

                        <Text style={styles.noteText}>
                          {application.admin_note}
                        </Text>
                      </View>
                    </View>
                  </FadeInView>
                ) : null}

                {/* SUMMARY */}

                {application ? (
                  <FadeInView delay={120}>
                    <Text style={styles.sectionTitle}>
                      Your application
                    </Text>

                    <View style={styles.card}>
                      <SummaryRow
                        icon="bloodtype"
                        label="Blood type"
                        value={application.blood_type}
                        highlight
                      />

                      <SummaryRow
                        icon="history"
                        label="Donation history"
                        value={formatDonationHistory(
                          application
                        )}
                      />

                      <SummaryRow
                        icon="near-me"
                        label="Travel radius"
                        value={`${application.travel_radius_km} km`}
                      />

                      <SummaryRow
                        icon="event-available"
                        label="Availability"
                        value={
                          application.availability_status ===
                          'available'
                            ? 'Available'
                            : 'Unavailable'
                        }
                      />

                      <SummaryRow
                        icon="priority-high"
                        label="Urgent requests"
                        value={
                          application.allow_urgent_requests
                            ? 'Allowed'
                            : 'Not allowed'
                        }
                        last
                      />
                    </View>
                  </FadeInView>
                ) : null}

                {/* NEXT STEPS */}

                <FadeInView delay={160}>
                  <Text style={styles.sectionTitle}>
                    {status === 'approved'
                      ? 'What you can do now'
                      : 'What happens next'}
                  </Text>

                  <View style={styles.card}>
                    {NEXT_STEPS[status].map(
                      (step, index, list) => (
                        <View
                          key={step.title}
                          style={[
                            styles.stepRow,
                            index === list.length - 1 &&
                              styles.noBorder,
                          ]}
                        >
                          <View style={styles.stepIcon}>
                            <MaterialIcons
                              name={step.icon}
                              size={18}
                              color={COLORS.redButton}
                            />
                          </View>

                          <View style={styles.flexFill}>
                            <Text style={styles.stepTitle}>
                              {step.title}
                            </Text>

                            <Text style={styles.stepText}>
                              {step.description}
                            </Text>
                          </View>
                        </View>
                      )
                    )}
                  </View>
                </FadeInView>

                {/* ACTIONS */}

                <FadeInView delay={200}>
                  <View style={styles.actions}>
                    {status === 'approved' ? (
                      <PrimaryButton
                        label="Browse Blood Requests"
                        icon="bloodtype"
                        // Other people's requests near them (Search
                        // → Requests), not their own Requests tab.
                        onPress={() =>
                          router.replace({
                            pathname:
                              '/search',

                            params: {
                              mode:
                                'requests',
                            },
                          } as any)
                        }
                      />
                    ) : null}

                    {status === 'rejected' ||
                    status === 'withdrawn' ? (
                      <PrimaryButton
                        label="Apply Again"
                        icon="send"
                        onPress={() =>
                          router.push(
                            '/donor-application/blood' as any
                          )
                        }
                      />
                    ) : null}

                    <SecondaryButton
                      label="Back to Home"
                      icon="home"
                      onPress={() =>
                        router.replace('/dashboard')
                      }
                    />

                    {status === 'pending' &&
                    application ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={withdrawing}
                        onPress={confirmWithdraw}
                        style={({ pressed }) => [
                          styles.withdrawButton,
                          pressed && styles.pressed,
                          withdrawing && styles.disabled,
                        ]}
                      >
                        {withdrawing ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.red}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="undo"
                              size={18}
                              color={COLORS.red}
                            />

                            <Text style={styles.withdrawText}>
                              Withdraw Application
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </FadeInView>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      <AppModal
        visible={modal.visible}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        loading={withdrawing}
        onConfirm={
          modal.onConfirm
            ? () => {
                const action = modal.onConfirm;

                closeModal();

                action?.();
              }
            : undefined
        }
        onClose={closeModal}
      />
    </View>
  );
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

function PrimaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.primaryButton}
    >
      <Text style={styles.primaryButtonText}>
        {label}
      </Text>

      <MaterialIcons
        name={icon}
        size={18}
        color={COLORS.white}
      />
    </PressableScale>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={styles.secondaryButton}
    >
      <MaterialIcons
        name={icon}
        size={18}
        color={COLORS.redButton}
      />

      <Text style={styles.secondaryButtonText}>
        {label}
      </Text>
    </PressableScale>
  );
}

function ProgressStep({
  icon,
  title,
  detail,
  state,
  last = false,
}: {
  icon: IconName;
  title: string;
  detail: string;
  state:
    | 'done'
    | 'active'
    | 'waiting'
    | 'failed'
    | 'stopped';
  last?: boolean;
}) {
  const color =
    state === 'done'
      ? COLORS.green
      : state === 'active'
        ? COLORS.orange
        : state === 'failed'
          ? COLORS.red
          : COLORS.lightMuted;

  const tint =
    state === 'done'
      ? COLORS.greenLight
      : state === 'active'
        ? COLORS.orangeLight
        : state === 'failed'
          ? COLORS.pinkLight
          : '#F4F4F4';

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressRail}>
        <View
          style={[
            styles.progressCircle,
            {
              backgroundColor: tint,
              borderColor: color,
            },
          ]}
        >
          <MaterialIcons
            name={
              state === 'done'
                ? 'check'
                : icon
            }
            size={16}
            color={color}
          />
        </View>

        {!last ? (
          <View
            style={[
              styles.progressLine,
              state === 'done' && {
                backgroundColor:
                  COLORS.green,
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.progressCopy,
          last && {
            paddingBottom: 0,
          },
        ]}
      >
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text
          style={[
            styles.stepText,
            state === 'active' && {
              color: COLORS.orange,
            },
          ]}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight = false,
  last = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        last && styles.noBorder,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={18}
        color={COLORS.lightMuted}
      />

      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          highlight && styles.summaryHighlight,
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

function formatDonationHistory(
  application: DonorApplication
) {
  if (!application.has_donated_before) {
    return 'First-time donor';
  }

  if (application.last_donation_date) {
    const match =
      application.last_donation_date.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (match) {
      return `Last donated ${new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      ).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
  }

  if (
    application.last_donation_month &&
    application.last_donation_year
  ) {
    return `Last donated ~${
      MONTHS[application.last_donation_month - 1]
    } ${application.last_donation_year}`;
  }

  return 'Repeat donor';
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

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  desktopBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Platform.OS === 'web'
        ? '#242424'
        : COLORS.page,
  },

  phone: {
    width: Platform.OS === 'web' ? 440 : '100%',
    height: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.redDark,
  },

  flexFill: {
    flex: 1,
    minWidth: 0,
  },

  // HEADER

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: 26,
    overflow: 'hidden',
  },

  headerCircleLeft: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -98,
    top: -73,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerCircleRight: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -73,
    top: -78,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: COLORS.white,
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 27,
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },

  // BODY

  body: {
    flex: 1,
    marginTop: -14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.page,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 34,
  },

  loadingArea: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 12,
  },

  mutedText: {
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
  },

  card: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    ...SHADOW,
  },

  centerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTitle: {
    marginTop: 14,
    color: COLORS.black,
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 27,
    textAlign: 'center',
  },

  heroText: {
    marginTop: 6,
    marginBottom: 4,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },

  statusPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    color: COLORS.black,
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
  },

  // PROGRESS

  progressRow: {
    flexDirection: 'row',
  },

  progressRail: {
    width: 34,
    alignItems: 'center',
    paddingTop: 12,
  },

  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    borderRadius: 1,
    backgroundColor: COLORS.border,
  },

  progressCopy: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 12,
    paddingBottom: 14,
  },

  // NOTE

  noteCard: {
    marginTop: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0B8B8',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.pinkLight,
  },

  noteCardApproved: {
    borderColor: '#B9DFC8',
    backgroundColor: COLORS.greenLight,
  },

  noteLabel: {
    color: COLORS.black,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  noteText: {
    marginTop: 3,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
  },

  // SUMMARY

  summaryRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  summaryLabel: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
  },

  summaryValue: {
    flexShrink: 1,
    color: COLORS.black,
    fontFamily: FONTS.semiBold,
    fontSize: 13.5,
    textAlign: 'right',
  },

  summaryHighlight: {
    color: COLORS.red,
    fontFamily: FONTS.heading,
    fontSize: 15,
  },

  // NEXT STEPS

  stepRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  stepTitle: {
    color: COLORS.black,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },

  stepText: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 12.5,
    lineHeight: 18,
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  // ACTIONS

  actions: {
    marginTop: 24,
    gap: 10,
  },

  primaryButton: {
    minHeight: 52,
    marginTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.redButton,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.headingSemi,
    fontSize: 14.5,
  },

  secondaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },

  secondaryButtonText: {
    color: COLORS.redButton,
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
  },

  withdrawButton: {
    minHeight: 46,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  withdrawText: {
    color: COLORS.red,
    fontFamily: FONTS.semiBold,
    fontSize: 13.5,
    textDecorationLine: 'underline',
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.5,
  },
});
