import { useCallback, useEffect, useRef, useState } from 'react';

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
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

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
  redDark: '#AF0808',
  redButton: '#DB0A0A',
  white: '#FFFFFF',
  black: '#000000',
  page: '#F5F5F5',
  muted: '#6A6A6A',
  lightMuted: '#737373',
  border: '#E6E6E6',
  pink: '#FFF1F1',
  pinkBubble: '#FFF0F0',
  grayBubble: '#E9E9E9',
  green: '#2E7D32',
  greenLight: '#EAF7EF',
};

/** Connect this callback to your authenticated backend before enabling submission.
 * Resolve only after the server has saved the feedback/report; reject on failure.
 * The server must derive the reported person from this authorized conversation.
 */
export type ConversationSupportSubmission = {
  kind: 'feedback' | 'report';
  requestId: string;
  responseId: string;
  reason?: string;
  details: string;
};

export type DonationCoordinationScreenProps = {
  onSubmitSupport?: (
    submission: ConversationSupportSubmission,
  ) => Promise<void>;
};

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Misleading information',
  'Other',
] as const;

export default function DonationCoordinationScreen({
  onSubmitSupport,
}: DonationCoordinationScreenProps = {}) {
  const [supportView, setSupportView] = useState<
    'menu' | 'feedback' | 'report' | 'success' | null
  >(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [submittedSupportKind, setSubmittedSupportKind] = useState<
    'feedback' | 'report'
  >('feedback');
  const insets = useSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const compactLayout = windowHeight < 700 || fontScale > 1.3;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(48);
  const nearBottom = useRef(true);
  const shouldScroll = useRef(true);
  const lastMessageId = useRef<CoordinationMessage['id'] | undefined>(
    undefined,
  );

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const params = useLocalSearchParams<{
    id?: string | string[];
    responseId?: string | string[];
  }>();

  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;

  const responseId = Array.isArray(params.responseId)
    ? params.responseId[0]
    : params.responseId;

  const scrollRef = useRef<ScrollView | null>(null);

  const [coordination, setCoordination] = useState<CoordinationSession | null>(
    null,
  );

  const [messages, setMessages] = useState<CoordinationMessage[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [messageText, setMessageText] = useState('');

  const [sending, setSending] = useState(false);

  const [fulfilling, setFulfilling] = useState(false);

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const [scheduleDate, setScheduleDate] = useState('');

  const [scheduleTime, setScheduleTime] = useState('');

  const [scheduleNote, setScheduleNote] = useState('');

  const [savingSchedule, setSavingSchedule] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const [calendarCursor, setCalendarCursor] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);

  const [tempHour, setTempHour] = useState(12);

  const [tempMinute, setTempMinute] = useState(0);

  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>('PM');

  const request = coordination?.request;

  const schedule = coordination?.schedule;

  const viewerRole = coordination?.viewer_role;

  const otherPerson =
    viewerRole === 'donor' ? coordination?.requester : coordination?.donor;

  const isClosed = request ? request.status !== 'active' : false;

  const loadCoordination = useCallback(async () => {
    if (!requestId || !responseId) {
      setError('Coordination information is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const [sessionResult, messagesResult] = await Promise.all([
        getCoordinationSession(token, requestId, responseId),
        getCoordinationMessages(token, requestId, responseId),
      ]);

      setCoordination(sessionResult.coordination);

      setMessages(messagesResult.messages || []);
    } catch (loadError) {
      console.log('LOAD COORDINATION ERROR:', loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load donation coordination.',
      );
    } finally {
      setLoading(false);
    }
  }, [requestId, responseId]);

  const loadMessages = useCallback(async () => {
    if (!requestId || !responseId) {
      return;
    }

    try {
      const token = await getAccessToken();

      if (!token) {
        return;
      }

      const result = await getCoordinationMessages(
        token,
        requestId,
        responseId,
      );

      setMessages(result.messages || []);
    } catch (messageError) {
      console.log('REFRESH COORDINATION MESSAGES ERROR:', messageError);
    }
  }, [requestId, responseId]);

  useFocusEffect(
    useCallback(() => {
      loadCoordination();
    }, [loadCoordination]),
  );

  useEffect(() => {
    if (!requestId || !responseId) {
      return;
    }

    const timer = setInterval(() => {
      loadMessages();
    }, 4000);

    return () => clearInterval(timer);
  }, [requestId, responseId, loadMessages]);

  useEffect(() => {
    const newestId = messages[messages.length - 1]?.id;
    if (newestId !== lastMessageId.current) {
      shouldScroll.current = nearBottom.current;
      lastMessageId.current = newestId;
      if (shouldScroll.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }
  }, [messages]);

  function getOtherName() {
    if (!otherPerson) {
      return 'Hemo-Hero User';
    }

    return (
      otherPerson.full_name ||
      [otherPerson.first_name, otherPerson.last_name]
        .filter(Boolean)
        .join(' ') ||
      'Hemo-Hero User'
    );
  }

  function getInitials() {
    const initials = [otherPerson?.first_name, otherPerson?.last_name]
      .filter(Boolean)
      .map((value) => String(value).charAt(0).toUpperCase())
      .join('');

    return initials || 'H';
  }

  function getOtherRoleLabel() {
    return viewerRole === 'requester' ? 'Accepted Donor' : 'Blood Requester';
  }

  function formatMessageTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatMessageDay(value?: string) {
    if (!value) {
      return 'TODAY';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'TODAY';
    }

    return date
      .toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      .toUpperCase();
  }

  function formatSchedule(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function localDateValue(date: Date) {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function localTimeValue(date: Date) {
    const hour = String(date.getHours()).padStart(2, '0');

    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${hour}:${minute}`;
  }

  function padNumber(value: number) {
    return String(value).padStart(2, '0');
  }

  function toIsoDate(date: Date) {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
      date.getDate(),
    )}`;
  }

  function isSameCalendarDate(first: Date, second: Date) {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  function getCalendarDays() {
    const year = calendarCursor.getFullYear();

    const month = calendarCursor.getMonth();

    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

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

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      days.push({
        type: 'empty',
        key: `empty-${index}`,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);

      days.push({
        type: 'day',
        key: toIsoDate(date),
        date,
      });
    }

    return days;
  }

  function isPastCalendarDate(date: Date) {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const candidate = new Date(date);

    candidate.setHours(0, 0, 0, 0);

    return candidate.getTime() < today.getTime();
  }

  function formatScheduleDateField() {
    if (!scheduleDate) {
      return 'Select Date';
    }

    const date = new Date(`${scheduleDate}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return 'Select Date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatScheduleTimeField() {
    if (!scheduleTime) {
      return 'Select Time';
    }

    const [hourText, minuteText] = scheduleTime.split(':');

    const date = new Date();

    date.setHours(Number(hourText), Number(minuteText), 0, 0);

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function showMessage(title: string, description: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${description}`);
      return;
    }

    Alert.alert(title, description);
  }

  function handleViewRequest() {
    if (!request) {
      return;
    }

    if (viewerRole === 'donor') {
      router.push(`/blood-request/donor/${request.id}` as any);
      return;
    }

    router.push(`/blood-request/${request.id}` as any);
  }

  async function openLocation() {
    if (!request) {
      return;
    }

    let url = '';

    if (
      request.facility_latitude !== null &&
      request.facility_latitude !== undefined &&
      request.facility_longitude !== null &&
      request.facility_longitude !== undefined
    ) {
      url = `https://www.google.com/maps/search/?api=1&query=${request.facility_latitude},${request.facility_longitude}`;
    } else {
      const query = request.facility_address || request.facility_name;

      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query,
      )}`;
    }

    try {
      await Linking.openURL(url);
    } catch {
      showMessage(
        'Unable to Open Map',
        'The facility location could not be opened.',
      );
    }
  }

  async function handleSendMessage() {
    const cleanMessage = messageText.trim();

    if (!cleanMessage || !requestId || !responseId || sending || isClosed) {
      return;
    }

    try {
      setSending(true);

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const result = await sendCoordinationMessage(
        token,
        requestId,
        responseId,
        cleanMessage,
      );

      setMessageText('');

      if (result?.data) {
        setMessages((current) => [...current, result.data]);
      } else {
        await loadMessages();
      }

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      }, 80);
    } catch (sendError) {
      console.log('SEND MESSAGE ERROR:', sendError);

      showMessage(
        'Unable to Send Message',
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send your message.',
      );
    } finally {
      setSending(false);
    }
  }

  function handleOpenSchedule() {
    if (!coordination || isClosed) {
      return;
    }

    let date = new Date(Date.now() + 60 * 60 * 1000);

    date.setSeconds(0, 0);

    if (date.getMinutes() < 30) {
      date.setMinutes(30);
    } else {
      date.setHours(date.getHours() + 1, 0, 0, 0);
    }

    if (schedule?.scheduled_at) {
      const existing = new Date(schedule.scheduled_at);

      if (
        !Number.isNaN(existing.getTime()) &&
        existing.getTime() > Date.now()
      ) {
        date = existing;
      }
    }

    setScheduleDate(localDateValue(date));

    setScheduleTime(localTimeValue(date));

    setScheduleNote(schedule?.note || '');

    setDatePickerVisible(false);
    setTimePickerVisible(false);
    setScheduleModalVisible(true);
  }

  function openDatePicker() {
    let selected = new Date();

    if (scheduleDate) {
      const existing = new Date(`${scheduleDate}T12:00:00`);

      if (!Number.isNaN(existing.getTime())) {
        selected = existing;
      }
    }

    setTempSelectedDate(selected);

    setCalendarCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));

    setDatePickerVisible(true);
  }

  function confirmDatePicker() {
    if (!tempSelectedDate) {
      return;
    }

    setScheduleDate(toIsoDate(tempSelectedDate));

    setDatePickerVisible(false);
  }

  function changeCalendarMonth(offset: number) {
    setCalendarCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function openTimePicker() {
    let hour24 = new Date().getHours();

    let minute = new Date().getMinutes();

    if (scheduleTime && /^\d{2}:\d{2}$/.test(scheduleTime)) {
      const [hourText, minuteText] = scheduleTime.split(':');

      hour24 = Number(hourText);

      minute = Number(minuteText);
    }

    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';

    const hour12 = hour24 % 12 || 12;

    setTempHour(hour12);

    setTempMinute(Math.min(55, Math.max(0, Math.round(minute / 5) * 5)));

    setTempPeriod(period);

    setTimePickerVisible(true);
  }

  function changeTempHour(offset: number) {
    setTempHour((current) => {
      let next = current + offset;

      if (next > 12) {
        next = 1;
      }

      if (next < 1) {
        next = 12;
      }

      return next;
    });
  }

  function changeTempMinute(offset: number) {
    setTempMinute((current) => {
      let next = current + offset;

      if (next > 55) {
        next = 0;
      }

      if (next < 0) {
        next = 55;
      }

      return next;
    });
  }

  function confirmTimePicker() {
    let hour24 = tempHour % 12;

    if (tempPeriod === 'PM') {
      hour24 += 12;
    }

    setScheduleTime(`${padNumber(hour24)}:${padNumber(tempMinute)}`);

    setTimePickerVisible(false);
  }

  async function handleSaveSchedule() {
    if (!requestId || !responseId || savingSchedule) {
      return;
    }

    if (!scheduleDate) {
      showMessage('Select a Date', 'Choose a donation date before saving.');
      return;
    }

    if (!scheduleTime) {
      showMessage('Select a Time', 'Choose a donation time before saving.');
      return;
    }

    const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}:00`);

    if (
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate.getTime() <= Date.now()
    ) {
      showMessage('Invalid Schedule', 'Choose a future date and time.');
      return;
    }

    try {
      setSavingSchedule(true);

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      await saveCoordinationSchedule(
        token,
        requestId,
        responseId,
        scheduledDate.toISOString(),
        scheduleNote,
      );

      setScheduleModalVisible(false);

      await loadCoordination();
    } catch (scheduleError) {
      console.log('SAVE SCHEDULE ERROR:', scheduleError);

      showMessage(
        'Unable to Save Schedule',
        scheduleError instanceof Error
          ? scheduleError.message
          : 'Unable to save the donation schedule.',
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  function handleFulfill() {
    if (
      !request ||
      viewerRole !== 'requester' ||
      request.status !== 'active' ||
      fulfilling
    ) {
      return;
    }

    const description =
      'Only mark the request as fulfilled after the needed blood has been secured or the donation has been completed.';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Mark Request as Fulfilled\n\n${description}`)) {
        performFulfill();
      }
      return;
    }

    Alert.alert('Mark Request as Fulfilled', description, [
      {
        text: 'Not Yet',
        style: 'cancel',
      },
      {
        text: 'Mark Fulfilled',
        onPress: performFulfill,
      },
    ]);
  }

  async function performFulfill() {
    if (!request || fulfilling) {
      return;
    }

    try {
      setFulfilling(true);

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      await fulfillBloodRequest(token, request.id);

      await loadCoordination();

      showMessage(
        'Request Fulfilled',
        'The blood request has been completed successfully.',
      );
    } catch (fulfillError) {
      showMessage(
        'Unable to Complete Request',
        fulfillError instanceof Error
          ? fulfillError.message
          : 'Unable to mark the request as fulfilled.',
      );
    } finally {
      setFulfilling(false);
    }
  }

  const canSubmitSupport =
    Boolean(onSubmitSupport && requestId && responseId) &&
    !supportSending &&
    (supportView === 'report'
      ? Boolean(reportReason)
      : Boolean(feedbackText.trim()));

  function closeSupport() {
    if (!supportSending) setSupportView(null);
  }

  async function handleSubmitSupport() {
    if (
      !onSubmitSupport ||
      !requestId ||
      !responseId ||
      !canSubmitSupport ||
      (supportView !== 'feedback' && supportView !== 'report')
    )
      return;
    const kind = supportView;
    try {
      setSupportSending(true);
      setSupportError('');
      await onSubmitSupport({
        kind,
        requestId,
        responseId,
        ...(kind === 'report' ? { reason: reportReason } : {}),
        details: (kind === 'report' ? reportText : feedbackText).trim(),
      });
      setSubmittedSupportKind(kind);
      setSupportView('success');
      if (kind === 'report') {
        setReportText('');
        setReportReason('');
      } else setFeedbackText('');
    } catch (submissionError) {
      setSupportError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to send. Please try again.',
      );
    } finally {
      setSupportSending(false);
    }
  }

  const donationDetails = request ? (
    <View style={styles.detailsPanel}>
      <View style={styles.facilityRow}>
        <View style={styles.facilityIcon}>
          <MaterialIcons
            name="location-on"
            size={22}
            color={COLORS.redButton}
          />
        </View>
        <View style={styles.facilityInfo}>
          <Text style={styles.scheduleLabel}>MEETING LOCATION</Text>
          <Text style={styles.facilityName}>{request.facility_name}</Text>
          {request.facility_address ? (
            <Text numberOfLines={2} style={styles.facilityAddress}>
              {request.facility_address}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open facility location in maps"
          style={styles.mapButton}
          onPress={openLocation}
        >
          <MaterialIcons name="near-me" size={21} color={COLORS.redButton} />
        </TouchableOpacity>
      </View>
      <View style={styles.facilityDivider} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          schedule ? 'Edit donation schedule' : 'Set donation schedule'
        }
        accessibilityState={{ disabled: isClosed }}
        disabled={isClosed}
        style={styles.scheduleRow}
        onPress={handleOpenSchedule}
      >
        <View style={styles.scheduleIcon}>
          <MaterialIcons name="event" size={22} color={COLORS.redButton} />
        </View>
        <View style={styles.scheduleInfo}>
          <Text style={styles.scheduleLabel}>DONATION SCHEDULE</Text>
          <Text style={styles.scheduleValue}>
            {schedule
              ? formatSchedule(schedule.scheduled_at)
              : 'Choose a date & time'}
          </Text>
          {schedule?.note ? (
            <Text numberOfLines={2} style={styles.scheduleNote}>
              {schedule.note}
            </Text>
          ) : null}
        </View>
        {!isClosed ? (
          <Text style={styles.scheduleAction}>{schedule ? 'Edit' : 'Set'}</Text>
        ) : null}
      </TouchableOpacity>
      {viewerRole === 'requester' && request.status === 'active' ? (
        <View style={styles.fulfillRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.fulfillTitle}>Donation complete?</Text>
            <Text style={styles.fulfillDescription}>
              Close when blood is secured.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.fulfillButton, fulfilling && styles.disabledButton]}
            disabled={fulfilling}
            onPress={handleFulfill}
          >
            {fulfilling ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <MaterialIcons
                  name="check-circle-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.fulfillButtonText}>Mark fulfilled</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  ) : null;

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          <LinearGradient
            colors={[COLORS.red, COLORS.redDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={23} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.personInfo}>
              <Text numberOfLines={1} style={styles.personName}>
                {loading ? 'Connecting…' : getOtherName()}
              </Text>
              <View style={styles.headerRoleRow}>
                <Text numberOfLines={1} style={styles.roleText}>
                  {loading ? 'Loading conversation' : getOtherRoleLabel()}
                </Text>
                {viewerRole === 'requester' &&
                coordination?.donor?.is_verified ? (
                  <View
                    accessible
                    accessibilityLabel="Verified donor"
                    style={styles.verifiedBadge}
                  >
                    <MaterialIcons
                      name="verified"
                      size={14}
                      color={COLORS.green}
                    />
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Feedback and reporting"
              accessibilityHint="Opens options to give feedback or report this person"
              accessibilityState={{ disabled: loading || !coordination }}
              disabled={loading || !coordination}
              activeOpacity={0.7}
              style={[
                styles.moreButton,
                (loading || !coordination) && styles.disabledButton,
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setSupportError('');
                setSupportView('menu');
              }}
            >
              <MaterialIcons name="more-vert" size={26} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          >
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={COLORS.redButton} />
                <Text style={styles.centerTitle}>
                  Opening your conversation
                </Text>
                <Text style={styles.centerDescription}>
                  Getting your donation details ready.
                </Text>
              </View>
            ) : error ? (
              <View style={styles.centerState}>
                <MaterialIcons
                  name="error-outline"
                  size={42}
                  color={COLORS.redButton}
                />
                <Text style={styles.centerTitle}>Unable to load chat</Text>
                <Text style={styles.centerDescription}>{error}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.retryButton}
                  onPress={loadCoordination}
                >
                  <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : coordination && request ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="View blood request details"
                  activeOpacity={0.8}
                  style={styles.requestCard}
                  onPress={handleViewRequest}
                >
                  <View style={styles.bloodTypeBadge}>
                    <MaterialIcons
                      name="bloodtype"
                      size={18}
                      color={COLORS.redButton}
                    />
                    <Text style={styles.bloodTypeText}>
                      {request.blood_type}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <View style={styles.badgeRow}>
                      <Text
                        style={[
                          styles.urgencyLabel,
                          isClosed && styles.neutralLabel,
                        ]}
                      >
                        {isClosed
                          ? request.status
                          : request.urgency === 'urgent'
                            ? 'URGENT REQUEST'
                            : 'SCHEDULED REQUEST'}
                      </Text>
                      <Text style={styles.unitLabel}>
                        {request.units_needed}{' '}
                        {request.units_needed === 1 ? 'unit' : 'units'}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.requestFacility}>
                      {request.facility_name}
                    </Text>
                    <Text style={styles.requestHint}>View blood request</Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>

                <ScrollView
                  ref={scrollRef}
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={
                    Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                  }
                  scrollEventThrottle={100}
                  onScroll={({ nativeEvent }) => {
                    nearBottom.current =
                      nativeEvent.contentSize.height -
                        nativeEvent.layoutMeasurement.height -
                        nativeEvent.contentOffset.y <
                      100;
                  }}
                  onContentSizeChange={() => {
                    if (shouldScroll.current) {
                      scrollRef.current?.scrollToEnd({ animated: false });
                      shouldScroll.current = false;
                    }
                  }}
                >
                  {compactLayout && !keyboardVisible ? donationDetails : null}

                  {messages.length === 0 ? (
                    <View style={styles.emptyChat}>
                      <View style={styles.emptyChatIcon}>
                        <MaterialIcons
                          name="chat-bubble-outline"
                          size={30}
                          color={COLORS.redButton}
                        />
                      </View>
                      <Text style={styles.emptyChatTitle}>
                        A conversation that matters
                      </Text>
                      <Text style={styles.emptyChatDescription}>
                        Say hello to {getOtherName()}. Agree on a donation time
                        and where to meet.
                      </Text>
                      {!isClosed ? (
                        <View style={styles.quickReplies}>
                          {(viewerRole === 'donor'
                            ? [
                                'Hi! I’m available to donate.',
                                'What time should we meet?',
                              ]
                            : [
                                'Hi! Thank you for helping.',
                                'When are you available?',
                              ]
                          ).map((reply) => (
                            <TouchableOpacity
                              key={reply}
                              accessibilityRole="button"
                              accessibilityLabel={`Use message: ${reply}`}
                              style={styles.quickReply}
                              onPress={() => setMessageText(reply)}
                            >
                              <Text style={styles.quickReplyText}>{reply}</Text>
                              <MaterialIcons
                                name="add"
                                size={16}
                                color={COLORS.redButton}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    messages.map((message, index) => (
                      <View key={message.id}>
                        {index === 0 ||
                        new Date(message.created_at).toDateString() !==
                          new Date(
                            messages[index - 1].created_at,
                          ).toDateString() ? (
                          <View style={styles.dayDivider}>
                            <View style={styles.dayLine} />
                            <Text style={styles.dayText}>
                              {formatMessageDay(message.created_at)}
                            </Text>
                            <View style={styles.dayLine} />
                          </View>
                        ) : null}
                        <View
                          style={[
                            styles.messageRow,
                            message.is_mine
                              ? styles.messageRowMine
                              : styles.messageRowOther,
                          ]}
                        >
                          {!message.is_mine ? (
                            <View style={styles.messageAvatar}>
                              <Text style={styles.messageAvatarText}>
                                {message.sender?.first_name
                                  ?.charAt(0)
                                  .toUpperCase() || getInitials().charAt(0)}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.messageStack}>
                            <View
                              style={[
                                styles.messageBubble,
                                message.is_mine
                                  ? styles.myBubble
                                  : styles.otherBubble,
                              ]}
                            >
                              <Text
                                selectable
                                style={[
                                  styles.messageText,
                                  message.is_mine && styles.myMessageText,
                                ]}
                              >
                                {message.message}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.messageTime,
                                message.is_mine && styles.messageTimeMine,
                              ]}
                            >
                              {formatMessageTime(message.created_at)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                {!compactLayout && !keyboardVisible ? donationDetails : null}

                {isClosed ? (
                  <View style={styles.closedBar}>
                    <MaterialIcons
                      name="lock-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.closedBarText}>
                      This request is {request.status}. You can still read the
                      conversation.
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.composer,
                    {
                      paddingBottom: keyboardVisible
                        ? 10
                        : Math.max(insets.bottom, 12),
                    },
                  ]}
                >
                  {isClosed ? (
                    <View style={styles.readOnlyComposer}>
                      <Text style={styles.readOnlyText}>
                        Conversation closed
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.inputContainer}>
                        <TextInput
                          value={messageText}
                          onChangeText={setMessageText}
                          accessibilityLabel="Message"
                          placeholder="Write a message…"
                          placeholderTextColor={COLORS.lightMuted}
                          maxLength={1000}
                          multiline
                          onContentSizeChange={({ nativeEvent }) =>
                            setComposerHeight(
                              Math.max(
                                48,
                                Math.min(110, nativeEvent.contentSize.height),
                              ),
                            )
                          }
                          style={[
                            styles.messageInput,
                            { height: composerHeight },
                          ]}
                        />
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        accessibilityState={{
                          disabled: sending || !messageText.trim(),
                          busy: sending,
                        }}
                        style={[
                          styles.sendButton,
                          (sending || !messageText.trim()) &&
                            styles.sendButtonDisabled,
                        ]}
                        disabled={sending || !messageText.trim()}
                        onPress={handleSendMessage}
                      >
                        {sending ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.white}
                          />
                        ) : (
                          <MaterialIcons
                            name="arrow-upward"
                            size={24}
                            color={COLORS.white}
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
            visible={supportView !== null}
            transparent
            animationType="slide"
            onRequestClose={closeSupport}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.supportBackdrop}
            >
              <View
                style={[
                  styles.supportSheet,
                  { maxHeight: Math.max(240, windowHeight - insets.top - 24) },
                ]}
              >
                <View style={styles.sheetHandle} />
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingHorizontal: 22,
                    paddingBottom: Math.max(insets.bottom, 20),
                  }}
                >
                  <View style={styles.supportHeader}>
                    {supportView === 'feedback' || supportView === 'report' ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Back to chat options"
                        disabled={supportSending}
                        style={styles.supportBack}
                        onPress={() => {
                          setSupportError('');
                          setSupportView('menu');
                        }}
                      >
                        <MaterialIcons
                          name="arrow-back"
                          size={22}
                          color={COLORS.black}
                        />
                      </TouchableOpacity>
                    ) : null}
                    <Text
                      accessibilityRole="header"
                      style={styles.supportTitle}
                    >
                      {supportView === 'menu'
                        ? 'Chat options'
                        : supportView === 'feedback'
                          ? 'Give feedback'
                          : supportView === 'report'
                            ? 'Report person'
                            : submittedSupportKind === 'report'
                              ? 'Report sent'
                              : 'Feedback sent'}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Close chat options"
                      disabled={supportSending}
                      style={styles.supportClose}
                      onPress={closeSupport}
                    >
                      <MaterialIcons
                        name="close"
                        size={22}
                        color={COLORS.black}
                      />
                    </TouchableOpacity>
                  </View>
                  {supportView === 'menu' ? (
                    <>
                      <View style={styles.supportPerson}>
                        <View style={styles.supportAvatar}>
                          <Text style={styles.supportInitials}>
                            {getInitials()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.supportPersonName}>
                            {getOtherName()}
                          </Text>
                          <Text style={styles.supportDescription}>
                            {getOtherRoleLabel()}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Give feedback"
                        style={styles.supportOption}
                        onPress={() => setSupportView('feedback')}
                      >
                        <View style={styles.supportOptionIcon}>
                          <MaterialIcons
                            name="chat-bubble-outline"
                            size={22}
                            color={COLORS.black}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.supportOptionTitle}>
                            Give feedback
                          </Text>
                          <Text style={styles.supportDescription}>
                            Share your coordination experience
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={23}
                          color={COLORS.muted}
                        />
                      </TouchableOpacity>
                      <View style={styles.supportDivider} />
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Report person"
                        style={styles.supportOption}
                        onPress={() => setSupportView('report')}
                      >
                        <View
                          style={[
                            styles.supportOptionIcon,
                            { backgroundColor: COLORS.pink },
                          ]}
                        >
                          <MaterialIcons
                            name="outlined-flag"
                            size={24}
                            color={COLORS.red}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.supportOptionTitle,
                              { color: COLORS.red },
                            ]}
                          >
                            Report person
                          </Text>
                          <Text style={styles.supportDescription}>
                            Tell us about a concern
                          </Text>
                        </View>
                        <MaterialIcons
                          name="chevron-right"
                          size={23}
                          color={COLORS.muted}
                        />
                      </TouchableOpacity>
                    </>
                  ) : supportView === 'success' ? (
                    <View style={styles.supportSuccess}>
                      <MaterialIcons
                        name="check-circle-outline"
                        size={42}
                        color={COLORS.green}
                      />
                      <Text style={styles.supportDescription}>
                        {submittedSupportKind === 'report'
                          ? 'Your report has been submitted.'
                          : 'Thank you for sharing your experience.'}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.supportSubmit}
                        onPress={closeSupport}
                      >
                        <Text style={styles.supportSubmitText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.supportIntro}>
                        {supportView === 'report'
                          ? `What would you like to report about ${getOtherName()}?`
                          : `How was your experience coordinating with ${getOtherName()}?`}
                      </Text>
                      {supportView === 'report' ? (
                        <>
                          <Text style={styles.supportFieldLabel}>Reason</Text>
                          <View
                            accessibilityRole="radiogroup"
                            accessibilityLabel="Report reason"
                            style={styles.reportReasons}
                          >
                            {REPORT_REASONS.map((reason) => (
                              <TouchableOpacity
                                key={reason}
                                accessibilityRole="radio"
                                accessibilityLabel={reason}
                                accessibilityState={{
                                  checked: reportReason === reason,
                                  disabled: supportSending,
                                }}
                                disabled={supportSending}
                                style={[
                                  styles.reportReason,
                                  reportReason === reason &&
                                    styles.reportReasonSelected,
                                ]}
                                onPress={() => setReportReason(reason)}
                              >
                                <MaterialIcons
                                  name={
                                    reportReason === reason
                                      ? 'radio-button-checked'
                                      : 'radio-button-unchecked'
                                  }
                                  size={20}
                                  color={
                                    reportReason === reason
                                      ? COLORS.red
                                      : COLORS.muted
                                  }
                                />
                                <Text style={styles.reportReasonText}>
                                  {reason}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      ) : null}
                      <Text style={styles.supportFieldLabel}>
                        {supportView === 'report'
                          ? 'Details (optional)'
                          : 'Your feedback'}
                      </Text>
                      <TextInput
                        accessibilityLabel={
                          supportView === 'report'
                            ? 'Report details'
                            : 'Your feedback'
                        }
                        value={
                          supportView === 'report' ? reportText : feedbackText
                        }
                        onChangeText={
                          supportView === 'report'
                            ? setReportText
                            : setFeedbackText
                        }
                        placeholder={
                          supportView === 'report'
                            ? 'Describe what happened…'
                            : 'Tell us what went well or what could improve…'
                        }
                        placeholderTextColor={COLORS.lightMuted}
                        multiline
                        maxLength={1000}
                        editable={!supportSending}
                        textAlignVertical="top"
                        style={styles.supportInput}
                      />
                      <Text style={styles.supportCharacterCount}>
                        {
                          (supportView === 'report' ? reportText : feedbackText)
                            .length
                        }
                        /1000
                      </Text>
                      {!onSubmitSupport ? (
                        <View style={styles.supportAvailability}>
                          <MaterialIcons
                            name="info-outline"
                            size={18}
                            color={COLORS.muted}
                          />
                          <Text style={styles.supportAvailabilityText}>
                            {supportView === 'report'
                              ? 'Report submission is not available yet.'
                              : 'Feedback submission is not available yet.'}
                          </Text>
                        </View>
                      ) : null}
                      {supportError ? (
                        <Text
                          accessibilityRole="alert"
                          accessibilityLiveRegion="polite"
                          style={styles.supportError}
                        >
                          {supportError}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={
                          supportView === 'report'
                            ? 'Send report'
                            : 'Send feedback'
                        }
                        accessibilityState={{
                          disabled: !canSubmitSupport,
                          busy: supportSending,
                        }}
                        disabled={!canSubmitSupport}
                        style={[
                          styles.supportSubmit,
                          !canSubmitSupport && styles.disabledButton,
                        ]}
                        onPress={handleSubmitSupport}
                      >
                        {supportSending ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <Text style={styles.supportSubmitText}>
                            {supportView === 'report'
                              ? 'Send report'
                              : 'Send feedback'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          <Modal
            visible={scheduleModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (datePickerVisible) setDatePickerVisible(false);
              else if (timePickerVisible) setTimePickerVisible(false);
              else if (!savingSchedule) setScheduleModalVisible(false);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalBackdrop}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.scheduleModal}
                contentContainerStyle={styles.modalContent}
              >
                {datePickerVisible ? (
                  <>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Select Date</Text>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Back to schedule"
                        style={styles.pickerClose}
                        onPress={() => setDatePickerVisible(false)}
                      >
                        <MaterialIcons
                          name="close"
                          size={21}
                          color={COLORS.black}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.calendarHeader}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Previous month"
                        style={styles.calendarArrow}
                        onPress={() => changeCalendarMonth(-1)}
                      >
                        <MaterialIcons
                          name="chevron-left"
                          size={21}
                          color={COLORS.redButton}
                        />
                      </TouchableOpacity>

                      <Text style={styles.calendarMonth}>
                        {calendarCursor.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Next month"
                        style={styles.calendarArrow}
                        onPress={() => changeCalendarMonth(1)}
                      >
                        <MaterialIcons
                          name="chevron-right"
                          size={21}
                          color={COLORS.redButton}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.weekHeader}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                        (label, index) => (
                          <Text
                            key={`${label}-${index}`}
                            style={styles.weekHeaderText}
                          >
                            {label}
                          </Text>
                        ),
                      )}
                    </View>

                    <View style={styles.calendarGrid}>
                      {getCalendarDays().map((item) => {
                        if (item.type === 'empty') {
                          return (
                            <View
                              key={item.key}
                              style={styles.calendarDayCell}
                            />
                          );
                        }

                        const selected = tempSelectedDate
                          ? isSameCalendarDate(item.date, tempSelectedDate)
                          : false;

                        const past = isPastCalendarDate(item.date);

                        return (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={item.date.toLocaleDateString(
                              'en-US',
                              {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )}
                            accessibilityState={{ disabled: past, selected }}
                            key={item.key}
                            style={styles.calendarDayCell}
                            disabled={past}
                            activeOpacity={0.8}
                            onPress={() => setTempSelectedDate(item.date)}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                past && styles.calendarDayTextDisabled,
                                selected && styles.calendarDayTextSelected,
                              ]}
                            >
                              {item.date.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.confirmPickerButton,
                        !tempSelectedDate && styles.confirmPickerButtonDisabled,
                      ]}
                      disabled={!tempSelectedDate}
                      onPress={confirmDatePicker}
                    >
                      <Text style={styles.confirmPickerButtonText}>
                        Confirm Date
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : timePickerVisible ? (
                  <>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Select Time</Text>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Back to schedule"
                        style={styles.pickerClose}
                        onPress={() => setTimePickerVisible(false)}
                      >
                        <MaterialIcons
                          name="close"
                          size={21}
                          color={COLORS.black}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timePickerBody}>
                      <View style={styles.timeColumn}>
                        <Text style={styles.timeColumnLabel}>Hour</Text>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Increase hour"
                          style={styles.timeArrow}
                          onPress={() => changeTempHour(1)}
                        >
                          <MaterialIcons
                            name="keyboard-arrow-up"
                            size={23}
                            color={COLORS.redButton}
                          />
                        </TouchableOpacity>

                        <View style={styles.timeValueBox}>
                          <Text style={styles.timeValueText}>
                            {padNumber(tempHour)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Decrease hour"
                          style={styles.timeArrow}
                          onPress={() => changeTempHour(-1)}
                        >
                          <MaterialIcons
                            name="keyboard-arrow-down"
                            size={23}
                            color={COLORS.redButton}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.timeColon}>:</Text>

                      <View style={styles.timeColumn}>
                        <Text style={styles.timeColumnLabel}>Minute</Text>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Increase minute"
                          style={styles.timeArrow}
                          onPress={() => changeTempMinute(5)}
                        >
                          <MaterialIcons
                            name="keyboard-arrow-up"
                            size={23}
                            color={COLORS.redButton}
                          />
                        </TouchableOpacity>

                        <View style={styles.timeValueBox}>
                          <Text style={styles.timeValueText}>
                            {padNumber(tempMinute)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Decrease minute"
                          style={styles.timeArrow}
                          onPress={() => changeTempMinute(-5)}
                        >
                          <MaterialIcons
                            name="keyboard-arrow-down"
                            size={23}
                            color={COLORS.redButton}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.periodColumn}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={[
                            styles.periodButton,
                            tempPeriod === 'AM' && styles.periodButtonSelected,
                          ]}
                          onPress={() => setTempPeriod('AM')}
                        >
                          <Text
                            style={[
                              styles.periodButtonText,
                              tempPeriod === 'AM' &&
                                styles.periodButtonTextSelected,
                            ]}
                          >
                            AM
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          style={[
                            styles.periodButton,
                            tempPeriod === 'PM' && styles.periodButtonSelected,
                          ]}
                          onPress={() => setTempPeriod('PM')}
                        >
                          <Text
                            style={[
                              styles.periodButtonText,
                              tempPeriod === 'PM' &&
                                styles.periodButtonTextSelected,
                            ]}
                          >
                            PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.confirmTimeButton}
                      onPress={confirmTimePicker}
                    >
                      <Text style={styles.confirmPickerButtonText}>
                        Confirm Time
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.modalHeader}>
                      <View style={styles.modalTitleArea}>
                        <Text style={styles.modalTitle}>Donation Schedule</Text>

                        <Text style={styles.modalSubtitle}>
                          Set the agreed donation date and time.
                        </Text>
                      </View>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Close schedule"
                        style={styles.modalClose}
                        onPress={() => setScheduleModalVisible(false)}
                      >
                        <MaterialIcons
                          name="close"
                          size={21}
                          color={COLORS.black}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>DATE</Text>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.selectorField}
                      activeOpacity={0.8}
                      onPress={openDatePicker}
                    >
                      <View style={styles.selectorIcon}>
                        <MaterialIcons
                          name="calendar-today"
                          size={18}
                          color={COLORS.redButton}
                        />
                      </View>

                      <View style={styles.selectorTextArea}>
                        <Text style={styles.selectorSmallLabel}>Date</Text>

                        <Text style={styles.selectorValue}>
                          {formatScheduleDateField()}
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.lightMuted}
                      />
                    </TouchableOpacity>

                    <Text style={[styles.inputLabel, styles.timeInputLabel]}>
                      TIME
                    </Text>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.selectorField}
                      activeOpacity={0.8}
                      onPress={openTimePicker}
                    >
                      <View style={styles.selectorIcon}>
                        <MaterialIcons
                          name="schedule"
                          size={19}
                          color={COLORS.redButton}
                        />
                      </View>

                      <View style={styles.selectorTextArea}>
                        <Text style={styles.selectorSmallLabel}>Time</Text>

                        <Text style={styles.selectorValue}>
                          {formatScheduleTimeField()}
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color={COLORS.lightMuted}
                      />
                    </TouchableOpacity>

                    <Text style={[styles.inputLabel, styles.noteInputLabel]}>
                      NOTE
                    </Text>

                    <TextInput
                      accessibilityLabel="Optional meeting note"
                      value={scheduleNote}
                      onChangeText={setScheduleNote}
                      placeholder="Optional meeting note"
                      placeholderTextColor={COLORS.lightMuted}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                      style={[styles.modalInput, styles.modalNoteInput]}
                    />

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.saveScheduleButton,
                        savingSchedule && styles.disabledButton,
                      ]}
                      disabled={savingSchedule}
                      onPress={handleSaveSchedule}
                    >
                      {savingSchedule ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <>
                          <MaterialIcons
                            name="event-available"
                            size={20}
                            color={COLORS.white}
                          />

                          <Text style={styles.saveScheduleText}>
                            Save Schedule
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moreButton: {
    width: 44,
    height: 44,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  supportBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  supportSheet: {
    width: '100%',
    maxWidth: 402,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: '#D8D8D8',
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  supportTitle: {
    flex: 1,
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    lineHeight: 28,
    color: COLORS.black,
  },
  supportClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.page,
    marginLeft: 8,
  },
  supportBack: {
    width: 36,
    height: 44,
    marginRight: 4,
    justifyContent: 'center',
  },
  supportPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 18,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  supportAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportInitials: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: COLORS.red,
  },
  supportPersonName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.black,
  },
  supportDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    marginTop: 3,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    minHeight: 76,
  },
  supportOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportOptionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.black,
  },
  supportDivider: { height: 1, marginLeft: 56, backgroundColor: COLORS.border },
  supportIntro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
    marginBottom: 20,
  },
  supportFieldLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 10,
  },
  reportReasons: { gap: 8, marginBottom: 20 },
  reportReason: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  reportReasonSelected: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.pink,
  },
  reportReasonText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.black,
  },
  supportInput: {
    minHeight: 110,
    maxHeight: 180,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.page,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.black,
  },
  supportCharacterCount: {
    marginTop: 6,
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.muted,
  },
  supportAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  supportAvailabilityText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },
  supportSubmit: {
    minHeight: 48,
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },
  supportSubmitText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.white,
  },
  supportError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.red,
    marginTop: 12,
  },
  supportSuccess: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },

  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  bloodTypeBadge: {
    width: 54,
    minHeight: 64,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bloodTypeText: {
    color: COLORS.red,
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 28,
  },
  urgencyLabel: {
    color: COLORS.red,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  neutralLabel: { color: COLORS.muted },
  unitLabel: { color: '#5F5F5F', fontFamily: 'Inter_400Regular', fontSize: 12 },
  requestFacility: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 5,
  },
  requestHint: {
    color: COLORS.red,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 6,
  },
  detailsPanel: {
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  mapButton: {
    width: 44,
    height: 44,
    marginLeft: 6,
    borderRadius: 14,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReplies: { marginTop: 16, gap: 8, maxWidth: 310, width: '100%' },
  quickReply: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EACACA',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickReplyText: {
    flex: 1,
    color: COLORS.red,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  myMessageText: { color: COLORS.white },
  modalContent: { padding: 22 },

  desktopBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'web' ? '#242424' : COLORS.page,
  },

  phone: {
    width: '100%',
    height: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    maxHeight: Platform.OS === 'web' ? '100%' : undefined,
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  safeArea: { flex: 1, backgroundColor: COLORS.red },

  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.page,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 36,
    height: 44,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 42,
    height: 42,
    marginRight: 10,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  avatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },

  personInfo: {
    flex: 1,
    minWidth: 0,
  },

  personName: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 23,
  },

  roleText: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },

  centerState: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  centerTitle: {
    marginTop: 13,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    textAlign: 'center',
  },

  centerDescription: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
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
    backgroundColor: COLORS.redButton,
  },

  retryButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },

  requestCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.white,
  },

  requestInfo: {
    flex: 1,
    minWidth: 0,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  chatScroll: {
    flex: 1,
  },

  chatContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },

  dayDivider: {
    marginTop: 18,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  dayLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E4E4E4',
  },

  dayText: {
    color: '#737373',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  emptyChat: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 22,
  },

  emptyChatIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },

  emptyChatTitle: {
    marginTop: 14,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    textAlign: 'center',
  },

  emptyChatDescription: {
    marginTop: 6,
    maxWidth: 290,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  messageRow: {
    marginBottom: 14,
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
    width: 30,
    height: 30,
    marginRight: 8,
    marginBottom: 21,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  messageAvatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
  },

  messageStack: {
    maxWidth: '76%',
  },

  messageBubble: {
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
  },

  myBubble: { borderBottomRightRadius: 5, backgroundColor: COLORS.redButton },

  otherBubble: {
    borderBottomLeftRadius: 5,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  messageText: {
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },

  messageTime: {
    marginTop: 6,
    marginHorizontal: 3,
    color: '#737373',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  messageTimeMine: {
    textAlign: 'right',
  },

  facilityRow: {
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  facilityIcon: {
    width: 36,
    height: 40,
    marginRight: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },

  facilityInfo: {
    flex: 1,
    minWidth: 0,
  },

  facilityName: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  facilityAddress: {
    marginTop: 4,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  facilityDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    backgroundColor: COLORS.border,
  },

  scheduleRow: {
    minHeight: 72,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scheduleIcon: {
    width: 36,
    height: 40,
    marginRight: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },

  scheduleInfo: { flex: 1, minWidth: 0, paddingRight: 8 },

  scheduleLabel: {
    color: '#737373',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.7,
  },

  scheduleValue: {
    marginTop: 5,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  scheduleNote: {
    marginTop: 5,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 19,
  },

  scheduleAction: {
    color: COLORS.red,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    padding: 10,
  },

  fulfillRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  fulfillTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
  },

  fulfillDescription: {
    marginTop: 3,
    color: '#666666',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },

  fulfillButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
  },

  fulfillButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  closedBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.page,
  },

  closedBarText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  composer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  inputContainer: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  messageInput: {
    maxHeight: 110,
    paddingVertical: 12,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  sendButtonDisabled: { backgroundColor: '#F0A5A5' },

  readOnlyComposer: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEEEEE',
  },

  readOnlyText: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },

  modalBackdrop: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  scheduleModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
    flexGrow: 0,
    borderRadius: 24,
    backgroundColor: COLORS.white,
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
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },

  modalSubtitle: {
    marginTop: 5,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  modalClose: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  inputLabel: {
    marginBottom: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.6,
  },

  timeInputLabel: {
    marginTop: 14,
  },

  noteInputLabel: {
    marginTop: 14,
  },

  selectorField: {
    minHeight: 64,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.page,
  },

  selectorIcon: {
    width: 34,
    height: 34,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },

  selectorTextArea: {
    flex: 1,
  },

  selectorSmallLabel: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  selectorValue: {
    marginTop: 3,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  modalInput: {
    minHeight: 46,
    marginBottom: 14,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    backgroundColor: '#FAFAFA',
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
    backgroundColor: COLORS.redButton,
  },

  saveScheduleText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  pickerTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
  },

  pickerClose: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  calendarHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarArrow: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },

  calendarMonth: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekHeaderText: {
    width: '14.2857%',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  calendarDayCell: {
    width: '14.2857%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarDayText: {
    width: 34,
    height: 34,
    borderRadius: 17,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 34,
    textAlign: 'center',
  },

  calendarDayTextDisabled: {
    color: '#C7C7C7',
  },

  calendarDayTextSelected: {
    color: COLORS.white,
    backgroundColor: COLORS.redButton,
  },

  confirmPickerButton: {
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  confirmPickerButtonDisabled: {
    opacity: 0.45,
  },

  confirmPickerButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
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
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },

  timeArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeValueBox: {
    width: 55,
    height: 50,
    borderWidth: 1,
    borderColor: '#E6B4B4',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F8',
  },

  timeValueText: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },

  timeColon: {
    marginHorizontal: 8,
    marginTop: 17,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 23,
  },

  periodColumn: {
    marginLeft: 14,
    marginTop: 18,
    gap: 8,
  },

  periodButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  periodButtonSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  periodButtonText: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  periodButtonTextSelected: {
    color: COLORS.white,
  },

  confirmTimeButton: {
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
