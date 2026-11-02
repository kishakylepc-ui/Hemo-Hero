import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../lib/fullScreen';

import {
  cancelBloodRequest,
  getBloodRequestById,
} from '../../lib/api';

import type {
  BloodRequest,
} from '../../lib/api';

import {
  acceptRequestDonorResponse,
  fulfillBloodRequest,
  getRequestDonorResponses,
  rejectRequestDonorResponse,
} from '../../lib/requestResponses';

import type {
  RequestDonorResponse,
  RequestResponseCounts,
} from '../../lib/requestResponses';

import {
  getAccessToken,
} from '../../lib/session';

import {
  FadeInView,
  PressableScale,
} from '../../components/Motion';

import AppModal from '../../components/AppModal';
import DonorTrust from '../../components/DonorTrust';

import {
  getCoordinationInbox,
  isScheduleAgreed,
  type CoordinationInboxItem,
} from '../../lib/coordination';

import {
  getCompatibleDonorTypes,
  isBloodType,
} from '../../lib/bloodCompatibility';

import {
  getFeedbackFrom,
  getRequestDonations,
} from '../../lib/donations';

import type {
  BloodDonation,
} from '../../lib/donations';

function bagsLabel(
  units?: number | null
) {
  const count =
    Number(units) || 0;

  return `${count} ${
    count === 1
      ? 'bag'
      : 'bags'
  }`;
}

function formatDonationDate(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  tileBorder: '#F0D6D6',
  divider: '#F3E9E9',

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  gray: '#9A9A9A',
  grayLight: '#F5EFEF',

  star: '#F2A516',
};

type IconName =
  keyof typeof MaterialIcons.glyphMap;

type Tone =
  | 'green'
  | 'orange'
  | 'blue'
  | 'gray'
  | 'red';

const TONES: Record<
  Tone,
  {
    bg: string;
    fg: string;
  }
> = {
  green: {
    bg: COLORS.greenLight,
    fg: COLORS.green,
  },

  orange: {
    bg: COLORS.orangeLight,
    fg: COLORS.orange,
  },

  blue: {
    bg: COLORS.blueLight,
    fg: COLORS.blue,
  },

  gray: {
    bg: COLORS.grayLight,
    fg: COLORS.muted,
  },

  red: {
    bg: COLORS.pinkLight,
    fg: COLORS.redButton,
  },
};

// ============================================================
// DONOR OFFER STATUS
// ============================================================

const RESPONSE_STATUS: Record<
  RequestDonorResponse['status'],
  {
    label: string;
    tone: Tone;
  }
> = {
  accepted: {
    label: 'Accepted',
    tone: 'green',
  },

  pending: {
    label: 'Pending',
    tone: 'orange',
  },

  no_show: {
    label: 'No-show',
    tone: 'red',
  },

  rejected: {
    label: 'Rejected',
    tone: 'gray',
  },

  withdrawn: {
    label: 'Withdrawn',
    tone: 'gray',
  },
};

// Accepted donors first, finished offers last.
const STATUS_ORDER: Record<
  string,
  number
> = {
  accepted: 0,
  pending: 1,
  no_show: 2,
  rejected: 3,
  withdrawn: 4,
};

// ============================================================
// EMPTY COUNTS
// ============================================================

const EMPTY_RESPONSE_COUNTS: RequestResponseCounts = {
  total: 0,
  pending: 0,
  accepted: 0,
  rejected: 0,
  withdrawn: 0,
  no_show: 0,
};

// ============================================================
// IN-APP ACTION POPUP
// ============================================================

type ActionPopupVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'error';

type ActionPopupState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionPopupVariant;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: () => void;
};

// ============================================================
// SCREEN
// ============================================================

export default function BloodRequestDetailsScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const requestId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    request,
    setRequest,
  ] =
    useState<BloodRequest | null>(
      null
    );

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

  const [
    cancelling,
    setCancelling,
  ] =
    useState(false);

  const [
    fulfilling,
    setFulfilling,
  ] =
    useState(false);

  const [
    donorResponses,
    setDonorResponses,
  ] =
    useState<
      RequestDonorResponse[]
    >([]);

  const [
    donorResponseCounts,
    setDonorResponseCounts,
  ] =
    useState<RequestResponseCounts>(
      EMPTY_RESPONSE_COUNTS
    );

  const [
    loadingResponses,
    setLoadingResponses,
  ] =
    useState(false);

  const [
    responseError,
    setResponseError,
  ] =
    useState('');

  const [
    responseActionId,
    setResponseActionId,
  ] =
    useState<string | null>(
      null
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const hasLoadedOnce =
    useRef(false);

  const [
    actionPopup,
    setActionPopup,
  ] =
    useState<ActionPopupState>({
      visible: false,
      title: '',
      message: '',
      variant: 'info',
      confirmText: 'Okay',
      cancelText: 'Cancel',
      showCancel: false,
      onConfirm: undefined,
    });

  // Confirmed donations (the transaction record) for this
  // request, newest first.
  const [
    donations,
    setDonations,
  ] =
    useState<
      BloodDonation[]
    >([]);

  // Chats with this request's donors: meeting time and unread
  // messages for each donor card.
  const [
    conversations,
    setConversations,
  ] =
    useState<
      CoordinationInboxItem[]
    >([]);

  const insets =
    useSafeAreaInsets();

  // ==========================================================
  // LOAD REQUEST
  // ==========================================================

  const loadRequest =
    useCallback(
      async () => {
        if (!requestId) {
          setErrorMessage(
            'Blood request ID is missing.'
          );

          setLoading(false);

          return;
        }

        try {
          // Only the first load shows the full loader; returning
          // from a donor chat refreshes quietly.
          if (!hasLoadedOnce.current) {
            setLoading(true);
          }

          setErrorMessage('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const data =
            await getBloodRequestById(
              token,
              requestId
            );

          if (
            !data?.request
          ) {
            throw new Error(
              'Blood request could not be found.'
            );
          }

          setRequest(
            data.request
          );

          hasLoadedOnce.current = true;
        } catch (error) {
          console.log(
            'LOAD BLOOD REQUEST ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load this blood request.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        requestId,
      ]
    );

  // ==========================================================
  // LOAD RESPONSES
  // ==========================================================

  const loadDonorResponses =
    useCallback(
      async () => {
        if (!requestId) {
          return;
        }

        try {
          if (!hasLoadedOnce.current) {
            setLoadingResponses(
              true
            );
          }

          setResponseError('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const result =
            await getRequestDonorResponses(
              token,
              requestId
            );

          setDonorResponses(
            result.responses ||
              []
          );

          setDonorResponseCounts(
            result.counts ||
              EMPTY_RESPONSE_COUNTS
          );
        } catch (error) {
          console.log(
            'LOAD DONOR RESPONSES ERROR:',
            error
          );

          setResponseError(
            error instanceof Error
              ? error.message
              : 'Unable to load donor offers.'
          );
        } finally {
          setLoadingResponses(
            false
          );
        }
      },
      [
        requestId,
      ]
    );

  // ==========================================================
  // LOAD DONATIONS
  //
  // Failure only hides donation status; the rest of the
  // screen still works.
  // ==========================================================

  const loadDonations =
    useCallback(
      async () => {
        if (!requestId) {
          return;
        }

        try {
          const token =
            await getAccessToken();

          if (!token) {
            return;
          }

          const result =
            await getRequestDonations(
              token,
              requestId
            );

          setDonations(
            result.donations ||
              []
          );
        } catch (error) {
          console.log(
            'LOAD DONATIONS ERROR:',
            error
          );
        }
      },
      [
        requestId,
      ]
    );

  // ==========================================================
  // LOAD CONVERSATIONS
  //
  // Only adds detail to the donor cards; failure is ignored.
  // ==========================================================

  const loadConversations =
    useCallback(
      async () => {
        if (!requestId) {
          return;
        }

        try {
          const token =
            await getAccessToken();

          if (!token) {
            return;
          }

          const result =
            await getCoordinationInbox(
              token
            );

          setConversations(
            (
              result.conversations ||
              []
            ).filter(
              item =>
                item.request_id ===
                requestId
            )
          );
        } catch (error) {
          console.log(
            'LOAD REQUEST CONVERSATIONS ERROR:',
            error
          );
        }
      },
      [
        requestId,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadRequest();
        loadDonorResponses();
        loadDonations();
        loadConversations();
      },
      [
        loadRequest,
        loadDonorResponses,
        loadDonations,
        loadConversations,
      ]
    )
  );

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([
        loadRequest(),
        loadDonorResponses(),
        loadDonations(),
        loadConversations(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  // Opens the facility in the phone's maps app.
  function openDirections() {
    if (!request) {
      return;
    }

    const query =
      request.facility_latitude != null &&
      request.facility_longitude != null
        ? `${request.facility_latitude},${request.facility_longitude}`
        : [
            request.facility_name,
            request.facility_address,
          ]
            .filter(Boolean)
            .join(', ');

    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`
    ).catch(() =>
      showMessage(
        'Unable to Open Maps',
        'We could not open a maps app on this device.'
      )
    );
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  function getRequestNumber(
    id: string
  ) {
    return id
      .replaceAll(
        '-',
        ''
      )
      .slice(
        0,
        6
      )
      .toUpperCase();
  }

  function formatCreatedAt(
    value: string
  ) {
    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleString(
      'en-US',
      {
        month:
          'short',

        day:
          'numeric',

        year:
          date.getFullYear() ===
          new Date().getFullYear()
            ? undefined
            : 'numeric',

        hour:
          'numeric',

        minute:
          '2-digit',
      }
    );
  }

  function formatNeededBy(
    bloodRequest:
      BloodRequest
  ) {
    if (
      bloodRequest.urgency ===
      'urgent'
    ) {
      return 'As soon as possible';
    }

    if (
      !bloodRequest.needed_date
    ) {
      return 'Not specified';
    }

    const date =
      new Date(
        `${bloodRequest.needed_date}T00:00:00`
      );

    const dateText =
      date.toLocaleDateString(
        'en-US',
        {
          month:
            'long',

          day:
            'numeric',

          year:
            'numeric',
        }
      );

    if (
      !bloodRequest.needed_time
    ) {
      return dateText;
    }

    const [
      hourText,
      minuteText,
    ] =
      bloodRequest
        .needed_time
        .split(':');

    const time =
      new Date();

    time.setHours(
      Number(
        hourText
      ),
      Number(
        minuteText
      ),
      0,
      0
    );

    const timeText =
      time.toLocaleTimeString(
        'en-US',
        {
          hour:
            'numeric',

          minute:
            '2-digit',
        }
      );

    return `${dateText} • ${timeText}`;
  }

  function getStatusLabel() {
    if (!request) {
      return '';
    }

    switch (
      request.status
    ) {
      case 'active':
        return 'Active';

      case 'fulfilled':
        return 'Fulfilled';

      case 'cancelled':
        return 'Cancelled';

      case 'expired':
        return 'Expired';

      default:
        return request.status;
    }
  }

  function getStatusColor() {
    if (!request) {
      return COLORS.gray;
    }

    switch (
      request.status
    ) {
      case 'active':
      case 'fulfilled':
        return COLORS.green;

      case 'cancelled':
        return COLORS.redButton;

      case 'expired':
        return COLORS.orange;

      default:
        return COLORS.gray;
    }
  }

  function getDonorInitials(
    response:
      RequestDonorResponse
  ) {
    const initials =
      [
        response.donor
          ?.first_name,

        response.donor
          ?.last_name,
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
        .join('');

    return initials || 'D';
  }

  function getDonorName(
    response:
      RequestDonorResponse
  ) {
    return (
      response.donor
        ?.full_name ||
      'Hemo-Hero Donor'
    );
  }

  // ==========================================================
  // CUSTOM POPUP HELPERS
  // ==========================================================

  function closeActionPopup() {
    setActionPopup(
      current => ({
        ...current,
        visible: false,
        onConfirm: undefined,
      })
    );
  }

  function getMessageVariant(
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes(
        'accepted'
      ) ||
      value.includes(
        'fulfilled'
      ) ||
      value.includes(
        'cancelled'
      ) ||
      value.includes(
        'confirmed'
      )
    ) {
      return 'success';
    }

    if (
      value.includes(
        'unable'
      ) ||
      value.includes(
        'error'
      )
    ) {
      return 'error';
    }

    return 'info';
  }

  function showMessage(
    title: string,
    message: string,
    onConfirm?: () => void
  ) {
    setActionPopup({
      visible: true,
      title,
      message,

      variant:
        getMessageVariant(
          title
        ),

      confirmText:
        'Okay',

      cancelText:
        'Cancel',

      showCancel:
        false,

      onConfirm,
    });
  }

  function confirmAction(
    title: string,
    message: string,
    actionText: string,
    destructive: boolean,
    onConfirm: () => void
  ) {
    const variant:
      ActionPopupVariant =
      destructive
        ? 'danger'
        : title
              .toLowerCase()
              .includes(
                'accept'
              )
          ? 'success'
          : 'warning';

    setActionPopup({
      visible: true,

      title,

      message,

      variant,

      confirmText:
        actionText,

      cancelText:
        'Cancel',

      showCancel:
        true,

      onConfirm,
    });
  }

  // ==========================================================
  // ACCEPT
  // ==========================================================

  function handleAcceptDonor(
    response:
      RequestDonorResponse
  ) {
    confirmAction(
      'Accept Donor Offer',

      `Accept ${getDonorName(
        response
      )}'s offer to donate?`,

      'Accept',

      false,

      () =>
        performAcceptDonor(
          response
        )
    );
  }

  async function performAcceptDonor(
    response:
      RequestDonorResponse
  ) {
    if (
      !requestId ||
      responseActionId
    ) {
      return;
    }

    try {
      setResponseActionId(
        response.id
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await acceptRequestDonorResponse(
        token,
        requestId,
        response.id
      );

      await loadDonorResponses();

      // Next step is the chat: agree on when to meet there,
      // and confirm the donation there later.
      confirmAction(
        'Donor Accepted',
        `Open the chat with ${getDonorName(
          response
        )} to agree on when to meet. You'll confirm the donation there too.`,
        'Open Chat',
        false,
        () =>
          handleCoordinate({
            ...response,
            status:
              'accepted',
          })
      );
    } catch (error) {
      showMessage(
        'Unable to Accept Donor',

        error instanceof Error
          ? error.message
          : 'Unable to accept this donor offer.'
      );
    } finally {
      setResponseActionId(
        null
      );
    }
  }

  // ==========================================================
  // REJECT
  // ==========================================================

  function handleRejectDonor(
    response:
      RequestDonorResponse
  ) {
    confirmAction(
      'Reject Donor Offer',

      `Reject ${getDonorName(
        response
      )}'s offer to donate?`,

      'Reject',

      true,

      () =>
        performRejectDonor(
          response
        )
    );
  }

  async function performRejectDonor(
    response:
      RequestDonorResponse
  ) {
    if (
      !requestId ||
      responseActionId
    ) {
      return;
    }

    try {
      setResponseActionId(
        response.id
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await rejectRequestDonorResponse(
        token,
        requestId,
        response.id
      );

      await loadDonorResponses();
    } catch (error) {
      showMessage(
        'Unable to Reject Donor',

        error instanceof Error
          ? error.message
          : 'Unable to reject this donor offer.'
      );
    } finally {
      setResponseActionId(
        null
      );
    }
  }

  // ==========================================================
  // COORDINATION
  // ==========================================================

  function handleCoordinate(
    response:
      RequestDonorResponse
  ) {
    if (
      !request ||
      (response.status !==
        'accepted' &&
        response.status !==
          'no_show')
    ) {
      return;
    }

    router.push(
      `/blood-request/${request.id}/coordination/${response.id}` as any
    );
  }

  // ==========================================================
  // DONATIONS
  //
  // Confirming and rating happen in the chat with each donor.
  // This page only shows the records and what to do next.
  // ==========================================================

  const activeDonations =
    donations.filter(
      donation =>
        donation.status !==
        'rejected'
    );

  const recordedUnits =
    activeDonations.reduce(
      (
        total,
        donation
      ) =>
        total +
        (Number(
          donation.units_donated
        ) || 0),
      0
    );

  const reviewDonationCount =
    donations.filter(
      donation =>
        donation.status ===
        'needs_review'
    ).length;

  // Recorded donations the requester has already rated.
  const ratedDonationCount =
    activeDonations.filter(
      donation =>
        Boolean(
          getFeedbackFrom(
            donation,
            'requester'
          )
        )
    ).length;

  // The record that counts for an offer: an active (completed or
  // under review) one first, otherwise the newest rejected one.
  function getDonationForResponse(
    responseId: string
  ) {
    const forResponse =
      donations.filter(
        donation =>
          donation.response_id ===
          responseId
      );

    return (
      forResponse.find(
        donation =>
          donation.status !==
          'rejected'
      ) ||
      forResponse[0] ||
      null
    );
  }

  // ==========================================================
  // FULFILL
  // ==========================================================

  function handleFulfillPress() {
    if (
      !request ||
      request.status !==
        'active' ||
      donorResponseCounts
        .accepted ===
        0 ||
      fulfilling
    ) {
      return;
    }

    if (
      activeDonations.length ===
      0
    ) {
      showMessage(
        'Confirm a Donation First',

        'After your donor donates, confirm it in your chat with them. Then you can mark this request as fulfilled.'
      );

      return;
    }

    confirmAction(
      'Mark Request as Fulfilled',

      `You confirmed ${bagsLabel(
        recordedUnits
      )} of the ${bagsLabel(
        request.units_needed
      )} needed. This closes your request; the confirmed donations are already recorded.`,

      'Mark Fulfilled',

      false,

      performFulfill
    );
  }

  async function performFulfill() {
    if (
      !request ||
      fulfilling
    ) {
      return;
    }

    try {
      setFulfilling(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await fulfillBloodRequest(
        token,
        request.id
      );

      await Promise.all([
        loadRequest(),
        loadDonorResponses(),
        loadDonations(),
      ]);

      showMessage(
        'Request Fulfilled',

        'Your blood request has been marked as fulfilled.'
      );
    } catch (error) {
      showMessage(
        'Unable to Complete Request',

        error instanceof Error
          ? error.message
          : 'Unable to mark this request as fulfilled.'
      );
    } finally {
      setFulfilling(false);
    }
  }

  // ==========================================================
  // CANCEL
  // ==========================================================

  function handleCancelPress() {
    if (
      !request ||
      request.status !==
        'active' ||
      cancelling
    ) {
      return;
    }

    confirmAction(
      'Cancel Blood Request',

      'This request will no longer be visible as active to nearby donors.',

      'Cancel Request',

      true,

      performCancel
    );
  }

  async function performCancel() {
    if (
      !request ||
      cancelling
    ) {
      return;
    }

    try {
      setCancelling(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await cancelBloodRequest(
        token,
        request.id
      );

      showMessage(
        'Blood Request Cancelled',

        'Your blood request has been cancelled successfully.',

        () => {
          router.replace(
            '/dashboard'
          );
        }
      );
    } catch (error) {
      showMessage(
        'Unable to Cancel Request',

        error instanceof Error
          ? error.message
          : 'Unable to cancel your blood request.'
      );
    } finally {
      setCancelling(false);
    }
  }

  // ==========================================================
  // UI HELPERS
  // ==========================================================

  const isActive =
    request?.status ===
    'active';

  // Reported requests stay usable for accepted donors, but
  // inviting new ones waits for the review.
  const canFindDonors =
    isActive &&
    !request?.flagged_at &&
    !request?.removed_at;

  function goBack() {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace(
      '/dashboard'
    );
  }

  function findDonors() {
    if (!request) {
      return;
    }

    router.push({
      pathname:
        '/search',

      params: {
        mode:
          'donors',

        bloodType:
          request.blood_type,
      },
    } as any);
  }

  function openDonorProfile(
    response:
      RequestDonorResponse
  ) {
    if (
      !response.donor?.id
    ) {
      return;
    }

    router.push(
      `/donor/${response.donor.id}` as any
    );
  }

  function getConversation(
    responseId: string
  ) {
    return (
      conversations.find(
        item =>
          item.response_id ===
          responseId
      ) || null
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
      return '';
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

  // Earliest meeting agreed with an accepted donor who has not
  // donated yet.
  const nextMeeting =
    conversations
      .filter(
        item =>
          item.response_status ===
            'accepted' &&
          isScheduleAgreed(
            item.schedule
          ) &&
          (!item.donation ||
            item.donation.status ===
              'rejected')
      )
      .map(
        item =>
          item.schedule!
            .scheduled_at
      )
      .sort()[0] || null;

  const hasDonor =
    donorResponseCounts.accepted >
      0 ||
    activeDonations.length >
      0;

  const steps =
    request
      ? [
          {
            label: 'Posted',
            done: true,
          },
          {
            label: 'Donor',
            done: hasDonor,
          },
          {
            label: 'Scheduled',
            done:
              Boolean(
                nextMeeting
              ) ||
              activeDonations.length >
                0,
          },
          {
            label: 'Donated',
            done:
              activeDonations.length >
              0,
          },
          {
            label: 'Fulfilled',
            done:
              request.status ===
              'fulfilled',
          },
        ]
      : [];

  const currentStep =
    isActive
      ? steps.findIndex(
          step => !step.done
        )
      : -1;

  const sortedResponses =
    [...donorResponses].sort(
      (a, b) =>
        (STATUS_ORDER[
          a.status
        ] ?? 9) -
        (STATUS_ORDER[
          b.status
        ] ?? 9)
    );

  const donorSummary =
    [
      donorResponseCounts.accepted
        ? `${donorResponseCounts.accepted} accepted`
        : '',

      donorResponseCounts.pending
        ? `${donorResponseCounts.pending} pending`
        : '',

      donorResponseCounts.no_show
        ? `${donorResponseCounts.no_show} no-show`
        : '',
    ]
      .filter(Boolean)
      .join(' · ');

  // One line under the progress steps: where the request is
  // and what to do next.
  function getNextStep(): {
    icon: IconName;
    tone: Tone;
    text: string;
  } | null {
    if (
      !request ||
      request.removed_at
    ) {
      return null;
    }

    if (
      request.status ===
      'cancelled'
    ) {
      return {
        icon: 'cancel',
        tone: 'gray',
        text: 'You cancelled this request.',
      };
    }

    if (
      request.status ===
      'expired'
    ) {
      return {
        icon: 'history',
        tone: 'gray',
        text: 'This request expired.',
      };
    }

    if (
      request.status ===
      'fulfilled'
    ) {
      return ratedDonationCount <
        activeDonations.length
        ? {
            icon: 'star-outline',
            tone: 'orange',
            text: 'Fulfilled · rate your donor in the chat',
          }
        : {
            icon: 'task-alt',
            tone: 'green',
            text: 'Fulfilled · thank you!',
          };
    }

    if (
      activeDonations.length >
      0
    ) {
      return recordedUnits >=
        request.units_needed
        ? {
            icon: 'task-alt',
            tone: 'green',
            text: 'All bags received · mark it fulfilled',
          }
        : {
            icon: 'water-drop',
            tone: 'green',
            text: reviewDonationCount
              ? 'Donation in a quick review · mark fulfilled when done'
              : 'Mark fulfilled once you have enough blood',
          };
    }

    if (
      donorResponseCounts.accepted >
      0
    ) {
      return nextMeeting
        ? {
            icon: 'event',
            tone: 'blue',
            text: `Meet ${formatMeeting(
              nextMeeting
            )} · confirm in the chat`,
          }
        : {
            icon: 'forum',
            tone: 'blue',
            text: 'Chat with your donor to set a time',
          };
    }

    if (
      donorResponseCounts.pending >
      0
    ) {
      return {
        icon: 'person-add-alt',
        tone: 'orange',
        text: `${donorResponseCounts.pending} ${
          donorResponseCounts.pending ===
          1
            ? 'offer'
            : 'offers'
        } waiting for you`,
      };
    }

    if (
      donorResponseCounts.no_show
    ) {
      return {
        icon: 'person-off',
        tone: 'orange',
        text: 'Donor didn’t show up · still open to others',
      };
    }

    return {
      icon: 'person-search',
      tone: 'gray',
      text: 'Waiting for compatible donors',
    };
  }

  const nextStep =
    getNextStep();

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
          // The header is drawn behind the status bar; the footer
          // already keeps its button above the home bar.
          edges={[
            'left',
            'right',
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
              COLORS.headerTop,
              COLORS.redDark,
            ]}
            style={withStatusBar(
              styles.header,
              insets.top
            )}
          >
            <View
              style={shiftedDown(
                styles.headerCircleLeft,
                insets.top
              )}
            />

            <View
              style={shiftedDown(
                styles.headerCircleRight,
                insets.top
              )}
            />

            <View
              style={
                styles.headerRow
              }
            >
              <TouchableOpacity
                style={
                  styles.backButton
                }
                accessibilityLabel="Go back"
                onPress={goBack}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>

              <View
                style={
                  styles.headerText
                }
              >
                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  My Request
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                  numberOfLines={1}
                >
                  {request
                    ? `#${getRequestNumber(
                        request.id
                      )} · Posted ${formatCreatedAt(
                        request.created_at
                      )}`
                    : 'Blood request'}
                </Text>
              </View>

              {request ? (
                <View
                  style={
                    styles.headerStatus
                  }
                >
                  <View
                    style={[
                      styles.headerStatusDot,
                      {
                        backgroundColor:
                          getStatusColor(),
                      },
                    ]}
                  />

                  <Text
                    style={
                      styles.headerStatusText
                    }
                  >
                    {request.removed_at
                      ? 'Removed'
                      : getStatusLabel()}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY (rounded sheet over the header)
          ================================================== */}

          <View
            style={
              styles.body
            }
          >
            <ScrollView
              style={
                styles.flex
              }
              contentContainerStyle={
                styles.scrollContent
              }
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
              {loading ? (
                <View
                  style={
                    styles.centerState
                  }
                >
                  <ActivityIndicator
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.centerText
                    }
                  >
                    Loading request...
                  </Text>
                </View>
              ) : errorMessage ? (
                <View
                  style={
                    styles.centerState
                  }
                >
                  <View
                    style={
                      styles.centerIcon
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
                      styles.centerTitle
                    }
                  >
                    Unable to Load
                  </Text>

                  <Text
                    style={
                      styles.centerText
                    }
                  >
                    {errorMessage}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.retryButton
                    }
                    activeOpacity={
                      0.85
                    }
                    onPress={
                      handleRefresh
                    }
                  >
                    <MaterialIcons
                      name="refresh"
                      size={18}
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
              ) : request ? (
                <FadeInView>
                  {/* ==============================================
                      REVIEW NOTICE (reported / removed)
                  ============================================== */}

                  {request.removed_at ? (
                    <View
                      style={[
                        styles.notice,
                        styles.noticeDanger,
                      ]}
                    >
                      <MaterialIcons
                        name="block"
                        size={18}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.noticeText
                        }
                      >
                        <Text
                          style={[
                            styles.noticeTitle,
                            {
                              color:
                                COLORS.redButton,
                            },
                          ]}
                        >
                          Removed by Hemo-Hero.{' '}
                        </Text>

                        {request.removal_reason ||
                          'It was removed after review.'}
                      </Text>
                    </View>
                  ) : request.flagged_at &&
                    isActive ? (
                    <View
                      style={[
                        styles.notice,
                        styles.noticeWarning,
                      ]}
                    >
                      <MaterialIcons
                        name="report-problem"
                        size={18}
                        color={
                          COLORS.orange
                        }
                      />

                      <Text
                        style={
                          styles.noticeText
                        }
                      >
                        <Text
                          style={[
                            styles.noticeTitle,
                            {
                              color:
                                COLORS.orange,
                            },
                          ]}
                        >
                          Under review.{' '}
                        </Text>
                        Hidden from nearby donors while Hemo-Hero checks reports. Accepted donors can still chat with you.
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      SUMMARY + PROGRESS
                  ============================================== */}

                  <View
                    style={
                      styles.card
                    }
                  >
                    <View
                      style={
                        styles.summaryTop
                      }
                    >
                      <View
                        style={
                          styles.bloodCircle
                        }
                      >
                        <Text
                          style={
                            styles.bloodText
                          }
                        >
                          {
                            request.blood_type
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.flexFill
                        }
                      >
                        <Text
                          style={
                            styles.summaryTitle
                          }
                        >
                          {bagsLabel(
                            request.units_needed
                          )}{' '}
                          needed
                        </Text>

                        <Text
                          style={
                            styles.summaryMeta
                          }
                        >
                          {recordedUnits} of{' '}
                          {
                            request.units_needed
                          }{' '}
                          received
                        </Text>

                        <View
                          style={
                            styles.unitsTrack
                          }
                        >
                          <View
                            style={[
                              styles.unitsFill,
                              {
                                width: `${Math.min(
                                  100,
                                  request.units_needed
                                    ? (recordedUnits /
                                        request.units_needed) *
                                        100
                                    : 0
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.urgencyPill,

                          request.urgency ===
                            'urgent' &&
                            styles.urgencyPillUrgent,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            request.urgency ===
                            'urgent'
                              ? 'bolt'
                              : 'schedule'
                          }
                          size={14}
                          color={
                            request.urgency ===
                            'urgent'
                              ? COLORS.white
                              : COLORS.redButton
                          }
                        />

                        <Text
                          style={[
                            styles.urgencyText,

                            request.urgency ===
                              'urgent' &&
                              styles.urgencyTextUrgent,
                          ]}
                        >
                          {request.urgency ===
                          'urgent'
                            ? 'Urgent'
                            : 'Scheduled'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.steps
                      }
                    >
                      {steps.map(
                        (
                          step,
                          index
                        ) => {
                          const current =
                            index ===
                            currentStep;

                          return (
                            <View
                              key={
                                step.label
                              }
                              style={
                                styles.step
                              }
                            >
                              <View
                                style={
                                  styles.stepTrack
                                }
                              >
                                <View
                                  style={[
                                    styles.stepLine,

                                    index ===
                                      0 &&
                                      styles.stepLineHidden,

                                    (step.done ||
                                      current) &&
                                      styles.stepLineDone,
                                  ]}
                                />

                                <View
                                  style={[
                                    styles.stepDot,

                                    step.done &&
                                      styles.stepDotDone,

                                    current &&
                                      styles.stepDotCurrent,
                                  ]}
                                >
                                  {step.done ? (
                                    <MaterialIcons
                                      name="check"
                                      size={11}
                                      color={
                                        COLORS.white
                                      }
                                    />
                                  ) : null}
                                </View>

                                <View
                                  style={[
                                    styles.stepLine,

                                    index ===
                                      steps.length -
                                        1 &&
                                      styles.stepLineHidden,

                                    steps[
                                      index + 1
                                    ]?.done &&
                                      styles.stepLineDone,
                                  ]}
                                />
                              </View>

                              <Text
                                style={[
                                  styles.stepLabel,

                                  (step.done ||
                                    current) &&
                                    styles.stepLabelDone,
                                ]}
                                numberOfLines={1}
                              >
                                {step.label}
                              </Text>
                            </View>
                          );
                        }
                      )}
                    </View>

                    {nextStep ? (
                      <View
                        style={[
                          styles.nextStep,
                          {
                            backgroundColor:
                              TONES[
                                nextStep.tone
                              ].bg,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            nextStep.icon
                          }
                          size={16}
                          color={
                            TONES[
                              nextStep.tone
                            ].fg
                          }
                        />

                        <Text
                          style={[
                            styles.nextStepText,
                            {
                              color:
                                TONES[
                                  nextStep.tone
                                ].fg,
                            },
                          ]}
                        >
                          {nextStep.text}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* ==============================================
                      DETAILS
                  ============================================== */}

                  <Text
                    style={[
                      styles.sectionTitle,
                      styles.sectionGap,
                    ]}
                  >
                    Details
                  </Text>

                  <View
                    style={
                      styles.card
                    }
                  >
                    <InfoRow
                      icon="local-hospital"
                      label="Donation place"
                      value={
                        request.facility_name
                      }
                      sub={
                        request.facility_address
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.directionsButton
                        }
                        activeOpacity={
                          0.8
                        }
                        accessibilityLabel="Get directions"
                        onPress={
                          openDirections
                        }
                      >
                        <MaterialIcons
                          name="directions"
                          size={16}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.directionsText
                          }
                        >
                          Directions
                        </Text>
                      </TouchableOpacity>
                    </InfoRow>

                    <InfoRow
                      icon="event"
                      label="Needed by"
                      value={formatNeededBy(
                        request
                      )}
                      last={
                        !isBloodType(
                          request.blood_type
                        ) &&
                        !request.message
                      }
                    />

                    {isBloodType(
                      request.blood_type
                    ) ? (
                      <InfoRow
                        icon="groups"
                        label="Who can donate"
                        last={
                          !request.message
                        }
                      >
                        <View
                          style={
                            styles.typeChips
                          }
                        >
                          {getCompatibleDonorTypes(
                            request.blood_type
                          ).map(
                            type => (
                              <View
                                key={type}
                                style={
                                  styles.typeChip
                                }
                              >
                                <Text
                                  style={
                                    styles.typeChipText
                                  }
                                >
                                  {type}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                      </InfoRow>
                    ) : null}

                    {request.message ? (
                      <InfoRow
                        icon="notes"
                        label="Your note"
                        value={
                          request.message
                        }
                        valueRegular
                        last
                      />
                    ) : null}
                  </View>

                  {/* ==============================================
                      DONORS
                  ============================================== */}

                  <View
                    style={[
                      styles.sectionHeader,
                      styles.sectionGap,
                    ]}
                  >
                    <View
                      style={
                        styles.flexFill
                      }
                    >
                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        Donors
                        {donorResponseCounts.total
                          ? ` (${donorResponseCounts.total})`
                          : ''}
                      </Text>

                      {donorSummary ? (
                        <Text
                          style={
                            styles.sectionMeta
                          }
                        >
                          {donorSummary}
                        </Text>
                      ) : null}
                    </View>

                    {canFindDonors ? (
                      <TouchableOpacity
                        style={
                          styles.linkButton
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          findDonors
                        }
                      >
                        <MaterialIcons
                          name="person-search"
                          size={16}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.linkButtonText
                          }
                        >
                          Find donors
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {loadingResponses ? (
                    <View
                      style={[
                        styles.card,
                        styles.emptyCard,
                      ]}
                    >
                      <ActivityIndicator
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>
                  ) : responseError ? (
                    <View
                      style={[
                        styles.card,
                        styles.emptyCard,
                      ]}
                    >
                      <Text
                        style={
                          styles.emptyText
                        }
                      >
                        {responseError}
                      </Text>

                      <TouchableOpacity
                        style={
                          styles.linkButton
                        }
                        onPress={
                          handleRefresh
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
                            styles.linkButtonText
                          }
                        >
                          Try again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : sortedResponses.length ===
                    0 ? (
                    <View
                      style={[
                        styles.card,
                        styles.emptyCard,
                      ]}
                    >
                      <View
                        style={
                          styles.emptyIcon
                        }
                      >
                        <MaterialIcons
                          name="volunteer-activism"
                          size={24}
                          color={
                            COLORS.redButton
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.emptyTitle
                        }
                      >
                        No offers yet
                      </Text>

                      <Text
                        style={
                          styles.emptyText
                        }
                      >
                        {isActive
                          ? 'Compatible donors nearby can offer to help.'
                          : 'No donor offered on this request.'}
                      </Text>
                    </View>
                  ) : (
                    sortedResponses.map(
                      (
                        response,
                        index
                      ) => {
                        const status =
                          RESPONSE_STATUS[
                            response.status
                          ] ||
                          RESPONSE_STATUS.withdrawn;

                        const working =
                          responseActionId ===
                          response.id;

                        const conversation =
                          getConversation(
                            response.id
                          );

                        const unread =
                          conversation
                            ?.unread_count ||
                          0;

                        const donation =
                          response.status ===
                          'accepted'
                            ? getDonationForResponse(
                                response.id
                              )
                            : null;

                        const donationActive =
                          Boolean(
                            donation &&
                              donation.status !==
                                'rejected'
                          );

                        const myFeedback =
                          donationActive
                            ? getFeedbackFrom(
                                donation,
                                'requester'
                              )
                            : null;

                        const donorFeedback =
                          donationActive
                            ? getFeedbackFrom(
                                donation,
                                'donor'
                              )
                            : null;

                        // The next step, which happens in the chat.
                        const chatHint =
                          response.status !==
                          'accepted'
                            ? ''
                            : donationActive
                              ? myFeedback
                                ? ''
                                : 'Rate your donor in the chat.'
                              : !isActive
                                ? ''
                                : donation?.status ===
                                    'rejected'
                                  ? 'Confirm it again in the chat.'
                                  : isScheduleAgreed(
                                        conversation?.schedule
                                      )
                                    ? 'After they donate, confirm the donation in the chat.'
                                    : 'Agree on a meeting time in the chat. You confirm the donation there too.';

                        const chatIsMainAction =
                          response.status ===
                          'accepted';

                        const meeting =
                          response.status ===
                            'accepted' &&
                          !donationActive &&
                          conversation
                            ?.schedule
                            ? `${formatMeeting(
                                conversation
                                  .schedule
                                  .scheduled_at
                              )}${
                                isScheduleAgreed(
                                  conversation.schedule
                                )
                                  ? ''
                                  : ' · not agreed yet'
                              }`
                            : '';

                        const place =
                          [
                            response.donor
                              ?.city,

                            response.donor
                              ?.province,
                          ]
                            .filter(Boolean)
                            .join(', ');

                        const faded =
                          response.status ===
                            'rejected' ||
                          response.status ===
                            'withdrawn';

                        const chatButton =
                          response.status ===
                            'accepted' ||
                          response.status ===
                            'no_show' ? (
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                chatIsMainAction
                                  ? styles.actionFilled
                                  : styles.actionOutline,
                              ]}
                              activeOpacity={
                                0.85
                              }
                              onPress={() =>
                                handleCoordinate(
                                  response
                                )
                              }
                            >
                              <MaterialIcons
                                name="forum"
                                size={17}
                                color={
                                  chatIsMainAction
                                    ? COLORS.white
                                    : COLORS.redButton
                                }
                              />

                              <Text
                                style={
                                  chatIsMainAction
                                    ? styles.actionFilledText
                                    : styles.actionOutlineText
                                }
                              >
                                Open Chat
                              </Text>

                              {unread >
                              0 ? (
                                <View
                                  style={[
                                    styles.badge,
                                    chatIsMainAction &&
                                      styles.badgeOnFilled,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      chatIsMainAction &&
                                        styles.badgeTextOnFilled,
                                    ]}
                                  >
                                    {unread > 9
                                      ? '9+'
                                      : unread}
                                  </Text>
                                </View>
                              ) : null}
                            </TouchableOpacity>
                          ) : null;

                        return (
                          <FadeInView
                            key={`${response.id}-${response.status}`}
                            delay={Math.min(
                              index *
                                50,
                              200
                            )}
                            offset={8}
                            style={[
                              styles.donorCard,

                              response.status ===
                                'accepted' &&
                                styles.donorCardAccepted,

                              faded &&
                                styles.donorCardFaded,
                            ]}
                          >
                            <View
                              style={
                                styles.donorTop
                              }
                            >
                              <TouchableOpacity
                                style={
                                  styles.donorIdentity
                                }
                                activeOpacity={
                                  0.75
                                }
                                disabled={
                                  !response
                                    .donor
                                    ?.id
                                }
                                accessibilityLabel={`View ${getDonorName(
                                  response
                                )}'s profile`}
                                onPress={() =>
                                  openDonorProfile(
                                    response
                                  )
                                }
                              >
                                <View
                                  style={
                                    styles.avatar
                                  }
                                >
                                  <Text
                                    style={
                                      styles.avatarText
                                    }
                                  >
                                    {getDonorInitials(
                                      response
                                    )}
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.flexFill
                                  }
                                >
                                  <View
                                    style={
                                      styles.donorNameRow
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.donorName
                                      }
                                      numberOfLines={
                                        1
                                      }
                                    >
                                      {getDonorName(
                                        response
                                      )}
                                    </Text>

                                    {response
                                      .donor
                                      ?.is_verified ? (
                                      <MaterialIcons
                                        name="verified"
                                        size={15}
                                        color={
                                          COLORS.blue
                                        }
                                      />
                                    ) : null}
                                  </View>

                                  <Text
                                    style={
                                      styles.donorMeta
                                    }
                                    numberOfLines={
                                      1
                                    }
                                  >
                                    {[
                                      response
                                        .donor
                                        ?.blood_type,

                                      place,
                                    ]
                                      .filter(
                                        Boolean
                                      )
                                      .join(
                                        ' · '
                                      ) ||
                                      'Donor'}
                                  </Text>

                                  <DonorTrust
                                    stats={
                                      response.donor
                                    }
                                    style={
                                      styles.donorTrust
                                    }
                                  />
                                </View>
                              </TouchableOpacity>

                              <View
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor:
                                      TONES[
                                        status.tone
                                      ].bg,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    {
                                      color:
                                        TONES[
                                          status.tone
                                        ].fg,
                                    },
                                  ]}
                                >
                                  {status.label}
                                </Text>
                              </View>
                            </View>

                            {response.message ? (
                              <Text
                                style={
                                  styles.donorMessage
                                }
                                numberOfLines={
                                  3
                                }
                              >
                                “{response.message}”
                              </Text>
                            ) : null}

                            {meeting ? (
                              <View
                                style={
                                  styles.inlineNote
                                }
                              >
                                <MaterialIcons
                                  name="event"
                                  size={15}
                                  color={
                                    COLORS.blue
                                  }
                                />

                                <Text
                                  style={[
                                    styles.inlineNoteText,
                                    {
                                      color:
                                        COLORS.blue,
                                    },
                                  ]}
                                >
                                  Meeting {meeting}
                                </Text>
                              </View>
                            ) : null}

                            {donation &&
                            donation.status ===
                              'rejected' &&
                            isActive ? (
                              <View
                                style={
                                  styles.inlineNote
                                }
                              >
                                <MaterialIcons
                                  name="error-outline"
                                  size={15}
                                  color={
                                    COLORS.redButton
                                  }
                                />

                                <Text
                                  style={[
                                    styles.inlineNoteText,
                                    {
                                      color:
                                        COLORS.redButton,
                                    },
                                  ]}
                                >
                                  Record not accepted:{' '}
                                  {donation.admin_note ||
                                    'please check the details.'}
                                </Text>
                              </View>
                            ) : null}

                            {/* Donation record + ratings */}
                            {donation &&
                            donationActive ? (
                              <View
                                style={
                                  styles.recordBox
                                }
                              >
                                <View
                                  style={
                                    styles.recordRow
                                  }
                                >
                                  <MaterialIcons
                                    name={
                                      donation.status ===
                                      'completed'
                                        ? 'task-alt'
                                        : 'hourglass-top'
                                    }
                                    size={16}
                                    color={
                                      donation.status ===
                                      'completed'
                                        ? COLORS.green
                                        : COLORS.orange
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.recordText
                                    }
                                    numberOfLines={
                                      1
                                    }
                                  >
                                    {bagsLabel(
                                      donation.units_donated
                                    )}{' '}
                                    ·{' '}
                                    {formatDonationDate(
                                      donation.donated_at
                                    )}
                                  </Text>

                                  <View
                                    style={[
                                      styles.chip,
                                      {
                                        backgroundColor:
                                          donation.status ===
                                          'completed'
                                            ? COLORS.greenLight
                                            : COLORS.orangeLight,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.chipText,
                                        {
                                          color:
                                            donation.status ===
                                            'completed'
                                              ? COLORS.green
                                              : COLORS.orange,
                                        },
                                      ]}
                                    >
                                      {donation.status ===
                                      'completed'
                                        ? 'Recorded'
                                        : 'In review'}
                                    </Text>
                                  </View>
                                </View>

                                {myFeedback ? (
                                  <View
                                    style={
                                      styles.ratingRow
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.ratingLabel
                                      }
                                    >
                                      You rated
                                    </Text>

                                    <StarRow
                                      rating={
                                        myFeedback.rating
                                      }
                                    />
                                  </View>
                                ) : null}

                                {donorFeedback ? (
                                  <View
                                    style={
                                      styles.ratingRow
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.ratingLabel
                                      }
                                    >
                                      They rated
                                    </Text>

                                    <StarRow
                                      rating={
                                        donorFeedback.rating
                                      }
                                    />
                                  </View>
                                ) : null}

                                {donorFeedback?.comment ? (
                                  <Text
                                    style={
                                      styles.ratingComment
                                    }
                                    numberOfLines={
                                      3
                                    }
                                  >
                                    “{donorFeedback.comment}”
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}

                            {/* Actions */}
                            {response.status ===
                              'pending' &&
                            isActive ? (
                              <View
                                style={
                                  styles.cardActions
                                }
                              >
                                <TouchableOpacity
                                  style={[
                                    styles.actionButton,
                                    styles.actionOutline,
                                  ]}
                                  activeOpacity={
                                    0.85
                                  }
                                  disabled={Boolean(
                                    responseActionId
                                  )}
                                  onPress={() =>
                                    handleRejectDonor(
                                      response
                                    )
                                  }
                                >
                                  <Text
                                    style={
                                      styles.actionOutlineText
                                    }
                                  >
                                    Reject
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.actionButton,
                                    styles.actionFilled,
                                  ]}
                                  activeOpacity={
                                    0.85
                                  }
                                  disabled={Boolean(
                                    responseActionId
                                  )}
                                  onPress={() =>
                                    handleAcceptDonor(
                                      response
                                    )
                                  }
                                >
                                  {working ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={
                                        COLORS.white
                                      }
                                    />
                                  ) : (
                                    <MaterialIcons
                                      name="check"
                                      size={17}
                                      color={
                                        COLORS.white
                                      }
                                    />
                                  )}

                                  <Text
                                    style={
                                      styles.actionFilledText
                                    }
                                  >
                                    Accept
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            ) : chatButton ? (
                              <View
                                style={
                                  styles.cardActions
                                }
                              >
                                {chatButton}
                              </View>
                            ) : null}

                            {chatHint ? (
                              <View
                                style={
                                  styles.chatHint
                                }
                              >
                                <MaterialIcons
                                  name="chat-bubble-outline"
                                  size={14}
                                  color={
                                    COLORS.muted
                                  }
                                />

                                <Text
                                  style={
                                    styles.chatHintText
                                  }
                                >
                                  {chatHint}
                                </Text>
                              </View>
                            ) : null}
                          </FadeInView>
                        );
                      }
                    )
                  )}
                </FadeInView>
              ) : null}
            </ScrollView>

            {/* ==================================================
                FOOTER ACTION
            ================================================== */}

            {request &&
            !loading &&
            !errorMessage ? (
              <View
                style={[
                  styles.footer,
                  {
                    paddingBottom:
                      Math.max(
                        insets.bottom,
                        12
                      ),
                  },
                ]}
              >
                {isActive &&
                activeDonations.length >
                  0 ? (
                  <PressableScale
                    style={
                      styles.primaryButton
                    }
                    disabled={
                      fulfilling
                    }
                    accessibilityRole="button"
                    onPress={
                      handleFulfillPress
                    }
                  >
                    <LinearGradient
                      colors={[
                        COLORS.headerTop,
                        COLORS.redDark,
                      ]}
                      start={{
                        x: 0,
                        y: 0,
                      }}
                      end={{
                        x: 1,
                        y: 1,
                      }}
                      style={
                        styles.primaryGradient
                      }
                    >
                      {fulfilling ? (
                        <ActivityIndicator
                          color={
                            COLORS.white
                          }
                        />
                      ) : (
                        <MaterialIcons
                          name="task-alt"
                          size={20}
                          color={
                            COLORS.white
                          }
                        />
                      )}

                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        {fulfilling
                          ? 'Completing...'
                          : 'Mark as Fulfilled'}
                      </Text>
                    </LinearGradient>
                  </PressableScale>
                ) : isActive ? (
                  <TouchableOpacity
                    style={
                      styles.cancelButton
                    }
                    activeOpacity={
                      0.85
                    }
                    disabled={
                      cancelling
                    }
                    onPress={
                      handleCancelPress
                    }
                  >
                    {cancelling ? (
                      <ActivityIndicator
                        color={
                          COLORS.redButton
                        }
                      />
                    ) : (
                      <MaterialIcons
                        name="close"
                        size={19}
                        color={
                          COLORS.redButton
                        }
                      />
                    )}

                    <Text
                      style={
                        styles.cancelText
                      }
                    >
                      {cancelling
                        ? 'Cancelling...'
                        : 'Cancel Request'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <PressableScale
                    style={
                      styles.primaryButton
                    }
                    accessibilityRole="button"
                    onPress={() =>
                      router.replace(
                        '/dashboard'
                      )
                    }
                  >
                    <LinearGradient
                      colors={[
                        COLORS.headerTop,
                        COLORS.redDark,
                      ]}
                      start={{
                        x: 0,
                        y: 0,
                      }}
                      end={{
                        x: 1,
                        y: 1,
                      }}
                      style={
                        styles.primaryGradient
                      }
                    >
                      <MaterialIcons
                        name="home"
                        size={20}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        Back to Home
                      </Text>
                    </LinearGradient>
                  </PressableScale>
                )}
              </View>
            ) : null}
          </View>
        </SafeAreaView>

        {/* ====================================================
            IN-APP ACTION POPUP
        ==================================================== */}

        <AppModal
          visible={
            actionPopup.visible
          }
          variant={
            actionPopup.variant
          }
          title={
            actionPopup.title
          }
          message={
            actionPopup.message
          }
          confirmLabel={
            actionPopup.confirmText
          }
          cancelLabel={
            actionPopup.showCancel
              ? actionPopup.cancelText
              : undefined
          }
          onConfirm={() => {
            const action =
              actionPopup.onConfirm;

            closeActionPopup();

            if (action) {
              action();
            }
          }}
          onClose={
            closeActionPopup
          }
        />
      </View>
    </View>
  );
}

// ============================================================
// STAR ROW (read-only rating)
// ============================================================

function StarRow({
  rating,
}: {
  rating: number;
}) {
  return (
    <View
      style={
        styles.starRow
      }
      accessible
      accessibilityLabel={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        value => (
          <MaterialIcons
            key={value}
            name={
              value <= rating
                ? 'star'
                : 'star-border'
            }
            size={15}
            color={
              value <= rating
                ? COLORS.star
                : '#D9C3C3'
            }
          />
        )
      )}
    </View>
  );
}

// ============================================================
// INFO ROW (icon, small label, value)
// ============================================================

function InfoRow({
  icon,
  label,
  value,
  sub,
  valueRegular,
  last,
  children,
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  sub?: string | null;
  valueRegular?: boolean;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        !last &&
          styles.infoRowDivider,
      ]}
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <MaterialIcons
          name={icon}
          size={18}
          color={
            COLORS.redButton
          }
        />
      </View>

      <View
        style={
          styles.flexFill
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        {value ? (
          <Text
            style={[
              styles.infoValue,

              valueRegular &&
                styles.infoValueRegular,
            ]}
          >
            {value}
          </Text>
        ) : null}

        {sub ? (
          <Text
            style={
              styles.infoSub
            }
          >
            {sub}
          </Text>
        ) : null}

        {children}
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    flexFill: {
      flex: 1,
      minWidth: 0,
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
      height: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      backgroundColor: COLORS.page,
    },

    safeArea: {
      flex: 1,
      backgroundColor: COLORS.headerTop,
    },

    // ==========================================================
    // HEADER
    // ==========================================================

    // Bottom padding leaves room for the rounded body sheet,
    // which overlaps the header by 22.
    header: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 10,
      paddingBottom: 38,
      overflow: 'hidden',
    },

    headerCircleLeft: {
      position: 'absolute',
      width: 165,
      height: 165,
      borderRadius: 83,
      left: -100,
      top: -70,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },

    headerCircleRight: {
      position: 'absolute',
      width: 175,
      height: 175,
      borderRadius: 88,
      right: -70,
      top: -80,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 40,
      height: 40,
      marginRight: 12,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      color: COLORS.white,
      fontFamily: 'Poppins_700Bold',
      fontSize: 21,
      lineHeight: 29,
    },

    headerSubtitle: {
      color: 'rgba(255,255,255,0.82)',
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    headerStatus: {
      marginLeft: 10,
      paddingHorizontal: 10,
      height: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.16)',
    },

    headerStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.7)',
    },

    headerStatusText: {
      color: COLORS.white,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },

    // ==========================================================
    // BODY
    // ==========================================================

    body: {
      flex: 1,
      marginTop: -22,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      overflow: 'hidden',
      backgroundColor: COLORS.page,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 24,
    },

    centerState: {
      minHeight: 320,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    centerIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    centerTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    centerText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 6,
      height: 42,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 12,
      backgroundColor: COLORS.redButton,
    },

    retryButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13.5,
    },

    // ==========================================================
    // NOTICE
    // ==========================================================

    notice: {
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      borderRadius: 12,
      borderWidth: 1,
    },

    noticeWarning: {
      borderColor: '#F5D2B3',
      backgroundColor: COLORS.orangeLight,
    },

    noticeDanger: {
      borderColor: '#F2C4C4',
      backgroundColor: COLORS.pinkLight,
    },

    noticeTitle: {
      fontFamily: 'Inter_700Bold',
    },

    noticeText: {
      flex: 1,
      color: COLORS.black,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
    },

    // ==========================================================
    // CARDS / SECTIONS
    // ==========================================================

    card: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.white,
    },

    sectionGap: {
      marginTop: 20,
    },

    sectionHeader: {
      marginBottom: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    sectionTitle: {
      marginBottom: 9,
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14.5,
    },

    sectionMeta: {
      marginTop: -8,
      color: COLORS.muted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
    },

    linkButton: {
      minHeight: 32,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 16,
      backgroundColor: COLORS.pinkLight,
    },

    linkButtonText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    // ==========================================================
    // SUMMARY
    // ==========================================================

    summaryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    bloodCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.redButton,
    },

    bloodText: {
      color: COLORS.white,
      fontFamily: 'Poppins_700Bold',
      fontSize: 18,
    },

    summaryTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      lineHeight: 22,
    },

    summaryMeta: {
      color: COLORS.muted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
    },

    unitsTrack: {
      marginTop: 6,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: COLORS.grayLight,
    },

    unitsFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: COLORS.green,
    },

    urgencyPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      height: 26,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 13,
      backgroundColor: COLORS.pinkLight,
    },

    urgencyPillUrgent: {
      backgroundColor: COLORS.redButton,
    },

    urgencyText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11.5,
    },

    urgencyTextUrgent: {
      color: COLORS.white,
    },

    // Progress steps
    steps: {
      marginTop: 16,
      flexDirection: 'row',
    },

    step: {
      flex: 1,
      alignItems: 'center',
    },

    stepTrack: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
    },

    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: COLORS.divider,
    },

    stepLineHidden: {
      opacity: 0,
    },

    stepLineDone: {
      backgroundColor: COLORS.green,
    },

    stepDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#D9C9C9',
      backgroundColor: COLORS.white,
    },

    stepDotDone: {
      borderColor: COLORS.green,
      backgroundColor: COLORS.green,
    },

    stepDotCurrent: {
      borderWidth: 2,
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.pinkLight,
    },

    stepLabel: {
      marginTop: 5,
      color: COLORS.lightMuted,
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
    },

    stepLabelDone: {
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
    },

    nextStep: {
      marginTop: 14,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
    },

    nextStepText: {
      flex: 1,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      lineHeight: 17,
    },

    // ==========================================================
    // DETAILS
    // ==========================================================

    infoRow: {
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
    },

    infoRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: COLORS.divider,
    },

    infoIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    infoLabel: {
      color: COLORS.lightMuted,
      fontFamily: 'Inter_500Medium',
      fontSize: 11.5,
    },

    infoValue: {
      marginTop: 1,
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      lineHeight: 19,
    },

    infoValueRegular: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
    },

    infoSub: {
      marginTop: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },

    directionsButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
      height: 30,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: COLORS.tileBorder,
      backgroundColor: COLORS.white,
    },

    directionsText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },

    typeChips: {
      marginTop: 5,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },

    typeChip: {
      minWidth: 36,
      paddingHorizontal: 8,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.tileBorder,
      backgroundColor: COLORS.pinkLight,
    },

    typeChipText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_700Bold',
      fontSize: 11.5,
    },

    // ==========================================================
    // DONORS
    // ==========================================================

    emptyCard: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 20,
    },

    emptyIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    emptyTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    emptyText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
      textAlign: 'center',
    },

    donorCard: {
      marginBottom: 10,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.white,
    },

    donorCardAccepted: {
      borderColor: '#BFE3CC',
    },

    donorCardFaded: {
      opacity: 0.6,
    },

    donorTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    donorIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    avatarText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    donorNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },

    donorName: {
      flexShrink: 1,
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    donorMeta: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    donorTrust: {
      marginTop: 5,
    },

    chip: {
      paddingHorizontal: 9,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },

    chipText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11.5,
    },

    donorMessage: {
      marginTop: 10,
      color: COLORS.black,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
      fontSize: 13,
      lineHeight: 19,
    },

    inlineNote: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    inlineNoteText: {
      flex: 1,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      lineHeight: 17,
    },

    recordBox: {
      marginTop: 10,
      padding: 10,
      gap: 7,
      borderRadius: 11,
      backgroundColor: '#FBF6F6',
    },

    recordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    recordText: {
      flex: 1,
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    ratingLabel: {
      width: 72,
      color: COLORS.muted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
    },

    ratingComment: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
      fontSize: 12.5,
      lineHeight: 18,
    },

    starRow: {
      flexDirection: 'row',
      gap: 1,
    },

    cardActions: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8,
    },

    // The next step, which happens in the chat.
    chatHint: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    chatHintText: {
      flex: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },

    actionButton: {
      flex: 1,
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 11,
    },

    actionOutline: {
      borderWidth: 1,
      borderColor: COLORS.tileBorder,
      backgroundColor: COLORS.white,
    },

    actionOutlineText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13.5,
    },

    actionFilled: {
      backgroundColor: COLORS.redButton,
    },

    actionFilledText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13.5,
    },

    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: COLORS.red,
    },

    badgeText: {
      color: COLORS.white,
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
    },

    badgeOnFilled: {
      backgroundColor: COLORS.white,
    },

    badgeTextOnFilled: {
      color: COLORS.redButton,
    },

    // ==========================================================
    // FOOTER
    // ==========================================================

    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#EFE3E3',
      backgroundColor: COLORS.white,
    },

    primaryButton: {
      borderRadius: 13,
      overflow: 'hidden',
    },

    primaryGradient: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    primaryText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    cancelButton: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.white,
    },

    cancelText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },
  });
