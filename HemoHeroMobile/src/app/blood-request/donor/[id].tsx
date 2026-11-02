import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useFonts } from 'expo-font';

import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
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

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../../lib/fullScreen';

import {
  getDonorViewBloodRequest,
  getMyDonorResponse,
  reportBloodRequest,
  type RequestReportReason,
  respondToBloodRequest,
  withdrawDonorResponse,
} from '../../../lib/donorRequests';

import type {
  DonorBloodRequest,
  DonorResponse,
  DonorResponseStatus,
} from '../../../lib/donorRequests';

import {
  getMyDonorApplication,
} from '../../../lib/donorApplication';

import type {
  DonorApplication,
} from '../../../lib/donorApplication';

import {
  acceptDonorInvitation,
  declineDonorInvitation,
  getMyDonorInvitations,
} from '../../../lib/donorInvitations';

import type {
  DonorInvitation,
  DonorInvitationStatus,
} from '../../../lib/donorInvitations';

import {
  getCompatibleDonorTypes,
  isBloodType,
} from '../../../lib/bloodCompatibility';

import {
  getFeedbackFrom,
  getRequestDonations,
} from '../../../lib/donations';

import {
  FadeInView,
  PressableScale,
} from '../../../components/Motion';

import AppModal from '../../../components/AppModal';

import {
  useLiveRefresh,
} from '../../../lib/useLiveRefresh';

import {
  getCoordinationInbox,
  isScheduleAgreed,
  type CoordinationInboxItem,
} from '../../../lib/coordination';

import ReportRequestSheet from '../../../components/ReportRequestSheet';

import type {
  BloodDonation,
} from '../../../lib/donations';

import {
  getAccessToken,
} from '../../../lib/session';

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

// ============================================================
// INVITATION TYPE
//
// Same shape the API returns (lib/donorInvitations).
// ============================================================

type DonorInvitationRecord =
  DonorInvitation;

// ============================================================
// STATUS DISPLAY
// ============================================================

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

// The donor's own offer on this request.
const RESPONSE_STATUS: Record<
  DonorResponseStatus,
  {
    label: string;
    tone: Tone;
    icon: IconName;
    title: string;
    text: string;
  }
> = {
  pending: {
    label: 'Pending',
    tone: 'orange',
    icon: 'schedule',
    title: 'Offer sent',
    text: 'Waiting for the requester to accept.',
  },

  accepted: {
    label: 'Accepted',
    tone: 'green',
    icon: 'check-circle',
    title: 'You’re accepted',
    text: 'Chat with the requester to plan your donation.',
  },

  rejected: {
    label: 'Not selected',
    tone: 'gray',
    icon: 'cancel',
    title: 'Another donor was chosen',
    text: 'Thank you for offering to help.',
  },

  withdrawn: {
    label: 'Withdrawn',
    tone: 'gray',
    icon: 'undo',
    title: 'Offer withdrawn',
    text: 'You withdrew your offer.',
  },

  no_show: {
    label: 'No-show',
    tone: 'red',
    icon: 'person-off',
    title: 'Marked as a no-show',
    text: 'The requester said you didn’t come. Reply in chat if this is a mistake.',
  },
};

const INVITATION_STATUS: Record<
  DonorInvitationStatus,
  {
    label: string;
    tone: Tone;
  }
> = {
  pending: {
    label: 'New',
    tone: 'blue',
  },

  accepted: {
    label: 'Accepted',
    tone: 'green',
  },

  declined: {
    label: 'Declined',
    tone: 'gray',
  },

  cancelled: {
    label: 'Cancelled',
    tone: 'gray',
  },
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

// ============================================================
// BLOOD TYPE
//
// Same rule as the server: the donor's verified blood type
// must be red-cell compatible with the requested type.
// ============================================================

function normalizeBloodType(
  value?: string | null
) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function isCompatibleDonor(
  requestBloodType?: string | null,
  donorBloodType?: string | null
) {
  const requestType =
    normalizeBloodType(
      requestBloodType
    );

  const donorType =
    normalizeBloodType(
      donorBloodType
    );

  if (
    !isBloodType(
      requestType
    ) ||
    !isBloodType(
      donorType
    )
  ) {
    return false;
  }

  return getCompatibleDonorTypes(
    requestType
  ).includes(
    donorType
  );
}

// e.g. "O-, O+, A-, A+" for an A+ request.
function getCompatibleDonorLabel(
  requestBloodType?: string | null
) {
  const requestType =
    normalizeBloodType(
      requestBloodType
    );

  return isBloodType(
    requestType
  )
    ? getCompatibleDonorTypes(
        requestType
      ).join(', ')
    : 'not available';
}

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

export default function DonorBloodRequestScreen() {
  const [
    fontsLoaded,
    fontError,
  ] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ==========================================================
  // ROUTE
  // ==========================================================

  const params =
    useLocalSearchParams<{
      id?: string | string[];
      invitationId?: string | string[];
    }>();

  const requestId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;

  const invitationId =
    Array.isArray(
      params.invitationId
    )
      ? params.invitationId[0]
      : params.invitationId;

  const isInvitationMode =
    Boolean(
      invitationId
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    request,
    setRequest,
  ] =
    useState<
      DonorBloodRequest | null
    >(null);

  const [
    donorResponse,
    setDonorResponse,
  ] =
    useState<
      DonorResponse | null
    >(null);

  const [
    donorApplication,
    setDonorApplication,
  ] =
    useState<
      DonorApplication | null
    >(null);

  const [
    invitation,
    setInvitation,
  ] =
    useState<
      DonorInvitationRecord | null
    >(null);

  // Donation the requester confirmed for this donor's
  // accepted offer (the transaction record).
  const [
    myDonation,
    setMyDonation,
  ] =
    useState<
      BloodDonation | null
    >(null);

  // "Report this request" sheet (false request, asking for money).
  const [
    reportVisible,
    setReportVisible,
  ] =
    useState(false);

  // This donor's chat for the request: meeting time, unread
  // messages, and the requester's name.
  const [
    conversation,
    setConversation,
  ] =
    useState<CoordinationInboxItem | null>(
      null
    );

  // First day this donor may donate again after their last
  // donation (null = they can donate now).
  const [
    nextEligibleAt,
    setNextEligibleAt,
  ] =
    useState<string | null>(
      null
    );

  const hasLoadedOnce =
    useRef(false);

  const insets =
    useSafeAreaInsets();

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
    message,
    setMessage,
  ] =
    useState('');

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    withdrawing,
    setWithdrawing,
  ] =
    useState(false);

  const [
    acceptingInvitation,
    setAcceptingInvitation,
  ] =
    useState(false);

  const [
    decliningInvitation,
    setDecliningInvitation,
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
      confirmText: 'Okay',
      cancelText: 'Cancel',
      showCancel: false,
      onConfirm: undefined,
    });

  // ==========================================================
  // LOAD
  // ==========================================================

  // A live check that was overtaken by a newer load (e.g. after
  // sending an offer) is dropped.
  const loadGuard =
    useRef(0);

  const loadData =
    useCallback(
      async (live = false) => {
        if (!requestId) {
          setErrorMessage(
            'Blood request ID is missing.'
          );

          setLoading(false);

          return;
        }

        if (!live) {
          loadGuard.current += 1;
        }

        const thisLoad =
          loadGuard.current;

        try {
          // Returning from the chat refreshes quietly.
          if (
            !hasLoadedOnce.current &&
            !live
          ) {
            setLoading(true);
          }

          if (!live) {
            setErrorMessage('');
          }

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const invitationPromise =
            invitationId
              ? getMyDonorInvitations(
                  token
                )
              : Promise.resolve(
                  null
                );

          const [
            requestData,
            responseData,
            donorApplicationData,
            invitationData,
          ] =
            await Promise.all([
              getDonorViewBloodRequest(
                token,
                requestId
              ),

              getMyDonorResponse(
                token,
                requestId
              ),

              getMyDonorApplication(
                token
              ),

              invitationPromise,
            ]);

          if (
            !requestData?.request
          ) {
            throw new Error(
              'Blood request could not be found.'
            );
          }

          if (
            thisLoad !==
            loadGuard.current
          ) {
            return;
          }

          setErrorMessage('');

          const currentRequest =
            requestData.request;

          const currentResponse =
            responseData?.response ||
            null;

          const currentApplication =
            donorApplicationData
              ?.application ||
            null;

          setRequest(
            currentRequest
          );

          setDonorResponse(
            currentResponse
          );

          setDonorApplication(
            currentApplication
          );

          setNextEligibleAt(
            donorApplicationData
              ?.next_eligible_at ||
              null
          );

          hasLoadedOnce.current = true;

          // Chat details once the donor is in a conversation.
          // A failure only hides them.
          if (
            currentResponse?.status ===
              'accepted' ||
            currentResponse?.status ===
              'no_show'
          ) {
            getCoordinationInbox(
              token
            )
              .then(result =>
                setConversation(
                  (
                    result.conversations ||
                    []
                  ).find(
                    item =>
                      item.response_id ===
                      currentResponse.id
                  ) || null
                )
              )
              .catch(inboxError => {
                console.log(
                  'DONOR REQUEST CONVERSATION ERROR:',
                  inboxError
                );

                if (!live) {
                  setConversation(null);
                }
              });
          } else {
            setConversation(null);
          }

          // Donation record for an accepted offer. A failure only
          // hides the donation status.
          if (
            currentResponse?.status ===
            'accepted'
          ) {
            try {
              const donationData =
                await getRequestDonations(
                  token,
                  requestId
                );

              const ownDonations =
                (
                  donationData.donations ||
                  []
                ).filter(
                  donation =>
                    donation.response_id ===
                    currentResponse.id
                );

              setMyDonation(
                ownDonations.find(
                  donation =>
                    donation.status !==
                    'rejected'
                ) ||
                  ownDonations[0] ||
                  null
              );
            } catch (donationError) {
              console.log(
                'DONOR DONATION STATUS ERROR:',
                donationError
              );

              if (!live) {
                setMyDonation(null);
              }
            }
          } else {
            setMyDonation(null);
          }

          // A live check must not replace what's being typed.
          if (!live) {
            setMessage(
              currentResponse?.message ||
                ''
            );
          }

          // ================================================
          // DIRECT INVITATION
          // ================================================

          if (
            invitationId
          ) {
            const invitationRows =
              Array.isArray(
                invitationData
                  ?.invitations
              )
                ? invitationData
                    .invitations
                : [];

            const matchedInvitation =
              invitationRows.find(
                (
                  item:
                    DonorInvitationRecord
                ) =>
                  item.id ===
                  invitationId
              ) || null;

            if (
              !matchedInvitation
            ) {
              throw new Error(
                'This donor invitation could not be found.'
              );
            }

            if (
              matchedInvitation
                .request_id !==
              requestId
            ) {
              throw new Error(
                'This invitation does not belong to this blood request.'
              );
            }

            setInvitation(
              matchedInvitation
            );
          } else {
            setInvitation(null);
          }
        } catch (error) {
          if (live) {
            return;
          }

          console.log(
            'DONOR REQUEST LOAD ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load this blood request.'
          );
        } finally {
          if (!live) {
            setLoading(false);
          }
        }
      },
      [
        requestId,
        invitationId,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadData();
      },
      [
        loadData,
      ]
    )
  );

  useLiveRefresh(() =>
    loadData(true)
  );

  // ==========================================================
  // BASIC HELPERS
  // ==========================================================

  function getRequestNumber(
    id: string
  ) {
    return id
      .replace(
        /-/g,
        ''
      )
      .slice(
        0,
        6
      )
      .toUpperCase();
  }

  function getFacilityType(
    bloodRequest:
      DonorBloodRequest
  ) {
    const extendedRequest =
      bloodRequest as
        DonorBloodRequest & {
          facility_type?:
            | string
            | null;
        };

    return (
      extendedRequest
        .facility_type ||
      null
    );
  }

  function getFacilityIcon(
    bloodRequest:
      DonorBloodRequest
  ) {
    const type =
      getFacilityType(
        bloodRequest
      );

    switch (type) {
      case 'red_cross':
        return 'add-box';

      case 'blood_bank':
        return 'bloodtype';

      case 'medical_facility':
        return 'medical-services';

      default:
        return 'local-hospital';
    }
  }

  function formatNeededBy(
    bloodRequest:
      DonorBloodRequest
  ) {
    if (
      bloodRequest
        .urgency ===
      'urgent'
    ) {
      return 'As soon as possible';
    }

    if (
      !bloodRequest
        .needed_date
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
      !bloodRequest
        .needed_time
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

  // ==========================================================
  // CUSTOM MODAL HELPERS
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
        'sent'
      ) ||
      value.includes(
        'withdrawn'
      ) ||
      value.includes(
        'accepted'
      )
    ) {
      return 'success';
    }

    if (
      value.includes(
        'unable'
      ) ||
      value.includes(
        'not compatible'
      ) ||
      value.includes(
        'required'
      )
    ) {
      return 'error';
    }

    return 'info';
  }

  function showMessage(
    title: string,
    description: string
  ) {
    setActionPopup({
      visible: true,
      title,
      message:
        description,
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
      onConfirm:
        undefined,
    });
  }

  function showConfirmation(
    options: {
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      variant:
        ActionPopupVariant;
      onConfirm:
        () => void;
    }
  ) {
    setActionPopup({
      visible: true,
      title:
        options.title,
      message:
        options.message,
      variant:
        options.variant,
      confirmText:
        options.confirmText,
      cancelText:
        options.cancelText,
      showCancel:
        true,
      onConfirm:
        options.onConfirm,
    });
  }

  // ==========================================================
  // BLOOD TYPE COMPATIBILITY
  // ==========================================================

  function hasCompatibleBloodType() {
    if (
      !request ||
      !donorApplication
    ) {
      return false;
    }

    return isCompatibleDonor(
      request.blood_type,
      donorApplication
        .blood_type
    );
  }

  // ==========================================================
  // DATES / DIRECTIONS
  // ==========================================================

  // "Sep 30" this year, "Sep 30, 2025" otherwise (or always
  // with the year when asked).
  function formatShortDate(
    value?: string | null,
    withYear = false
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
        year:
          withYear ||
          date.getFullYear() !==
            new Date().getFullYear()
            ? 'numeric'
            : undefined,
      }
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
  // DONATION STATUS
  //
  // Where this donor's donation stands in the transaction:
  // waiting to donate -> confirmed by requester -> verified.
  // ==========================================================

  function renderDonationStatus() {
    if (
      donorResponse?.status !==
      'accepted'
    ) {
      return null;
    }

    if (
      !myDonation ||
      myDonation.status ===
        'rejected'
    ) {
      return (
        <View
          style={
            styles.inlineNote
          }
        >
          <MaterialIcons
            name={
              myDonation
                ? 'error-outline'
                : 'bloodtype'
            }
            size={15}
            color={
              myDonation
                ? COLORS.redButton
                : COLORS.muted
            }
          />

          <Text
            style={[
              styles.inlineNoteText,
              {
                color:
                  myDonation
                    ? COLORS.redButton
                    : COLORS.muted,
              },
            ]}
          >
            {myDonation
              ? `Record not accepted${
                  myDonation.admin_note
                    ? `: ${myDonation.admin_note}`
                    : '. The requester can confirm it again.'
                }`
              : 'After you donate, the requester confirms it in your chat.'}
          </Text>
        </View>
      );
    }

    const recorded =
      myDonation.status ===
      'completed';

    const requesterFeedback =
      getFeedbackFrom(
        myDonation,
        'requester'
      );

    const myFeedback =
      getFeedbackFrom(
        myDonation,
        'donor'
      );

    // Rating and reporting happen in the chat.
    const chatHint =
      myFeedback
        ? recorded
          ? 'To report a problem with this record, use the chat.'
          : ''
        : recorded
          ? 'Rate the requester in the chat. You can report a problem there too.'
          : 'Rate the requester in the chat.';

    return (
      <FadeInView
        key={
          myDonation.status
        }
        offset={6}
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
              recorded
                ? 'task-alt'
                : 'hourglass-top'
            }
            size={16}
            color={
              recorded
                ? COLORS.green
                : COLORS.orange
            }
          />

          <Text
            style={
              styles.recordText
            }
            numberOfLines={1}
          >
            {bagsLabel(
              myDonation.units_donated
            )}{' '}
            donated ·{' '}
            {formatShortDate(
              myDonation.donated_at,
              true
            )}
          </Text>

          <View
            style={[
              styles.chip,
              {
                backgroundColor:
                  recorded
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
                    recorded
                      ? COLORS.green
                      : COLORS.orange,
                },
              ]}
            >
              {recorded
                ? 'Recorded'
                : 'In review'}
            </Text>
          </View>
        </View>

        {recorded &&
        myDonation.next_eligible_at ? (
          <Text
            style={
              styles.recordSub
            }
          >
            You can donate again from{' '}
            {formatShortDate(
              myDonation.next_eligible_at,
              true
            )}
            .
          </Text>
        ) : !recorded &&
          myDonation.dispute_note ? (
          <Text
            style={
              styles.recordSub
            }
          >
            You reported: “{myDonation.dispute_note}”
          </Text>
        ) : null}

        {requesterFeedback ? (
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
                requesterFeedback.rating
              }
            />
          </View>
        ) : null}

        {requesterFeedback?.comment ? (
          <Text
            style={
              styles.ratingComment
            }
            numberOfLines={3}
          >
            “{requesterFeedback.comment}”
          </Text>
        ) : null}

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

        {chatHint ? (
          <View
            style={
              styles.recordHint
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
                styles.recordHintText
              }
            >
              {chatHint}
            </Text>
          </View>
        ) : null}
      </FadeInView>
    );
  }

  // ==========================================================
  // REPORT THIS REQUEST
  // ==========================================================

  // Throws on failure so the sheet can show the message.
  async function submitRequestReport(value: {
    reason: RequestReportReason;
    details: string;
  }) {
    if (!requestId) {
      return;
    }

    const token =
      await getAccessToken();

    if (!token) {
      router.replace('/');

      return;
    }

    const result =
      await reportBloodRequest(
        token,
        requestId,
        value
      );

    setReportVisible(false);

    showMessage(
      'Report Sent',

      result.flagged
        ? 'Thank you. Several people reported this request, so it is now hidden from donors while Hemo-Hero reviews it.'
        : 'Thank you. Hemo-Hero will review this request. You don’t need to go if something feels wrong.'
    );

    if (result.flagged) {
      loadData();
    }
  }

  // ==========================================================
  // DONOR APPLICATION
  // ==========================================================

  function getDonorApplicationTitle() {
    if (
      !donorApplication
    ) {
      return 'Become a Donor';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Application Under Review';

      case 'approved':
        return 'Verified Donor';

      case 'rejected':
        return 'Application Not Approved';

      case 'withdrawn':
        return 'Application Withdrawn';

      default:
        return 'Become a Donor';
    }
  }

  function getDonorApplicationDescription() {
    if (
      !donorApplication
    ) {
      return 'Get verified as a donor to offer blood.';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'You can offer once your application is approved.';

      case 'approved':
        return 'Your donor account is verified and eligible to submit donor offers.';

      case 'rejected':
        return 'Review your details and apply again.';

      case 'withdrawn':
        return 'Apply again when you’re ready.';

      default:
        return 'Complete donor registration before offering to donate.';
    }
  }

  function getDonorApplicationIcon() {
    if (
      !donorApplication
    ) {
      return 'how-to-reg';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'schedule';

      case 'approved':
        return 'verified';

      case 'rejected':
        return 'cancel';

      case 'withdrawn':
        return 'undo';

      default:
        return 'how-to-reg';
    }
  }

  function getDonorApplicationColor() {
    if (
      !donorApplication
    ) {
      return COLORS.redButton;
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return COLORS.orange;

      case 'approved':
        return COLORS.green;

      case 'rejected':
        return COLORS.redButton;

      case 'withdrawn':
        return COLORS.gray;

      default:
        return COLORS.redButton;
    }
  }

  function getDonorActionLabel() {
    if (
      !donorApplication
    ) {
      return 'Apply as a Donor';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Application Under Review';

      case 'approved':
        return 'Offer to Donate';

      case 'rejected':
      case 'withdrawn':
        return 'Reapply as a Donor';

      default:
        return 'Apply as a Donor';
    }
  }

  function isApprovedDonor() {
    return (
      donorApplication
        ?.status ===
      'approved'
    );
  }

  // ==========================================================
  // INVITATION HELPERS
  // ==========================================================

  function getRequesterName() {
    return (
      invitation
        ?.requester
        ?.full_name ||
      invitation
        ?.requester
        ?.first_name ||
      'A Hemo-Hero user'
    );
  }

  // ==========================================================
  // OPEN COORDINATION
  // ==========================================================

  function handleOpenCoordination() {
    if (
      !request ||
      !donorResponse ||
      (donorResponse.status !==
        'accepted' &&
        donorResponse.status !==
          'no_show')
    ) {
      return;
    }

    router.push(
      `/blood-request/${request.id}/coordination/${donorResponse.id}` as any
    );
  }

  // ==========================================================
  // NORMAL DONOR ACTION
  // ==========================================================

  function handleDonorActionPress() {
    if (
      submitting
    ) {
      return;
    }

    if (
      !donorApplication
    ) {
      router.push(
        '/donor-application/blood' as any
      );

      return;
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return;

      case 'rejected':
      case 'withdrawn':
        router.push(
          '/donor-application/blood' as any
        );

        return;

      case 'approved':
        handleOfferPress();

        return;

      default:
        router.push(
          '/donor-application/blood' as any
        );
    }
  }

  // ==========================================================
  // NORMAL OFFER
  // ==========================================================

  function handleOfferPress() {
    if (
      !request ||
      submitting ||
      !isApprovedDonor()
    ) {
      return;
    }

    if (
      !hasCompatibleBloodType()
    ) {
      showMessage(
        'Blood Type Not Compatible',
        `This request needs ${request.blood_type}, and your verified blood type (${
          donorApplication
            ?.blood_type ||
          'not available'
        }) cannot donate to it. Compatible donors: ${getCompatibleDonorLabel(request.blood_type)}.`
      );

      return;
    }

    showConfirmation({
      title:
        'Offer to Donate',

      message:
        'Your offer will be sent to the requester. Medical personnel must still verify your eligibility before donation.',

      confirmText:
        'Send Offer',

      cancelText:
        'Not Now',

      variant:
        'success',

      onConfirm: () => {
        closeActionPopup();

        submitResponse();
      },
    });
  }

  async function submitResponse() {
    if (
      !request ||
      !requestId ||
      submitting ||
      !isApprovedDonor()
    ) {
      return;
    }

    if (
      !hasCompatibleBloodType()
    ) {
      showMessage(
        'Blood Type Not Compatible',
        `Only donors whose blood type is compatible with ${request.blood_type} can offer: ${getCompatibleDonorLabel(request.blood_type)}.`
      );

      return;
    }

    try {
      setSubmitting(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const data =
        await respondToBloodRequest(
          token,
          requestId,
          message
        );

      setDonorResponse(
        data.response
      );

      showMessage(
        'Offer Sent',
        'Your offer to donate has been sent successfully.'
      );
    } catch (error) {
      console.log(
        'DONOR RESPONSE ERROR:',
        error
      );

      showMessage(
        'Unable to Send Offer',
        error instanceof Error
          ? error.message
          : 'Unable to send your donor offer.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================================
  // WITHDRAW NORMAL OFFER
  // ==========================================================

  function handleWithdrawPress() {
    if (
      !donorResponse ||
      donorResponse.status !==
        'pending' ||
      withdrawing
    ) {
      return;
    }

    showConfirmation({
      title:
        'Withdraw Donor Response',

      message:
        'Your offer will no longer be considered for this request.',

      confirmText:
        'Withdraw',

      cancelText:
        'Keep Response',

      variant:
        'danger',

      onConfirm: () => {
        closeActionPopup();

        withdrawResponse();
      },
    });
  }

  async function withdrawResponse() {
    if (
      !requestId ||
      withdrawing
    ) {
      return;
    }

    try {
      setWithdrawing(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const data =
        await withdrawDonorResponse(
          token,
          requestId
        );

      setDonorResponse(
        data.response
      );

      showMessage(
        'Response Withdrawn',
        'Your donor response has been withdrawn.'
      );
    } catch (error) {
      console.log(
        'WITHDRAW RESPONSE ERROR:',
        error
      );

      showMessage(
        'Unable to Withdraw Response',
        error instanceof Error
          ? error.message
          : 'Unable to withdraw your donor response.'
      );
    } finally {
      setWithdrawing(false);
    }
  }

  // ==========================================================
  // ACCEPT DIRECT INVITATION
  // ==========================================================

  function handleAcceptInvitationPress() {
    if (
      !request ||
      !invitation ||
      invitation.status !==
        'pending' ||
      acceptingInvitation ||
      decliningInvitation
    ) {
      return;
    }

    if (
      !isApprovedDonor()
    ) {
      showMessage(
        'Verified Donor Required',
        'Your donor verification must be active before accepting this invitation.'
      );

      return;
    }

    if (
      !hasCompatibleBloodType()
    ) {
      showMessage(
        'Blood Type Not Compatible',
        `This request needs ${request.blood_type}, and your verified blood type (${
          donorApplication
            ?.blood_type ||
          'not available'
        }) cannot donate to it. Compatible donors: ${getCompatibleDonorLabel(request.blood_type)}.`
      );

      return;
    }

    const description =
      `Accept the request for ${request.blood_type} blood at ${request.facility_name}? You will be connected with the requester for donation coordination.`;

    showConfirmation({
      title:
        'Accept Request',

      message:
        description,

      confirmText:
        'Accept Request',

      cancelText:
        'Not Now',

      variant:
        'success',

      onConfirm: () => {
        closeActionPopup();

        acceptInvitation();
      },
    });
  }

  async function acceptInvitation() {
    if (
      !requestId ||
      !invitation ||
      invitation.status !==
        'pending' ||
      acceptingInvitation
    ) {
      return;
    }

    if (
      !hasCompatibleBloodType()
    ) {
      showMessage(
        'Blood Type Not Compatible',
        'This invitation cannot be accepted because your verified blood type is not compatible with this request.'
      );

      return;
    }

    try {
      setAcceptingInvitation(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const result =
        await acceptDonorInvitation(
          token,
          invitation.id
        );

      const updatedInvitation =
        result?.invitation ||
        {
          ...invitation,

          status:
            'accepted',
        };

      const acceptedResponse =
        result?.response ||
        null;

      setInvitation({
        ...invitation,
        ...updatedInvitation,

        status:
          'accepted',
      });

      if (
        acceptedResponse
      ) {
        const now =
          new Date()
            .toISOString();

        // The invitation API's response has optional
        // timestamps; the donor screen expects them set.
        setDonorResponse({
          ...acceptedResponse,

          created_at:
            acceptedResponse.created_at ||
            now,

          updated_at:
            acceptedResponse.updated_at ||
            now,
        });
      }

      if (
        acceptedResponse?.id
      ) {
        router.replace(
          `/blood-request/${requestId}/coordination/${acceptedResponse.id}` as any
        );

        return;
      }

      await loadData();
    } catch (error) {
      console.log(
        'ACCEPT DONOR INVITATION ERROR:',
        error
      );

      showMessage(
        'Unable to Accept Request',
        error instanceof Error
          ? error.message
          : 'Unable to accept this donor invitation.'
      );
    } finally {
      setAcceptingInvitation(
        false
      );
    }
  }

  // ==========================================================
  // DECLINE DIRECT INVITATION
  // ==========================================================

  function handleDeclineInvitationPress() {
    if (
      !invitation ||
      invitation.status !==
        'pending' ||
      decliningInvitation ||
      acceptingInvitation
    ) {
      return;
    }

    const description =
      'Decline this request for help? The requester will be notified that you are unable to accept.';

    showConfirmation({
      title:
        'Decline Request',

      message:
        description,

      confirmText:
        'Decline',

      cancelText:
        'Keep Request',

      variant:
        'danger',

      onConfirm: () => {
        closeActionPopup();

        declineInvitation();
      },
    });
  }

  async function declineInvitation() {
    if (
      !invitation ||
      invitation.status !==
        'pending' ||
      decliningInvitation
    ) {
      return;
    }

    try {
      setDecliningInvitation(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const result =
        await declineDonorInvitation(
          token,
          invitation.id
        );

      setInvitation({
        ...invitation,

        ...(result?.invitation ||
          {}),

        status:
          'declined',
      });

      router.replace(
        '/requests' as any
      );
    } catch (error) {
      console.log(
        'DECLINE DONOR INVITATION ERROR:',
        error
      );

      showMessage(
        'Unable to Decline Request',
        error instanceof Error
          ? error.message
          : 'Unable to decline this donor invitation.'
      );
    } finally {
      setDecliningInvitation(
        false
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  if (
    !fontsLoaded &&
    !fontError
  ) {
    return null;
  }

  const bloodTypeCompatible =
    hasCompatibleBloodType();

  // Reported by several donors and waiting for review.
  const requestFlagged =
    Boolean(
      request?.flagged_at
    ) &&
    request?.status ===
      'active';

  // Fulfilled / cancelled requests stay viewable for donors who
  // took part, but can no longer be offered to or withdrawn from.
  const requestClosed =
    Boolean(request?.status) &&
    request?.status !== 'active';

  // A withdrawn offer lets the donor offer again.
  const activeResponse =
    donorResponse &&
    donorResponse.status !==
      'withdrawn'
      ? donorResponse
      : null;

  const responseStatus =
    activeResponse
      ? RESPONSE_STATUS[
          activeResponse.status
        ] ||
        RESPONSE_STATUS.pending
      : null;

  const pendingInvitation =
    isInvitationMode &&
    invitation?.status ===
      'pending' &&
    !requestClosed;

  // Donated recently: can't offer or accept until this date.
  const waitingUntil =
    nextEligibleAt &&
    Date.parse(nextEligibleAt) >
      Date.now()
      ? nextEligibleAt
      : null;

  const showWaiting =
    Boolean(waitingUntil) &&
    !activeResponse &&
    !requestClosed &&
    isApprovedDonor() &&
    (!isInvitationMode ||
      invitation?.status ===
        'pending');

  // Approved, compatible donor who can still send an offer.
  const canOffer =
    !isInvitationMode &&
    !activeResponse &&
    !requestClosed &&
    !requestFlagged &&
    isApprovedDonor() &&
    bloodTypeCompatible &&
    !waitingUntil;

  // Not a verified donor yet: show where their application is.
  const needsApplication =
    !isInvitationMode &&
    !activeResponse &&
    !requestClosed &&
    !requestFlagged &&
    !isApprovedDonor();

  const donationActive =
    Boolean(
      myDonation &&
        myDonation.status !==
          'rejected'
    );

  const meeting =
    activeResponse?.status ===
      'accepted' &&
    !donationActive &&
    conversation?.schedule
      ? `${formatMeeting(
          conversation.schedule
            .scheduled_at
        )}${
          isScheduleAgreed(
            conversation.schedule
          )
            ? ''
            : ' · not agreed yet'
        }`
      : '';

  const requesterName =
    invitation?.requester
      ? getRequesterName()
      : conversation
            ?.other_participant
            ?.full_name ||
        '';

  const unread =
    conversation?.unread_count ||
    0;

  const canChat =
    activeResponse?.status ===
      'accepted' ||
    activeResponse?.status ===
      'no_show';

  const steps =
    activeResponse &&
    (activeResponse.status ===
      'pending' ||
      activeResponse.status ===
        'accepted')
      ? [
          {
            label: 'Offered',
            done: true,
          },
          {
            label: 'Accepted',
            done:
              activeResponse.status ===
              'accepted',
          },
          {
            label: 'Scheduled',
            done:
              isScheduleAgreed(
                conversation?.schedule
              ) ||
              donationActive,
          },
          {
            label: 'Donated',
            done:
              donationActive,
          },
        ]
      : [];

  const currentStep =
    requestClosed
      ? -1
      : steps.findIndex(
          step => !step.done
        );

  const statusPill =
    request?.removed_at
      ? 'Removed'
      : requestFlagged
        ? 'Under review'
        : request?.status ===
            'fulfilled'
          ? 'Fulfilled'
          : request?.status ===
              'cancelled'
            ? 'Cancelled'
            : request?.status ===
                'expired'
              ? 'Expired'
              : 'Active';

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
                onPress={() => {
                  if (
                    router.canGoBack()
                  ) {
                    router.back();

                    return;
                  }

                  router.replace(
                    isInvitationMode
                      ? '/requests'
                      : '/search' as any
                  );
                }}
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
                  {isInvitationMode
                    ? 'Help Request'
                    : 'Blood Request'}
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
                      )} · Posted ${formatShortDate(
                        request.created_at
                      )}`
                    : 'Blood donation request'}
                </Text>
              </View>

              {request ? (
                <View
                  style={
                    styles.headerStatus
                  }
                >
                  <Text
                    style={
                      styles.headerStatusText
                    }
                  >
                    {statusPill}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY (rounded sheet over the header)

              Keyboard-aware: typing the note to the requester
              lifts the page and its footer above the keyboard.
          ================================================== */}

          <KeyboardAvoidingView
            style={
              styles.body
            }
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
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
              keyboardShouldPersistTaps="handled"
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
                    onPress={() =>
                      loadData()
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
                      NOTICE (closed / removed / under review)
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
                        {request.removal_reason
                          ? `${request.removal_reason} `
                          : ''}
                        You don’t need to go.
                      </Text>
                    </View>
                  ) : requestClosed ? (
                    <View
                      style={[
                        styles.notice,

                        request.status ===
                        'fulfilled'
                          ? styles.noticeSuccess
                          : styles.noticeMuted,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          request.status ===
                          'fulfilled'
                            ? 'task-alt'
                            : 'block'
                        }
                        size={18}
                        color={
                          request.status ===
                          'fulfilled'
                            ? COLORS.green
                            : COLORS.muted
                        }
                      />

                      <Text
                        style={
                          styles.noticeText
                        }
                      >
                        {request.status ===
                        'fulfilled'
                          ? 'Fulfilled. The requester got the blood they needed. Thank you for helping!'
                          : request.status ===
                              'cancelled'
                            ? 'The requester cancelled this request.'
                            : 'This request is closed.'}
                      </Text>
                    </View>
                  ) : requestFlagged ? (
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
                        Several donors reported this request. It isn’t taking new offers for now.
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      DIRECT INVITATION
                  ============================================== */}

                  {isInvitationMode &&
                  invitation ? (
                    <View
                      style={[
                        styles.notice,
                        styles.noticeInfo,
                      ]}
                    >
                      <MaterialIcons
                        name="mail-outline"
                        size={18}
                        color={
                          COLORS.blue
                        }
                      />

                      <View
                        style={
                          styles.flexFill
                        }
                      >
                        <Text
                          style={
                            styles.noticeText
                          }
                        >
                          <Text
                            style={
                              styles.noticeTitle
                            }
                          >
                            {getRequesterName()}
                          </Text>{' '}
                          asked you to donate.
                        </Text>

                        {invitation.message?.trim() ? (
                          <Text
                            style={
                              styles.noticeQuote
                            }
                          >
                            “{invitation.message.trim()}”
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              COLORS.white,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color:
                                TONES[
                                  INVITATION_STATUS[
                                    invitation.status
                                  ].tone
                                ].fg,
                            },
                          ]}
                        >
                          {
                            INVITATION_STATUS[
                              invitation.status
                            ].label
                          }
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* ==============================================
                      SUMMARY
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
                          numberOfLines={
                            1
                          }
                        >
                          {
                            request.facility_name
                          }
                        </Text>
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

                    {isApprovedDonor() ? (
                      <View
                        style={[
                          styles.matchLine,
                          {
                            backgroundColor:
                              bloodTypeCompatible
                                ? COLORS.greenLight
                                : COLORS.pinkLight,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            bloodTypeCompatible
                              ? 'check-circle'
                              : 'block'
                          }
                          size={16}
                          color={
                            bloodTypeCompatible
                              ? COLORS.green
                              : COLORS.redButton
                          }
                        />

                        <Text
                          style={[
                            styles.matchText,
                            {
                              color:
                                bloodTypeCompatible
                                  ? COLORS.green
                                  : COLORS.redButton,
                            },
                          ]}
                        >
                          {bloodTypeCompatible
                            ? `Your ${donorApplication?.blood_type} blood can donate to this request`
                            : `Your ${
                                donorApplication?.blood_type ||
                                'blood'
                              } type can’t donate to ${request.blood_type}`}
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
                      icon={
                        getFacilityIcon(
                          request
                        )
                      }
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
                    />

                    {requesterName ? (
                      <InfoRow
                        icon="person-outline"
                        label="Requester"
                        value={
                          requesterName
                        }
                      />
                    ) : null}

                    <InfoRow
                      icon="groups"
                      label="Who can donate"
                      last={
                        !request.message?.trim()
                      }
                    >
                      <View
                        style={
                          styles.typeChips
                        }
                      >
                        {getCompatibleDonorLabel(
                          request.blood_type
                        )
                          .split(', ')
                          .map(
                            type => (
                              <View
                                key={type}
                                style={[
                                  styles.typeChip,

                                  normalizeBloodType(
                                    donorApplication?.blood_type
                                  ) ===
                                    type &&
                                    styles.typeChipMine,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.typeChipText,

                                    normalizeBloodType(
                                      donorApplication?.blood_type
                                    ) ===
                                      type &&
                                      styles.typeChipTextMine,
                                  ]}
                                >
                                  {type}
                                </Text>
                              </View>
                            )
                          )}
                      </View>
                    </InfoRow>

                    {request.message?.trim() ? (
                      <InfoRow
                        icon="chat-bubble-outline"
                        label="Note from requester"
                        value={request.message.trim()}
                        valueRegular
                        last
                      />
                    ) : null}
                  </View>

                  {/* ==============================================
                      YOUR OFFER
                  ============================================== */}

                  {activeResponse &&
                  responseStatus ? (
                    <>
                      <Text
                        style={[
                          styles.sectionTitle,
                          styles.sectionGap,
                        ]}
                      >
                        Your offer
                      </Text>

                      <FadeInView
                        key={
                          activeResponse.status
                        }
                        offset={6}
                        style={
                          styles.card
                        }
                      >
                        <View
                          style={
                            styles.offerTop
                          }
                        >
                          <View
                            style={[
                              styles.offerIcon,
                              {
                                backgroundColor:
                                  TONES[
                                    responseStatus.tone
                                  ].bg,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                responseStatus.icon
                              }
                              size={20}
                              color={
                                TONES[
                                  responseStatus.tone
                                ].fg
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
                                styles.offerTitle
                              }
                            >
                              {
                                responseStatus.title
                              }
                            </Text>

                            <Text
                              style={
                                styles.offerText
                              }
                            >
                              {
                                responseStatus.text
                              }
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.chip,
                              {
                                backgroundColor:
                                  TONES[
                                    responseStatus.tone
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
                                      responseStatus.tone
                                    ].fg,
                                },
                              ]}
                            >
                              {
                                responseStatus.label
                              }
                            </Text>
                          </View>
                        </View>

                        {steps.length ? (
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
                                      numberOfLines={
                                        1
                                      }
                                    >
                                      {step.label}
                                    </Text>
                                  </View>
                                );
                              }
                            )}
                          </View>
                        ) : null}

                        {activeResponse.message?.trim() ? (
                          <Text
                            style={
                              styles.offerMessage
                            }
                            numberOfLines={
                              3
                            }
                          >
                            You said: “{activeResponse.message.trim()}”
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

                        {renderDonationStatus()}
                      </FadeInView>
                    </>
                  ) : null}

                  {/* Invitation answered without an offer record */}
                  {isInvitationMode &&
                  invitation &&
                  !activeResponse &&
                  (invitation.status ===
                    'declined' ||
                    invitation.status ===
                      'cancelled') ? (
                    <View
                      style={[
                        styles.card,
                        styles.sectionGap,
                        styles.inlineCard,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          invitation.status ===
                          'declined'
                            ? 'cancel'
                            : 'block'
                        }
                        size={18}
                        color={
                          COLORS.muted
                        }
                      />

                      <Text
                        style={
                          styles.inlineCardText
                        }
                      >
                        {invitation.status ===
                        'declined'
                          ? 'You declined this invitation.'
                          : 'The requester cancelled this invitation.'}
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      WAITING PERIOD AFTER DONATING
                  ============================================== */}

                  {showWaiting &&
                  waitingUntil ? (
                    <View
                      style={[
                        styles.notice,
                        styles.noticeSuccess,
                        styles.sectionGap,
                      ]}
                    >
                      <MaterialIcons
                        name="event-available"
                        size={18}
                        color={
                          COLORS.green
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
                                COLORS.green,
                            },
                          ]}
                        >
                          Thank you for donating!{' '}
                        </Text>
                        You can donate again from{' '}
                        {formatShortDate(
                          waitingUntil,
                          true
                        )}
                        .
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      SEND AN OFFER
                  ============================================== */}

                  {canOffer ? (
                    <>
                      <Text
                        style={[
                          styles.sectionTitle,
                          styles.sectionGap,
                        ]}
                      >
                        Your offer
                      </Text>

                      <View
                        style={
                          styles.card
                        }
                      >
                        <Text
                          style={
                            styles.inputLabel
                          }
                        >
                          Note to requester{' '}
                          <Text
                            style={
                              styles.inputOptional
                            }
                          >
                            (optional)
                          </Text>
                        </Text>

                        <TextInput
                          style={
                            styles.input
                          }
                          value={
                            message
                          }
                          onChangeText={
                            setMessage
                          }
                          editable={
                            !submitting
                          }
                          multiline
                          maxLength={
                            250
                          }
                          placeholder="e.g. I can donate this afternoon."
                          placeholderTextColor={
                            COLORS.lightMuted
                          }
                          textAlignVertical="top"
                        />

                        <Text
                          style={
                            styles.inputCounter
                          }
                        >
                          {message.length}/250
                        </Text>
                      </View>
                    </>
                  ) : null}

                  {/* ==============================================
                      DONOR APPLICATION (not verified yet)
                  ============================================== */}

                  {needsApplication ? (
                    <View
                      style={[
                        styles.card,
                        styles.sectionGap,
                        styles.offerTop,
                      ]}
                    >
                      <View
                        style={[
                          styles.offerIcon,
                          {
                            backgroundColor:
                              `${getDonorApplicationColor()}14`,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            getDonorApplicationIcon() as any
                          }
                          size={20}
                          color={
                            getDonorApplicationColor()
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
                            styles.offerTitle
                          }
                        >
                          {getDonorApplicationTitle()}
                        </Text>

                        <Text
                          style={
                            styles.offerText
                          }
                        >
                          {getDonorApplicationDescription()}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* ==============================================
                      PRIVACY + REPORT
                  ============================================== */}

                  <View
                    style={
                      styles.privacyRow
                    }
                  >
                    <MaterialIcons
                      name="shield"
                      size={15}
                      color={
                        COLORS.lightMuted
                      }
                    />

                    <Text
                      style={
                        styles.privacyText
                      }
                    >
                      Contact details stay private. Coordinate through Hemo-Hero chat.
                    </Text>
                  </View>

                  {!request.removed_at ? (
                    <TouchableOpacity
                      style={
                        styles.reportLink
                      }
                      activeOpacity={
                        0.7
                      }
                      accessibilityRole="button"
                      onPress={() =>
                        setReportVisible(
                          true
                        )
                      }
                    >
                      <MaterialIcons
                        name="outlined-flag"
                        size={15}
                        color={
                          COLORS.muted
                        }
                      />

                      <Text
                        style={
                          styles.reportLinkText
                        }
                      >
                        Something wrong?{' '}
                        <Text
                          style={
                            styles.reportLinkStrong
                          }
                        >
                          Report this request
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </FadeInView>
              ) : null}
            </ScrollView>

            {/* ==================================================
                FOOTER ACTION
            ================================================== */}

            {request &&
            !loading &&
            !errorMessage &&
            (pendingInvitation ||
              canOffer ||
              needsApplication ||
              canChat ||
              (activeResponse?.status ===
                'pending' &&
                !requestClosed)) ? (
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
                {pendingInvitation ? (
                  <View
                    style={
                      styles.footerRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.outlineButton,
                        styles.flexFill,
                      ]}
                      activeOpacity={
                        0.85
                      }
                      disabled={
                        decliningInvitation ||
                        acceptingInvitation
                      }
                      onPress={
                        handleDeclineInvitationPress
                      }
                    >
                      <Text
                        style={
                          styles.outlineButtonText
                        }
                      >
                        {decliningInvitation
                          ? 'Declining...'
                          : 'Decline'}
                      </Text>
                    </TouchableOpacity>

                    <PressableScale
                      style={
                        styles.primaryButton
                      }
                      containerStyle={
                        styles.flexFill
                      }
                      disabled={
                        acceptingInvitation ||
                        decliningInvitation ||
                        !isApprovedDonor() ||
                        !bloodTypeCompatible ||
                        Boolean(waitingUntil)
                      }
                      accessibilityRole="button"
                      onPress={
                        handleAcceptInvitationPress
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
                        {acceptingInvitation ? (
                          <ActivityIndicator
                            color={
                              COLORS.white
                            }
                          />
                        ) : (
                          <MaterialIcons
                            name="check"
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
                          Accept
                        </Text>
                      </LinearGradient>
                    </PressableScale>
                  </View>
                ) : canChat ? (
                  <PressableScale
                    style={
                      styles.primaryButton
                    }
                    accessibilityRole="button"
                    onPress={
                      handleOpenCoordination
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
                        name="forum"
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
                        Open Chat
                      </Text>

                      {unread >
                      0 ? (
                        <View
                          style={
                            styles.badge
                          }
                        >
                          <Text
                            style={
                              styles.badgeText
                            }
                          >
                            {unread > 9
                              ? '9+'
                              : unread}
                          </Text>
                        </View>
                      ) : null}
                    </LinearGradient>
                  </PressableScale>
                ) : activeResponse?.status ===
                  'pending' ? (
                  <TouchableOpacity
                    style={
                      styles.outlineButton
                    }
                    activeOpacity={
                      0.85
                    }
                    disabled={
                      withdrawing
                    }
                    onPress={
                      handleWithdrawPress
                    }
                  >
                    {withdrawing ? (
                      <ActivityIndicator
                        color={
                          COLORS.redButton
                        }
                      />
                    ) : (
                      <MaterialIcons
                        name="undo"
                        size={19}
                        color={
                          COLORS.redButton
                        }
                      />
                    )}

                    <Text
                      style={
                        styles.outlineButtonText
                      }
                    >
                      {withdrawing
                        ? 'Withdrawing...'
                        : 'Withdraw Offer'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <PressableScale
                    style={
                      styles.primaryButton
                    }
                    disabled={
                      submitting ||
                      donorApplication?.status ===
                        'pending'
                    }
                    accessibilityRole="button"
                    onPress={
                      handleDonorActionPress
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
                      {submitting ? (
                        <ActivityIndicator
                          color={
                            COLORS.white
                          }
                        />
                      ) : (
                        <MaterialIcons
                          name={
                            canOffer
                              ? 'volunteer-activism'
                              : donorApplication?.status ===
                                  'pending'
                                ? 'schedule'
                                : 'how-to-reg'
                          }
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
                        {submitting
                          ? 'Sending Offer...'
                          : getDonorActionLabel()}
                      </Text>
                    </LinearGradient>
                  </PressableScale>
                )}
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ====================================================
            REPORT THIS REQUEST
        ==================================================== */}

        <ReportRequestSheet
          visible={reportVisible}
          onClose={() =>
            setReportVisible(
              false
            )
          }
          onSubmit={
            submitRequestReport
          }
        />

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
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.16)',
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
    // NOTICES
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

    noticeSuccess: {
      borderColor: '#BFE3CC',
      backgroundColor: COLORS.greenLight,
    },

    noticeMuted: {
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.grayLight,
    },

    noticeInfo: {
      borderColor: '#C9DAF6',
      backgroundColor: COLORS.blueLight,
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

    noticeQuote: {
      marginTop: 4,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
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

    sectionTitle: {
      marginBottom: 9,
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14.5,
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

    inlineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    inlineCardText: {
      flex: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
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
      fontSize: 12.5,
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

    matchLine: {
      marginTop: 14,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
    },

    matchText: {
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

    typeChipMine: {
      borderColor: COLORS.green,
      backgroundColor: COLORS.greenLight,
    },

    typeChipText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_700Bold',
      fontSize: 11.5,
    },

    typeChipTextMine: {
      color: COLORS.green,
    },

    // ==========================================================
    // YOUR OFFER
    // ==========================================================

    offerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    offerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    offerTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    offerText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
    },

    offerMessage: {
      marginTop: 12,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontStyle: 'italic',
      fontSize: 12.5,
      lineHeight: 18,
    },

    steps: {
      marginTop: 14,
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

    inlineNote: {
      marginTop: 12,
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
      marginTop: 12,
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

    recordSub: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
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

    recordHint: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    recordHintText: {
      flex: 1,
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },

    // Offer note
    inputLabel: {
      marginBottom: 7,
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },

    inputOptional: {
      color: COLORS.lightMuted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
    },

    input: {
      minHeight: 84,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: COLORS.cardBorder,
      backgroundColor: '#FFFCFC',
      color: COLORS.black,
      fontFamily: 'Inter_400Regular',
      fontSize: 13.5,
      lineHeight: 19,
    },

    inputCounter: {
      marginTop: 5,
      alignSelf: 'flex-end',
      color: COLORS.lightMuted,
      fontFamily: 'Inter_500Medium',
      fontSize: 11.5,
    },

    // ==========================================================
    // PRIVACY + REPORT
    // ==========================================================

    privacyRow: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    privacyText: {
      flexShrink: 1,
      color: COLORS.lightMuted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    reportLink: {
      marginTop: 10,
      alignSelf: 'center',
      minHeight: 32,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    reportLinkText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    reportLinkStrong: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
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

    footerRow: {
      flexDirection: 'row',
      gap: 10,
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

    outlineButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.white,
    },

    outlineButtonText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    badge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: COLORS.white,
    },

    badgeText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
    },
  });
