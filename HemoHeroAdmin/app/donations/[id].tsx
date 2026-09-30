import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useMemo,
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
  useWindowDimensions,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  approveAdminDonation,
  getAdminDonationById,
  rejectAdminDonation,
  type AdminDonationDetail,
  type AdminDonationFeedback,
  type AdminDonationStatus,
  type AdminProfile,
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
// Layout and components follow the Donor Application review
// screen (applications/[id].tsx) for a consistent Admin UI.
//
// Donations are recorded automatically. Admins only act on
// records flagged by an automatic check or by the donor, and
// can reject a record that turns out to be wrong.
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

const MAX_NOTE_LENGTH = 1000;

// Whole-blood donors usually wait ~3 months between donations.
const DONATION_INTERVAL_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// Red-cell compatibility (same table as the server).
const COMPATIBLE_DONOR_TYPES: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const COLORS = {
  outer: '#02040A',
  navy: '#050B19',

  card: '#091126',
  cardLight: '#101A35',

  border: '#243554',

  red: '#DB0A0A',
  redBright: '#EF3340',
  redDark: '#8E1118',

  white: '#FFFFFF',

  muted: '#7F889F',
  soft: '#B7C1D8',

  green: '#35C982',
  greenDark: '#1E9E62',
  orange: '#F3A34A',
  blue: '#4A8CFF',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// MODAL TYPES
// ============================================================

type ActionModalVariant =
  | 'info'
  | 'success'
  | 'error'
  | 'warning'
  | 'approve'
  | 'reject';

type ActionModalState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionModalVariant;
  confirmLabel: string;
  cancelLabel: string;
  showCancel: boolean;
  onConfirm?: () => void | Promise<void>;
};

const INITIAL_ACTION_MODAL: ActionModalState = {
  visible: false,
  title: '',
  message: '',
  variant: 'info',
  confirmLabel: 'Continue',
  cancelLabel: 'Cancel',
  showCancel: false,
  onConfirm: undefined,
};

// ============================================================
// SCREEN
// ============================================================

export default function DonationReviewScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const { width, height } = useWindowDimensions();

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

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [detail, setDetail] =
    useState<AdminDonationDetail | null>(null);

  const [adminNote, setAdminNote] = useState('');

  // Rejecting a completed record is rare, so its form stays
  // hidden until the admin asks for it.
  const [showRejectForm, setShowRejectForm] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const [actionModal, setActionModal] =
    useState<ActionModalState>(INITIAL_ACTION_MODAL);

  // ==========================================================
  // LOAD DONATION
  // ==========================================================

  const loadDonation = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token =
        await getAdminAccessToken();

      const storedProfile =
        await getAdminProfile();

      if (
        !token ||
        storedProfile?.role !== 'admin'
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(storedProfile);

      const result =
        await getAdminDonationById(
          token,
          id
        );

      setDetail(result);
    } catch (loadError) {
      console.log(
        'ADMIN DONATION DETAIL ERROR:',
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load donation.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadDonation();
    }, [loadDonation])
  );

  // ==========================================================
  // DERIVED
  // ==========================================================

  const donation =
    detail?.donation || null;

  const request =
    detail?.request || null;

  const application =
    detail?.donor_application || null;

  const needsReview =
    donation?.status ===
    'needs_review';

  const isCompleted =
    donation?.status ===
    'completed';

  const feedback =
    detail?.feedback || [];

  const donorName =
    getPersonName(
      detail?.donor,
      donation?.donor_name
    );

  const requesterName =
    getPersonName(
      detail?.requester,
      donation?.requester_name
    );

  const bagsLabel =
    donation
      ? `${donation.units_donated} ${
          donation.units_donated === 1
            ? 'bag'
            : 'bags'
        }`
      : '';

  // Bags already confirmed on the same request (not rejected).
  const confirmedBags =
    (detail?.request_donations || [])
      .filter(
        item =>
          item.status !== 'rejected'
      )
      .reduce(
        (total, item) =>
          total +
          (Number(item.units_donated) || 0),
        0
      );

  // ----------------------------------------------------------
  // VERIFICATION CHECKS (real data)
  // ----------------------------------------------------------

  const donorVerified =
    application?.status ===
    'approved';

  const donorBloodType =
    String(
      application?.blood_type ||
        detail?.donor?.blood_type ||
        ''
    )
      .trim()
      .toUpperCase();

  const bloodCompatible =
    Boolean(donation) &&
    Boolean(donorBloodType) &&
    (
      COMPATIBLE_DONOR_TYPES[
        String(donation?.blood_type)
          .trim()
          .toUpperCase()
      ] || []
    ).includes(donorBloodType);

  const offerAccepted =
    detail?.response?.status ===
    'accepted';

  const scheduled =
    Boolean(detail?.schedule);

  // Warn when the donor's recorded last donation is less than
  // 90 days before this one (skipped when it IS this one).
  const intervalWarning = useMemo(() => {
    if (
      !donation ||
      !application?.last_donation_date
    ) {
      return null;
    }

    const last = new Date(
      `${String(
        application.last_donation_date
      ).slice(0, 10)}T00:00:00`
    );

    const current = new Date(
      donation.donated_at
    );

    if (
      Number.isNaN(last.getTime()) ||
      Number.isNaN(current.getTime())
    ) {
      return null;
    }

    const days = Math.floor(
      (current.getTime() - last.getTime()) /
        DAY_MS
    );

    if (
      days <= 0 ||
      days >= DONATION_INTERVAL_DAYS
    ) {
      return null;
    }

    return `The donor's last recorded donation was on ${formatDate(
      application.last_donation_date
    )}, ${days} days before this one (recommended interval: ${DONATION_INTERVAL_DAYS} days).`;
  }, [donation, application]);

  // ==========================================================
  // CUSTOM ACTION MODAL
  // ==========================================================

  function closeActionModal() {
    setActionModal(INITIAL_ACTION_MODAL);
  }

  function confirmAction(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      variant?: ActionModalVariant;
      confirmLabel?: string;
    }
  ) {
    setActionModal({
      visible: true,
      title,
      message,
      variant: options?.variant || 'info',
      confirmLabel: options?.confirmLabel || 'Continue',
      cancelLabel: 'Cancel',
      showCancel: true,
      onConfirm,
    });
  }

  function showMessage(
    title: string,
    message: string,
    variant: ActionModalVariant = 'info'
  ) {
    setActionModal({
      visible: true,
      title,
      message,
      variant,
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
      showCancel: false,
      onConfirm: undefined,
    });
  }

  function handleActionModalConfirm() {
    const action = actionModal.onConfirm;

    closeActionModal();

    if (action) {
      void action();
    }
  }

  // ==========================================================
  // DECISION
  // ==========================================================

  async function submitDecision(
    decision: 'approve' | 'reject'
  ) {
    if (!donation) {
      return;
    }

    try {
      setSubmitting(true);

      const token =
        await getAdminAccessToken();

      if (!token) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      if (decision === 'approve') {
        await approveAdminDonation(
          token,
          donation.id,
          adminNote.trim() || null
        );
      } else {
        await rejectAdminDonation(
          token,
          donation.id,
          adminNote.trim()
        );
      }

      setAdminNote('');
      setShowRejectForm(false);

      await loadDonation();

      showMessage(
        decision === 'approve'
          ? 'Record Marked Valid'
          : 'Record Rejected',

        decision === 'approve'
          ? `${donorName}'s donation is now completed and on their donation record. The donor and requester were notified.`
          : 'The requester and donor were notified with your reason. Any change to the donor\'s last donation date was undone, and the requester can confirm the donation again.',

        decision === 'approve'
          ? 'success'
          : 'info'
      );
    } catch (decisionError) {
      console.log(
        'ADMIN DONATION DECISION ERROR:',
        decisionError
      );

      showMessage(
        decision === 'approve'
          ? 'Unable to Update Record'
          : 'Unable to Reject Record',

        decisionError instanceof Error
          ? decisionError.message
          : 'Please try again.',

        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleApprove() {
    if (
      !donation ||
      !needsReview ||
      submitting
    ) {
      return;
    }

    confirmAction(
      'Mark Record as Valid',

      `Confirm that ${donorName} donated ${bagsLabel} of ${donation.blood_type} at ${
        donation.facility_name || 'the facility'
      }?\n\nThe donation will be added to the donor's record and both the donor and requester will be notified.`,

      () => submitDecision('approve'),

      {
        variant: 'approve',
        confirmLabel: 'Mark Valid',
      }
    );
  }

  function handleReject() {
    if (
      !donation ||
      donation.status === 'rejected' ||
      submitting
    ) {
      return;
    }

    // A rejection must always explain why.
    if (
      adminNote.trim().length < 5
    ) {
      showMessage(
        'Reason Required',
        'Enter an admin note explaining why this record is being rejected. It is shared with the requester and donor.',
        'warning'
      );

      return;
    }

    confirmAction(
      'Reject Donation Record',

      'Reject this donation record? The requester and donor will be notified with your note, the donor\'s last donation date will be restored, and the requester can confirm it again with corrected details.',

      () => submitDecision('reject'),

      {
        variant: 'reject',
        confirmLabel: 'Reject',
      }
    );
  }

  function openUser(
    userId?: string | null
  ) {
    if (!userId) {
      return;
    }

    router.push(
      `/users/${userId}` as any
    );
  }

  function openRequest() {
    if (!request?.id) {
      return;
    }

    router.push(
      `/requests/${request.id}` as any
    );
  }

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

            {loading && !detail ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.redBright}
                />

                <Text
                  style={[
                    styles.loadingText,

                    {
                      fontSize: 14 * fs,
                      marginTop: 14 * s,
                    },
                  ]}
                >
                  Loading donation...
                </Text>
              </View>
            ) : error && !detail ? (
              <View style={styles.loadingArea}>
                <MaterialIcons
                  name="error-outline"
                  size={48 * s}
                  color={COLORS.redBright}
                />

                <Text
                  style={[
                    styles.errorTitle,

                    {
                      fontSize: 20 * fs,
                      marginTop: 15 * s,
                    },
                  ]}
                >
                  Unable to Load Donation
                </Text>

                <Text
                  style={[
                    styles.errorText,

                    {
                      fontSize: 13 * fs,
                      marginTop: 7 * s,
                    },
                  ]}
                >
                  {error}
                </Text>

                <View
                  style={[
                    styles.row,

                    {
                      gap: 10 * s,
                      marginTop: 20 * s,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                      styles.secondaryButton,

                      {
                        height: 46 * s,
                        borderRadius: 9 * s,
                        paddingHorizontal: 18 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Back to Donations
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={loadDonation}
                    style={({ pressed }) => [
                      styles.retryButton,

                      {
                        height: 46 * s,
                        borderRadius: 9 * s,
                        paddingHorizontal: 18 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.retryText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : detail && donation ? (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal: 48 * s,
                    paddingTop: 30 * s,
                    paddingBottom: 50 * s,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* BACK */}

                <Pressable
                  style={({ pressed }) => [
                    styles.backButton,

                    {
                      gap: 7 * s,
                      marginBottom: 20 * s,
                    },

                    pressed &&
                      styles.buttonPressed,
                  ]}
                  onPress={() => router.back()}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={20 * s}
                    color={COLORS.soft}
                  />

                  <Text
                    style={[
                      styles.backText,

                      {
                        fontSize: 13 * fs,
                      },
                    ]}
                  >
                    Donations
                  </Text>
                </Pressable>

                {/* ==================================================
                    DONATION SUMMARY
                ================================================== */}

                <FadeInView>
                  <View
                    style={[
                      styles.profileCard,

                      {
                        padding: 24 * s,
                        borderRadius: 16 * s,
                        marginBottom: 20 * s,
                      },
                    ]}
                  >
                    <View style={styles.profileMain}>
                      <View
                        style={[
                          styles.bloodAvatar,

                          {
                            width: 66 * s,
                            height: 66 * s,
                            borderRadius: 33 * s,
                            marginRight: 17 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bloodAvatarText,

                            {
                              fontSize: 20 * fs,
                            },
                          ]}
                        >
                          {donation.blood_type}
                        </Text>
                      </View>

                      <View style={styles.flexFill}>
                        <Text
                          style={[
                            styles.summaryTitle,

                            {
                              fontSize: 23 * fs,
                            },
                          ]}
                        >
                          {donorName} donated {bagsLabel}
                        </Text>

                        <Text
                          style={[
                            styles.summarySubtitle,

                            {
                              fontSize: 13 * fs,
                              marginTop: 3 * s,
                            },
                          ]}
                        >
                          For {requesterName}&apos;s request at{' '}
                          {donation.facility_name || 'the facility'}
                        </Text>

                        <Text
                          style={[
                            styles.submittedText,

                            {
                              fontSize: 12 * fs,
                              marginTop: 6 * s,
                            },
                          ]}
                        >
                          Donated {formatDateTime(donation.donated_at)} •
                          Confirmed by the requester{' '}
                          {formatDateTime(donation.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.profileBadges,

                        {
                          gap: 10 * s,
                        },
                      ]}
                    >
                      <StatusBadge
                        status={donation.status}
                        scale={s}
                        fontScale={fs}
                      />
                    </View>
                  </View>
                </FadeInView>

                {/* ==================================================
                    MAIN GRID
                ================================================== */}

                <View
                  style={[
                    styles.mainGrid,

                    {
                      gap: 18 * s,
                    },
                  ]}
                >
                  {/* ==================================================
                      LEFT COLUMN
                  ================================================== */}

                  <FadeInView
                    delay={60}
                    style={styles.leftColumn}
                  >
                    {/* DONATION */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="bloodtype"
                      title="Donation Details"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Blood Type"
                          value={donation.blood_type}
                          highlight
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Bags Donated"
                          value={String(
                            donation.units_donated
                          )}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Donated On"
                          value={formatDateTime(
                            donation.donated_at
                          )}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Confirmed On"
                          value={formatDateTime(
                            donation.created_at
                          )}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Facility"
                          value={
                            donation.facility_name ||
                            '—'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Coordination Schedule"
                          value={
                            detail.schedule
                              ? formatDateTime(
                                  detail.schedule.scheduled_at
                                )
                              : 'Not set in chat'
                          }
                        />
                      </InfoGrid>

                      <Text
                        style={[
                          styles.noteLabel,

                          {
                            fontSize: 11 * fs,
                            marginTop: 20 * s,
                            marginBottom: 8 * s,
                          },
                        ]}
                      >
                        NOTE FROM REQUESTER
                      </Text>

                      <View
                        style={[
                          styles.messagePanel,

                          {
                            padding: 16 * s,
                            borderRadius: 11 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            donation.requester_note
                              ? styles.messageText
                              : styles.mutedText,

                            {
                              fontSize: 13.5 * fs,
                              lineHeight: 21 * fs,
                            },
                          ]}
                        >
                          {donation.requester_note ||
                            'The requester did not add a note.'}
                        </Text>
                      </View>
                    </SectionCard>

                    {/* PEOPLE */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="people-outline"
                      title="People Involved"
                    >
                      <View
                        style={[
                          styles.row,

                          {
                            gap: 14 * s,
                          },
                        ]}
                      >
                        <PersonPanel
                          label="DONOR"
                          user={detail.donor}
                          fallbackName={
                            donation.donor_name
                          }
                          scale={s}
                          fontScale={fs}
                          extra={[
                            {
                              label: 'Donor Status',
                              value: donorVerified
                                ? 'Verified Donor'
                                : formatValue(
                                    application?.status ||
                                      'Not a donor'
                                  ),
                              color: donorVerified
                                ? COLORS.green
                                : COLORS.orange,
                            },
                            {
                              label: 'Verified Blood Type',
                              value:
                                donorBloodType ||
                                '—',
                            },
                            {
                              label: 'Last Donation',
                              value:
                                formatLastDonation(
                                  application
                                ),
                            },
                          ]}
                          onView={() =>
                            openUser(
                              detail.donor?.id
                            )
                          }
                        />

                        <PersonPanel
                          label="REQUESTER"
                          user={detail.requester}
                          fallbackName={
                            donation.requester_name
                          }
                          scale={s}
                          fontScale={fs}
                          onView={() =>
                            openUser(
                              detail.requester?.id
                            )
                          }
                        />
                      </View>
                    </SectionCard>

                    {/* REQUEST */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="assignment"
                      title="Blood Request"
                    >
                      {request ? (
                        <>
                          <InfoGrid>
                            <InfoItem
                              fontScale={fs}
                              label="Blood Type"
                              value={request.blood_type}
                              highlight
                            />

                            <InfoItem
                              fontScale={fs}
                              label="Bags Confirmed"
                              value={`${confirmedBags} of ${request.units_needed}`}
                              positive={
                                confirmedBags >=
                                request.units_needed
                              }
                            />

                            <InfoItem
                              fontScale={fs}
                              label="Urgency"
                              value={formatValue(
                                request.urgency ===
                                  'needed'
                                  ? 'scheduled'
                                  : request.urgency
                              )}
                            />

                            <InfoItem
                              fontScale={fs}
                              label="Request Status"
                              value={formatValue(
                                request.status
                              )}
                              positive={
                                request.status ===
                                'fulfilled'
                              }
                            />

                            <InfoItem
                              fontScale={fs}
                              label="Posted"
                              value={formatDateTime(
                                request.created_at
                              )}
                            />

                            <InfoItem
                              fontScale={fs}
                              label="Fulfilled"
                              value={
                                request.fulfilled_at
                                  ? formatDateTime(
                                      request.fulfilled_at
                                    )
                                  : 'Not yet'
                              }
                            />
                          </InfoGrid>

                          {/* Every donation on this request */}
                          {detail.request_donations
                            .length > 1 ? (
                            <>
                              <Text
                                style={[
                                  styles.noteLabel,

                                  {
                                    fontSize: 11 * fs,
                                    marginTop: 20 * s,
                                    marginBottom: 8 * s,
                                  },
                                ]}
                              >
                                ALL DONATIONS ON THIS REQUEST
                              </Text>

                              {detail.request_donations.map(
                                item => (
                                  <View
                                    key={item.id}
                                    style={[
                                      styles.requestDonationRow,

                                      {
                                        paddingVertical: 10 * s,
                                        gap: 10 * s,
                                      },

                                      item.id ===
                                        donation.id &&
                                        styles.requestDonationCurrent,
                                    ]}
                                  >
                                    <Text
                                      numberOfLines={1}
                                      style={[
                                        styles.personName,
                                        styles.flexFill,

                                        {
                                          fontSize: 13 * fs,
                                        },
                                      ]}
                                    >
                                      {item.donor_name ||
                                        'Donor'}
                                      {item.id ===
                                      donation.id
                                        ? '  (this donation)'
                                        : ''}
                                    </Text>

                                    <Text
                                      style={[
                                        styles.mutedText,

                                        {
                                          fontSize: 12 * fs,
                                        },
                                      ]}
                                    >
                                      {item.units_donated}{' '}
                                      {item.units_donated === 1
                                        ? 'bag'
                                        : 'bags'}{' '}
                                      • {formatDate(
                                        item.donated_at
                                      )}
                                    </Text>

                                    <StatusBadge
                                      status={item.status}
                                      scale={s * 0.82}
                                      fontScale={fs * 0.92}
                                    />
                                  </View>
                                )
                              )}
                            </>
                          ) : null}

                          <Pressable
                            onPress={openRequest}
                            style={({ pressed }) => [
                              styles.viewUserButton,

                              {
                                height: 40 * s,
                                borderRadius: 8 * s,
                                marginTop: 18 * s,
                                gap: 6 * s,
                              },

                              pressed &&
                                styles.buttonPressed,
                            ]}
                          >
                            <MaterialIcons
                              name="open-in-new"
                              size={17 * s}
                              color={COLORS.soft}
                            />

                            <Text
                              style={[
                                styles.viewUserText,

                                {
                                  fontSize: 12.5 * fs,
                                },
                              ]}
                            >
                              View Blood Request
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.mutedText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          The related blood request is no longer available.
                        </Text>
                      )}
                    </SectionCard>
                  </FadeInView>

                  {/* ==================================================
                      RIGHT COLUMN
                  ================================================== */}

                  <FadeInView
                    delay={120}
                    style={styles.rightColumn}
                  >
                    {/* RECORD REVIEW */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="fact-check"
                      title="Record Review"
                    >
                      <Text
                        style={[
                          styles.noteLabel,

                          {
                            fontSize: 11 * fs,
                            marginBottom: 10 * s,
                          },
                        ]}
                      >
                        CHECKS
                      </Text>

                      <CheckRow
                        scale={s}
                        fontScale={fs}
                        ok={donorVerified}
                        label="Donor is a verified donor"
                      />

                      <CheckRow
                        scale={s}
                        fontScale={fs}
                        ok={bloodCompatible}
                        label={
                          donorBloodType
                            ? `${donorBloodType} donor can give to ${donation.blood_type}`
                            : 'Donor blood type on record'
                        }
                      />

                      <CheckRow
                        scale={s}
                        fontScale={fs}
                        ok={offerAccepted}
                        label="Requester accepted this donor"
                      />

                      <CheckRow
                        scale={s}
                        fontScale={fs}
                        ok={scheduled}
                        optional
                        label={
                          scheduled
                            ? 'Donation was scheduled in chat'
                            : 'No schedule set in chat (optional)'
                        }
                      />

                      <CheckRow
                        scale={s}
                        fontScale={fs}
                        ok={!intervalWarning}
                        label={
                          intervalWarning
                            ? 'Less than 90 days since last donation'
                            : '90+ days since last recorded donation'
                        }
                        last
                      />

                      {intervalWarning ? (
                        <View
                          style={[
                            styles.warningPanel,

                            {
                              marginTop: 10 * s,
                              padding: 10 * s,
                              borderRadius: 8 * s,
                              gap: 7 * s,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="warning-amber"
                            size={16 * s}
                            color={COLORS.orange}
                          />

                          <Text
                            style={[
                              styles.warningText,

                              {
                                fontSize: 11.5 * fs,
                                lineHeight: 16 * fs,
                              },
                            ]}
                          >
                            {intervalWarning}
                          </Text>
                        </View>
                      ) : null}

                      {/* WHY IT WAS FLAGGED */}

                      {needsReview ? (
                        <View
                          style={[
                            styles.flagPanel,

                            {
                              marginTop: 16 * s,
                              padding: 14 * s,
                              borderRadius: 10 * s,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.row,

                              {
                                alignItems: 'center',
                                gap: 8 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="flag"
                              size={18 * s}
                              color={COLORS.orange}
                            />

                            <Text
                              style={[
                                styles.reviewedTitle,

                                {
                                  fontSize: 13 * fs,
                                },
                              ]}
                            >
                              Flagged for review
                            </Text>
                          </View>

                          {(donation.review_reason_labels || []).map(
                            label => (
                              <Text
                                key={label}
                                style={[
                                  styles.warningText,

                                  {
                                    fontSize: 12 * fs,
                                    lineHeight: 17 * fs,
                                    marginTop: 6 * s,
                                  },
                                ]}
                              >
                                • {label.charAt(0).toUpperCase()}
                                {label.slice(1)}
                              </Text>
                            )
                          )}

                          {donation.dispute_note ? (
                            <View
                              style={[
                                styles.messagePanel,

                                {
                                  marginTop: 10 * s,
                                  padding: 12 * s,
                                  borderRadius: 9 * s,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.noteLabel,

                                  {
                                    fontSize: 10.5 * fs,
                                    marginBottom: 5 * s,
                                  },
                                ]}
                              >
                                DONOR&apos;S REPORT •{' '}
                                {formatDateTime(
                                  donation.disputed_at
                                )}
                              </Text>

                              <Text
                                style={[
                                  styles.messageText,

                                  {
                                    fontSize: 12.5 * fs,
                                    lineHeight: 19 * fs,
                                  },
                                ]}
                              >
                                {donation.dispute_note}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* CURRENT STATE (completed / rejected) */}

                      {!needsReview ? (
                        <View
                          style={[
                            styles.reviewedPanel,

                            {
                              marginTop: 16 * s,
                              padding: 14 * s,
                              borderRadius: 10 * s,
                              gap: 10 * s,
                            },

                            isCompleted
                              ? styles.reviewedPanelVerified
                              : styles.reviewedPanelRejected,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              isCompleted
                                ? 'task-alt'
                                : 'cancel'
                            }
                            size={21 * s}
                            color={
                              isCompleted
                                ? COLORS.green
                                : COLORS.redBright
                            }
                          />

                          <View style={styles.flexFill}>
                            <Text
                              style={[
                                styles.reviewedTitle,

                                {
                                  fontSize: 13 * fs,
                                },
                              ]}
                            >
                              {!isCompleted
                                ? 'Record Rejected'
                                : donation.verified_at
                                  ? 'Completed • Marked valid after review'
                                  : 'Completed • Recorded automatically'}
                            </Text>

                            <Text
                              style={[
                                styles.reviewedDate,

                                {
                                  fontSize: 11 * fs,
                                  marginTop: 2 * s,
                                },
                              ]}
                            >
                              {donation.verified_at
                                ? `${formatDateTime(
                                    donation.verified_at
                                  )}${
                                    detail.reviewer?.name
                                      ? ` • by ${detail.reviewer.name}`
                                      : ''
                                  }`
                                : `All checks passed when the requester confirmed it (${formatDateTime(
                                    donation.created_at
                                  )}).`}
                            </Text>

                            {donation.admin_note ? (
                              <Text
                                style={[
                                  styles.messageText,

                                  {
                                    fontSize: 12.5 * fs,
                                    lineHeight: 19 * fs,
                                    marginTop: 8 * s,
                                  },
                                ]}
                              >
                                {donation.admin_note}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : null}

                      {/* ACTIONS */}

                      {needsReview ||
                      (isCompleted && showRejectForm) ? (
                        <>
                          <Text
                            style={[
                              styles.noteLabel,

                              {
                                fontSize: 11 * fs,
                                marginTop: 18 * s,
                                marginBottom: 8 * s,
                              },
                            ]}
                          >
                            ADMIN NOTE
                          </Text>

                          <TextInput
                            value={adminNote}
                            onChangeText={setAdminNote}
                            editable={!submitting}
                            multiline
                            textAlignVertical="top"
                            maxLength={MAX_NOTE_LENGTH}
                            placeholder={
                              needsReview
                                ? 'Optional when marking valid. Required when rejecting, e.g. the blood bank has no record of this donation.'
                                : 'Why is this record wrong? e.g. the donor did not donate on this date.'
                            }
                            placeholderTextColor={COLORS.muted}
                            style={[
                              styles.noteInput,

                              {
                                minHeight: 100 * s,
                                borderRadius: 11 * s,
                                padding: 14 * s,
                                fontSize: 13 * fs,
                                lineHeight: 20 * fs,
                              },
                            ]}
                          />

                          <Text
                            style={[
                              styles.noteCounter,

                              {
                                fontSize: 11 * fs,
                                marginTop: 6 * s,
                              },
                            ]}
                          >
                            {adminNote.length}/{MAX_NOTE_LENGTH}
                          </Text>

                          <View
                            style={[
                              styles.row,

                              {
                                gap: 10 * s,
                                marginTop: 14 * s,
                              },
                            ]}
                          >
                            {isCompleted ? (
                              <ActionButton
                                label="Cancel"
                                icon="undo"
                                tone="outline"
                                scale={s}
                                fontScale={fs}
                                disabled={submitting}
                                onPress={() => {
                                  setShowRejectForm(false);
                                  setAdminNote('');
                                }}
                                style={styles.flexFill}
                              />
                            ) : null}

                            <ActionButton
                              label={
                                needsReview
                                  ? 'Reject'
                                  : 'Reject Record'
                              }
                              icon="close"
                              tone="danger"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              loading={
                                submitting &&
                                isCompleted
                              }
                              onPress={handleReject}
                              style={styles.flexFill}
                            />

                            {needsReview ? (
                              <ActionButton
                                label="Mark as Valid"
                                icon="task-alt"
                                tone="success"
                                scale={s}
                                fontScale={fs}
                                disabled={submitting}
                                loading={submitting}
                                onPress={handleApprove}
                                style={styles.flexFill}
                              />
                            ) : null}
                          </View>
                        </>
                      ) : isCompleted ? (
                        <Pressable
                          onPress={() =>
                            setShowRejectForm(true)
                          }
                          style={({ pressed }) => [
                            styles.rejectLink,

                            {
                              marginTop: 14 * s,
                              gap: 6 * s,
                            },

                            pressed &&
                              styles.buttonPressed,
                          ]}
                        >
                          <MaterialIcons
                            name="report-gmailerrorred"
                            size={16 * s}
                            color={COLORS.muted}
                          />

                          <Text
                            style={[
                              styles.mutedText,

                              {
                                fontSize: 12 * fs,
                              },
                            ]}
                          >
                            Record wrong?{' '}
                            <Text style={styles.rejectLinkStrong}>
                              Reject this record
                            </Text>
                          </Text>
                        </Pressable>
                      ) : null}

                      <Text
                        style={[
                          styles.hintText,

                          {
                            fontSize: 11 * fs,
                            lineHeight: 16 * fs,
                            marginTop: 12 * s,
                          },
                        ]}
                      >
                        Donations are recorded automatically. Only flagged records need your review.
                      </Text>
                    </SectionCard>

                    {/* FEEDBACK */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="reviews"
                      title="Transaction Feedback"
                    >
                      {feedback.length === 0 ? (
                        <Text
                          style={[
                            styles.mutedText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          Neither side has left feedback yet.
                        </Text>
                      ) : (
                        feedback.map(
                          (item, index) => (
                            <FeedbackItem
                              key={item.from_role}
                              item={item}
                              scale={s}
                              fontScale={fs}
                              last={
                                index ===
                                feedback.length - 1
                              }
                            />
                          )
                        )
                      )}
                    </SectionCard>

                    {/* TRANSACTION TIMELINE */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="timeline"
                      title="Transaction Timeline"
                    >
                      {detail.timeline.map(
                        (step, index) => (
                          <TimelineStep
                            key={step.key}
                            scale={s}
                            fontScale={fs}
                            label={step.label}
                            actor={step.actor}
                            at={step.at}
                            done={step.done}
                            rejected={
                              step.key ===
                                'admin_decision' &&
                              donation.status ===
                                'rejected'
                            }
                            warning={
                              !step.done &&
                              (step.key ===
                                'recorded' ||
                                step.key ===
                                  'admin_decision')
                            }
                            last={
                              index ===
                              detail.timeline.length - 1
                            }
                          />
                        )
                      )}
                    </SectionCard>
                  </FadeInView>
                </View>
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          CUSTOM HEMO-HERO MODAL
      ======================================================== */}

      <ActionModal
        state={actionModal}
        scale={s}
        fontScale={fs}
        onClose={closeActionModal}
        onConfirm={handleActionModalConfirm}
      />
    </View>
  );
}

// ============================================================
// ACTION BUTTON
// ============================================================

function ActionButton({
  label,
  icon,
  tone,
  scale,
  fontScale,
  disabled,
  loading = false,
  onPress,
  style,
}: {
  label: string;
  icon: IconName;
  tone: 'success' | 'danger' | 'outline';
  scale: number;
  fontScale: number;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const color =
    tone === 'success'
      ? COLORS.white
      : tone === 'danger'
        ? COLORS.redBright
        : COLORS.soft;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,

        tone === 'success'
          ? styles.successAction
          : tone === 'danger'
            ? styles.dangerAction
            : styles.outlineAction,

        {
          height: 48 * scale,
          borderRadius: 10 * scale,
          gap: 7 * scale,
        },

        style,

        disabled &&
          styles.disabledButton,

        pressed &&
          !disabled &&
          styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <MaterialIcons
            name={icon}
            size={20 * scale}
            color={color}
          />

          <Text
            style={[
              styles.actionText,

              {
                fontSize: 13 * fontScale,
                color,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ============================================================
// CHECK ROW
// ============================================================

function CheckRow({
  scale,
  fontScale,
  ok,
  label,
  optional = false,
  last = false,
}: {
  scale: number;
  fontScale: number;
  ok: boolean;
  label: string;
  optional?: boolean;
  last?: boolean;
}) {
  const color = ok
    ? COLORS.green
    : optional
      ? COLORS.muted
      : COLORS.orange;

  return (
    <View
      style={[
        styles.checkRow,

        {
          paddingVertical: 8 * scale,
          gap: 9 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      <MaterialIcons
        name={
          ok
            ? 'check-circle'
            : optional
              ? 'remove-circle-outline'
              : 'error-outline'
        }
        size={18 * scale}
        color={color}
      />

      <Text
        style={[
          styles.checkText,

          {
            fontSize: 12.5 * fontScale,
          },

          !ok &&
            !optional && {
              color: COLORS.orange,
            },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// PERSON PANEL
// ============================================================

function PersonPanel({
  label,
  user,
  fallbackName,
  scale,
  fontScale,
  extra = [],
  onView,
}: {
  label: string;
  user?: AdminReportUser | null;
  fallbackName?: string | null;
  scale: number;
  fontScale: number;
  extra?: {
    label: string;
    value: string;
    color?: string;
  }[];
  onView: () => void;
}) {
  const name =
    getPersonName(
      user,
      fallbackName
    );

  const initials =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .map(value =>
        String(value)
          .charAt(0)
          .toUpperCase()
      )
      .join('') ||
    (user ? 'U' : '?');

  return (
    <View
      style={[
        styles.personPanel,

        {
          padding: 16 * scale,
          borderRadius: 12 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize: 11 * fontScale,
            marginBottom: 12 * scale,
          },
        ]}
      >
        {label}
      </Text>

      <View style={styles.personTop}>
        <View
          style={[
            styles.personAvatar,

            {
              width: 44 * scale,
              height: 44 * scale,
              borderRadius: 22 * scale,
              marginRight: 11 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.personAvatarText,

              {
                fontSize: 14 * fontScale,
              },
            ]}
          >
            {initials}
          </Text>
        </View>

        <View style={styles.flexFill}>
          <Text
            numberOfLines={1}
            style={[
              user
                ? styles.personName
                : styles.mutedText,

              {
                fontSize: 14 * fontScale,
              },
            ]}
          >
            {name}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.mutedText,

              {
                fontSize: 12 * fontScale,
                marginTop: 2 * scale,
              },
            ]}
          >
            {user?.email ||
              'Account deleted'}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 14 * scale,
          gap: 8 * scale,
        }}
      >
        {user ? (
          <>
            <PersonDetail
              fontScale={fontScale}
              label="Phone"
              value={user.phone || '—'}
            />

            <PersonDetail
              fontScale={fontScale}
              label="Location"
              value={
                [user.city, user.province]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
          </>
        ) : null}

        {extra.map(item => (
          <PersonDetail
            key={item.label}
            fontScale={fontScale}
            label={item.label}
            value={item.value}
            valueColor={item.color}
          />
        ))}
      </View>

      {user ? (
        <Pressable
          onPress={onView}
          style={({ pressed }) => [
            styles.viewUserButton,

            {
              height: 38 * scale,
              borderRadius: 8 * scale,
              marginTop: 14 * scale,
              gap: 6 * scale,
            },

            pressed &&
              styles.buttonPressed,
          ]}
        >
          <MaterialIcons
            name="person-search"
            size={17 * scale}
            color={COLORS.soft}
          />

          <Text
            style={[
              styles.viewUserText,

              {
                fontSize: 12.5 * fontScale,
              },
            ]}
          >
            View User
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PersonDetail({
  fontScale,
  label,
  value,
  valueColor,
}: {
  fontScale: number;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.personDetailRow}>
      <Text
        style={[
          styles.mutedText,

          {
            fontSize: 12 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.personDetailValue,

          {
            fontSize: 12.5 * fontScale,
          },

          valueColor
            ? { color: valueColor }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// TIMELINE STEP
// ============================================================

function TimelineStep({
  scale,
  fontScale,
  label,
  actor,
  at,
  done,
  rejected = false,
  warning = false,
  last = false,
}: {
  scale: number;
  fontScale: number;
  label: string;
  actor: string;
  at?: string | null;
  done: boolean;
  rejected?: boolean;
  // Flagged / waiting on an admin.
  warning?: boolean;
  last?: boolean;
}) {
  const color = rejected
    ? COLORS.redBright
    : warning
      ? COLORS.orange
      : done
        ? COLORS.green
        : COLORS.muted;

  return (
    <View
      style={[
        styles.timelineStep,

        {
          gap: 12 * scale,
        },
      ]}
    >
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,

            {
              width: 26 * scale,
              height: 26 * scale,
              borderRadius: 13 * scale,
              borderColor: color,
              backgroundColor:
                done || warning
                  ? `${color}22`
                  : 'transparent',
            },
          ]}
        >
          <MaterialIcons
            name={
              rejected
                ? 'close'
                : warning
                  ? 'flag'
                  : done
                    ? 'check'
                    : 'more-horiz'
            }
            size={15 * scale}
            color={color}
          />
        </View>

        {!last ? (
          <View
            style={[
              styles.timelineLine,

              {
                width: 2 * scale,
                minHeight: 22 * scale,
              },

              done && {
                backgroundColor:
                  'rgba(53,201,130,0.45)',
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.flexFill,

          {
            paddingBottom: last ? 0 : 14 * scale,
          },
        ]}
      >
        <Text
          style={[
            done || rejected || warning
              ? styles.timelineLabel
              : styles.mutedText,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.mutedText,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {actor}
          {at
            ? ` • ${formatDateTime(at)}`
            : ''}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// FEEDBACK ITEM
// ============================================================

function FeedbackItem({
  item,
  scale,
  fontScale,
  last,
}: {
  item: AdminDonationFeedback;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  return (
    <View
      style={[
        styles.feedbackItem,

        {
          paddingVertical: 12 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      <View
        style={[
          styles.row,

          {
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10 * scale,
          },
        ]}
      >
        <View style={styles.flexFill}>
          <Text
            numberOfLines={1}
            style={[
              styles.personName,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {item.from_name ||
              (item.from_role === 'donor'
                ? 'Donor'
                : 'Requester')}
          </Text>

          <Text
            style={[
              styles.mutedText,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 2 * scale,
              },
            ]}
          >
            {item.from_role === 'donor'
              ? 'Donor about the requester'
              : 'Requester about the donor'}{' '}
            • {formatDateTime(item.created_at)}
          </Text>
        </View>

        <View
          style={[
            styles.row,

            {
              alignItems: 'center',
              gap: 1 * scale,
            },
          ]}
        >
          {[1, 2, 3, 4, 5].map(value => (
            <MaterialIcons
              key={value}
              name={
                value <= item.rating
                  ? 'star'
                  : 'star-border'
              }
              size={17 * scale}
              color={
                value <= item.rating
                  ? COLORS.orange
                  : COLORS.border
              }
            />
          ))}
        </View>
      </View>

      {item.comment ? (
        <Text
          style={[
            styles.messageText,

            {
              fontSize: 12.5 * fontScale,
              lineHeight: 19 * fontScale,
              marginTop: 8 * scale,
            },
          ]}
        >
          “{item.comment}”
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// ACTION MODAL
// (same design as the Donor Application review modal)
// ============================================================

function ActionModal({
  state,
  scale,
  fontScale,
  onClose,
  onConfirm,
}: {
  state: ActionModalState;
  scale: number;
  fontScale: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const accent =
    getActionModalAccent(state.variant);

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,

            {
              width: 500 * scale,
              maxWidth: '88%',
              borderRadius: 18 * scale,
              padding: 26 * scale,
              borderColor: accent,
            },
          ]}
        >
          <View
            style={[
              styles.modalIconWrap,

              {
                width: 56 * scale,
                height: 56 * scale,
                borderRadius: 28 * scale,
                backgroundColor:
                  getActionModalTint(state.variant),
              },
            ]}
          >
            <MaterialIcons
              name={getActionModalIcon(state.variant)}
              size={29 * scale}
              color={accent}
            />
          </View>

          <Text
            style={[
              styles.modalTitle,

              {
                fontSize: 20 * fontScale,
                lineHeight: 27 * fontScale,
                marginTop: 17 * scale,
              },
            ]}
          >
            {state.title}
          </Text>

          <Text
            style={[
              styles.modalMessage,

              {
                fontSize: 14 * fontScale,
                lineHeight: 22 * fontScale,
                marginTop: 8 * scale,
              },
            ]}
          >
            {state.message}
          </Text>

          <View
            style={[
              styles.modalActions,

              {
                gap: 10 * scale,
                marginTop: 24 * scale,
              },
            ]}
          >
            {state.showCancel ? (
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalCancelButton,

                  {
                    height: 48 * scale,
                    borderRadius: 10 * scale,
                  },

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  {state.cancelLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.modalPrimaryButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                  backgroundColor:
                    getActionModalPrimaryColor(
                      state.variant
                    ),
                },

                !state.showCancel &&
                  styles.modalSingleButton,

                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.modalPrimaryText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                {state.confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  children,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          padding: 21 * scale,
          borderRadius: 15 * scale,
          marginBottom: 18 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            gap: 9 * scale,
            marginBottom: 19 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width: 38 * scale,
              height: 38 * scale,
              borderRadius: 10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={21 * scale}
            color={COLORS.redBright}
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,

            {
              fontSize: 16 * fontScale,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

// ============================================================
// INFO GRID / ITEM
// ============================================================

function InfoGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View style={styles.infoGrid}>
      {children}
    </View>
  );
}

function InfoItem({
  fontScale,
  label,
  value,
  highlight = false,
  positive = false,
}: {
  fontScale: number;
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <View style={styles.infoItem}>
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize: 11 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.infoValue,

          {
            fontSize: 13 * fontScale,
            marginTop: 4,
            lineHeight: 19 * fontScale,
          },

          highlight &&
            styles.infoHighlight,

          positive &&
            styles.infoPositive,
        ]}
      >
        {value}
      </Text>
    </View>
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
  status: AdminDonationStatus;
  scale: number;
  fontScale: number;
}) {
  const palette =
    getStatusPalette(status);

  return (
    <View
      style={[
        styles.statusBadge,

        {
          height: 38 * scale,
          minWidth: 105 * scale,
          borderRadius: 8 * scale,
          paddingHorizontal: 13 * scale,
          gap: 6 * scale,
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
      ]}
    >
      <MaterialIcons
        name={palette.icon}
        size={15 * scale}
        color={palette.color}
      />

      <Text
        style={[
          styles.statusBadgeText,

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
): {
  label: string;
  icon: IconName;
  color: string;
  border: string;
  background: string;
} {
  switch (status) {
    case 'needs_review':
      return {
        label: 'Needs Review',
        icon: 'flag',
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'completed':
      return {
        label: 'Completed',
        icon: 'task-alt',
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    default:
      return {
        label: 'Rejected',
        icon: 'cancel',
        color: COLORS.redBright,
        border: 'rgba(239,51,64,0.50)',
        background: 'rgba(239,51,64,0.12)',
      };
  }
}

function getPersonName(
  user?: AdminReportUser | null,
  fallbackName?: string | null
) {
  if (!user) {
    return fallbackName
      ? `${fallbackName} (deleted account)`
      : 'Deleted account';
  }

  const name =
    user.full_name?.trim() ||
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    name ||
    fallbackName ||
    user.email ||
    'Hemo-Hero User'
  );
}

function formatLastDonation(
  application: AdminDonationDetail['donor_application']
) {
  if (!application) {
    return '—';
  }

  if (application.last_donation_date) {
    return formatDate(
      application.last_donation_date
    );
  }

  if (
    application.last_donation_month &&
    application.last_donation_year
  ) {
    return new Date(
      application.last_donation_year,
      application.last_donation_month - 1,
      1
    ).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
  }

  return application.has_donated_before
    ? 'Date not provided'
    : 'First-time donor';
}

function getActionModalAccent(
  variant: ActionModalVariant
) {
  switch (variant) {
    case 'success':
    case 'approve':
      return COLORS.green;

    case 'warning':
      return COLORS.orange;

    case 'reject':
    case 'error':
      return COLORS.redBright;

    default:
      return COLORS.blue;
  }
}

function getActionModalTint(
  variant: ActionModalVariant
) {
  switch (variant) {
    case 'success':
    case 'approve':
      return 'rgba(53,201,130,0.12)';

    case 'warning':
      return 'rgba(243,163,74,0.12)';

    case 'reject':
    case 'error':
      return 'rgba(239,51,64,0.12)';

    default:
      return 'rgba(74,140,255,0.12)';
  }
}

function getActionModalPrimaryColor(
  variant: ActionModalVariant
) {
  if (variant === 'reject') {
    return COLORS.redDark;
  }

  if (
    variant === 'success' ||
    variant === 'approve'
  ) {
    return COLORS.greenDark;
  }

  if (variant === 'warning') {
    return COLORS.orange;
  }

  return COLORS.red;
}

function getActionModalIcon(
  variant: ActionModalVariant
): IconName {
  switch (variant) {
    case 'success':
      return 'check-circle';

    case 'warning':
      return 'warning-amber';

    case 'approve':
      return 'verified';

    case 'reject':
      return 'cancel';

    case 'error':
      return 'error-outline';

    default:
      return 'info-outline';
  }
}

function formatValue(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  return value
    .replace(/_/g, ' ')
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

  // Date-only values (YYYY-MM-DD) are shown as that calendar day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

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

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  mutedText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  // LOADING / ERROR

  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  errorTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },

  errorText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  retryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  secondaryButtonText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // BACK

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },

  backText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // SUMMARY CARD

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  profileMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bloodAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  bloodAvatarText: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_700Bold',
  },

  summaryTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  summarySubtitle: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
  },

  submittedText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  profileBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
  },

  // GRID

  mainGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  leftColumn: {
    flex: 1.55,
  },

  rightColumn: {
    flex: 1,
  },

  // SECTION CARD

  sectionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  sectionTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  // INFO

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 10,
  },

  infoItem: {
    width: '48%',
  },

  infoLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  infoHighlight: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_600SemiBold',
  },

  infoPositive: {
    color: COLORS.green,
  },

  messagePanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  messageText: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
  },

  requestDonationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  requestDonationCurrent: {
    borderBottomColor: 'rgba(239,51,64,0.35)',
  },

  // PEOPLE

  personPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  personTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  personAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  personAvatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  personName: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  personDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  personDetailValue: {
    flexShrink: 1,
    marginLeft: 10,
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
  },

  viewUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  viewUserText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // VERIFICATION

  noteLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  checkText: {
    flex: 1,
    color: COLORS.soft,
    fontFamily: 'Inter_500Medium',
  },

  warningPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.40)',
    backgroundColor: 'rgba(243,163,74,0.10)',
  },

  warningText: {
    flex: 1,
    color: COLORS.orange,
    fontFamily: 'Inter_500Medium',
  },

  noteInput: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
    outlineStyle: 'none',
  } as any,

  noteCounter: {
    alignSelf: 'flex-end',
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  hintText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successAction: {
    backgroundColor: COLORS.greenDark,
  },

  dangerAction: {
    borderWidth: 1,
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  outlineAction: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  flagPanel: {
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.40)',
    backgroundColor: 'rgba(243,163,74,0.08)',
  },

  rejectLink: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },

  rejectLinkStrong: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  feedbackItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  actionText: {
    fontFamily: 'Inter_600SemiBold',
  },

  reviewedPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },

  reviewedPanelVerified: {
    borderColor: 'rgba(53,201,130,0.40)',
    backgroundColor: 'rgba(53,201,130,0.08)',
  },

  reviewedPanelRejected: {
    borderColor: 'rgba(239,51,64,0.40)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  reviewedTitle: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  reviewedDate: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  // TIMELINE

  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  timelineRail: {
    alignItems: 'center',
  },

  timelineDot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },

  timelineLine: {
    flex: 1,
    marginVertical: 3,
    backgroundColor: COLORS.border,
  },

  timelineLabel: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  // BUTTON STATES

  disabledButton: {
    opacity: 0.45,
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
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
    alignItems: 'center',
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

  modalIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },

  modalMessage: {
    maxWidth: 430,
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  modalActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  modalPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSingleButton: {
    maxWidth: 190,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  modalCancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  modalPrimaryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
