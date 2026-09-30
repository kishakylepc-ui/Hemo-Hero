import { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
} from '../../components/Motion';

import {
  getCompatibleDonorTypes,
  isBloodType,
} from '../../lib/bloodCompatibility';

import {
  getFeedbackFrom,
  getRequestDonations,
  recordDonation,
  submitDonationFeedback,
} from '../../lib/donations';

import type {
  BloodDonation,
} from '../../lib/donations';

import DonationFeedbackModal from '../../components/DonationFeedbackModal';

// One-tap phrases for rating a donor.
const DONOR_FEEDBACK_NOTES = [
  'Arrived on time',
  'Very kind and helpful',
  'Easy to coordinate with',
  'Would recommend',
];

// ============================================================
// DONATION CONFIRMATION
// ============================================================

const DAY_MS =
  24 * 60 * 60 * 1000;

const DONATION_NOTE_LIMIT = 500;

// "When did the donation happen?" choices (days before today).
const DONATION_DAY_OPTIONS = [
  {
    offset: 0,
    label: 'Today',
  },
  {
    offset: 1,
    label: 'Yesterday',
  },
  {
    offset: 2,
    label: '2 days ago',
  },
];

type DonationModalState = {
  visible: boolean;
  response: RequestDonorResponse | null;
  units: number;
  dayOffset: number;
  note: string;
  saving: boolean;
  error: string;
};

const CLOSED_DONATION_MODAL: DonationModalState = {
  visible: false,
  response: null,
  units: 1,
  dayOffset: 0,
  note: '',
  saving: false,
  error: '',
};

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
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#181818',

  pageTop: '#F1B2B4',
  pageBottom: '#D71318',

  card: '#FFFFFF',
  softCard: '#FFF8F8',

  muted: '#686868',
  lightMuted: '#939393',

  border: '#ECE3E3',
  softBorder: '#E8CECE',

  pinkLight: '#FFF1F1',

  green: '#198754',
  greenLight: '#EAF7EF',

  orange: '#E27D24',
  orangeLight: '#FFF4E8',

  gray: '#AAAAAA',
  grayLight: '#F4F4F4',
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

  const [
    donationModal,
    setDonationModal,
  ] =
    useState<DonationModalState>(
      CLOSED_DONATION_MODAL
    );

  // Donation the requester is rating (feedback dialog).
  const [
    feedbackDonation,
    setFeedbackDonation,
  ] =
    useState<BloodDonation | null>(
      null
    );

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

  useFocusEffect(
    useCallback(
      () => {
        loadRequest();
        loadDonorResponses();
        loadDonations();
      },
      [
        loadRequest,
        loadDonorResponses,
        loadDonations,
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
          'numeric',

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

      showMessage(
        'Donor Accepted',

        `${getDonorName(
          response
        )}'s offer has been accepted.`
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
      response.status !==
        'accepted'
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
  // Requester confirms each accepted donor's donation; an
  // admin then verifies it. Rejected records can be confirmed
  // again with corrected details.
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

  // Only offer calendar days on or after the day the request
  // was posted (a request posted today only offers "Today").
  function getDonationDayOptions() {
    const startOfDay =
      (value: number) => {
        const date =
          new Date(value);

        date.setHours(
          0,
          0,
          0,
          0
        );

        return date.getTime();
      };

    const postedDay =
      startOfDay(
        request
          ? new Date(
              request.created_at
            ).getTime()
          : Date.now()
      );

    return DONATION_DAY_OPTIONS.filter(
      option =>
        option.offset === 0 ||
        startOfDay(
          Date.now() -
            option.offset *
              DAY_MS
        ) >= postedDay
    );
  }

  const maxDonationUnits =
    Math.max(
      1,
      Math.min(
        20,
        Number(
          request?.units_needed
        ) || 1
      )
    );

  function openDonationModal(
    response:
      RequestDonorResponse
  ) {
    if (
      !request ||
      request.status !==
        'active'
    ) {
      return;
    }

    setDonationModal({
      ...CLOSED_DONATION_MODAL,

      visible: true,

      response,
    });
  }

  function closeDonationModal() {
    if (
      donationModal.saving
    ) {
      return;
    }

    setDonationModal(
      CLOSED_DONATION_MODAL
    );
  }

  function changeDonationUnits(
    change: number
  ) {
    setDonationModal(
      current => ({
        ...current,

        units:
          Math.min(
            maxDonationUnits,
            Math.max(
              1,
              current.units +
                change
            )
          ),
      })
    );
  }

  async function submitDonation() {
    const response =
      donationModal.response;

    if (
      !request ||
      !response ||
      donationModal.saving
    ) {
      return;
    }

    setDonationModal(
      current => ({
        ...current,
        saving: true,
        error: '',
      })
    );

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const donatedAt =
        new Date(
          Date.now() -
            donationModal.dayOffset *
              DAY_MS
        );

      const result =
        await recordDonation(
          token,
          request.id,
          response.id,
          {
            units_donated:
              donationModal.units,

            donated_at:
              donatedAt.toISOString(),

            note:
              donationModal.note.trim() ||
              null,
          }
        );

      setDonationModal(
        CLOSED_DONATION_MODAL
      );

      await loadDonations();

      const donorName =
        getDonorName(
          response
        );

      if (
        result.donation?.status ===
        'needs_review'
      ) {
        showMessage(
          'Donation Confirmed',

          `${donorName} has been notified. Hemo-Hero will take a quick look at this record before it is added to the donor's history.\n\nYou can still mark this request as fulfilled once you have all the blood you need.`
        );

        return;
      }

      // Recorded right away: invite the requester to rate it.
      confirmAction(
        'Donation Recorded',

        `Thank you! The donation is now on record and ${donorName} has been notified.\n\nWould you like to rate how it went?`,

        'Rate Donor',

        false,

        () => {
          if (result.donation) {
            // Let the popup finish closing first.
            setTimeout(
              () =>
                setFeedbackDonation(
                  result.donation
                ),
              350
            );
          }
        }
      );
    } catch (error) {
      // Keep the dialog open so nothing typed is lost.
      setDonationModal(
        current => ({
          ...current,

          saving: false,

          error:
            error instanceof Error
              ? error.message
              : 'Unable to confirm this donation.',
        })
      );
    }
  }

  // ==========================================================
  // TRANSACTION FEEDBACK
  // ==========================================================

  async function sendDonorFeedback(value: {
    rating: number;
    comment: string;
  }) {
    const donation =
      feedbackDonation;

    if (
      !request ||
      !donation
    ) {
      return;
    }

    const token =
      await getAccessToken();

    if (!token) {
      router.replace('/');

      return;
    }

    // Errors are shown inside the feedback dialog.
    await submitDonationFeedback(
      token,
      request.id,
      donation.id,
      {
        rating:
          value.rating,

        comment:
          value.comment ||
          null,
      }
    );

    setFeedbackDonation(null);

    await loadDonations();

    showMessage(
      'Feedback Sent',

      `Thank you! ${
        donation.donor_name ||
        'Your donor'
      } will see your feedback.`
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

        'After your donor donates at the facility, tap “Confirm Donation Received” on their card. Then you can mark this request as fulfilled.'
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
          ]}
        >
          <StatusBar
            style="light"
          />

          <LinearGradient
            colors={[
              '#D3191E',
              COLORS.redDark,
            ]}
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerCircleOne
              }
            />

            <View
              style={
                styles.headerCircleTwo
              }
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
                onPress={() =>
                  router.back()
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
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
                  Request Details
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  {request
                    ? `Request #${getRequestNumber(
                        request.id
                      )}`
                    : 'Blood Request'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[
              '#FFF8F8',
              '#FFF8F8',
            ]}
            style={
              styles.body
            }
          >
            <View
              style={
                styles.mainCard
              }
            >
              <ScrollView
                style={
                  styles.scroll
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
                    <MaterialIcons
                      name="bloodtype"
                      size={38}
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      style={
                        styles.centerTitle
                      }
                    >
                      Loading Request
                    </Text>
                  </View>
                ) : errorMessage ? (
                  <View
                    style={
                      styles.centerState
                    }
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={38}
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      style={
                        styles.centerTitle
                      }
                    >
                      Unable to Load
                    </Text>

                    <Text
                      style={
                        styles.centerDescription
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
                    <Text
                      style={
                        styles.postedText
                      }
                    >
                      Posted{' '}
                      {formatCreatedAt(
                        request.created_at
                      )}
                    </Text>

                    {/* ==================================================
                        SUMMARY
                    ================================================== */}

                    <View
                      style={
                        styles.summaryCard
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
                              styles.bloodType
                            }
                          >
                            {
                              request.blood_type
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.summaryTitleArea
                          }
                        >
                          <Text
                            style={
                              styles.summaryTitle
                            }
                          >
                            Blood Request
                          </Text>

                          <Text
                            style={
                              styles.summarySubtitle
                            }
                          >
                            {
                              request.facility_name
                            }
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusPill,

                            {
                              backgroundColor:
                                getStatusColor(),
                            },
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {getStatusLabel()}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.summaryDivider
                        }
                      />

                      <View
                        style={
                          styles.summaryStats
                        }
                      >
                        <View
                          style={
                            styles.statItem
                          }
                        >
                          <Text
                            style={
                              styles.statValue
                            }
                          >
                            {
                              request.units_needed
                            }
                          </Text>

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            Units Needed
                          </Text>
                        </View>

                        <View
                          style={
                            styles.statDivider
                          }
                        />

                        <View
                          style={
                            styles.statItem
                          }
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={23}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            {request.urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* ==================================================
                        REQUEST INFORMATION
                    ================================================== */}

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Request Information
                    </Text>

                    <View
                      style={
                        styles.infoGroup
                      }
                    >
                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <View
                          style={
                            styles.infoIcon
                          }
                        >
                          <MaterialIcons
                            name="local-hospital"
                            size={21}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoText
                          }
                        >
                          <Text
                            style={
                              styles.infoLabel
                            }
                          >
                            Donation Location
                          </Text>

                          <Text
                            style={
                              styles.infoTitle
                            }
                          >
                            {
                              request.facility_name
                            }
                          </Text>

                          {request
                            .facility_address ? (
                            <Text
                              style={
                                styles.infoDescription
                              }
                            >
                              {
                                request.facility_address
                              }
                            </Text>
                          ) : null}

                          <TouchableOpacity
                            style={
                              styles.directionsButton
                            }
                            activeOpacity={
                              0.8
                            }
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
                              Get Directions
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View
                        style={
                          styles.infoDivider
                        }
                      />

                      <View
                        style={
                          styles.infoRow
                        }
                      >
                        <View
                          style={
                            styles.infoIcon
                          }
                        >
                          <MaterialIcons
                            name="event"
                            size={21}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoText
                          }
                        >
                          <Text
                            style={
                              styles.infoLabel
                            }
                          >
                            When Needed
                          </Text>

                          <Text
                            style={
                              styles.infoTitle
                            }
                          >
                            {formatNeededBy(
                              request
                            )}
                          </Text>
                        </View>
                      </View>

                      {isBloodType(
                        request.blood_type
                      ) ? (
                        <>
                          <View
                            style={
                              styles.infoDivider
                            }
                          />

                          <View
                            style={
                              styles.infoRow
                            }
                          >
                            <View
                              style={
                                styles.infoIcon
                              }
                            >
                              <MaterialIcons
                                name="groups"
                                size={21}
                                color={
                                  COLORS.redButton
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.infoText
                              }
                            >
                              <Text
                                style={
                                  styles.infoLabel
                                }
                              >
                                Compatible Donors
                              </Text>

                              <Text
                                style={
                                  styles.infoTitle
                                }
                              >
                                {getCompatibleDonorTypes(
                                  request.blood_type
                                ).join(', ')}
                              </Text>

                              <Text
                                style={
                                  styles.infoDescription
                                }
                              >
                                Donors with these blood types can see and respond to this request.
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : null}

                      {request.message ? (
                        <>
                          <View
                            style={
                              styles.infoDivider
                            }
                          />

                          <View
                            style={
                              styles.infoRow
                            }
                          >
                            <View
                              style={
                                styles.infoIcon
                              }
                            >
                              <MaterialIcons
                                name="notes"
                                size={21}
                                color={
                                  COLORS.redButton
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.infoText
                              }
                            >
                              <Text
                                style={
                                  styles.infoLabel
                                }
                              >
                                Note to Donors
                              </Text>

                              <Text
                                style={
                                  styles.infoDescription
                                }
                              >
                                {request.message}
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : null}
                    </View>

                    {/* ==================================================
                        DONOR OFFERS
                    ================================================== */}

                    <View
                      style={
                        styles.sectionHeaderRow
                      }
                    >
                      <Text
                        style={
                          styles.sectionTitleNoMargin
                        }
                      >
                        Donor Offers
                      </Text>

                      <View
                        style={
                          styles.counter
                        }
                      >
                        <Text
                          style={
                            styles.counterText
                          }
                        >
                          {
                            donorResponseCounts.total
                          }
                        </Text>
                      </View>
                    </View>

                    {loadingResponses ? (
                      <View
                        style={
                          styles.emptyCard
                        }
                      >
                        <Text
                          style={
                            styles.emptyText
                          }
                        >
                          Loading donor offers...
                        </Text>
                      </View>
                    ) : responseError ? (
                      <View
                        style={
                          styles.emptyCard
                        }
                      >
                        <Text
                          style={
                            styles.emptyText
                          }
                        >
                          {
                            responseError
                          }
                        </Text>
                      </View>
                    ) : donorResponses.length ===
                      0 ? (
                      <View
                        style={
                          styles.emptyCard
                        }
                      >
                        <MaterialIcons
                          name="volunteer-activism"
                          size={28}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.emptyTitle
                          }
                        >
                          No donor offers yet
                        </Text>

                        <Text
                          style={
                            styles.emptyText
                          }
                        >
                          Nearby verified donors can respond to your request.
                        </Text>
                      </View>
                    ) : (
                      donorResponses.map(
                        response => {
                          const working =
                            responseActionId ===
                            response.id;

                          return (
                            <View
                              key={
                                response.id
                              }
                              style={[
                                styles.donorCard,

                                response.status ===
                                  'accepted' &&
                                  styles.donorCardAccepted,
                              ]}
                            >
                              <View
                                style={
                                  styles.donorHeader
                                }
                              >
                                <View
                                  style={
                                    styles.donorAvatar
                                  }
                                >
                                  <Text
                                    style={
                                      styles.donorAvatarText
                                    }
                                  >
                                    {getDonorInitials(
                                      response
                                    )}
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.donorInfo
                                  }
                                >
                                  <Text
                                    style={
                                      styles.donorName
                                    }
                                  >
                                    {getDonorName(
                                      response
                                    )}
                                  </Text>

                                  <View
                                    style={
                                      styles.badgeRow
                                    }
                                  >
                                    {response
                                      .donor
                                      ?.blood_type ? (
                                      <View
                                        style={
                                          styles.bloodBadge
                                        }
                                      >
                                        <Text
                                          style={
                                            styles.bloodBadgeText
                                          }
                                        >
                                          {
                                            response
                                              .donor
                                              .blood_type
                                          }
                                        </Text>
                                      </View>
                                    ) : null}

                                    {response
                                      .donor
                                      ?.is_verified ? (
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
                                            styles.verifiedText
                                          }
                                        >
                                          Verified Donor
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>

                                <View
                                  style={[
                                    styles.responseStatus,

                                    response.status ===
                                      'accepted'
                                      ? styles.statusAccepted
                                      : response.status ===
                                          'pending'
                                        ? styles.statusPending
                                        : styles.statusOther,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.responseStatusText,

                                      response.status ===
                                        'accepted'
                                        ? styles.statusAcceptedText
                                        : response.status ===
                                            'pending'
                                          ? styles.statusPendingText
                                          : styles.statusOtherText,
                                    ]}
                                  >
                                    {response.status
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase() +
                                      response.status.slice(
                                        1
                                      )}
                                  </Text>
                                </View>
                              </View>

                              {response.message ? (
                                <View
                                  style={
                                    styles.donorMessage
                                  }
                                >
                                  <Text
                                    style={
                                      styles.donorMessageText
                                    }
                                  >
                                    “
                                    {
                                      response.message
                                    }
                                    ”
                                  </Text>
                                </View>
                              ) : null}

                              {response.status ===
                                'pending' &&
                              request.status ===
                                'active' ? (
                                <View
                                  style={
                                    styles.actionRow
                                  }
                                >
                                  <TouchableOpacity
                                    style={
                                      styles.rejectButton
                                    }
                                    disabled={
                                      Boolean(
                                        responseActionId
                                      )
                                    }
                                    onPress={() =>
                                      handleRejectDonor(
                                        response
                                      )
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.rejectButtonText
                                      }
                                    >
                                      Reject
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={
                                      styles.acceptButton
                                    }
                                    disabled={
                                      Boolean(
                                        responseActionId
                                      )
                                    }
                                    onPress={() =>
                                      handleAcceptDonor(
                                        response
                                      )
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.acceptButtonText
                                      }
                                    >
                                      {working
                                        ? 'Please wait...'
                                        : 'Accept'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}

                              {response.status ===
                              'accepted' ? (
                                <>
                                  <View
                                    style={
                                      styles.acceptedNotice
                                    }
                                  >
                                    <MaterialIcons
                                      name="check-circle"
                                      size={17}
                                      color={
                                        COLORS.green
                                      }
                                    />

                                    <Text
                                      style={
                                        styles.acceptedNoticeText
                                      }
                                    >
                                      Donor accepted for this request.
                                    </Text>
                                  </View>

                                  <TouchableOpacity
                                    style={
                                      styles.coordinateButton
                                    }
                                    onPress={() =>
                                      handleCoordinate(
                                        response
                                      )
                                    }
                                  >
                                    <MaterialIcons
                                      name="forum"
                                      size={18}
                                      color={
                                        COLORS.white
                                      }
                                    />

                                    <Text
                                      style={
                                        styles.coordinateButtonText
                                      }
                                    >
                                      Coordinate with Donor
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Donation record for this donor */}
                                  {(() => {
                                    const donation =
                                      getDonationForResponse(
                                        response.id
                                      );

                                    if (
                                      donation &&
                                      donation.status !==
                                        'rejected'
                                    ) {
                                      const recorded =
                                        donation.status ===
                                        'completed';

                                      const myFeedback =
                                        getFeedbackFrom(
                                          donation,
                                          'requester'
                                        );

                                      const donorFeedback =
                                        getFeedbackFrom(
                                          donation,
                                          'donor'
                                        );

                                      return (
                                        <>
                                          <FadeInView
                                            key={`${donation.id}-${donation.status}`}
                                            offset={6}
                                            style={[
                                              styles.donationStatus,

                                              recorded &&
                                                styles.donationStatusVerified,
                                            ]}
                                          >
                                            <MaterialIcons
                                              name={
                                                recorded
                                                  ? 'task-alt'
                                                  : 'hourglass-top'
                                              }
                                              size={19}
                                              color={
                                                recorded
                                                  ? COLORS.green
                                                  : COLORS.orange
                                              }
                                            />

                                            <View
                                              style={
                                                styles.donationStatusBody
                                              }
                                            >
                                              <Text
                                                style={
                                                  styles.donationStatusTitle
                                                }
                                              >
                                                {recorded
                                                  ? 'Donation recorded'
                                                  : 'Under a quick review by Hemo-Hero'}
                                              </Text>

                                              <Text
                                                style={
                                                  styles.donationStatusMeta
                                                }
                                              >
                                                {bagsLabel(
                                                  donation.units_donated
                                                )}{' '}
                                                •{' '}
                                                {formatDonationDate(
                                                  donation.donated_at
                                                )}
                                              </Text>
                                            </View>
                                          </FadeInView>

                                          {/* What the donor said */}
                                          {donorFeedback ? (
                                            <View
                                              style={
                                                styles.feedbackReceived
                                              }
                                            >
                                              <View
                                                style={
                                                  styles.feedbackHeader
                                                }
                                              >
                                                <Text
                                                  style={
                                                    styles.feedbackLabel
                                                  }
                                                >
                                                  Donor&apos;s feedback
                                                </Text>

                                                <StarRow
                                                  rating={
                                                    donorFeedback.rating
                                                  }
                                                />
                                              </View>

                                              {donorFeedback.comment ? (
                                                <Text
                                                  style={
                                                    styles.feedbackComment
                                                  }
                                                >
                                                  “{donorFeedback.comment}”
                                                </Text>
                                              ) : null}
                                            </View>
                                          ) : null}

                                          {/* Rate the donor / your rating */}
                                          {myFeedback ? (
                                            <TouchableOpacity
                                              style={
                                                styles.feedbackGiven
                                              }
                                              activeOpacity={
                                                0.8
                                              }
                                              onPress={() =>
                                                setFeedbackDonation(
                                                  donation
                                                )
                                              }
                                            >
                                              <Text
                                                style={
                                                  styles.feedbackLabel
                                                }
                                              >
                                                Your rating
                                              </Text>

                                              <StarRow
                                                rating={
                                                  myFeedback.rating
                                                }
                                              />

                                              <MaterialIcons
                                                name="edit"
                                                size={15}
                                                color={
                                                  COLORS.lightMuted
                                                }
                                              />
                                            </TouchableOpacity>
                                          ) : (
                                            <TouchableOpacity
                                              style={
                                                styles.rateButton
                                              }
                                              activeOpacity={
                                                0.85
                                              }
                                              onPress={() =>
                                                setFeedbackDonation(
                                                  donation
                                                )
                                              }
                                            >
                                              <MaterialIcons
                                                name="star-outline"
                                                size={18}
                                                color={
                                                  COLORS.orange
                                                }
                                              />

                                              <Text
                                                style={
                                                  styles.rateButtonText
                                                }
                                              >
                                                Rate This Donation
                                              </Text>
                                            </TouchableOpacity>
                                          )}
                                        </>
                                      );
                                    }

                                    if (
                                      request.status !==
                                      'active'
                                    ) {
                                      return null;
                                    }

                                    return (
                                      <>
                                        {donation?.status ===
                                        'rejected' ? (
                                          <View
                                            style={
                                              styles.donationRejected
                                            }
                                          >
                                            <MaterialIcons
                                              name="error-outline"
                                              size={17}
                                              color={
                                                COLORS.redButton
                                              }
                                            />

                                            <Text
                                              style={
                                                styles.donationRejectedText
                                              }
                                            >
                                              Record not accepted:{' '}
                                              {donation.admin_note ||
                                                'Please confirm the details again.'}
                                            </Text>
                                          </View>
                                        ) : null}

                                        <TouchableOpacity
                                          style={
                                            styles.confirmDonationButton
                                          }
                                          activeOpacity={
                                            0.85
                                          }
                                          onPress={() =>
                                            openDonationModal(
                                              response
                                            )
                                          }
                                        >
                                          <MaterialIcons
                                            name="task-alt"
                                            size={18}
                                            color={
                                              COLORS.green
                                            }
                                          />

                                          <Text
                                            style={
                                              styles.confirmDonationText
                                            }
                                          >
                                            {donation?.status ===
                                            'rejected'
                                              ? 'Confirm Donation Again'
                                              : 'Confirm Donation Received'}
                                          </Text>
                                        </TouchableOpacity>
                                      </>
                                    );
                                  })()}
                                </>
                              ) : null}
                            </View>
                          );
                        }
                      )
                    )}

                    {/* ==================================================
                        ACCEPTED SUMMARY
                    ================================================== */}

                    {donorResponseCounts.accepted >
                      0 &&
                    request.status ===
                      'active' ? (
                      <View
                        style={
                          styles.completionCard
                        }
                      >
                        <View
                          style={
                            styles.completionIcon
                          }
                        >
                          <MaterialIcons
                            name="favorite"
                            size={23}
                            color={
                              COLORS.green
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.completionTextArea
                          }
                        >
                          <Text
                            style={
                              styles.completionTitle
                            }
                          >
                            {activeDonations.length >
                            0
                              ? `${recordedUnits} of ${bagsLabel(
                                  request.units_needed
                                )} received`
                              : `${donorResponseCounts.accepted} ${
                                  donorResponseCounts.accepted ===
                                  1
                                    ? 'Donor Accepted'
                                    : 'Donors Accepted'
                                }`}
                          </Text>

                          <Text
                            style={
                              styles.completionDescription
                            }
                          >
                            {activeDonations.length >
                            0
                              ? 'Donations are recorded as you confirm them. Mark the request fulfilled once you have all the blood you need.'
                              : 'After your donor donates, confirm it on their card. Then mark this request fulfilled.'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.fulfillButton,

                            activeDonations.length ===
                              0 &&
                              styles.fulfillButtonWaiting,

                            fulfilling &&
                              styles.disabledButton,
                          ]}
                          disabled={
                            fulfilling
                          }
                          onPress={
                            handleFulfillPress
                          }
                        >
                          <MaterialIcons
                            name="task-alt"
                            size={18}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.fulfillButtonText
                            }
                          >
                            {fulfilling
                              ? 'Completing...'
                              : 'Mark Fulfilled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* ==================================================
                        PROGRESS
                    ================================================== */}

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Request Progress
                    </Text>

                    <View
                      style={
                        styles.progressCard
                      }
                    >
                      <ProgressStep
                        complete
                        current={
                          false
                        }
                        title="Request Posted"
                        description="Your blood request has been posted."
                        last={
                          false
                        }
                      />

                      <ProgressStep
                        complete={
                          donorResponseCounts.accepted >
                          0
                        }
                        current={
                          request.status ===
                            'active' &&
                          donorResponseCounts.accepted ===
                            0
                        }
                        title="Donor Accepted"
                        description={
                          donorResponseCounts.accepted >
                          0
                            ? `${donorResponseCounts.accepted} donor ${
                                donorResponseCounts.accepted ===
                                1
                                  ? 'has'
                                  : 'have'
                              } been accepted.`
                            : 'Waiting for a compatible donor to offer.'
                        }
                        last={
                          false
                        }
                      />

                      <ProgressStep
                        complete={
                          activeDonations.length >
                          0
                        }
                        current={
                          request.status ===
                            'active' &&
                          donorResponseCounts.accepted >
                            0 &&
                          activeDonations.length ===
                            0
                        }
                        title="Donation Confirmed"
                        description={
                          activeDonations.length >
                          0
                            ? `You confirmed ${bagsLabel(
                                recordedUnits
                              )} received.`
                            : 'Confirm each donation after your donor donates.'
                        }
                        last={
                          false
                        }
                      />

                      <ProgressStep
                        complete={
                          request.status ===
                          'fulfilled'
                        }
                        current={
                          request.status ===
                            'active' &&
                          activeDonations.length >
                            0
                        }
                        title="Request Fulfilled"
                        description={
                          request.status ===
                          'fulfilled'
                            ? 'You marked this request as fulfilled.'
                            : 'Mark fulfilled once you have the blood you need.'
                        }
                        last={
                          false
                        }
                      />

                      <ProgressStep
                        complete={
                          activeDonations.length >
                            0 &&
                          ratedDonationCount ===
                            activeDonations.length
                        }
                        current={
                          activeDonations.length >
                            0 &&
                          ratedDonationCount <
                            activeDonations.length
                        }
                        title="Feedback Shared"
                        description={
                          activeDonations.length ===
                          0
                            ? 'Rate each donation once it is recorded.'
                            : ratedDonationCount ===
                                activeDonations.length
                              ? 'Thank you for rating your donors. Transaction complete.'
                              : reviewDonationCount >
                                  0
                                ? 'A donation is under a quick review. You can still rate your donor.'
                                : 'Let your donor know how it went.'
                        }
                        last
                      />
                    </View>

                    {request.status ===
                      'active' &&
                    activeDonations.length >
                      0 ? (
                      // A confirmed donation means the request was
                      // (partly) met: fulfill it instead of cancelling.
                      <Text
                        style={
                          styles.cancelHint
                        }
                      >
                        This request has a confirmed donation, so it can no longer be cancelled.
                      </Text>
                    ) : request.status ===
                    'active' ? (
                      <>
                        <TouchableOpacity
                          style={
                            styles.cancelButton
                          }
                          disabled={
                            cancelling
                          }
                          onPress={
                            handleCancelPress
                          }
                        >
                          <MaterialIcons
                            name="close"
                            size={18}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.cancelButtonText
                            }
                          >
                            {cancelling
                              ? 'Cancelling...'
                              : 'Cancel Blood Request'}
                          </Text>
                        </TouchableOpacity>

                        <Text
                          style={
                            styles.cancelHint
                          }
                        >
                          Only cancel if blood is no longer needed.
                        </Text>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={
                          styles.dashboardButton
                        }
                        onPress={() =>
                          router.replace(
                            '/dashboard'
                          )
                        }
                      >
                        <MaterialIcons
                          name="home"
                          size={19}
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={
                            styles.dashboardButtonText
                          }
                        >
                          Back to Dashboard
                        </Text>
                      </TouchableOpacity>
                    )}
                  </FadeInView>
                ) : null}
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>

        {/* ====================================================
            CONFIRM DONATION
        ==================================================== */}

        <Modal
          transparent
          visible={
            donationModal.visible
          }
          animationType="fade"
          onRequestClose={
            closeDonationModal
          }
        >
          <View
            style={
              styles.actionPopupOverlay
            }
          >
            <View
              style={[
                styles.actionPopupCard,
                styles.donationModalCard,
              ]}
            >
              <View
                style={[
                  styles.actionPopupIcon,
                  styles.actionPopupIconSuccess,
                ]}
              >
                <MaterialIcons
                  name="bloodtype"
                  size={30}
                  color={
                    COLORS.green
                  }
                />
              </View>

              <Text
                style={
                  styles.actionPopupTitle
                }
              >
                Confirm Donation Received
              </Text>

              <Text
                style={
                  styles.actionPopupMessage
                }
              >
                Confirm that{' '}
                {donationModal.response
                  ? getDonorName(
                      donationModal.response
                    )
                  : 'your donor'}{' '}
                donated for your {request?.blood_type} request at{' '}
                {request?.facility_name}.
              </Text>

              {/* Bags donated */}
              <View
                style={
                  styles.donationField
                }
              >
                <Text
                  style={
                    styles.donationFieldLabel
                  }
                >
                  Bags donated
                </Text>

                <View
                  style={
                    styles.donationStepper
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.donationStepperButton,

                      donationModal.units <=
                        1 &&
                        styles.donationStepperDisabled,
                    ]}
                    disabled={
                      donationModal.units <=
                        1 ||
                      donationModal.saving
                    }
                    accessibilityLabel="Fewer bags"
                    onPress={() =>
                      changeDonationUnits(
                        -1
                      )
                    }
                  >
                    <MaterialIcons
                      name="remove"
                      size={19}
                      color={
                        COLORS.redButton
                      }
                    />
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.donationStepperValue
                    }
                  >
                    {donationModal.units}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.donationStepperButton,

                      donationModal.units >=
                        maxDonationUnits &&
                        styles.donationStepperDisabled,
                    ]}
                    disabled={
                      donationModal.units >=
                        maxDonationUnits ||
                      donationModal.saving
                    }
                    accessibilityLabel="More bags"
                    onPress={() =>
                      changeDonationUnits(
                        1
                      )
                    }
                  >
                    <MaterialIcons
                      name="add"
                      size={19}
                      color={
                        COLORS.redButton
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* When */}
              <View
                style={
                  styles.donationField
                }
              >
                <Text
                  style={
                    styles.donationFieldLabel
                  }
                >
                  When did they donate?
                </Text>

                <View
                  style={
                    styles.donationDayRow
                  }
                >
                  {getDonationDayOptions().map(
                    option => {
                      const selected =
                        donationModal.dayOffset ===
                        option.offset;

                      return (
                        <TouchableOpacity
                          key={
                            option.offset
                          }
                          style={[
                            styles.donationDayChip,

                            selected &&
                              styles.donationDayChipSelected,
                          ]}
                          disabled={
                            donationModal.saving
                          }
                          onPress={() =>
                            setDonationModal(
                              current => ({
                                ...current,
                                dayOffset:
                                  option.offset,
                              })
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.donationDayText,

                              selected &&
                                styles.donationDayTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </View>

              {/* Optional note */}
              <TextInput
                style={
                  styles.donationNoteInput
                }
                editable={
                  !donationModal.saving
                }
                multiline
                maxLength={
                  DONATION_NOTE_LIMIT
                }
                placeholder="Optional note, e.g. donated at the blood bank, 2nd floor"
                placeholderTextColor={
                  COLORS.lightMuted
                }
                value={
                  donationModal.note
                }
                onChangeText={value =>
                  setDonationModal(
                    current => ({
                      ...current,
                      note: value,
                    })
                  )
                }
                textAlignVertical="top"
              />

              <View
                style={
                  styles.donationInfo
                }
              >
                <MaterialIcons
                  name="verified-user"
                  size={16}
                  color={
                    COLORS.green
                  }
                />

                <Text
                  style={
                    styles.donationInfoText
                  }
                >
                  The donation is recorded right away and added to the donor's history. You can rate the transaction afterwards.
                </Text>
              </View>

              {donationModal.error ? (
                <FadeInView
                  key={
                    donationModal.error
                  }
                  offset={4}
                  style={
                    styles.donationError
                  }
                >
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.donationErrorText
                    }
                  >
                    {donationModal.error}
                  </Text>
                </FadeInView>
              ) : null}

              <View
                style={
                  styles.actionPopupActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.actionPopupSecondaryButton
                  }
                  disabled={
                    donationModal.saving
                  }
                  activeOpacity={
                    0.82
                  }
                  onPress={
                    closeDonationModal
                  }
                >
                  <Text
                    style={
                      styles.actionPopupSecondaryText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionPopupPrimaryButton,
                    styles.actionPopupPrimarySuccess,

                    donationModal.saving &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    donationModal.saving
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={
                    submitDonation
                  }
                >
                  {donationModal.saving ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.actionPopupPrimaryText
                      }
                    >
                      Confirm Donation
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            RATE THE DONATION
        ==================================================== */}

        <DonationFeedbackModal
          visible={Boolean(
            feedbackDonation
          )}
          mode="feedback"
          title={
            getFeedbackFrom(
              feedbackDonation,
              'requester'
            )
              ? 'Update Your Feedback'
              : 'Rate This Donation'
          }
          subtitle={`How was your experience with ${
            feedbackDonation?.donor_name ||
            'your donor'
          }? They will see your feedback.`}
          initialRating={
            getFeedbackFrom(
              feedbackDonation,
              'requester'
            )?.rating || 0
          }
          initialComment={
            getFeedbackFrom(
              feedbackDonation,
              'requester'
            )?.comment || ''
          }
          quickNotes={
            DONOR_FEEDBACK_NOTES
          }
          onClose={() =>
            setFeedbackDonation(
              null
            )
          }
          onSubmit={
            sendDonorFeedback
          }
        />

        {/* ====================================================
            IN-APP ACTION POPUP
        ==================================================== */}

        <Modal
          transparent
          visible={
            actionPopup.visible
          }
          animationType="fade"
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

                  (
                    actionPopup.variant ===
                      'danger' ||
                    actionPopup.variant ===
                      'error'
                  ) &&
                    styles.actionPopupIconDanger,
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
                              'danger' ||
                            actionPopup.variant ===
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

              <View
                style={[
                  styles.actionPopupActions,

                  !actionPopup.showCancel &&
                    styles.actionPopupActionsSingle,
                ]}
              >
                {actionPopup.showCancel ? (
                  <TouchableOpacity
                    style={
                      styles.actionPopupSecondaryButton
                    }
                    activeOpacity={
                      0.82
                    }
                    onPress={
                      closeActionPopup
                    }
                  >
                    <Text
                      style={
                        styles.actionPopupSecondaryText
                      }
                    >
                      {
                        actionPopup.cancelText
                      }
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.actionPopupPrimaryButton,

                    actionPopup.variant ===
                      'success' &&
                      styles.actionPopupPrimarySuccess,

                    actionPopup.variant ===
                      'danger' &&
                      styles.actionPopupPrimaryDanger,
                  ]}
                  activeOpacity={
                    0.85
                  }
                  onPress={() => {
                    const action =
                      actionPopup.onConfirm;

                    closeActionPopup();

                    if (action) {
                      action();
                    }
                  }}
                >
                  <Text
                    style={
                      styles.actionPopupPrimaryText
                    }
                  >
                    {
                      actionPopup.confirmText
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
                ? '#F2A516'
                : '#D9C3C3'
            }
          />
        )
      )}
    </View>
  );
}

// ============================================================
// PROGRESS STEP
// ============================================================

function ProgressStep({
  complete,
  current,
  title,
  description,
  last,
}: {
  complete: boolean;
  current: boolean;
  title: string;
  description: string;
  last: boolean;
}) {
  return (
    <View
      style={
        last
          ? styles.progressStepLast
          : styles.progressStep
      }
    >
      <View
        style={
          styles.timeline
        }
      >
        <View
          style={
            complete
              ? styles.completedCircle
              : current
                ? styles.currentCircle
                : styles.inactiveCircle
          }
        >
          <MaterialIcons
            name={
              complete
                ? 'check'
                : current
                  ? 'person-search'
                  : 'favorite-border'
            }
            size={15}
            color={
              complete ||
              current
                ? COLORS.white
                : COLORS.lightMuted
            }
          />
        </View>

        {!last ? (
          <View
            style={
              styles.timelineLine
            }
          />
        ) : null}
      </View>

      <View
        style={
          styles.progressTextArea
        }
      >
        <Text
          style={
            styles.progressTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.progressDescription
          }
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 18,
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 11,
      backgroundColor: COLORS.redButton,
    },

    retryButtonText: {
      color: COLORS.white,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },

    directionsButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: '#F0D1D1',
      borderRadius: 9,
      backgroundColor: COLORS.white,
    },

    directionsText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },

    // ------------------------------------------------------
    // DONATION RECORD (accepted donor card)
    // ------------------------------------------------------

    donationStatus: {
      marginTop: 10,
      paddingHorizontal: 11,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderRadius: 11,
      backgroundColor: COLORS.orangeLight,
    },

    donationStatusVerified: {
      backgroundColor: COLORS.greenLight,
    },

    donationStatusBody: {
      flex: 1,
      minWidth: 0,
    },

    donationStatusTitle: {
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      lineHeight: 17,
    },

    donationStatusMeta: {
      marginTop: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    donationRejected: {
      marginTop: 10,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      borderRadius: 11,
      backgroundColor: COLORS.pinkLight,
    },

    donationRejectedText: {
      flex: 1,
      color: COLORS.redButton,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      lineHeight: 17,
    },

    confirmDonationButton: {
      height: 44,
      marginTop: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: COLORS.green,
      backgroundColor: COLORS.greenLight,
    },

    confirmDonationText: {
      color: COLORS.green,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
    },

    fulfillButtonWaiting: {
      opacity: 0.6,
    },

    // ------------------------------------------------------
    // TRANSACTION FEEDBACK
    // ------------------------------------------------------

    starRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
    },

    feedbackReceived: {
      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#F7E3BE',
      backgroundColor: '#FFFBF2',
    },

    feedbackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    feedbackLabel: {
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    feedbackComment: {
      marginTop: 5,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
    },

    feedbackGiven: {
      height: 42,
      marginTop: 9,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.softCard,
    },

    rateButton: {
      height: 44,
      marginTop: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: COLORS.orange,
      backgroundColor: COLORS.orangeLight,
    },

    rateButtonText: {
      color: COLORS.orange,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
    },

    // ------------------------------------------------------
    // CONFIRM DONATION DIALOG
    // ------------------------------------------------------

    donationModalCard: {
      maxWidth: 380,
    },

    donationField: {
      marginTop: 16,
    },

    donationFieldLabel: {
      marginBottom: 8,
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },

    donationStepper: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      borderRadius: 13,
      backgroundColor: COLORS.pinkLight,
    },

    donationStepperButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
    },

    donationStepperDisabled: {
      opacity: 0.4,
    },

    donationStepperValue: {
      width: 46,
      color: COLORS.black,
      fontFamily: 'Poppins_700Bold',
      fontSize: 18,
      textAlign: 'center',
    },

    donationDayRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    donationDayChip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: COLORS.softBorder,
      backgroundColor: COLORS.white,
    },

    donationDayChipSelected: {
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.redButton,
    },

    donationDayText: {
      color: COLORS.black,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
    },

    donationDayTextSelected: {
      color: COLORS.white,
    },

    donationNoteInput: {
      minHeight: 70,
      marginTop: 16,
      padding: 11,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.softCard,
      color: COLORS.black,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
    } as any,

    donationInfo: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },

    donationInfoText: {
      flex: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },

    donationError: {
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      borderRadius: 10,
      backgroundColor: COLORS.pinkLight,
    },

    donationErrorText: {
      flex: 1,
      color: COLORS.redButton,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      lineHeight: 17,
    },

    desktopBackground: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#242424'
          : '#FFF8F8',
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
        '#FFF8F8',
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.red,
    },

    // Compact header; the main card overlaps its bottom edge.
    header: {
      paddingHorizontal:
        20,

      paddingTop:
        Platform.OS ===
        'web'
          ? 18
          : 10,

      paddingBottom:
        38,

      overflow:
        'hidden',
    },

    headerCircleOne: {
      position:
        'absolute',

      width:
        165,

      height:
        165,

      borderRadius:
        83,

      left:
        -100,

      top:
        -80,

      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleTwo: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -90,

      top:
        -95,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
      width:
        42,

      height:
        42,

      marginRight:
        13,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    headerText: {
      flex:
        1,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,
    },

    headerSubtitle: {
      marginTop:
        2,

      color:
        'rgba(255,255,255,0.78)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },

    body: {
      flex:
        1,

      paddingHorizontal:
        14,

      paddingBottom:
        14,

      backgroundColor:
        '#FFF8F8',
    },

    mainCard: {
      flex:
        1,

      marginTop:
        -26,

      overflow:
        'hidden',

      borderRadius:
        22,

      borderWidth:
        1,

      borderColor:
        '#EFE3E3',

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#8F1111',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        12,

      elevation:
        3,
    },

    scroll: {
      flex:
        1,
    },

    scrollContent: {
      paddingHorizontal:
        18,

      paddingTop:
        20,

      paddingBottom:
        30,
    },

    centerState: {
      minHeight:
        520,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    centerTitle: {
      marginTop:
        12,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        16,
    },

    centerDescription: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      textAlign:
        'center',
    },

    postedText: {
      marginBottom:
        10,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      textAlign:
        'right',
    },

    summaryCard: {
      marginBottom:
        23,

      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.softBorder,

      borderRadius:
        18,

      backgroundColor:
        COLORS.white,
    },

    summaryTop: {
      minHeight:
        90,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        15,
    },

    bloodCircle: {
      width:
        58,

      height:
        58,

      marginRight:
        13,

      borderRadius:
        29,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    bloodType: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        19,
    },

    summaryTitleArea: {
      flex:
        1,
    },

    summaryTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    summarySubtitle: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    statusPill: {
      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        12,
    },

    statusText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11,
    },

    summaryDivider: {
      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        COLORS.border,

      marginHorizontal:
        15,
    },

    summaryStats: {
      minHeight:
        68,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    statItem: {
      flex:
        1,

      alignItems:
        'center',
    },

    statDivider: {
      width:
        1,

      height:
        34,

      backgroundColor:
        COLORS.border,
    },

    statValue: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        19,
    },

    statLabel: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11.5,
    },

    sectionTitle: {
      marginBottom:
        9,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    sectionTitleNoMargin: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    sectionHeaderRow: {
      marginBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    counter: {
      minWidth:
        25,

      height:
        25,

      paddingHorizontal:
        7,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,

      borderWidth:
        1,

      borderColor:
        COLORS.softBorder,
    },

    counterText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    infoGroup: {
      marginBottom:
        23,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,
    },

    infoRow: {
      minHeight:
        84,

      paddingVertical:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoIcon: {
      width:
        43,

      height:
        43,

      marginRight:
        11,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    infoText: {
      flex:
        1,
    },

    infoLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,
    },

    infoTitle: {
      marginTop:
        3,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        14,
    },

    infoDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    infoDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft:
        54,

      backgroundColor:
        COLORS.border,
    },

    emptyCard: {
      minHeight:
        120,

      marginBottom:
        22,

      padding:
        20,

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
        COLORS.softCard,
    },

    emptyTitle: {
      marginTop:
        8,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    emptyText: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      textAlign:
        'center',

      lineHeight:
        18,
    },

    donorCard: {
      marginBottom:
        12,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    donorCardAccepted: {
      borderColor:
        '#B8DFC7',

      backgroundColor:
        '#FCFFFD',
    },

    donorHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    donorAvatar: {
      width:
        44,

      height:
        44,

      marginRight:
        10,

      borderRadius:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    donorAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        14,
    },

    donorInfo: {
      flex:
        1,
    },

    donorName: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    badgeRow: {
      marginTop:
        5,

      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        5,
    },

    bloodBadge: {
      paddingHorizontal:
        7,

      paddingVertical:
        4,

      borderRadius:
        7,

      backgroundColor:
        COLORS.pinkLight,

      borderWidth:
        1,

      borderColor:
        COLORS.softBorder,
    },

    bloodBadgeText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11,
    },

    verifiedBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      paddingHorizontal:
        6,

      paddingVertical:
        4,

      borderRadius:
        7,

      backgroundColor:
        COLORS.greenLight,
    },

    verifiedText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10.5,
    },

    responseStatus: {
      marginLeft:
        6,

      paddingHorizontal:
        7,

      paddingVertical:
        5,

      borderRadius:
        8,

      borderWidth:
        1,
    },

    responseStatusText: {
      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10.5,
    },

    statusAccepted: {
      borderColor:
        '#B8DFC7',

      backgroundColor:
        COLORS.greenLight,
    },

    statusAcceptedText: {
      color:
        COLORS.green,
    },

    statusPending: {
      borderColor:
        '#EFD2B0',

      backgroundColor:
        COLORS.orangeLight,
    },

    statusPendingText: {
      color:
        COLORS.orange,
    },

    statusOther: {
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.grayLight,
    },

    statusOtherText: {
      color:
        COLORS.muted,
    },

    donorMessage: {
      marginTop:
        11,

      padding:
        10,

      borderRadius:
        10,

      backgroundColor:
        COLORS.softCard,

      borderWidth:
        1,

      borderColor:
        COLORS.border,
    },

    donorMessageText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    actionRow: {
      marginTop:
        12,

      flexDirection:
        'row',

      gap:
        8,
    },

    rejectButton: {
      flex:
        1,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      borderWidth:
        1.3,

      borderColor:
        COLORS.redButton,
    },

    rejectButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    acceptButton: {
      flex:
        1,

      height:
        40,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.redButton,
    },

    acceptButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    acceptedNotice: {
      marginTop:
        11,

      minHeight:
        38,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderRadius:
        10,

      backgroundColor:
        COLORS.greenLight,
    },

    acceptedNoticeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    coordinateButton: {
      height:
        42,

      marginTop:
        9,

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

    coordinateButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    completionCard: {
      marginTop:
        8,

      marginBottom:
        23,

      padding:
        14,

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        '#B8DFC7',

      backgroundColor:
        COLORS.greenLight,
    },

    completionIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    completionTextArea: {
      marginTop:
        8,
    },

    completionTitle: {
      color:
        COLORS.green,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    completionDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,
    },

    fulfillButton: {
      height:
        42,

      marginTop:
        12,

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
        COLORS.green,
    },

    fulfillButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    disabledButton: {
      opacity:
        0.5,
    },

    progressCard: {
      marginBottom:
        23,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,
    },

    progressStep: {
      minHeight:
        65,

      flexDirection:
        'row',
    },

    progressStepLast: {
      minHeight:
        45,

      flexDirection:
        'row',
    },

    timeline: {
      width:
        31,

      alignItems:
        'center',
    },

    completedCircle: {
      width:
        29,

      height:
        29,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.green,
    },

    currentCircle: {
      width:
        29,

      height:
        29,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    inactiveCircle: {
      width:
        29,

      height:
        29,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        '#D5D5D5',
    },

    timelineLine: {
      width:
        2,

      flex:
        1,

      marginVertical:
        3,

      backgroundColor:
        '#E3E3E3',
    },

    progressTextArea: {
      flex:
        1,

      paddingLeft:
        9,

      paddingTop:
        2,
    },

    progressTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    progressDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,
    },

    cancelButton: {
      height:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      borderWidth:
        1.5,

      borderColor:
        COLORS.redButton,

      borderRadius:
        12,
    },

    cancelButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    cancelHint: {
      marginTop:
        7,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,

      textAlign:
        'center',
    },

    dashboardButton: {
      height:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      borderRadius:
        12,

      backgroundColor:
        COLORS.redButton,
    },

    dashboardButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    // ========================================================
    // IN-APP ACTION POPUP
    // ========================================================

    actionPopupOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,

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
        COLORS.pinkLight,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        COLORS.greenLight,
    },

    actionPopupIconWarning: {
      backgroundColor:
        COLORS.orangeLight,
    },

    actionPopupIconDanger: {
      backgroundColor:
        COLORS.pinkLight,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        16,

      lineHeight:
        27,

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
        13,

      lineHeight:
        22,

      textAlign:
        'center',
    },

    actionPopupActions: {
      flexDirection:
        'row',

      gap:
        9,

      marginTop:
        19,
    },

    actionPopupActionsSingle: {
      justifyContent:
        'center',
    },

    actionPopupSecondaryButton: {
      flex:
        1,

      height:
        45,

      borderWidth:
        1,

      borderColor:
        COLORS.softBorder,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    actionPopupSecondaryText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    actionPopupPrimaryButton: {
      flex:
        1,

      minWidth:
        128,

      height:
        45,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupPrimarySuccess: {
      backgroundColor:
        COLORS.green,
    },

    actionPopupPrimaryDanger: {
      backgroundColor:
        COLORS.redButton,
    },

    actionPopupPrimaryText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },
  });
