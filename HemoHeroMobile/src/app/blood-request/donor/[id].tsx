import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  getAccessToken,
} from '../../../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red:
    '#DB0A0A',

  redDark:
    '#8F1111',

  redButton:
    '#B42323',

  white:
    '#FFFFFF',

  black:
    '#181818',

  pageTop:
    '#F2B3B5',

  pageBottom:
    '#D71318',

  muted:
    '#676767',

  lightMuted:
    '#969696',

  border:
    '#ECE2E2',

  pink:
    '#FFF2F2',

  green:
    '#198754',

  orange:
    '#DF721D',

  gray:
    '#A7A7A7',
};

// ============================================================
// SCREEN
// ============================================================

export default function DonorBloodRequestScreen() {
  const params =
    useLocalSearchParams<{
      id?:
        | string
        | string[];
    }>();

  const requestId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    request,
    setRequest,
  ] =
    useState<DonorBloodRequest | null>(
      null
    );

  const [
    donorResponse,
    setDonorResponse,
  ] =
    useState<DonorResponse | null>(
      null
    );

  const [
    donorApplication,
    setDonorApplication,
  ] =
    useState<DonorApplication | null>(
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

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setErrorMessage(
            ''
          );

          const token =
            await getAccessToken();

          if (!token) {
            router.replace(
              '/'
            );

            return;
          }

          const [
            requestData,
            responseData,
            donorApplicationData,
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
            ]);

          if (
            !requestData
              ?.request
          ) {
            throw new Error(
              'Blood request could not be found.'
            );
          }

          setRequest(
            requestData
              .request
          );

          setDonorResponse(
            responseData
              ?.response ||
              null
          );

          setDonorApplication(
            donorApplicationData
              ?.application ||
              null
          );

          if (
            responseData
              ?.response
              ?.message
          ) {
            setMessage(
              responseData
                .response
                .message
            );
          }
        } catch (
          error
        ) {
          console.log(
            'DONOR REQUEST LOAD ERROR:',
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'Unable to load this blood request.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [requestId]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadData();
      },
      [loadData]
    )
  );

  // ==========================================================
  // HELPERS
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

  // ==========================================================
  // FACILITY TYPE
  // ==========================================================

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

      case 'hospital':
      default:
        return 'local-hospital';
    }
  }

  // ==========================================================
  // NEEDED BY
  // ==========================================================

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
  // MESSAGE HELPER
  // ==========================================================

  function showMessage(
    title: string,
    description: string
  ) {
    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      window.alert(
        `${title}\n\n${description}`
      );

      return;
    }

    Alert.alert(
      title,
      description
    );
  }

  // ==========================================================
  // RESPONSE STATUS
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
        return 'Response Sent';

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

  // ==========================================================
  // DONOR APPLICATION STATUS
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
      return 'You need to register and be approved as a donor before you can offer to donate blood.';
    }

    switch (
      donorApplication.status
    ) {
      case 'pending':
        return 'Your donor application is currently being reviewed. You can offer to donate once your application has been approved.';

      case 'approved':
        return 'Your donor account is verified. You can offer to donate for this blood request.';

      case 'rejected':
        return 'Your previous donor application was not approved. You can review your information and apply again.';

      case 'withdrawn':
        return 'You previously withdrew your donor application. You can apply again whenever you are ready.';

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
        return 'Reapply as a Donor';

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
  // DONOR ACTION
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
  // OFFER TO DONATE
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
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          'Offer to Donate\n\nYour offer will be sent to the requester. The donation facility must still verify your eligibility and blood compatibility before donation.'
        );

      if (
        confirmed
      ) {
        submitResponse();
      }

      return;
    }

    Alert.alert(
      'Offer to Donate',
      'Your offer will be sent to the requester. The donation facility must still verify your eligibility and blood compatibility before donation.',
      [
        {
          text:
            'Not Now',

          style:
            'cancel',
        },

        {
          text:
            'Send Offer',

          onPress:
            submitResponse,
        },
      ]
    );
  }

  // ==========================================================
  // SUBMIT DONOR RESPONSE
  // ==========================================================

  async function submitResponse() {
    if (
      !request ||
      !requestId ||
      submitting ||
      !isApprovedDonor()
    ) {
      return;
    }

    try {
      setSubmitting(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          '/'
        );

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
    } catch (
      error
    ) {
      console.log(
        'DONOR RESPONSE ERROR:',
        error
      );

      showMessage(
        'Unable to Send Offer',
        error instanceof
          Error
          ? error.message
          : 'Unable to send your donor offer.'
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ==========================================================
  // WITHDRAW
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

    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          'Withdraw Donor Response\n\nYour response will no longer be considered for this request.'
        );

      if (
        confirmed
      ) {
        withdrawResponse();
      }

      return;
    }

    Alert.alert(
      'Withdraw Donor Response',
      'Your response will no longer be considered for this request.',
      [
        {
          text:
            'Keep Response',

          style:
            'cancel',
        },

        {
          text:
            'Withdraw',

          style:
            'destructive',

          onPress:
            withdrawResponse,
        },
      ]
    );
  }

  async function withdrawResponse() {
    if (
      !requestId ||
      withdrawing
    ) {
      return;
    }

    try {
      setWithdrawing(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          '/'
        );

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
    } catch (
      error
    ) {
      console.log(
        'WITHDRAW RESPONSE ERROR:',
        error
      );

      showMessage(
        'Unable to Withdraw Response',
        error instanceof
          Error
          ? error.message
          : 'Unable to withdraw your donor response.'
      );
    } finally {
      setWithdrawing(
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

          {/* HEADER */}

          <LinearGradient
            colors={[
              '#D3191E',
              COLORS.redDark,
            ]}
            style={
              styles.header
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
                Blood Request
              </Text>

              {request ? (
                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Request #
                  {getRequestNumber(
                    request.id
                  )}
                </Text>
              ) : null}
            </View>
          </LinearGradient>

          {/* BODY */}

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
              >
                {loading ? (
                  <View
                    style={
                      styles.centerState
                    }
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={42}
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
                      size={42}
                      color={
                        COLORS.redButton
                      }
                    />

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
                      {
                        errorMessage
                      }
                    </Text>
                  </View>
                ) : request ? (
                  <>
                    {/* SUMMARY */}

                    <View
                      style={
                        styles.summaryCard
                      }
                    >
                      <View
                        style={
                          styles.bloodBadge
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

                        <Text
                          style={
                            styles.bloodLabel
                          }
                        >
                          Blood Type
                        </Text>
                      </View>

                      <View
                        style={
                          styles.summaryInfo
                        }
                      >
                        <Text
                          style={
                            styles.summaryTitle
                          }
                        >
                          Blood Donation Request
                        </Text>

                        <Text
                          style={
                            styles.summaryUnits
                          }
                        >
                          {
                            request.units_needed
                          }{' '}
                          {request.units_needed ===
                          1
                            ? 'unit / bag needed'
                            : 'units / bags needed'}
                        </Text>

                        <View
                          style={
                            request.urgency ===
                            'urgent'
                              ? styles.urgentPill
                              : styles.neededPill
                          }
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
                                : COLORS.orange
                            }
                          />

                          <Text
                            style={
                              request.urgency ===
                              'urgent'
                                ? styles.urgentPillText
                                : styles.neededPillText
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

                    {/* DETAILS */}

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
                            name={
                              getFacilityIcon(
                                request
                              ) as any
                            }
                            size={22}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoContent
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

                          {request.facility_address ? (
                            <Text
                              style={
                                styles.infoSubtitle
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
                          styles.divider
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
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'event'
                            }
                            size={22}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.infoContent
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

                    {/* REQUESTER MESSAGE */}

                    {request.message?.trim() ? (
                      <>
                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Message from Requester
                        </Text>

                        <View
                          style={
                            styles.messageCard
                          }
                        >
                          <MaterialIcons
                            name="chat-bubble-outline"
                            size={20}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.messageText
                            }
                          >
                            {
                              request.message
                            }
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {/* PRIVACY */}

                    <View
                      style={
                        styles.privacyCard
                      }
                    >
                      <MaterialIcons
                        name="verified-user"
                        size={21}
                        color={
                          COLORS.green
                        }
                      />

                      <Text
                        style={
                          styles.privacyText
                        }
                      >
                        Personal contact details are kept private. Donation coordination should happen through Hemo-Hero and the selected medical facility.
                      </Text>
                    </View>

                    {/* ==================================================
                        EXISTING RESPONSE
                    ================================================== */}

                    {donorResponse &&
                    donorResponse.status !==
                      'withdrawn' ? (
                      <>
                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Your Response
                        </Text>

                        <View
                          style={
                            styles.responseCard
                          }
                        >
                          <View
                            style={[
                              styles.responseStatus,

                              {
                                backgroundColor:
                                  getResponseStatusColor(),
                              },
                            ]}
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
                                styles.responseStatusText
                              }
                            >
                              {getResponseStatusLabel()}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.responseDescription
                            }
                          >
                            {donorResponse.status ===
                            'pending'
                              ? 'The requester can now review your donor response.'
                              : donorResponse.status ===
                                  'accepted'
                                ? 'The requester has accepted your donor response.'
                                : 'The requester selected another donor.'}
                          </Text>

                          {donorResponse.status ===
                          'pending' ? (
                            <TouchableOpacity
                              style={
                                styles.withdrawButton
                              }
                              disabled={
                                withdrawing
                              }
                              onPress={
                                handleWithdrawPress
                              }
                            >
                              <Text
                                style={
                                  styles.withdrawButtonText
                                }
                              >
                                {withdrawing
                                  ? 'Withdrawing...'
                                  : 'Withdraw Response'}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </>
                    ) : isApprovedDonor() ? (
                      <>
                        {/* ==================================================
                            APPROVED DONOR
                        ================================================== */}

                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Message to Requester
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
                          placeholder="Optional message"
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
                          {
                            message.length
                          }
                          /250
                        </Text>

                        {/* DONATION SAFETY */}

                        <View
                          style={
                            styles.safetyNote
                          }
                        >
                          <MaterialIcons
                            name="info-outline"
                            size={19}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.safetyText
                            }
                          >
                            Offering to donate does not confirm medical eligibility. Blood type compatibility and donor eligibility must still be verified by qualified medical personnel.
                          </Text>
                        </View>

                        {/* OFFER */}

                        <TouchableOpacity
                          style={[
                            styles.respondButton,

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
                              styles.respondButtonText
                            }
                          >
                            {submitting
                              ? 'Sending Offer...'
                              : 'Offer to Donate'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {/* ==================================================
                            DONOR APPLICATION GATE
                        ================================================== */}

                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Donor Status
                        </Text>

                        <View
                          style={
                            styles.donorGateCard
                          }
                        >
                          <View
                            style={
                              styles.donorGateHeader
                            }
                          >
                            <View
                              style={[
                                styles.donorGateIcon,

                                {
                                  backgroundColor:
                                    `${getDonorApplicationColor()}15`,
                                },
                              ]}
                            >
                              <MaterialIcons
                                name={
                                  getDonorApplicationIcon() as any
                                }
                                size={24}
                                color={
                                  getDonorApplicationColor()
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.donorGateContent
                              }
                            >
                              <Text
                                style={
                                  styles.donorGateTitle
                                }
                              >
                                {getDonorApplicationTitle()}
                              </Text>

                              {donorApplication ? (
                                <View
                                  style={[
                                    styles.donorStatusBadge,

                                    {
                                      borderColor:
                                        getDonorApplicationColor(),

                                      backgroundColor:
                                        `${getDonorApplicationColor()}10`,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.donorStatusBadgeText,

                                      {
                                        color:
                                          getDonorApplicationColor(),
                                      },
                                    ]}
                                  >
                                    {donorApplication.status
                                      .charAt(0)
                                      .toUpperCase() +
                                      donorApplication.status.slice(
                                        1
                                      )}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          <Text
                            style={
                              styles.donorGateDescription
                            }
                          >
                            {getDonorApplicationDescription()}
                          </Text>
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
                            size={20}
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
                ) : null}
              </ScrollView>
            </View>
          </LinearGradient>
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
          : COLORS.pageBottom,
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
        COLORS.red,
    },

    header: {
      height: 108,

      paddingHorizontal: 22,
      paddingTop: 13,

      flexDirection: 'row',
      alignItems: 'flex-start',

      backgroundColor:
        COLORS.red,
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 13,

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    headerText: {
      flex: 1,

      paddingTop: 1,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,
    },

    headerSubtitle: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.78)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    body: {
      flex: 1,

      paddingHorizontal: 16,
      paddingBottom: 14,
    },

    mainCard: {
      flex: 1,

      marginTop: -10,

      borderRadius: 28,

      overflow: 'hidden',

      backgroundColor:
        COLORS.white,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 30,
    },

    centerState: {
      minHeight: 520,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 30,
    },

    centerTitle: {
      marginTop: 12,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 15,
    },

    centerDescription: {
      marginTop: 5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,

      lineHeight: 16,

      textAlign: 'center',
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      padding: 16,

      marginBottom: 24,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        '#E6CACA',

      borderRadius: 18,

      backgroundColor:
        COLORS.pink,
    },

    bloodBadge: {
      width: 76,
      height: 76,

      borderRadius: 22,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 14,

      backgroundColor:
        COLORS.redButton,
    },

    bloodType: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 23,

      lineHeight: 27,
    },

    bloodLabel: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.8)',

      fontFamily:
        'Inter_500Medium',

      fontSize: 8,
    },

    summaryInfo: {
      flex: 1,
    },

    summaryTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,

      lineHeight: 19,
    },

    summaryUnits: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,
    },

    urgentPill: {
      alignSelf:
        'flex-start',

      marginTop: 9,

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 10,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 3,

      backgroundColor:
        COLORS.redButton,
    },

    neededPill: {
      alignSelf:
        'flex-start',

      marginTop: 9,

      paddingHorizontal: 9,
      paddingVertical: 5,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        '#ECCEA8',

      flexDirection: 'row',
      alignItems: 'center',

      gap: 3,

      backgroundColor:
        '#FFF8EE',
    },

    urgentPillText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    neededPillText: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    // ========================================================
    // SECTIONS
    // ========================================================

    sectionTitle: {
      marginBottom: 9,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },

    infoGroup: {
      marginBottom: 23,

      paddingHorizontal: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.white,
    },

    infoRow: {
      minHeight: 86,

      paddingVertical: 14,

      flexDirection: 'row',

      alignItems: 'center',
    },

    infoIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      marginRight: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pink,
    },

    infoContent: {
      flex: 1,
    },

    infoLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9.5,

      marginBottom: 3,
    },

    infoTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,

      lineHeight: 17,
    },

    infoSubtitle: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 14,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft: 56,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // REQUESTER MESSAGE
    // ========================================================

    messageCard: {
      minHeight: 72,

      marginBottom: 22,

      padding: 14,

      flexDirection: 'row',

      gap: 10,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        '#FFF9F9',
    },

    messageText: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      lineHeight: 17,
    },

    // ========================================================
    // PRIVACY
    // ========================================================

    privacyCard: {
      minHeight: 72,

      marginBottom: 23,

      padding: 13,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      borderRadius: 14,

      backgroundColor:
        '#F2FAF5',

      borderWidth: 1,

      borderColor:
        '#CDE7D6',
    },

    privacyText: {
      flex: 1,

      color:
        '#3C5D48',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      lineHeight: 14,
    },

    // ========================================================
    // MESSAGE INPUT
    // ========================================================

    messageInput: {
      minHeight: 105,

      paddingHorizontal: 13,
      paddingVertical: 12,

      borderWidth: 1,

      borderColor:
        '#D8CCCC',

      borderRadius: 13,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      backgroundColor:
        COLORS.white,
    },

    characterCount: {
      marginTop: 5,

      marginBottom: 15,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,

      textAlign: 'right',
    },

    // ========================================================
    // SAFETY
    // ========================================================

    safetyNote: {
      minHeight: 70,

      padding: 12,

      marginBottom: 16,

      flexDirection: 'row',

      gap: 9,

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        '#E9CACA',

      backgroundColor:
        COLORS.pink,
    },

    safetyText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,
    },

    // ========================================================
    // OFFER BUTTON
    // ========================================================

    respondButton: {
      height: 50,

      borderRadius: 12,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      backgroundColor:
        COLORS.redButton,
    },

    respondButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11.5,
    },

    disabledButton: {
      opacity: 0.5,
    },

    // ========================================================
    // RESPONSE
    // ========================================================

    responseCard: {
      padding: 15,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },

    responseStatus: {
      alignSelf:
        'flex-start',

      paddingHorizontal: 10,
      paddingVertical: 7,

      borderRadius: 11,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,
    },

    responseStatusText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    responseDescription: {
      marginTop: 11,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 15,
    },

    withdrawButton: {
      height: 43,

      marginTop: 15,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.redButton,

      borderRadius: 10,

      backgroundColor:
        COLORS.white,
    },

    withdrawButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    // ========================================================
    // DONOR APPLICATION GATE
    // ========================================================

    donorGateCard: {
      padding: 15,

      marginBottom: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        '#FFF9F9',
    },

    donorGateHeader: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    donorGateIcon: {
      width: 48,
      height: 48,

      marginRight: 11,

      borderRadius: 15,

      alignItems: 'center',
      justifyContent: 'center',
    },

    donorGateContent: {
      flex: 1,
    },

    donorGateTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    donorStatusBadge: {
      alignSelf:
        'flex-start',

      marginTop: 5,

      paddingHorizontal: 8,
      paddingVertical: 3,

      borderWidth: 1,

      borderRadius: 8,
    },

    donorStatusBadgeText: {
      fontFamily:
        'Inter_600SemiBold',

      fontSize: 7.5,
    },

    donorGateDescription: {
      marginTop: 12,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      lineHeight: 15,
    },

    donorActionButton: {
      height: 50,

      borderRadius: 12,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      backgroundColor:
        COLORS.redButton,
    },

    donorActionButtonDisabled: {
      backgroundColor:
        '#E5E5E5',
    },

    donorActionButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    donorActionButtonTextDisabled: {
      color:
        COLORS.muted,
    },
  });