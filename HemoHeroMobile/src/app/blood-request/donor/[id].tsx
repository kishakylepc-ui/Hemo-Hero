import { useCallback, useState } from 'react';
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
  Modal,
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
} from 'react-native-safe-area-context';

import {
  getDonorViewBloodRequest,
  getMyDonorResponse,
  respondToBloodRequest,
  withdrawDonorResponse,
} from '../../../lib/donorRequests';

import type {
  DonorBloodRequest,
  DonorResponse,
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
} from '../../../lib/donorInvitations';

import {
  getCompatibleDonorTypes,
  isBloodType,
} from '../../../lib/bloodCompatibility';

import {
  disputeDonation,
  getFeedbackFrom,
  getRequestDonations,
  submitDonationFeedback,
} from '../../../lib/donations';

import {
  FadeInView,
} from '../../../components/Motion';

import DonationFeedbackModal from '../../../components/DonationFeedbackModal';

// One-tap phrases for rating the requester.
const REQUESTER_FEEDBACK_NOTES = [
  'Clear instructions',
  'Easy to coordinate with',
  'Very thankful',
  'Smooth donation',
];

import type {
  BloodDonation,
} from '../../../lib/donations';

import {
  getAccessToken,
} from '../../../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#181818',

  pageTop: '#F2B3B5',
  pageBottom: '#D71318',

  muted: '#666666',
  lightMuted: '#929292',

  border: '#ECE2E2',

  pink: '#FFF2F2',
  pinkStrong: '#FFE7E7',

  green: '#198754',
  greenDark: '#12693F',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FFF5E8',

  gray: '#A7A7A7',
  grayLight: '#F2F2F2',
};

// ============================================================
// INVITATION TYPE
//
// Same shape the API returns (lib/donorInvitations).
// ============================================================

type DonorInvitationRecord =
  DonorInvitation;

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

  // Open dialog: rate the transaction or report a problem.
  const [
    donationDialog,
    setDonationDialog,
  ] =
    useState<
      'feedback' | 'dispute' | null
    >(null);

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

  const loadData =
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
          setLoading(true);

          setErrorMessage('');

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

              setMyDonation(null);
            }
          } else {
            setMyDonation(null);
          }

          if (
            currentResponse?.message
          ) {
            setMessage(
              currentResponse.message
            );
          } else {
            setMessage('');
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
          setLoading(false);
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

    const status =
      myDonation?.status ||
      null;

    const bags =
      myDonation
        ? `${myDonation.units_donated} ${
            Number(
              myDonation.units_donated
            ) === 1
              ? 'bag'
              : 'bags'
          }`
        : '';

    const donatedOn =
      myDonation
        ? new Date(
            myDonation.donated_at
          ).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }
          )
        : '';

    const nextEligible =
      myDonation?.next_eligible_at
        ? new Date(
            myDonation.next_eligible_at
          ).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }
          )
        : '';

    const appearance =
      status === 'completed'
        ? {
            icon: 'task-alt' as const,
            color: COLORS.green,
            background: COLORS.greenLight,
            title: 'Donation recorded — thank you, hero!',
            text: `The requester confirmed your donation of ${bags} on ${donatedOn}. It is now on your donation record${
              nextEligible
                ? `, and you can donate again from ${nextEligible}`
                : ''
            }.`,
          }
        : status === 'needs_review'
          ? {
              icon: 'hourglass-top' as const,
              color: COLORS.orange,
              background: COLORS.orangeLight,
              title: 'Under a quick review',
              text: myDonation?.dispute_note
                ? `You reported: “${myDonation.dispute_note}” Hemo-Hero will review the record and let you know.`
                : `The requester confirmed your donation of ${bags} on ${donatedOn}. Hemo-Hero will take a quick look before adding it to your record.`,
            }
          : status === 'rejected'
            ? {
                icon: 'error-outline' as const,
                color: COLORS.redButton,
                background: COLORS.pink,
                title: 'Donation record not accepted',
                text: myDonation?.admin_note
                  ? `Hemo-Hero did not accept this record: ${myDonation.admin_note}`
                  : 'Hemo-Hero did not accept this record. The requester can confirm it again.',
              }
            : {
                icon: 'bloodtype' as const,
                color: COLORS.redButton,
                background: COLORS.pink,
                title: 'After you donate',
                text: 'Once you have donated at the facility, the requester confirms it and it is added to your donation record.',
              };

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

    const canGiveFeedback =
      status === 'completed' ||
      status === 'needs_review';

    return (
      <>
        <FadeInView
          key={
            status ||
            'waiting'
          }
          offset={6}
          style={[
            styles.donationStatusCard,

            {
              backgroundColor:
                appearance.background,
            },
          ]}
        >
          <MaterialIcons
            name={
              appearance.icon
            }
            size={21}
            color={
              appearance.color
            }
          />

          <View
            style={
              styles.donationStatusCopy
            }
          >
            <Text
              style={[
                styles.donationStatusTitle,

                {
                  color:
                    appearance.color,
                },
              ]}
            >
              {appearance.title}
            </Text>

            <Text
              style={
                styles.donationStatusText
              }
            >
              {appearance.text}
            </Text>
          </View>
        </FadeInView>

        {/* What the requester said about the donation */}
        {requesterFeedback ? (
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
                Requester&apos;s feedback
              </Text>

              <StarRow
                rating={
                  requesterFeedback.rating
                }
              />
            </View>

            {requesterFeedback.comment ? (
              <Text
                style={
                  styles.feedbackComment
                }
              >
                “{requesterFeedback.comment}”
              </Text>
            ) : null}
          </View>
        ) : null}

        {canGiveFeedback ? (
          myFeedback ? (
            <TouchableOpacity
              style={
                styles.feedbackGiven
              }
              activeOpacity={0.8}
              onPress={() =>
                setDonationDialog(
                  'feedback'
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
              activeOpacity={0.85}
              onPress={() =>
                setDonationDialog(
                  'feedback'
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
                Rate Your Experience
              </Text>
            </TouchableOpacity>
          )
        ) : null}

        {/* Only a recorded donation can be disputed */}
        {status === 'completed' ? (
          <TouchableOpacity
            style={
              styles.reportLink
            }
            activeOpacity={0.7}
            onPress={() =>
              setDonationDialog(
                'dispute'
              )
            }
          >
            <MaterialIcons
              name="flag"
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
              Something wrong with this record?{' '}
              <Text
                style={
                  styles.reportLinkStrong
                }
              >
                Report a problem
              </Text>
            </Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  }

  // ==========================================================
  // DONATION FEEDBACK / REPORT
  // ==========================================================

  async function submitDonationDialog(value: {
    rating: number;
    comment: string;
  }) {
    const mode =
      donationDialog;

    if (
      !requestId ||
      !myDonation ||
      !mode
    ) {
      return;
    }

    const token =
      await getAccessToken();

    if (!token) {
      router.replace('/');

      return;
    }

    // Errors are shown inside the dialog.
    if (mode === 'feedback') {
      await submitDonationFeedback(
        token,
        requestId,
        myDonation.id,
        {
          rating:
            value.rating,

          comment:
            value.comment ||
            null,
        }
      );
    } else {
      await disputeDonation(
        token,
        requestId,
        myDonation.id,
        value.comment
      );
    }

    setDonationDialog(null);

    await loadData();

    showMessage(
      mode === 'feedback'
        ? 'Feedback Sent'
        : 'Problem Reported',

      mode === 'feedback'
        ? 'Thank you! The requester will see your feedback.'
        : 'Thanks for letting us know. Hemo-Hero will review this record and notify you.'
    );
  }

  // ==========================================================
  // RESPONSE
  // ==========================================================

  function getResponseStatusLabel() {
    if (
      !donorResponse
    ) {
      return '';
    }

    switch (
      donorResponse.status
    ) {
      case 'pending':
        return 'Pending Review';

      case 'accepted':
        return 'Accepted';

      case 'rejected':
        return 'Not Selected';

      case 'withdrawn':
        return 'Withdrawn';

      default:
        return donorResponse
          .status;
    }
  }

  function getResponseStatusColor() {
    if (
      !donorResponse
    ) {
      return COLORS.gray;
    }

    switch (
      donorResponse.status
    ) {
      case 'pending':
        return COLORS.orange;

      case 'accepted':
        return COLORS.green;

      case 'rejected':
        return COLORS.redButton;

      case 'withdrawn':
        return COLORS.gray;

      default:
        return COLORS.gray;
    }
  }

  function getResponseIconName() {
    if (
      !donorResponse
    ) {
      return 'volunteer-activism';
    }

    switch (
      donorResponse.status
    ) {
      case 'accepted':
        return 'check-circle';

      case 'pending':
        return 'schedule';

      case 'rejected':
        return 'cancel';

      case 'withdrawn':
        return 'undo';

      default:
        return 'volunteer-activism';
    }
  }

  function getResponseSummary() {
    if (
      !donorResponse
    ) {
      return '';
    }

    switch (
      donorResponse.status
    ) {
      case 'accepted':
        return 'Your response was accepted for this request. You can now message the requester and coordinate the donation.';

      case 'pending':
        return 'Your offer has been sent. The requester can review it and decide whether to accept your response.';

      case 'rejected':
        return 'The requester selected another donor for this blood request.';

      case 'withdrawn':
        return 'You withdrew your response from this request.';

      default:
        return '';
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
      return 'Register and complete donor verification before offering to donate blood.';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Your donor application is being reviewed. You can respond to blood requests once approved.';

      case 'approved':
        return 'Your donor account is verified and eligible to submit donor offers.';

      case 'rejected':
        return 'Your previous donor application was not approved. Review your information before applying again.';

      case 'withdrawn':
        return 'You previously withdrew your application. You may apply again when ready.';

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

  function getInvitationStatusLabel() {
    if (
      !invitation
    ) {
      return '';
    }

    switch (
      invitation.status
    ) {
      case 'pending':
        return 'Awaiting Your Decision';

      case 'accepted':
        return 'Invitation Accepted';

      case 'declined':
        return 'Invitation Declined';

      case 'cancelled':
        return 'Invitation Cancelled';

      default:
        return 'Invitation';
    }
  }

  function getInvitationStatusColor() {
    if (
      !invitation
    ) {
      return COLORS.redButton;
    }

    switch (
      invitation.status
    ) {
      case 'pending':
        return COLORS.orange;

      case 'accepted':
        return COLORS.green;

      case 'declined':
        return COLORS.gray;

      case 'cancelled':
        return COLORS.gray;

      default:
        return COLORS.redButton;
    }
  }

  function getInvitationStatusIcon():
    keyof typeof MaterialIcons.glyphMap {
    if (
      !invitation
    ) {
      return 'mail-outline';
    }

    switch (
      invitation.status
    ) {
      case 'pending':
        return 'mail-outline';

      case 'accepted':
        return 'check-circle';

      case 'declined':
        return 'cancel';

      case 'cancelled':
        return 'block';

      default:
        return 'mail-outline';
    }
  }

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
      donorResponse.status !==
        'accepted'
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

  // Fulfilled / cancelled requests stay viewable for donors who
  // took part, but can no longer be offered to or withdrawn from.
  const requestClosed =
    Boolean(request?.status) &&
    request?.status !== 'active';

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

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              '#D8171D',
              '#A90F14',
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

            <TouchableOpacity
              style={
                styles.backButton
              }
              activeOpacity={
                0.82
              }
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
                size={24}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>

            <View
              style={
                styles.headerCopy
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                {isInvitationMode
                  ? 'Help Request'
                  : 'Request Details'}
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
                  : 'Blood donation request'}
              </Text>
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY
          ================================================== */}

          <LinearGradient
            colors={[
              '#F5C1C3',
              COLORS.pageBottom,
            ]}
            style={
              styles.body
            }
          >
            <View
              style={
                styles.contentShell
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
                bounces={
                  false
                }
              >
                {loading ? (
                  <View
                    style={
                      styles.centerState
                    }
                  >
                    <View
                      style={
                        styles.centerIconWrap
                      }
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={32}
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
                      Loading Request
                    </Text>

                    <Text
                      style={
                        styles.centerDescription
                      }
                    >
                      Retrieving the latest request details.
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
                        styles.centerIconWrap
                      }
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={32}
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
                      Unable to Load Request
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
                        0.82
                      }
                      onPress={
                        loadData
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
                  <>
                    {/* ========================================
                        DIRECT INVITATION NOTICE
                    ======================================== */}

                    {isInvitationMode &&
                    invitation ? (
                      <View
                        style={
                          styles.directInvitationCard
                        }
                      >
                        <View
                          style={
                            styles.directInvitationTop
                          }
                        >
                          <View
                            style={
                              styles.directInvitationIcon
                            }
                          >
                            <MaterialIcons
                              name="mail-outline"
                              size={22}
                              color={
                                COLORS.redButton
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.directInvitationCopy
                            }
                          >
                            <Text
                              style={
                                styles.directInvitationEyebrow
                              }
                            >
                              DIRECT INVITATION
                            </Text>

                            <Text
                              style={
                                styles.directInvitationTitle
                              }
                            >
                              Someone requested your help
                            </Text>

                            <Text
                              style={
                                styles.directInvitationDescription
                              }
                            >
                              {getRequesterName()} selected you as a possible donor for this blood request. Review all request details before choosing whether to accept or decline.
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.invitationStatusRow
                          }
                        >
                          <View
                            style={[
                              styles.invitationStatusBadge,

                              {
                                backgroundColor:
                                  `${getInvitationStatusColor()}12`,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                getInvitationStatusIcon()
                              }
                              size={15}
                              color={
                                getInvitationStatusColor()
                              }
                            />

                            <Text
                              style={[
                                styles.invitationStatusText,

                                {
                                  color:
                                    getInvitationStatusColor(),
                                },
                              ]}
                            >
                              {getInvitationStatusLabel()}
                            </Text>
                          </View>
                        </View>

                        {invitation
                          .message
                          ?.trim() ? (
                          <View
                            style={
                              styles.invitationMessage
                            }
                          >
                            <MaterialIcons
                              name="chat-bubble-outline"
                              size={15}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.invitationMessageText
                              }
                            >
                              {invitation.message}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* ========================================
                        MAIN REQUEST
                    ======================================== */}

                    <View
                      style={
                        styles.requestCard
                      }
                    >
                      <View
                        style={
                          styles.badgeArea
                        }
                      >
                        <View
                          style={
                            styles.urgencyBadge
                          }
                        >
                          <MaterialIcons
                            name={
                              request
                                .urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={16}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.urgencyBadgeText
                            }
                          >
                            {request
                              .urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.bloodTypeBadge
                          }
                        >
                          <MaterialIcons
                            name="bloodtype"
                            size={16}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.bloodTypeBadgeText
                            }
                          >
                            {request.blood_type}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.requestCardSubtitle
                        }
                      >
                        DONATION REQUEST
                      </Text>

                      <Text
                        style={
                          styles.requestFacility
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {request.facility_name}
                      </Text>

                      <Text
                        style={
                          styles.requestUnits
                        }
                      >
                        {request.units_needed}{' '}
                        {request
                          .units_needed ===
                        1
                          ? 'unit needed'
                          : 'units needed'}
                      </Text>

                      <View
                        style={
                          styles.cardDivider
                        }
                      />

                      <Text
                        style={
                          styles.infoSectionTitle
                        }
                      >
                        Request Information
                      </Text>

                      <View
                        style={
                          styles.detailRows
                        }
                      >
                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name="person-outline"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Requester
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.detailValue
                            }
                          >
                            {isInvitationMode
                              ? getRequesterName()
                              : 'Blood Requester'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name="bloodtype"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Blood Type
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.detailValueStrong
                            }
                          >
                            {request.blood_type}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name="medical-services"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Units Needed
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.detailValueStrong
                            }
                          >
                            {request.units_needed}{' '}
                            {request
                              .units_needed ===
                            1
                              ? 'unit'
                              : 'units'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name={
                                getFacilityIcon(
                                  request
                                ) as any
                              }
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Location
                            </Text>
                          </View>

                          <View
                            style={
                              styles.detailValueWrap
                            }
                          >
                            <Text
                              style={
                                styles.detailValueStrongRight
                              }
                            >
                              {request.facility_name}
                            </Text>

                            {request
                              .facility_address ? (
                              <Text
                                style={
                                  styles.detailValueSub
                                }
                              >
                                {request.facility_address}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View
                          style={
                            styles.detailRow
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name="warning-amber"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Urgency
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.detailValueStrong,

                              request
                                .urgency ===
                                'urgent' &&
                                styles.urgentValue,
                            ]}
                          >
                            {request
                              .urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailRowLast
                          }
                        >
                          <View
                            style={
                              styles.detailLabelGroup
                            }
                          >
                            <MaterialIcons
                              name="schedule"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.detailLabel
                              }
                            >
                              Needed By
                            </Text>
                          </View>

                          <View
                            style={
                              styles.detailValueWrap
                            }
                          >
                            <Text
                              style={
                                styles.detailValueStrongRight
                              }
                            >
                              {formatNeededBy(
                                request
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {request
                        .message
                        ?.trim() ? (
                        <View
                          style={
                            styles.requesterMessageBox
                          }
                        >
                          <View
                            style={
                              styles.messageBoxHeader
                            }
                          >
                            <MaterialIcons
                              name="chat-bubble-outline"
                              size={17}
                              color={
                                COLORS.redButton
                              }
                            />

                            <Text
                              style={
                                styles.messageBoxLabel
                              }
                            >
                              Message to Donors
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.messageBoxText
                            }
                          >
                            {request.message}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* ========================================
                        BLOOD MATCH STATUS
                    ======================================== */}

                    {isApprovedDonor() ? (
                      bloodTypeCompatible ? (
                        <View
                          style={
                            styles.matchCard
                          }
                        >
                          <View
                            style={
                              styles.matchIconWrap
                            }
                          >
                            <MaterialIcons
                              name="check-circle"
                              size={22}
                              color={
                                COLORS.green
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.matchCopy
                            }
                          >
                            <Text
                              style={
                                styles.matchTitle
                              }
                            >
                              Compatible Blood Type
                            </Text>

                            <Text
                              style={
                                styles.matchDescription
                              }
                            >
                              Your verified blood type is{' '}
                              <Text
                                style={
                                  styles.matchStrong
                                }
                              >
                                {donorApplication
                                  ?.blood_type}
                              </Text>
                              , which can donate to this {request.blood_type} request.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View
                          style={
                            styles.mismatchCard
                          }
                        >
                          <View
                            style={
                              styles.mismatchIconWrap
                            }
                          >
                            <MaterialIcons
                              name="block"
                              size={22}
                              color={
                                COLORS.redButton
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.matchCopy
                            }
                          >
                            <Text
                              style={
                                styles.mismatchTitle
                              }
                            >
                              Blood Type Not Compatible
                            </Text>

                            <Text
                              style={
                                styles.mismatchDescription
                              }
                            >
                              This request needs{' '}
                              <Text
                                style={
                                  styles.matchStrong
                                }
                              >
                                {request.blood_type}
                              </Text>
                              , and your verified blood type is{' '}
                              <Text
                                style={
                                  styles.matchStrong
                                }
                              >
                                {donorApplication
                                  ?.blood_type ||
                                  'unknown'}
                              </Text>
                              , which cannot donate to it. Compatible donors: {getCompatibleDonorLabel(request.blood_type)}.
                            </Text>
                          </View>
                        </View>
                      )
                    ) : null}

                    {/* ========================================
                        REQUEST CLOSED
                    ======================================== */}

                    {requestClosed ? (
                      <FadeInView
                        style={[
                          styles.closedRequestCard,

                          request?.status ===
                            'fulfilled' &&
                            styles.closedRequestCardFulfilled,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            request?.status ===
                            'fulfilled'
                              ? 'task-alt'
                              : 'block'
                          }
                          size={22}
                          color={
                            request?.status ===
                            'fulfilled'
                              ? COLORS.green
                              : COLORS.gray
                          }
                        />

                        <View
                          style={
                            styles.closedInvitationCopy
                          }
                        >
                          <Text
                            style={
                              styles.closedInvitationTitle
                            }
                          >
                            {request?.status ===
                            'fulfilled'
                              ? 'Request Fulfilled'
                              : request?.status ===
                                  'cancelled'
                                ? 'Request Cancelled'
                                : 'Request Closed'}
                          </Text>

                          <Text
                            style={
                              styles.closedInvitationDescription
                            }
                          >
                            {request?.status ===
                            'fulfilled'
                              ? 'The requester received the blood they needed. Thank you for helping.'
                              : 'This request is closed and no longer accepts offers.'}
                          </Text>
                        </View>
                      </FadeInView>
                    ) : null}

                    {/* ========================================
                        DIRECT INVITATION ACTIONS
                    ======================================== */}

                    {isInvitationMode &&
                    invitation ? (
                      <>
                        {invitation.status ===
                          'pending' &&
                        !requestClosed ? (
                          <>
                            <View
                              style={
                                styles.invitationDecisionCard
                              }
                            >
                              <MaterialIcons
                                name="info-outline"
                                size={20}
                                color={
                                  COLORS.redButton
                                }
                              />

                              <Text
                                style={
                                  styles.invitationDecisionText
                                }
                              >
                                Review the request details above carefully. Accept only if you are available and willing to coordinate with the requester.
                              </Text>
                            </View>

                            <View
                              style={
                                styles.invitationButtons
                              }
                            >
                              <TouchableOpacity
                                style={[
                                  styles.declineInvitationButton,

                                  (
                                    decliningInvitation ||
                                    acceptingInvitation
                                  ) &&
                                    styles.disabledButton,
                                ]}
                                disabled={
                                  decliningInvitation ||
                                  acceptingInvitation
                                }
                                activeOpacity={
                                  0.84
                                }
                                onPress={
                                  handleDeclineInvitationPress
                                }
                              >
                                <MaterialIcons
                                  name="close"
                                  size={20}
                                  color={
                                    COLORS.redButton
                                  }
                                />

                                <Text
                                  style={
                                    styles.declineInvitationText
                                  }
                                >
                                  {decliningInvitation
                                    ? 'Declining...'
                                    : 'Decline Request'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.acceptInvitationButton,

                                  (
                                    acceptingInvitation ||
                                    decliningInvitation ||
                                    !isApprovedDonor() ||
                                    !bloodTypeCompatible
                                  ) &&
                                    styles.disabledButton,
                                ]}
                                disabled={
                                  acceptingInvitation ||
                                  decliningInvitation ||
                                  !isApprovedDonor() ||
                                  !bloodTypeCompatible
                                }
                                activeOpacity={
                                  0.84
                                }
                                onPress={
                                  handleAcceptInvitationPress
                                }
                              >
                                <MaterialIcons
                                  name="check"
                                  size={20}
                                  color={
                                    COLORS.white
                                  }
                                />

                                <Text
                                  style={
                                    styles.acceptInvitationText
                                  }
                                >
                                  {acceptingInvitation
                                    ? 'Accepting...'
                                    : 'Accept Request'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : null}

                        {invitation.status ===
                        'accepted' ? (
                          <View
                            style={
                              styles.acceptedInvitationCard
                            }
                          >
                            <View
                              style={
                                styles.acceptedInvitationTop
                              }
                            >
                              <View
                                style={
                                  styles.acceptedInvitationIcon
                                }
                              >
                                <MaterialIcons
                                  name="check-circle"
                                  size={24}
                                  color={
                                    COLORS.green
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.acceptedInvitationCopy
                                }
                              >
                                <Text
                                  style={
                                    styles.acceptedInvitationTitle
                                  }
                                >
                                  Request Accepted
                                </Text>

                                <Text
                                  style={
                                    styles.acceptedInvitationDescription
                                  }
                                >
                                  You accepted this direct invitation. Continue to the coordination chat to arrange the donation.
                                </Text>
                              </View>
                            </View>

                            {donorResponse
                              ?.status ===
                              'accepted' ? (
                              <TouchableOpacity
                                style={
                                  styles.openChatButton
                                }
                                activeOpacity={
                                  0.85
                                }
                                onPress={
                                  handleOpenCoordination
                                }
                              >
                                <MaterialIcons
                                  name="chat-bubble-outline"
                                  size={20}
                                  color={
                                    COLORS.white
                                  }
                                />

                                <Text
                                  style={
                                    styles.openChatButtonText
                                  }
                                >
                                  Open Coordination
                                </Text>

                                <MaterialIcons
                                  name="arrow-forward"
                                  size={19}
                                  color={
                                    COLORS.white
                                  }
                                />
                              </TouchableOpacity>
                            ) : null}

                            {renderDonationStatus()}
                          </View>
                        ) : null}

                        {invitation.status ===
                        'declined' ? (
                          <View
                            style={
                              styles.closedInvitationCard
                            }
                          >
                            <MaterialIcons
                              name="cancel"
                              size={22}
                              color={
                                COLORS.gray
                              }
                            />

                            <View
                              style={
                                styles.closedInvitationCopy
                              }
                            >
                              <Text
                                style={
                                  styles.closedInvitationTitle
                                }
                              >
                                Request Declined
                              </Text>

                              <Text
                                style={
                                  styles.closedInvitationDescription
                                }
                              >
                                You declined this invitation. It is kept here as part of your invitation history.
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {invitation.status ===
                        'cancelled' ? (
                          <View
                            style={
                              styles.closedInvitationCard
                            }
                          >
                            <MaterialIcons
                              name="block"
                              size={22}
                              color={
                                COLORS.gray
                              }
                            />

                            <View
                              style={
                                styles.closedInvitationCopy
                              }
                            >
                              <Text
                                style={
                                  styles.closedInvitationTitle
                                }
                              >
                                Invitation Cancelled
                              </Text>

                              <Text
                                style={
                                  styles.closedInvitationDescription
                                }
                              >
                                This direct invitation is no longer active.
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {/* ====================================
                            NORMAL OFFER FLOW
                        ==================================== */}

                        {donorResponse &&
                        donorResponse.status !==
                          'withdrawn' ? (
                          <View
                            style={[
                              styles.responsePanel,

                              donorResponse
                                .status ===
                                'accepted' &&
                                styles.responsePanelAccepted,

                              donorResponse
                                .status ===
                                'pending' &&
                                styles.responsePanelPending,

                              donorResponse
                                .status ===
                                'rejected' &&
                                styles.responsePanelRejected,
                            ]}
                          >
                            <View
                              style={
                                styles.responsePanelTop
                              }
                            >
                              <View
                                style={[
                                  styles.responseIconWrap,

                                  {
                                    backgroundColor:
                                      `${getResponseStatusColor()}12`,
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name={
                                    getResponseIconName()
                                  }
                                  size={23}
                                  color={
                                    getResponseStatusColor()
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.responsePanelCopy
                                }
                              >
                                <View
                                  style={[
                                    styles.statusPill,

                                    {
                                      backgroundColor:
                                        `${getResponseStatusColor()}12`,
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.statusDot,

                                      {
                                        backgroundColor:
                                          getResponseStatusColor(),
                                      },
                                    ]}
                                  />

                                  <Text
                                    style={[
                                      styles.statusPillText,

                                      {
                                        color:
                                          getResponseStatusColor(),
                                      },
                                    ]}
                                  >
                                    {getResponseStatusLabel()}
                                  </Text>
                                </View>

                                <Text
                                  style={
                                    styles.responsePanelTitle
                                  }
                                >
                                  {donorResponse
                                    .status ===
                                  'accepted'
                                    ? 'Your Offer Was Accepted'
                                    : donorResponse
                                          .status ===
                                        'pending'
                                      ? 'You Responded to This Request'
                                      : 'Response Update'}
                                </Text>

                                <Text
                                  style={
                                    styles.responsePanelDescription
                                  }
                                >
                                  {getResponseSummary()}
                                </Text>
                              </View>
                            </View>

                            {donorResponse
                              .message
                              ?.trim() ? (
                              <View
                                style={
                                  styles.sentMessageCard
                                }
                              >
                                <Text
                                  style={
                                    styles.sentMessageLabel
                                  }
                                >
                                  YOUR MESSAGE
                                </Text>

                                <Text
                                  style={
                                    styles.sentMessageText
                                  }
                                >
                                  {donorResponse.message}
                                </Text>
                              </View>
                            ) : null}

                            {donorResponse
                              .status ===
                            'accepted' ? (
                              <TouchableOpacity
                                style={
                                  styles.openChatButton
                                }
                                activeOpacity={
                                  0.85
                                }
                                onPress={
                                  handleOpenCoordination
                                }
                              >
                                <MaterialIcons
                                  name="chat-bubble-outline"
                                  size={20}
                                  color={
                                    COLORS.white
                                  }
                                />

                                <Text
                                  style={
                                    styles.openChatButtonText
                                  }
                                >
                                  Open Chat
                                </Text>

                                <MaterialIcons
                                  name="arrow-forward"
                                  size={19}
                                  color={
                                    COLORS.white
                                  }
                                />
                              </TouchableOpacity>
                            ) : null}

                            {renderDonationStatus()}

                            {donorResponse
                              .status ===
                              'pending' &&
                            !requestClosed ? (
                              <TouchableOpacity
                                style={
                                  styles.withdrawButton
                                }
                                activeOpacity={
                                  0.82
                                }
                                disabled={
                                  withdrawing
                                }
                                onPress={
                                  handleWithdrawPress
                                }
                              >
                                <MaterialIcons
                                  name="undo"
                                  size={18}
                                  color={
                                    COLORS.redButton
                                  }
                                />

                                <Text
                                  style={
                                    styles.withdrawButtonText
                                  }
                                >
                                  {withdrawing
                                    ? 'Withdrawing...'
                                    : 'Withdraw Offer'}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : requestClosed ? null : isApprovedDonor() ? (
                          bloodTypeCompatible ? (
                            <>
                              <View
                                style={
                                  styles.eligibilityCard
                                }
                              >
                                <View
                                  style={
                                    styles.eligibilityIconWrap
                                  }
                                >
                                  <MaterialIcons
                                    name="verified"
                                    size={22}
                                    color={
                                      COLORS.green
                                    }
                                  />
                                </View>

                                <View
                                  style={
                                    styles.eligibilityCopy
                                  }
                                >
                                  <Text
                                    style={
                                      styles.eligibilityTitle
                                    }
                                  >
                                    You&apos;re a Verified Donor
                                  </Text>

                                  <Text
                                    style={
                                      styles.eligibilityText
                                    }
                                  >
                                    Your verified blood type is compatible with this request. Medical personnel will confirm your final eligibility before donation.
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={
                                  styles.offerSection
                                }
                              >
                                <Text
                                  style={
                                    styles.offerTitle
                                  }
                                >
                                  Message to Requester
                                </Text>

                                <Text
                                  style={
                                    styles.offerSubtitle
                                  }
                                >
                                  Optional — add a short note about your availability.
                                </Text>

                                <TextInput
                                  style={
                                    styles.messageInput
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
                                  placeholder="Example: I can donate this afternoon."
                                  placeholderTextColor={
                                    COLORS.lightMuted
                                  }
                                  textAlignVertical="top"
                                />

                                <Text
                                  style={
                                    styles.characterCount
                                  }
                                >
                                  {message.length}/250
                                </Text>

                                <TouchableOpacity
                                  style={[
                                    styles.offerButton,

                                    submitting &&
                                      styles.disabledButton,
                                  ]}
                                  disabled={
                                    submitting
                                  }
                                  activeOpacity={
                                    0.85
                                  }
                                  onPress={
                                    handleDonorActionPress
                                  }
                                >
                                  <MaterialIcons
                                    name="volunteer-activism"
                                    size={21}
                                    color={
                                      COLORS.white
                                    }
                                  />

                                  <Text
                                    style={
                                      styles.offerButtonText
                                    }
                                  >
                                    {submitting
                                      ? 'Sending Offer...'
                                      : 'Offer to Donate'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          ) : null
                        ) : (
                          <>
                            <View
                              style={
                                styles.donorGateCard
                              }
                            >
                              <View
                                style={[
                                  styles.donorGateIcon,

                                  {
                                    backgroundColor:
                                      `${getDonorApplicationColor()}12`,
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name={
                                    getDonorApplicationIcon()
                                  }
                                  size={25}
                                  color={
                                    getDonorApplicationColor()
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.donorGateCopy
                                }
                              >
                                <Text
                                  style={
                                    styles.donorGateTitle
                                  }
                                >
                                  {getDonorApplicationTitle()}
                                </Text>

                                <Text
                                  style={
                                    styles.donorGateDescription
                                  }
                                >
                                  {getDonorApplicationDescription()}
                                </Text>

                                {donorApplication ? (
                                  <View
                                    style={[
                                      styles.donorStatusPill,

                                      {
                                        backgroundColor:
                                          `${getDonorApplicationColor()}10`,
                                      },
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.donorStatusDot,

                                        {
                                          backgroundColor:
                                            getDonorApplicationColor(),
                                        },
                                      ]}
                                    />

                                    <Text
                                      style={[
                                        styles.donorStatusText,

                                        {
                                          color:
                                            getDonorApplicationColor(),
                                        },
                                      ]}
                                    >
                                      {donorApplication
                                        .status
                                        .charAt(0)
                                        .toUpperCase() +
                                        donorApplication
                                          .status
                                          .slice(1)}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.donorActionButton,

                                donorApplication
                                  ?.status ===
                                  'pending' &&
                                  styles.donorActionButtonDisabled,
                              ]}
                              disabled={
                                donorApplication
                                  ?.status ===
                                'pending'
                              }
                              activeOpacity={
                                0.85
                              }
                              onPress={
                                handleDonorActionPress
                              }
                            >
                              <MaterialIcons
                                name={
                                  donorApplication
                                    ?.status ===
                                  'pending'
                                    ? 'schedule'
                                    : 'how-to-reg'
                                }
                                size={21}
                                color={
                                  donorApplication
                                    ?.status ===
                                  'pending'
                                    ? COLORS.muted
                                    : COLORS.white
                                }
                              />

                              <Text
                                style={[
                                  styles.donorActionButtonText,

                                  donorApplication
                                    ?.status ===
                                    'pending' &&
                                    styles.donorActionButtonTextDisabled,
                                ]}
                              >
                                {getDonorActionLabel()}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </>
                    )}

                    {/* ========================================
                        PRIVACY
                    ======================================== */}

                    <View
                      style={
                        styles.privacyNote
                      }
                    >
                      <MaterialIcons
                        name="shield"
                        size={18}
                        color={
                          COLORS.green
                        }
                      />

                      <Text
                        style={
                          styles.privacyText
                        }
                      >
                        Personal contact details stay private. Accepted donors and requesters coordinate securely through Hemo-Hero.
                      </Text>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>

        {/* ====================================================
            RATE THE DONATION / REPORT A PROBLEM
        ==================================================== */}

        <DonationFeedbackModal
          visible={Boolean(
            donationDialog
          )}
          mode={
            donationDialog ||
            'feedback'
          }
          title={
            donationDialog ===
            'dispute'
              ? 'Report a Problem'
              : getFeedbackFrom(
                    myDonation,
                    'donor'
                  )
                ? 'Update Your Feedback'
                : 'Rate Your Experience'
          }
          subtitle={
            donationDialog ===
            'dispute'
              ? 'Tell us what is wrong with this donation record. Hemo-Hero will review it.'
              : `How was your experience with ${
                  myDonation?.requester_name ||
                  'the requester'
                }? They will see your feedback.`
          }
          initialRating={
            getFeedbackFrom(
              myDonation,
              'donor'
            )?.rating || 0
          }
          initialComment={
            donationDialog ===
            'dispute'
              ? ''
              : getFeedbackFrom(
                  myDonation,
                  'donor'
                )?.comment || ''
          }
          quickNotes={
            REQUESTER_FEEDBACK_NOTES
          }
          onClose={() =>
            setDonationDialog(
              null
            )
          }
          onSubmit={
            submitDonationDialog
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
                {actionPopup.title}
              </Text>

              <Text
                style={
                  styles.actionPopupMessage
                }
              >
                {actionPopup.message}
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
                      {actionPopup.cancelText}
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
                    {actionPopup.confirmText}
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
          : COLORS.pageBottom,
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
        COLORS.pageBottom,
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
      height: 118,

      paddingHorizontal:
        21,

      paddingTop:
        Platform.OS ===
        'web'
          ? 18
          : 11,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        175,

      height:
        175,

      borderRadius:
        88,

      left:
        -112,

      top:
        -80,

      backgroundColor:
        'rgba(255,255,255,0.065)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        190,

      height:
        190,

      borderRadius:
        95,

      right:
        -105,

      top:
        -98,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    backButton: {
      width:
        43,

      height:
        43,

      marginRight:
        13,

      borderRadius:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1.3,

      borderColor:
        'rgba(255,255,255,0.86)',

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },

    headerCopy: {
      flex: 1,

      paddingTop:
        2,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        21,

      lineHeight:
        27,
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

    // ========================================================
    // BODY
    // ========================================================

    body: {
      flex: 1,

      paddingHorizontal:
        14,

      paddingBottom:
        14,
    },

    contentShell: {
      flex: 1,

      marginTop:
        -12,

      borderRadius:
        29,

      overflow:
        'hidden',

      backgroundColor:
        '#F8F8F8',
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        17,

      paddingTop:
        20,

      paddingBottom:
        34,
    },

    // ========================================================
    // LOADING / ERROR
    // ========================================================

    centerState: {
      minHeight:
        530,

      paddingHorizontal:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    centerIconWrap: {
      width:
        58,

      height:
        58,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pink,
    },

    centerTitle: {
      marginTop:
        14,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,
    },

    centerDescription: {
      marginTop:
        6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    retryButton: {
      height:
        44,

      marginTop:
        18,

      paddingHorizontal:
        18,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.redButton,
    },

    retryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    // ========================================================
    // DIRECT INVITATION
    // ========================================================

    directInvitationCard: {
      marginBottom:
        14,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        '#E8C4C4',

      borderRadius:
        17,

      backgroundColor:
        '#FFF7F7',
    },

    directInvitationTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    directInvitationIcon: {
      width:
        43,

      height:
        43,

      marginRight:
        10,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkStrong,
    },

    directInvitationCopy: {
      flex: 1,
    },

    directInvitationEyebrow: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11,

      letterSpacing:
        0.8,
    },

    directInvitationTitle: {
      marginTop:
        4,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,

      lineHeight:
        20,
    },

    directInvitationDescription: {
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
    },

    invitationStatusRow: {
      marginTop:
        12,

      flexDirection:
        'row',
    },

    invitationStatusBadge: {
      minHeight:
        28,

      paddingHorizontal:
        9,

      borderRadius:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    invitationStatusText: {
      fontFamily:
        'Inter_700Bold',

      fontSize:
        11.5,
    },

    invitationMessage: {
      marginTop:
        10,

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
        COLORS.white,
    },

    invitationMessageText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    // ========================================================
    // REQUEST CARD
    // ========================================================

    requestCard: {
      paddingHorizontal:
        17,

      paddingTop:
        18,

      paddingBottom:
        18,

      marginBottom:
        14,

      borderRadius:
        22,

      borderWidth:
        1,

      borderColor:
        '#E5DEDE',

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOpacity:
        0.08,

      shadowRadius:
        10,

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      elevation:
        3,
    },

    badgeArea: {
      flexDirection:
        'row',

      justifyContent:
        'center',

      gap:
        8,

      marginBottom:
        11,
    },

    urgencyBadge: {
      minHeight:
        36,

      paddingHorizontal:
        12,

      borderRadius:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      backgroundColor:
        COLORS.redButton,
    },

    urgencyBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11.5,
    },

    bloodTypeBadge: {
      minHeight:
        36,

      paddingHorizontal:
        12,

      borderRadius:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      backgroundColor:
        COLORS.redDark,
    },

    bloodTypeBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        13,
    },

    requestCardSubtitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11,

      letterSpacing:
        0.9,

      textAlign:
        'center',
    },

    requestFacility: {
      marginTop:
        5,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        17,

      lineHeight:
        22,

      textAlign:
        'center',
    },

    requestUnits: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      textAlign:
        'center',
    },

    cardDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginTop:
        17,

      marginBottom:
        15,

      backgroundColor:
        COLORS.border,
    },

    infoSectionTitle: {
      marginBottom:
        5,

      color:
        '#474747',

      fontFamily:
        'Inter_700Bold',

      fontSize:
        12,
    },

    detailRows: {
      marginTop:
        2,
    },

    detailRow: {
      minHeight:
        52,

      paddingVertical:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#EFEAEA',
    },

    detailRowLast: {
      minHeight:
        52,

      paddingVertical:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    detailLabelGroup: {
      width:
        '43%',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,
    },

    detailLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,
    },

    detailValue: {
      maxWidth:
        '54%',

      color:
        '#404040',

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13,

      textAlign:
        'right',
    },

    detailValueStrong: {
      maxWidth:
        '54%',

      color:
        COLORS.black,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        13,

      textAlign:
        'right',
    },

    detailValueWrap: {
      width:
        '54%',

      alignItems:
        'flex-end',
    },

    detailValueStrongRight: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        13,

      lineHeight:
        18,

      textAlign:
        'right',
    },

    detailValueSub: {
      marginTop:
        2,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,

      lineHeight:
        16,

      textAlign:
        'right',
    },

    urgentValue: {
      color:
        COLORS.redButton,
    },

    requesterMessageBox: {
      marginTop:
        14,

      padding:
        13,

      borderRadius:
        13,

      backgroundColor:
        COLORS.pink,
    },

    messageBoxHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    messageBoxLabel: {
      color:
        '#4A4A4A',

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11.5,
    },

    messageBoxText: {
      marginTop:
        7,

      color:
        '#444444',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13,

      lineHeight:
        19,
    },

    // ========================================================
    // BLOOD MATCH
    // ========================================================

    matchCard: {
      marginTop:
        2,

      marginBottom:
        14,

      padding:
        13,

      borderWidth:
        1,

      borderColor:
        '#BFE2CC',

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      backgroundColor:
        COLORS.greenLight,
    },

    matchIconWrap: {
      width:
        39,

      height:
        39,

      marginRight:
        10,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    mismatchCard: {
      marginTop:
        2,

      marginBottom:
        14,

      padding:
        13,

      borderWidth:
        1,

      borderColor:
        '#E9C4C4',

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      backgroundColor:
        '#FFF5F5',
    },

    mismatchIconWrap: {
      width:
        39,

      height:
        39,

      marginRight:
        10,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    matchCopy: {
      flex: 1,
    },

    matchTitle: {
      color:
        COLORS.greenDark,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    mismatchTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    matchDescription: {
      marginTop:
        3,

      color:
        '#557565',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    mismatchDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    matchStrong: {
      fontFamily:
        'Inter_700Bold',
    },

    // ========================================================
    // INVITATION DECISION
    // ========================================================

    invitationDecisionCard: {
      marginBottom:
        11,

      padding:
        12,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        '#E8D4D4',

      backgroundColor:
        '#FFF9F9',
    },

    invitationDecisionText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    invitationButtons: {
      flexDirection:
        'row',

      gap:
        9,

      marginBottom:
        14,
    },

    declineInvitationButton: {
      flex:
        1,

      height:
        49,

      borderWidth:
        1.2,

      borderColor:
        COLORS.redButton,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      backgroundColor:
        COLORS.white,
    },

    declineInvitationText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    acceptInvitationButton: {
      flex:
        1.15,

      height:
        49,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      backgroundColor:
        COLORS.green,
    },

    acceptInvitationText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    acceptedInvitationCard: {
      marginBottom:
        14,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#BFE2CC',

      borderRadius:
        16,

      backgroundColor:
        COLORS.greenLight,
    },

    acceptedInvitationTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    acceptedInvitationIcon: {
      width:
        43,

      height:
        43,

      marginRight:
        10,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    acceptedInvitationCopy: {
      flex: 1,
    },

    acceptedInvitationTitle: {
      color:
        COLORS.greenDark,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    acceptedInvitationDescription: {
      marginTop:
        3,

      color:
        '#557565',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    closedInvitationCard: {
      marginBottom:
        14,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#DEDEDE',

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        10,

      backgroundColor:
        COLORS.grayLight,
    },

    closedRequestCard: {
      marginBottom: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: '#DEDEDE',
      borderRadius: 15,
      backgroundColor: COLORS.grayLight,
    },

    closedRequestCardFulfilled: {
      borderColor: '#CBE8D6',
      backgroundColor: COLORS.greenLight,
    },

    closedInvitationCopy: {
      flex: 1,
    },

    closedInvitationTitle: {
      color:
        '#555555',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    closedInvitationDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    // ========================================================
    // RESPONSE PANEL
    // ========================================================

    responsePanel: {
      marginTop:
        2,

      marginBottom:
        14,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    responsePanelAccepted: {
      borderColor:
        '#BFE2CC',

      backgroundColor:
        COLORS.greenLight,
    },

    responsePanelPending: {
      borderColor:
        '#EED5B4',

      backgroundColor:
        '#FFF9F0',
    },

    responsePanelRejected: {
      borderColor:
        '#E9CACA',

      backgroundColor:
        '#FFF6F6',
    },

    responsePanelTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    responseIconWrap: {
      width:
        43,

      height:
        43,

      marginRight:
        10,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    responsePanelCopy: {
      flex: 1,
    },

    statusPill: {
      alignSelf:
        'flex-start',

      minHeight:
        25,

      paddingHorizontal:
        9,

      borderRadius:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    statusDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    statusPillText: {
      fontFamily:
        'Inter_700Bold',

      fontSize:
        11.5,
    },

    responsePanelTitle: {
      marginTop:
        8,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,

      lineHeight:
        20,
    },

    responsePanelDescription: {
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
    },

    sentMessageCard: {
      marginTop:
        12,

      padding:
        11,

      borderRadius:
        10,

      backgroundColor:
        'rgba(255,255,255,0.72)',
    },

    sentMessageLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_700Bold',

      fontSize:
        11,

      letterSpacing:
        0.6,
    },

    sentMessageText: {
      marginTop:
        4,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13,

      lineHeight:
        19,
    },

    openChatButton: {
      height:
        48,

      marginTop:
        14,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.green,
    },

    openChatButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    // Donation record status (accepted offer)
    donationStatusCard: {
      marginTop: 12,

      paddingHorizontal: 12,
      paddingVertical: 11,

      flexDirection: 'row',
      alignItems: 'flex-start',

      gap: 9,

      borderRadius: 12,
    },

    donationStatusCopy: {
      flex: 1,

      minWidth: 0,
    },

    donationStatusTitle: {
      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,

      lineHeight: 18,
    },

    donationStatusText: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    // Transaction feedback
    starRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
    },

    feedbackReceived: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
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
      height: 44,
      marginTop: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: '#FFF8F8',
    },

    rateButton: {
      height: 46,
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: COLORS.orange,
      backgroundColor: COLORS.orangeLight,
    },

    rateButtonText: {
      color: COLORS.orange,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
    },

    reportLink: {
      alignSelf: 'center',
      marginTop: 12,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    reportLinkText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    reportLinkStrong: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
    },

    withdrawButton: {
      height:
        44,

      marginTop:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.redButton,

      borderRadius:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      backgroundColor:
        COLORS.white,
    },

    withdrawButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    // ========================================================
    // ELIGIBILITY / OFFER
    // ========================================================

    eligibilityCard: {
      marginTop:
        2,

      marginBottom:
        14,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#C5E4D0',

      borderRadius:
        15,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      backgroundColor:
        COLORS.greenLight,
    },

    eligibilityIconWrap: {
      width:
        40,

      height:
        40,

      marginRight:
        10,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    eligibilityCopy: {
      flex: 1,
    },

    eligibilityTitle: {
      color:
        COLORS.greenDark,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    eligibilityText: {
      marginTop:
        3,

      color:
        '#557565',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    offerSection: {
      marginBottom:
        14,
    },

    offerTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    offerSubtitle: {
      marginTop:
        2,

      marginBottom:
        9,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    messageInput: {
      minHeight:
        98,

      paddingHorizontal:
        13,

      paddingVertical:
        12,

      borderWidth:
        1,

      borderColor:
        '#D9D3D3',

      borderRadius:
        12,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      lineHeight:
        19,

      backgroundColor:
        COLORS.white,
    },

    characterCount: {
      marginTop:
        5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11,

      textAlign:
        'right',
    },

    offerButton: {
      height:
        50,

      marginTop:
        12,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.green,
    },

    offerButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    disabledButton: {
      opacity:
        0.5,
    },

    // ========================================================
    // DONOR GATE
    // ========================================================

    donorGateCard: {
      marginTop:
        2,

      marginBottom:
        12,

      padding:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      backgroundColor:
        COLORS.white,
    },

    donorGateIcon: {
      width:
        46,

      height:
        46,

      marginRight:
        11,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    donorGateCopy: {
      flex: 1,
    },

    donorGateTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    donorGateDescription: {
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
    },

    donorStatusPill: {
      alignSelf:
        'flex-start',

      minHeight:
        25,

      marginTop:
        8,

      paddingHorizontal:
        8,

      borderRadius:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    donorStatusDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    donorStatusText: {
      fontFamily:
        'Inter_700Bold',

      fontSize:
        11.5,
    },

    donorActionButton: {
      height:
        49,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.redButton,
    },

    donorActionButtonDisabled: {
      backgroundColor:
        '#E6E6E6',
    },

    donorActionButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    donorActionButtonTextDisabled: {
      color:
        COLORS.muted,
    },

    // ========================================================
    // PRIVACY
    // ========================================================

    privacyNote: {
      minHeight:
        59,

      marginTop:
        15,

      padding:
        11,

      borderWidth:
        1,

      borderColor:
        '#D0E6D8',

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      backgroundColor:
        '#F5FBF7',
    },

    privacyText: {
      flex:
        1,

      color:
        '#587160',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
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
        COLORS.pink,
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
        COLORS.pinkStrong,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,

      lineHeight:
        21,

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
        '#E2CACA',

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
        13.5,
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
        13.5,
    },
  });