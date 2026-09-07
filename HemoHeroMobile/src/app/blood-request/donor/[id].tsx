import {
  useCallback,
  useState,
} from 'react';

import {
  useFonts,
} from 'expo-font';

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
// SCREEN
// ============================================================

export default function DonorBloodRequestScreen() {
  const [
    fontsLoaded,
    fontError,
  ] =
    useFonts({
      Poppins_600SemiBold,
      Poppins_700Bold,
      Inter_400Regular,
      Inter_500Medium,
      Inter_600SemiBold,
      Inter_700Bold,
    });

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

          if (!requestData?.request) {
            throw new Error(
              'Blood request could not be found.'
            );
          }

          setRequest(
            requestData.request
          );

          setDonorResponse(
            responseData?.response ||
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
      .replace(/-/g, '')
      .slice(0, 6)
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
          month: 'long',
          day: 'numeric',
          year: 'numeric',
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

    return `${dateText} • ${timeText}`;
  }

  function showMessage(
    title: string,
    description: string
  ) {
    if (
      Platform.OS === 'web' &&
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
  // RESPONSE
  // ==========================================================

  function getResponseStatusLabel() {
    if (!donorResponse) {
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
        return donorResponse.status;
    }
  }

  function getResponseStatusColor() {
    if (!donorResponse) {
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
  // DONOR APPLICATION
  // ==========================================================

  function getDonorApplicationTitle() {
    if (!donorApplication) {
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
    if (!donorApplication) {
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
    if (!donorApplication) {
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
    if (!donorApplication) {
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
    if (!donorApplication) {
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
      donorApplication?.status ===
      'approved'
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
  // DONOR ACTION
  // ==========================================================

  function handleDonorActionPress() {
    if (submitting) {
      return;
    }

    if (!donorApplication) {
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
  // OFFER
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
      Platform.OS === 'web' &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          'Offer to Donate\n\nYour offer will be sent to the requester. Medical personnel must still verify your eligibility before donation.'
        );

      if (confirmed) {
        submitResponse();
      }

      return;
    }

    Alert.alert(
      'Offer to Donate',
      'Your offer will be sent to the requester. Medical personnel must still verify your eligibility before donation.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Send Offer',
          onPress:
            submitResponse,
        },
      ]
    );
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
      Platform.OS === 'web' &&
      typeof window !==
        'undefined'
    ) {
      if (
        window.confirm(
          'Withdraw Donor Response\n\nYour offer will no longer be considered for this request.'
        )
      ) {
        withdrawResponse();
      }

      return;
    }

    Alert.alert(
      'Withdraw Donor Response',
      'Your offer will no longer be considered for this request.',
      [
        {
          text: 'Keep Response',
          style: 'cancel',
        },
        {
          text: 'Withdraw',
          style: 'destructive',
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


  function getResponseIconName() {
    if (!donorResponse) {
      return 'volunteer-activism';
    }

    switch (donorResponse.status) {
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
    if (!donorResponse) {
      return '';
    }

    switch (donorResponse.status) {
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
  // UI
  // ==========================================================

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top']}
        >
          <StatusBar style="light" />

          {/* HEADER */}
          <LinearGradient
            colors={[
              '#D8171D',
              '#A90F14',
              COLORS.redDark,
            ]}
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />
            <View style={styles.headerCircleRight} />

            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.82}
              onPress={() => router.back()}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>
                Request Details
              </Text>

              <Text style={styles.headerSubtitle}>
                {request
                  ? `Request #${getRequestNumber(request.id)}`
                  : 'Blood donation request'}
              </Text>
            </View>
          </LinearGradient>

          {/* BODY */}
          <LinearGradient
            colors={[
              '#F5C1C3',
              COLORS.pageBottom,
            ]}
            style={styles.body}
          >
            <View style={styles.contentShell}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {loading ? (
                  <View style={styles.centerState}>
                    <View style={styles.centerIconWrap}>
                      <MaterialIcons
                        name="bloodtype"
                        size={32}
                        color={COLORS.redButton}
                      />
                    </View>

                    <Text style={styles.centerTitle}>
                      Loading Request
                    </Text>

                    <Text style={styles.centerDescription}>
                      Retrieving the latest request details.
                    </Text>
                  </View>
                ) : errorMessage ? (
                  <View style={styles.centerState}>
                    <View style={styles.centerIconWrap}>
                      <MaterialIcons
                        name="error-outline"
                        size={32}
                        color={COLORS.redButton}
                      />
                    </View>

                    <Text style={styles.centerTitle}>
                      Unable to Load Request
                    </Text>

                    <Text style={styles.centerDescription}>
                      {errorMessage}
                    </Text>

                    <TouchableOpacity
                      style={styles.retryButton}
                      activeOpacity={0.82}
                      onPress={loadData}
                    >
                      <MaterialIcons
                        name="refresh"
                        size={18}
                        color={COLORS.white}
                      />

                      <Text style={styles.retryButtonText}>
                        Try Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : request ? (
                  <>
                    {/* MAIN REQUEST CARD */}
                    <View style={styles.requestCard}>
                      <View style={styles.badgeArea}>
                        <View style={styles.urgencyBadge}>
                          <MaterialIcons
                            name={
                              request.urgency === 'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={16}
                            color={COLORS.white}
                          />

                          <Text style={styles.urgencyBadgeText}>
                            {request.urgency === 'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>

                        <View style={styles.bloodTypeBadge}>
                          <MaterialIcons
                            name="bloodtype"
                            size={16}
                            color={COLORS.white}
                          />

                          <Text style={styles.bloodTypeBadgeText}>
                            {request.blood_type}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.requestCardSubtitle}>
                        DONATION REQUEST
                      </Text>

                      <Text
                        style={styles.requestFacility}
                        numberOfLines={2}
                      >
                        {request.facility_name}
                      </Text>

                      <Text style={styles.requestUnits}>
                        {request.units_needed}{' '}
                        {request.units_needed === 1
                          ? 'unit needed'
                          : 'units needed'}
                      </Text>

                      <View style={styles.cardDivider} />

                      <Text style={styles.infoSectionTitle}>
                        Request Information
                      </Text>

                      <View style={styles.detailRows}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name="person-outline"
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Requester
                            </Text>
                          </View>

                          <Text style={styles.detailValue}>
                            Blood Requester
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name="bloodtype"
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Blood Type
                            </Text>
                          </View>

                          <Text style={styles.detailValueStrong}>
                            {request.blood_type}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name="medical-services"
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Units Needed
                            </Text>
                          </View>

                          <Text style={styles.detailValueStrong}>
                            {request.units_needed}{' '}
                            {request.units_needed === 1
                              ? 'unit'
                              : 'units'}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name={
                                getFacilityIcon(request) as any
                              }
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Location
                            </Text>
                          </View>

                          <View style={styles.detailValueWrap}>
                            <Text style={styles.detailValueStrongRight}>
                              {request.facility_name}
                            </Text>

                            {request.facility_address ? (
                              <Text style={styles.detailValueSub}>
                                {request.facility_address}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name="warning-amber"
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Urgency
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.detailValueStrong,
                              request.urgency === 'urgent' &&
                                styles.urgentValue,
                            ]}
                          >
                            {request.urgency === 'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>

                        <View style={styles.detailRowLast}>
                          <View style={styles.detailLabelGroup}>
                            <MaterialIcons
                              name="schedule"
                              size={19}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.detailLabel}>
                              Needed By
                            </Text>
                          </View>

                          <View style={styles.detailValueWrap}>
                            <Text style={styles.detailValueStrongRight}>
                              {formatNeededBy(request)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {request.message?.trim() ? (
                        <View style={styles.requesterMessageBox}>
                          <View style={styles.messageBoxHeader}>
                            <MaterialIcons
                              name="chat-bubble-outline"
                              size={17}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.messageBoxLabel}>
                              Message to Donors
                            </Text>
                          </View>

                          <Text style={styles.messageBoxText}>
                            {request.message}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* EXISTING RESPONSE */}
                    {donorResponse &&
                    donorResponse.status !== 'withdrawn' ? (
                      <View
                        style={[
                          styles.responsePanel,
                          donorResponse.status === 'accepted' &&
                            styles.responsePanelAccepted,
                          donorResponse.status === 'pending' &&
                            styles.responsePanelPending,
                          donorResponse.status === 'rejected' &&
                            styles.responsePanelRejected,
                        ]}
                      >
                        <View style={styles.responsePanelTop}>
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
                              name={getResponseIconName() as any}
                              size={23}
                              color={getResponseStatusColor()}
                            />
                          </View>

                          <View style={styles.responsePanelCopy}>
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

                            <Text style={styles.responsePanelTitle}>
                              {donorResponse.status === 'accepted'
                                ? 'Your Offer Was Accepted'
                                : donorResponse.status === 'pending'
                                  ? 'You Responded to This Request'
                                  : 'Response Update'}
                            </Text>

                            <Text style={styles.responsePanelDescription}>
                              {getResponseSummary()}
                            </Text>
                          </View>
                        </View>

                        {donorResponse.message?.trim() ? (
                          <View style={styles.sentMessageCard}>
                            <Text style={styles.sentMessageLabel}>
                              YOUR MESSAGE
                            </Text>

                            <Text style={styles.sentMessageText}>
                              {donorResponse.message}
                            </Text>
                          </View>
                        ) : null}

                        {donorResponse.status === 'accepted' ? (
                          <TouchableOpacity
                            style={styles.openChatButton}
                            activeOpacity={0.85}
                            onPress={handleOpenCoordination}
                          >
                            <MaterialIcons
                              name="chat-bubble-outline"
                              size={20}
                              color={COLORS.white}
                            />

                            <Text style={styles.openChatButtonText}>
                              Open Chat
                            </Text>

                            <MaterialIcons
                              name="arrow-forward"
                              size={19}
                              color={COLORS.white}
                            />
                          </TouchableOpacity>
                        ) : null}

                        {donorResponse.status === 'pending' ? (
                          <TouchableOpacity
                            style={styles.withdrawButton}
                            activeOpacity={0.82}
                            disabled={withdrawing}
                            onPress={handleWithdrawPress}
                          >
                            <MaterialIcons
                              name="undo"
                              size={18}
                              color={COLORS.redButton}
                            />

                            <Text style={styles.withdrawButtonText}>
                              {withdrawing
                                ? 'Withdrawing...'
                                : 'Withdraw Offer'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : isApprovedDonor() ? (
                      <>
                        <View style={styles.eligibilityCard}>
                          <View style={styles.eligibilityIconWrap}>
                            <MaterialIcons
                              name="verified"
                              size={22}
                              color={COLORS.green}
                            />
                          </View>

                          <View style={styles.eligibilityCopy}>
                            <Text style={styles.eligibilityTitle}>
                              You’re a Verified Donor
                            </Text>

                            <Text style={styles.eligibilityText}>
                              You can respond to this request. Medical
                              personnel will confirm your final eligibility
                              before donation.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.offerSection}>
                          <Text style={styles.offerTitle}>
                            Message to Requester
                          </Text>

                          <Text style={styles.offerSubtitle}>
                            Optional — add a short note about your
                            availability.
                          </Text>

                          <TextInput
                            style={styles.messageInput}
                            value={message}
                            onChangeText={setMessage}
                            editable={!submitting}
                            multiline
                            maxLength={250}
                            placeholder="Example: I can donate this afternoon."
                            placeholderTextColor={COLORS.lightMuted}
                            textAlignVertical="top"
                          />

                          <Text style={styles.characterCount}>
                            {message.length}/250
                          </Text>

                          <TouchableOpacity
                            style={[
                              styles.offerButton,
                              submitting &&
                                styles.disabledButton,
                            ]}
                            disabled={submitting}
                            activeOpacity={0.85}
                            onPress={handleDonorActionPress}
                          >
                            <MaterialIcons
                              name="volunteer-activism"
                              size={21}
                              color={COLORS.white}
                            />

                            <Text style={styles.offerButtonText}>
                              {submitting
                                ? 'Sending Offer...'
                                : 'Offer to Donate'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.donorGateCard}>
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
                                getDonorApplicationIcon() as any
                              }
                              size={25}
                              color={getDonorApplicationColor()}
                            />
                          </View>

                          <View style={styles.donorGateCopy}>
                            <Text style={styles.donorGateTitle}>
                              {getDonorApplicationTitle()}
                            </Text>

                            <Text style={styles.donorGateDescription}>
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
                                  {donorApplication.status
                                    .charAt(0)
                                    .toUpperCase() +
                                    donorApplication.status.slice(1)}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.donorActionButton,
                            donorApplication?.status === 'pending' &&
                              styles.donorActionButtonDisabled,
                          ]}
                          disabled={
                            donorApplication?.status === 'pending'
                          }
                          activeOpacity={0.85}
                          onPress={handleDonorActionPress}
                        >
                          <MaterialIcons
                            name={
                              donorApplication?.status === 'pending'
                                ? 'schedule'
                                : 'how-to-reg'
                            }
                            size={21}
                            color={
                              donorApplication?.status === 'pending'
                                ? COLORS.muted
                                : COLORS.white
                            }
                          />

                          <Text
                            style={[
                              styles.donorActionButtonText,
                              donorApplication?.status === 'pending' &&
                                styles.donorActionButtonTextDisabled,
                            ]}
                          >
                            {getDonorActionLabel()}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <View style={styles.privacyNote}>
                      <MaterialIcons
                        name="shield"
                        size={18}
                        color={COLORS.green}
                      />

                      <Text style={styles.privacyText}>
                        Personal contact details stay private. Accepted donors
                        and requesters coordinate securely through Hemo-Hero.
                      </Text>
                    </View>
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

      maxWidth: '100%',
      overflow: 'hidden',

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

      paddingHorizontal: 21,
      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 11,

      flexDirection: 'row',
      alignItems: 'flex-start',

      overflow: 'hidden',
    },

    headerCircleLeft: {
      position: 'absolute',

      width: 175,
      height: 175,

      borderRadius: 88,

      left: -112,
      top: -80,

      backgroundColor:
        'rgba(255,255,255,0.065)',
    },

    headerCircleRight: {
      position: 'absolute',

      width: 190,
      height: 190,

      borderRadius: 95,

      right: -105,
      top: -98,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    backButton: {
      width: 43,
      height: 43,

      marginRight: 13,

      borderRadius: 22,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1.3,
      borderColor:
        'rgba(255,255,255,0.86)',

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },

    headerCopy: {
      flex: 1,
      paddingTop: 2,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 21,
      lineHeight: 27,
    },

    headerSubtitle: {
      marginTop: 2,

      color:
        'rgba(255,255,255,0.78)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    // ========================================================
    // BODY
    // ========================================================

    body: {
      flex: 1,

      paddingHorizontal: 14,
      paddingBottom: 14,
    },

    contentShell: {
      flex: 1,

      marginTop: -12,

      borderRadius: 29,

      overflow: 'hidden',

      backgroundColor:
        '#F8F8F8',
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 17,
      paddingTop: 20,
      paddingBottom: 34,
    },

    // ========================================================
    // LOADING / ERROR
    // ========================================================

    centerState: {
      minHeight: 530,

      paddingHorizontal: 28,

      alignItems: 'center',
      justifyContent: 'center',
    },

    centerIconWrap: {
      width: 58,
      height: 58,

      borderRadius: 18,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pink,
    },

    centerTitle: {
      marginTop: 14,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 17,
    },

    centerDescription: {
      marginTop: 6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
      lineHeight: 18,

      textAlign: 'center',
    },

    retryButton: {
      height: 44,

      marginTop: 18,

      paddingHorizontal: 18,

      borderRadius: 11,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 7,

      backgroundColor:
        COLORS.redButton,
    },

    retryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    // ========================================================
    // REQUEST CARD
    // ========================================================

    requestCard: {
      paddingHorizontal: 17,
      paddingTop: 18,
      paddingBottom: 18,

      marginBottom: 14,

      borderRadius: 22,

      borderWidth: 1,
      borderColor:
        '#E5DEDE',

      backgroundColor:
        COLORS.white,

      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 3,
    },

    badgeArea: {
      flexDirection: 'row',
      justifyContent: 'center',

      gap: 8,

      marginBottom: 11,
    },

    urgencyBadge: {
      minHeight: 36,

      paddingHorizontal: 12,

      borderRadius: 9,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      backgroundColor:
        COLORS.redButton,
    },

    urgencyBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',

      fontSize: 11,
    },

    bloodTypeBadge: {
      minHeight: 36,

      paddingHorizontal: 12,

      borderRadius: 9,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      backgroundColor:
        COLORS.redDark,
    },

    bloodTypeBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 12,
    },

    requestCardSubtitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_700Bold',

      fontSize: 9,

      letterSpacing: 0.9,

      textAlign: 'center',
    },

    requestFacility: {
      marginTop: 5,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
      lineHeight: 22,

      textAlign: 'center',
    },

    requestUnits: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,

      textAlign: 'center',
    },

    cardDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginTop: 17,
      marginBottom: 15,

      backgroundColor:
        COLORS.border,
    },

    infoSectionTitle: {
      marginBottom: 5,

      color:
        '#474747',

      fontFamily:
        'Inter_700Bold',

      fontSize: 11.5,
    },

    detailRows: {
      marginTop: 2,
    },

    detailRow: {
      minHeight: 52,

      paddingVertical: 9,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#EFEAEA',
    },

    detailRowLast: {
      minHeight: 52,

      paddingVertical: 9,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    detailLabelGroup: {
      width: '43%',

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,
    },

    detailLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    detailValue: {
      maxWidth: '54%',

      color:
        '#404040',

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,

      textAlign: 'right',
    },

    detailValueStrong: {
      maxWidth: '54%',

      color:
        COLORS.black,

      fontFamily:
        'Inter_700Bold',

      fontSize: 11.5,

      textAlign: 'right',
    },

    detailValueWrap: {
      width: '54%',

      alignItems: 'flex-end',
    },

    detailValueStrongRight: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_700Bold',

      fontSize: 11.5,
      lineHeight: 16,

      textAlign: 'right',
    },

    detailValueSub: {
      marginTop: 2,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
      lineHeight: 14,

      textAlign: 'right',
    },

    urgentValue: {
      color:
        COLORS.redButton,
    },

    requesterMessageBox: {
      marginTop: 14,

      padding: 13,

      borderRadius: 13,

      backgroundColor:
        COLORS.pink,
    },

    messageBoxHeader: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 6,
    },

    messageBoxLabel: {
      color:
        '#4A4A4A',

      fontFamily:
        'Inter_700Bold',

      fontSize: 10.5,
    },

    messageBoxText: {
      marginTop: 7,

      color:
        '#444444',

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
      lineHeight: 17,
    },

    // ========================================================
    // RESPONSE PANEL
    // ========================================================

    responsePanel: {
      marginTop: 2,
      marginBottom: 14,

      padding: 15,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 16,

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
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    responseIconWrap: {
      width: 43,
      height: 43,

      marginRight: 10,

      borderRadius: 13,

      alignItems: 'center',
      justifyContent: 'center',
    },

    responsePanelCopy: {
      flex: 1,
    },

    statusPill: {
      alignSelf: 'flex-start',

      minHeight: 25,

      paddingHorizontal: 9,

      borderRadius: 8,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 5,
    },

    statusDot: {
      width: 6,
      height: 6,

      borderRadius: 3,
    },

    statusPillText: {
      fontFamily:
        'Inter_700Bold',

      fontSize: 9.5,
    },

    responsePanelTitle: {
      marginTop: 8,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,
      lineHeight: 18,
    },

    responsePanelDescription: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.8,
      lineHeight: 16,
    },

    sentMessageCard: {
      marginTop: 12,

      padding: 11,

      borderRadius: 10,

      backgroundColor:
        'rgba(255,255,255,0.72)',
    },

    sentMessageLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_700Bold',

      fontSize: 8.5,

      letterSpacing: 0.6,
    },

    sentMessageText: {
      marginTop: 4,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,
      lineHeight: 16,
    },

    openChatButton: {
      height: 48,

      marginTop: 14,

      borderRadius: 11,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      backgroundColor:
        COLORS.green,
    },

    openChatButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    withdrawButton: {
      height: 44,

      marginTop: 14,

      borderWidth: 1,
      borderColor:
        COLORS.redButton,

      borderRadius: 10,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      backgroundColor:
        COLORS.white,
    },

    withdrawButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11.5,
    },

    // ========================================================
    // ELIGIBILITY / OFFER
    // ========================================================

    eligibilityCard: {
      marginTop: 2,
      marginBottom: 14,

      padding: 14,

      borderWidth: 1,
      borderColor:
        '#C5E4D0',

      borderRadius: 15,

      flexDirection: 'row',
      alignItems: 'flex-start',

      backgroundColor:
        COLORS.greenLight,
    },

    eligibilityIconWrap: {
      width: 40,
      height: 40,

      marginRight: 10,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

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

      fontSize: 12.5,
    },

    eligibilityText: {
      marginTop: 3,

      color: '#557565',

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,
      lineHeight: 15.5,
    },

    offerSection: {
      marginBottom: 14,
    },

    offerTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },

    offerSubtitle: {
      marginTop: 2,
      marginBottom: 9,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,
      lineHeight: 15,
    },

    messageInput: {
      minHeight: 98,

      paddingHorizontal: 13,
      paddingVertical: 12,

      borderWidth: 1,
      borderColor:
        '#D9D3D3',

      borderRadius: 12,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
      lineHeight: 18,

      backgroundColor:
        COLORS.white,
    },

    characterCount: {
      marginTop: 5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      textAlign: 'right',
    },

    offerButton: {
      height: 50,

      marginTop: 12,

      borderRadius: 11,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      backgroundColor:
        COLORS.green,
    },

    offerButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12.5,
    },

    disabledButton: {
      opacity: 0.5,
    },

    // ========================================================
    // DONOR GATE
    // ========================================================

    donorGateCard: {
      marginTop: 2,
      marginBottom: 12,

      padding: 15,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 16,

      flexDirection: 'row',
      alignItems: 'flex-start',

      backgroundColor:
        COLORS.white,
    },

    donorGateIcon: {
      width: 46,
      height: 46,

      marginRight: 11,

      borderRadius: 14,

      alignItems: 'center',
      justifyContent: 'center',
    },

    donorGateCopy: {
      flex: 1,
    },

    donorGateTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },

    donorGateDescription: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,
      lineHeight: 16,
    },

    donorStatusPill: {
      alignSelf: 'flex-start',

      minHeight: 25,

      marginTop: 8,

      paddingHorizontal: 8,

      borderRadius: 8,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 5,
    },

    donorStatusDot: {
      width: 6,
      height: 6,

      borderRadius: 3,
    },

    donorStatusText: {
      fontFamily:
        'Inter_700Bold',

      fontSize: 9,
    },

    donorActionButton: {
      height: 49,

      borderRadius: 11,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

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

      fontSize: 12,
    },

    donorActionButtonTextDisabled: {
      color:
        COLORS.muted,
    },

    // ========================================================
    // PRIVACY
    // ========================================================

    privacyNote: {
      minHeight: 59,

      marginTop: 15,

      padding: 11,

      borderWidth: 1,
      borderColor:
        '#D0E6D8',

      borderRadius: 13,

      flexDirection: 'row',
      alignItems: 'flex-start',

      gap: 8,

      backgroundColor:
        '#F5FBF7',
    },

    privacyText: {
      flex: 1,

      color: '#587160',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.8,
      lineHeight: 15,
    },
  });
