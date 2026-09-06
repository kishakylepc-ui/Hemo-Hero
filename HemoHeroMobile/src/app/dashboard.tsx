import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import {
  getCurrentUser,
  getMyActiveBloodRequest,
} from '../lib/api';

import type {
  BloodRequest,
} from '../lib/api';

import {
  getNearbyBloodRequests,
} from '../lib/nearbyRequests';

import type {
  NearbyBloodRequest,
} from '../lib/nearbyRequests';

import {
  getMyDonorApplication,
} from '../lib/donorApplication';

import type {
  DonorApplication,
} from '../lib/donorApplication';

import {
  clearSession,
  getAccessToken,
} from '../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redDeep: '#A90909',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',
  card: '#FFFFFF',

  muted: '#666666',
  lightMuted: '#969696',

  border: '#E4D7D7',

  green: '#159447',
  orange: '#DF721D',

  pinkLight: '#FFF0F0',
};

// ============================================================
// BLOOD TYPES
// ============================================================

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// ============================================================
// DASHBOARD
// ============================================================

export default function DashboardScreen() {
  const {
    height,
  } = useWindowDimensions();

  const isSmallPhone =
    Platform.OS !== 'web' &&
    height <= 844;

  // ==========================================================
  // PROFILE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<any>(null);

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

  // ==========================================================
  // ACTIVE REQUEST
  // ==========================================================

  const [
    activeRequest,
    setActiveRequest,
  ] = useState<BloodRequest | null>(
    null
  );

  const [
    loadingActiveRequest,
    setLoadingActiveRequest,
  ] = useState(true);

  const [
    activeRequestError,
    setActiveRequestError,
  ] = useState('');

  // ==========================================================
  // NEARBY REQUESTS
  // ==========================================================

  const [
    nearbyRequests,
    setNearbyRequests,
  ] = useState<
    NearbyBloodRequest[]
  >([]);

  const [
    loadingNearbyRequests,
    setLoadingNearbyRequests,
  ] = useState(true);

  const [
    nearbyRequestError,
    setNearbyRequestError,
  ] = useState('');

  // ==========================================================
  // DONOR APPLICATION
  // ==========================================================

  const [
    donorApplication,
    setDonorApplication,
  ] =
    useState<DonorApplication | null>(
      null
    );

  const [
    loadingDonorApplication,
    setLoadingDonorApplication,
  ] = useState(true);

  // ==========================================================
  // DONOR SEARCH
  // ==========================================================

  const [
    selectedBloodType,
    setSelectedBloodType,
  ] = useState('');

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard =
    useCallback(async () => {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      // ======================================================
      // PROFILE
      // ======================================================

      try {
        setLoadingProfile(
          true
        );

        const data =
          await getCurrentUser(
            token
          );

        if (!data?.user) {
          throw new Error(
            'Unable to load profile.'
          );
        }

        setProfile(
          data.user
        );
      } catch (error) {
        console.log(
          'DASHBOARD PROFILE ERROR:',
          error
        );
      } finally {
        setLoadingProfile(
          false
        );
      }

      // ======================================================
      // ACTIVE REQUEST
      // ======================================================

      try {
        setLoadingActiveRequest(
          true
        );

        setActiveRequestError(
          ''
        );

        const data =
          await getMyActiveBloodRequest(
            token
          );

        setActiveRequest(
          data?.request ||
            null
        );
      } catch (error) {
        console.log(
          'DASHBOARD ACTIVE REQUEST ERROR:',
          error
        );

        setActiveRequest(
          null
        );

        setActiveRequestError(
          error instanceof Error
            ? error.message
            : 'Unable to load active request.'
        );
      } finally {
        setLoadingActiveRequest(
          false
        );
      }

      // ======================================================
      // DONOR APPLICATION
      // ======================================================

      try {
        setLoadingDonorApplication(
          true
        );

        const donorData =
          await getMyDonorApplication(
            token
          );

        setDonorApplication(
          donorData?.application ||
            null
        );
      } catch (error) {
        console.log(
          'DASHBOARD DONOR APPLICATION ERROR:',
          error
        );

        setDonorApplication(
          null
        );
      } finally {
        setLoadingDonorApplication(
          false
        );
      }

      // ======================================================
      // NEARBY REQUESTS
      // ======================================================

      await loadNearbyRequests(
        token
      );
    }, []);

  // ==========================================================
  // REFRESH WHEN SCREEN FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // ==========================================================
  // LOAD NEARBY REQUESTS
  // ==========================================================

  async function loadNearbyRequests(
    token?: string
  ) {
    try {
      setLoadingNearbyRequests(
        true
      );

      setNearbyRequestError(
        ''
      );

      const accessToken =
        token ||
        await getAccessToken();

      if (!accessToken) {
        router.replace('/');

        return;
      }

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
        permission.status !==
        'granted'
      ) {
        setNearbyRequestError(
          'Allow location access to see blood requests near you.'
        );

        setNearbyRequests(
          []
        );

        return;
      }

      const location =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location.Accuracy
                .Balanced,
          });

      const latitude =
        location.coords
          .latitude;

      const longitude =
        location.coords
          .longitude;

      const data =
        await getNearbyBloodRequests(
          accessToken,
          latitude,
          longitude,
          25,
          3
        );

      setNearbyRequests(
        data.requests
      );
    } catch (error) {
      console.log(
        'DASHBOARD NEARBY REQUEST ERROR:',
        error
      );

      setNearbyRequests(
        []
      );

      setNearbyRequestError(
        error instanceof Error
          ? error.message
          : 'Unable to load nearby blood requests.'
      );
    } finally {
      setLoadingNearbyRequests(
        false
      );
    }
  }

  // ==========================================================
  // PROFILE DISPLAY
  // ==========================================================

  const displayName =
    loadingProfile
      ? 'Loading...'
      : [
          profile?.first_name,
          profile?.last_name,
        ]
          .filter(Boolean)
          .join(' ') ||
        'Hemo-Hero User';

  const displayLocation =
    [
      profile?.city,
      profile?.province,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Location not added';

  const profilePhotoUrl =
    profile?.profile_photo_url ||
    '';

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
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
  // REQUEST NUMBER
  // ==========================================================

  function getRequestNumber(
    id: string
  ) {
    return id
      .replace(/-/g, '')
      .slice(0, 6)
      .toUpperCase();
  }

  // ==========================================================
  // TIME AGO
  // ==========================================================

  function getTimeAgo(
    createdAt: string
  ) {
    const created =
      new Date(createdAt);

    const now =
      new Date();

    const difference =
      now.getTime() -
      created.getTime();

    const minutes =
      Math.floor(
        difference /
          60000
      );

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    if (hours < 24) {
      return `${hours} ${
        hours === 1
          ? 'hour'
          : 'hours'
      } ago`;
    }

    const days =
      Math.floor(
        hours / 24
      );

    return `${days} ${
      days === 1
        ? 'day'
        : 'days'
    } ago`;
  }

  // ==========================================================
  // FORMAT NEEDED
  // ==========================================================

  function formatNeededBy(
    urgency: string,
    neededDate?: string | null,
    neededTime?: string | null
  ) {
    if (
      urgency === 'urgent'
    ) {
      return 'As soon as possible';
    }

    if (!neededDate) {
      return 'Date not specified';
    }

    const date =
      new Date(
        `${neededDate}T00:00:00`
      );

    const dateText =
      date.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );

    if (!neededTime) {
      return dateText;
    }

    const [
      hourText,
      minuteText,
    ] =
      neededTime.split(':');

    const time =
      new Date();

    time.setHours(
      Number(hourText),
      Number(minuteText),
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
  // ACTIVE REQUEST
  // ==========================================================

  function handleViewActiveRequest() {
    if (!activeRequest) {
      return;
    }

    router.push(
      `/blood-request/${activeRequest.id}` as any
    );
  }

  function handleCreateRequest() {
    if (activeRequest) {
      handleViewActiveRequest();

      return;
    }

    router.push(
      '/blood-request/create'
    );
  }

  // ==========================================================
  // NEARBY REQUEST
  // ==========================================================

  function handleNearbyRequest(
    request: NearbyBloodRequest
  ) {
    router.push(
      `/blood-request/donor/${request.id}` as any
    );
  }

  // ==========================================================
  // DONOR APPLICATION ACTION
  // ==========================================================

  function handleDonorAction() {
    if (
      loadingDonorApplication
    ) {
      return;
    }

    // --------------------------------------------------------
    // NOT REGISTERED
    // --------------------------------------------------------

    if (!donorApplication) {
      router.push(
        '/donor-application/blood' as any
      );

      return;
    }

    // --------------------------------------------------------
    // PENDING
    // --------------------------------------------------------

    if (
      donorApplication.status ===
      'pending'
    ) {
      router.push({
        pathname:
          '/donor-application/success',

        params: {
          status:
            'pending',
        },
      } as any);

      return;
    }

    // --------------------------------------------------------
    // APPROVED
    // --------------------------------------------------------

    if (
      donorApplication.status ===
      'approved'
    ) {
      showMessage(
        'Verified Donor',
        'Your donor account has been verified. You can now offer to donate to compatible blood requests.'
      );

      return;
    }

    // --------------------------------------------------------
    // REJECTED / WITHDRAWN
    // --------------------------------------------------------

    router.push(
      '/donor-application/blood' as any
    );
  }

  // ==========================================================
  // DONOR CARD CONTENT
  // ==========================================================

  function getDonorCardTitle() {
    if (
      loadingDonorApplication
    ) {
      return 'Donor Status';
    }

    if (!donorApplication) {
      return 'Become a Donor';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Donor Application';

      case 'approved':
        return 'Verified Donor';

      case 'rejected':
        return 'Donor Application';

      case 'withdrawn':
        return 'Become a Donor';

      default:
        return 'Become a Donor';
    }
  }

  function getDonorCardSubtitle() {
    if (
      loadingDonorApplication
    ) {
      return 'Checking your donor status...';
    }

    if (!donorApplication) {
      return 'Save lives in your community';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Your application is under review';

      case 'approved':
        return 'You are ready to help save lives';

      case 'rejected':
        return 'Your application was not approved';

      case 'withdrawn':
        return 'You can apply again when ready';

      default:
        return 'Save lives in your community';
    }
  }

  function getDonorButtonText() {
    if (
      loadingDonorApplication
    ) {
      return 'Checking Status...';
    }

    if (!donorApplication) {
      return 'Apply as a Donor';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Application Under Review';

      case 'approved':
        return 'Verified Donor';

      case 'rejected':
        return 'Reapply as a Donor';

      case 'withdrawn':
        return 'Apply as a Donor';

      default:
        return 'Apply as a Donor';
    }
  }

  // ==========================================================
  // FIND DONORS
  // ==========================================================

  function handleSearchDonors() {
    if (!selectedBloodType) {
      showMessage(
        'Select Blood Type',
        'Please select the blood type you need.'
      );

      return;
    }

    showMessage(
      'Find Compatible Donors',
      `Donor matching for ${selectedBloodType} will be connected next.`
    );
  }

  // ==========================================================
  // COMING SOON
  // ==========================================================

  function handleComingSoon(
    page: string
  ) {
    showMessage(
      page,
      `${page} will be connected as we continue building Hemo-Hero.`
    );
  }

  // ==========================================================
  // PROFILE
  // ==========================================================

  function handleProfile() {
    if (
      Platform.OS === 'web'
    ) {
      handleComingSoon(
        'Profile'
      );

      return;
    }

    Alert.alert(
      'Profile',
      'The full Profile screen will be built later.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style:
            'destructive',
          onPress:
            handleLogout,
        },
      ]
    );
  }

  async function handleLogout() {
    await clearSession();

    router.replace('/');
  }

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
              '#CF1115',
              COLORS.redDark,
            ]}
            style={[
              styles.header,

              isSmallPhone &&
                styles.headerSmall,
            ]}
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
                styles.headerContent
              }
            >
              <View
                style={
                  styles.greetingContainer
                }
              >
                <Text
                  style={
                    styles.helloText
                  }
                >
                  Hello,
                </Text>

                <Text
                  numberOfLines={1}
                  style={
                    styles.userName
                  }
                >
                  {displayName}
                </Text>

                <View
                  style={
                    styles.locationPill
                  }
                >
                  <MaterialIcons
                    name="location-on"
                    size={13}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    numberOfLines={1}
                    style={
                      styles.locationText
                    }
                  >
                    {displayLocation}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.avatar
                }
                activeOpacity={
                  0.8
                }
                onPress={
                  handleProfile
                }
              >
                {profilePhotoUrl ? (
                  <Image
                    source={{
                      uri:
                        profilePhotoUrl,
                    }}
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="person"
                    size={29}
                    color={
                      COLORS.redDark
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ==================================================
              EMERGENCY
          ================================================== */}

          <LinearGradient
            colors={[
              '#960808',
              '#F20B0B',
            ]}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 0,
            }}
            style={
              styles.emergencySection
            }
          >
            <View
              style={
                styles.emergencyRow
              }
            >
              <View
                style={
                  styles.emergencyIcon
                }
              >
                <MaterialIcons
                  name={
                    activeRequest
                      ? 'monitor-heart'
                      : 'bolt'
                  }
                  size={30}
                  color={
                    COLORS.white
                  }
                />
              </View>

              <View
                style={
                  styles.emergencyContent
                }
              >
                <Text
                  style={
                    styles.emergencyTitle
                  }
                >
                  {activeRequest
                    ? 'ACTIVE BLOOD REQUEST'
                    : 'NEED BLOOD NOW?'}
                </Text>

                <Text
                  style={
                    styles.emergencyDescription
                  }
                >
                  {activeRequest
                    ? 'You currently have an active blood request. View its details and status below.'
                    : 'Create an emergency request and connect with compatible donors nearby.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={
                styles.emergencyButton
              }
              activeOpacity={
                0.85
              }
              onPress={
                handleCreateRequest
              }
            >
              <Text
                style={
                  styles.emergencyButtonText
                }
              >
                {activeRequest
                  ? 'View Active Request'
                  : 'Create Blood Request'}
              </Text>

              <MaterialIcons
                name="arrow-forward"
                size={19}
                color={
                  COLORS.redDark
                }
              />
            </TouchableOpacity>
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
            bounces={false}
          >
            {/* ==================================================
                ACTIVE REQUEST
            ================================================== */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionTitleRow
                }
              >
                <MaterialIcons
                  name="monitor-heart"
                  size={21}
                  color={
                    COLORS.black
                  }
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Active Request
                </Text>
              </View>

              {activeRequest ? (
                <TouchableOpacity
                  activeOpacity={
                    0.7
                  }
                  onPress={
                    handleViewActiveRequest
                  }
                >
                  <Text
                    style={
                      styles.viewAllText
                    }
                  >
                    View
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingActiveRequest ? (
              <View
                style={
                  styles.emptyRequestCard
                }
              >
                <View
                  style={
                    styles.emptyRequestIcon
                  }
                >
                  <MaterialIcons
                    name="hourglass-empty"
                    size={25}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <View
                  style={
                    styles.emptyRequestText
                  }
                >
                  <Text
                    style={
                      styles.emptyRequestTitle
                    }
                  >
                    Loading request...
                  </Text>

                  <Text
                    style={
                      styles.emptyRequestDescription
                    }
                  >
                    Checking your current blood request.
                  </Text>
                </View>
              </View>
            ) : activeRequest ? (
              <TouchableOpacity
                style={
                  styles.activeRequestCard
                }
                activeOpacity={
                  0.9
                }
                onPress={
                  handleViewActiveRequest
                }
              >
                <View
                  style={
                    styles.activeRequestHeader
                  }
                >
                  <View
                    style={
                      styles.activeStatusRow
                    }
                  >
                    <View
                      style={
                        styles.activeDot
                      }
                    />

                    <Text
                      style={
                        styles.activeRequestTitle
                      }
                    >
                      Request #
                      {getRequestNumber(
                        activeRequest.id
                      )}{' '}
                      • Active
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.requestTimeText
                    }
                  >
                    {getTimeAgo(
                      activeRequest.created_at
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.activeRequestMain
                  }
                >
                  <View
                    style={
                      styles.bloodBadge
                    }
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={18}
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={
                        styles.bloodBadgeText
                      }
                    >
                      {
                        activeRequest.blood_type
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.activeRequestInfo
                    }
                  >
                    <View
                      style={
                        styles.requestInfoRow
                      }
                    >
                      <MaterialIcons
                        name="local-hospital"
                        size={15}
                        color={
                          COLORS.muted
                        }
                      />

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.requestInfoText
                        }
                      >
                        {
                          activeRequest.facility_name
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.requestInfoRow
                      }
                    >
                      <MaterialIcons
                        name="water-drop"
                        size={15}
                        color={
                          COLORS.muted
                        }
                      />

                      <Text
                        style={
                          styles.requestInfoText
                        }
                      >
                        {
                          activeRequest.units_needed
                        }{' '}
                        {activeRequest.units_needed ===
                        1
                          ? 'unit / bag needed'
                          : 'units / bags needed'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.requestInfoRow
                      }
                    >
                      <MaterialIcons
                        name={
                          activeRequest.urgency ===
                          'urgent'
                            ? 'bolt'
                            : 'schedule'
                        }
                        size={15}
                        color={
                          activeRequest.urgency ===
                          'urgent'
                            ? COLORS.redButton
                            : COLORS.muted
                        }
                      />

                      <Text
                        style={[
                          styles.requestInfoText,

                          activeRequest.urgency ===
                            'urgent' &&
                            styles.urgentRequestText,
                        ]}
                      >
                        {formatNeededBy(
                          activeRequest.urgency,
                          activeRequest.needed_date,
                          activeRequest.needed_time
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={
                    styles.requestProgress
                  }
                >
                  <View
                    style={
                      styles.progressItem
                    }
                  >
                    <View
                      style={
                        styles.progressDotActive
                      }
                    />

                    <Text
                      style={
                        styles.progressTextActive
                      }
                    >
                      Posted
                    </Text>
                  </View>

                  <View
                    style={
                      styles.progressLine
                    }
                  />

                  <View
                    style={
                      styles.progressItem
                    }
                  >
                    <View
                      style={
                        styles.progressDotInactive
                      }
                    />

                    <Text
                      style={
                        styles.progressTextInactive
                      }
                    >
                      Donor Found
                    </Text>
                  </View>

                  <View
                    style={
                      styles.progressLine
                    }
                  />

                  <View
                    style={
                      styles.progressItem
                    }
                  >
                    <View
                      style={
                        styles.progressDotInactive
                      }
                    />

                    <Text
                      style={
                        styles.progressTextInactive
                      }
                    >
                      Fulfilled
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.viewRequestButton
                  }
                >
                  <Text
                    style={
                      styles.viewRequestButtonText
                    }
                  >
                    View My Request
                  </Text>

                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={
                      COLORS.white
                    }
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={
                  styles.emptyRequestCard
                }
              >
                <View
                  style={
                    styles.emptyRequestIcon
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

                <View
                  style={
                    styles.emptyRequestText
                  }
                >
                  <Text
                    style={
                      styles.emptyRequestTitle
                    }
                  >
                    No active blood request
                  </Text>

                  <Text
                    style={
                      styles.emptyRequestDescription
                    }
                  >
                    Your current emergency request will appear here.
                  </Text>
                </View>
              </View>
            )}

            {activeRequestError ? (
              <TouchableOpacity
                style={
                  styles.requestErrorCard
                }
                onPress={
                  loadDashboard
                }
              >
                <MaterialIcons
                  name="error-outline"
                  size={18}
                  color={
                    COLORS.redButton
                  }
                />

                <View
                  style={
                    styles.requestErrorContent
                  }
                >
                  <Text
                    style={
                      styles.requestErrorTitle
                    }
                  >
                    Unable to load active request
                  </Text>

                  <Text
                    style={
                      styles.requestErrorText
                    }
                  >
                    Tap here to try again.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* ==================================================
                FIND DONORS
            ================================================== */}

            <View
              style={
                styles.findDonorCard
              }
            >
              <View
                style={
                  styles.findDonorHeader
                }
              >
                <View
                  style={
                    styles.findDonorTitleRow
                  }
                >
                  <View
                    style={
                      styles.dropIcon
                    }
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={20}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.findDonorTextContainer
                    }
                  >
                    <Text
                      style={
                        styles.findDonorTitle
                      }
                    >
                      Find Compatible Donors
                    </Text>

                    <Text
                      style={
                        styles.findDonorSubtitle
                      }
                    >
                      Looking for a specific blood type?
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.compatibilityChip
                  }
                >
                  <MaterialIcons
                    name="info-outline"
                    size={12}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.compatibilityText
                    }
                  >
                    Compatibility
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.smallLabel
                }
              >
                Select Blood Type
              </Text>

              <View
                style={
                  styles.bloodGrid
                }
              >
                {BLOOD_TYPES.map(
                  type => {
                    const selected =
                      selectedBloodType ===
                      type;

                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.bloodTypeButton,

                          selected &&
                            styles.bloodTypeButtonSelected,
                        ]}
                        activeOpacity={
                          0.8
                        }
                        onPress={() =>
                          setSelectedBloodType(
                            current =>
                              current ===
                              type
                                ? ''
                                : type
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.bloodTypeText,

                            selected &&
                              styles.bloodTypeTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <TouchableOpacity
                style={
                  styles.searchButton
                }
                activeOpacity={
                  0.85
                }
                onPress={
                  handleSearchDonors
                }
              >
                <MaterialIcons
                  name="search"
                  size={20}
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.searchButtonText
                  }
                >
                  Find Donors
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                NEARBY REQUESTS
            ================================================== */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionTitleRow
                }
              >
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Blood Requests Near You
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={
                  0.7
                }
                onPress={() =>
                  handleComingSoon(
                    'Nearby Blood Requests'
                  )
                }
              >
                <Text
                  style={
                    styles.viewAllText
                  }
                >
                  View all →
                </Text>
              </TouchableOpacity>
            </View>

            {loadingNearbyRequests ? (
              <View
                style={
                  styles.nearbyEmptyCard
                }
              >
                <View
                  style={
                    styles.nearbyEmptyIcon
                  }
                >
                  <MaterialIcons
                    name="location-searching"
                    size={29}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.nearbyEmptyTitle
                  }
                >
                  Finding nearby requests
                </Text>

                <Text
                  style={
                    styles.nearbyEmptyDescription
                  }
                >
                  Checking active blood requests within 25 km of your location.
                </Text>
              </View>
            ) : nearbyRequestError ? (
              <TouchableOpacity
                style={
                  styles.nearbyEmptyCard
                }
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  loadNearbyRequests()
                }
              >
                <View
                  style={
                    styles.nearbyEmptyIcon
                  }
                >
                  <MaterialIcons
                    name="location-off"
                    size={29}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.nearbyEmptyTitle
                  }
                >
                  Unable to show nearby requests
                </Text>

                <Text
                  style={
                    styles.nearbyEmptyDescription
                  }
                >
                  {nearbyRequestError}
                </Text>

                <Text
                  style={
                    styles.retryNearbyText
                  }
                >
                  Tap to try again
                </Text>
              </TouchableOpacity>
            ) : nearbyRequests.length ===
              0 ? (
              <View
                style={
                  styles.nearbyEmptyCard
                }
              >
                <View
                  style={
                    styles.nearbyEmptyIcon
                  }
                >
                  <MaterialIcons
                    name="location-searching"
                    size={29}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.nearbyEmptyTitle
                  }
                >
                  No nearby active requests
                </Text>

                <Text
                  style={
                    styles.nearbyEmptyDescription
                  }
                >
                  There are currently no blood requests from other users within 25 km.
                </Text>
              </View>
            ) : (
              <View>
                {nearbyRequests.map(
                  request => (
                    <TouchableOpacity
                      key={
                        request.id
                      }
                      style={
                        styles.nearbyRequestCard
                      }
                      activeOpacity={
                        0.88
                      }
                      onPress={() =>
                        handleNearbyRequest(
                          request
                        )
                      }
                    >
                      <View
                        style={
                          styles.nearbyRequestTop
                        }
                      >
                        <View
                          style={
                            styles.nearbyBloodBadge
                          }
                        >
                          <Text
                            style={
                              styles.nearbyBloodText
                            }
                          >
                            {
                              request.blood_type
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.nearbyMainInfo
                          }
                        >
                          <Text
                            numberOfLines={
                              1
                            }
                            style={
                              styles.nearbyFacilityName
                            }
                          >
                            {
                              request.facility_name
                            }
                          </Text>

                          <View
                            style={
                              styles.nearbyDistanceRow
                            }
                          >
                            <MaterialIcons
                              name="location-on"
                              size={13}
                              color={
                                COLORS.muted
                              }
                            />

                            <Text
                              style={
                                styles.nearbyDistanceText
                              }
                            >
                              {request.distance_km.toFixed(
                                1
                              )}{' '}
                              km away
                            </Text>

                            <Text
                              style={
                                styles.dotSeparator
                              }
                            >
                              •
                            </Text>

                            <Text
                              style={
                                styles.nearbyTimeText
                              }
                            >
                              {getTimeAgo(
                                request.created_at
                              )}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.urgencyPill,

                            request.urgency ===
                              'urgent'
                              ? styles.urgencyPillUrgent
                              : styles.urgencyPillNeeded,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={12}
                            color={
                              request.urgency ===
                              'urgent'
                                ? COLORS.white
                                : COLORS.orange
                            }
                          />

                          <Text
                            style={[
                              styles.urgencyPillText,

                              request.urgency !==
                                'urgent' &&
                                styles.urgencyPillTextNeeded,
                            ]}
                          >
                            {request.urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Needed'}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.nearbyDetailsRow
                        }
                      >
                        <View
                          style={
                            styles.nearbyDetail
                          }
                        >
                          <MaterialIcons
                            name="water-drop"
                            size={15}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.nearbyDetailText
                            }
                          >
                            {
                              request.units_needed
                            }{' '}
                            {request.units_needed ===
                            1
                              ? 'unit'
                              : 'units'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.nearbyDetail
                          }
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'event'
                            }
                            size={15}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            numberOfLines={
                              1
                            }
                            style={
                              styles.nearbyDetailText
                            }
                          >
                            {formatNeededBy(
                              request.urgency,
                              request.needed_date,
                              request.needed_time
                            )}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.nearbyCardFooter
                        }
                      >
                        <Text
                          style={
                            styles.nearbyHelpText
                          }
                        >
                          Blood donation request
                        </Text>

                        <View
                          style={
                            styles.nearbyViewButton
                          }
                        >
                          <Text
                            style={
                              styles.nearbyViewButtonText
                            }
                          >
                            View Request
                          </Text>

                          <MaterialIcons
                            name="chevron-right"
                            size={17}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {/* ==================================================
                DONOR STATUS CARD
            ================================================== */}

            <View
              style={[
                styles.donorCard,

                donorApplication?.status ===
                  'approved' &&
                  styles.donorCardApproved,
              ]}
            >
              <View
                style={
                  styles.donorTop
                }
              >
                <View
                  style={[
                    styles.heartIcon,

                    donorApplication?.status ===
                      'approved' &&
                      styles.heartIconApproved,
                  ]}
                >
                  <MaterialIcons
                    name={
                      donorApplication?.status ===
                      'approved'
                        ? 'verified'
                        : 'favorite-border'
                    }
                    size={28}
                    color={
                      donorApplication?.status ===
                      'approved'
                        ? COLORS.green
                        : COLORS.redButton
                    }
                  />
                </View>

                <View
                  style={
                    styles.donorText
                  }
                >
                  <Text
                    style={
                      styles.donorTitle
                    }
                  >
                    {getDonorCardTitle()}
                  </Text>

                  <Text
                    style={
                      styles.donorSubtitle
                    }
                  >
                    {getDonorCardSubtitle()}
                  </Text>
                </View>

                {donorApplication?.status ===
                'pending' ? (
                  <View
                    style={
                      styles.pendingBadge
                    }
                  >
                    <View
                      style={
                        styles.pendingDot
                      }
                    />

                    <Text
                      style={
                        styles.pendingBadgeText
                      }
                    >
                      Pending
                    </Text>
                  </View>
                ) : null}

                {donorApplication?.status ===
                'approved' ? (
                  <View
                    style={
                      styles.verifiedBadge
                    }
                  >
                    <MaterialIcons
                      name="check"
                      size={13}
                      color={
                        COLORS.green
                      }
                    />

                    <Text
                      style={
                        styles.verifiedBadgeText
                      }
                    >
                      Verified
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.applyButton,

                  donorApplication?.status ===
                    'approved' &&
                    styles.applyButtonApproved,

                  loadingDonorApplication &&
                    styles.applyButtonDisabled,
                ]}
                activeOpacity={
                  0.85
                }
                disabled={
                  loadingDonorApplication
                }
                onPress={
                  handleDonorAction
                }
              >
                <Text
                  style={[
                    styles.applyButtonText,

                    donorApplication?.status ===
                      'approved' &&
                      styles.applyButtonApprovedText,
                  ]}
                >
                  {getDonorButtonText()}
                </Text>

                {!loadingDonorApplication &&
                donorApplication?.status !==
                  'approved' ? (
                  <MaterialIcons
                    name="arrow-forward"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />
                ) : donorApplication?.status ===
                  'approved' ? (
                  <MaterialIcons
                    name="verified"
                    size={17}
                    color={
                      COLORS.green
                    }
                  />
                ) : null}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ==================================================
              BOTTOM NAVIGATION
          ================================================== */}

          <View
            style={
              styles.bottomNav
            }
          >
            <TouchableOpacity
              style={
                styles.navItem
              }
            >
              <MaterialIcons
                name="home"
                size={28}
                color={
                  COLORS.white
                }
              />

              <Text
                style={
                  styles.navTextActive
                }
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.navItem
              }
              onPress={() =>
                handleComingSoon(
                  'Search'
                )
              }
            >
              <MaterialIcons
                name="person-search"
                size={27}
                color="#D99191"
              />

              <Text
                style={
                  styles.navText
                }
              >
                Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.navItem
              }
              onPress={() =>
                handleComingSoon(
                  'Chat'
                )
              }
            >
              <MaterialIcons
                name="chat-bubble-outline"
                size={27}
                color="#D99191"
              />

              <Text
                style={
                  styles.navText
                }
              >
                Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.navItem
              }
              onPress={() =>
                handleComingSoon(
                  'Notifications'
                )
              }
            >
              <MaterialIcons
                name="notifications-none"
                size={28}
                color="#D99191"
              />

              <Text
                style={
                  styles.navText
                }
              >
                Notifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.navItem
              }
              onPress={
                handleProfile
              }
            >
              <MaterialIcons
                name="person-outline"
                size={28}
                color="#D99191"
              />

              <Text
                style={
                  styles.navText
                }
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
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
      width:
        Platform.OS === 'web'
          ? 402
          : '100%',

      height:
        Platform.OS === 'web'
          ? 874
          : '100%',

      maxWidth: '100%',
      overflow: 'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height: 132,

      paddingHorizontal: 24,
      paddingTop: 18,

      overflow: 'hidden',
    },

    headerSmall: {
      height: 124,
      paddingTop: 14,
    },

    headerCircleLeft: {
      position: 'absolute',

      width: 165,
      height: 165,

      borderRadius: 83,

      left: -100,
      top: -70,

      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleRight: {
      position: 'absolute',

      width: 170,
      height: 170,

      borderRadius: 85,

      right: -75,
      top: -82,

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },

    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    greetingContainer: {
      flex: 1,
      paddingRight: 15,
    },

    helloText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13,
    },

    userName: {
      marginTop: 1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 26,
      lineHeight: 31,
    },

    locationPill: {
      alignSelf:
        'flex-start',

      maxWidth: 205,

      marginTop: 7,

      paddingHorizontal: 11,
      paddingVertical: 5,

      flexDirection: 'row',
      alignItems: 'center',

      borderRadius: 15,

      backgroundColor:
        'rgba(255,255,255,0.27)',
    },

    locationText: {
      flexShrink: 1,
      marginLeft: 4,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    avatar: {
      width: 50,
      height: 50,

      borderRadius: 25,

      backgroundColor:
        '#FBE3E3',

      alignItems: 'center',
      justifyContent: 'center',

      overflow: 'hidden',

      borderWidth: 2,

      borderColor:
        COLORS.white,
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    // ========================================================
    // EMERGENCY
    // ========================================================

    emergencySection: {
      minHeight: 118,

      paddingHorizontal: 20,
      paddingTop: 13,
      paddingBottom: 13,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.16,
      shadowRadius: 6,

      elevation: 6,
    },

    emergencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    emergencyIcon: {
      width: 44,
      height: 44,

      borderRadius: 22,

      marginRight: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    emergencyContent: {
      flex: 1,
    },

    emergencyTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 15,
    },

    emergencyDescription: {
      marginTop: 2,

      color:
        'rgba(255,255,255,0.94)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,
      lineHeight: 15,
    },

    emergencyButton: {
      height: 40,

      marginTop: 10,
      marginLeft: 56,

      borderRadius: 9,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      backgroundColor:
        COLORS.white,
    },

    emergencyButtonText: {
      color:
        COLORS.redDark,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 28,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 10,
    },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 7,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },

    viewAllText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10.5,
    },

    // ========================================================
    // EMPTY ACTIVE REQUEST
    // ========================================================

    emptyRequestCard: {
      minHeight: 82,

      paddingHorizontal: 14,
      paddingVertical: 13,

      flexDirection: 'row',
      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 13,

      backgroundColor:
        COLORS.card,

      marginBottom: 16,
    },

    emptyRequestIcon: {
      width: 48,
      height: 48,

      borderRadius: 24,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,

      marginRight: 12,
    },

    emptyRequestText: {
      flex: 1,
    },

    emptyRequestTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    emptyRequestDescription: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
      lineHeight: 14,
    },

    // ========================================================
    // ACTIVE REQUEST
    // ========================================================

    activeRequestCard: {
      padding: 14,

      marginBottom: 16,

      borderWidth: 1,

      borderColor:
        '#E3A0A0',

      borderRadius: 14,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.07,
      shadowRadius: 4,

      elevation: 2,
    },

    activeRequestHeader: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 12,
    },

    activeStatusRow: {
      flex: 1,

      flexDirection: 'row',
      alignItems: 'center',

      paddingRight: 8,
    },

    activeDot: {
      width: 9,
      height: 9,

      borderRadius: 5,

      marginRight: 7,

      backgroundColor:
        COLORS.green,
    },

    activeRequestTitle: {
      flexShrink: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    requestTimeText: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    activeRequestMain: {
      flexDirection: 'row',
      alignItems:
        'flex-start',

      marginBottom: 14,
    },

    bloodBadge: {
      width: 52,
      height: 52,

      borderRadius: 13,

      marginRight: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redDeep,
    },

    bloodBadgeText: {
      marginTop: -1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 11,
    },

    activeRequestInfo: {
      flex: 1,
      gap: 6,
    },

    requestInfoRow: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      gap: 5,
    },

    requestInfoText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
      lineHeight: 13,
    },

    urgentRequestText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',
    },

    requestProgress: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      marginBottom: 14,

      paddingHorizontal: 3,
    },

    progressItem: {
      alignItems: 'center',
      minWidth: 60,
    },

    progressDotActive: {
      width: 9,
      height: 9,

      borderRadius: 5,

      marginBottom: 4,

      backgroundColor:
        COLORS.green,
    },

    progressDotInactive: {
      width: 9,
      height: 9,

      borderRadius: 5,

      marginBottom: 4,

      borderWidth: 1,

      borderColor:
        '#C6C6C6',

      backgroundColor:
        COLORS.white,
    },

    progressLine: {
      flex: 1,

      height: 1,

      marginTop: 4,

      backgroundColor:
        '#D8D8D8',
    },

    progressTextActive: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_500Medium',

      fontSize: 7.2,
    },

    progressTextInactive: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7,
    },

    viewRequestButton: {
      height: 39,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'center',

      gap: 3,

      borderRadius: 9,

      backgroundColor:
        COLORS.redButton,
    },

    viewRequestButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    requestErrorCard: {
      minHeight: 55,

      marginTop: -6,
      marginBottom: 16,

      paddingHorizontal: 11,
      paddingVertical: 9,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        '#EDB1B1',

      backgroundColor:
        COLORS.pinkLight,
    },

    requestErrorContent: {
      flex: 1,
    },

    requestErrorTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9,
    },

    requestErrorText: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    // ========================================================
    // FIND DONORS
    // ========================================================

    findDonorCard: {
      paddingHorizontal: 15,
      paddingVertical: 16,

      borderWidth: 1,

      borderColor:
        '#D6CACA',

      borderRadius: 13,

      backgroundColor:
        COLORS.card,

      marginBottom: 19,
    },

    findDonorHeader: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      marginBottom: 14,
    },

    findDonorTitleRow: {
      flex: 1,

      flexDirection: 'row',
      alignItems: 'center',
    },

    findDonorTextContainer: {
      flexShrink: 1,
    },

    dropIcon: {
      width: 34,
      height: 34,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,

      marginRight: 8,
    },

    findDonorTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12.5,
    },

    findDonorSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,
    },

    compatibilityChip: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 3,

      paddingHorizontal: 6,
      paddingVertical: 4,

      borderWidth: 1,

      borderColor:
        '#DAAAAA',

      borderRadius: 10,
    },

    compatibilityText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    smallLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      marginBottom: 8,
    },

    bloodGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      rowGap: 9,
    },

    bloodTypeButton: {
      width: '22.5%',

      height: 43,

      borderWidth: 1,

      borderColor:
        '#878787',

      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    bloodTypeButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    bloodTypeText: {
      color:
        '#333333',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    bloodTypeTextSelected: {
      color:
        COLORS.white,
    },

    searchButton: {
      width: 190,

      height: 44,

      alignSelf: 'center',

      marginTop: 16,

      borderRadius: 9,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'center',

      gap: 7,

      backgroundColor:
        COLORS.redButton,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.14,
      shadowRadius: 3,

      elevation: 3,
    },

    searchButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    // ========================================================
    // NEARBY EMPTY
    // ========================================================

    nearbyEmptyCard: {
      minHeight: 145,

      paddingHorizontal: 20,
      paddingVertical: 20,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 13,

      backgroundColor:
        COLORS.card,

      marginBottom: 18,
    },

    nearbyEmptyIcon: {
      width: 51,
      height: 51,

      borderRadius: 26,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,

      marginBottom: 9,
    },

    nearbyEmptyTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,

      textAlign: 'center',
    },

    nearbyEmptyDescription: {
      maxWidth: 275,

      marginTop: 5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
      lineHeight: 14,

      textAlign: 'center',
    },

    retryNearbyText: {
      marginTop: 10,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    // ========================================================
    // NEARBY REQUEST
    // ========================================================

    nearbyRequestCard: {
      padding: 14,

      marginBottom: 11,

      borderWidth: 1,

      borderColor:
        '#E3D2D2',

      borderRadius: 14,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.05,
      shadowRadius: 4,

      elevation: 2,
    },

    nearbyRequestTop: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 12,
    },

    nearbyBloodBadge: {
      width: 48,
      height: 48,

      borderRadius: 14,

      marginRight: 10,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    nearbyBloodText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 15,
    },

    nearbyMainInfo: {
      flex: 1,

      paddingRight: 7,
    },

    nearbyFacilityName: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    nearbyDistanceRow: {
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 4,
    },

    nearbyDistanceText: {
      marginLeft: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    dotSeparator: {
      marginHorizontal: 5,

      color:
        COLORS.lightMuted,

      fontSize: 8,
    },

    nearbyTimeText: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    urgencyPill: {
      minHeight: 26,

      paddingHorizontal: 7,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 2,

      borderRadius: 10,
    },

    urgencyPillUrgent: {
      backgroundColor:
        COLORS.redButton,
    },

    urgencyPillNeeded: {
      borderWidth: 1,

      borderColor:
        '#EBC69E',

      backgroundColor:
        '#FFF7EE',
    },

    urgencyPillText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 7.5,
    },

    urgencyPillTextNeeded: {
      color:
        COLORS.orange,
    },

    nearbyDetailsRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      paddingVertical: 10,
      paddingHorizontal: 10,

      borderRadius: 10,

      backgroundColor:
        '#FFF8F8',
    },

    nearbyDetail: {
      flex: 1,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,
    },

    nearbyDetailText: {
      flexShrink: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8.5,
    },

    nearbyCardFooter: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginTop: 11,
    },

    nearbyHelpText: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    nearbyViewButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    nearbyViewButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    // ========================================================
    // DONOR
    // ========================================================

    donorCard: {
      paddingHorizontal: 16,
      paddingVertical: 16,

      borderWidth: 1,

      borderColor:
        '#E3A0A0',

      borderRadius: 13,

      backgroundColor:
        '#FFF3F3',
    },

    donorCardApproved: {
      borderColor:
        '#B7DFC5',

      backgroundColor:
        '#F3FBF6',
    },

    donorTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    heartIcon: {
      width: 45,
      height: 45,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 9,
    },

    heartIconApproved: {
      borderRadius: 23,

      backgroundColor:
        '#E6F6EC',
    },

    donorText: {
      flex: 1,
    },

    donorTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12.5,
    },

    donorSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    pendingBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      borderRadius: 10,

      backgroundColor:
        '#FFF5E8',
    },

    pendingDot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      backgroundColor:
        COLORS.orange,
    },

    pendingBadgeText: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 7.5,
    },

    verifiedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 3,

      borderRadius: 10,

      backgroundColor:
        '#E8F6ED',
    },

    verifiedBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 7.5,
    },

    applyButton: {
      width: 200,

      height: 42,

      alignSelf: 'center',

      marginTop: 12,

      borderRadius: 9,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'center',

      gap: 6,

      backgroundColor:
        COLORS.redButton,
    },

    applyButtonApproved: {
      borderWidth: 1,

      borderColor:
        COLORS.green,

      backgroundColor:
        COLORS.white,
    },

    applyButtonDisabled: {
      opacity: 0.6,
    },

    applyButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10.5,
    },

    applyButtonApprovedText: {
      color:
        COLORS.green,
    },

    // ========================================================
    // BOTTOM NAV
    // ========================================================

    bottomNav: {
      height: 76,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-around',

      paddingHorizontal: 4,

      backgroundColor:
        '#A90707',

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        'rgba(255,255,255,0.15)',
    },

    navItem: {
      flex: 1,
      height: '100%',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 3,
    },

    navTextActive: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,
    },

    navText: {
      color:
        '#D99191',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,
    },
  });