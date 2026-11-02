import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  ICON_TILE,
} from '../constants/theme';

import {
  HeroDrop,
  HeroWave,
} from '../components/HeroArt';

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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import MainBottomNav, { useBottomNavSpace } from '../components/MainBottomNav';
import SpotlightTour, {
  measureView,
  type SpotlightStep,
} from '../components/SpotlightTour';

import {
  FadeInView,
  PulseRing,
} from '../components/Motion';

import {
  type BloodType,
  getCompatibleDonorTypes,
  getCompatibleRecipientTypes,
  isBloodType,
} from '../lib/bloodCompatibility';

import { getMyDonorInvitations } from '../lib/donorInvitations';

import {
  getCoordinationInbox,
  isScheduleAgreed,
  type CoordinationInboxItem,
} from '../lib/coordination';

import { formatEta } from '../lib/trips';

import { ensurePushRegistered } from '../lib/pushNotifications';
import { openPendingNotification } from '../components/PushNotificationsBridge';

import {
  getCurrentUser,
  getMyActiveBloodRequest,
  getUnreadNotificationCount,
} from '../lib/api';

import type {
  BloodRequest,
} from '../lib/api';

import {
  getNearbyBloodRequests,
} from '../lib/nearbyRequests';

import {
  LIVE_REFRESH_SLOW_MS,
  useLiveRefresh,
} from '../lib/useLiveRefresh';

import type {
  NearbyBloodRequest,
} from '../lib/nearbyRequests';

import {
  getMyDonorResponse,
  getResponsesForMyBloodRequest,
} from '../lib/donorRequests';

import type {
  DonorResponse,
  DonorResponseCounts,
} from '../lib/donorRequests';

import {
  getMyDonorApplication,
} from '../lib/donorApplication';

import type {
  DonorApplication,
} from '../lib/donorApplication';

import {
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

  // Header, top to bottom (same as the sign-in screens).
  heroTop: '#E0141A',
  heroMiddle: '#A10F12',
  heroBottom: '#8F1111',
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

type RespondedRequestItem = {
  request: NearbyBloodRequest;
  response: DonorResponse;
};

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
// DASHBOARD
// ============================================================

export default function DashboardScreen() {
  const {
    height,
  } = useWindowDimensions();

  const isSmallPhone =
    Platform.OS !== 'web' &&
    height <= 844;

  // Full screen: the header grows by the status-bar height so
  // its red reaches the top edge, and its content stays below
  // the clock. The bottom bar floats over the content, so the
  // scroll content ends with the space it covers.
  const insets =
    useSafeAreaInsets();

  const navSpace =
    useBottomNavSpace();

  const headerSize =
    isSmallPhone
      ? {
          paddingTop: 14,
        }
      : {
          paddingTop: 18,
        };

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
  // NOTIFICATIONS
  // ==========================================================

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

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

  // Conversations with accepted donors for the active request:
  // meeting time, recorded donation, no-show, unread messages.
  const [
    activeRequestConversations,
    setActiveRequestConversations,
  ] = useState<
    CoordinationInboxItem[]
  >([]);

  const [
    activeRequestResponseCounts,
    setActiveRequestResponseCounts,
  ] = useState<DonorResponseCounts>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
  });

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
  // RESPONDED REQUESTS
  // ==========================================================

  const [
    respondedRequests,
    setRespondedRequests,
  ] = useState<
    RespondedRequestItem[]
  >([]);

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

  // Blood type shown in the compatibility popup (null = closed).
  const [
    compatibilityType,
    setCompatibilityType,
  ] = useState<BloodType | null>(
    null
  );

  const [
  actionPopup,
  setActionPopup,
] = useState<ActionPopupState>({
  visible: false,
  title: '',
  message: '',
  variant: 'info',
});

  // ==========================================================
  // DONOR INVITATIONS (pending count)
  // ==========================================================

  const [
    pendingInvitations,
    setPendingInvitations,
  ] = useState(0);

  // ==========================================================
  // REFRESH / LOADING BEHAVIOUR
  //
  // The first load shows the loading cards. Later loads (tab
  // switches, returning from other screens, pull-to-refresh)
  // update quietly so the cards do not flash.
  // ==========================================================

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const hasLoadedOnce =
    useRef(false);

  // Ask for location permission at most once per app visit.
  const askedForLocation =
    useRef(false);

  // Where nearby requests were last looked up (live checks reuse it).
  const lastPosition =
    useRef<{
      latitude: number;
      longitude: number;
    } | null>(null);
  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboard =
    useCallback(async (live = false) => {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      // Only the very first load shows the loading cards.
      const firstLoad =
        !hasLoadedOnce.current;

      if (firstLoad && !live) {
        setLoadingProfile(true);
        setLoadingActiveRequest(true);
        setLoadingDonorApplication(true);
      }

      if (!live) {
        setActiveRequestError('');
      }

      // ======================================================
      // LOAD INDEPENDENT SECTIONS IN PARALLEL
      //
      // One failing section does not block the others.
      // ======================================================

      const [
        profileResult,
        notificationResult,
        activeRequestResult,
        donorResult,
        invitationResult,
      ] = await Promise.allSettled([
        getCurrentUser(token),
        getUnreadNotificationCount(token),
        getMyActiveBloodRequest(token),
        getMyDonorApplication(token),
        getMyDonorInvitations(token),
      ]);

      // ------------------------------------------------------
      // PROFILE
      // ------------------------------------------------------

      if (
        profileResult.status === 'fulfilled' &&
        profileResult.value?.user
      ) {
        setProfile(
          profileResult.value.user
        );
      } else if (profileResult.status === 'rejected') {
        console.log(
          'DASHBOARD PROFILE ERROR:',
          profileResult.reason
        );
      }

      setLoadingProfile(false);

      // ------------------------------------------------------
      // NOTIFICATION COUNT
      // ------------------------------------------------------

      // A failed live check keeps what's on screen, here and
      // in the sections below.
      if (
        notificationResult.status === 'fulfilled' ||
        !live
      ) {
        setUnreadNotifications(
          notificationResult.status === 'fulfilled'
            ? Number(
                notificationResult.value
                  ?.unread_count
              ) || 0
            : 0
        );
      }

      // ------------------------------------------------------
      // DONOR APPLICATION
      // ------------------------------------------------------

      if (donorResult.status === 'fulfilled') {
        setDonorApplication(
          donorResult.value?.application ||
            null
        );
      } else {
        console.log(
          'DASHBOARD DONOR APPLICATION ERROR:',
          donorResult.reason
        );

        if (!live) {
          setDonorApplication(null);
        }
      }

      setLoadingDonorApplication(false);

      // ------------------------------------------------------
      // PENDING DONOR INVITATIONS
      // ------------------------------------------------------

      if (
        invitationResult.status === 'fulfilled' ||
        !live
      ) {
        setPendingInvitations(
          invitationResult.status === 'fulfilled'
            ? Number(
                invitationResult.value?.counts
                  ?.pending
              ) || 0
            : 0
        );
      }

      // ------------------------------------------------------
      // ACTIVE REQUEST + DONOR OFFER COUNTS
      // ------------------------------------------------------

      const emptyCounts = {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
      };

      if (activeRequestResult.status === 'fulfilled') {
        const currentRequest =
          activeRequestResult.value?.request ||
          null;

        setActiveRequest(currentRequest);

        setActiveRequestError('');

        if (currentRequest) {
          // Conversations only add detail; a failure here just
          // falls back to the offer counts.
          getCoordinationInbox(token)
            .then(result =>
              setActiveRequestConversations(
                (result.conversations || []).filter(
                  item =>
                    item.request_id ===
                    currentRequest.id
                )
              )
            )
            .catch(inboxError => {
              console.log(
                'DASHBOARD ACTIVE REQUEST CONVERSATIONS ERROR:',
                inboxError
              );

              if (!live) {
                setActiveRequestConversations([]);
              }
            });

          try {
            const responseData =
              await getResponsesForMyBloodRequest(
                token,
                currentRequest.id
              );

            setActiveRequestResponseCounts({
              total:
                Number(responseData?.counts?.total) || 0,
              pending:
                Number(responseData?.counts?.pending) || 0,
              accepted:
                Number(responseData?.counts?.accepted) || 0,
              rejected:
                Number(responseData?.counts?.rejected) || 0,
              withdrawn:
                Number(responseData?.counts?.withdrawn) || 0,
            });
          } catch (responseError) {
            console.log(
              'DASHBOARD ACTIVE REQUEST RESPONSES ERROR:',
              responseError
            );

            if (!live) {
              setActiveRequestResponseCounts(emptyCounts);
            }
          }
        } else {
          setActiveRequestResponseCounts(emptyCounts);

          setActiveRequestConversations([]);
        }
      } else {
        console.log(
          'DASHBOARD ACTIVE REQUEST ERROR:',
          activeRequestResult.reason
        );

        if (!live) {
          setActiveRequest(null);
          setActiveRequestResponseCounts(emptyCounts);

          setActiveRequestError(
            activeRequestResult.reason instanceof Error
              ? activeRequestResult.reason.message
              : 'Unable to load active request.'
          );
        }
      }

      setLoadingActiveRequest(false);

      hasLoadedOnce.current = true;

      // ======================================================
      // NEARBY REQUESTS (needs location)
      // ======================================================

      // Live checks do this on their own, slower timer.
      if (!live) {
        await loadNearbyRequests(
          token
        );
      }
    }, []);

  // ==========================================================
  // GREETING
  //
  // Set on focus from the phone's clock. The web build is
  // pre-rendered, so it starts as "Hello,".
  // ==========================================================

  const [
    greeting,
    setGreeting,
  ] = useState('Hello,');

  function getGreeting() {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return 'Good morning,';
    }

    if (hour < 18) {
      return 'Good afternoon,';
    }

    return 'Good evening,';
  }

  // ==========================================================
  // REFRESH WHEN SCREEN FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();

      setGreeting(getGreeting());

      // Notifications for this phone (first visit after signing
      // in), then any notification tapped while the app was
      // closed.
      void ensurePushRegistered();

      openPendingNotification();
    }, [loadDashboard])
  );

  useLiveRefresh(() =>
    loadDashboard(true)
  );

  useLiveRefresh(
    () =>
      loadNearbyRequests(
        undefined,
        true
      ),
    LIVE_REFRESH_SLOW_MS
  );

  // ==========================================================
  // LOAD NEARBY REQUESTS
  // ==========================================================

  async function loadNearbyRequests(
    token?: string,
    live = false
  ) {
    try {
      // Live checks only follow a normal load, which has the
      // location and has already asked for permission.
      if (
        live &&
        !lastPosition.current
      ) {
        return;
      }

      // Show the "finding requests" card only until the first
      // result; later refreshes update the list in place.
      if (
        !live &&
        nearbyRequests.length === 0 &&
        respondedRequests.length === 0
      ) {
        setLoadingNearbyRequests(
          true
        );
      }

      if (!live) {
        setNearbyRequestError(
          ''
        );
      }

      const accessToken =
        token ||
        await getAccessToken();

      if (!accessToken) {
        router.replace('/');

        return;
      }

      // A live check reuses the last position instead of asking
      // the phone's GPS every time.
      let position =
        live
          ? lastPosition.current
          : null;

      if (!position) {
        let permission =
          await Location
            .getForegroundPermissionsAsync();

        // Ask once; do not re-prompt every time Home is opened.
        if (
          permission.status !==
            'granted' &&
          !askedForLocation.current
        ) {
          askedForLocation.current =
            true;

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

        position = {
          latitude:
            location.coords
              .latitude,

          longitude:
            location.coords
              .longitude,
        };

        lastPosition.current =
          position;
      }

      const {
        latitude,
        longitude,
      } = position;

      const data =
        await getNearbyBloodRequests(
          accessToken,
          latitude,
          longitude,
          25,
          10
        );

      const checkedRequests =
        await Promise.all(
          (data.requests || []).map(
            async request => {
              try {
                const responseData =
                  await getMyDonorResponse(
                    accessToken,
                    request.id
                  );

                return {
                  request,
                  response:
                    responseData?.response ||
                    null,
                };
              } catch (error) {
                // Without this answer a request you offered on
                // would look new, so skip this live check.
                if (live) {
                  throw error;
                }

                console.log(
                  'DASHBOARD RESPONSE CHECK ERROR:',
                  request.id,
                  error
                );

                return {
                  request,
                  response: null,
                };
              }
            }
          )
        );

      const responded =
        checkedRequests
          .filter(
            item =>
              Boolean(
                item.response
              )
          )
          .map(
            item => ({
              request:
                item.request,

              response:
                item.response as
                  DonorResponse,
            })
          );

      const newNearbyRequests =
        checkedRequests
          .filter(
            item =>
              !item.response
          )
          .map(
            item =>
              item.request
          );

      setNearbyRequestError(
        ''
      );

      setRespondedRequests(
        responded.slice(
          0,
          3
        )
      );

      setNearbyRequests(
        newNearbyRequests.slice(
          0,
          3
        )
      );
    } catch (error) {
      if (live) {
        return;
      }

      console.log(
        'DASHBOARD NEARBY REQUEST ERROR:',
        error
      );

      setNearbyRequests(
        []
      );

      setRespondedRequests(
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

  // The chip under the name has room for the city only.
  const displayLocation =
    profile?.city ||
    profile?.province ||
    'Location not added';

  const profilePhotoUrl =
    profile?.profile_photo_url ||
    '';

  // ==========================================================
  // NOTIFICATION DISPLAY
  // ==========================================================

  const unreadNotificationLabel =
    unreadNotifications > 99
      ? '99+'
      : String(
          unreadNotifications
        );

  // ==========================================================
  // MESSAGE
  // ==========================================================

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
    value.includes('success') ||
    value.includes('verified')
  ) {
    return 'success';
  }

  if (
    value.includes('unable') ||
    value.includes('failed') ||
    value.includes('error')
  ) {
    return 'error';
  }

  if (
    value.includes('select') ||
    value.includes('required') ||
    value.includes('warning')
  ) {
    return 'warning';
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

    // The year only when it isn't this year.
    const sameYear =
      date.getFullYear() ===
      new Date().getFullYear();

    const dateText =
      date.toLocaleDateString(
        'en-US',
        sameYear
          ? {
              month: 'short',
              day: 'numeric',
            }
          : {
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
  // RESPONDED REQUEST
  // ==========================================================

  function getRespondedStatusLabel(
    response: DonorResponse
  ) {
    switch (
      response.status
    ) {
      case 'pending':
        return 'Pending';

      case 'accepted':
        return 'Accepted';

      case 'rejected':
        return 'Not Selected';

      case 'withdrawn':
        return 'Withdrawn';

      case 'no_show':
        return 'Marked No-show';

      default:
        return response.status;
    }
  }

  function getRespondedStatusColor(
    response: DonorResponse
  ) {
    switch (
      response.status
    ) {
      case 'pending':
        return COLORS.orange;

      case 'accepted':
        return COLORS.green;

      case 'rejected':
        return COLORS.redButton;

      case 'withdrawn':
        return COLORS.lightMuted;

      case 'no_show':
        return COLORS.orange;

      default:
        return COLORS.lightMuted;
    }
  }

  function getRespondedActionLabel(
    response: DonorResponse
  ) {
    if (
      response.status ===
        'accepted' ||
      response.status ===
        'no_show'
    ) {
      return 'Open Chat';
    }

    if (
      response.status ===
      'pending'
    ) {
      return 'View Response';
    }

    return 'View Request';
  }

  function handleRespondedRequest(
    item: RespondedRequestItem
  ) {
    if (
      item.response.status ===
        'accepted' ||
      item.response.status ===
        'no_show'
    ) {
      router.push(
        `/blood-request/${item.request.id}/coordination/${item.response.id}` as any
      );

      return;
    }

    router.push(
      `/blood-request/donor/${item.request.id}` as any
    );
  }

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  function handleNotifications() {
    router.push(
      '/notifications' as any
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

    if (!donorApplication) {
      router.push(
        '/donor-application/blood' as any
      );

      return;
    }

    // Pending, approved and rejected all open the status screen
    // (progress, reviewer note, withdraw / apply again).
    if (
      donorApplication.status ===
        'pending' ||
      donorApplication.status ===
        'approved' ||
      donorApplication.status ===
        'rejected'
    ) {
      router.push({
        pathname:
          '/donor-application/success',

        params: {
          status:
            donorApplication.status,
        },
      } as any);

      return;
    }

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

  // Whole-blood donors can usually give again after about
  // 3 months (90 days). Uses the last donation the donor
  // reported in their application. Guidance only.
  function getDonationEligibility(): {
    ready: boolean;
    text: string;
  } | null {
    if (
      donorApplication?.status !==
      'approved'
    ) {
      return null;
    }

    if (
      !donorApplication.has_donated_before
    ) {
      return {
        ready: true,
        text: 'No previous donation on record — you can donate when matched.',
      };
    }

    let lastDonation: Date | null =
      null;

    const dateMatch =
      String(
        donorApplication.last_donation_date ||
          ''
      ).match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (dateMatch) {
      lastDonation = new Date(
        Number(dateMatch[1]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[3])
      );
    } else if (
      donorApplication.last_donation_month &&
      donorApplication.last_donation_year
    ) {
      // Month only: count from the end of that month.
      lastDonation = new Date(
        donorApplication.last_donation_year,
        donorApplication.last_donation_month,
        0
      );
    }

    if (
      !lastDonation ||
      Number.isNaN(
        lastDonation.getTime()
      )
    ) {
      return null;
    }

    const nextEligible =
      new Date(lastDonation);

    nextEligible.setDate(
      nextEligible.getDate() + 90
    );

    if (
      nextEligible.getTime() <=
      Date.now()
    ) {
      return {
        ready: true,
        text: 'Eligible to donate again (90+ days since your last donation).',
      };
    }

    return {
      ready: false,
      text: `Next donation from ${nextEligible.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      )} (90-day interval).`,
    };
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
      // The subtitle and the Pending badge already say it's
      // under review; the button opens the application.
      case 'pending':
        return 'View Application';

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

  // Opens the real donor search with the chosen blood type.
  function handleSearchDonors() {
    if (!selectedBloodType) {
      showMessage(
        'Select Blood Type',
        'Please select the blood type you need, then tap Find Donors.'
      );

      return;
    }

    router.push({
      pathname:
        '/search',

      params: {
        mode:
          'donors',

        bloodType:
          selectedBloodType,
      },
    } as any);
  }

  // ==========================================================
  // ALL NEARBY REQUESTS
  // ==========================================================

  function handleViewAllNearby() {
    router.push({
      pathname:
        '/search',

      params: {
        mode:
          'requests',
      },
    } as any);
  }

  // ==========================================================
  // PULL TO REFRESH
  // ==========================================================

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }

  // ==========================================================
  // PROFILE
  // ==========================================================

  function handleProfile() {
    router.push(
      '/profile'
    );
  }

  // ==========================================================
  // ACTIVE REQUEST STATUS
  //
  // Posted -> Donor accepted -> Scheduled -> Donated, plus the
  // one next thing to do.
  // ==========================================================

  const activeAccepted =
    activeRequestConversations.filter(
      item =>
        item.response_status ===
        'accepted'
    );

  const activeNoShows =
    activeRequestConversations.filter(
      item =>
        item.response_status ===
        'no_show'
    );

  const activeDonation =
    activeRequestConversations.find(
      item =>
        item.donation &&
        item.donation.status !==
          'rejected'
    )?.donation ||
    null;

  // Only a time both sides agreed to.
  const activeScheduled =
    activeAccepted.find(
      item =>
        isScheduleAgreed(
          item.schedule
        )
    ) ||
    null;

  const activeUnread =
    activeRequestConversations.reduce(
      (total, item) =>
        total +
        (item.unread_count || 0),
      0
    );

  const activeRequestFlagged =
    Boolean(
      activeRequest?.flagged_at
    );

  const activeHasDonor =
    activeRequestResponseCounts.accepted > 0 ||
    activeAccepted.length > 0 ||
    Boolean(activeDonation);

  const activeSteps = [
    {
      label: 'Posted',
      done: true,
    },
    {
      label: 'Donor',
      done: activeHasDonor,
    },
    {
      label: 'Scheduled',
      done:
        Boolean(activeScheduled) ||
        Boolean(activeDonation),
    },
    {
      label: 'Donated',
      done:
        Boolean(activeDonation),
    },
  ];

  function personName(
    item: CoordinationInboxItem
  ) {
    return (
      item.other_participant
        .first_name ||
      item.other_participant
        .full_name ||
      'your donor'
    );
  }

  function formatMeeting(
    value: string
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'scheduled';
    }

    const today =
      new Date();

    const tomorrow =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

    const day =
      date.toDateString() ===
      today.toDateString()
        ? 'Today'
        : date.toDateString() ===
            tomorrow.toDateString()
          ? 'Tomorrow'
          : date.toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
              }
            );

    return `${day}, ${date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    )}`;
  }

  // An accepted donor travelling to (or at) the facility.
  const activeTrip =
    activeAccepted.find(
      item =>
        item.trip?.status ===
          'on_the_way' ||
        item.trip?.status ===
          'arrived'
    ) || null;

  function getActiveRequestStatus(): {
    icon: keyof typeof Ionicons.glyphMap;
    tone: 'green' | 'orange' | 'muted';
    text: string;
  } {
    if (activeRequestFlagged) {
      return {
        icon: 'alert-circle-outline',
        tone: 'orange',
        text: 'Under review · hidden from donors for now',
      };
    }

    if (activeDonation) {
      return {
        icon: 'checkmark-done-outline',
        tone: 'green',
        text:
          activeDonation.status ===
          'needs_review'
            ? `${activeDonation.units_donated} ${activeDonation.units_donated === 1 ? 'bag' : 'bags'} recorded · quick review`
            : `${activeDonation.units_donated} ${activeDonation.units_donated === 1 ? 'bag' : 'bags'} recorded · mark fulfilled when done`,
      };
    }

    if (activeTrip?.trip) {
      const eta =
        formatEta(
          activeTrip.trip.eta_seconds
        );

      return activeTrip.trip.status ===
        'arrived'
        ? {
            icon: 'location-outline',
            tone: 'green',
            text: `${personName(activeTrip)} has arrived at the facility`,
          }
        : {
            icon: 'car-outline',
            tone: 'green',
            text: `${personName(activeTrip)} is on the way${eta ? ` · ${eta} away` : ''}`,
          };
    }

    if (activeScheduled?.schedule) {
      return {
        icon: 'calendar-outline',
        tone: 'green',
        text: `Meet ${personName(activeScheduled)} · ${formatMeeting(activeScheduled.schedule.scheduled_at)}`,
      };
    }

    if (activeAccepted.length > 0) {
      return {
        icon: 'chatbubble-outline',
        tone: 'green',
        text:
          activeAccepted.length === 1
            ? `Set a meeting time with ${personName(activeAccepted[0])}`
            : `${activeAccepted.length} donors accepted · set meeting times`,
      };
    }

    if (
      activeRequestResponseCounts.accepted > 0
    ) {
      return {
        icon: 'chatbubble-outline',
        tone: 'green',
        text: 'Donor accepted · set a meeting time',
      };
    }

    if (
      activeRequestResponseCounts.pending > 0
    ) {
      return {
        icon: 'time-outline',
        tone: 'orange',
        text:
          activeRequestResponseCounts.pending === 1
            ? '1 offer waiting for your review'
            : `${activeRequestResponseCounts.pending} offers waiting for your review`,
      };
    }

    if (activeNoShows.length > 0) {
      return {
        icon: 'person-remove-outline',
        tone: 'orange',
        text: `${personName(activeNoShows[0])} didn't show up · invite another donor`,
      };
    }

    return {
      icon: 'search',
      tone: 'muted',
      text: 'Waiting for a compatible donor',
    };
  }

  const activeStatus =
    getActiveRequestStatus();

  // ==========================================================
  // HOME TOUR
  //
  // Optional. Opened with ?tour=1 from the Welcome screen (new
  // accounts) or from Help. Highlights the real buttons once the
  // cards have loaded.
  // ==========================================================

  const { tour } =
    useLocalSearchParams<{
      tour?: string;
    }>();

  const scrollRef =
    useRef<ScrollViewInstance>(null);

  // Top of the scrolling content (to work out scroll offsets).
  const scrollTopRef =
    useRef<ViewInstance>(null);

  const createButtonRef =
    useRef<ViewInstance>(null);

  const nearbyRef =
    useRef<ViewInstance>(null);

  const findDonorsRef =
    useRef<ViewInstance>(null);

  const donorCardRef =
    useRef<ViewInstance>(null);

  const navRef =
    useRef<ViewInstance>(null);

  const [
    tourVisible,
    setTourVisible,
  ] = useState(false);

  const tourDone =
    useRef(false);

  const homeLoaded =
    !loadingProfile &&
    !loadingActiveRequest &&
    !loadingNearbyRequests &&
    !loadingDonorApplication;

  useEffect(() => {
    if (
      tour !== '1' ||
      !homeLoaded ||
      tourVisible ||
      tourDone.current
    ) {
      return;
    }

    // Let the cards finish fading in.
    const timer =
      setTimeout(
        () => setTourVisible(true),
        700
      );

    return () =>
      clearTimeout(timer);
  }, [
    tour,
    homeLoaded,
    tourVisible,
  ]);

  function finishTour() {
    tourDone.current = true;

    setTourVisible(false);

    router.setParams({
      tour: undefined,
    } as any);

    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }

  // Sections inside the scroll view are scrolled near the top
  // first; the header button and the tabs are always visible.
  async function revealTourStep(
    step: SpotlightStep
  ) {
    if (step.key === 'tabs') {
      return;
    }

    // The request card is at the top of the scroll content.
    if (step.key === 'create') {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });

      await new Promise(resolve =>
        setTimeout(resolve, 450)
      );

      return;
    }

    const [top, target] =
      await Promise.all([
        measureView(
          scrollTopRef.current
        ),
        measureView(
          step.target.current
        ),
      ]);

    if (top && target) {
      scrollRef.current?.scrollTo({
        y: Math.max(
          0,
          target.y - top.y - 16
        ),
        animated: true,
      });
    }

    await new Promise(resolve =>
      setTimeout(resolve, 450)
    );
  }

  const isApprovedDonor =
    donorApplication?.status ===
    'approved';

  // Only for approved donors (null otherwise).
  const donorEligibility =
    getDonationEligibility();

  const tourSteps: SpotlightStep[] = [
    {
      key: 'create',
      target: createButtonRef,
      title: activeRequest
        ? 'Your blood request'
        : 'Need blood?',
      text: activeRequest
        ? 'Open your active request here to see donor offers and chat with donors.'
        : 'Tap Create Blood Request to post the blood type, bags needed, place and time. Compatible donors nearby are notified.',
    },
    {
      key: 'nearby',
      target: nearbyRef,
      title: 'Requests near you',
      text: 'Blood requests near you show up here. Once you are a verified donor, open one to offer to donate.',
    },
    {
      key: 'find-donors',
      target: findDonorsRef,
      title: 'Find donors',
      text: 'Pick the blood type you need to see compatible, verified donors nearby. You can invite one to your request.',
    },
    {
      key: 'donor',
      target: donorCardRef,
      title: isApprovedDonor
        ? 'Your donor status'
        : 'Become a donor',
      text: isApprovedDonor
        ? 'You are a verified donor. Tap here to see your application and when you can donate next.'
        : 'Add your blood type with proof in your profile, then apply here with a valid ID. Once an admin approves it, you can offer to donate.',
    },
    {
      key: 'tabs',
      target: navRef,
      // Fully round, like the pill itself.
      radius: 999,
      title: 'Get around',
      text: 'Search finds donors and requests, Chat holds your conversations, Requests tracks your requests and offers, and Profile has your settings and Help.',
    },
  ];

  // ==========================================================
  // UI
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
          // Top and bottom are drawn edge to edge by the header
          // and MainBottomNav.
          edges={[
            'left',
            'right',
          ]}
        >
          <StatusBar
            style="light"
          />

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            ref={scrollRef}
            style={
              styles.content
            }
            contentContainerStyle={[
              styles.contentContainer,

              {
                paddingBottom:
                  28 + navSpace,
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  handleRefresh
                }
                tintColor={
                  COLORS.redButton
                }
                colors={[
                  COLORS.redButton,
                ]}
              />
            }
          >
            <View
              ref={scrollTopRef}
              collapsable={false}
            />

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              COLORS.heroTop,
              COLORS.heroMiddle,
              COLORS.heroBottom,
            ]}
            locations={[
              0,
              0.6,
              1,
            ]}
            start={{
              x: 0.15,
              y: 0,
            }}
            end={{
              x: 0.85,
              y: 1,
            }}
            style={[
              styles.header,

              {
                paddingTop:
                  headerSize.paddingTop +
                  insets.top,
              },
            ]}
          >
            <HeroDrop
              width={200}
              style={[
                styles.headerDrop,

                {
                  top:
                    insets.top - 24,
                },
              ]}
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
                  {greeting}
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
                    styles.headerPills
                  }
                >
                  {isBloodType(
                    profile?.blood_type
                  ) ? (
                    <TouchableOpacity
                      style={
                        styles.bloodTypePill
                      }
                      activeOpacity={
                        0.8
                      }
                      accessibilityLabel={`My blood type ${profile?.blood_type}. Show compatible types.`}
                      onPress={() => {
                        const myType =
                          String(
                            profile?.blood_type
                          )
                            .trim()
                            .toUpperCase();

                        if (!isBloodType(myType)) {
                          return;
                        }

                        setCompatibilityType(
                          myType
                        );
                      }}
                    >
                      <Ionicons
                        name="water"
                        size={13}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.bloodTypePillText
                        }
                      >
                        {String(
                          profile?.blood_type
                        )
                          .trim()
                          .toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <View
                    style={
                      styles.locationPill
                    }
                  >
                    <Ionicons
                      name="location"
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
              </View>

              <View
                style={
                  styles.headerActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.notificationButton
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={
                    handleNotifications
                  }
                >
                  <Ionicons
                    name={
                      unreadNotifications >
                      0
                        ? 'notifications'
                        : 'notifications-outline'
                    }
                    size={25}
                    color={
                      COLORS.white
                    }
                  />

                  {unreadNotifications >
                  0 ? (
                    <View
                      style={
                        styles.headerNotificationBadge
                      }
                    >
                      <Text
                        style={
                          styles.headerNotificationBadgeText
                        }
                      >
                        {
                          unreadNotificationLabel
                        }
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

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
                    <Ionicons
                      name="person"
                      size={29}
                      color={
                        COLORS.redDark
                      }
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {/* Liquid edge into the page; the request card floats over it. */}
            <HeroWave
              color={
                COLORS.page
              }
            />
          </LinearGradient>

          {/* ==================================================
              REQUEST CARD (floats over the header's wave)
          ================================================== */}

          <View
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
                {/* Gentle pulse draws attention to creating a
                    request; hidden once a request is active. */}
                <PulseRing
                  size={48}
                  color="rgba(180,35,35,0.35)"
                  active={
                    !activeRequest &&
                    !loadingActiveRequest
                  }
                />

                <Ionicons
                  name={
                    activeRequest
                      ? 'pulse'
                      : 'medical'
                  }
                  size={28}
                  color={
                    COLORS.redButton
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
                    ? 'Your blood request is active'
                    : 'Need blood now?'}
                </Text>

                <Text
                  style={
                    styles.emergencyDescription
                  }
                >
                  {activeRequest
                    ? 'Track donor offers and messages below.'
                    : 'Post a request in about a minute and reach compatible donors nearby.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              ref={createButtonRef}
              style={[
                styles.emergencyButton,

                !activeRequest &&
                  styles.emergencyButtonPrimary,
              ]}
              activeOpacity={
                0.85
              }
              accessibilityRole="button"
              accessibilityLabel={
                activeRequest
                  ? 'View my active blood request'
                  : 'Create a blood request'
              }
              onPress={
                handleCreateRequest
              }
            >
              <Ionicons
                name={
                  activeRequest
                    ? 'eye-outline'
                    : 'add-circle'
                }
                size={
                  activeRequest
                    ? 19
                    : 22
                }
                color={
                  COLORS.white
                }
              />

              <Text
                style={[
                  styles.emergencyButtonText,

                  !activeRequest &&
                    styles.emergencyButtonTextPrimary,
                ]}
              >
                {activeRequest
                  ? 'View My Request'
                  : 'Create Blood Request'}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>
          </View>

            <View
              style={
                styles.sections
              }
            >

            {/* ==================================================
                PENDING DONATION INVITATIONS
                (only shown when a requester invited you)
            ================================================== */}

            {pendingInvitations >
            0 ? (
              <FadeInView>
                <TouchableOpacity
                  style={
                    styles.invitationNotice
                  }
                  activeOpacity={
                    0.85
                  }
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      '/requests' as any
                    )
                  }
                >
                  <View
                    style={
                      styles.invitationNoticeIcon
                    }
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.invitationNoticeText
                    }
                  >
                    <Text
                      style={
                        styles.invitationNoticeTitle
                      }
                    >
                      {pendingInvitations ===
                      1
                        ? 'You have a donation invitation'
                        : `You have ${pendingInvitations} donation invitations`}
                    </Text>

                    <Text
                      style={
                        styles.invitationNoticeSubtitle
                      }
                    >
                      A requester asked you to help. Tap to review.
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={
                      COLORS.redButton
                    }
                  />
                </TouchableOpacity>
              </FadeInView>
            ) : null}

            {/* ==================================================
                ACTIVE REQUEST (only when there is one; the card
                at the top covers "no request")
            ================================================== */}
            {activeRequest ||
            activeRequestError ? (
            <FadeInView delay={0}>

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
                <Ionicons
                  name="clipboard-outline"
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

            {activeRequest ? (
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
                      • {activeRequestFlagged
                        ? 'Under review'
                        : 'Active'}
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
                    <Ionicons
                      name="water"
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
                      <Ionicons
                        name="medkit-outline"
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
                      <Ionicons
                        name="water"
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
                          ? 'bag needed'
                          : 'bags needed'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.requestInfoRow
                      }
                    >
                      <Ionicons
                        name={
                          activeRequest.urgency ===
                          'urgent'
                            ? 'flash'
                            : 'time-outline'
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

                {/* Four bars, one per step, with the labels under them. */}
                <View
                  style={
                    styles.requestProgress
                  }
                >
                  <View
                    style={
                      styles.progressBars
                    }
                  >
                    {activeSteps.map(
                      step => (
                        <View
                          key={step.label}
                          style={[
                            styles.progressBar,

                            step.done &&
                              styles.progressBarDone,
                          ]}
                        />
                      )
                    )}
                  </View>

                  <View
                    style={
                      styles.progressLabels
                    }
                  >
                    {activeSteps.map(
                      step => (
                        <Text
                          key={step.label}
                          numberOfLines={1}
                          style={[
                            styles.progressLabel,

                            step.done
                              ? styles.progressTextActive
                              : styles.progressTextInactive,
                          ]}
                        >
                          {step.label}
                        </Text>
                      )
                    )}
                  </View>
                </View>

                <FadeInView
                  key={activeStatus.text}
                  offset={4}
                  style={[
                    styles.progressStatusNote,

                    activeStatus.tone ===
                      'green' &&
                      styles.progressStatusNoteSuccess,

                    activeStatus.tone ===
                      'orange' &&
                      styles.progressStatusNoteWarning,
                  ]}
                >
                  <Ionicons
                    name={activeStatus.icon}
                    size={15}
                    color={
                      activeStatus.tone ===
                      'green'
                        ? COLORS.green
                        : activeStatus.tone ===
                            'orange'
                          ? COLORS.orange
                          : COLORS.muted
                    }
                  />

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.progressStatusText,

                      activeStatus.tone ===
                        'green' &&
                        styles.progressStatusTextSuccess,

                      activeStatus.tone ===
                        'orange' &&
                        styles.progressStatusTextWarning,
                    ]}
                  >
                    {activeStatus.text}
                  </Text>

                  {activeUnread > 0 ? (
                    <View
                      style={
                        styles.unreadPill
                      }
                    >
                      <Text
                        style={
                          styles.unreadPillText
                        }
                      >
                        {activeUnread} new
                      </Text>
                    </View>
                  ) : null}
                </FadeInView>
              </TouchableOpacity>
            ) : null}

            {activeRequestError ? (
              <TouchableOpacity
                style={
                  styles.requestErrorCard
                }
                onPress={() =>
                  loadDashboard()
                }
              >
                <Ionicons
                  name="alert-circle-outline"
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

            </FadeInView>
            ) : null}
            {/* ==================================================
                RESPONDED REQUESTS
            ================================================== */}
            <FadeInView delay={50}>

            {respondedRequests.length >
            0 ? (
              <>
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
                    <Ionicons
                      name="people-outline"
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
                      Your Responded Requests
                    </Text>
                  </View>

                  <View
                    style={
                      styles.respondedCountBadge
                    }
                  >
                    <Text
                      style={
                        styles.respondedCountText
                      }
                    >
                      {
                        respondedRequests.length
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.respondedList
                  }
                >
                  {respondedRequests.map(
                    item => {
                      const statusColor =
                        getRespondedStatusColor(
                          item.response
                        );

                      const accepted =
                        item.response.status ===
                        'accepted';

                      return (
                        <TouchableOpacity
                          key={
                            item.response.id
                          }
                          style={[
                            styles.respondedRequestCard,

                            accepted &&
                              styles.respondedRequestCardAccepted,
                          ]}
                          activeOpacity={
                            0.88
                          }
                          onPress={() =>
                            handleRespondedRequest(
                              item
                            )
                          }
                        >
                          <View
                            style={
                              styles.respondedTop
                            }
                          >
                            <View
                              style={
                                styles.respondedBloodBadge
                              }
                            >
                              <Text
                                style={
                                  styles.respondedBloodText
                                }
                              >
                                {
                                  item.request
                                    .blood_type
                                }
                              </Text>
                            </View>

                            <View
                              style={
                                styles.respondedMain
                              }
                            >
                              <Text
                                numberOfLines={
                                  1
                                }
                                style={
                                  styles.respondedFacility
                                }
                              >
                                {
                                  item.request
                                    .facility_name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.respondedMeta
                                }
                              >
                                {
                                  item.request
                                    .units_needed
                                }{' '}
                                {item.request
                                  .units_needed ===
                                1
                                  ? 'bag'
                                  : 'bags'}{' '}
                                •{' '}
                                {item.request
                                  .urgency ===
                                'urgent'
                                  ? 'Urgent'
                                  : 'Scheduled'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.respondedStatusBadge,

                                {
                                  borderColor:
                                    statusColor,

                                  backgroundColor:
                                    `${statusColor}12`,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.respondedStatusDot,

                                  {
                                    backgroundColor:
                                      statusColor,
                                  },
                                ]}
                              />

                              <Text
                                style={[
                                  styles.respondedStatusText,

                                  {
                                    color:
                                      statusColor,
                                  },
                                ]}
                              >
                                {getRespondedStatusLabel(
                                  item.response
                                )}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={
                              styles.respondedInfoBox
                            }
                          >
                            <View
                              style={
                                styles.respondedInfoItem
                              }
                            >
                              <Ionicons
                                name="time-outline"
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
                                  styles.respondedInfoText
                                }
                              >
                                {formatNeededBy(
                                  item.request
                                    .urgency,
                                  item.request
                                    .needed_date,
                                  item.request
                                    .needed_time
                                )}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.respondedInfoItem
                              }
                            >
                              <Ionicons
                                name="location-outline"
                                size={15}
                                color={
                                  COLORS.redButton
                                }
                              />

                              <Text
                                style={
                                  styles.respondedInfoText
                                }
                              >
                                {item.request
                                  .distance_km.toFixed(
                                    1
                                  )}{' '}
                                km away
                              </Text>
                            </View>
                          </View>

                          {accepted ? (
                            <View
                              style={
                                styles.acceptedRespondedNotice
                              }
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={17}
                                color={
                                  COLORS.green
                                }
                              />

                              <Text
                                style={
                                  styles.acceptedRespondedText
                                }
                              >
                                Your donor offer was accepted. You can now chat with the requester.
                              </Text>
                            </View>
                          ) : null}

                          <View
                            style={
                              styles.respondedFooter
                            }
                          >
                            <Text
                              style={
                                styles.respondedFooterHint
                              }
                            >
                              {item.response.status ===
                              'pending'
                                ? 'Waiting for requester'
                                : item.response.status ===
                                    'accepted'
                                  ? 'Coordination available'
                                  : 'Response history'}
                            </Text>

                            <View
                              style={[
                                styles.respondedAction,

                                accepted &&
                                  styles.respondedActionAccepted,
                              ]}
                            >
                              {accepted ? (
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={16}
                                  color={
                                    COLORS.white
                                  }
                                />
                              ) : null}

                              <Text
                                style={[
                                  styles.respondedActionText,

                                  accepted &&
                                    styles.respondedActionTextAccepted,
                                ]}
                              >
                                {getRespondedActionLabel(
                                  item.response
                                )}
                              </Text>

                              <Ionicons
                                name="chevron-forward"
                                size={17}
                                color={
                                  accepted
                                    ? COLORS.white
                                    : COLORS.redButton
                                }
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </>
            ) : null}

            </FadeInView>
            {/* ==================================================
                NEARBY REQUESTS
            ================================================== */}
            <FadeInView delay={100}>

            <View
              ref={nearbyRef}
              collapsable={false}
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionTitleRow
                }
              >
                <Ionicons
                  name="navigate-outline"
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
                onPress={
                  handleViewAllNearby
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
                  <Ionicons
                    name="locate-outline"
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
                  <Ionicons
                    name="location-outline"
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
                  <Ionicons
                    name="compass-outline"
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
                  {respondedRequests.length >
                  0
                    ? 'No new nearby requests'
                    : 'No nearby active requests'}
                </Text>

                <Text
                  style={
                    styles.nearbyEmptyDescription
                  }
                >
                  {respondedRequests.length >
                  0
                    ? 'Requests you already responded to are listed above. New nearby requests will appear here.'
                    : 'There are currently no blood requests from other users within 25 km.'}
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

                          <Text
                            numberOfLines={1}
                            style={
                              styles.nearbyDistanceText
                            }
                          >
                            {request.distance_km.toFixed(
                              1
                            )}{' '}
                            km ·{' '}
                            {request.units_needed}{' '}
                            {request.units_needed === 1
                              ? 'bag'
                              : 'bags'}{' '}
                            ·{' '}
                            {request.urgency ===
                            'urgent'
                              ? getTimeAgo(
                                  request.created_at
                                )
                              : formatNeededBy(
                                  request.urgency,
                                  request.needed_date
                                )}
                          </Text>
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
                          <Ionicons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'flash'
                                : 'time-outline'
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
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            </FadeInView>
            {/* ==================================================
                FIND DONORS
            ================================================== */}
            <FadeInView delay={150}>

            <View
              ref={findDonorsRef}
              collapsable={false}
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
                    <Ionicons
                      name="people-outline"
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
              </View>

              {/* Label with its action on the right, so the
                  title above keeps the full width. */}
              <View
                style={
                  styles.selectTypeRow
                }
              >
                <Text
                  style={
                    styles.smallLabel
                  }
                >
                  Select Blood Type
                </Text>

                <TouchableOpacity
                  style={[
                    styles.compatibilityChip,

                    isBloodType(
                      selectedBloodType
                    ) &&
                      styles.compatibilityChipActive,
                  ]}
                  activeOpacity={
                    0.75
                  }
                  onPress={() => {
                    if (
                      isBloodType(
                        selectedBloodType
                      )
                    ) {
                      setCompatibilityType(
                        selectedBloodType
                      );

                      return;
                    }

                    showMessage(
                      'Select a Blood Type',
                      'Choose a blood type below first, then tap Compatibility to see which types it matches.'
                    );
                  }}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={13}
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
                </TouchableOpacity>
              </View>

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
                <Ionicons
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
                  {selectedBloodType
                    ? `Find ${selectedBloodType} Donors`
                    : 'Find Donors'}
                </Text>
              </TouchableOpacity>
            </View>

            </FadeInView>
            {/* ==================================================
                DONOR STATUS CARD
            ================================================== */}
            <FadeInView delay={200}>

            <View
              ref={donorCardRef}
              collapsable={false}
              style={[
                styles.donorCard,

                donorApplication?.status ===
                  'approved' &&
                  styles.donorCardApproved,
              ]}
            >
              {/* The whole row opens the application (once
                  approved it is the only way in: no button). */}
              <TouchableOpacity
                style={
                  styles.donorTop
                }
                activeOpacity={
                  0.7
                }
                disabled={
                  loadingDonorApplication
                }
                onPress={
                  handleDonorAction
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
                  <Ionicons
                    name={
                      donorApplication?.status ===
                      'approved'
                        ? 'shield-checkmark'
                        : 'heart-outline'
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
                  {/* The badge sits beside the title, so the
                      subtitle gets the full width. */}
                  <View
                    style={
                      styles.donorTitleRow
                    }
                  >
                    <Text
                      style={
                        styles.donorTitle
                      }
                    >
                      {getDonorCardTitle()}
                    </Text>

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
                  </View>

                  <Text
                    style={[
                      styles.donorSubtitle,

                      donorEligibility &&
                        (donorEligibility.ready
                          ? styles.donorSubtitleReady
                          : styles.donorSubtitleWaiting),
                    ]}
                  >
                    {donorEligibility?.text ??
                      getDonorCardSubtitle()}
                  </Text>
                </View>

                {isApprovedDonor ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      COLORS.green
                    }
                  />
                ) : null}
              </TouchableOpacity>

              {!isApprovedDonor ? (
                <TouchableOpacity
                  style={[
                    styles.applyButton,

                    donorApplication?.status ===
                      'pending' &&
                      styles.applyButtonPending,

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
                        'pending' &&
                        styles.applyButtonPendingText,
                    ]}
                  >
                    {getDonorButtonText()}
                  </Text>

                  {!loadingDonorApplication ? (
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={
                        donorApplication?.status ===
                        'pending'
                          ? COLORS.orange
                          : COLORS.white
                      }
                    />
                  ) : null}
                </TouchableOpacity>
              ) : null}
            </View>
            </FadeInView>
            </View>
          </ScrollView>

          {/* ==================================================
              SHARED BOTTOM NAVIGATION
          ================================================== */}

          <MainBottomNav
            activeTab="home"
            pillRef={navRef}
          />

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
        <Ionicons
          name={
            actionPopup.variant ===
            'success'
              ? 'checkmark-circle'
              : actionPopup.variant ===
                  'warning'
                ? 'warning'
                : actionPopup.variant ===
                    'error'
                  ? 'close-circle'
                  : 'information-circle'
          }
          size={
            ICON_TILE.lg.glyph
          }
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

{/* ==================================================
    BLOOD TYPE COMPATIBILITY POPUP
================================================== */}

<Modal
  visible={
    compatibilityType !== null
  }
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() =>
    setCompatibilityType(null)
  }
>
  <View
    style={
      styles.actionPopupOverlay
    }
  >
    {compatibilityType ? (
      <View
        style={
          styles.actionPopupCard
        }
      >
        <View
          style={
            styles.compatBadge
          }
        >
          <Text
            style={
              styles.compatBadgeText
            }
          >
            {compatibilityType}
          </Text>
        </View>

        <Text
          style={
            styles.actionPopupTitle
          }
        >
          {compatibilityType}{' '}
          Compatibility
        </Text>

        <View
          style={
            styles.matchPanel
          }
        >
          {[
            {
              key: 'receive',
              icon: 'arrow-down' as const,
              label: 'Can receive blood from',
              types:
                getCompatibleDonorTypes(
                  compatibilityType
                ),
            },
            {
              key: 'give',
              icon: 'arrow-up' as const,
              label: 'Can donate blood to',
              types:
                getCompatibleRecipientTypes(
                  compatibilityType
                ),
            },
          ].map(row => (
            <View
              key={row.key}
              style={
                styles.matchRow
              }
            >
              <View
                style={
                  styles.matchLabelRow
                }
              >
                <Ionicons
                  name={row.icon}
                  size={15}
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.matchLabel
                  }
                >
                  {row.label}
                </Text>

                <Text
                  style={
                    styles.matchCount
                  }
                >
                  {row.types.length} of 8
                </Text>
              </View>

              <View
                style={
                  styles.matchChips
                }
              >
                {row.types.map(
                  matchType => (
                    <View
                      key={matchType}
                      style={[
                        styles.matchChip,

                        matchType ===
                          compatibilityType &&
                          styles.matchChipSelf,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matchChipText,

                          matchType ===
                            compatibilityType &&
                            styles.matchChipTextSelf,
                        ]}
                      >
                        {matchType}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          ))}
        </View>

        <Text
          style={
            styles.matchDisclaimer
          }
        >
          Red blood cell guidance only. Hospitals
          confirm compatibility with lab tests.
        </Text>

        <TouchableOpacity
          style={
            styles.actionPopupButton
          }
          activeOpacity={
            0.85
          }
          onPress={() =>
            setCompatibilityType(null)
          }
        >
          <Text
            style={
              styles.actionPopupButtonText
            }
          >
            Close
          </Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </View>
</Modal>

          
          {/* HOME TOUR (optional, on top of everything) */}

          <SpotlightTour
            steps={tourSteps}
            visible={tourVisible}
            onReveal={revealTourStep}
            onFinish={finishTour}
          />
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
    // ========================================================
    // HEADER (red, with the drop and the wave)
    // ========================================================

    header: {
      paddingHorizontal: 20,
      // Room for the wave and the request card floating over it.
      paddingBottom: 92,
      overflow: 'hidden',
    },

    headerDrop: {
      right: -40,
    },

    // ========================================================
    // REQUEST CARD (floats over the header's wave)
    // ========================================================

    emergencySection: {
      marginTop: -64,
      marginHorizontal: 16,
      padding: 16,
      gap: 14,
      borderRadius: 20,
      backgroundColor: COLORS.white,
      shadowColor: COLORS.redDark,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },

    emergencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    emergencyIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FDECEC',
    },

    emergencyContent: {
      flex: 1,
      minWidth: 0,
    },

    emergencyTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      lineHeight: 21,
    },

    emergencyDescription: {
      marginTop: 2,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
    },

    emergencyButton: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      backgroundColor: COLORS.redButton,
    },

    emergencyButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    // "Create Blood Request": a bit larger, with a soft shadow.
    emergencyButtonPrimary: {
      height: 50,
      borderRadius: 14,
      shadowColor: COLORS.redButton,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 4,
    },

    emergencyButtonTextPrimary: {
      fontSize: 15,
    },

    // Everything below the request card.
    sections: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },

    donorTitleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 8,
      rowGap: 4,
    },

    selectTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

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
          ? 440
          : '100%',

      height:
        Platform.OS === 'web'
          ? '100%'
          : '100%',

      maxWidth: '100%',
      overflow: 'hidden',

      backgroundColor:
        COLORS.page,
    },

    // Page color behind the bottom bar's rounded corners.
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    // ========================================================
    // HEADER
    // (height and top padding are set inline: they include
    // the status-bar height)
    // ========================================================




    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    greetingContainer: {
      flex: 1,
      paddingRight: 10,
    },

    helloText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,
    },

    userName: {
      marginTop: 1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 22,
      lineHeight: 31,
    },

    headerPills: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,

      marginTop: 8,
    },

    // Tapping it shows the user's own compatibility below.
    bloodTypePill: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      paddingHorizontal: 10,
      paddingVertical: 0,

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.55)',

      backgroundColor:
        'rgba(255,255,255,0.18)',

      height: 26,
    },

    bloodTypePillText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12.5,

      lineHeight: 16,
    },

    locationPill: {
      flexShrink: 1,

      maxWidth: 190,

      paddingHorizontal: 10,
      paddingVertical: 0,

      flexDirection: 'row',
      alignItems: 'center',

      borderRadius: 13,

      backgroundColor:
        'rgba(255,255,255,0.27)',

      height: 26,

      gap: 4,

      borderWidth: 1,

      borderColor: 'transparent',
    },

    locationText: {
      flexShrink: 1,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,

      lineHeight: 16,
    },

    headerActions: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    notificationButton: {
      position:
        'relative',

      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    headerNotificationBadge: {
      position:
        'absolute',

      top: -3,

      right: -4,

      minWidth: 19,

      height: 19,

      paddingHorizontal: 4,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1.5,

      borderColor:
        COLORS.redDark,

      backgroundColor:
        COLORS.white,
    },

    headerNotificationBadgeText: {
      color:
        COLORS.red,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
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










    // Highlighted "Create Blood Request" call to action:


    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    // paddingBottom is set inline: it includes the space the
    // floating bottom bar covers.
    contentContainer: {
      paddingHorizontal: 0,
      paddingTop: 0,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 12,
    },

    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,
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
        'Inter_600SemiBold',

      fontSize: 12.5,
    },







    // ========================================================
    // ACTIVE REQUEST
    // ========================================================

    activeRequestCard: {
      padding: 16,

      marginBottom: 24,

      borderWidth: 1,

      borderColor:
        '#E3A0A0',

      borderRadius: 16,

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

      marginRight: 8,

      backgroundColor:
        COLORS.green,
    },

    activeRequestTitle: {
      flexShrink: 1,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,
    },

    requestTimeText: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
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

      borderRadius: 14,

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

      fontSize: 13.5,
    },

    activeRequestInfo: {
      flex: 1,
      gap: 6,
    },

    requestInfoRow: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      gap: 8,
    },

    requestInfoText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,
      lineHeight: 18,
    },

    urgentRequestText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',
    },

    // Four bars with their labels under them.
    requestProgress: {
      marginBottom: 14,
      gap: 8,
    },

    progressBars: {
      flexDirection: 'row',
      gap: 6,
    },

    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#EDE6E6',
    },

    progressBarDone: {
      backgroundColor: COLORS.green,
    },

    progressLabels: {
      flexDirection: 'row',
      gap: 6,
    },

    progressLabel: {
      flex: 1,
      textAlign: 'center',
    },







    progressTextActive: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    progressTextInactive: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    progressStatusNote: {
      minHeight: 39,

      marginTop: 0,
      marginBottom: 0,

      paddingHorizontal: 12,
      paddingVertical: 10,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,

      borderRadius: 12,

      backgroundColor:
        '#F5F5F5',
    },

    progressStatusNoteSuccess: {
      backgroundColor:
        '#EDF8F1',
    },

    progressStatusNoteWarning: {
      backgroundColor: '#FDF1E6',
    },

    progressStatusTextWarning: {
      color: COLORS.orange,
    },

    unreadPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: COLORS.red,
    },

    unreadPillText: {
      color: COLORS.white,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
    },

    progressStatusText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
      lineHeight: 16,
    },

    progressStatusTextSuccess: {
      color:
        COLORS.green,
    },



    requestErrorCard: {
      minHeight: 55,

      marginTop: -12,
      marginBottom: 24,

      paddingHorizontal: 12,
      paddingVertical: 10,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,

      borderRadius: 12,

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

      fontSize: 12,
    },

    requestErrorText: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    // ========================================================
    // FIND DONORS
    // ========================================================

    findDonorCard: {
      paddingHorizontal: 16,
      paddingVertical: 16,

      borderWidth: 1,

      borderColor:
        '#D6CACA',

      borderRadius: 16,

      backgroundColor:
        COLORS.card,

      marginBottom: 24,
    },

    findDonorHeader: {
      flexDirection: 'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      marginBottom: 16,
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
      width: 40,
      height: 40,

      borderRadius: 11,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,

      marginRight: 12,
    },

    findDonorTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },

    findDonorSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,
    },

    compatibilityChip: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      paddingHorizontal: 10,
      paddingVertical: 0,

      borderWidth: 1,

      borderColor:
        '#DAAAAA',

      borderRadius: 14,

      height: 28,
    },

    compatibilityText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    // ------------------------------------------------------
    // COMPATIBILITY PANEL
    // ------------------------------------------------------

    matchPanel: {
      marginTop: 12,
      padding: 12,

      gap: 12,

      backgroundColor:
        COLORS.pinkLight,

      borderWidth: 1,

      borderColor:
        '#FDE7E7',

      borderRadius: 14,
    },

    matchRow: {
      gap: 6,
    },

    matchLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 6,
    },

    matchLabel: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12.5,
    },

    matchCount: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    matchChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',

      gap: 6,
    },

    matchChip: {
      minWidth: 40,

      paddingHorizontal: 8,
      paddingVertical: 5,

      alignItems: 'center',

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        '#DAAAAA',

      borderRadius: 10,
    },

    matchChipSelf: {
      backgroundColor:
        COLORS.redButton,

      borderColor:
        COLORS.redButton,
    },

    matchChipText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    matchChipTextSelf: {
      color:
        COLORS.white,
    },

    // Compatibility popup: big blood type badge on top.
    compatBadge: {
      width: 64,
      height: 64,

      alignSelf: 'center',

      marginBottom: 16,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,

      borderRadius: 18,
    },

    compatBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,
    },

    // Chip turns solid once a blood type is selected.
    compatibilityChipActive: {
      backgroundColor:
        COLORS.pinkLight,

      borderColor:
        COLORS.redButton,
    },
    matchDisclaimer: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      textAlign: 'center',

      marginTop: 12,
    },




    smallLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      marginBottom: 0,
    },

    bloodGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      rowGap: 8,
    },

    bloodTypeButton: {
      width: '22.5%',

      height: 44,

      borderWidth: 1,

      borderColor:
        '#878787',

      borderRadius: 12,

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

      fontSize: 13.5,
    },

    bloodTypeTextSelected: {
      color:
        COLORS.white,
    },

    searchButton: {
      height: 44,

      alignSelf: 'stretch',

      marginTop: 16,

      borderRadius: 12,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'center',

      gap: 8,

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

      fontSize: 13.5,
    },

    // ========================================================
    // RESPONDED REQUESTS
    // ========================================================

    respondedCountBadge: {
      minWidth: 24,
      height: 24,

      paddingHorizontal: 7,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#E8F6ED',
    },

    respondedCountText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    respondedList: {
      marginBottom: 8,
    },

    respondedRequestCard: {
      padding: 16,

      marginBottom: 12,

      borderWidth: 1,

      borderColor:
        '#E6D6D6',

      borderRadius: 16,

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

    respondedRequestCardAccepted: {
      borderColor:
        '#B8DEC5',

      backgroundColor:
        '#FBFFFC',
    },

    respondedTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    respondedBloodBadge: {
      width: 48,
      height: 48,

      marginRight: 12,

      borderRadius: 14,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    respondedBloodText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 15,
    },

    respondedMain: {
      flex: 1,

      minWidth: 0,

      paddingRight: 6,
    },

    respondedFacility: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,
    },

    respondedMeta: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,
    },

    respondedStatusBadge: {
      minHeight: 24,

      paddingHorizontal: 8,

      borderWidth: 1,

      borderRadius: 12,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,
    },

    respondedStatusDot: {
      width: 6,
      height: 6,

      borderRadius: 3,
    },

    respondedStatusText: {
      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    respondedInfoBox: {
      marginTop: 12,

      paddingHorizontal: 12,
      paddingVertical: 10,

      borderRadius: 12,

      flexDirection: 'row',

      gap: 10,

      backgroundColor:
        '#FFF8F8',
    },

    respondedInfoItem: {
      flex: 1,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 6,
    },

    respondedInfoText: {
      flexShrink: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,
    },

    acceptedRespondedNotice: {
      minHeight: 44,

      marginTop: 12,

      paddingHorizontal: 12,
      paddingVertical: 10,

      borderRadius: 12,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,

      backgroundColor:
        '#EAF7EF',
    },

    acceptedRespondedText: {
      flex: 1,

      color:
        COLORS.green,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12.5,
      lineHeight: 18,
    },

    respondedFooter: {
      marginTop: 12,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    respondedFooterHint: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    respondedAction: {
      minHeight: 32,

      paddingHorizontal: 8,

      borderRadius: 8,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 2,

      borderWidth: 1,

      borderColor:
        '#E0BABA',

      backgroundColor:
        COLORS.white,
    },

    respondedActionAccepted: {
      borderColor:
        COLORS.green,

      backgroundColor:
        COLORS.green,
    },

    respondedActionText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,
    },

    respondedActionTextAccepted: {
      color:
        COLORS.white,
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

      borderRadius: 16,

      backgroundColor:
        COLORS.card,

      marginBottom: 24,
    },

    nearbyEmptyIcon: {
      width: 52,
      height: 52,

      borderRadius: 14,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,

      marginBottom: 12,
    },

    nearbyEmptyTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,

      textAlign: 'center',
    },

    nearbyEmptyDescription: {
      maxWidth: 275,

      marginTop: 5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,
      lineHeight: 18,

      textAlign: 'center',
    },

    retryNearbyText: {
      marginTop: 10,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,
    },

    // ========================================================
    // NEARBY REQUEST
    // ========================================================

    nearbyRequestCard: {
      padding: 16,

      marginBottom: 12,

      borderWidth: 1,

      borderColor:
        '#E3D2D2',

      borderRadius: 16,

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

      marginBottom: 0,
    },

    nearbyBloodBadge: {
      width: 48,
      height: 48,

      borderRadius: 14,

      marginRight: 12,

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
        'Poppins_600SemiBold',

      fontSize: 13.5,
    },


    nearbyDistanceText: {

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
      marginTop: 3,
    },



    urgencyPill: {
      minHeight: 24,

      paddingHorizontal: 8,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      borderRadius: 12,
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

      fontSize: 11.5,
    },

    urgencyPillTextNeeded: {
      color:
        COLORS.orange,
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

      borderRadius: 16,

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
      width: 44,
      height: 44,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 12,

      borderRadius: 12,

      backgroundColor:
        '#FDECEC',
    },

    heartIconApproved: {
      borderRadius: 12,

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

      fontSize: 13,
    },

    donorSubtitle: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13,

      lineHeight: 18,
    },

    // Approved: the eligibility line, green when they can
    // donate again, orange while the 90 days run.
    donorSubtitleReady: {
      color: '#2F6B45',
    },

    donorSubtitleWaiting: {
      color:
        COLORS.orange,
    },

    pendingBadge: {
      paddingHorizontal: 8,
      paddingVertical: 0,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 4,

      borderRadius: 11,

      backgroundColor:
        '#FFF5E8',

      height: 22,
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

      fontSize: 11.5,
    },



    // At least 200 wide, and wider when the label needs it.
    applyButton: {
      minWidth: 200,

      height: 44,

      paddingHorizontal: 18,

      alignSelf: 'center',

      marginTop: 16,

      borderRadius: 12,

      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'center',

      gap: 6,

      backgroundColor:
        COLORS.redButton,
    },


    applyButtonDisabled: {
      opacity: 0.6,
    },

    applyButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },


    // Same orange as the Pending badge: nothing to do yet,
    // just a way to look at the application.
    applyButtonPending: {
      borderWidth: 1,

      borderColor:
        '#F2C9A2',

      backgroundColor:
        '#FFF5E8',
    },

    applyButtonPendingText: {
      color:
        COLORS.orange,
    },
  
  // ========================================================
// HEMO-HERO ACTION POPUP
// ========================================================

actionPopupOverlay: {
  flex: 1,

  paddingHorizontal: 24,

  alignItems:
    'center',

  justifyContent:
    'center',

  backgroundColor:
    'rgba(0,0,0,0.45)',
},

actionPopupCard: {
  width:
    '100%',

  maxWidth: 340,

  paddingHorizontal: 24,

  paddingTop: 28,

  paddingBottom: 20,

  borderRadius:
    22,

  backgroundColor:
    COLORS.white,

  shadowColor:
    '#000000',

  shadowOffset: {
    width:
      0,

    height:
      8,
  },

  shadowOpacity:
    0.2,

  shadowRadius:
    18,

  elevation:
    10,
},

actionPopupIcon: {
  width: ICON_TILE.lg.size,

  height: ICON_TILE.lg.size,

  alignSelf:
    'center',

  marginBottom: 16,

  borderRadius: ICON_TILE.lg.radius,

  alignItems:
    'center',

  justifyContent:
    'center',

  backgroundColor:
    COLORS.pinkLight,
},

actionPopupIconSuccess: {
  backgroundColor:
    '#EAF7EF',
},

actionPopupIconWarning: {
  backgroundColor:
    '#FFF3E7',
},

actionPopupIconError: {
  backgroundColor:
    COLORS.pinkLight,
},

actionPopupTitle: {
  color:
    COLORS.black,

  fontFamily:
    'Poppins_600SemiBold',

  fontSize: 17,

  lineHeight: 24,

  textAlign:
    'center',
},

actionPopupMessage: {
  marginTop: 6,

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
  height: 48,

  marginTop: 24,

  borderRadius: 12,

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
    13,
},

// ============================================================
// PENDING INVITATION NOTICE
// ============================================================

invitationNotice: {
  minHeight: 68,
  marginBottom: 24,
  paddingHorizontal: 16,
  paddingVertical: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderWidth: 1,
  borderColor: '#F0B8B8',
  borderRadius: 16,
  backgroundColor: COLORS.pinkLight,
},

invitationNoticeIcon: {
  width: 40,
  height: 40,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.white,
},

invitationNoticeText: {
  flex: 1,
  minWidth: 0,
},

invitationNoticeTitle: {
  color: COLORS.black,
  fontFamily: 'Inter_600SemiBold',
  fontSize: 13.5,
  lineHeight: 19,
},

invitationNoticeSubtitle: {
  marginTop: 2,
  color: COLORS.muted,
  fontFamily: 'Inter_400Regular',
  fontSize: 12.5,
  lineHeight: 18,
},
  
  
  });
