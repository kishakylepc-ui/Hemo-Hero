import { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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

import * as Location from 'expo-location';

import {
  getPublicDonorProfile,
} from '../../lib/donorProfile';

import type {
  PublicDonorProfile,
} from '../../lib/donorProfile';

import {
  getMyBloodRequests,
} from '../../lib/api';

import type {
  BloodRequest,
} from '../../lib/api';

import {
  sendDonorInvitation,
} from '../../lib/donorInvitations';

import {
  getAccessToken,
} from '../../lib/session';

import {
  type BloodType,
  getCompatibleDonorTypes,
  isBloodType,
} from '../../lib/bloodCompatibility';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#E8DADA',

  pinkSoft: '#FFF1F1',

  green: '#159447',
  greenSoft: '#EAF7EF',

  orange: '#DF721D',
  orangeSoft: '#FDF1E6',

  graySoft: '#F5EFEF',
};

// ============================================================
// ACTION POPUP
// ============================================================

type ActionPopupVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

type ActionPopupState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionPopupVariant;
};

// ============================================================
// BLOOD TYPE HELPERS
// ============================================================

function normalizeBloodType(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  return value
    .trim()
    .toUpperCase();
}

// Same rule as the server: the donor's verified blood type
// must be red-cell compatible with the requested type.
function isCompatibleDonorForRequest(
  requestBloodType?: string | null,
  donorBloodType?: string | null
) {
  const required =
    normalizeBloodType(
      requestBloodType
    );

  const donor =
    normalizeBloodType(
      donorBloodType
    );

  if (
    !isBloodType(required) ||
    !isBloodType(donor)
  ) {
    return false;
  }

  return getCompatibleDonorTypes(
    required
  ).includes(donor);
}

// ============================================================
// DONOR PROFILE
// ============================================================

export default function DonorDetailsScreen() {
  // ==========================================================
  // ROUTE
  // ==========================================================

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const donorId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  // ==========================================================
  // DONOR
  // ==========================================================

  const [
    donor,
    setDonor,
  ] =
    useState<
      PublicDonorProfile | null
    >(null);

  // ==========================================================
  // PAGE STATE
  // ==========================================================

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  // ==========================================================
  // REQUEST HELP
  // ==========================================================

  const [
    requestModalVisible,
    setRequestModalVisible,
  ] =
    useState(false);

  const [
    activeRequests,
    setActiveRequests,
  ] =
    useState<
      BloodRequest[]
    >([]);

  const [
    loadingRequests,
    setLoadingRequests,
  ] =
    useState(false);

  const [
    requestLoadError,
    setRequestLoadError,
  ] =
    useState('');

  const [
    selectedRequestId,
    setSelectedRequestId,
  ] =
    useState<
      string | null
    >(null);

  const [
    sendingInvitation,
    setSendingInvitation,
  ] =
    useState(false);

  const [
    actionPopup,
    setActionPopup,
  ] =
    useState<ActionPopupState>({
      visible: false,
      title: '',
      message: '',
      variant: 'info',
    });

  // ==========================================================
  // MATCHING REQUESTS
  // ==========================================================

  const matchingRequests =
    useMemo(
      () => {
        if (!donor) {
          return [];
        }

        return activeRequests.filter(
          request =>
            isCompatibleDonorForRequest(
              request.blood_type,
              donor.blood_type
            )
        );
      },
      [
        activeRequests,
        donor,
      ]
    );

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function closeActionPopup() {
    setActionPopup(
      current => ({
        ...current,
        visible: false,
      })
    );
  }

  function getMessageVariant(
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes('sent') ||
      value.includes('success')
    ) {
      return 'success';
    }

    if (
      value.includes('blood type') ||
      value.includes('not found')
    ) {
      return 'warning';
    }

    if (
      value.includes('unable') ||
      value.includes('error')
    ) {
      return 'error';
    }

    return 'info';
  }

  function showMessage(
    title: string,
    message: string
  ) {
    setActionPopup({
      visible: true,
      title,
      message,
      variant:
        getMessageVariant(
          title
        ),
    });
  }

  // ==========================================================
  // LOAD DONOR
  // ==========================================================

  const loadDonor =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setErrorMessage('');

          if (!donorId) {
            throw new Error(
              'Donor ID is missing.'
            );
          }

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          let latitude:
            number | null =
            null;

          let longitude:
            number | null =
            null;

          try {
            let permission =
              await Location
                .getForegroundPermissionsAsync();

            if (
              permission.status !==
              'granted'
            ) {
              permission =
                await Location
                  .requestForegroundPermissionsAsync();
            }

            if (
              permission.status ===
              'granted'
            ) {
              const position =
                await Location
                  .getCurrentPositionAsync({
                    accuracy:
                      Location.Accuracy
                        .Balanced,
                  });

              latitude =
                position
                  .coords
                  .latitude;

              longitude =
                position
                  .coords
                  .longitude;
            }
          } catch (error) {
            console.log(
              'DONOR DETAILS LOCATION ERROR:',
              error
            );
          }

          const result =
            await getPublicDonorProfile(
              token,
              donorId,
              {
                latitude,
                longitude,
              }
            );

          setDonor(
            result.donor
          );
        } catch (error) {
          console.log(
            'DONOR DETAILS ERROR:',
            error
          );

          setDonor(null);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load donor profile.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        donorId,
      ]
    );

  // ==========================================================
  // LOAD ON FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadDonor();
      },
      [
        loadDonor,
      ]
    )
  );

  // ==========================================================
  // BACK
  // ==========================================================

  function handleBack() {
    if (
      router.canGoBack()
    ) {
      router.back();

      return;
    }

    router.replace(
      '/search' as any
    );
  }

  // ==========================================================
  // CLOSE REQUEST MODAL
  // ==========================================================

  function closeRequestModal() {
    if (
      sendingInvitation
    ) {
      return;
    }

    setRequestModalVisible(
      false
    );

    setRequestLoadError(
      ''
    );

    setSelectedRequestId(
      null
    );
  }

  // ==========================================================
  // LOAD ACTIVE REQUESTS
  // ==========================================================

  async function loadActiveRequests() {
    try {
      setLoadingRequests(
        true
      );

      setRequestLoadError(
        ''
      );

      setSelectedRequestId(
        null
      );

      const token =
        await getAccessToken();

      if (!token) {
        setRequestModalVisible(
          false
        );

        router.replace('/');

        return;
      }

      const data =
        await getMyBloodRequests(
          token
        );

      const requests =
        Array.isArray(
          data?.requests
        )
          ? (
              data.requests as
                BloodRequest[]
            )
          : [];

      const active =
        requests.filter(
          request =>
            request.status ===
            'active'
        );

      setActiveRequests(
        active
      );

      // ------------------------------------------------------
      // AUTO-SELECT WHEN EXACTLY ONE REQUEST IS COMPATIBLE
      // ------------------------------------------------------

      if (donor) {
        const matching =
          active.filter(
            request =>
              isCompatibleDonorForRequest(
                request.blood_type,
                donor.blood_type
              )
          );

        if (
          matching.length ===
          1
        ) {
          setSelectedRequestId(
            matching[0].id
          );
        }
      }
    } catch (error) {
      console.log(
        'LOAD ACTIVE REQUESTS ERROR:',
        error
      );

      setActiveRequests([]);

      setSelectedRequestId(
        null
      );

      setRequestLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load your active blood request.'
      );
    } finally {
      setLoadingRequests(
        false
      );
    }
  }

  // ==========================================================
  // REQUEST HELP
  // ==========================================================

  async function handleRequestHelp() {
    if (
      !donor ||
      donor.availability_status !==
        'available'
    ) {
      return;
    }

    setRequestModalVisible(
      true
    );

    await loadActiveRequests();
  }

  // ==========================================================
  // SEND INVITATION
  // ==========================================================

  async function handleSendInvitation() {
    if (
      !donor ||
      !selectedRequestId ||
      sendingInvitation
    ) {
      return;
    }

    const selected =
      activeRequests.find(
        request =>
          request.id ===
          selectedRequestId
      );

    if (!selected) {
      showMessage(
        'Request Not Found',
        'The selected blood request could not be found.'
      );

      return;
    }

    // --------------------------------------------------------
    // FRONTEND BLOOD TYPE VALIDATION
    // --------------------------------------------------------

    if (
      !isCompatibleDonorForRequest(
        selected.blood_type,
        donor.blood_type
      )
    ) {
      showMessage(
        'Blood Type Not Compatible',
        `A ${donor.blood_type} donor cannot donate to a ${selected.blood_type} request. Compatible donors: ${getCompatibleDonorTypes(normalizeBloodType(selected.blood_type) as BloodType).join(', ')}.`
      );

      return;
    }

    try {
      setSendingInvitation(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        setRequestModalVisible(
          false
        );

        router.replace('/');

        return;
      }

      await sendDonorInvitation(
        token,
        selectedRequestId,
        donor.id
      );

      setRequestModalVisible(
        false
      );

      setSelectedRequestId(
        null
      );

      showMessage(
        'Request Sent',
        `Your request for help was sent to ${
          donor.first_name ||
          donor.full_name
        }. You will be notified when the donor responds.`
      );
    } catch (error) {
      console.log(
        'SEND DONOR INVITATION ERROR:',
        error
      );

      showMessage(
        'Unable to Send Request',
        error instanceof Error
          ? error.message
          : 'Unable to send your request to this donor.'
      );
    } finally {
      setSendingInvitation(
        false
      );
    }
  }

  // ==========================================================
  // CREATE BLOOD REQUEST
  // ==========================================================

  function handleCreateBloodRequest() {
    setRequestModalVisible(
      false
    );

    router.push(
      '/blood-request/create' as any
    );
  }

  // ==========================================================
  // DATE
  // ==========================================================

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return 'Not provided';
    }

    const date =
      new Date(
        `${value}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date
      .toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );
  }

  // ==========================================================
  // NEEDED BY
  // ==========================================================

  function formatNeededBy(
    request:
      BloodRequest
  ) {
    if (
      request.urgency ===
      'urgent'
    ) {
      return 'As soon as possible';
    }

    if (
      !request.needed_date
    ) {
      return 'Schedule not specified';
    }

    const dateText =
      formatDate(
        request.needed_date
      );

    if (
      !request.needed_time
    ) {
      return dateText;
    }

    const [
      hours,
      minutes,
    ] =
      request.needed_time
        .split(':');

    const time =
      new Date();

    time.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    const timeText =
      time.toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      );

    return `${dateText} at ${timeText}`;
  }

  // ==========================================================
  // LOCATION
  // ==========================================================

  const donorLocation =
    donor?.location ||
    [
      donor?.city,
      donor?.province,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Location unavailable';

  // ==========================================================
  // SELECTED REQUEST
  // ==========================================================

  const selectedRequest =
    matchingRequests.find(
      request =>
        request.id ===
        selectedRequestId
    ) ||
    null;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.desktopBackground
      }
    >
      <View
        style={
          styles.phone
        }
      >
        <SafeAreaView
          style={
            styles.safeArea
          }
          edges={[
            'top',
            'bottom',
          ]}
        >
          <StatusBar
            style="light"
          />

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              '#D2151A',
              COLORS.redDark,
            ]}
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerCircleLeft
              }
            />

            <View
              style={
                styles.headerCircleRight
              }
            />

            <View
              style={
                styles.topBar
              }
            >
              <TouchableOpacity
                style={
                  styles.headerAction
                }
                activeOpacity={
                  0.7
                }
                onPress={
                  handleBack
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Donor Profile
              </Text>

              <View
                style={
                  styles.headerAction
                }
              />
            </View>

            {!loading &&
            donor ? (
              <>
                <View
                  style={
                    styles.profileHeader
                  }
                >
                  <View
                    style={
                      styles.avatar
                    }
                  >
                    {donor.profile_photo_url ? (
                      <Image
                        source={{
                          uri:
                            donor.profile_photo_url,
                        }}
                        style={
                          styles.avatarImage
                        }
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcons
                        name="person"
                        size={38}
                        color={
                          COLORS.redDark
                        }
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.profileHeaderContent
                    }
                  >
                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.donorName
                      }
                    >
                      {
                        donor.full_name
                      }
                    </Text>

                    <View
                      style={
                        styles.locationRow
                      }
                    >
                      <MaterialIcons
                        name="location-on"
                        size={13}
                        color="rgba(255,255,255,0.85)"
                      />

                      <Text
                        numberOfLines={
                          1
                        }
                        style={
                          styles.locationText
                        }
                      >
                        {
                          donorLocation
                        }
                      </Text>
                    </View>

                    {donor.verified ? (
                      <View
                        style={
                          styles.verifiedBadge
                        }
                      >
                        <MaterialIcons
                          name="verified"
                          size={12}
                          color={
                            COLORS.green
                          }
                        />

                        <Text
                          style={
                            styles.verifiedBadgeText
                          }
                        >
                          Verified Donor
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View
                  style={
                    styles.summaryCard
                  }
                >
                  <SummaryItem
                    icon="bloodtype"
                    label="Blood Type"
                    value={
                      donor.blood_type
                    }
                  />

                  <View
                    style={
                      styles.summaryDivider
                    }
                  />

                  <SummaryItem
                    icon="near-me"
                    label="Distance"
                    value={
                      donor.distance_km !==
                        null &&
                      donor.distance_km !==
                        undefined
                        ? `${donor.distance_km.toFixed(
                            1
                          )} km`
                        : 'Nearby'
                    }
                  />
                </View>

                {/* Completed donations and requester ratings */}
                {typeof donor.donations_count ===
                'number' ? (
                  <View
                    style={[
                      styles.summaryCard,
                      styles.summaryCardStacked,
                    ]}
                  >
                    <SummaryItem
                      icon="volunteer-activism"
                      label={
                        donor.donations_count ===
                        1
                          ? 'Donation'
                          : 'Donations'
                      }
                      value={
                        donor.donations_count ===
                        0
                          ? 'New donor'
                          : String(
                              donor.donations_count
                            )
                      }
                    />

                    <View
                      style={
                        styles.summaryDivider
                      }
                    />

                    <SummaryItem
                      icon="star"
                      label={
                        donor.ratings_count
                          ? `Rating (${donor.ratings_count})`
                          : 'Rating'
                      }
                      value={
                        donor.ratings_count &&
                        typeof donor.average_rating ===
                          'number'
                          ? `${donor.average_rating.toFixed(
                              1
                            )} / 5`
                          : 'No ratings yet'
                      }
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </LinearGradient>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            style={
              styles.content
            }
            contentContainerStyle={
              styles.contentContainer
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {loading ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Loading Donor
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  Retrieving the donor&apos;s verified profile.
                </Text>
              </View>
            ) : null}

            {!loading &&
            errorMessage ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateErrorIcon
                  }
                >
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Unable to Load Donor
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  {
                    errorMessage
                  }
                </Text>

                <TouchableOpacity
                  style={
                    styles.retryButton
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={
                    loadDonor
                  }
                >
                  <MaterialIcons
                    name="refresh"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!loading &&
            !errorMessage &&
            donor ? (
              <>
                <SectionTitle
                  title="Details"
                />

                <View
                  style={
                    styles.infoCard
                  }
                >
                  <InfoRow
                    icon="check-circle"
                    iconColor={
                      donor.availability_status ===
                      'available'
                        ? COLORS.green
                        : COLORS.muted
                    }
                    iconBackground={
                      donor.availability_status ===
                      'available'
                        ? COLORS.greenSoft
                        : COLORS.graySoft
                    }
                    label="Availability"
                    value={
                      donor.availability_status ===
                      'available'
                        ? 'Available to donate'
                        : 'Unavailable right now'
                    }
                    valueColor={
                      donor.availability_status ===
                      'available'
                        ? COLORS.green
                        : COLORS.muted
                    }
                  />

                  <Divider />

                  <InfoRow
                    icon="bolt"
                    iconColor={
                      donor.allow_urgent_requests
                        ? COLORS.orange
                        : COLORS.muted
                    }
                    iconBackground={
                      donor.allow_urgent_requests
                        ? COLORS.orangeSoft
                        : COLORS.graySoft
                    }
                    label="Requests"
                    value={
                      donor.allow_urgent_requests
                        ? 'Accepts urgent requests'
                        : 'Regular requests only'
                    }
                  />

                  <Divider />

                  <InfoRow
                    icon="directions-car"
                    label="Travels up to"
                    value={
                      donor.travel_radius_km
                        ? `${donor.travel_radius_km} km`
                        : 'Not specified'
                    }
                  />

                  <Divider />

                  <InfoRow
                    icon="volunteer-activism"
                    label="Donated before"
                    value={
                      donor.has_donated_before
                        ? donor.last_donation_date
                          ? `Yes · last on ${formatDate(
                              donor.last_donation_date
                            )}`
                          : 'Yes'
                        : 'Not yet'
                    }
                  />

                  <Divider />

                  <InfoRow
                    icon="location-on"
                    label="Area"
                    value={
                      donorLocation
                    }
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.requestHelpButton,

                    donor.availability_status !==
                      'available' &&
                      styles.requestHelpButtonDisabled,
                  ]}
                  activeOpacity={
                    0.85
                  }
                  disabled={
                    donor.availability_status !==
                    'available'
                  }
                  onPress={
                    handleRequestHelp
                  }
                >
                  <MaterialIcons
                    name="volunteer-activism"
                    size={20}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.requestHelpText
                    }
                  >
                    {donor.availability_status ===
                    'available'
                      ? 'Request Help'
                      : 'Donor Unavailable'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={
                    styles.helperRow
                  }
                >
                  <MaterialIcons
                    name="info-outline"
                    size={13}
                    color={
                      COLORS.lightMuted
                    }
                  />

                  <Text
                    style={
                      styles.helperText
                    }
                  >
                    Sends your active request if their blood type matches.
                  </Text>
                </View>

                <View
                  style={
                    styles.helperRow
                  }
                >
                  <MaterialIcons
                    name="shield"
                    size={13}
                    color={
                      COLORS.lightMuted
                    }
                  />

                  <Text
                    style={
                      styles.helperText
                    }
                  >
                    Exact location and contact details stay private.
                  </Text>
                </View>

                <View
                  style={
                    styles.bottomSpacing
                  }
                />
              </>
            ) : null}
          </ScrollView>

          {/* ==================================================
              REQUEST HELP MODAL
          ================================================== */}

          <Modal
            visible={
              requestModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeRequestModal
            }
          >
            <View
              style={
                styles.modalOverlay
              }
            >
              <View
                style={
                  styles.modalCard
                }
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={
                      styles.modalHeaderIcon
                    }
                  >
                    <MaterialIcons
                      name="volunteer-activism"
                      size={22}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.modalHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Request Help
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Send a matching blood request to{' '}
                      {donor?.first_name ||
                        donor?.full_name ||
                        'this donor'}.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.modalClose
                    }
                    activeOpacity={
                      0.7
                    }
                    disabled={
                      sendingInvitation
                    }
                    onPress={
                      closeRequestModal
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={21}
                      color={
                        COLORS.muted
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* LOADING */}

                {loadingRequests ? (
                  <View
                    style={
                      styles.modalState
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      style={
                        styles.modalStateTitle
                      }
                    >
                      Loading your request...
                    </Text>
                  </View>
                ) : null}

                {/* ERROR */}

                {!loadingRequests &&
                requestLoadError ? (
                  <View
                    style={
                      styles.modalState
                    }
                  >
                    <View
                      style={
                        styles.modalStateIcon
                      }
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={25}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.modalStateTitle
                      }
                    >
                      Unable to Load Request
                    </Text>

                    <Text
                      style={
                        styles.modalStateText
                      }
                    >
                      {
                        requestLoadError
                      }
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.modalSecondaryButton
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={
                        loadActiveRequests
                      }
                    >
                      <MaterialIcons
                        name="refresh"
                        size={16}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.modalSecondaryButtonText
                        }
                      >
                        Try Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* NO ACTIVE REQUEST */}

                {!loadingRequests &&
                !requestLoadError &&
                activeRequests.length ===
                  0 ? (
                  <View
                    style={
                      styles.modalState
                    }
                  >
                    <View
                      style={
                        styles.modalStateIcon
                      }
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={26}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.modalStateTitle
                      }
                    >
                      No Active Blood Request
                    </Text>

                    <Text
                      style={
                        styles.modalStateText
                      }
                    >
                      Create a blood request first before asking a donor for help.
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.createRequestButton
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={
                        handleCreateBloodRequest
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={18}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.createRequestButtonText
                        }
                      >
                        Create Blood Request
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* BLOOD TYPE MISMATCH */}

                {!loadingRequests &&
                !requestLoadError &&
                activeRequests.length >
                  0 &&
                matchingRequests.length ===
                  0 ? (
                  <View
                    style={
                      styles.modalState
                    }
                  >
                    <View
                      style={
                        styles.mismatchIcon
                      }
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={27}
                        color={
                          COLORS.orange
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.modalStateTitle
                      }
                    >
                      Blood Type Not Compatible
                    </Text>

                    <Text
                      style={
                        styles.modalStateText
                      }
                    >
                      Your active request needs{' '}
                      <Text
                        style={
                          styles.boldStateText
                        }
                      >
                        {
                          activeRequests[0]
                            ?.blood_type
                        }
                      </Text>
                      , and this donor&apos;s verified blood type{' '}
                      <Text
                        style={
                          styles.boldStateText
                        }
                      >
                        {
                          donor?.blood_type
                        }
                      </Text>
                      {' '}cannot donate to it.
                    </Text>

                    <View
                      style={
                        styles.matchRuleCard
                      }
                    >
                      <MaterialIcons
                        name="verified-user"
                        size={16}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.matchRuleText
                        }
                      >
                        Hemo-Hero only allows direct invitations when the donor's
                        blood type is compatible with the request.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.modalSecondaryButton
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={
                        closeRequestModal
                      }
                    >
                      <MaterialIcons
                        name="search"
                        size={16}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.modalSecondaryButtonText
                        }
                      >
                        Choose Another Donor
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* MATCHING REQUEST */}

                {!loadingRequests &&
                !requestLoadError &&
                matchingRequests.length >
                  0 ? (
                  <>
                    <Text
                      style={
                        styles.chooseRequestLabel
                      }
                    >
                      MATCHING ACTIVE REQUEST
                    </Text>

                    <ScrollView
                      style={
                        styles.requestList
                      }
                      showsVerticalScrollIndicator={
                        false
                      }
                    >
                      {matchingRequests.map(
                        request => {
                          const selected =
                            request.id ===
                            selectedRequestId;

                          return (
                            <TouchableOpacity
                              key={
                                request.id
                              }
                              style={[
                                styles.requestOption,

                                selected &&
                                  styles.requestOptionSelected,
                              ]}
                              activeOpacity={
                                0.85
                              }
                              onPress={() =>
                                setSelectedRequestId(
                                  request.id
                                )
                              }
                            >
                              <View
                                style={
                                  styles.requestOptionHeader
                                }
                              >
                                <View
                                  style={
                                    styles.requestBloodBadge
                                  }
                                >
                                  <MaterialIcons
                                    name="bloodtype"
                                    size={17}
                                    color={
                                      COLORS.redButton
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.requestBloodText
                                    }
                                  >
                                    {
                                      request.blood_type
                                    }
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.matchBadge
                                  }
                                >
                                  <MaterialIcons
                                    name="check-circle"
                                    size={13}
                                    color={
                                      COLORS.green
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.matchBadgeText
                                    }
                                  >
                                    Match
                                  </Text>
                                </View>

                                <MaterialIcons
                                  name={
                                    selected
                                      ? 'radio-button-checked'
                                      : 'radio-button-unchecked'
                                  }
                                  size={21}
                                  color={
                                    selected
                                      ? COLORS.redButton
                                      : COLORS.lightMuted
                                  }
                                />
                              </View>

                              <Text
                                numberOfLines={
                                  1
                                }
                                style={
                                  styles.requestFacility
                                }
                              >
                                {
                                  request.facility_name
                                }
                              </Text>

                              <View
                                style={
                                  styles.requestMetaRow
                                }
                              >
                                <View
                                  style={
                                    styles.requestMetaItem
                                  }
                                >
                                  <MaterialIcons
                                    name="water-drop"
                                    size={13}
                                    color={
                                      COLORS.muted
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.requestMetaText
                                    }
                                  >
                                    {request.units_needed}{' '}
                                    {request.units_needed ===
                                    1
                                      ? 'unit'
                                      : 'units'}
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.requestMetaDot
                                  }
                                />

                                <View
                                  style={
                                    styles.requestMetaItem
                                  }
                                >
                                  <MaterialIcons
                                    name={
                                      request.urgency ===
                                      'urgent'
                                        ? 'bolt'
                                        : 'schedule'
                                    }
                                    size={13}
                                    color={
                                      request.urgency ===
                                      'urgent'
                                        ? COLORS.orange
                                        : COLORS.muted
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.requestMetaText
                                    }
                                  >
                                    {formatNeededBy(
                                      request
                                    )}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </ScrollView>

                    {selectedRequest ? (
                      <View
                        style={
                          styles.invitationNotice
                        }
                      >
                        <MaterialIcons
                          name="check-circle-outline"
                          size={16}
                          color={
                            COLORS.green
                          }
                        />

                        <Text
                          style={
                            styles.invitationNoticeText
                          }
                        >
                          The blood types are compatible. The donor can review this request
                          and choose whether to accept or decline.
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.sendInvitationButton,

                        (
                          !selectedRequestId ||
                          sendingInvitation
                        ) &&
                          styles.sendInvitationButtonDisabled,
                      ]}
                      activeOpacity={
                        0.85
                      }
                      disabled={
                        !selectedRequestId ||
                        sendingInvitation
                      }
                      onPress={
                        handleSendInvitation
                      }
                    >
                      {sendingInvitation ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.white
                          }
                        />
                      ) : (
                        <>
                          <MaterialIcons
                            name="send"
                            size={18}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.sendInvitationText
                            }
                          >
                            Send Request
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </Modal>

          {/* ==================================================
              HEMO-HERO ACTION POPUP
          ================================================== */}

          <Modal
            visible={
              actionPopup.visible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeActionPopup
            }
          >
            <View
              style={
                styles.actionPopupOverlay
              }
            >
              <View
                style={
                  styles.actionPopupCard
                }
              >
                <View
                  style={[
                    styles.actionPopupIcon,

                    actionPopup.variant ===
                      'success' &&
                      styles.actionPopupIconSuccess,

                    actionPopup.variant ===
                      'warning' &&
                      styles.actionPopupIconWarning,

                    actionPopup.variant ===
                      'error' &&
                      styles.actionPopupIconError,
                  ]}
                >
                  <MaterialIcons
                    name={
                      actionPopup.variant ===
                      'success'
                        ? 'check-circle-outline'
                        : actionPopup.variant ===
                            'warning'
                          ? 'warning-amber'
                          : actionPopup.variant ===
                              'error'
                            ? 'error-outline'
                            : 'info-outline'
                    }
                    size={31}
                    color={
                      actionPopup.variant ===
                      'success'
                        ? COLORS.green
                        : actionPopup.variant ===
                            'warning'
                          ? COLORS.orange
                          : COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.actionPopupTitle
                  }
                >
                  {
                    actionPopup.title
                  }
                </Text>

                <Text
                  style={
                    styles.actionPopupMessage
                  }
                >
                  {
                    actionPopup.message
                  }
                </Text>

                <TouchableOpacity
                  style={
                    styles.actionPopupButton
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={
                    closeActionPopup
                  }
                >
                  <Text
                    style={
                      styles.actionPopupButtonText
                    }
                  >
                    Okay
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// SUMMARY ITEM
// ============================================================

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  label:
    string;

  value:
    string;
}) {
  return (
    <View
      style={
        styles.summaryItem
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <MaterialIcons
          name={
            icon
          }
          size={18}
          color={
            COLORS.redButton
          }
        />
      </View>

      <View
        style={
          styles.summaryText
        }
      >
        <Text
          style={
            styles.summaryValue
          }
        >
          {value}
        </Text>

        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
  title,
}: {
  title:
    string;
}) {
  return (
    <Text
      style={
        styles.sectionTitle
      }
    >
      {title}
    </Text>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  icon,
  label,
  value,
  iconColor =
    COLORS.redButton,
  iconBackground =
    COLORS.pinkSoft,
  valueColor =
    COLORS.black,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  label:
    string;

  value:
    string;

  iconColor?:
    string;

  iconBackground?:
    string;

  valueColor?:
    string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={[
          styles.infoIcon,

          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <MaterialIcons
          name={
            icon
          }
          size={18}
          color={
            iconColor
          }
        />
      </View>

      <View
        style={
          styles.infoTextContainer
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,

            {
              color:
                valueColor,
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
// DIVIDER
// ============================================================

function Divider() {
  return (
    <View
      style={
        styles.divider
      }
    />
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#242424'
          : COLORS.page,
    },

    phone: {
      width:
        Platform.OS ===
        'web'
          ? 440
          : '100%',

      height:
        '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.redDark,
    },

    header: {
      paddingHorizontal:
        16,

      paddingBottom:
        13,

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        150,

      height:
        150,

      borderRadius:
        75,

      left:
        -75,

      top:
        -76,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        170,

      height:
        170,

      borderRadius:
        85,

      right:
        -80,

      top:
        -85,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    topBar: {
      height:
        44,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    headerAction: {
      width:
        36,

      height:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,
    },

    profileHeader: {
      marginTop:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    avatar: {
      width:
        66,

      height:
        66,

      borderRadius:
        33,

      borderWidth:
        3,

      borderColor:
        COLORS.white,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5DFDF',
    },

    avatarImage: {
      width:
        '100%',

      height:
        '100%',
    },

    profileHeaderContent: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        12,
    },

    donorName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,

      lineHeight:
        26,
    },

    locationRow: {
      marginTop:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        2,
    },

    locationText: {
      flex:
        1,

      color:
        'rgba(255,255,255,0.86)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },

    verifiedBadge: {
      alignSelf:
        'flex-start',

      minHeight:
        23,

      marginTop:
        5,

      paddingHorizontal:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      borderRadius:
        7,

      backgroundColor:
        COLORS.greenSoft,
    },

    verifiedBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    summaryCard: {
      minHeight:
        66,

      marginTop:
        12,

      paddingVertical:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(255,255,255,0.35)',

      borderRadius:
        14,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        5,

      elevation:
        3,
    },

    summaryCardStacked: {
      minHeight:
        58,

      marginTop:
        8,
    },

    summaryItem: {
      flex:
        1,

      paddingHorizontal:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    summaryIcon: {
      width:
        34,

      height:
        34,

      marginRight:
        8,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    summaryText: {
      flex:
        1,

      minWidth:
        0,
    },

    summaryValue: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    summaryLabel: {
      marginTop:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11,
    },

    summaryDivider: {
      width:
        StyleSheet.hairlineWidth,

      height:
        34,

      backgroundColor:
        COLORS.border,
    },

    content: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal:
        16,

      paddingTop:
        12,

      paddingBottom:
        32,
    },

    sectionTitle: {
      marginLeft:
        2,

      marginBottom:
        7,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    infoCard: {
      marginBottom:
        17,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        15,

      backgroundColor:
        COLORS.white,
    },

    infoRow: {
      minHeight:
        58,

      paddingVertical:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoIcon: {
      width:
        36,

      height:
        36,

      marginRight:
        11,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    infoTextContainer: {
      flex:
        1,

      minWidth:
        0,
    },

    infoLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    infoValue: {
      marginTop:
        2,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,

      lineHeight:
        18,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft:
        47,

      backgroundColor:
        COLORS.border,
    },

    requestHelpButton: {
      height:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      borderRadius:
        12,

      backgroundColor:
        COLORS.redButton,
    },

    requestHelpButtonDisabled: {
      backgroundColor:
        '#B8B8BC',
    },

    requestHelpText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    helperRow: {
      marginTop:
        8,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,
    },

    helperText: {
      flexShrink:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    bottomSpacing: {
      height:
        10,
    },

    stateCard: {
      minHeight:
        300,

      paddingHorizontal:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    stateErrorIcon: {
      width:
        58,

      height:
        58,

      marginBottom:
        11,

      borderRadius:
        29,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    stateTitle: {
      marginTop:
        10,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        15,

      textAlign:
        'center',
    },

    stateDescription: {
      maxWidth:
        280,

      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    retryButton: {
      minHeight:
        40,

      marginTop:
        15,

      paddingHorizontal:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderRadius:
        10,

      backgroundColor:
        COLORS.redButton,
    },

    retryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    modalOverlay: {
      flex:
        1,

      paddingHorizontal:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    modalCard: {
      width:
        '100%',

      maxWidth:
        360,

      maxHeight:
        '82%',

      padding:
        18,

      borderRadius:
        20,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 7,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        16,

      elevation:
        10,
    },

    modalHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    modalHeaderIcon: {
      width:
        42,

      height:
        42,

      marginRight:
        10,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    modalHeaderText: {
      flex:
        1,

      paddingTop:
        1,
    },

    modalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,
    },

    modalSubtitle: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    modalClose: {
      width:
        32,

      height:
        32,

      marginLeft:
        7,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.graySoft,
    },

    modalState: {
      minHeight:
        190,

      paddingVertical:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    modalStateIcon: {
      width:
        52,

      height:
        52,

      marginBottom:
        9,

      borderRadius:
        26,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    mismatchIcon: {
      width:
        52,

      height:
        52,

      marginBottom:
        9,

      borderRadius:
        26,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.orangeSoft,
    },

    modalStateTitle: {
      marginTop:
        8,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    modalStateText: {
      maxWidth:
        270,

      marginTop:
        4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    boldStateText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',
    },

    matchRuleCard: {
      width:
        '100%',

      marginTop:
        13,

      padding:
        10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        7,

      borderRadius:
        10,

      backgroundColor:
        COLORS.pinkSoft,
    },

    matchRuleText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    modalSecondaryButton: {
      minHeight:
        38,

      marginTop:
        14,

      paddingHorizontal:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderWidth:
        1,

      borderColor:
        '#E3BABA',

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,
    },

    modalSecondaryButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    createRequestButton: {
      minHeight:
        42,

      marginTop:
        15,

      paddingHorizontal:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      borderRadius:
        10,

      backgroundColor:
        COLORS.redButton,
    },

    createRequestButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    chooseRequestLabel: {
      marginTop:
        18,

      marginBottom:
        8,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,

      letterSpacing:
        0.8,
    },

    requestList: {
      maxHeight:
        270,
    },

    requestOption: {
      padding:
        13,

      marginBottom:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        14,

      backgroundColor:
        COLORS.white,
    },

    requestOptionSelected: {
      borderColor:
        '#E6A5A7',

      backgroundColor:
        '#FFF8F8',
    },

    requestOptionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    requestBloodBadge: {
      minHeight:
        30,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      borderRadius:
        9,

      backgroundColor:
        COLORS.pinkSoft,
    },

    requestBloodText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        13.5,
    },

    matchBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      marginRight:
        'auto',

      paddingHorizontal:
        6,

      minHeight:
        24,

      borderRadius:
        7,

      backgroundColor:
        COLORS.greenSoft,
    },

    matchBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    requestFacility: {
      marginTop:
        9,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    requestMetaRow: {
      marginTop:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        6,
    },

    requestMetaItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },

    requestMetaText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    requestMetaDot: {
      width:
        3,

      height:
        3,

      borderRadius:
        2,

      backgroundColor:
        '#C5C5C8',
    },

    invitationNotice: {
      marginTop:
        5,

      padding:
        10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        6,

      borderRadius:
        10,

      backgroundColor:
        COLORS.greenSoft,
    },

    invitationNoticeText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    sendInvitationButton: {
      minHeight:
        46,

      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      borderRadius:
        11,

      backgroundColor:
        COLORS.redButton,
    },

    sendInvitationButtonDisabled: {
      opacity:
        0.55,
    },

    sendInvitationText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    // ========================================================
    // ACTION POPUP
    // ========================================================

    actionPopupOverlay: {
      flex:
        1,

      paddingHorizontal:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    actionPopupCard: {
      width:
        '100%',

      maxWidth:
        360,

      paddingHorizontal:
        20,

      paddingTop:
        22,

      paddingBottom:
        18,

      borderRadius:
        22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        18,

      elevation:
        10,
    },

    actionPopupIcon: {
      width:
        56,

      height:
        56,

      alignSelf:
        'center',

      marginBottom:
        13,

      borderRadius:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        COLORS.greenSoft,
    },

    actionPopupIconWarning: {
      backgroundColor:
        COLORS.orangeSoft,
    },

    actionPopupIconError: {
      backgroundColor:
        COLORS.pinkSoft,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,

      lineHeight:
        22,

      textAlign:
        'center',
    },

    actionPopupMessage: {
      marginTop:
        8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      lineHeight:
        20,

      textAlign:
        'center',
    },

    actionPopupButton: {
      height:
        45,

      marginTop:
        19,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },
  });