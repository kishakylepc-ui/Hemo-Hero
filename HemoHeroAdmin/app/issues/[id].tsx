import {
  type ComponentProps,
  type ReactNode,
  useCallback,
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

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  getAdminReportById,
  keepAdminBloodRequest,
  removeAdminBloodRequest,
  updateAdminReport,
  type AdminProfile,
  type AdminReport,
  type AdminReportStatus,
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
// ============================================================

const MAX_NOTE_LENGTH = 2000;

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
// STATUS ACTION COPY
// ============================================================

const STATUS_ACTIONS: Record<
  AdminReportStatus,
  {
    title: string;
    message: string;
    confirmLabel: string;
    variant: ActionModalVariant;
    successTitle: string;
    successMessage: string;
  }
> = {
  in_review: {
    title: 'Start Review',
    message:
      'Mark this issue as In Review so other administrators know it is being handled?',
    confirmLabel: 'Start Review',
    variant: 'warning',
    successTitle: 'Issue In Review',
    successMessage:
      'This issue is now marked as In Review.',
  },

  resolved: {
    title: 'Resolve Issue',
    message:
      'Mark this issue as resolved? Your admin note will be saved with the decision.',
    confirmLabel: 'Resolve',
    variant: 'approve',
    successTitle: 'Issue Resolved',
    successMessage:
      'This issue has been marked as resolved.',
  },

  dismissed: {
    title: 'Dismiss Issue',
    message:
      'Dismiss this issue as not requiring action? Your admin note will be saved with the decision.',
    confirmLabel: 'Dismiss',
    variant: 'reject',
    successTitle: 'Issue Dismissed',
    successMessage:
      'This issue has been dismissed.',
  },

  open: {
    title: 'Reopen Issue',
    message:
      'Reopen this issue so it appears as Open again?',
    confirmLabel: 'Reopen',
    variant: 'info',
    successTitle: 'Issue Reopened',
    successMessage:
      'This issue is open again.',
  },
};

// ============================================================
// SCREEN
// ============================================================

export default function IssueReviewScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();


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

  const [report, setReport] =
    useState<AdminReport | null>(null);

  const [adminNote, setAdminNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const [actionModal, setActionModal] =
    useState<ActionModalState>(INITIAL_ACTION_MODAL);

  // ==========================================================
  // LOAD ISSUE
  // ==========================================================

  const loadIssue = useCallback(async () => {
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
        await getAdminReportById(
          token,
          id
        );

      setReport(result.report);

      setAdminNote(
        result.report?.admin_note ||
          ''
      );
    } catch (loadError) {
      console.log(
        'ADMIN ISSUE DETAIL ERROR:',
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load issue.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadIssue();
    }, [loadIssue])
  );

  // ==========================================================
  // DERIVED
  // ==========================================================

  const isReport =
    report?.kind === 'report';

  const savedNote =
    report?.admin_note || '';

  const noteChanged =
    adminNote.trim() !==
    savedNote.trim();

  const isClosed =
    report?.status === 'resolved' ||
    report?.status === 'dismissed';

  // Made from the request page (false request, asking for
  // payment), not from a conversation.
  const isRequestReport =
    isReport &&
    Boolean(report?.request_id) &&
    !report?.response_id;

  // The admin can still take the reported request down or
  // keep it up.
  const canDecideRequest =
    isRequestReport &&
    !isClosed &&
    report?.request?.status === 'active' &&
    !report?.request?.removed_at;

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
  // SAVE (status and/or note)
  // ==========================================================

  async function saveChanges(
    input: {
      status?: AdminReportStatus;
      admin_note: string | null;
    },
    success: {
      title: string;
      message: string;
    }
  ) {
    if (!report) {
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

      const result =
        await updateAdminReport(
          token,
          report.id,
          input
        );

      setReport(result.report);

      setAdminNote(
        result.report?.admin_note ||
          ''
      );

      showMessage(
        success.title,
        success.message,
        'success'
      );
    } catch (saveError) {
      console.log(
        'ADMIN ISSUE UPDATE ERROR:',
        saveError
      );

      showMessage(
        'Unable to Update Issue',
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update this issue.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================================
  // STATUS CHANGE
  // ==========================================================

  function handleStatusChange(
    nextStatus: AdminReportStatus
  ) {
    if (
      !report ||
      submitting
    ) {
      return;
    }

    // Closing a REPORT requires a written decision,
    // like rejecting a donor application.
    if (
      isReport &&
      (nextStatus === 'resolved' ||
        nextStatus === 'dismissed') &&
      !adminNote.trim()
    ) {
      showMessage(
        'Admin Note Required',
        'Enter an admin note describing the action taken before closing this report.',
        'warning'
      );

      return;
    }

    const copy =
      STATUS_ACTIONS[nextStatus];

    confirmAction(
      copy.title,
      copy.message,
      () =>
        saveChanges(
          {
            status: nextStatus,
            admin_note:
              adminNote.trim() || null,
          },
          {
            title: copy.successTitle,
            message: copy.successMessage,
          }
        ),
      {
        variant: copy.variant,
        confirmLabel: copy.confirmLabel,
      }
    );
  }

  function handleSaveNote() {
    if (
      !report ||
      submitting ||
      !noteChanged
    ) {
      return;
    }

    void saveChanges(
      {
        admin_note:
          adminNote.trim() || null,
      },
      {
        title: 'Note Saved',
        message:
          'Your admin note has been saved.',
      }
    );
  }

  // ==========================================================
  // REPORTED REQUEST: REMOVE OR KEEP
  //
  // Removing closes it for everyone and the requester sees the
  // admin note. Either way, all open reports on the request are
  // closed together.
  // ==========================================================

  function handleRequestDecision(
    decision: 'remove' | 'keep'
  ) {
    const request =
      report?.request;

    if (
      !request ||
      submitting
    ) {
      return;
    }

    const note =
      adminNote.trim();

    if (
      decision === 'remove' &&
      !note
    ) {
      showMessage(
        'Admin Note Required',
        'Write a short reason in the admin note first. The requester will see it.',
        'warning'
      );

      return;
    }

    confirmAction(
      decision === 'remove'
        ? 'Remove Request'
        : 'Keep Request',

      decision === 'remove'
        ? `Take down this ${request.blood_type} request at ${request.facility_name}? It closes for everyone, donors with offers are told not to go, and the requester sees your note. All open reports on it are resolved.`
        : 'Keep this request up? It becomes visible to nearby donors again and all open reports on it are dismissed.',

      () =>
        applyRequestDecision(
          decision,
          request.id,
          note
        ),

      {
        variant:
          decision === 'remove'
            ? 'reject'
            : 'approve',

        confirmLabel:
          decision === 'remove'
            ? 'Remove Request'
            : 'Keep Request',
      }
    );
  }

  async function applyRequestDecision(
    decision: 'remove' | 'keep',
    requestId: string,
    note: string
  ) {
    try {
      setSubmitting(true);

      const token =
        await getAdminAccessToken();

      if (!token) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      if (decision === 'remove') {
        await removeAdminBloodRequest(
          token,
          requestId,
          note
        );
      } else {
        await keepAdminBloodRequest(
          token,
          requestId,
          note
        );
      }

      await loadIssue();

      showMessage(
        decision === 'remove'
          ? 'Request Removed'
          : 'Request Kept',

        decision === 'remove'
          ? 'The request was taken down and the reports on it were resolved.'
          : 'The request is visible again and the reports on it were dismissed.',

        'success'
      );
    } catch (decisionError) {
      showMessage(
        'Unable to Update Request',

        decisionError instanceof Error
          ? decisionError.message
          : 'Please try again.',

        'error'
      );
    } finally {
      setSubmitting(false);
    }
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

            {loading && !report ? (
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
                  Loading issue...
                </Text>
              </View>
            ) : error && !report ? (
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
                  Unable to Load Issue
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
                      Back to Issues
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={loadIssue}
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
            ) : report ? (
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
                    Issues
                  </Text>
                </Pressable>

                {/* ==================================================
                    ISSUE SUMMARY
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
                          styles.issueAvatar,

                          {
                            width: 66 * s,
                            height: 66 * s,
                            borderRadius: 33 * s,
                            marginRight: 17 * s,
                          },

                          isReport
                            ? styles.issueAvatarReport
                            : styles.issueAvatarFeedback,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            isReport
                              ? 'flag'
                              : 'chat-bubble-outline'
                          }
                          size={30 * s}
                          color={
                            isReport
                              ? COLORS.redBright
                              : COLORS.blue
                          }
                        />
                      </View>

                      <View style={styles.flexFill}>
                        <Text
                          style={[
                            styles.issueTitle,

                            {
                              fontSize: 23 * fs,
                            },
                          ]}
                        >
                          {isReport
                            ? `Report • ${report.reason || 'No reason'}`
                            : 'User Feedback'}
                        </Text>

                        <Text
                          style={[
                            styles.issueSubtitle,

                            {
                              fontSize: 13 * fs,
                              marginTop: 3 * s,
                            },
                          ]}
                        >
                          From{' '}
                          {getPersonName(
                            report.reporter,
                            report.reporter_email
                          )}{' '}
                          about{' '}
                          {getPersonName(
                            report.reported_user,
                            report.reported_user_email
                          )}
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
                          Submitted{' '}
                          {formatDateTime(
                            report.created_at
                          )}
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
                      <KindBadge
                        isReport={isReport}
                        scale={s}
                        fontScale={fs}
                      />

                      <StatusBadge
                        status={report.status}
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
                    {/* DETAILS */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon={
                        isReport
                          ? 'report-problem'
                          : 'rate-review'
                      }
                      title={
                        isReport
                          ? 'Report Details'
                          : 'Feedback Details'
                      }
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Type"
                          value={
                            isReport
                              ? 'Report'
                              : 'Feedback'
                          }
                          highlight={isReport}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Reason"
                          value={
                            isReport
                              ? report.reason || '—'
                              : 'Not applicable'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Submitted"
                          value={formatDateTime(
                            report.created_at
                          )}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Source"
                          value={
                            isRequestReport
                              ? 'Blood request page'
                              : 'Donation coordination chat'
                          }
                        />

                        {report.reason ===
                        'No-show' ? (
                          <InfoItem
                            fontScale={fs}
                            label="No-shows by This User"
                            value={String(
                              report.reported_user_no_show_count ||
                                1
                            )}
                            highlight={
                              (report.reported_user_no_show_count ||
                                0) > 1
                            }
                          />
                        ) : null}

                        {isRequestReport ? (
                          <InfoItem
                            fontScale={fs}
                            label="Open Reports on Request"
                            value={String(
                              report.request_report_count ||
                                0
                            )}
                            highlight={
                              (report.request_report_count ||
                                0) > 1
                            }
                          />
                        ) : null}
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
                        {isReport
                          ? 'DETAILS FROM REPORTER'
                          : 'FEEDBACK MESSAGE'}
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
                            report.details
                              ? styles.messageText
                              : styles.mutedText,

                            {
                              fontSize: 13.5 * fs,
                              lineHeight: 21 * fs,
                            },
                          ]}
                        >
                          {report.details ||
                            'The reporter did not add any details.'}
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
                          label="SUBMITTED BY"
                          user={report.reporter}
                          fallbackEmail={
                            report.reporter_email
                          }
                          scale={s}
                          fontScale={fs}
                          onView={() =>
                            openUser(
                              report.reporter?.id
                            )
                          }
                        />

                        <PersonPanel
                          label={
                            isReport
                              ? 'REPORTED USER'
                              : 'FEEDBACK ABOUT'
                          }
                          user={report.reported_user}
                          fallbackEmail={
                            report.reported_user_email
                          }
                          scale={s}
                          fontScale={fs}
                          reportCount={
                            report.reported_user_report_count
                          }
                          onView={() =>
                            openUser(
                              report.reported_user?.id
                            )
                          }
                        />
                      </View>
                    </SectionCard>

                    {/* RELATED REQUEST */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="bloodtype"
                      title="Related Blood Request"
                    >
                      {report.request ? (
                        <InfoGrid>
                          <InfoItem
                            fontScale={fs}
                            label="Blood Type"
                            value={
                              report.request.blood_type
                            }
                            highlight
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Units Needed"
                            value={String(
                              report.request.units_needed
                            )}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Facility"
                            value={
                              report.request.facility_name ||
                              '—'
                            }
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Urgency"
                            value={formatValue(
                              report.request.urgency
                            )}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Request Status"
                            value={formatValue(
                              report.request.status
                            )}
                            positive={
                              report.request.status ===
                              'fulfilled'
                            }
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Created"
                            value={formatDateTime(
                              report.request.created_at
                            )}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Visibility"
                            value={
                              report.request.removed_at
                                ? 'Removed by admin'
                                : report.request.flagged_at
                                  ? 'Hidden (under review)'
                                  : 'Visible to donors'
                            }
                            highlight={Boolean(
                              report.request.removed_at ||
                                report.request.flagged_at
                            )}
                          />

                          {report.request.removal_reason ? (
                            <InfoItem
                              fontScale={fs}
                              label="Removal Reason"
                              value={
                                report.request.removal_reason
                              }
                            />
                          ) : null}
                        </InfoGrid>
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
                    {/* ADMIN REVIEW */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="fact-check"
                      title="Admin Review"
                    >
                      <Text
                        style={[
                          styles.noteLabel,

                          {
                            fontSize: 11 * fs,
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
                        placeholder="Describe what was checked and any action taken..."
                        placeholderTextColor={COLORS.muted}
                        style={[
                          styles.noteInput,

                          {
                            minHeight: 130 * s,
                            borderRadius: 11 * s,
                            padding: 14 * s,
                            fontSize: 13 * fs,
                            lineHeight: 20 * fs,
                          },
                        ]}
                      />

                      <View
                        style={[
                          styles.noteFooter,

                          {
                            marginTop: 8 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.noteCounter,

                            {
                              fontSize: 11 * fs,
                            },
                          ]}
                        >
                          {adminNote.length}/{MAX_NOTE_LENGTH}
                        </Text>

                        <Pressable
                          disabled={
                            !noteChanged ||
                            submitting
                          }
                          onPress={handleSaveNote}
                          style={({ pressed }) => [
                            styles.saveNoteButton,

                            {
                              height: 34 * s,
                              paddingHorizontal: 14 * s,
                              borderRadius: 8 * s,
                              gap: 6 * s,
                            },

                            (!noteChanged ||
                              submitting) &&
                              styles.disabledButton,

                            pressed &&
                              styles.buttonPressed,
                          ]}
                        >
                          <MaterialIcons
                            name="save"
                            size={16 * s}
                            color={COLORS.soft}
                          />

                          <Text
                            style={[
                              styles.saveNoteText,

                              {
                                fontSize: 12 * fs,
                              },
                            ]}
                          >
                            Save Note
                          </Text>
                        </Pressable>
                      </View>

                      {/* REPORTED REQUEST: REMOVE OR KEEP */}

                      {canDecideRequest &&
                      report.request ? (
                        <View
                          style={[
                            styles.requestDecision,

                            {
                              marginTop: 18 * s,
                              padding: 14 * s,
                              borderRadius: 10 * s,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.row,

                              {
                                gap: 8 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                report.request.flagged_at
                                  ? 'visibility-off'
                                  : 'outlined-flag'
                              }
                              size={19 * s}
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
                              Reported Request
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.reviewedDate,

                              {
                                fontSize: 11.5 * fs,
                                lineHeight: 17 * fs,
                                marginTop: 6 * s,
                              },
                            ]}
                          >
                            {report.request.flagged_at
                              ? `Hidden from nearby donors after ${report.request_report_count || 0} reports. `
                              : `${report.request_report_count || 0} open report${(report.request_report_count || 0) === 1 ? '' : 's'} on this request. `}
                            Decide if it stays up. Removing needs an admin note; the requester sees it.
                          </Text>

                          <View
                            style={[
                              styles.row,

                              {
                                gap: 10 * s,
                                marginTop: 12 * s,
                              },
                            ]}
                          >
                            <ActionButton
                              label="Keep Request"
                              icon="visibility"
                              tone="outline"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              onPress={() =>
                                handleRequestDecision(
                                  'keep'
                                )
                              }
                              style={styles.flexFill}
                            />

                            <ActionButton
                              label="Remove Request"
                              icon="block"
                              tone="danger"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              onPress={() =>
                                handleRequestDecision(
                                  'remove'
                                )
                              }
                              style={styles.flexFill}
                            />
                          </View>
                        </View>
                      ) : null}

                      {/* STATUS ACTIONS */}

                      {isClosed ? (
                        <>
                          <View
                            style={[
                              styles.reviewedPanel,

                              {
                                marginTop: 18 * s,
                                padding: 14 * s,
                                borderRadius: 10 * s,
                                gap: 10 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                report.status ===
                                'resolved'
                                  ? 'check-circle'
                                  : 'do-not-disturb-on'
                              }
                              size={21 * s}
                              color={
                                report.status ===
                                'resolved'
                                  ? COLORS.green
                                  : COLORS.muted
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
                                Issue{' '}
                                {formatValue(
                                  report.status
                                )}
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
                                {formatDateTime(
                                  report.reviewed_at
                                )}
                                {report.reviewer
                                  ? ` • by ${getPersonName(
                                      report.reviewer,
                                      report.reviewer.email
                                    )}`
                                  : ''}
                              </Text>
                            </View>
                          </View>

                          <ActionButton
                            label="Reopen Issue"
                            icon="undo"
                            tone="outline"
                            scale={s}
                            fontScale={fs}
                            disabled={submitting}
                            onPress={() =>
                              handleStatusChange('open')
                            }
                            style={{
                              marginTop: 12 * s,
                            }}
                          />
                        </>
                      ) : (
                        <>
                          {report.status === 'open' ? (
                            <ActionButton
                              label="Start Review"
                              icon="manage-search"
                              tone="warning"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              onPress={() =>
                                handleStatusChange(
                                  'in_review'
                                )
                              }
                              style={{
                                marginTop: 18 * s,
                              }}
                            />
                          ) : null}

                          <View
                            style={[
                              styles.row,

                              {
                                gap: 10 * s,
                                marginTop:
                                  (report.status === 'open'
                                    ? 10
                                    : 18) * s,
                              },
                            ]}
                          >
                            <ActionButton
                              label="Dismiss"
                              icon="close"
                              tone="danger"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              onPress={() =>
                                handleStatusChange(
                                  'dismissed'
                                )
                              }
                              style={styles.flexFill}
                            />

                            <ActionButton
                              label="Resolve"
                              icon="check"
                              tone="primary"
                              scale={s}
                              fontScale={fs}
                              disabled={submitting}
                              loading={submitting}
                              onPress={() =>
                                handleStatusChange(
                                  'resolved'
                                )
                              }
                              style={styles.flexFill}
                            />
                          </View>

                          {isReport ? (
                            <Text
                              style={[
                                styles.hintText,

                                {
                                  fontSize: 11 * fs,
                                  lineHeight: 16 * fs,
                                  marginTop: 10 * s,
                                },
                              ]}
                            >
                              An admin note is required to resolve or dismiss a report.
                            </Text>
                          ) : null}
                        </>
                      )}
                    </SectionCard>

                    {/* TIMELINE */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="history"
                      title="Review History"
                    >
                      <TimelineItem
                        scale={s}
                        fontScale={fs}
                        icon="add-circle-outline"
                        label="Submitted"
                        value={formatDateTime(
                          report.created_at
                        )}
                      />

                      <TimelineItem
                        scale={s}
                        fontScale={fs}
                        icon="person-search"
                        label="Last reviewed by"
                        value={
                          report.reviewer
                            ? getPersonName(
                                report.reviewer,
                                report.reviewer.email
                              )
                            : 'Not reviewed yet'
                        }
                      />

                      <TimelineItem
                        scale={s}
                        fontScale={fs}
                        icon="event-available"
                        label="Last status change"
                        value={formatDateTime(
                          report.reviewed_at
                        )}
                      />

                      <TimelineItem
                        scale={s}
                        fontScale={fs}
                        icon="update"
                        label="Last updated"
                        value={formatDateTime(
                          report.updated_at
                        )}
                        last
                      />
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
  tone: 'primary' | 'danger' | 'warning' | 'outline';
  scale: number;
  fontScale: number;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const toneStyle =
    tone === 'primary'
      ? styles.primaryAction
      : tone === 'danger'
        ? styles.dangerAction
        : tone === 'warning'
          ? styles.warningAction
          : styles.outlineAction;

  const color =
    tone === 'primary'
      ? COLORS.white
      : tone === 'danger'
        ? COLORS.redBright
        : tone === 'warning'
          ? COLORS.orange
          : COLORS.soft;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        toneStyle,

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
// PERSON PANEL
// ============================================================

function PersonPanel({
  label,
  user,
  fallbackEmail,
  scale,
  fontScale,
  reportCount,
  onView,
}: {
  label: string;
  user?: AdminReportUser | null;
  fallbackEmail?: string | null;
  scale: number;
  fontScale: number;
  reportCount?: number;
  onView: () => void;
}) {
  const name =
    getPersonName(
      user,
      fallbackEmail
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
              fallbackEmail ||
              'No email'}
          </Text>
        </View>
      </View>

      {user ? (
        <View
          style={{
            marginTop: 14 * scale,
            gap: 8 * scale,
          }}
        >
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

          <PersonDetail
            fontScale={fontScale}
            label="Account"
            value={
              user.is_active === false
                ? 'Inactive'
                : 'Active'
            }
            valueColor={
              user.is_active === false
                ? COLORS.redBright
                : COLORS.green
            }
          />
        </View>
      ) : (
        <Text
          style={[
            styles.mutedText,

            {
              fontSize: 12 * fontScale,
              lineHeight: 18 * fontScale,
              marginTop: 12 * scale,
            },
          ]}
        >
          This account has been deleted. The email shown was saved when the issue was submitted.
        </Text>
      )}

      {typeof reportCount === 'number' &&
      reportCount > 1 ? (
        <View
          style={[
            styles.repeatWarning,

            {
              marginTop: 14 * scale,
              paddingVertical: 8 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 8 * scale,
              gap: 6 * scale,
            },
          ]}
        >
          <MaterialIcons
            name="warning-amber"
            size={16 * scale}
            color={COLORS.orange}
          />

          <Text
            style={[
              styles.repeatWarningText,

              {
                fontSize: 11.5 * fontScale,
              },
            ]}
          >
            {reportCount} reports have been filed against this user
          </Text>
        </View>
      ) : null}

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
// TIMELINE ITEM
// ============================================================

function TimelineItem({
  scale,
  fontScale,
  icon,
  label,
  value,
  last = false,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.timelineItem,

        {
          paddingVertical: 11 * scale,
          gap: 11 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      <View
        style={[
          styles.timelineIcon,

          {
            width: 32 * scale,
            height: 32 * scale,
            borderRadius: 9 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={17 * scale}
          color={COLORS.soft}
        />
      </View>

      <View style={styles.flexFill}>
        <Text
          style={[
            styles.infoLabel,

            {
              fontSize: 10.5 * fontScale,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.infoValue,

            {
              fontSize: 13 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {value}
        </Text>
      </View>
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
// BADGES
// ============================================================

function KindBadge({
  isReport,
  scale,
  fontScale,
}: {
  isReport: boolean;
  scale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.statusBadge,

        {
          height: 38 * scale,
          minWidth: 100 * scale,
          borderRadius: 8 * scale,
          paddingHorizontal: 13 * scale,
          gap: 6 * scale,
        },

        isReport
          ? styles.kindReport
          : styles.kindFeedback,
      ]}
    >
      <MaterialIcons
        name={
          isReport
            ? 'flag'
            : 'chat-bubble-outline'
        }
        size={15 * scale}
        color={
          isReport
            ? COLORS.redBright
            : COLORS.blue
        }
      />

      <Text
        style={[
          styles.statusBadgeText,

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
  );
}

function StatusBadge({
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
        styles.statusBadge,

        {
          height: 38 * scale,
          minWidth: 105 * scale,
          borderRadius: 8 * scale,
          paddingHorizontal: 13 * scale,
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,

          {
            fontSize: 12 * fontScale,
            color: palette.color,
          },
        ]}
      >
        {formatValue(status)}
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
        color: COLORS.redBright,
        border: 'rgba(239,51,64,0.50)',
        background: 'rgba(239,51,64,0.12)',
      };

    case 'in_review':
      return {
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'resolved':
      return {
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    default:
      return {
        color: COLORS.muted,
        border: 'rgba(127,136,159,0.45)',
        background: 'rgba(127,136,159,0.10)',
      };
  }
}

function getPersonName(
  user?: AdminReportUser | null,
  fallbackEmail?: string | null
) {
  if (!user) {
    return fallbackEmail
      ? `Deleted account (${fallbackEmail})`
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
    user.email ||
    'Hemo-Hero User'
  );
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
    return COLORS.green;
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

  issueAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  issueAvatarReport: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  issueAvatarFeedback: {
    borderColor: 'rgba(74,140,255,0.45)',
    backgroundColor: 'rgba(74,140,255,0.10)',
  },

  issueTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  issueSubtitle: {
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

  kindReport: {
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  kindFeedback: {
    borderColor: 'rgba(74,140,255,0.50)',
    backgroundColor: 'rgba(74,140,255,0.12)',
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

  repeatWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.40)',
    backgroundColor: 'rgba(243,163,74,0.10)',
  },

  repeatWarningText: {
    flex: 1,
    color: COLORS.orange,
    fontFamily: 'Inter_600SemiBold',
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

  // ADMIN REVIEW

  noteLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
  },

  noteInput: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
    outlineStyle: 'none',
  } as any,

  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  noteCounter: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  saveNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  saveNoteText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
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

  primaryAction: {
    backgroundColor: COLORS.red,
  },

  dangerAction: {
    borderWidth: 1,
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  warningAction: {
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.60)',
    backgroundColor: 'rgba(243,163,74,0.08)',
  },

  outlineAction: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  actionText: {
    fontFamily: 'Inter_600SemiBold',
  },

  reviewedPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  requestDecision: {
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.35)',
    backgroundColor: 'rgba(243,163,74,0.08)',
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

  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  timelineIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
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
