import { useCallback, useState } from 'react';

import {
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
          setLoading(true);
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
          setLoadingResponses(
            true
          );

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

  useFocusEffect(
    useCallback(
      () => {
        loadRequest();
        loadDonorResponses();
      },
      [
        loadRequest,
        loadDonorResponses,
      ]
    )
  );

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

    confirmAction(
      'Mark Request as Fulfilled',

      'Only continue if the needed blood has already been secured or the donation process has been completed. This will close the active request.',

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
              COLORS.pageTop,
              COLORS.pageBottom,
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
                  </View>
                ) : request ? (
                  <>
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
                            {donorResponseCounts.accepted}{' '}
                            {donorResponseCounts.accepted ===
                            1
                              ? 'Donor Accepted'
                              : 'Donors Accepted'}
                          </Text>

                          <Text
                            style={
                              styles.completionDescription
                            }
                          >
                            Coordinate with your accepted donor before completing the request.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.fulfillButton,

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
                        title="Donor Matching"
                        description={
                          donorResponseCounts.accepted >
                          0
                            ? `${donorResponseCounts.accepted} donor ${
                                donorResponseCounts.accepted ===
                                1
                                  ? 'has'
                                  : 'have'
                              } been accepted.`
                            : 'Waiting for a compatible donor.'
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
                          false
                        }
                        title="Fulfilled"
                        description={
                          request.status ===
                          'fulfilled'
                            ? 'The blood request has been completed.'
                            : 'Complete the donation process before marking fulfilled.'
                        }
                        last
                      />
                    </View>

                    {request.status ===
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
                  </>
                ) : null}
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>

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
      flex:
        1,

      backgroundColor:
        COLORS.red,
    },

    header: {
      height:
        112,

      paddingHorizontal:
        22,

      paddingTop:
        Platform.OS ===
        'web'
          ? 18
          : 8,

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
        10,
    },

    body: {
      flex:
        1,

      paddingHorizontal:
        16,

      paddingBottom:
        14,
    },

    mainCard: {
      flex:
        1,

      marginTop:
        -10,

      overflow:
        'hidden',

      borderRadius:
        28,

      backgroundColor:
        COLORS.white,
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
        10,

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
        9,

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
        9,
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
        8,
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
        8.5,
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
        10,
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
        9,
    },

    infoTitle: {
      marginTop:
        3,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    infoDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,
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
        12,
    },

    emptyText: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,

      textAlign:
        'center',

      lineHeight:
        14,
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
        12,
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
        11.5,
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
        8,
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
        7.5,
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
        7.5,
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
        9.5,

      lineHeight:
        14,
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
        9.5,
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
        9.5,
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
        8.5,
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
        9.5,
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
        12,
    },

    completionDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,

      lineHeight:
        14,
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
        9.5,
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
        11,
    },

    progressDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,

      lineHeight:
        14,
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
        10.5,
    },

    cancelHint: {
      marginTop:
        7,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.5,

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
        10.5,
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
        10.8,

      lineHeight:
        17,

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
        10,
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
        10,
    },
  });