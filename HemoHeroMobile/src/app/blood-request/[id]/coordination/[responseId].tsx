import {
  useCallback,
  useEffect,
  useRef,
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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { fulfillBloodRequest } from '../../../../lib/requestResponses';

import {
  getCoordinationMessages,
  getCoordinationSession,
  saveCoordinationSchedule,
  sendCoordinationMessage,
} from '../../../../lib/coordination';

import type {
  CoordinationMessage,
  CoordinationSession,
} from '../../../../lib/coordination';

import { getAccessToken } from '../../../../lib/session';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#181818',
  page: '#F7F7F7',
  muted: '#6A6A6A',
  lightMuted: '#9A9A9A',
  border: '#E6E2E2',
  pink: '#FFF1F1',
  pinkBubble: '#FFF0F0',
  grayBubble: '#E9E9E9',
  green: '#198754',
  greenLight: '#EAF7EF',
};

export default function DonationCoordinationScreen() {
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
      responseId?: string | string[];
    }>();

  const requestId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const responseId =
    Array.isArray(params.responseId)
      ? params.responseId[0]
      : params.responseId;

  const scrollRef =
    useRef<ScrollView | null>(
      null
    );

  const [
    coordination,
    setCoordination,
  ] =
    useState<CoordinationSession | null>(
      null
    );

  const [
    messages,
    setMessages,
  ] =
    useState<CoordinationMessage[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    messageText,
    setMessageText,
  ] =
    useState('');

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    fulfilling,
    setFulfilling,
  ] =
    useState(false);

  const [
    scheduleModalVisible,
    setScheduleModalVisible,
  ] =
    useState(false);

  const [
    scheduleDate,
    setScheduleDate,
  ] =
    useState('');

  const [
    scheduleTime,
    setScheduleTime,
  ] =
    useState('');

  const [
    scheduleNote,
    setScheduleNote,
  ] =
    useState('');

  const [
    savingSchedule,
    setSavingSchedule,
  ] =
    useState(false);

  const [
    datePickerVisible,
    setDatePickerVisible,
  ] =
    useState(false);

  const [
    timePickerVisible,
    setTimePickerVisible,
  ] =
    useState(false);

  const [
    calendarCursor,
    setCalendarCursor,
  ] =
    useState(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

  const [
    tempSelectedDate,
    setTempSelectedDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    tempHour,
    setTempHour,
  ] =
    useState(12);

  const [
    tempMinute,
    setTempMinute,
  ] =
    useState(0);

  const [
    tempPeriod,
    setTempPeriod,
  ] =
    useState<'AM' | 'PM'>(
      'PM'
    );

  const request =
    coordination?.request;

  const schedule =
    coordination?.schedule;

  const viewerRole =
    coordination?.viewer_role;

  const otherPerson =
    viewerRole === 'donor'
      ? coordination?.requester
      : coordination?.donor;

  const isClosed =
    request
      ? request.status !== 'active'
      : false;

  const loadCoordination =
    useCallback(
      async () => {
        if (
          !requestId ||
          !responseId
        ) {
          setError(
            'Coordination information is missing.'
          );
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');
            return;
          }

          const [
            sessionResult,
            messagesResult,
          ] =
            await Promise.all([
              getCoordinationSession(
                token,
                requestId,
                responseId
              ),
              getCoordinationMessages(
                token,
                requestId,
                responseId
              ),
            ]);

          setCoordination(
            sessionResult.coordination
          );

          setMessages(
            messagesResult.messages ||
              []
          );
        } catch (loadError) {
          console.log(
            'LOAD COORDINATION ERROR:',
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load donation coordination.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  const loadMessages =
    useCallback(
      async () => {
        if (
          !requestId ||
          !responseId
        ) {
          return;
        }

        try {
          const token =
            await getAccessToken();

          if (!token) {
            return;
          }

          const result =
            await getCoordinationMessages(
              token,
              requestId,
              responseId
            );

          setMessages(
            result.messages ||
              []
          );
        } catch (messageError) {
          console.log(
            'REFRESH COORDINATION MESSAGES ERROR:',
            messageError
          );
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        loadCoordination();
      },
      [
        loadCoordination,
      ]
    )
  );

  useEffect(
    () => {
      if (
        !requestId ||
        !responseId
      ) {
        return;
      }

      const timer =
        setInterval(
          () => {
            loadMessages();
          },
          4000
        );

      return () =>
        clearInterval(timer);
    },
    [
      requestId,
      responseId,
      loadMessages,
    ]
  );

  function getOtherName() {
    if (!otherPerson) {
      return 'Hemo-Hero User';
    }

    return (
      otherPerson.full_name ||
      [
        otherPerson.first_name,
        otherPerson.last_name,
      ]
        .filter(Boolean)
        .join(' ') ||
      'Hemo-Hero User'
    );
  }

  function getInitials() {
    const initials =
      [
        otherPerson?.first_name,
        otherPerson?.last_name,
      ]
        .filter(Boolean)
        .map(
          value =>
            String(value)
              .charAt(0)
              .toUpperCase()
        )
        .join('');

    return initials || 'H';
  }

  function getOtherRoleLabel() {
    return viewerRole ===
      'requester'
      ? 'Accepted Donor'
      : 'Blood Requester';
  }

  function formatMessageTime(
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

    return date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  }

  function formatMessageDay(
    value?: string
  ) {
    if (!value) {
      return 'TODAY';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'TODAY';
    }

    return date
      .toLocaleDateString(
        'en-US',
        {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }
      )
      .toUpperCase();
  }

  function formatSchedule(
    value: string
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  }

  function localDateValue(
    date: Date
  ) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;
  }

  function localTimeValue(
    date: Date
  ) {
    const hour =
      String(
        date.getHours()
      ).padStart(
        2,
        '0'
      );

    const minute =
      String(
        date.getMinutes()
      ).padStart(
        2,
        '0'
      );

    return `${hour}:${minute}`;
  }

  function padNumber(
    value: number
  ) {
    return String(
      value
    ).padStart(
      2,
      '0'
    );
  }

  function toIsoDate(
    date: Date
  ) {
    return `${date.getFullYear()}-${padNumber(
      date.getMonth() + 1
    )}-${padNumber(
      date.getDate()
    )}`;
  }

  function isSameCalendarDate(
    first: Date,
    second: Date
  ) {
    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    );
  }

  function getCalendarDays() {
    const year =
      calendarCursor.getFullYear();

    const month =
      calendarCursor.getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      );

    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );

    const days: Array<
      | {
          type: 'empty';
          key: string;
        }
      | {
          type: 'day';
          key: string;
          date: Date;
        }
    > = [];

    for (
      let index = 0;
      index <
      firstDay.getDay();
      index += 1
    ) {
      days.push({
        type: 'empty',
        key:
          `empty-${index}`,
      });
    }

    for (
      let day = 1;
      day <=
      lastDay.getDate();
      day += 1
    ) {
      const date =
        new Date(
          year,
          month,
          day
        );

      days.push({
        type: 'day',
        key:
          toIsoDate(
            date
          ),
        date,
      });
    }

    return days;
  }

  function isPastCalendarDate(
    date: Date
  ) {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const candidate =
      new Date(date);

    candidate.setHours(
      0,
      0,
      0,
      0
    );

    return (
      candidate.getTime() <
      today.getTime()
    );
  }

  function formatScheduleDateField() {
    if (!scheduleDate) {
      return 'Select Date';
    }

    const date =
      new Date(
        `${scheduleDate}T12:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Select Date';
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

  function formatScheduleTimeField() {
    if (!scheduleTime) {
      return 'Select Time';
    }

    const [
      hourText,
      minuteText,
    ] =
      scheduleTime.split(':');

    const date =
      new Date();

    date.setHours(
      Number(hourText),
      Number(minuteText),
      0,
      0
    );

    return date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
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

  function handleViewRequest() {
    if (!request) {
      return;
    }

    if (
      viewerRole === 'donor'
    ) {
      router.push(
        `/blood-request/donor/${request.id}` as any
      );
      return;
    }

    router.push(
      `/blood-request/${request.id}` as any
    );
  }

  async function openLocation() {
    if (!request) {
      return;
    }

    let url = '';

    if (
      request.facility_latitude !==
        null &&
      request.facility_latitude !==
        undefined &&
      request.facility_longitude !==
        null &&
      request.facility_longitude !==
        undefined
    ) {
      url =
        `https://www.google.com/maps/search/?api=1&query=${request.facility_latitude},${request.facility_longitude}`;
    } else {
      const query =
        request.facility_address ||
        request.facility_name;

      url =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          query
        )}`;
    }

    try {
      await Linking.openURL(
        url
      );
    } catch {
      showMessage(
        'Unable to Open Map',
        'The facility location could not be opened.'
      );
    }
  }

  async function handleSendMessage() {
    const cleanMessage =
      messageText.trim();

    if (
      !cleanMessage ||
      !requestId ||
      !responseId ||
      sending ||
      isClosed
    ) {
      return;
    }

    try {
      setSending(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const result =
        await sendCoordinationMessage(
          token,
          requestId,
          responseId,
          cleanMessage
        );

      setMessageText('');

      if (result?.data) {
        setMessages(
          current => [
            ...current,
            result.data,
          ]
        );
      } else {
        await loadMessages();
      }

      setTimeout(
        () => {
          scrollRef.current
            ?.scrollToEnd({
              animated: true,
            });
        },
        80
      );
    } catch (sendError) {
      console.log(
        'SEND MESSAGE ERROR:',
        sendError
      );

      showMessage(
        'Unable to Send Message',
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send your message.'
      );
    } finally {
      setSending(false);
    }
  }

  function handleOpenSchedule() {
    if (
      !coordination ||
      isClosed
    ) {
      return;
    }

    let date =
      new Date(
        Date.now() +
          60 * 60 * 1000
      );

    date.setSeconds(
      0,
      0
    );

    if (
      date.getMinutes() <
      30
    ) {
      date.setMinutes(
        30
      );
    } else {
      date.setHours(
        date.getHours() + 1,
        0,
        0,
        0
      );
    }

    if (
      schedule?.scheduled_at
    ) {
      const existing =
        new Date(
          schedule.scheduled_at
        );

      if (
        !Number.isNaN(
          existing.getTime()
        ) &&
        existing.getTime() >
          Date.now()
      ) {
        date = existing;
      }
    }

    setScheduleDate(
      localDateValue(date)
    );

    setScheduleTime(
      localTimeValue(date)
    );

    setScheduleNote(
      schedule?.note || ''
    );

    setDatePickerVisible(false);
    setTimePickerVisible(false);
    setScheduleModalVisible(true);
  }

  function openDatePicker() {
    let selected =
      new Date();

    if (
      scheduleDate
    ) {
      const existing =
        new Date(
          `${scheduleDate}T12:00:00`
        );

      if (
        !Number.isNaN(
          existing.getTime()
        )
      ) {
        selected =
          existing;
      }
    }

    setTempSelectedDate(
      selected
    );

    setCalendarCursor(
      new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1
      )
    );

    setDatePickerVisible(true);
  }

  function confirmDatePicker() {
    if (
      !tempSelectedDate
    ) {
      return;
    }

    setScheduleDate(
      toIsoDate(
        tempSelectedDate
      )
    );

    setDatePickerVisible(false);
  }

  function changeCalendarMonth(
    offset: number
  ) {
    setCalendarCursor(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            offset,
          1
        )
    );
  }

  function openTimePicker() {
    let hour24 =
      new Date().getHours();

    let minute =
      new Date().getMinutes();

    if (
      scheduleTime &&
      /^\d{2}:\d{2}$/.test(
        scheduleTime
      )
    ) {
      const [
        hourText,
        minuteText,
      ] =
        scheduleTime.split(':');

      hour24 =
        Number(hourText);

      minute =
        Number(minuteText);
    }

    const period:
      | 'AM'
      | 'PM' =
      hour24 >= 12
        ? 'PM'
        : 'AM';

    const hour12 =
      hour24 % 12 ||
      12;

    setTempHour(
      hour12
    );

    setTempMinute(
      Math.min(
        55,
        Math.max(
          0,
          Math.round(
            minute / 5
          ) * 5
        )
      )
    );

    setTempPeriod(
      period
    );

    setTimePickerVisible(true);
  }

  function changeTempHour(
    offset: number
  ) {
    setTempHour(
      current => {
        let next =
          current +
          offset;

        if (
          next > 12
        ) {
          next = 1;
        }

        if (
          next < 1
        ) {
          next = 12;
        }

        return next;
      }
    );
  }

  function changeTempMinute(
    offset: number
  ) {
    setTempMinute(
      current => {
        let next =
          current +
          offset;

        if (
          next > 55
        ) {
          next = 0;
        }

        if (
          next < 0
        ) {
          next = 55;
        }

        return next;
      }
    );
  }

  function confirmTimePicker() {
    let hour24 =
      tempHour %
      12;

    if (
      tempPeriod ===
      'PM'
    ) {
      hour24 += 12;
    }

    setScheduleTime(
      `${padNumber(
        hour24
      )}:${padNumber(
        tempMinute
      )}`
    );

    setTimePickerVisible(false);
  }

  async function handleSaveSchedule() {
    if (
      !requestId ||
      !responseId ||
      savingSchedule
    ) {
      return;
    }

    if (
      !scheduleDate
    ) {
      showMessage(
        'Select a Date',
        'Choose a donation date before saving.'
      );
      return;
    }

    if (
      !scheduleTime
    ) {
      showMessage(
        'Select a Time',
        'Choose a donation time before saving.'
      );
      return;
    }

    const scheduledDate =
      new Date(
        `${scheduleDate}T${scheduleTime}:00`
      );

    if (
      Number.isNaN(
        scheduledDate.getTime()
      ) ||
      scheduledDate.getTime() <=
        Date.now()
    ) {
      showMessage(
        'Invalid Schedule',
        'Choose a future date and time.'
      );
      return;
    }

    try {
      setSavingSchedule(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      await saveCoordinationSchedule(
        token,
        requestId,
        responseId,
        scheduledDate.toISOString(),
        scheduleNote
      );

      setScheduleModalVisible(false);

      await loadCoordination();
    } catch (scheduleError) {
      console.log(
        'SAVE SCHEDULE ERROR:',
        scheduleError
      );

      showMessage(
        'Unable to Save Schedule',
        scheduleError instanceof Error
          ? scheduleError.message
          : 'Unable to save the donation schedule.'
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  function handleFulfill() {
    if (
      !request ||
      viewerRole !==
        'requester' ||
      request.status !==
        'active' ||
      fulfilling
    ) {
      return;
    }

    const description =
      'Only mark the request as fulfilled after the needed blood has been secured or the donation has been completed.';

    if (
      Platform.OS === 'web' &&
      typeof window !==
        'undefined'
    ) {
      if (
        window.confirm(
          `Mark Request as Fulfilled\n\n${description}`
        )
      ) {
        performFulfill();
      }
      return;
    }

    Alert.alert(
      'Mark Request as Fulfilled',
      description,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Mark Fulfilled',
          onPress:
            performFulfill,
        },
      ]
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

      await loadCoordination();

      showMessage(
        'Request Fulfilled',
        'The blood request has been completed successfully.'
      );
    } catch (fulfillError) {
      showMessage(
        'Unable to Complete Request',
        fulfillError instanceof Error
          ? fulfillError.message
          : 'Unable to mark the request as fulfilled.'
      );
    } finally {
      setFulfilling(false);
    }
  }

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
              '#C9161B',
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
              activeOpacity={0.8}
              onPress={() =>
                router.back()
              }
            >
              <MaterialIcons
                name="arrow-back"
                size={23}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>

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
                {getInitials()}
              </Text>
            </View>

            <View
              style={
                styles.personInfo
              }
            >
              <Text
                numberOfLines={1}
                style={
                  styles.personName
                }
              >
                {getOtherName()}
              </Text>

              <View
                style={
                  styles.roleRow
                }
              >
                <View
                  style={
                    styles.onlineDot
                  }
                />

                <Text
                  style={
                    styles.roleText
                  }
                >
                  {getOtherRoleLabel()}
                </Text>
              </View>
            </View>

            {viewerRole ===
              'requester' &&
            coordination?.donor
              ?.is_verified ? (
              <MaterialIcons
                name="verified"
                size={21}
                color="#7BDB9B"
              />
            ) : null}
          </LinearGradient>

          <KeyboardAvoidingView
            style={
              styles.keyboardView
            }
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
          >
            {loading ? (
              <View
                style={
                  styles.centerState
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
                    styles.centerTitle
                  }
                >
                  Loading Chat
                </Text>
              </View>
            ) : error ? (
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
                  Unable to Load Chat
                </Text>

                <Text
                  style={
                    styles.centerDescription
                  }
                >
                  {error}
                </Text>

                <TouchableOpacity
                  style={
                    styles.retryButton
                  }
                  onPress={
                    loadCoordination
                  }
                >
                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : coordination &&
              request ? (
              <>
                <View
                  style={
                    styles.requestCard
                  }
                >
                  <View
                    style={
                      styles.requestIcon
                    }
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={22}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.requestInfo
                    }
                  >
                    <View
                      style={
                        styles.badgeRow
                      }
                    >
                      <View
                        style={
                          styles.redBadge
                        }
                      >
                        <Text
                          style={
                            styles.redBadgeText
                          }
                        >
                          {request.urgency ===
                          'urgent'
                            ? 'Urgent'
                            : 'Scheduled'}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.redBadge
                        }
                      >
                        <Text
                          style={
                            styles.redBadgeText
                          }
                        >
                          {
                            request.blood_type
                          }
                        </Text>
                      </View>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.requestMeta
                      }
                    >
                      {request.units_needed}{' '}
                      {request.units_needed ===
                      1
                        ? 'unit'
                        : 'units'}{' '}
                      •{' '}
                      {
                        request.facility_name
                      }
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.viewRequestButton
                    }
                    activeOpacity={0.8}
                    onPress={
                      handleViewRequest
                    }
                  >
                    <Text
                      style={
                        styles.viewRequestText
                      }
                    >
                      View Request
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={
                    scrollRef
                  }
                  style={
                    styles.chatScroll
                  }
                  contentContainerStyle={
                    styles.chatContent
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={() => {
                    scrollRef.current
                      ?.scrollToEnd({
                        animated: false,
                      });
                  }}
                >
                  <View
                    style={
                      styles.dayDivider
                    }
                  >
                    <View
                      style={
                        styles.dayLine
                      }
                    />

                    <Text
                      style={
                        styles.dayText
                      }
                    >
                      {formatMessageDay(
                        messages[0]
                          ?.created_at
                      )}
                    </Text>

                    <View
                      style={
                        styles.dayLine
                      }
                    />
                  </View>

                  {messages.length ===
                  0 ? (
                    <View
                      style={
                        styles.emptyChat
                      }
                    >
                      <View
                        style={
                          styles.emptyChatIcon
                        }
                      >
                        <MaterialIcons
                          name="chat-bubble-outline"
                          size={26}
                          color={
                            COLORS.redButton
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.emptyChatTitle
                        }
                      >
                        Start Coordinating
                      </Text>

                      <Text
                        style={
                          styles.emptyChatDescription
                        }
                      >
                        Send a message to arrange the donation time and meeting point.
                      </Text>
                    </View>
                  ) : (
                    messages.map(
                      message => (
                        <View
                          key={
                            message.id
                          }
                          style={[
                            styles.messageRow,
                            message.is_mine
                              ? styles.messageRowMine
                              : styles.messageRowOther,
                          ]}
                        >
                          {!message.is_mine ? (
                            <View
                              style={
                                styles.messageAvatar
                              }
                            >
                              <Text
                                style={
                                  styles.messageAvatarText
                                }
                              >
                                {message.sender
                                  ?.first_name
                                  ?.charAt(0)
                                  .toUpperCase() ||
                                  getInitials()
                                    .charAt(0)}
                              </Text>
                            </View>
                          ) : null}

                          <View
                            style={
                              styles.messageStack
                            }
                          >
                            <View
                              style={[
                                styles.messageBubble,
                                message.is_mine
                                  ? styles.myBubble
                                  : styles.otherBubble,
                              ]}
                            >
                              <Text
                                style={
                                  styles.messageText
                                }
                              >
                                {
                                  message.message
                                }
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.messageTime,
                                message.is_mine &&
                                  styles.messageTimeMine,
                              ]}
                            >
                              {formatMessageTime(
                                message.created_at
                              )}
                            </Text>
                          </View>
                        </View>
                      )
                    )
                  )}
                </ScrollView>

                <View
                  style={
                    styles.facilityCard
                  }
                >
                  <View
                    style={
                      styles.facilityRow
                    }
                  >
                    <View
                      style={
                        styles.facilityIcon
                      }
                    >
                      <MaterialIcons
                        name="location-on"
                        size={24}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.facilityInfo
                      }
                    >
                      <Text
                        numberOfLines={1}
                        style={
                          styles.facilityName
                        }
                      >
                        {
                          request.facility_name
                        }
                      </Text>

                      {request.facility_address ? (
                        <Text
                          numberOfLines={1}
                          style={
                            styles.facilityAddress
                          }
                        >
                          {
                            request.facility_address
                          }
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={
                        styles.locationAction
                      }
                      onPress={
                        openLocation
                      }
                    >
                      <Text
                        style={
                          styles.locationActionText
                        }
                      >
                        View Location
                      </Text>

                      <MaterialIcons
                        name="chevron-right"
                        size={17}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={
                      styles.facilityDivider
                    }
                  />

                  <TouchableOpacity
                    disabled={
                      isClosed
                    }
                    activeOpacity={0.8}
                    style={
                      styles.scheduleRow
                    }
                    onPress={
                      handleOpenSchedule
                    }
                  >
                    <View
                      style={
                        styles.scheduleIcon
                      }
                    >
                      <MaterialIcons
                        name="event"
                        size={20}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.scheduleInfo
                      }
                    >
                      <Text
                        style={
                          styles.scheduleLabel
                        }
                      >
                        Donation Schedule
                      </Text>

                      <Text
                        style={
                          styles.scheduleValue
                        }
                      >
                        {schedule
                          ? formatSchedule(
                              schedule.scheduled_at
                            )
                          : 'No schedule set yet'}
                      </Text>

                      {schedule?.note ? (
                        <Text
                          numberOfLines={1}
                          style={
                            styles.scheduleNote
                          }
                        >
                          {
                            schedule.note
                          }
                        </Text>
                      ) : null}
                    </View>

                    {!isClosed ? (
                      <Text
                        style={
                          styles.scheduleAction
                        }
                      >
                        {schedule
                          ? 'Edit'
                          : 'Set'}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                </View>

                {viewerRole ===
                  'requester' &&
                request.status ===
                  'active' ? (
                  <View
                    style={
                      styles.fulfillRow
                    }
                  >
                    <View
                      style={
                        styles.fulfillTextArea
                      }
                    >
                      <Text
                        style={
                          styles.fulfillTitle
                        }
                      >
                        Donation completed?
                      </Text>

                      <Text
                        style={
                          styles.fulfillDescription
                        }
                      >
                        Close the request once blood has been secured.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.fulfillButton
                      }
                      disabled={
                        fulfilling
                      }
                      onPress={
                        handleFulfill
                      }
                    >
                      {fulfilling ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.white
                          }
                        />
                      ) : (
                        <Text
                          style={
                            styles.fulfillButtonText
                          }
                        >
                          Mark Fulfilled
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                {isClosed ? (
                  <View
                    style={
                      styles.closedBar
                    }
                  >
                    <MaterialIcons
                      name="lock"
                      size={17}
                      color={
                        COLORS.green
                      }
                    />

                    <Text
                      style={
                        styles.closedBarText
                      }
                    >
                      This chat is read-only because the request is {request.status}.
                    </Text>
                  </View>
                ) : null}

                <View
                  style={
                    styles.composer
                  }
                >
                  {isClosed ? (
                    <View
                      style={
                        styles.readOnlyComposer
                      }
                    >
                      <MaterialIcons
                        name="lock"
                        size={17}
                        color={
                          COLORS.lightMuted
                        }
                      />

                      <Text
                        style={
                          styles.readOnlyText
                        }
                      >
                        Conversation closed
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View
                        style={
                          styles.inputContainer
                        }
                      >
                        <TextInput
                          value={
                            messageText
                          }
                          onChangeText={
                            setMessageText
                          }
                          placeholder="Message..."
                          placeholderTextColor={
                            COLORS.lightMuted
                          }
                          maxLength={1000}
                          multiline
                          style={
                            styles.messageInput
                          }
                        />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          (
                            sending ||
                            !messageText.trim()
                          ) &&
                            styles.sendButtonDisabled,
                        ]}
                        disabled={
                          sending ||
                          !messageText.trim()
                        }
                        onPress={
                          handleSendMessage
                        }
                      >
                        {sending ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        ) : (
                          <MaterialIcons
                            name="send"
                            size={19}
                            color={
                              COLORS.white
                            }
                          />
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            ) : null}
          </KeyboardAvoidingView>

          <Modal
            visible={
              scheduleModalVisible
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setScheduleModalVisible(
                false
              )
            }
          >
            <View
              style={
                styles.modalBackdrop
              }
            >
              <View
                style={
                  styles.scheduleModal
                }
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={
                      styles.modalTitleArea
                    }
                  >
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Donation Schedule
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Set the agreed donation date and time.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.modalClose
                    }
                    onPress={() =>
                      setScheduleModalVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={21}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  DATE
                </Text>

                <TouchableOpacity
                  style={
                    styles.selectorField
                  }
                  activeOpacity={0.8}
                  onPress={
                    openDatePicker
                  }
                >
                  <View
                    style={
                      styles.selectorIcon
                    }
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={18}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.selectorTextArea
                    }
                  >
                    <Text
                      style={
                        styles.selectorSmallLabel
                      }
                    >
                      Date
                    </Text>

                    <Text
                      style={
                        styles.selectorValue
                      }
                    >
                      {formatScheduleDateField()}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={
                      COLORS.lightMuted
                    }
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.inputLabel,
                    styles.timeInputLabel,
                  ]}
                >
                  TIME
                </Text>

                <TouchableOpacity
                  style={
                    styles.selectorField
                  }
                  activeOpacity={0.8}
                  onPress={
                    openTimePicker
                  }
                >
                  <View
                    style={
                      styles.selectorIcon
                    }
                  >
                    <MaterialIcons
                      name="schedule"
                      size={19}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.selectorTextArea
                    }
                  >
                    <Text
                      style={
                        styles.selectorSmallLabel
                      }
                    >
                      Time
                    </Text>

                    <Text
                      style={
                        styles.selectorValue
                      }
                    >
                      {formatScheduleTimeField()}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={
                      COLORS.lightMuted
                    }
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.inputLabel,
                    styles.noteInputLabel,
                  ]}
                >
                  NOTE
                </Text>

                <TextInput
                  value={
                    scheduleNote
                  }
                  onChangeText={
                    setScheduleNote
                  }
                  placeholder="Optional meeting note"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  style={[
                    styles.modalInput,
                    styles.modalNoteInput,
                  ]}
                />

                <TouchableOpacity
                  style={[
                    styles.saveScheduleButton,
                    savingSchedule &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    savingSchedule
                  }
                  onPress={
                    handleSaveSchedule
                  }
                >
                  {savingSchedule ? (
                    <ActivityIndicator
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="event-available"
                        size={20}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.saveScheduleText
                        }
                      >
                        Save Schedule
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={
              datePickerVisible
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setDatePickerVisible(
                false
              )
            }
          >
            <View
              style={
                styles.pickerBackdrop
              }
            >
              <View
                style={
                  styles.pickerCard
                }
              >
                <View
                  style={
                    styles.pickerHeader
                  }
                >
                  <Text
                    style={
                      styles.pickerTitle
                    }
                  >
                    Select Date
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.pickerClose
                    }
                    onPress={() =>
                      setDatePickerVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={21}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.calendarHeader
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.calendarArrow
                    }
                    onPress={() =>
                      changeCalendarMonth(
                        -1
                      )
                    }
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={21}
                      color={
                        COLORS.redButton
                      }
                    />
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.calendarMonth
                    }
                  >
                    {calendarCursor.toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.calendarArrow
                    }
                    onPress={() =>
                      changeCalendarMonth(
                        1
                      )
                    }
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={21}
                      color={
                        COLORS.redButton
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.weekHeader
                  }
                >
                  {[
                    'S',
                    'M',
                    'T',
                    'W',
                    'T',
                    'F',
                    'S',
                  ].map(
                    (
                      label,
                      index
                    ) => (
                      <Text
                        key={
                          `${label}-${index}`
                        }
                        style={
                          styles.weekHeaderText
                        }
                      >
                        {label}
                      </Text>
                    )
                  )}
                </View>

                <View
                  style={
                    styles.calendarGrid
                  }
                >
                  {getCalendarDays().map(
                    item => {
                      if (
                        item.type ===
                        'empty'
                      ) {
                        return (
                          <View
                            key={
                              item.key
                            }
                            style={
                              styles.calendarDayCell
                            }
                          />
                        );
                      }

                      const selected =
                        tempSelectedDate
                          ? isSameCalendarDate(
                              item.date,
                              tempSelectedDate
                            )
                          : false;

                      const past =
                        isPastCalendarDate(
                          item.date
                        );

                      return (
                        <TouchableOpacity
                          key={
                            item.key
                          }
                          style={
                            styles.calendarDayCell
                          }
                          disabled={
                            past
                          }
                          activeOpacity={0.8}
                          onPress={() =>
                            setTempSelectedDate(
                              item.date
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              past &&
                                styles.calendarDayTextDisabled,
                              selected &&
                                styles.calendarDayTextSelected,
                            ]}
                          >
                            {
                              item.date.getDate()
                            }
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmPickerButton,
                    !tempSelectedDate &&
                      styles.confirmPickerButtonDisabled,
                  ]}
                  disabled={
                    !tempSelectedDate
                  }
                  onPress={
                    confirmDatePicker
                  }
                >
                  <Text
                    style={
                      styles.confirmPickerButtonText
                    }
                  >
                    Confirm Date
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal
            visible={
              timePickerVisible
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setTimePickerVisible(
                false
              )
            }
          >
            <View
              style={
                styles.pickerBackdrop
              }
            >
              <View
                style={[
                  styles.pickerCard,
                  styles.timePickerCard,
                ]}
              >
                <View
                  style={
                    styles.pickerHeader
                  }
                >
                  <Text
                    style={
                      styles.pickerTitle
                    }
                  >
                    Select Time
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.pickerClose
                    }
                    onPress={() =>
                      setTimePickerVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={21}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.timePickerBody
                  }
                >
                  <View
                    style={
                      styles.timeColumn
                    }
                  >
                    <Text
                      style={
                        styles.timeColumnLabel
                      }
                    >
                      Hour
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.timeArrow
                      }
                      onPress={() =>
                        changeTempHour(
                          1
                        )
                      }
                    >
                      <MaterialIcons
                        name="keyboard-arrow-up"
                        size={23}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>

                    <View
                      style={
                        styles.timeValueBox
                      }
                    >
                      <Text
                        style={
                          styles.timeValueText
                        }
                      >
                        {padNumber(
                          tempHour
                        )}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.timeArrow
                      }
                      onPress={() =>
                        changeTempHour(
                          -1
                        )
                      }
                    >
                      <MaterialIcons
                        name="keyboard-arrow-down"
                        size={23}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={
                      styles.timeColon
                    }
                  >
                    :
                  </Text>

                  <View
                    style={
                      styles.timeColumn
                    }
                  >
                    <Text
                      style={
                        styles.timeColumnLabel
                      }
                    >
                      Minute
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.timeArrow
                      }
                      onPress={() =>
                        changeTempMinute(
                          5
                        )
                      }
                    >
                      <MaterialIcons
                        name="keyboard-arrow-up"
                        size={23}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>

                    <View
                      style={
                        styles.timeValueBox
                      }
                    >
                      <Text
                        style={
                          styles.timeValueText
                        }
                      >
                        {padNumber(
                          tempMinute
                        )}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.timeArrow
                      }
                      onPress={() =>
                        changeTempMinute(
                          -5
                        )
                      }
                    >
                      <MaterialIcons
                        name="keyboard-arrow-down"
                        size={23}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={
                      styles.periodColumn
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        tempPeriod ===
                          'AM' &&
                          styles.periodButtonSelected,
                      ]}
                      onPress={() =>
                        setTempPeriod(
                          'AM'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          tempPeriod ===
                            'AM' &&
                            styles.periodButtonTextSelected,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        tempPeriod ===
                          'PM' &&
                          styles.periodButtonSelected,
                      ]}
                      onPress={() =>
                        setTempPeriod(
                          'PM'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          tempPeriod ===
                            'PM' &&
                            styles.periodButtonTextSelected,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={
                    styles.confirmTimeButton
                  }
                  onPress={
                    confirmTimePicker
                  }
                >
                  <Text
                    style={
                      styles.confirmPickerButtonText
                    }
                  >
                    Confirm Time
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

    keyboardView: {
      flex: 1,
      backgroundColor:
        COLORS.page,
    },

    header: {
      minHeight: 96,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 42,
      height: 42,
      marginRight: 10,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.4,
      borderColor:
        'rgba(255,255,255,0.8)',
    },

    avatar: {
      width: 43,
      height: 43,
      marginRight: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(70,0,0,0.42)',
    },

    avatarText: {
      color:
        COLORS.white,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 13,
    },

    personInfo: {
      flex: 1,
      minWidth: 0,
    },

    personName: {
      color:
        COLORS.white,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 16,
      lineHeight: 21,
    },

    roleRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    onlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        '#54D77E',
    },

    roleText: {
      color:
        'rgba(255,255,255,0.8)',
      fontFamily:
        'Inter_400Regular',
      fontSize: 11,
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.page,
    },

    centerTitle: {
      marginTop: 13,
      color:
        COLORS.black,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 17,
      textAlign: 'center',
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
      marginTop: 16,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
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

    requestCard: {
      minHeight: 88,
      marginHorizontal: 16,
      marginTop: 13,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        '#DCCFCF',
      borderRadius: 14,
      backgroundColor:
        COLORS.white,
    },

    requestIcon: {
      width: 43,
      height: 43,
      marginRight: 10,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    requestInfo: {
      flex: 1,
      minWidth: 0,
    },

    badgeRow: {
      flexDirection: 'row',
      gap: 5,
    },

    redBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor:
        COLORS.redButton,
    },

    redBadgeText: {
      color:
        COLORS.white,
      fontFamily:
        'Inter_700Bold',
      fontSize: 9,
    },

    requestMeta: {
      marginTop: 7,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_500Medium',
      fontSize: 11,
    },

    viewRequestButton: {
      minHeight: 35,
      marginLeft: 7,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        '#D7D0D0',
      borderRadius: 8,
      backgroundColor:
        COLORS.white,
    },

    viewRequestText: {
      color:
        COLORS.black,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 10,
    },

    chatScroll: {
      flex: 1,
    },

    chatContent: {
      flexGrow: 1,
      paddingHorizontal: 18,
      paddingTop: 17,
      paddingBottom: 14,
    },

    dayDivider: {
      marginBottom: 17,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    dayLine: {
      flex: 1,
      height:
        StyleSheet.hairlineWidth,
      backgroundColor:
        '#E4E4E4',
    },

    dayText: {
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_500Medium',
      fontSize: 9,
    },

    emptyChat: {
      flex: 1,
      minHeight: 170,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },

    emptyChatIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    emptyChatTitle: {
      marginTop: 10,
      color:
        COLORS.black,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 14,
    },

    emptyChatDescription: {
      marginTop: 5,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },

    messageRow: {
      marginBottom: 11,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },

    messageRowMine: {
      justifyContent: 'flex-end',
    },

    messageRowOther: {
      justifyContent: 'flex-start',
    },

    messageAvatar: {
      width: 29,
      height: 29,
      marginRight: 7,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.redButton,
    },

    messageAvatarText: {
      color:
        COLORS.white,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 9,
    },

    messageStack: {
      maxWidth: '76%',
    },

    messageBubble: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 13,
    },

    myBubble: {
      borderBottomRightRadius: 4,
      backgroundColor:
        COLORS.pinkBubble,
    },

    otherBubble: {
      borderBottomLeftRadius: 4,
      backgroundColor:
        COLORS.grayBubble,
    },

    messageText: {
      color:
        COLORS.black,
      fontFamily:
        'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
    },

    messageTime: {
      marginTop: 4,
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 9,
    },

    messageTimeMine: {
      textAlign: 'right',
    },

    facilityCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor:
        COLORS.white,
    },

    facilityRow: {
      minHeight: 67,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    facilityIcon: {
      width: 41,
      height: 41,
      marginRight: 10,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    facilityInfo: {
      flex: 1,
      minWidth: 0,
    },

    facilityName: {
      color:
        COLORS.black,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 12,
    },

    facilityAddress: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 10,
    },

    locationAction: {
      marginLeft: 7,
      flexDirection: 'row',
      alignItems: 'center',
    },

    locationActionText: {
      color:
        COLORS.redButton,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 10,
    },

    facilityDivider: {
      height:
        StyleSheet.hairlineWidth,
      marginHorizontal: 12,
      backgroundColor:
        COLORS.border,
    },

    scheduleRow: {
      minHeight: 63,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    scheduleIcon: {
      width: 36,
      height: 36,
      marginRight: 9,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    scheduleInfo: {
      flex: 1,
    },

    scheduleLabel: {
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_500Medium',
      fontSize: 10,
    },

    scheduleValue: {
      marginTop: 2,
      color:
        COLORS.black,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 11,
    },

    scheduleNote: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 9,
    },

    scheduleAction: {
      color:
        COLORS.redButton,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 11,
    },

    fulfillRow: {
      minHeight: 62,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        '#CDE7D6',
      borderRadius: 13,
      backgroundColor:
        COLORS.greenLight,
    },

    fulfillTextArea: {
      flex: 1,
      paddingRight: 8,
    },

    fulfillTitle: {
      color:
        COLORS.green,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 11,
    },

    fulfillDescription: {
      marginTop: 2,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 9,
    },

    fulfillButton: {
      minHeight: 36,
      paddingHorizontal: 11,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.green,
    },

    fulfillButtonText: {
      color:
        COLORS.white,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 9,
    },

    closedBar: {
      minHeight: 48,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 12,
      backgroundColor:
        COLORS.greenLight,
    },

    closedBarText: {
      flex: 1,
      color:
        COLORS.green,
      fontFamily:
        'Inter_500Medium',
      fontSize: 10,
    },

    composer: {
      minHeight: 66,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      backgroundColor:
        COLORS.white,
    },

    inputContainer: {
      flex: 1,
      minHeight: 44,
      maxHeight: 92,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor:
        '#DDD6D6',
      borderRadius: 22,
      justifyContent: 'center',
      backgroundColor:
        '#FCFCFC',
    },

    messageInput: {
      maxHeight: 78,
      paddingVertical: 8,
      color:
        COLORS.black,
      fontFamily:
        'Inter_400Regular',
      fontSize: 12,
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.redButton,
    },

    sendButtonDisabled: {
      opacity: 0.35,
    },

    readOnlyComposer: {
      flex: 1,
      minHeight: 44,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor:
        '#EEEEEE',
    },

    readOnlyText: {
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_500Medium',
      fontSize: 11,
    },

    modalBackdrop: {
      flex: 1,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(0,0,0,0.55)',
    },

    scheduleModal: {
      width: '100%',
      maxWidth: 370,
      padding: 20,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,
    },

    modalHeader: {
      marginBottom: 19,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },

    modalTitleArea: {
      flex: 1,
      paddingRight: 12,
    },

    modalTitle: {
      color:
        COLORS.black,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 18,
    },

    modalSubtitle: {
      marginTop: 3,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 11,
      lineHeight: 16,
    },

    modalClose: {
      width: 35,
      height: 35,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#F2F2F2',
    },

    inputLabel: {
      marginBottom: 6,
      color:
        COLORS.muted,
      fontFamily:
        'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 0.6,
    },

    timeInputLabel: {
      marginTop: 14,
    },

    noteInputLabel: {
      marginTop: 14,
    },

    selectorField: {
      minHeight: 54,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#FAFAFA',
    },

    selectorIcon: {
      width: 34,
      height: 34,
      marginRight: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    selectorTextArea: {
      flex: 1,
    },

    selectorSmallLabel: {
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_400Regular',
      fontSize: 9,
    },

    selectorValue: {
      marginTop: 2,
      color:
        COLORS.black,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 12,
    },

    modalInput: {
      minHeight: 46,
      marginBottom: 14,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 10,
      color:
        COLORS.black,
      fontFamily:
        'Inter_400Regular',
      fontSize: 13,
      backgroundColor:
        '#FAFAFA',
    },

    modalNoteInput: {
      minHeight: 84,
      paddingTop: 12,
    },

    saveScheduleButton: {
      height: 48,
      marginTop: 3,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor:
        COLORS.redButton,
    },

    saveScheduleText: {
      color:
        COLORS.white,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 12,
    },

    pickerBackdrop: {
      flex: 1,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    pickerCard: {
      width: '100%',
      maxWidth: 330,
      padding: 18,
      borderRadius: 20,
      backgroundColor:
        COLORS.white,
    },

    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 17,
    },

    pickerTitle: {
      color:
        COLORS.black,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 17,
    },

    pickerClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#F2F2F2',
    },

    calendarHeader: {
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    calendarArrow: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.pink,
    },

    calendarMonth: {
      color:
        COLORS.black,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 13,
    },

    weekHeader: {
      flexDirection: 'row',
      marginBottom: 6,
    },

    weekHeaderText: {
      width: '14.2857%',
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 9,
      textAlign: 'center',
    },

    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 14,
    },

    calendarDayCell: {
      width: '14.2857%',
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },

    calendarDayText: {
      width: 31,
      height: 31,
      borderRadius: 16,
      color:
        COLORS.black,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 10,
      lineHeight: 31,
      textAlign: 'center',
    },

    calendarDayTextDisabled: {
      color:
        '#C7C7C7',
    },

    calendarDayTextSelected: {
      color:
        COLORS.white,
      backgroundColor:
        COLORS.redButton,
    },

    confirmPickerButton: {
      height: 45,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.redButton,
    },

    confirmPickerButtonDisabled: {
      opacity: 0.45,
    },

    confirmPickerButtonText: {
      color:
        COLORS.white,
      fontFamily:
        'Poppins_600SemiBold',
      fontSize: 11,
    },

    timePickerCard: {
      maxWidth: 320,
    },

    timePickerBody: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 3,
      marginBottom: 20,
    },

    timeColumn: {
      alignItems: 'center',
    },

    timeColumnLabel: {
      marginBottom: 4,
      color:
        COLORS.lightMuted,
      fontFamily:
        'Inter_500Medium',
      fontSize: 9,
    },

    timeArrow: {
      width: 38,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },

    timeValueBox: {
      width: 55,
      height: 50,
      borderWidth: 1,
      borderColor:
        '#E6B4B4',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#FFF8F8',
    },

    timeValueText: {
      color:
        COLORS.black,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 18,
    },

    timeColon: {
      marginHorizontal: 8,
      marginTop: 17,
      color:
        COLORS.black,
      fontFamily:
        'Poppins_700Bold',
      fontSize: 23,
    },

    periodColumn: {
      marginLeft: 14,
      marginTop: 18,
      gap: 8,
    },

    periodButton: {
      width: 43,
      height: 33,
      borderWidth: 1,
      borderColor:
        '#DADADA',
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.white,
    },

    periodButtonSelected: {
      borderColor:
        COLORS.redButton,
      backgroundColor:
        COLORS.redButton,
    },

    periodButtonText: {
      color:
        COLORS.black,
      fontFamily:
        'Inter_600SemiBold',
      fontSize: 10,
    },

    periodButtonTextSelected: {
      color:
        COLORS.white,
    },

    confirmTimeButton: {
      height: 45,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.redButton,
    },

    disabledButton: {
      opacity: 0.5,
    },
  });
