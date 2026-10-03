import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
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

import AdminHeader from '../../components/AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  approveDonorApplication,
  getAdminDonorApplicationById,
  rejectDonorApplication,
  type AdminProfile,
  type DonorApplication,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

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
  redDark: '#8E1118',

  white: '#FFFFFF',

  muted: '#7F889F',
  soft: '#B7C1D8',

  green: '#35C982',
  orange: '#F3A34A',
  blue: '#4A8CFF',

  error: '#FF6D76',
};

// ============================================================
// MONTHS
// ============================================================

const MONTH_NAMES = [
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

  onConfirm?:
    () =>
      | void
      | Promise<void>;
};

const INITIAL_ACTION_MODAL:
  ActionModalState = {
    visible: false,

    title: '',

    message: '',

    variant: 'info',

    confirmLabel:
      'Continue',

    cancelLabel:
      'Cancel',

    showCancel:
      false,

    onConfirm:
      undefined,
  };

// ============================================================
// SCREEN
// ============================================================

export default function ApplicationReviewScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();


  // ==========================================================
  // RESPONSIVE IPAD CANVAS
  // ==========================================================

  const tablet =
    useAdminCanvas();

  // ==========================================================
  // SCALE
  // ==========================================================

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  const fs =
    Math.max(
      tablet.scale,
      0.92
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    application,
    setApplication,
  ] =
    useState<DonorApplication | null>(
      null
    );

  const [
    adminNote,
    setAdminNote,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    actionModal,
    setActionModal,
  ] =
    useState<ActionModalState>(
      INITIAL_ACTION_MODAL
    );

  // ==========================================================
  // LOAD APPLICATION
  // ==========================================================

  const loadApplication =
    useCallback(
      async () => {
        if (!id) {
          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ''
          );

          const token =
            await getAdminAccessToken();

          const storedProfile =
            await getAdminProfile();

          if (
            !token ||
            storedProfile?.role !==
              'admin'
          ) {
            await clearAdminSession();

            router.replace(
              '/'
            );

            return;
          }

          setProfile(
            storedProfile
          );

          const result =
            await getAdminDonorApplicationById(
              token,
              id
            );

          setApplication(
            result.application
          );

          setAdminNote(
            result.application
              ?.admin_note ||
              ''
          );
        } catch (
          loadError
        ) {
          console.log(
            'ADMIN APPLICATION DETAIL ERROR:',
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Unable to load donor application.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        id,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadApplication();
      },
      [
        loadApplication,
      ]
    )
  );

  // ==========================================================
  // APPLICANT
  // ==========================================================

  const user =
    application?.user;

  const applicantName =
    [
      user?.first_name,
      user?.middle_name,
      user?.last_name,
      user?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim() ||
    'Applicant';

  const applicantInitials =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .map(
        value =>
          String(
            value
          )
            .charAt(0)
            .toUpperCase()
      )
      .join('') ||
    'A';

  // ==========================================================
  // WAITING TIME (pending only)
  // ==========================================================

  const submittedTime =
    new Date(
      application?.submitted_at ||
        application?.created_at ||
        ''
    ).getTime();

  const waitingDays =
    application?.status ===
      'pending' &&
    !Number.isNaN(
      submittedTime
    )
      ? Math.max(
          0,
          Math.floor(
            (Date.now() -
              submittedTime) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null;

  // ==========================================================
  // CUSTOM ACTION MODAL
  // ==========================================================

  function closeActionModal() {
    setActionModal(
      INITIAL_ACTION_MODAL
    );
  }

  function confirmAction(
    title: string,
    message: string,
    onConfirm:
      () =>
        | void
        | Promise<void>,
    options?: {
      variant?:
        ActionModalVariant;

      confirmLabel?:
        string;

      cancelLabel?:
        string;
    }
  ) {
    setActionModal({
      visible:
        true,

      title,

      message,

      variant:
        options
          ?.variant ||
        'info',

      confirmLabel:
        options
          ?.confirmLabel ||
        'Continue',

      cancelLabel:
        options
          ?.cancelLabel ||
        'Cancel',

      showCancel:
        true,

      onConfirm,
    });
  }

  function showMessage(
    title: string,
    message: string,
    variant:
      ActionModalVariant =
        'info'
  ) {
    setActionModal({
      visible:
        true,

      title,

      message,

      variant,

      confirmLabel:
        'Continue',

      cancelLabel:
        'Cancel',

      showCancel:
        false,

      onConfirm:
        undefined,
    });
  }

  function handleActionModalConfirm() {
    const action =
      actionModal.onConfirm;

    closeActionModal();

    if (
      action
    ) {
      void action();
    }
  }

  // ==========================================================
  // BLOOD TYPE PROOF
  // ==========================================================

  async function handleViewBloodTypeProof() {
    const url =
      application
        ?.blood_type_proof
        ?.url;

    if (!url) {
      showMessage(
        'Blood Type Proof',
        'No blood type proof is on file for this applicant.',
        'info'
      );

      return;
    }

    try {
      await Linking.openURL(
        url
      );
    } catch (
      viewError
    ) {
      console.log(
        'OPEN BLOOD TYPE PROOF ERROR:',
        viewError
      );

      showMessage(
        'Unable to Open Proof',
        'Unable to open the blood type proof.',
        'error'
      );
    }
  }

  // ==========================================================
  // GOVERNMENT ID
  // ==========================================================

  async function handleViewId() {
    const url =
      application
        ?.verification
        ?.url;

    if (
      !url
    ) {
      showMessage(
        'Government ID',
        'A verification document is not currently available.',
        'info'
      );

      return;
    }

    try {
      const supported =
        await Linking.canOpenURL(
          url
        );

      if (
        !supported
      ) {
        throw new Error(
          'Unable to open the verification document.'
        );
      }

      await Linking.openURL(
        url
      );
    } catch (
      viewError
    ) {
      console.log(
        'OPEN VERIFICATION ID ERROR:',
        viewError
      );

      showMessage(
        'Unable to Open ID',
        viewError instanceof
          Error
          ? viewError.message
          : 'Unable to open the verification document.',
        'error'
      );
    }
  }

  // ==========================================================
  // APPROVE
  // ==========================================================

  function handleApprove() {
    if (
      !application ||
      submitting
    ) {
      return;
    }

    confirmAction(
      'Approve Donor Application',
      `Approve ${applicantName} as a verified Hemo-Hero donor?`,
      performApprove,
      {
        variant:
          'approve',

        confirmLabel:
          'Approve',
      }
    );
  }

  async function performApprove() {
    if (
      !application
    ) {
      return;
    }

    try {
      setSubmitting(
        true
      );

      const token =
        await getAdminAccessToken();

      if (
        !token
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      await approveDonorApplication(
        token,
        application.id,
        adminNote
      );

      await loadApplication();

      showMessage(
        'Application Approved',
        `${applicantName} is now a verified donor.`,
        'success'
      );
    } catch (
      approveError
    ) {
      console.log(
        'APPROVE DONOR ERROR:',
        approveError
      );

      showMessage(
        'Unable to Approve',
        approveError instanceof
          Error
          ? approveError.message
          : 'Unable to approve the donor application.',
        'error'
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ==========================================================
  // REJECT
  // ==========================================================

  function handleReject() {
    if (
      !application ||
      submitting
    ) {
      return;
    }

    if (
      !adminNote.trim()
    ) {
      showMessage(
        'Reason Required',
        'Enter an admin note explaining why this application is being rejected.',
        'warning'
      );

      return;
    }

    confirmAction(
      'Reject Donor Application',
      `Reject ${applicantName}'s donor application?`,
      performReject,
      {
        variant:
          'reject',

        confirmLabel:
          'Reject',
      }
    );
  }

  async function performReject() {
    if (
      !application
    ) {
      return;
    }

    try {
      setSubmitting(
        true
      );

      const token =
        await getAdminAccessToken();

      if (
        !token
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      await rejectDonorApplication(
        token,
        application.id,
        adminNote
      );

      await loadApplication();

      showMessage(
        'Application Rejected',
        `${applicantName}'s donor application has been rejected.`,
        'success'
      );
    } catch (
      rejectError
    ) {
      console.log(
        'REJECT DONOR ERROR:',
        rejectError
      );

      showMessage(
        'Unable to Reject',
        rejectError instanceof
          Error
          ? rejectError.message
          : 'Unable to reject the donor application.',
        'error'
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.outer
      }
    >
      <View
        style={[
          styles.ipadCanvas,

          {
            width:
              tablet.width,

            height:
              tablet.height,
          },

          Platform.OS !==
            'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar
          style="light"
        />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={
            styles.gradient
          }
        >
          <SafeAreaView
            style={
              styles.safeArea
            }
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <AdminHeader
              profile={profile}
              scale={s}
              fontScale={fs}
            />

            {/* ==================================================
                BODY
            ================================================== */}

            {loading ? (
              <View
                style={
                  styles.loadingArea
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    COLORS.redBright
                  }
                />

                <Text
                  style={[
                    styles.loadingText,

                    {
                      fontSize:
                        14 * fs,

                      marginTop:
                        14 * s,
                    },
                  ]}
                >
                  Loading donor application...
                </Text>
              </View>
            ) : error ? (
              <View
                style={
                  styles.loadingArea
                }
              >
                <MaterialIcons
                  name="error-outline"
                  size={
                    48 * s
                  }
                  color={
                    COLORS.redBright
                  }
                />

                <Text
                  style={[
                    styles.errorTitle,

                    {
                      fontSize:
                        20 * fs,

                      marginTop:
                        15 * s,
                    },
                  ]}
                >
                  Unable to Load Application
                </Text>

                <Text
                  style={[
                    styles.errorText,

                    {
                      fontSize:
                        13 * fs,

                      marginTop:
                        7 * s,
                    },
                  ]}
                >
                  {
                    error
                  }
                </Text>

                <Pressable
                  style={[
                    styles.retryButton,

                    {
                      marginTop:
                        20 * s,

                      height:
                        46 * s,

                      borderRadius:
                        9 * s,

                      paddingHorizontal:
                        18 * s,
                    },
                  ]}
                  onPress={
                    loadApplication
                  }
                >
                  <Text
                    style={[
                      styles.retryText,

                      {
                        fontSize:
                          13 * fs,
                      },
                    ]}
                  >
                    Try Again
                  </Text>
                </Pressable>
              </View>
            ) : application ? (
              <ScrollView
                style={
                  styles.scroll
                }
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal:
                      48 * s,

                    paddingTop:
                      30 * s,

                    paddingBottom:
                      50 * s,
                  },
                ]}
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* BACK */}

                <Pressable
                  style={[
                    styles.backButton,

                    {
                      gap:
                        7 * s,

                      marginBottom:
                        20 * s,
                    },
                  ]}
                  onPress={() =>
                    router.back()
                  }
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={
                      20 * s
                    }
                    color={
                      COLORS.soft
                    }
                  />

                  <Text
                    style={[
                      styles.backText,

                      {
                        fontSize:
                          13 * fs,
                      },
                    ]}
                  >
                    Donor Applications
                  </Text>
                </Pressable>

                {/* ==================================================
                    APPLICANT SUMMARY
                ================================================== */}

                <FadeInView>
                <View
                  style={[
                    styles.profileCard,

                    {
                      padding:
                        24 * s,

                      borderRadius:
                        16 * s,

                      marginBottom:
                        20 * s,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.profileMain
                    }
                  >
                    <View
                      style={[
                        styles.applicantAvatar,

                        {
                          width:
                            66 * s,

                          height:
                            66 * s,

                          borderRadius:
                            33 * s,

                          marginRight:
                            17 * s,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.applicantAvatarText,

                          {
                            fontSize:
                              19 * fs,
                          },
                        ]}
                      >
                        {
                          applicantInitials
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.profileNameArea
                      }
                    >
                      <Text
                        style={[
                          styles.applicantName,

                          {
                            fontSize:
                              23 * fs,
                          },
                        ]}
                      >
                        {
                          applicantName
                        }
                      </Text>

                      <Text
                        style={[
                          styles.applicantEmail,

                          {
                            fontSize:
                              13 * fs,

                            marginTop:
                              3 * s,
                          },
                        ]}
                      >
                        {user?.email ||
                          'Email unavailable'}
                      </Text>

                      <Text
                        style={[
                          styles.submittedText,

                          {
                            fontSize:
                              12 * fs,

                            marginTop:
                              6 * s,
                          },
                        ]}
                      >
                        Submitted{' '}
                        {formatDateTime(
                          application.submitted_at ||
                            application.created_at
                        )}

                        {waitingDays !== null ? (
                          <Text
                            style={
                              waitingDays >= 3
                                ? styles.waitingLong
                                : styles.waitingText
                            }
                          >
                            {'  •  '}
                            {waitingDays === 0
                              ? 'Submitted today'
                              : `Waiting ${waitingDays} ${
                                  waitingDays === 1
                                    ? 'day'
                                    : 'days'
                                }`}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.profileBadges
                    }
                  >
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/users/${application.user_id}` as any
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.viewUserButton,

                        {
                          height:
                            38 * s,

                          borderRadius:
                            8 * s,

                          paddingHorizontal:
                            13 * s,

                          gap:
                            6 * s,
                        },

                        pressed &&
                          styles.buttonPressed,
                      ]}
                    >
                      <MaterialIcons
                        name="person-search"
                        size={
                          17 * s
                        }
                        color={
                          COLORS.soft
                        }
                      />

                      <Text
                        style={[
                          styles.viewUserText,

                          {
                            fontSize:
                              12.5 * fs,
                          },
                        ]}
                      >
                        View User Account
                      </Text>
                    </Pressable>

                    <BloodBadge
                      value={
                        application.blood_type
                      }
                      scale={s}
                      fontScale={fs}
                    />

                    <StatusBadge
                      status={
                        application.status
                      }
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
                      gap:
                        18 * s,
                    },
                  ]}
                >
                  {/* ==================================================
                      LEFT COLUMN
                  ================================================== */}

                  <FadeInView
                    delay={60}
                    style={
                      styles.leftColumn
                    }
                  >
                    {/* PERSONAL INFORMATION */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="person-outline"
                      title="Personal Information"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Full Name"
                          value={
                            applicantName
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Email Address"
                          value={
                            user?.email ||
                            '—'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Phone Number"
                          value={
                            user?.phone ||
                            '—'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Date of Birth"
                          value={
                            formatDate(
                              user?.date_of_birth
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Gender"
                          value={
                            formatValue(
                              user?.gender
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Location"
                          value={
                            formatLocation(
                              user?.city,
                              user?.province
                            )
                          }
                        />
                      </InfoGrid>
                    </SectionCard>

                    {/* BLOOD INFORMATION */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="bloodtype"
                      title="Blood Information"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Blood Type"
                          value={
                            application.blood_type
                          }
                          highlight
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Previous Donor"
                          value={
                            application.has_donated_before
                              ? 'Yes'
                              : 'No — First-time donor'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Last Donation"
                          value={
                            formatDonationHistory(
                              application
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Last Donation Facility"
                          value={
                            application.has_donated_before
                              ? application.last_donation_facility ||
                                'Not provided'
                              : 'Not applicable'
                          }
                        />
                      </InfoGrid>
                    </SectionCard>

                    {/* LOCATION + AVAILABILITY */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="location-on"
                      title="Location & Availability"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Availability"
                          value={
                            application.availability_status ===
                            'available'
                              ? 'Available'
                              : 'Unavailable'
                          }
                          positive={
                            application.availability_status ===
                            'available'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Travel Radius"
                          value={`${application.travel_radius_km} km`}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Urgent Requests"
                          value={
                            application.allow_urgent_requests
                              ? 'Allowed'
                              : 'Not allowed'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Consent Confirmed"
                          value={
                            application.consent_confirmed
                              ? 'Yes'
                              : 'No'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Latitude"
                          value={
                            formatCoordinate(
                              application.current_latitude
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Longitude"
                          value={
                            formatCoordinate(
                              application.current_longitude
                            )
                          }
                        />
                      </InfoGrid>
                    </SectionCard>
                  </FadeInView>

                  {/* ==================================================
                      RIGHT COLUMN
                  ================================================== */}

                  <FadeInView
                    delay={120}
                    style={
                      styles.rightColumn
                    }
                  >
                    {/* IDENTITY VERIFICATION */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="badge"
                      title="Verification Documents"
                    >
                      <View
                        style={[
                          styles.verificationPanel,

                          {
                            padding:
                              18 * s,

                            borderRadius:
                              12 * s,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.verificationTop
                          }
                        >
                          <View
                            style={[
                              styles.verificationIcon,

                              {
                                width:
                                  44 * s,

                                height:
                                  44 * s,

                                borderRadius:
                                  11 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="credit-card"
                              size={
                                23 * s
                              }
                              color={
                                COLORS.redBright
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.verificationTextArea
                            }
                          >
                            <Text
                              style={[
                                styles.verificationTitle,

                                {
                                  fontSize:
                                    14 * fs,
                                },
                              ]}
                            >
                              Government ID
                            </Text>

                            <Text
                              style={[
                                styles.verificationDescription,

                                {
                                  fontSize:
                                    12 * fs,

                                  marginTop:
                                    3 * s,

                                  lineHeight:
                                    18 * fs,
                                },
                              ]}
                            >
                              Private verification document submitted by the applicant.
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          disabled={
                            !application
                              .verification
                              ?.available
                          }
                          onPress={
                            handleViewId
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.viewIdButton,

                            {
                              height:
                                46 * s,

                              borderRadius:
                                9 * s,

                              marginTop:
                                17 * s,
                            },

                            !application
                              .verification
                              ?.available &&
                              styles.disabledButton,

                            pressed &&
                              application
                                .verification
                                ?.available &&
                              styles.buttonPressed,
                          ]}
                        >
                          <MaterialIcons
                            name="open-in-new"
                            size={
                              18 * s
                            }
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={[
                              styles.viewIdText,

                              {
                                fontSize:
                                  13 * fs,
                              },
                            ]}
                          >
                            {application
                              .verification
                              ?.available
                              ? 'View Government ID'
                              : 'ID Unavailable'}
                          </Text>
                        </Pressable>

                        {application
                          .verification
                          ?.available ? (
                          <Text
                            style={[
                              styles.expiryText,

                              {
                                fontSize:
                                  11 * fs,

                                lineHeight:
                                  16 * fs,

                                marginTop:
                                  9 * s,
                              },
                            ]}
                          >
                            For security, this private link expires after 5 minutes.
                          </Text>
                        ) : null}
                      </View>

                      {/* BLOOD TYPE PROOF */}

                      <View
                        style={[
                          styles.verificationPanel,

                          {
                            padding:
                              18 * s,

                            borderRadius:
                              12 * s,

                            marginTop:
                              14 * s,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.verificationTop
                          }
                        >
                          <View
                            style={[
                              styles.verificationIcon,

                              {
                                width:
                                  44 * s,

                                height:
                                  44 * s,

                                borderRadius:
                                  11 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="bloodtype"
                              size={
                                23 * s
                              }
                              color={
                                COLORS.redBright
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.verificationTextArea
                            }
                          >
                            <Text
                              style={[
                                styles.verificationTitle,

                                {
                                  fontSize:
                                    14 * fs,
                                },
                              ]}
                            >
                              Blood Type Proof
                            </Text>

                            <Text
                              style={[
                                styles.verificationDescription,

                                {
                                  fontSize:
                                    12 * fs,

                                  marginTop:
                                    3 * s,

                                  lineHeight:
                                    18 * fs,
                                },
                              ]}
                            >
                              {application
                                .blood_type_proof
                                ?.available
                                ? `Blood donor card, blood typing or lab result showing ${application.blood_type}. Check it matches before approving.`
                                : 'No proof on file. This applicant applied before proof was required.'}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          disabled={
                            !application
                              .blood_type_proof
                              ?.available
                          }
                          onPress={
                            handleViewBloodTypeProof
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.viewIdButton,

                            {
                              height:
                                46 * s,

                              borderRadius:
                                9 * s,

                              marginTop:
                                17 * s,
                            },

                            !application
                              .blood_type_proof
                              ?.available &&
                              styles.disabledButton,

                            pressed &&
                              application
                                .blood_type_proof
                                ?.available &&
                              styles.buttonPressed,
                          ]}
                        >
                          <MaterialIcons
                            name="open-in-new"
                            size={
                              18 * s
                            }
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={[
                              styles.viewIdText,

                              {
                                fontSize:
                                  13 * fs,
                              },
                            ]}
                          >
                            {application
                              .blood_type_proof
                              ?.available
                              ? 'View Blood Type Proof'
                              : 'No Proof on File'}
                          </Text>
                        </Pressable>
                      </View>
                    </SectionCard>

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
                            fontSize:
                              11 * fs,

                            marginBottom:
                              8 * s,
                          },
                        ]}
                      >
                        ADMIN NOTE
                      </Text>

                      <TextInput
                        value={
                          adminNote
                        }
                        onChangeText={
                          setAdminNote
                        }
                        editable={
                          application.status ===
                            'pending' &&
                          !submitting
                        }
                        multiline
                        textAlignVertical="top"
                        maxLength={
                          500
                        }
                        placeholder={
                          application.status ===
                          'pending'
                            ? 'Add a note about this donor application...'
                            : 'No admin note.'
                        }
                        placeholderTextColor={
                          COLORS.muted
                        }
                        style={[
                          styles.noteInput,

                          {
                            minHeight:
                              130 * s,

                            borderRadius:
                              11 * s,

                            padding:
                              14 * s,

                            fontSize:
                              13 * fs,

                            lineHeight:
                              20 * fs,
                          },

                          application.status !==
                            'pending' &&
                            styles.noteInputDisabled,
                        ]}
                      />

                      <Text
                        style={[
                          styles.noteCounter,

                          {
                            fontSize:
                              11 * fs,

                            marginTop:
                              6 * s,
                          },
                        ]}
                      >
                        {adminNote.length}/500
                      </Text>

                      {application.status ===
                      'pending' ? (
                        <View
                          style={[
                            styles.actionButtons,

                            {
                              gap:
                                10 * s,

                              marginTop:
                                18 * s,
                            },
                          ]}
                        >
                          <Pressable
                            disabled={
                              submitting
                            }
                            onPress={
                              handleReject
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.rejectButton,

                              {
                                height:
                                  48 * s,

                                borderRadius:
                                  10 * s,
                              },

                              submitting &&
                                styles.disabledButton,

                              pressed &&
                                !submitting &&
                                styles.buttonPressed,
                            ]}
                          >
                            <MaterialIcons
                              name="close"
                              size={
                                20 * s
                              }
                              color={
                                COLORS.redBright
                              }
                            />

                            <Text
                              style={[
                                styles.rejectText,

                                {
                                  fontSize:
                                    13 * fs,
                                },
                              ]}
                            >
                              Reject
                            </Text>
                          </Pressable>

                          <Pressable
                            disabled={
                              submitting
                            }
                            onPress={
                              handleApprove
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.approveButton,

                              {
                                height:
                                  48 * s,

                                borderRadius:
                                  10 * s,
                              },

                              submitting &&
                                styles.disabledButton,

                              pressed &&
                                !submitting &&
                                styles.buttonPressed,
                            ]}
                          >
                            {submitting ? (
                              <ActivityIndicator
                                color={
                                  COLORS.white
                                }
                              />
                            ) : (
                              <>
                                <MaterialIcons
                                  name="check"
                                  size={
                                    20 * s
                                  }
                                  color={
                                    COLORS.white
                                  }
                                />

                                <Text
                                  style={[
                                    styles.approveText,

                                    {
                                      fontSize:
                                        13 * fs,
                                    },
                                  ]}
                                >
                                  Approve
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.reviewedPanel,

                            {
                              marginTop:
                                18 * s,

                              padding:
                                14 * s,

                              borderRadius:
                                10 * s,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              application.status ===
                              'approved'
                                ? 'verified'
                                : application.status ===
                                    'rejected'
                                  ? 'cancel'
                                  : 'info'
                            }
                            size={
                              21 * s
                            }
                            color={
                              application.status ===
                              'approved'
                                ? COLORS.green
                                : application.status ===
                                    'rejected'
                                  ? COLORS.redBright
                                  : COLORS.muted
                            }
                          />

                          <View
                            style={
                              styles.reviewedTextArea
                            }
                          >
                            <Text
                              style={[
                                styles.reviewedTitle,

                                {
                                  fontSize:
                                    13 * fs,
                                },
                              ]}
                            >
                              Application{' '}
                              {formatValue(
                                application.status
                              )}
                            </Text>

                            <Text
                              style={[
                                styles.reviewedDate,

                                {
                                  fontSize:
                                    11 * fs,

                                  marginTop:
                                    2 * s,
                                },
                              ]}
                            >
                              Reviewed{' '}
                              {formatDateTime(
                                application.reviewed_at
                              )}
                            </Text>
                          </View>
                        </View>
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
        state={
          actionModal
        }
        scale={s}
        fontScale={fs}
        onClose={
          closeActionModal
        }
        onConfirm={
          handleActionModalConfirm
        }
      />
    </View>
  );
}

// ============================================================
// ACTION MODAL
// ============================================================

function ActionModal({
  state,
  scale,
  fontScale,
  onClose,
  onConfirm,
}: {
  state:
    ActionModalState;

  scale:
    number;

  fontScale:
    number;

  onClose:
    () => void;

  onConfirm:
    () => void;
}) {
  const accent =
    getActionModalAccent(
      state.variant
    );

  return (
    <Modal
      transparent
      visible={
        state.visible
      }
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.modalBackdrop
        }
      >
        <Pressable
          style={
            StyleSheet.absoluteFill
          }
          onPress={
            onClose
          }
        />

        <View
          style={[
            styles.modalCard,

            {
              width:
                500 * scale,

              maxWidth:
                '88%',

              borderRadius:
                18 * scale,

              padding:
                26 * scale,

              borderColor:
                accent,
            },
          ]}
        >
          <View
            style={[
              styles.modalIconWrap,

              {
                width:
                  56 * scale,

                height:
                  56 * scale,

                borderRadius:
                  28 * scale,

                backgroundColor:
                  getActionModalTint(
                    state.variant
                  ),
              },
            ]}
          >
            <MaterialIcons
              name={
                getActionModalIcon(
                  state.variant
                )
              }
              size={
                29 * scale
              }
              color={
                accent
              }
            />
          </View>

          <Text
            style={[
              styles.modalTitle,

              {
                fontSize:
                  20 * fontScale,

                lineHeight:
                  27 * fontScale,

                marginTop:
                  17 * scale,
              },
            ]}
          >
            {
              state.title
            }
          </Text>

          <Text
            style={[
              styles.modalMessage,

              {
                fontSize:
                  14 * fontScale,

                lineHeight:
                  22 * fontScale,

                marginTop:
                  8 * scale,
              },
            ]}
          >
            {
              state.message
            }
          </Text>

          <View
            style={[
              styles.modalActions,

              {
                gap:
                  10 * scale,

                marginTop:
                  24 * scale,
              },
            ]}
          >
            {state.showCancel ? (
              <Pressable
                onPress={
                  onClose
                }
                style={({
                  pressed,
                }) => [
                  styles.modalCancelButton,

                  {
                    height:
                      48 * scale,

                    borderRadius:
                      10 * scale,
                  },

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,

                    {
                      fontSize:
                        13 * fontScale,
                    },
                  ]}
                >
                  {
                    state.cancelLabel
                  }
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={
                onConfirm
              }
              style={({
                pressed,
              }) => [
                styles.modalPrimaryButton,

                {
                  height:
                    48 * scale,

                  borderRadius:
                    10 * scale,

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
                    fontSize:
                      13 * fontScale,
                  },
                ]}
              >
                {
                  state.confirmLabel
                }
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
  scale:
    number;

  fontScale:
    number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  title:
    string;

  children:
    ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          padding:
            21 * scale,

          borderRadius:
            15 * scale,

          marginBottom:
            18 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            gap:
              9 * scale,

            marginBottom:
              19 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width:
                38 * scale,

              height:
                38 * scale,

              borderRadius:
                10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              icon
            }
            size={
              21 * scale
            }
            color={
              COLORS.redBright
            }
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,

            {
              fontSize:
                16 * fontScale,
            },
          ]}
        >
          {
            title
          }
        </Text>
      </View>

      {
        children
      }
    </View>
  );
}

// ============================================================
// INFO GRID
// ============================================================

function InfoGrid({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <View
      style={
        styles.infoGrid
      }
    >
      {
        children
      }
    </View>
  );
}

// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  fontScale,
  label,
  value,
  highlight = false,
  positive = false,
}: {
  fontScale:
    number;

  label:
    string;

  value:
    string;

  highlight?:
    boolean;

  positive?:
    boolean;
}) {
  return (
    <View
      style={
        styles.infoItem
      }
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize:
              11 * fontScale,
          },
        ]}
      >
        {
          label
        }
      </Text>

      <Text
        numberOfLines={
          2
        }
        style={[
          styles.infoValue,

          {
            fontSize:
              13 * fontScale,

            marginTop:
              4,

            lineHeight:
              19 * fontScale,
          },

          highlight &&
            styles.infoHighlight,

          positive &&
            styles.infoPositive,
        ]}
      >
        {
          value
        }
      </Text>
    </View>
  );
}

// ============================================================
// BLOOD BADGE
// ============================================================

function BloodBadge({
  value,
  scale,
  fontScale,
}: {
  value:
    string;

  scale:
    number;

  fontScale:
    number;
}) {
  return (
    <View
      style={[
        styles.bloodBadge,

        {
          height:
            38 * scale,

          minWidth:
            58 * scale,

          borderRadius:
            8 * scale,

          paddingHorizontal:
            13 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.bloodBadgeText,

          {
            fontSize:
              13 * fontScale,
          },
        ]}
      >
        {
          value
        }
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
  status:
    string;

  scale:
    number;

  fontScale:
    number;
}) {
  const normalized =
    String(
      status
    )
      .toLowerCase();

  return (
    <View
      style={[
        styles.statusBadge,

        {
          height:
            38 * scale,

          minWidth:
            105 * scale,

          borderRadius:
            8 * scale,

          paddingHorizontal:
            13 * scale,
        },

        normalized ===
          'pending' &&
          styles.statusPending,

        normalized ===
          'approved' &&
          styles.statusApproved,

        normalized ===
          'rejected' &&
          styles.statusRejected,

        normalized ===
          'withdrawn' &&
          styles.statusWithdrawn,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,

          {
            fontSize:
              12 * fontScale,
          },

          normalized ===
            'pending' &&
            styles.statusPendingText,

          normalized ===
            'approved' &&
            styles.statusApprovedText,

          normalized ===
            'rejected' &&
            styles.statusRejectedText,

          normalized ===
            'withdrawn' &&
            styles.statusWithdrawnText,
        ]}
      >
        {formatValue(
          normalized
        )}
      </Text>
    </View>
  );
}

// ============================================================
// MODAL HELPERS
// ============================================================

function getActionModalAccent(
  variant:
    ActionModalVariant
) {
  switch (
    variant
  ) {
    case 'success':
    case 'approve':
      return COLORS.green;

    case 'warning':
      return COLORS.orange;

    case 'reject':
    case 'error':
      return COLORS.redBright;

    case 'info':
    default:
      return COLORS.blue;
  }
}

function getActionModalTint(
  variant:
    ActionModalVariant
) {
  switch (
    variant
  ) {
    case 'success':
    case 'approve':
      return 'rgba(53,201,130,0.12)';

    case 'warning':
      return 'rgba(243,163,74,0.12)';

    case 'reject':
    case 'error':
      return 'rgba(239,51,64,0.12)';

    case 'info':
    default:
      return 'rgba(74,140,255,0.12)';
  }
}

function getActionModalPrimaryColor(
  variant:
    ActionModalVariant
) {
  if (
    variant ===
    'reject'
  ) {
    return COLORS.redDark;
  }

  if (
    variant ===
      'success' ||
    variant ===
      'approve'
  ) {
    return COLORS.green;
  }

  if (
    variant ===
    'warning'
  ) {
    return COLORS.orange;
  }

  return COLORS.red;
}

function getActionModalIcon(
  variant:
    ActionModalVariant
):
  ComponentProps<
    typeof MaterialIcons
  >['name'] {
  switch (
    variant
  ) {
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

    case 'info':
    default:
      return 'info-outline';
  }
}

// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return '—';
  }

  return value
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      character =>
        character
          .toUpperCase()
    );
}

// ============================================================
// DONATION HISTORY
// ============================================================

function formatDonationHistory(
  application:
    DonorApplication
) {
  if (
    !application
      .has_donated_before
  ) {
    return 'First-time donor';
  }

  if (
    application
      .last_donation_date
  ) {
    return formatDate(
      application
        .last_donation_date
    );
  }

  const month =
    application
      .last_donation_month;

  const year =
    application
      .last_donation_year;

  if (
    typeof month ===
      'number' &&
    month >=
      1 &&
    month <=
      12 &&
    typeof year ===
      'number' &&
    Number.isInteger(
      year
    )
  ) {
    return `Approximately ${MONTH_NAMES[month - 1]} ${year}`;
  }

  return 'Date not provided';
}

// ============================================================
// DATE
// ============================================================

function formatDate(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return '—';
  }

  const dateOnlyMatch =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  let date:
    Date;

  if (
    dateOnlyMatch
  ) {
    date =
      new Date(
        Number(
          dateOnlyMatch[1]
        ),

        Number(
          dateOnlyMatch[2]
        ) - 1,

        Number(
          dateOnlyMatch[3]
        )
      );
  } else {
    date =
      new Date(
        value
      );
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date
    .toLocaleDateString(
      undefined,
      {
        month:
          'long',

        day:
          'numeric',

        year:
          'numeric',
      }
    );
}

// ============================================================
// DATE + TIME
// ============================================================

function formatDateTime(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
    return '—';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date
    .toLocaleString(
      undefined,
      {
        month:
          'short',

        day:
          'numeric',

        year:
          'numeric',

        hour:
          'numeric',

        minute:
          '2-digit',
      }
    );
}

// ============================================================
// LOCATION
// ============================================================

function formatLocation(
  city?:
    | string
    | null,

  province?:
    | string
    | null
) {
  const parts =
    [
      city,
      province,
    ]
      .filter(
        Boolean
      );

  return parts.length
    ? parts.join(
        ', '
      )
    : '—';
}

// ============================================================
// COORDINATE
// ============================================================

function formatCoordinate(
  value?:
    | number
    | null
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return '—';
  }

  return Number(
    value
  )
    .toFixed(
      5
    );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    outer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    ipadCanvas: {
      overflow:
        'hidden',

      backgroundColor:
        COLORS.navy,

    },

    nativeCanvas: {
      width:
        '100%',

      height:
        '100%',
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

    loadingArea: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    loadingText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    errorTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      textAlign:
        'center',
    },

    errorText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    retryButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    retryText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    backButton: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    profileCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    profileMain: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    applicantAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },

    applicantAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    profileNameArea: {
      flex:
        1,
    },

    applicantName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    applicantEmail: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    submittedText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    waitingText: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',
    },

    waitingLong: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    viewUserButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    viewUserText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    profileBadges: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,
    },

    bloodBadge: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        '#C21319',

      backgroundColor:
        'rgba(194,19,25,0.11)',
    },

    bloodBadgeText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_600SemiBold',
    },

    statusBadge: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    statusBadgeText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    statusPending: {
      borderColor:
        'rgba(243,163,74,0.55)',

      backgroundColor:
        'rgba(243,163,74,0.12)',
    },

    statusPendingText: {
      color:
        COLORS.orange,
    },

    statusApproved: {
      borderColor:
        'rgba(53,201,130,0.50)',

      backgroundColor:
        'rgba(53,201,130,0.12)',
    },

    statusApprovedText: {
      color:
        COLORS.green,
    },

    statusRejected: {
      borderColor:
        'rgba(239,51,64,0.50)',

      backgroundColor:
        'rgba(239,51,64,0.12)',
    },

    statusRejectedText: {
      color:
        COLORS.redBright,
    },

    statusWithdrawn: {
      borderColor:
        'rgba(127,136,159,0.45)',

      backgroundColor:
        'rgba(127,136,159,0.10)',
    },

    statusWithdrawnText: {
      color:
        COLORS.muted,
    },

    mainGrid: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    leftColumn: {
      flex:
        1.55,
    },

    rightColumn: {
      flex:
        1,
    },

    sectionCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    sectionIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    sectionTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    infoGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      rowGap:
        18,

      columnGap:
        10,
    },

    infoItem: {
      width:
        '48%',
    },

    infoLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      textTransform:
        'uppercase',

      letterSpacing:
        0.5,
    },

    infoValue: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    infoHighlight: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_600SemiBold',
    },

    infoPositive: {
      color:
        COLORS.green,
    },

    verificationPanel: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    verificationTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    verificationIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    verificationTextArea: {
      flex: 1,
    },

    verificationTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    verificationDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    viewIdButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.red,
    },

    viewIdText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    expiryText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    noteLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.6,
    },

    noteInput: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    noteInputDisabled: {
      opacity:
        0.75,
    },

    noteCounter: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'right',
    },

    actionButtons: {
      flexDirection:
        'row',
    },

    rejectButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      borderWidth:
        1,

      borderColor:
        COLORS.redBright,

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    rejectText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    approveButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.red,
    },

    approveText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    disabledButton: {
      opacity:
        0.45,
    },

    buttonPressed: {
      opacity:
        0.8,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    reviewedPanel: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    reviewedTextArea: {
      flex:
        1,
    },

    reviewedTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    reviewedDate: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    modalBackdrop: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        24,

      backgroundColor:
        'rgba(2,4,10,0.78)',
    },

    modalCard: {
      alignItems:
        'center',

      borderWidth:
        1,

      backgroundColor:
        '#0B142A',

      shadowColor:
        '#000000',

      shadowOpacity:
        0.35,

      shadowRadius:
        24,

      shadowOffset: {
        width:
          0,

        height:
          14,
      },

      elevation:
        18,
    },

    modalIconWrap: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      textAlign:
        'center',
    },

    modalMessage: {
      maxWidth:
        430,

      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    modalActions: {
      width:
        '100%',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    modalCancelButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    modalPrimaryButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalSingleButton: {
      maxWidth:
        190,

      marginLeft:
        'auto',

      marginRight:
        'auto',
    },

    modalCancelText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    modalPrimaryText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },
  });