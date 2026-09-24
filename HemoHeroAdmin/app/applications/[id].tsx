import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

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
// IPAD PRO LANDSCAPE
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

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
// SCREEN
// ============================================================

export default function ApplicationReviewScreen() {
  const {
    id,
  } =
    useLocalSearchParams<{
      id: string;
    }>();

  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // IPAD PRO CANVAS
  // ==========================================================

  const tablet =
    useMemo(
      () => {
        if (
          Platform.OS !==
          'web'
        ) {
          return {
            width,
            height,

            scale:
              Math.min(
                width /
                  DESIGN_WIDTH,

                height /
                  DESIGN_HEIGHT
              ),
          };
        }

        const padding =
          24;

        const availableWidth =
          Math.max(
            width -
              padding * 2,
            320
          );

        const availableHeight =
          Math.max(
            height -
              padding * 2,
            320
          );

        const scale =
          Math.min(
            availableWidth /
              DESIGN_WIDTH,

            availableHeight /
              DESIGN_HEIGHT,

            1
          );

        return {
          width:
            DESIGN_WIDTH *
            scale,

          height:
            DESIGN_HEIGHT *
            scale,

          scale,
        };
      },
      [
        width,
        height,
      ]
    );

  const s =
    Math.max(
      tablet.scale,
      0.68
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
            loadError instanceof Error
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
  // ADMIN NAME
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

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
  // CONFIRMATION
  // ==========================================================

  function confirmAction(
    title: string,
    message: string,
    onConfirm: () => void
  ) {
    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          `${title}\n\n${message}`
        );

      if (
        confirmed
      ) {
        onConfirm();
      }

      return;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text:
            'Cancel',

          style:
            'cancel',
        },

        {
          text:
            'Continue',

          style:
            'default',

          onPress:
            onConfirm,
        },
      ]
    );
  }

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      window.alert(
        `${title}\n\n${message}`
      );

      return;
    }

    Alert.alert(
      title,
      message
    );
  }

  // ==========================================================
  // VIEW GOVERNMENT ID
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
        'A verification document is not currently available.'
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
        viewError instanceof Error
          ? viewError.message
          : 'Unable to open the verification document.'
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
      performApprove
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

      showMessage(
        'Application Approved',
        `${applicantName} is now a verified donor.`
      );

      await loadApplication();
    } catch (
      approveError
    ) {
      console.log(
        'APPROVE DONOR ERROR:',
        approveError
      );

      showMessage(
        'Unable to Approve',
        approveError instanceof Error
          ? approveError.message
          : 'Unable to approve the donor application.'
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
        'Enter an admin note explaining why this application is being rejected.'
      );

      return;
    }

    confirmAction(
      'Reject Donor Application',
      `Reject ${applicantName}'s donor application?`,
      performReject
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

      showMessage(
        'Application Rejected',
        `${applicantName}'s donor application has been rejected.`
      );

      await loadApplication();
    } catch (
      rejectError
    ) {
      console.log(
        'REJECT DONOR ERROR:',
        rejectError
      );

      showMessage(
        'Unable to Reject',
        rejectError instanceof Error
          ? rejectError.message
          : 'Unable to reject the donor application.'
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
            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}

            <View
              style={[
                styles.header,

                {
                  height:
                    96 * s,

                  paddingHorizontal:
                    48 * s,
                },
              ]}
            >
              <Pressable
                style={
                  styles.brandArea
                }
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <View
                  style={[
                    styles.logoCircle,

                    {
                      width:
                        52 * s,

                      height:
                        52 * s,

                      borderRadius:
                        26 * s,
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/hemo-hero-logo.png')}
                    style={{
                      width:
                        46 * s,

                      height:
                        46 * s,
                    }}
                    resizeMode="contain"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.brand,

                      {
                        fontSize:
                          27 * s,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.brandRed
                      }
                    >
                      Hemo-
                    </Text>

                    Hero
                  </Text>

                  <Text
                    style={[
                      styles.portal,

                      {
                        fontSize:
                          9 * s,

                        letterSpacing:
                          1.6 * s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              <View
                style={
                  styles.adminSection
                }
              >
                <View
                  style={[
                    styles.adminAvatar,

                    {
                      width:
                        48 * s,

                      height:
                        48 * s,

                      borderRadius:
                        24 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.adminAvatarText,

                      {
                        fontSize:
                          15 * s,
                      },
                    ]}
                  >
                    {adminName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View>
                  <Text
                    style={[
                      styles.adminName,

                      {
                        fontSize:
                          12 * s,
                      },
                    ]}
                  >
                    {adminName}
                  </Text>

                  <Text
                    style={[
                      styles.adminRole,

                      {
                        fontSize:
                          10 * s,
                      },
                    ]}
                  >
                    Administrator
                  </Text>
                </View>
              </View>
            </View>

            {/* ================================================= */}
            {/* CONTENT */}
            {/* ================================================= */}

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
                        12 * s,

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
                        20 * s,

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
                        12 * s,

                      marginTop:
                        7 * s,
                    },
                  ]}
                >
                  {error}
                </Text>

                <Pressable
                  style={[
                    styles.retryButton,

                    {
                      marginTop:
                        20 * s,

                      height:
                        44 * s,

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
                          11 * s,
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
                          11 * s,
                      },
                    ]}
                  >
                    Donor Applications
                  </Text>
                </Pressable>

                {/* ================================================= */}
                {/* APPLICANT SUMMARY */}
                {/* ================================================= */}

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
                              18 * s,
                          },
                        ]}
                      >
                        {applicantInitials}
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
                              23 * s,
                          },
                        ]}
                      >
                        {applicantName}
                      </Text>

                      <Text
                        style={[
                          styles.applicantEmail,

                          {
                            fontSize:
                              11 * s,

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
                              10 * s,

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
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.profileBadges
                    }
                  >
                    <BloodBadge
                      value={
                        application.blood_type
                      }
                      scale={
                        s
                      }
                    />

                    <StatusBadge
                      status={
                        application.status
                      }
                      scale={
                        s
                      }
                    />
                  </View>
                </View>

                {/* ================================================= */}
                {/* MAIN GRID */}
                {/* ================================================= */}

                <View
                  style={[
                    styles.mainGrid,

                    {
                      gap:
                        18 * s,
                    },
                  ]}
                >
                  {/* LEFT */}

                  <View
                    style={
                      styles.leftColumn
                    }
                  >
                    {/* PERSONAL INFORMATION */}

                    <SectionCard
                      scale={
                        s
                      }
                      icon="person-outline"
                      title="Personal Information"
                    >
                      <InfoGrid>
                        <InfoItem
                          scale={
                            s
                          }
                          label="Full Name"
                          value={
                            applicantName
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Email Address"
                          value={
                            user?.email ||
                            '—'
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Phone Number"
                          value={
                            user?.phone ||
                            '—'
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Date of Birth"
                          value={
                            formatDate(
                              user?.date_of_birth
                            )
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Gender"
                          value={
                            formatValue(
                              user?.gender
                            )
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
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

                    {/* ================================================= */}
                    {/* BLOOD INFORMATION */}
                    {/* ================================================= */}

                    <SectionCard
                      scale={
                        s
                      }
                      icon="bloodtype"
                      title="Blood Information"
                    >
                      <InfoGrid>
                        <InfoItem
                          scale={
                            s
                          }
                          label="Blood Type"
                          value={
                            application.blood_type
                          }
                          highlight
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Previous Donor"
                          value={
                            application.has_donated_before
                              ? 'Yes'
                              : 'No — First-time donor'
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Last Donation"
                          value={
                            formatDonationHistory(
                              application
                            )
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
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

                    {/* LOCATION & AVAILABILITY */}

                    <SectionCard
                      scale={
                        s
                      }
                      icon="location-on"
                      title="Location & Availability"
                    >
                      <InfoGrid>
                        <InfoItem
                          scale={
                            s
                          }
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
                          scale={
                            s
                          }
                          label="Travel Radius"
                          value={`${application.travel_radius_km} km`}
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Urgent Requests"
                          value={
                            application.allow_urgent_requests
                              ? 'Allowed'
                              : 'Not allowed'
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Consent Confirmed"
                          value={
                            application.consent_confirmed
                              ? 'Yes'
                              : 'No'
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Latitude"
                          value={
                            formatCoordinate(
                              application.current_latitude
                            )
                          }
                        />

                        <InfoItem
                          scale={
                            s
                          }
                          label="Longitude"
                          value={
                            formatCoordinate(
                              application.current_longitude
                            )
                          }
                        />
                      </InfoGrid>
                    </SectionCard>
                  </View>

                  {/* RIGHT */}

                  <View
                    style={
                      styles.rightColumn
                    }
                  >
                    {/* ================================================= */}
                    {/* VERIFICATION */}
                    {/* ================================================= */}

                    <SectionCard
                      scale={
                        s
                      }
                      icon="badge"
                      title="Identity Verification"
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
                                    12 * s,
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
                                    10 * s,

                                  marginTop:
                                    3 * s,

                                  lineHeight:
                                    15 * s,
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
                          style={[
                            styles.viewIdButton,

                            {
                              height:
                                44 * s,

                              borderRadius:
                                9 * s,

                              marginTop:
                                17 * s,
                            },

                            !application
                              .verification
                              ?.available &&
                              styles.disabledButton,
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
                                  11 * s,
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
                                  9 * s,

                                marginTop:
                                  9 * s,
                              },
                            ]}
                          >
                            For security, this private link expires after 5 minutes.
                          </Text>
                        ) : null}
                      </View>
                    </SectionCard>

                    {/* ================================================= */}
                    {/* ADMIN REVIEW */}
                    {/* ================================================= */}

                    <SectionCard
                      scale={
                        s
                      }
                      icon="fact-check"
                      title="Admin Review"
                    >
                      <Text
                        style={[
                          styles.noteLabel,

                          {
                            fontSize:
                              10 * s,

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
                              11 * s,

                            lineHeight:
                              18 * s,
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
                              9 * s,

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
                            style={[
                              styles.rejectButton,

                              {
                                height:
                                  48 * s,

                                borderRadius:
                                  10 * s,
                              },

                              submitting &&
                                styles.disabledButton,
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
                                    11 * s,
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
                            style={[
                              styles.approveButton,

                              {
                                height:
                                  48 * s,

                                borderRadius:
                                  10 * s,
                              },

                              submitting &&
                                styles.disabledButton,
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
                                        11 * s,
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
                                    11 * s,
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
                                    9 * s,

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
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SECTION CARD
// ============================================================

function SectionCard({
  scale,
  icon,
  title,
  children,
}: {
  scale: number;

  icon: any;

  title: string;

  children:
    React.ReactNode;
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
                15 * scale,
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
// INFO GRID
// ============================================================

function InfoGrid({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <View
      style={
        styles.infoGrid
      }
    >
      {children}
    </View>
  );
}

// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  scale,
  label,
  value,
  highlight = false,
  positive = false,
}: {
  scale: number;

  label: string;

  value: string;

  highlight?: boolean;

  positive?: boolean;
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
              9 * scale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={
          2
        }
        style={[
          styles.infoValue,

          {
            fontSize:
              11 * scale,

            marginTop:
              4 * scale,

            lineHeight:
              16 * scale,
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
// BLOOD BADGE
// ============================================================

function BloodBadge({
  value,
  scale,
}: {
  value: string;

  scale: number;
}) {
  return (
    <View
      style={[
        styles.bloodBadge,

        {
          height:
            36 * scale,

          minWidth:
            54 * scale,

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
              12 * scale,
          },
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
}: {
  status: string;

  scale: number;
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
            36 * scale,

          minWidth:
            100 * scale,

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
              10 * scale,
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
// HELPERS
// ============================================================

function formatValue(
  value?: string | null
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
        character.toUpperCase()
    );
}

// ============================================================
// DONATION HISTORY
// ============================================================

function formatDonationHistory(
  application: DonorApplication
) {
  // ----------------------------------------------------------
  // FIRST-TIME DONOR
  // ----------------------------------------------------------

  if (
    !application.has_donated_before
  ) {
    return 'First-time donor';
  }

  // ----------------------------------------------------------
  // EXACT DATE
  // ----------------------------------------------------------

  if (
    application.last_donation_date
  ) {
    return formatDate(
      application.last_donation_date
    );
  }

  // ----------------------------------------------------------
  // APPROXIMATE MONTH + YEAR
  // ----------------------------------------------------------

  const month =
    application.last_donation_month;

  const year =
    application.last_donation_year;

  if (
    typeof month ===
      'number' &&
    month >= 1 &&
    month <= 12 &&
    typeof year ===
      'number' &&
    Number.isInteger(
      year
    )
  ) {
    return `Approximately ${MONTH_NAMES[month - 1]} ${year}`;
  }

  // ----------------------------------------------------------
  // LEGACY APPLICATION
  // ----------------------------------------------------------

  return 'Date not provided';
}

// ============================================================
// DATE
// ============================================================

function formatDate(
  value?: string | null
) {
  if (
    !value
  ) {
    return '—';
  }

  // Date-only values such as 2026-06-14 should be interpreted
  // as a local calendar date rather than UTC. This prevents
  // timezone shifts from displaying the previous day.

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
  value?: string | null
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
  city?: string | null,
  province?: string | null
) {
  const parts =
    [
      city,
      province,
    ]
      .filter(Boolean);

  if (
    parts.length ===
      0
  ) {
    return '—';
  }

  return parts.join(
    ', '
  );
}

// ============================================================
// COORDINATE
// ============================================================

function formatCoordinate(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }

  return Number(
    value
  ).toFixed(
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

      borderRadius:
        Platform.OS ===
          'web'
          ? 24
          : 0,
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

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    brandArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      overflow:
        'hidden',
    },

    brand: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portal: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',

      marginTop: 1,
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 11,
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    adminAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      marginTop: 2,
    },

    // ========================================================
    // CONTENT
    // ========================================================

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

    // ========================================================
    // PROFILE
    // ========================================================

    profileCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    profileMain: {
      flex: 1,

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

      borderWidth: 1,

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
      flex: 1,
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

    profileBadges: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    bloodBadge: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

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

      borderWidth: 1,
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

    // ========================================================
    // MAIN GRID
    // ========================================================

    mainGrid: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    leftColumn: {
      flex: 1.55,
    },

    rightColumn: {
      flex: 1,
    },

    // ========================================================
    // SECTION CARD
    // ========================================================

    sectionCard: {
      borderWidth: 1,

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

    // ========================================================
    // INFO
    // ========================================================

    infoGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      rowGap: 18,

      columnGap: 10,
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

    // ========================================================
    // VERIFICATION
    // ========================================================

    verificationPanel: {
      borderWidth: 1,

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

      marginRight: 11,

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

      gap: 7,

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

    // ========================================================
    // REVIEW
    // ========================================================

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

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    noteInputDisabled: {
      opacity: 0.75,
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
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

      borderWidth: 1,

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
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

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
      opacity: 0.45,
    },

    reviewedPanel: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    reviewedTextArea: {
      flex: 1,
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
  });