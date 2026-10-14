import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
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

import { shiftedDown, withStatusBar } from '../../../../lib/fullScreen';

import {
  agreeCoordinationSchedule,
  getCoordinationMessages,
  getCoordinationSession,
  isScheduleAgreed,
  markCoordinationRead,
  reportNoShow,
  saveCoordinationSchedule,
  sendCoordinationMessage,
  submitCoordinationSupport,
} from '../../../../lib/coordination';

import type {
  CoordinationMessage,
  CoordinationSession,
} from '../../../../lib/coordination';

import {
  type BloodDonation,
  disputeDonation,
  getFeedbackFrom,
  getRequestDonations,
  recordDonation,
  submitDonationFeedback,
} from '../../../../lib/donations';

import {
  fulfillBloodRequest,
} from '../../../../lib/requestResponses';

import {
  getAccessToken,
} from '../../../../lib/session';

import {
  formatDistance,
  formatEta,
  getTrip,
  reportNotHere,
  type TripPayload,
} from '../../../../lib/trips';

import {
  setActiveConversation,
} from '../../../../lib/pushNotifications';

import {
  FadeInView,
  PressableScale,
} from '../../../../components/Motion';

import TimeWheelPicker from '../../../../components/TimeWheelPicker';

import ConfirmDonationSheet from '../../../../components/ConfirmDonationSheet';

import DonationFeedbackModal from '../../../../components/DonationFeedbackModal';
import PersonAvatar from '../../../../components/PersonAvatar';

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

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  star: '#F2A516',

  overlay: 'rgba(0,0,0,0.45)',
};

// ============================================================
// ACTION POPUP
// ============================================================

type ActionPopupVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'error';

type ActionPopupState = {
  visible:
    boolean;

  title:
    string;

  message:
    string;

  variant:
    ActionPopupVariant;

  confirmText:
    string;

  cancelText:
    string;

  showCancel:
    boolean;

  onConfirm?:
    () => void;
};

// ============================================================
// REPORT REASONS
// ============================================================

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Misleading information',
  'Other',
] as const;

// ============================================================
// CHAT MESSAGES
//
// Sent messages show right away ("sending"); if the server
// rejects one it stays with a retry option ("failed").
// ============================================================

type ChatMessage =
  CoordinationMessage & {
    localStatus?:
      | 'sending'
      | 'failed';
  };

// One-tap phrases for the rating dialog.
const DONOR_FEEDBACK_NOTES = [
  'Arrived on time',
  'Very kind',
  'Easy to coordinate with',
  'Smooth donation',
];

const REQUESTER_FEEDBACK_NOTES = [
  'Clear instructions',
  'Easy to coordinate with',
  'Very thankful',
  'Smooth donation',
];

// ============================================================
// SCREEN
// ============================================================

export default function DonationCoordinationScreen() {
  // ==========================================================
  // SUPPORT
  // ==========================================================

  const [
    supportView,
    setSupportView,
  ] =
    useState<
      | 'menu'
      | 'feedback'
      | 'report'
      | 'noshow'
      | 'success'
      | null
    >(null);

  const [
    feedbackText,
    setFeedbackText,
  ] =
    useState('');

  const [
    reportText,
    setReportText,
  ] =
    useState('');

  const [
    reportReason,
    setReportReason,
  ] =
    useState('');

  const [
    supportSending,
    setSupportSending,
  ] =
    useState(false);

  const [
    supportError,
    setSupportError,
  ] =
    useState('');

  const [
    submittedSupportKind,
    setSubmittedSupportKind,
  ] =
    useState<
      | 'feedback'
      | 'report'
      | 'noshow'
    >(
      'feedback'
    );

  // Optional note for a no-show report.
  const [
    noShowText,
    setNoShowText,
  ] =
    useState('');

  // ==========================================================
  // LAYOUT
  // ==========================================================

  const insets =
    useSafeAreaInsets();

  const {
    height:
      windowHeight,
  } =
    useWindowDimensions();

  const [
    keyboardVisible,
    setKeyboardVisible,
  ] =
    useState(false);

  const [
    composerHeight,
    setComposerHeight,
  ] =
    useState(48);

  const nearBottom =
    useRef(true);

  const shouldScroll =
    useRef(true);

  const lastMessageId =
    useRef<
      | CoordinationMessage['id']
      | undefined
    >(
      undefined
    );

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  useEffect(
    () => {
      const show =
        Keyboard.addListener(
          Platform.OS ===
            'ios'
            ? 'keyboardWillShow'
            : 'keyboardDidShow',

          () => {
            setKeyboardVisible(
              true
            );

            // Give the messages the room while typing.
            setDetailsOpen(
              false
            );
          }
        );

      const hide =
        Keyboard.addListener(
          Platform.OS ===
            'ios'
            ? 'keyboardWillHide'
            : 'keyboardDidHide',

          () =>
            setKeyboardVisible(
              false
            )
        );

      return () => {
        show.remove();

        hide.remove();
      };
    },
    []
  );

  // ==========================================================
  // ROUTE
  // ==========================================================

  const params =
    useLocalSearchParams<{
      id?:
        | string
        | string[];

      responseId?:
        | string
        | string[];
    }>();

  const requestId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;

  const responseId =
    Array.isArray(
      params.responseId
    )
      ? params.responseId[0]
      : params.responseId;

  // ==========================================================
  // CHAT STATE
  // ==========================================================

  const scrollRef =
    useRef<
      ScrollView | null
    >(
      null
    );

  const [
    coordination,
    setCoordination,
  ] =
    useState<
      CoordinationSession | null
    >(
      null
    );

  const [
    messages,
    setMessages,
  ] =
    useState<
      ChatMessage[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

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


  // ==========================================================
  // CUSTOM POPUP
  // ==========================================================

  const [
    actionPopup,
    setActionPopup,
  ] =
    useState<ActionPopupState>({
      visible:
        false,

      title:
        '',

      message:
        '',

      variant:
        'info',

      confirmText:
        'Okay',

      cancelText:
        'Cancel',

      showCancel:
        false,

      onConfirm:
        undefined,
    });

  // ==========================================================
  // DONATION (transaction record for this conversation)
  // ==========================================================

  const [
    donation,
    setDonation,
  ] =
    useState<BloodDonation | null>(
      null
    );

  // Donor's live trip to the facility ("On my way" map).
  const [
    tripInfo,
    setTripInfo,
  ] =
    useState<TripPayload | null>(
      null
    );

  // Pinned coordination card: collapsed shows the next step,
  // expanded shows place, schedule and donation details.
  const [
    detailsOpen,
    setDetailsOpen,
  ] =
    useState(false);

  const [
    confirmVisible,
    setConfirmVisible,
  ] =
    useState(false);

  const [
    ratingMode,
    setRatingMode,
  ] =
    useState<
      | 'feedback'
      | 'dispute'
      | null
    >(null);

  const [
    fulfilling,
    setFulfilling,
  ] =
    useState(false);

  // ==========================================================
  // SCHEDULE
  // ==========================================================

  const [
    scheduleModalVisible,
    setScheduleModalVisible,
  ] =
    useState(
      false
    );

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
    useState(
      false
    );

  const [
    agreeingSchedule,
    setAgreeingSchedule,
  ] =
    useState(
      false
    );

  const [
    sendingNotHere,
    setSendingNotHere,
  ] =
    useState(
      false
    );

  const [
    datePickerVisible,
    setDatePickerVisible,
  ] =
    useState(
      false
    );

  const [
    timePickerVisible,
    setTimePickerVisible,
  ] =
    useState(
      false
    );

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
    useState<
      Date | null
    >(
      null
    );

  const [
    tempHour,
    setTempHour,
  ] =
    useState(
      12
    );

  const [
    tempMinute,
    setTempMinute,
  ] =
    useState(
      0
    );

  const [
    tempPeriod,
    setTempPeriod,
  ] =
    useState<
      | 'AM'
      | 'PM'
    >(
      'PM'
    );

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const request =
    coordination
      ?.request;

  const schedule =
    coordination
      ?.schedule;

  const viewerRole =
    coordination
      ?.viewer_role;

  const otherPerson =
    viewerRole ===
    'donor'
      ? coordination
          ?.requester
      : coordination
          ?.donor;

  const isClosed =
    request
      ? request.status !==
        'active'
      : false;

  // ----------------------------------------------------------
  // MEETING TIME AGREEMENT
  //
  // A time is a suggestion until the other side agrees. Either
  // side can suggest another time instead; the rest of the chat
  // (progress, no-show) only counts an agreed time.
  // ----------------------------------------------------------

  const myUserId =
    viewerRole ===
    'requester'
      ? coordination
          ?.requester
          ?.id
      : coordination
          ?.donor
          ?.id;

  const scheduleAgreed =
    isScheduleAgreed(
      schedule
    );

  const agreedSchedule =
    scheduleAgreed
      ? schedule
      : null;

  const suggestedByMe =
    Boolean(
      schedule &&
        !scheduleAgreed &&
        myUserId &&
        schedule.proposed_by ===
          myUserId
    );

  const suggestionPassed =
    Boolean(
      schedule &&
        !scheduleAgreed &&
        new Date(
          schedule.scheduled_at
        ).getTime() <=
          Date.now()
    );

  // The requester reported this donor as a no-show: the chat
  // stays open for messages, but this donor can no longer
  // schedule or donate for the request.
  const isReleased =
    coordination
      ?.response
      ?.status ===
    'no_show';

  // The meeting can't be later than the request's time: the
  // needed date and time, or when an urgent request closes.
  const scheduleLimit =
    coordination
      ?.schedule_limit
      ? new Date(
          coordination.schedule_limit
        )
      : null;

  const scheduleLimitPassed =
    scheduleLimit !== null &&
    scheduleLimit.getTime() <=
      Date.now();

  // e.g. "Needed by Wed, Oct 8, 2:30 PM"
  const scheduleLimitText =
    scheduleLimit && request
      ? `${
          request.urgency ===
          'urgent'
            ? 'Urgent request · closes'
            : request.needed_date
              ? 'Needed by'
              : 'Request closes'
        } ${scheduleLimit.toLocaleString(
          'en-US',
          {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }
        )}`
      : '';

  // ==========================================================
  // LOAD DONATION
  //
  // The record for this conversation (newest one that was not
  // rejected). A failure only hides the donation status.
  // ==========================================================

  const loadDonation =
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
            await getRequestDonations(
              token,
              requestId
            );

          const own =
            (
              result.donations ||
              []
            ).filter(
              item =>
                item.response_id ===
                responseId
            );

          setDonation(
            own.find(
              item =>
                item.status !==
                'rejected'
            ) ||
              own[0] ||
              null
          );
        } catch (donationError) {
          console.log(
            'CHAT DONATION ERROR:',
            donationError
          );
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  // ==========================================================
  // LOAD TRIP
  //
  // Only adds the "on the way" status; a failure (or a database
  // without the trips table yet) just hides it.
  // ==========================================================

  const loadTrip =
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

          setTripInfo(
            await getTrip(
              token,
              requestId,
              responseId
            )
          );
        } catch (tripError) {
          console.log(
            'CHAT TRIP ERROR:',
            tripError
          );

          setTripInfo(null);
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  // ==========================================================
  // MARK READ
  //
  // Clears this conversation's unread badge in the inbox.
  // Throttled so polling doesn't send it every few seconds.
  // ==========================================================

  const lastMarkedRead =
    useRef(0);

  // server message id -> local key it was sent under.
  const messageKeys =
    useRef(
      new Map<string, string>()
    );

  const lastSeenFromOther =
    useRef<string | null>(null);

  const loadedOnce =
    useRef(false);

  const markRead =
    useCallback(
      async (
        force = false
      ) => {
        if (
          !requestId ||
          !responseId ||
          (!force &&
            Date.now() -
              lastMarkedRead.current <
              10000)
        ) {
          return;
        }

        lastMarkedRead.current =
          Date.now();

        try {
          const token =
            await getAccessToken();

          if (token) {
            await markCoordinationRead(
              token,
              requestId,
              responseId
            );
          }
        } catch (readError) {
          console.log(
            'MARK CHAT READ ERROR:',
            readError
          );
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  // ==========================================================
  // LOAD COORDINATION
  // ==========================================================

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

          setLoading(
            false
          );

          return;
        }

        try {
          // Only the first load shows the full loader; coming back
          // to the chat refreshes quietly.
          if (!loadedOnce.current) {
            setLoading(
              true
            );
          }

          setError('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace(
              '/'
            );

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

          // Keep messages that are still sending or failed.
          setMessages(
            current => [
              ...(messagesResult
                .messages ||
                []),

              ...current.filter(
                item =>
                  item.localStatus
              ),
            ]
          );

          loadedOnce.current = true;

          void loadDonation();

          void markRead(true);
        } catch (
          loadError
        ) {
          console.log(
            'LOAD COORDINATION ERROR:',
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Unable to load donation coordination.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        requestId,
        responseId,
        loadDonation,
        markRead,
      ]
    );

  // ==========================================================
  // REFRESH MESSAGES
  // ==========================================================

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

          const serverMessages =
            result.messages ||
            [];

          // A new message from the other person clears the unread
          // badge (the viewer is looking at it).
          const newestFromOther =
            [...serverMessages]
              .reverse()
              .find(
                item =>
                  !item.is_mine
              );

          if (
            newestFromOther &&
            newestFromOther.id !==
              lastSeenFromOther.current
          ) {
            lastSeenFromOther.current =
              newestFromOther.id;

            void markRead();
          }

          // Keep messages that are still sending or failed.
          setMessages(
            current => [
              ...serverMessages,

              ...current.filter(
                item =>
                  item.localStatus
              ),
            ]
          );
        } catch (
          messageError
        ) {
          console.log(
            'REFRESH COORDINATION MESSAGES ERROR:',
            messageError
          );
        }
      },
      [
        requestId,
        responseId,
        markRead,
      ]
    );

  // ==========================================================
  // FOCUS REFRESH
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadCoordination();
        loadTrip();
      },
      [
        loadCoordination,
        loadTrip,
      ]
    )
  );

  // Message notifications for this chat stay quiet while it's
  // on screen.
  useFocusEffect(
    useCallback(
      () => {
        setActiveConversation(
          responseId ||
            null
        );

        return () =>
          setActiveConversation(
            null
          );
      },
      [
        responseId,
      ]
    )
  );

  // ==========================================================
  // SESSION REFRESH
  //
  // The other side may suggest, change or agree to the meeting
  // time while this chat is open. Quiet: a failure waits for the
  // next check.
  // ==========================================================

  const loadSession =
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
            await getCoordinationSession(
              token,
              requestId,
              responseId
            );

          setCoordination(
            result.coordination
          );
        } catch (sessionError) {
          console.log(
            'CHAT SESSION REFRESH ERROR:',
            sessionError
          );
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  // ==========================================================
  // POLLING
  // ==========================================================

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

      // The other person may confirm the donation or rate while
      // this chat is open; that changes rarely, so check less often.
      const donationTimer =
        setInterval(
          () => {
            loadDonation();
          },
          15000
        );

      // Donor's position / ETA while they travel.
      const tripTimer =
        setInterval(
          () => {
            loadTrip();
          },
          10000
        );

      // Meeting time suggestions and agreement.
      const sessionTimer =
        setInterval(
          () => {
            loadSession();
          },
          8000
        );

      return () => {
        clearInterval(
          timer
        );

        clearInterval(
          donationTimer
        );

        clearInterval(
          tripTimer
        );

        clearInterval(
          sessionTimer
        );
      };
    },
    [
      requestId,
      responseId,
      loadMessages,
      loadDonation,
      loadTrip,
      loadSession,
    ]
  );

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(
    () => {
      const newestId =
        messages[
          messages.length -
            1
        ]?.id;

      if (
        newestId !==
        lastMessageId.current
      ) {
        shouldScroll.current =
          nearBottom.current;

        lastMessageId.current =
          newestId;

        if (
          shouldScroll.current
        ) {
          scrollRef.current
            ?.scrollToEnd({
              animated:
                true,
            });
        }
      }
    },
    [
      messages,
    ]
  );

  // ==========================================================
  // PERSON HELPERS
  // ==========================================================

  function getOtherName() {
    if (
      !otherPerson
    ) {
      return 'Hemo-Hero User';
    }

    return (
      otherPerson.full_name ||
      [
        otherPerson.first_name,
        otherPerson.last_name,
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        ) ||
      'Hemo-Hero User'
    );
  }

  function getInitials() {
    const initials =
      [
        otherPerson
          ?.first_name,

        otherPerson
          ?.last_name,
      ]
        .filter(
          Boolean
        )
        .map(
          value =>
            String(
              value
            )
              .charAt(
                0
              )
              .toUpperCase()
        )
        .join('');

    return (
      initials ||
      'H'
    );
  }

  // ==========================================================
  // FORMAT HELPERS
  // ==========================================================

  function formatMessageTime(
    value:
      string
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

    return date
      .toLocaleTimeString(
        'en-US',
        {
          hour:
            'numeric',

          minute:
            '2-digit',
        }
      );
  }

  function formatSchedule(
    value:
      string
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
      return value;
    }

    return date
      .toLocaleString(
        'en-US',
        {
          weekday:
            'short',

          month:
            'short',

          day:
            'numeric',

          hour:
            'numeric',

          minute:
            '2-digit',
        }
      );
  }

  function localDateValue(
    date:
      Date
  ) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() +
          1
      )
        .padStart(
          2,
          '0'
        );

    const day =
      String(
        date.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return `${year}-${month}-${day}`;
  }

  function localTimeValue(
    date:
      Date
  ) {
    const hour =
      String(
        date.getHours()
      )
        .padStart(
          2,
          '0'
        );

    const minute =
      String(
        date.getMinutes()
      )
        .padStart(
          2,
          '0'
        );

    return `${hour}:${minute}`;
  }

  function padNumber(
    value:
      number
  ) {
    return String(
      value
    )
      .padStart(
        2,
        '0'
      );
  }

  function toIsoDate(
    date:
      Date
  ) {
    return (
      `${date.getFullYear()}-` +
      `${padNumber(
        date.getMonth() +
          1
      )}-` +
      `${padNumber(
        date.getDate()
      )}`
    );
  }

  function isSameCalendarDate(
    first:
      Date,

    second:
      Date
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

  // ==========================================================
  // CALENDAR
  // ==========================================================

  function getCalendarDays() {
    const year =
      calendarCursor
        .getFullYear();

    const month =
      calendarCursor
        .getMonth();

    const firstDay =
      new Date(
        year,
        month,
        1
      );

    const lastDay =
      new Date(
        year,
        month +
          1,
        0
      );

    const days: Array<
      | {
          type:
            'empty';

          key:
            string;
        }
      | {
          type:
            'day';

          key:
            string;

          date:
            Date;
        }
    > = [];

    for (
      let index = 0;
      index <
      firstDay.getDay();
      index += 1
    ) {
      days.push({
        type:
          'empty',

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
        type:
          'day',

        key:
          toIsoDate(
            date
          ),

        date,
      });
    }

    return days;
  }

  function isAfterScheduleLimit(
    date:
      Date
  ) {
    if (!scheduleLimit) {
      return false;
    }

    const limitDay =
      new Date(
        scheduleLimit
      );

    limitDay.setHours(
      0,
      0,
      0,
      0
    );

    const candidate =
      new Date(
        date
      );

    candidate.setHours(
      0,
      0,
      0,
      0
    );

    return (
      candidate.getTime() >
      limitDay.getTime()
    );
  }

  function isPastCalendarDate(
    date:
      Date
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
      new Date(
        date
      );

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
    if (
      !scheduleDate
    ) {
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

    return date
      .toLocaleDateString(
        'en-US',
        {
          month:
            'short',

          day:
            'numeric',

          year:
            'numeric',
        }
      );
  }

  function formatScheduleTimeField() {
    if (
      !scheduleTime
    ) {
      return 'Select Time';
    }

    const [
      hourText,
      minuteText,
    ] =
      scheduleTime
        .split(':');

    const date =
      new Date();

    date.setHours(
      Number(
        hourText
      ),

      Number(
        minuteText
      ),

      0,
      0
    );

    return date
      .toLocaleTimeString(
        'en-US',
        {
          hour:
            'numeric',

          minute:
            '2-digit',
        }
      );
  }

  // ==========================================================
  // CUSTOM ACTION POPUP
  // ==========================================================

  function closeActionPopup() {
    setActionPopup(
      current => ({
        ...current,

        visible:
          false,

        onConfirm:
          undefined,
      })
    );
  }

  function getMessageVariant(
    title:
      string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes(
        'fulfilled'
      ) ||
      value.includes(
        'saved'
      ) ||
      value.includes(
        'sent'
      ) ||
      value.includes(
        'success'
      )
    ) {
      return 'success';
    }

    if (
      value.includes(
        'unable'
      ) ||
      value.includes(
        'invalid'
      ) ||
      value.includes(
        'error'
      )
    ) {
      return 'error';
    }

    if (
      value.includes(
        'select'
      )
    ) {
      return 'warning';
    }

    return 'info';
  }

  function showMessage(
    title:
      string,

    description:
      string
  ) {
    setActionPopup({
      visible:
        true,

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


  // ==========================================================
  // VIEW REQUEST
  // ==========================================================

  function handleViewRequest() {
    if (
      !request
    ) {
      return;
    }

    if (
      viewerRole ===
      'donor'
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

  // ==========================================================
  // TRIP MAP ("on my way" / track donor)
  // ==========================================================

  function openTrip() {
    if (
      !requestId ||
      !responseId
    ) {
      return;
    }

    Keyboard.dismiss();

    router.push(
      `/blood-request/${requestId}/coordination/${responseId}/trip` as any
    );
  }

  // ==========================================================
  // OPEN MAP
  // ==========================================================

  async function openLocation() {
    if (
      !request
    ) {
      return;
    }

    let url =
      '';

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
        `https://www.google.com/maps/search/?api=1&query=` +
        `${request.facility_latitude},${request.facility_longitude}`;
    } else {
      const query =
        request.facility_address ||
        request.facility_name;

      url =
        `https://www.google.com/maps/search/?api=1&query=` +
        encodeURIComponent(
          query
        );
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

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  // The message shows right away as "sending"; the server copy
  // replaces it, or it is marked "failed" with a retry option.
  async function deliverMessage(
    localId: string,
    text: string
  ) {
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
        router.replace(
          '/'
        );

        return;
      }

      const result =
        await sendCoordinationMessage(
          token,
          requestId,
          responseId,
          text
        );

      // Render the server copy under the local key so the bubble
      // doesn't re-animate when it is swapped in.
      if (
        result?.data?.id
      ) {
        messageKeys.current.set(
          result.data.id,
          localId
        );
      }

      setMessages(
        current => {
          const withoutLocal =
            current.filter(
              item =>
                item.id !==
                localId
            );

          // Polling may already have added the server copy.
          if (
            !result?.data ||
            withoutLocal.some(
              item =>
                item.id ===
                result.data.id
            )
          ) {
            return withoutLocal;
          }

          return [
            ...withoutLocal,
            result.data,
          ];
        }
      );

      if (
        !result?.data
      ) {
        await loadMessages();
      }
    } catch (
      sendError
    ) {
      console.log(
        'SEND MESSAGE ERROR:',
        sendError
      );

      setMessages(
        current =>
          current.map(
            item =>
              item.id ===
              localId
                ? {
                    ...item,
                    localStatus:
                      'failed',
                  }
                : item
          )
      );
    }
  }

  function handleSendMessage(
    text?: string
  ) {
    const cleanMessage =
      (
        text ??
        messageText
      ).trim();

    if (
      !cleanMessage ||
      !requestId ||
      !responseId ||
      isClosed
    ) {
      return;
    }

    const localId =
      `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    setMessages(
      current => [
        ...current,

        {
          id:
            localId,

          request_id:
            requestId,

          response_id:
            responseId,

          sender_id:
            '',

          message:
            cleanMessage,

          created_at:
            new Date()
              .toISOString(),

          sender:
            null,

          is_mine:
            true,

          localStatus:
            'sending',
        },
      ]
    );

    if (
      text ===
      undefined
    ) {
      setMessageText('');
    }

    // Always follow your own message to the bottom.
    nearBottom.current =
      true;

    void deliverMessage(
      localId,
      cleanMessage
    );
  }

  function retryMessage(
    message: ChatMessage
  ) {
    setMessages(
      current =>
        current.map(
          item =>
            item.id ===
            message.id
              ? {
                  ...item,

                  localStatus:
                    'sending',
                }
              : item
        )
    );

    void deliverMessage(
      message.id,
      message.message
    );
  }

  // ==========================================================
  // OPEN SCHEDULE
  // ==========================================================

  function handleOpenSchedule() {
    if (
      !coordination ||
      isClosed ||
      isReleased
    ) {
      return;
    }

    if (
      scheduleLimitPassed
    ) {
      showMessage(
        'Too Late to Schedule',
        request?.urgency ===
          'urgent'
          ? 'This urgent request is closing, so a meeting time can no longer be set.'
          : 'The time this blood was needed has passed, so a meeting time can no longer be set.'
      );

      return;
    }

    let date =
      new Date(
        Date.now() +
          60 *
            60 *
            1000
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
        date.getHours() +
          1,

        0,
        0,
        0
      );
    }

    if (
      schedule
        ?.scheduled_at
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
        date =
          existing;
      }
    }

    // Start no later than the request's time.
    if (
      scheduleLimit &&
      date.getTime() >
        scheduleLimit.getTime()
    ) {
      date =
        new Date(
          scheduleLimit
        );
    }

    setScheduleDate(
      localDateValue(
        date
      )
    );

    setScheduleTime(
      localTimeValue(
        date
      )
    );

    setScheduleNote(
      schedule?.note ||
        ''
    );

    setDatePickerVisible(
      false
    );

    setTimePickerVisible(
      false
    );

    setScheduleModalVisible(
      true
    );
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

    setDatePickerVisible(
      true
    );
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

    setDatePickerVisible(
      false
    );
  }

  function changeCalendarMonth(
    offset:
      number
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
      new Date()
        .getHours();

    let minute =
      new Date()
        .getMinutes();

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
        scheduleTime
          .split(':');

      hour24 =
        Number(
          hourText
        );

      minute =
        Number(
          minuteText
        );
    }

    const period:
      | 'AM'
      | 'PM' =
      hour24 >= 12
        ? 'PM'
        : 'AM';

    const hour12 =
      hour24 %
        12 ||
      12;

    setTempHour(
      hour12
    );

    setTempMinute(
      Math.min(
        59,

        Math.max(
          0,

          Math.round(
            minute
          ) || 0
        )
      )
    );

    setTempPeriod(
      period
    );

    setTimePickerVisible(
      true
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
      hour24 +=
        12;
    }

    setScheduleTime(
      `${padNumber(
        hour24
      )}:${padNumber(
        tempMinute
      )}`
    );

    setTimePickerVisible(
      false
    );
  }

  // ==========================================================
  // SAVE SCHEDULE
  // ==========================================================

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

    if (
      scheduleLimit &&
      scheduledDate.getTime() >
        scheduleLimit.getTime()
    ) {
      showMessage(
        'Too Late for This Request',
        `${scheduleLimitText}. Pick a time on or before then.`
      );

      return;
    }

    try {
      setSavingSchedule(
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

      await saveCoordinationSchedule(
        token,
        requestId,
        responseId,
        scheduledDate.toISOString(),
        scheduleNote
      );

      setScheduleModalVisible(
        false
      );

      await loadCoordination();
    } catch (
      scheduleError
    ) {
      console.log(
        'SAVE SCHEDULE ERROR:',
        scheduleError
      );

      showMessage(
        'Unable to Suggest Time',

        scheduleError instanceof
          Error
          ? scheduleError.message
          : 'Unable to send the meeting time.'
      );
    } finally {
      setSavingSchedule(
        false
      );
    }
  }

  // Agree to the time the other side suggested. The time on
  // screen is sent so a change made a moment ago isn't agreed
  // to by mistake.
  async function handleAgreeSchedule() {
    if (
      !requestId ||
      !responseId ||
      !schedule ||
      agreeingSchedule
    ) {
      return;
    }

    try {
      setAgreeingSchedule(
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

      const result =
        await agreeCoordinationSchedule(
          token,
          requestId,
          responseId,
          schedule.scheduled_at
        );

      setCoordination(
        current =>
          current
            ? {
                ...current,
                schedule:
                  result.schedule,
              }
            : current
      );
    } catch (agreeError) {
      console.log(
        'AGREE SCHEDULE ERROR:',
        agreeError
      );

      showMessage(
        'Unable to Agree',

        agreeError instanceof
          Error
          ? agreeError.message
          : 'Unable to agree to the meeting time.'
      );

      // The time may have just changed: show the latest.
      loadSession();
    } finally {
      setAgreeingSchedule(
        false
      );
    }
  }

  // ==========================================================
  // DONATION STEPS
  //
  // The requester confirms the donation here (it records the
  // transaction), can then close the request, and both sides
  // rate each other. The donor can report a problem with it.
  // ==========================================================

  function getOtherFirstName() {
    return (
      otherPerson
        ?.first_name ||
      getOtherName()
    );
  }

  function handleConfirmDonation() {
    if (
      !request ||
      request.status !==
        'active' ||
      viewerRole !==
        'requester' ||
      isReleased
    ) {
      return;
    }

    Keyboard.dismiss();

    setConfirmVisible(
      true
    );
  }

  // Throws on failure so the sheet can show the message.
  async function submitConfirmedDonation(
    value: {
      donatedAt: string;
      note: string | null;
    }
  ) {
    if (
      !requestId ||
      !responseId
    ) {
      return;
    }

    const token =
      await getAccessToken();

    if (!token) {
      router.replace('/');

      return;
    }

    const result =
      await recordDonation(
        token,
        requestId,
        responseId,
        {
          donated_at:
            value.donatedAt,

          note:
            value.note,
        }
      );

    setConfirmVisible(
      false
    );

    if (
      result.donation
    ) {
      setDonation(
        result.donation
      );
    }

    void loadDonation();

    if (
      result.donation
        ?.status ===
      'needs_review'
    ) {
      showMessage(
        'Donation Confirmed',
        `${getOtherName()} has been notified. Hemo-Hero will take a quick look at this record before it is added to their history.`
      );

      return;
    }

    // Recorded right away: invite the requester to rate it.
    setActionPopup({
      visible:
        true,

      title:
        'Donation Recorded',

      message:
        `Thank you! It is saved to both of your histories and ${getOtherFirstName()} has been notified. Would you like to rate how it went?`,

      variant:
        'success',

      confirmText:
        'Rate Now',

      cancelText:
        'Later',

      showCancel:
        true,

      onConfirm: () => {
        // Let the popup finish closing first.
        setTimeout(
          () =>
            setRatingMode(
              'feedback'
            ),
          350
        );
      },
    });
  }

  function handleFulfill() {
    if (
      !request ||
      request.status !==
        'active' ||
      viewerRole !==
        'requester' ||
      fulfilling
    ) {
      return;
    }

    setActionPopup({
      visible:
        true,

      title:
        'Mark Request Fulfilled?',

      message:
        'This closes your request to new offers. Confirmed donations stay on record.',

      variant:
        'success',

      confirmText:
        'Mark Fulfilled',

      cancelText:
        'Not Yet',

      showCancel:
        true,

      onConfirm: () => {
        void performFulfill();
      },
    });
  }

  async function performFulfill() {
    if (
      !requestId ||
      fulfilling
    ) {
      return;
    }

    try {
      setFulfilling(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await fulfillBloodRequest(
        token,
        requestId
      );

      await loadCoordination();

      showMessage(
        'Request Fulfilled',
        `Your request is closed. Thank you, and thanks to ${getOtherFirstName()}!`
      );
    } catch (fulfillError) {
      showMessage(
        'Unable to Close Request',

        fulfillError instanceof
          Error
          ? fulfillError.message
          : 'Please try again.'
      );
    } finally {
      setFulfilling(
        false
      );
    }
  }

  // ==========================================================
  // DONOR MARKED ARRIVED BUT NOT THERE
  //
  // Same as "Not here yet" on the trip map: the trip goes back
  // to "on the way" (live location again) and the donor gets a
  // chat message.
  // ==========================================================

  function confirmNotHere() {
    const first =
      getOtherFirstName();

    setActionPopup({
      visible:
        true,

      title:
        `${first} Not Here Yet?`,

      message:
        `We’ll tell ${first} you can’t see them yet and show their live location again, so you can find each other.`,

      variant:
        'warning',

      confirmText:
        'Not Here Yet',

      cancelText:
        'Cancel',

      showCancel:
        true,

      onConfirm: () => {
        void performNotHere();
      },
    });
  }

  async function performNotHere() {
    if (
      !requestId ||
      !responseId ||
      sendingNotHere
    ) {
      return;
    }

    try {
      setSendingNotHere(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      setTripInfo(
        await reportNotHere(
          token,
          requestId,
          responseId
        )
      );

      // Shows the chat message it posted.
      loadMessages();
    } catch (notHereError) {
      showMessage(
        'Unable to Send',

        notHereError instanceof
          Error
          ? notHereError.message
          : 'Please try again.'
      );
    } finally {
      setSendingNotHere(
        false
      );
    }
  }

  // Rating (feedback) or the donor's "report a problem".
  // Throws on failure so the dialog can show the message.
  async function submitRating(
    value: {
      rating: number;
      comment: string;
    }
  ) {
    if (
      !requestId ||
      !donation ||
      !ratingMode
    ) {
      return;
    }

    const token =
      await getAccessToken();

    if (!token) {
      router.replace('/');

      return;
    }

    const mode =
      ratingMode;

    if (
      mode ===
      'dispute'
    ) {
      await disputeDonation(
        token,
        requestId,
        donation.id,
        value.comment
      );
    } else {
      await submitDonationFeedback(
        token,
        requestId,
        donation.id,
        {
          rating:
            value.rating,

          comment:
            value.comment ||
            null,
        }
      );
    }

    setRatingMode(
      null
    );

    await loadDonation();

    showMessage(
      mode ===
        'dispute'
        ? 'Report Sent'
        : 'Feedback Sent',

      mode ===
        'dispute'
        ? 'Hemo-Hero will review this donation record and follow up.'
        : `${getOtherFirstName()} can now see your rating. Thank you!`
    );
  }

  // ==========================================================
  // SUPPORT
  // ==========================================================

  const canSubmitSupport =
    Boolean(
      requestId &&
        responseId
    ) &&
    !supportSending &&
    (
      supportView ===
      'noshow'
        ? true
        : supportView ===
            'report'
          ? Boolean(
              reportReason
            )
          : Boolean(
              feedbackText.trim()
            )
    );

  function closeSupport() {
    if (
      !supportSending
    ) {
      setSupportView(
        null
      );
    }
  }

  async function handleSubmitSupport() {
    if (
      !requestId ||
      !responseId ||
      !canSubmitSupport ||
      (
        supportView !==
          'feedback' &&
        supportView !==
          'report' &&
        supportView !==
          'noshow'
      )
    ) {
      return;
    }

    const kind =
      supportView;

    try {
      setSupportSending(
        true
      );

      setSupportError('');

      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          '/'
        );

        return;
      }

      // Server derives the reported person from this
      // conversation - no user id is sent.
      if (
        kind ===
        'noshow'
      ) {
        await reportNoShow(
          token,
          requestId,
          responseId,
          noShowText
        );

        setSubmittedSupportKind(
          'noshow'
        );

        setSupportView(
          'success'
        );

        setNoShowText('');

        // The donor may have been released: show that state.
        void loadCoordination();

        return;
      }

      await submitCoordinationSupport(
        token,
        requestId,
        responseId,
        {
          kind,

          ...(
            kind ===
            'report'
              ? {
                  reason:
                    reportReason,
                }
              : {}
          ),

          details:
            (
              kind ===
              'report'
                ? reportText
                : feedbackText
            )
              .trim(),
        }
      );

      setSubmittedSupportKind(
        kind
      );

      setSupportView(
        'success'
      );

      if (
        kind ===
        'report'
      ) {
        setReportText('');

        setReportReason('');
      } else {
        setFeedbackText('');
      }
    } catch (
      submissionError
    ) {
      setSupportError(
        submissionError instanceof
          Error
          ? submissionError.message
          : 'Unable to send. Please try again.'
      );
    } finally {
      setSupportSending(
        false
      );
    }
  }

  // ==========================================================
  // PROGRESS
  //
  // Accepted -> Scheduled -> Donated -> Rated. The pinned card
  // shows the next step and its one action.
  // ==========================================================

  const myRole =
    viewerRole ||
    'donor';

  const theirRole =
    myRole ===
    'requester'
      ? 'donor'
      : 'requester';

  const myRating =
    getFeedbackFrom(
      donation,
      myRole
    );

  const theirRating =
    getFeedbackFrom(
      donation,
      theirRole
    );

  const donationActive =
    Boolean(
      donation &&
        donation.status !==
          'rejected'
    );

  // A donation can be confirmed without an agreed meeting time;
  // it still counts as past the scheduling step.
  const stepsDone = [
    true,
    Boolean(agreedSchedule) ||
      donationActive,
    donationActive,
    Boolean(myRating),
  ];

  const canRate =
    donationActive;

  // The agreed meeting time passed and nothing was recorded:
  // either side can report that the other didn't come.
  const canReportNoShow =
    !isClosed &&
    !isReleased &&
    !donationActive &&
    Boolean(
      agreedSchedule &&
        new Date(
          agreedSchedule.scheduled_at
        ).getTime() <=
          Date.now()
    );

  function openNoShow() {
    Keyboard.dismiss();

    setSupportError('');

    setSupportView(
      'noshow'
    );
  }

  const canDispute =
    myRole ===
      'donor' &&
    donation?.status ===
      'completed';

  function getNextStep(): {
    icon: keyof typeof MaterialIcons.glyphMap;
    tone: 'accent' | 'green' | 'orange' | 'muted';
    title: string;
    detail: string;
    action?: {
      label: string;
      onPress: () => void;
      busy?: boolean;
    };
    // Two full-width buttons under the card, used to answer a
    // suggested meeting time.
    choices?: {
      primary: {
        label: string;
        onPress: () => void;
        busy?: boolean;
      };
      secondary: {
        label: string;
        onPress: () => void;
        busy?: boolean;
      };
    };
  } {
    const first =
      getOtherFirstName();

    if (
      donation?.status ===
        'rejected' &&
      myRole ===
        'requester' &&
      !isClosed
    ) {
      return {
        icon: 'error-outline',
        tone: 'accent',
        title: 'Record not accepted',
        detail:
          donation.admin_note ||
          'Please confirm the details again.',
        action: {
          label: 'Confirm',
          onPress: handleConfirmDonation,
        },
      };
    }

    if (
      isReleased &&
      !donationActive
    ) {
      return myRole ===
        'requester'
        ? {
            icon: 'person-off',
            tone: 'orange',
            title: `${first} didn’t show up`,
            detail: 'Your request is open to other donors.',
            action: request?.status ===
              'active'
              ? {
                  label: 'Find donor',
                  onPress: findAnotherDonor,
                }
              : undefined,
          }
        : {
            icon: 'person-off',
            tone: 'orange',
            title: 'Marked as a no-show',
            detail: 'Reply here if this was a mistake.',
          };
    }

    if (!donationActive) {
      if (isClosed) {
        return {
          icon: 'lock-outline',
          tone: 'muted',
          title: `Request ${request?.status || 'closed'}`,
          detail: 'This conversation is read-only.',
        };
      }

      const trip =
        tripInfo?.can_track
          ? tripInfo.trip
          : null;

      if (
        trip?.status ===
        'arrived'
      ) {
        // Requester: can't see them? "Not here yet" puts the
        // trip back to "on the way".
        return myRole ===
          'requester'
          ? {
              icon: 'where-to-vote',
              tone: 'green',
              title: `${first} has arrived`,
              detail: 'Can’t see them? Tap Not here yet.',
              choices: {
                primary: {
                  label: 'Confirm',
                  onPress: handleConfirmDonation,
                },
                secondary: {
                  label: 'Not here yet',
                  onPress: confirmNotHere,
                  busy: sendingNotHere,
                },
              },
            }
          : {
              icon: 'where-to-vote',
              tone: 'green',
              title: 'You’ve arrived',
              detail: `${first} was notified.`,
            };
      }

      if (
        trip?.status ===
        'on_the_way'
      ) {
        const away =
          [
            formatEta(
              trip.eta_seconds
            ),

            formatDistance(
              trip.distance_m
            ),
          ]
            .filter(Boolean)
            .join(' · ');

        // Requester: once the agreed time has passed, "on the
        // way" alone doesn't stop a no-show report.
        return myRole ===
          'requester'
          ? {
              icon: trip.stale
                ? 'location-disabled'
                : 'directions-car',
              tone: trip.stale ||
                trip.near_notified_at ||
                canReportNoShow
                ? 'orange'
                : 'accent',
              title: trip.stale
                ? `${first}'s location paused`
                : trip.near_notified_at
                  ? `${first} is almost there`
                  : `${first} is on the way`,
              detail: canReportNoShow
                ? 'The meeting time has passed.'
                : trip.stale
                  ? 'Last known position on the map.'
                  : `${away} away`,
              ...(canReportNoShow
                ? {
                    choices: {
                      primary: {
                        label: 'Track',
                        onPress: openTrip,
                      },
                      secondary: {
                        label: 'Didn’t show up',
                        onPress: openNoShow,
                      },
                    },
                  }
                : {
                    action: {
                      label: 'Track',
                      onPress: openTrip,
                    },
                  }),
            }
          : {
              icon: 'directions-car',
              tone: 'accent',
              title: 'You’re on the way',
              detail: `${away} to ${request?.facility_name || 'the facility'}`,
              action: {
                label: 'Map',
                onPress: openTrip,
              },
            };
      }

      if (!schedule) {
        return {
          icon: 'event',
          tone: 'accent',
          title: 'Agree on a time',
          detail: `Suggest when you'll meet at ${request?.facility_name || 'the facility'}.`,
          action: {
            label: 'Suggest',
            onPress: handleOpenSchedule,
          },
        };
      }

      if (suggestionPassed) {
        return {
          icon: 'event-busy',
          tone: 'orange',
          title: 'The suggested time passed',
          detail: 'Suggest a new meeting time.',
          action: {
            label: 'Suggest',
            onPress: handleOpenSchedule,
          },
        };
      }

      if (suggestedByMe) {
        return {
          icon: 'hourglass-top',
          tone: 'orange',
          title: `Waiting for ${first} to agree`,
          detail: `You suggested ${formatSchedule(schedule.scheduled_at)}.`,
          action: {
            label: 'Change',
            onPress: handleOpenSchedule,
          },
        };
      }

      if (!scheduleAgreed) {
        return {
          icon: 'event',
          tone: 'accent',
          title: `${first} suggested a time`,
          detail: formatSchedule(
            schedule.scheduled_at
          ),
          choices: {
            primary: {
              label: 'Agree',
              onPress: handleAgreeSchedule,
              busy: agreeingSchedule,
            },
            secondary: {
              label: 'Suggest another time',
              onPress: handleOpenSchedule,
            },
          },
        };
      }

      if (
        myRole ===
        'requester'
      ) {
        return {
          icon: 'task-alt',
          tone: 'accent',
          title: 'Confirm the donation',
          detail: canReportNoShow
            ? `Did ${first} come? Confirm it, or report a no-show.`
            : `After ${first} donates, confirm it here.`,
          action: {
            label: 'Confirm',
            onPress: handleConfirmDonation,
          },
        };
      }

      return {
        icon: 'event-available',
        tone: 'accent',
        title: formatSchedule(
          schedule.scheduled_at
        ),
        detail: `Donate at ${request?.facility_name || 'the facility'}.`,
        action: tripInfo?.can_start
          ? {
              label: 'On my way',
              onPress: openTrip,
            }
          : {
              label: 'Directions',
              onPress: openLocation,
            },
      };
    }

    if (!myRating) {
      return {
        icon:
          donation?.status ===
          'needs_review'
            ? 'hourglass-top'
            : 'task-alt',
        tone:
          donation?.status ===
          'needs_review'
            ? 'orange'
            : 'green',
        title:
          donation?.status ===
          'needs_review'
            ? 'Under a quick review'
            : 'Donation recorded',
        detail: `Rate ${first} to finish.`,
        action: {
          label: 'Rate',
          onPress: () =>
            setRatingMode(
              'feedback'
            ),
        },
      };
    }

    if (
      myRole ===
        'requester' &&
      request?.status ===
        'active'
    ) {
      return {
        icon: 'task-alt',
        tone: 'green',
        title: 'Donation recorded',
        detail: 'Close your request once you have all the blood you need.',
        action: {
          label: 'Fulfilled',
          onPress: handleFulfill,
          busy: fulfilling,
        },
      };
    }

    return {
      icon: 'favorite',
      tone: 'green',
      title: 'All done. Thank you!',
      detail: theirRating
        ? `${first} rated you ${theirRating.rating} out of 5.`
        : 'This donation is on record for both of you.',
    };
  }

  const nextStep =
    getNextStep();

  // ==========================================================
  // QUICK REPLIES (depend on role and progress)
  // ==========================================================

  const quickReplies =
    isClosed ||
    isReleased
      ? []
      : myRole ===
          'donor'
        ? donationActive
          ? [
              'Glad I could help!',
              'Thank you!',
            ]
          : agreedSchedule
            ? [
                'I’m on my way.',
                'I’ve arrived.',
                'Running a bit late.',
              ]
            : [
                'Hi! I’m available to donate.',
                'When works for you?',
                'Which entrance should I use?',
              ]
        : donationActive
          ? [
              'Thank you so much!',
              'You saved a life today.',
            ]
          : agreedSchedule
            ? [
                'See you there!',
                'I’m at the lobby.',
                'Message me when you arrive.',
              ]
            : [
                'Thank you for helping!',
                'When are you available?',
                'Please bring a valid ID.',
              ];

  // ==========================================================
  // MESSAGE HELPERS
  // ==========================================================

  function dayLabel(
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

    const yesterday =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return 'Today';
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }
    );
  }

  // Consecutive messages from the same person within 5 minutes
  // are grouped (one avatar, one timestamp).
  function isGrouped(
    first?: ChatMessage,
    second?: ChatMessage
  ) {
    if (
      !first ||
      !second ||
      first.is_mine !==
        second.is_mine
    ) {
      return false;
    }

    const a =
      new Date(
        first.created_at
      );

    const b =
      new Date(
        second.created_at
      );

    return (
      a.toDateString() ===
        b.toDateString() &&
      Math.abs(
        b.getTime() -
          a.getTime()
      ) <
        5 * 60 * 1000
    );
  }

  function findAnotherDonor() {
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

  function toggleDetails() {
    setDetailsOpen(
      current =>
        !current
    );
  }

  function openOptions() {
    Keyboard.dismiss();

    setSupportError('');

    setSupportView(
      'menu'
    );
  }

  function goBack() {
    if (
      router.canGoBack()
    ) {
      router.back();

      return;
    }

    router.replace(
      '/chat' as any
    );
  }

  const otherIsVerifiedDonor =
    myRole ===
      'requester' &&
    Boolean(
      coordination
        ?.donor
        ?.verified
    );

  const headerSubtitle =
    loading
      ? 'Opening conversation'
      : isReleased
        ? 'Marked as a no-show'
        : myRole ===
          'requester'
        ? [
            'Donor',
            coordination
              ?.donor
              ?.blood_type,
          ]
            .filter(Boolean)
            .join(' · ')
        : `Requester · needs ${request?.blood_type || 'blood'}`;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          // The header is drawn behind the status bar.
          edges={[
            'left',
            'right',
          ]}
        >
          <StatusBar style="light" />

          {/* ==================================================
              HEADER (same as Request Blood)
          ================================================== */}

          <LinearGradient
            colors={[
              COLORS.headerTop,
              COLORS.redDark,
            ]}
            style={withStatusBar(styles.header, insets.top)}
          >
            <View style={shiftedDown(styles.headerCircleLeft, insets.top)} />
            <View style={shiftedDown(styles.headerCircleRight, insets.top)} />

            <View style={styles.headerRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.headerButton}
                onPress={goBack}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={COLORS.white}
                />
              </TouchableOpacity>

              <PersonAvatar
                uri={
                  otherPerson
                    ?.profile_photo_url
                }
                label={getInitials()}
                style={styles.headerAvatar}
                textStyle={styles.headerAvatarText}
              />

              <View style={styles.headerText}>
                <View style={styles.headerNameRow}>
                  <Text
                    numberOfLines={1}
                    style={styles.headerName}
                  >
                    {loading
                      ? 'Loading…'
                      : getOtherName()}
                  </Text>

                  {otherIsVerifiedDonor ? (
                    <View
                      style={styles.headerVerified}
                      accessible
                      accessibilityLabel="Verified donor"
                    >
                      <MaterialIcons
                        name="verified"
                        size={14}
                        color={COLORS.green}
                      />
                    </View>
                  ) : null}
                </View>

                <Text
                  numberOfLines={1}
                  style={styles.headerSubtitle}
                >
                  {headerSubtitle}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Chat options"
                disabled={
                  loading ||
                  !coordination
                }
                style={[
                  styles.headerButton,

                  (loading ||
                    !coordination) &&
                    styles.disabled,
                ]}
                onPress={openOptions}
              >
                <MaterialIcons
                  name="more-vert"
                  size={23}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <KeyboardAvoidingView
            style={styles.body}
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
            keyboardVerticalOffset={
              Platform.OS === 'ios'
                ? insets.top
                : 0
            }
          >
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.redButton}
                />

                <Text style={styles.centerText}>
                  Opening your conversation…
                </Text>
              </View>
            ) : error ? (
              <FadeInView style={styles.centerState}>
                <View style={styles.centerIcon}>
                  <MaterialIcons
                    name="error-outline"
                    size={28}
                    color={COLORS.redButton}
                  />
                </View>

                <Text style={styles.centerTitle}>
                  Unable to load chat
                </Text>

                <Text style={styles.centerText}>
                  {error}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={loadCoordination}
                >
                  <Text style={styles.primaryButtonText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </FadeInView>
            ) : coordination &&
              request ? (
              <>
                {/* ============================================
                    PINNED PROGRESS CARD
                ============================================ */}

                <View style={styles.pinnedWrap}>
                  <View style={styles.stepCard}>
                    <View style={styles.stepTop}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={
                          detailsOpen
                            ? 'Hide donation details'
                            : 'Show donation details'
                        }
                        style={styles.stepToggle}
                        onPress={toggleDetails}
                      >
                        <View
                          style={[
                            styles.stepIcon,
                            toneBackground(
                              nextStep.tone
                            ),
                          ]}
                        >
                          <MaterialIcons
                            name={nextStep.icon}
                            size={19}
                            color={toneColor(
                              nextStep.tone
                            )}
                          />
                        </View>

                        <FadeInView
                          key={nextStep.title}
                          offset={4}
                          style={styles.stepText}
                        >
                          <Text
                            numberOfLines={1}
                            style={styles.stepTitle}
                          >
                            {nextStep.title}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={styles.stepDetail}
                          >
                            {nextStep.detail}
                          </Text>
                        </FadeInView>
                      </TouchableOpacity>

                      {nextStep.action ? (
                        <PressableScale
                          style={styles.stepAction}
                          disabled={
                            nextStep.action.busy
                          }
                          accessibilityRole="button"
                          onPress={
                            nextStep.action.onPress
                          }
                        >
                          {nextStep.action.busy ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.white}
                            />
                          ) : (
                            <Text style={styles.stepActionText}>
                              {nextStep.action.label}
                            </Text>
                          )}
                        </PressableScale>
                      ) : null}

                      <TouchableOpacity
                        accessibilityLabel={
                          detailsOpen
                            ? 'Hide donation details'
                            : 'Show donation details'
                        }
                        style={styles.stepChevron}
                        onPress={toggleDetails}
                      >
                        <MaterialIcons
                          name={
                            detailsOpen
                              ? 'expand-less'
                              : 'expand-more'
                          }
                          size={22}
                          color={COLORS.lightMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    {nextStep.choices ? (
                      <FadeInView
                        key={`choices-${schedule?.scheduled_at || ''}`}
                        offset={4}
                        style={styles.stepChoices}
                      >
                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={0.8}
                          disabled={
                            nextStep.choices
                              .primary.busy ||
                            nextStep.choices
                              .secondary.busy
                          }
                          style={styles.stepChoiceSecondary}
                          onPress={
                            nextStep.choices
                              .secondary.onPress
                          }
                        >
                          {nextStep.choices
                            .secondary.busy ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.redButton}
                            />
                          ) : (
                            <Text
                              numberOfLines={1}
                              style={styles.stepChoiceSecondaryText}
                            >
                              {
                                nextStep.choices
                                  .secondary.label
                              }
                            </Text>
                          )}
                        </TouchableOpacity>

                        <PressableScale
                          containerStyle={
                            styles.stepChoicePrimaryWrap
                          }
                          style={styles.stepChoicePrimary}
                          disabled={
                            nextStep.choices
                              .primary.busy ||
                            nextStep.choices
                              .secondary.busy
                          }
                          accessibilityRole="button"
                          onPress={
                            nextStep.choices
                              .primary.onPress
                          }
                        >
                          {nextStep.choices
                            .primary.busy ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.white}
                            />
                          ) : (
                            <Text style={styles.stepActionText}>
                              {
                                nextStep.choices
                                  .primary.label
                              }
                            </Text>
                          )}
                        </PressableScale>
                      </FadeInView>
                    ) : null}

                    <ProgressSteps
                      done={stepsDone}
                    />

                    {/* DETAILS */}

                    {detailsOpen ? (
                      <FadeInView
                        offset={-6}
                        style={styles.details}
                      >
                        {/* REQUEST */}

                        <DetailRow
                          icon="bloodtype"
                          label={`${request.units_needed} ${request.units_needed === 1 ? 'bag' : 'bags'} of ${request.blood_type} · ${request.urgency === 'urgent' ? 'Urgent' : 'Scheduled'}`}
                          value={request.facility_name}
                          detail={
                            request.facility_address ||
                            undefined
                          }
                          actionLabel="Directions"
                          onAction={openLocation}
                        />

                        {/* SCHEDULE */}

                        <DetailRow
                          icon="event"
                          label="Meeting time"
                          value={
                            schedule
                              ? formatSchedule(
                                  schedule.scheduled_at
                                )
                              : 'Not set yet'
                          }
                          detail={
                            [
                              !schedule
                                ? ''
                                : scheduleAgreed
                                  ? 'Agreed by both of you'
                                  : suggestedByMe
                                    ? `Suggested by you · waiting for ${getOtherFirstName()}`
                                    : `Suggested by ${getOtherFirstName()} · waiting for you`,

                              schedule?.note,

                              !isClosed &&
                              !isReleased
                                ? scheduleLimitText
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ') ||
                            undefined
                          }
                          actionLabel={
                            isClosed ||
                            isReleased ||
                            scheduleLimitPassed
                              ? undefined
                              : schedule
                                ? 'Change'
                                : 'Suggest'
                          }
                          onAction={
                            handleOpenSchedule
                          }
                        />

                        {/* DONATION */}

                        <DetailRow
                          icon="volunteer-activism"
                          label="Donation"
                          value={
                            donation
                              ? donation.status ===
                                'rejected'
                                ? 'Record not accepted'
                                : `${donation.units_donated} ${donation.units_donated === 1 ? 'bag' : 'bags'} · ${new Date(donation.donated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                              : isReleased
                                ? 'Donor marked as a no-show'
                                : 'Not confirmed yet'
                          }
                          detail={
                            donation?.status ===
                            'needs_review'
                              ? 'Hemo-Hero is taking a quick look.'
                              : donation?.status ===
                                  'rejected'
                                ? donation.admin_note ||
                                  undefined
                                : !donation &&
                                    myRole ===
                                      'donor'
                                  ? 'The requester confirms it after you donate.'
                                  : undefined
                          }
                          actionLabel={
                            myRole ===
                              'requester' &&
                            !isClosed &&
                            !isReleased &&
                            (!donation ||
                              donation.status ===
                                'rejected')
                              ? 'Confirm'
                              : undefined
                          }
                          onAction={
                            handleConfirmDonation
                          }
                        />

                        {/* RATINGS */}

                        {canRate ? (
                          <DetailRow
                            icon="star-outline"
                            label="Ratings"
                            value={
                              myRating
                                ? `You rated ${myRating.rating}/5`
                                : 'You haven’t rated yet'
                            }
                            detail={
                              theirRating
                                ? `${getOtherFirstName()} rated you ${theirRating.rating}/5${theirRating.comment ? ` · “${theirRating.comment}”` : ''}`
                                : `${getOtherFirstName()} hasn’t rated yet`
                            }
                            actionLabel={
                              myRating
                                ? 'Edit'
                                : 'Rate'
                            }
                            onAction={() =>
                              setRatingMode(
                                'feedback'
                              )
                            }
                          />
                        ) : null}

                        <View style={styles.detailLinks}>
                          <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.detailLink}
                            onPress={handleViewRequest}
                          >
                            <Text style={styles.detailLinkText}>
                              View request
                            </Text>
                          </TouchableOpacity>

                          {myRole ===
                            'requester' &&
                          donationActive &&
                          request.status ===
                            'active' ? (
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={styles.detailLink}
                              disabled={fulfilling}
                              onPress={handleFulfill}
                            >
                              <Text style={styles.detailLinkText}>
                                Mark fulfilled
                              </Text>
                            </TouchableOpacity>
                          ) : null}

                          {canReportNoShow ? (
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={styles.detailLink}
                              onPress={openNoShow}
                            >
                              <Text style={styles.detailLinkMuted}>
                                Didn’t show up?
                              </Text>
                            </TouchableOpacity>
                          ) : null}

                          {canDispute ? (
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={styles.detailLink}
                              onPress={() =>
                                setRatingMode(
                                  'dispute'
                                )
                              }
                            >
                              <Text style={styles.detailLinkMuted}>
                                Report a problem
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </FadeInView>
                    ) : null}
                  </View>
                </View>

                {/* ============================================
                    MESSAGES
                ============================================ */}

                <ScrollView
                  ref={scrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.chatContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={
                    Platform.OS === 'ios'
                      ? 'interactive'
                      : 'on-drag'
                  }
                  scrollEventThrottle={100}
                  onScroll={({
                    nativeEvent,
                  }) => {
                    nearBottom.current =
                      nativeEvent.contentSize
                        .height -
                        nativeEvent
                          .layoutMeasurement
                          .height -
                        nativeEvent
                          .contentOffset.y <
                      100;
                  }}
                  onContentSizeChange={() => {
                    if (
                      shouldScroll.current
                    ) {
                      scrollRef.current?.scrollToEnd({
                        animated: false,
                      });

                      shouldScroll.current =
                        false;
                    }
                  }}
                >
                  <View style={styles.safetyNote}>
                    <MaterialIcons
                      name="lock-outline"
                      size={14}
                      color={COLORS.lightMuted}
                    />

                    <Text style={styles.safetyText}>
                      Only you and {getOtherFirstName()} can see this chat.
                      Meet only at the donation place.
                    </Text>
                  </View>

                  {messages.length === 0 ? (
                    <FadeInView style={styles.emptyChat}>
                      <View style={styles.emptyIcon}>
                        <MaterialIcons
                          name="waving-hand"
                          size={26}
                          color={COLORS.redButton}
                        />
                      </View>

                      <Text style={styles.emptyTitle}>
                        Say hello to {getOtherFirstName()}
                      </Text>

                      <Text style={styles.emptyText}>
                        Agree on a time to meet at{' '}
                        {request.facility_name}.
                      </Text>
                    </FadeInView>
                  ) : (
                    messages.map(
                      (
                        message,
                        index
                      ) => {
                        const previous =
                          messages[
                            index - 1
                          ];

                        const next =
                          messages[
                            index + 1
                          ];

                        const newDay =
                          !previous ||
                          new Date(
                            previous.created_at
                          ).toDateString() !==
                            new Date(
                              message.created_at
                            ).toDateString();

                        const groupedWithPrevious =
                          !newDay &&
                          isGrouped(
                            previous,
                            message
                          );

                        const groupedWithNext =
                          isGrouped(
                            message,
                            next
                          );

                        const mine =
                          message.is_mine;

                        const showMeta =
                          !groupedWithNext ||
                          Boolean(
                            message.localStatus
                          );

                        return (
                          <View
                            key={
                              messageKeys.current.get(
                                message.id
                              ) ||
                              message.id
                            }
                          >
                            {newDay ? (
                              <View style={styles.dayChipWrap}>
                                <Text style={styles.dayChip}>
                                  {dayLabel(
                                    message.created_at
                                  )}
                                </Text>
                              </View>
                            ) : null}

                            <FadeInView
                              offset={6}
                              style={[
                                styles.messageRow,

                                mine
                                  ? styles.messageRowMine
                                  : styles.messageRowOther,

                                groupedWithPrevious
                                  ? styles.messageRowGrouped
                                  : null,
                              ]}
                            >
                              {!mine ? (
                                groupedWithNext ? (
                                  <View style={styles.avatarSpacer} />
                                ) : (
                                  <PersonAvatar
                                    uri={
                                      otherPerson
                                        ?.profile_photo_url
                                    }
                                    label={getInitials().charAt(0)}
                                    style={styles.messageAvatar}
                                    textStyle={styles.messageAvatarText}
                                  />
                                )
                              ) : null}

                              <View
                                style={[
                                  styles.bubbleStack,

                                  mine &&
                                    styles.bubbleStackMine,
                                ]}
                              >
                                <Pressable
                                  disabled={
                                    message.localStatus !==
                                    'failed'
                                  }
                                  accessibilityRole={
                                    message.localStatus ===
                                    'failed'
                                      ? 'button'
                                      : undefined
                                  }
                                  accessibilityHint={
                                    message.localStatus ===
                                    'failed'
                                      ? 'Tap to send again'
                                      : undefined
                                  }
                                  onPress={() =>
                                    retryMessage(
                                      message
                                    )
                                  }
                                  style={[
                                    styles.bubble,

                                    mine
                                      ? styles.bubbleMine
                                      : styles.bubbleOther,

                                    mine &&
                                      groupedWithPrevious &&
                                      styles.bubbleMineJoinTop,

                                    mine &&
                                      groupedWithNext &&
                                      styles.bubbleMineJoinBottom,

                                    !mine &&
                                      groupedWithPrevious &&
                                      styles.bubbleOtherJoinTop,

                                    !mine &&
                                      groupedWithNext &&
                                      styles.bubbleOtherJoinBottom,

                                    message.localStatus ===
                                      'failed' &&
                                      styles.bubbleFailed,
                                  ]}
                                >
                                  <Text
                                    selectable
                                    style={[
                                      styles.bubbleText,

                                      mine &&
                                        message.localStatus !==
                                          'failed' &&
                                        styles.bubbleTextMine,
                                    ]}
                                  >
                                    {message.message}
                                  </Text>
                                </Pressable>

                                {showMeta ? (
                                  <View
                                    style={[
                                      styles.metaRow,

                                      mine &&
                                        styles.metaRowMine,
                                    ]}
                                  >
                                    {message.localStatus ===
                                    'failed' ? (
                                      <>
                                        <MaterialIcons
                                          name="error-outline"
                                          size={13}
                                          color={COLORS.redButton}
                                        />

                                        <Text style={styles.metaFailed}>
                                          Not sent · Tap to retry
                                        </Text>
                                      </>
                                    ) : message.localStatus ===
                                      'sending' ? (
                                      <Text style={styles.metaText}>
                                        Sending…
                                      </Text>
                                    ) : (
                                      <>
                                        <Text style={styles.metaText}>
                                          {formatMessageTime(
                                            message.created_at
                                          )}
                                        </Text>

                                        {mine ? (
                                          <MaterialIcons
                                            name="done"
                                            size={13}
                                            color={COLORS.lightMuted}
                                          />
                                        ) : null}
                                      </>
                                    )}
                                  </View>
                                ) : null}
                              </View>
                            </FadeInView>
                          </View>
                        );
                      }
                    )
                  )}
                </ScrollView>

                {/* ============================================
                    QUICK REPLIES
                ============================================ */}

                {!isClosed &&
                !messageText.trim() &&
                quickReplies.length > 0 ? (
                  <ScrollView
                    horizontal
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
                    style={styles.quickRepliesScroll}
                    contentContainerStyle={styles.quickReplies}
                  >
                    {quickReplies.map(reply => (
                      <TouchableOpacity
                        key={reply}
                        accessibilityRole="button"
                        accessibilityLabel={`Use message: ${reply}`}
                        style={styles.quickReply}
                        activeOpacity={0.75}
                        onPress={() =>
                          setMessageText(reply)
                        }
                      >
                        <Text style={styles.quickReplyText}>
                          {reply}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}

                {/* ============================================
                    COMPOSER / CLOSED
                ============================================ */}

                <View
                  style={[
                    styles.composer,

                    {
                      paddingBottom:
                        keyboardVisible
                          ? 10
                          : Math.max(
                              insets.bottom,
                              12
                            ),
                    },
                  ]}
                >
                  {isClosed ? (
                    <View style={styles.closedBar}>
                      <MaterialIcons
                        name="lock-outline"
                        size={16}
                        color={COLORS.muted}
                      />

                      <Text style={styles.closedText}>
                        This request is {request.status}. The chat is read-only.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.inputWrap}>
                        <TextInput
                          value={messageText}
                          onChangeText={
                            setMessageText
                          }
                          accessibilityLabel="Message"
                          placeholder={`Message ${getOtherFirstName()}…`}
                          placeholderTextColor={
                            COLORS.lightMuted
                          }
                          maxLength={1000}
                          multiline
                          onContentSizeChange={({
                            nativeEvent,
                          }) =>
                            setComposerHeight(
                              Math.max(
                                44,
                                Math.min(
                                  110,
                                  nativeEvent
                                    .contentSize
                                    .height
                                )
                              )
                            )
                          }
                          style={[
                            styles.input,

                            {
                              height:
                                composerHeight,
                            },
                          ]}
                        />
                      </View>

                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        disabled={
                          !messageText.trim()
                        }
                        style={[
                          styles.sendButton,

                          !messageText.trim() &&
                            styles.sendButtonIdle,
                        ]}
                        onPress={() =>
                          handleSendMessage()
                        }
                      >
                        <MaterialIcons
                          name="send"
                          size={19}
                          color={
                            messageText.trim()
                              ? COLORS.white
                              : COLORS.lightMuted
                          }
                        />
                      </PressableScale>
                    </>
                  )}
                </View>
              </>
            ) : null}
          </KeyboardAvoidingView>

          {/* ==================================================
              CHAT OPTIONS / FEEDBACK / REPORT
          ================================================== */}

          <Sheet
            visible={
              supportView !==
              null
            }
            onClose={closeSupport}
            maxHeight={
              windowHeight -
              insets.top -
              24
            }
          >
            <View style={styles.sheetHeader}>
              {supportView ===
                'feedback' ||
              supportView ===
                'report' ||
              supportView ===
                'noshow' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Back to chat options"
                  disabled={supportSending}
                  style={styles.sheetIconButton}
                  onPress={() => {
                    setSupportError('');

                    setSupportView(
                      'menu'
                    );
                  }}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={20}
                    color={COLORS.black}
                  />
                </TouchableOpacity>
              ) : null}

              <Text
                accessibilityRole="header"
                style={styles.sheetTitle}
              >
                {supportView ===
                'menu'
                  ? 'Chat Options'
                  : supportView ===
                      'feedback'
                    ? 'Feedback to Hemo-Hero'
                    : supportView ===
                        'report'
                      ? `Report ${getOtherFirstName()}`
                      : supportView ===
                          'noshow'
                        ? 'Report a No-show'
                        : submittedSupportKind ===
                            'feedback'
                          ? 'Feedback Sent'
                          : 'Report Sent'}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close"
                disabled={supportSending}
                style={styles.sheetIconButton}
                onPress={closeSupport}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {supportView ===
            'menu' ? (
              <View style={styles.optionList}>
                <OptionRow
                  icon="description"
                  title="View request"
                  subtitle={`${request?.blood_type || ''} · ${request?.facility_name || ''}`}
                  onPress={() => {
                    closeSupport();

                    handleViewRequest();
                  }}
                />

                <OptionRow
                  icon="near-me"
                  title="Directions"
                  subtitle="Open the donation place in maps"
                  onPress={() => {
                    closeSupport();

                    void openLocation();
                  }}
                />

                {tripInfo?.can_track &&
                tripInfo.destination &&
                (myRole ===
                  'donor' ||
                  tripInfo.trip?.status ===
                    'on_the_way' ||
                  tripInfo.trip?.status ===
                    'arrived') ? (
                  <OptionRow
                    icon="directions-car"
                    title={
                      myRole ===
                      'donor'
                        ? 'On my way (live map)'
                        : 'Track donor'
                    }
                    subtitle={
                      myRole ===
                      'donor'
                        ? 'Share your location until you arrive'
                        : 'See where your donor is on the map'
                    }
                    onPress={() => {
                      closeSupport();

                      openTrip();
                    }}
                  />
                ) : null}

                {canRate ? (
                  <OptionRow
                    icon="star-outline"
                    title={
                      myRating
                        ? 'Edit your rating'
                        : `Rate ${getOtherFirstName()}`
                    }
                    subtitle="They will see your rating"
                    onPress={() => {
                      closeSupport();

                      setTimeout(
                        () =>
                          setRatingMode(
                            'feedback'
                          ),
                        300
                      );
                    }}
                  />
                ) : null}

                {canReportNoShow ? (
                  <OptionRow
                    icon="event-busy"
                    title={`${getOtherFirstName()} didn’t show up`}
                    subtitle="The meeting time passed"
                    danger
                    onPress={() =>
                      setSupportView(
                        'noshow'
                      )
                    }
                  />
                ) : null}

                <OptionRow
                  icon="chat-bubble-outline"
                  title="Feedback to Hemo-Hero"
                  subtitle="Tell us how coordinating went"
                  onPress={() =>
                    setSupportView(
                      'feedback'
                    )
                  }
                />

                <OptionRow
                  icon="outlined-flag"
                  title={`Report ${getOtherFirstName()}`}
                  subtitle="Tell us about a concern"
                  danger
                  onPress={() =>
                    setSupportView(
                      'report'
                    )
                  }
                />
              </View>
            ) : supportView ===
              'success' ? (
              <FadeInView style={styles.sheetSuccess}>
                <View style={styles.successIcon}>
                  <MaterialIcons
                    name="check"
                    size={30}
                    color={COLORS.white}
                  />
                </View>

                <Text style={styles.sheetText}>
                  {submittedSupportKind ===
                  'noshow'
                    ? myRole ===
                      'requester'
                      ? `Reported. ${getOtherFirstName()} was notified and Hemo-Hero will review it. Your request is still open to other donors.`
                      : `Reported. Thank you for going. ${getOtherFirstName()} was notified and Hemo-Hero will review it.`
                    : submittedSupportKind ===
                        'report'
                      ? 'Your report was submitted. Hemo-Hero will review it.'
                      : 'Thank you for sharing your experience.'}
                </Text>

                {submittedSupportKind ===
                  'noshow' &&
                myRole ===
                  'requester' &&
                request ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.secondaryButton,
                      styles.fullWidth,
                      styles.successSecondary,
                    ]}
                    onPress={() => {
                      closeSupport();

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
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Find Another Donor
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,
                  ]}
                  onPress={closeSupport}
                >
                  <Text style={styles.primaryButtonText}>
                    Done
                  </Text>
                </TouchableOpacity>
              </FadeInView>
            ) : supportView ===
              'noshow' ? (
              <>
                <View style={styles.noShowCard}>
                  <MaterialIcons
                    name="event-busy"
                    size={20}
                    color={COLORS.redButton}
                  />

                  <Text style={styles.noShowCardText}>
                    {agreedSchedule
                      ? `You agreed to meet ${formatSchedule(agreedSchedule.scheduled_at)} at ${request?.facility_name || 'the donation place'}.`
                      : 'The agreed meeting time has passed.'}
                  </Text>
                </View>

                <Text style={styles.sheetIntro}>
                  {myRole ===
                  'requester'
                    ? `Report that ${getOtherFirstName()} didn’t come. They’ll be notified and can explain in the chat, and Hemo-Hero will review it.`
                    : `Report that ${getOtherFirstName()} wasn’t there. They’ll be notified and can explain in the chat, and Hemo-Hero will review it.`}
                </Text>

                <Text style={styles.fieldLabel}>
                  What happened{' '}
                  <Text style={styles.fieldOptional}>
                    (optional)
                  </Text>
                </Text>

                <TextInput
                  accessibilityLabel="What happened"
                  value={noShowText}
                  onChangeText={
                    setNoShowText
                  }
                  placeholder={
                    myRole ===
                    'requester'
                      ? 'e.g. I waited at the blood bank for an hour'
                      : 'e.g. I went at the agreed time but no one was there'
                  }
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  multiline
                  maxLength={1000}
                  editable={
                    !supportSending
                  }
                  textAlignVertical="top"
                  style={styles.sheetInput}
                />

                <Text style={styles.counter}>
                  {noShowText.length}/1000
                </Text>

                {supportError ? (
                  <FadeInView
                    key={supportError}
                    offset={4}
                    style={styles.errorBox}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={17}
                      color={COLORS.redButton}
                    />

                    <Text
                      accessibilityRole="alert"
                      style={styles.errorText}
                    >
                      {supportError}
                    </Text>
                  </FadeInView>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{
                    busy:
                      supportSending,
                  }}
                  disabled={
                    supportSending
                  }
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,

                    supportSending &&
                      styles.disabled,
                  ]}
                  onPress={
                    handleSubmitSupport
                  }
                >
                  {supportSending ? (
                    <ActivityIndicator
                      color={COLORS.white}
                    />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Report No-show
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetIntro}>
                  {supportView ===
                  'report'
                    ? `What would you like to report about ${getOtherName()}?`
                    : `How was coordinating with ${getOtherName()}? Only Hemo-Hero sees this.`}
                </Text>

                {supportView ===
                'report' ? (
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Report reason"
                    style={styles.reasonList}
                  >
                    {REPORT_REASONS.map(
                      reason => {
                        const selected =
                          reportReason ===
                          reason;

                        return (
                          <TouchableOpacity
                            key={reason}
                            accessibilityRole="radio"
                            accessibilityState={{
                              checked:
                                selected,
                              disabled:
                                supportSending,
                            }}
                            disabled={
                              supportSending
                            }
                            style={[
                              styles.reason,

                              selected &&
                                styles.reasonSelected,
                            ]}
                            onPress={() =>
                              setReportReason(
                                reason
                              )
                            }
                          >
                            <MaterialIcons
                              name={
                                selected
                                  ? 'radio-button-checked'
                                  : 'radio-button-unchecked'
                              }
                              size={19}
                              color={
                                selected
                                  ? COLORS.redButton
                                  : COLORS.lightMuted
                              }
                            />

                            <Text style={styles.reasonText}>
                              {reason}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>
                  {supportView ===
                  'report'
                    ? 'Details (optional)'
                    : 'Your feedback'}
                </Text>

                <TextInput
                  accessibilityLabel={
                    supportView ===
                    'report'
                      ? 'Report details'
                      : 'Your feedback'
                  }
                  value={
                    supportView ===
                    'report'
                      ? reportText
                      : feedbackText
                  }
                  onChangeText={
                    supportView ===
                    'report'
                      ? setReportText
                      : setFeedbackText
                  }
                  placeholder={
                    supportView ===
                    'report'
                      ? 'Describe what happened…'
                      : 'What went well, or what could be better?'
                  }
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  multiline
                  maxLength={1000}
                  editable={
                    !supportSending
                  }
                  textAlignVertical="top"
                  style={styles.sheetInput}
                />

                <Text style={styles.counter}>
                  {
                    (
                      supportView ===
                      'report'
                        ? reportText
                        : feedbackText
                    ).length
                  }
                  /1000
                </Text>

                {supportError ? (
                  <FadeInView
                    key={supportError}
                    offset={4}
                    style={styles.errorBox}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={17}
                      color={COLORS.redButton}
                    />

                    <Text
                      accessibilityRole="alert"
                      style={styles.errorText}
                    >
                      {supportError}
                    </Text>
                  </FadeInView>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      !canSubmitSupport,
                    busy:
                      supportSending,
                  }}
                  disabled={
                    !canSubmitSupport
                  }
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,

                    !canSubmitSupport &&
                      styles.disabled,
                  ]}
                  onPress={
                    handleSubmitSupport
                  }
                >
                  {supportSending ? (
                    <ActivityIndicator
                      color={COLORS.white}
                    />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {supportView ===
                      'report'
                        ? 'Send Report'
                        : 'Send Feedback'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Sheet>

          {/* ==================================================
              SCHEDULE
          ================================================== */}

          <Sheet
            visible={
              scheduleModalVisible
            }
            onClose={() => {
              if (
                datePickerVisible
              ) {
                setDatePickerVisible(
                  false
                );
              } else if (
                timePickerVisible
              ) {
                setTimePickerVisible(
                  false
                );
              } else if (
                !savingSchedule
              ) {
                setScheduleModalVisible(
                  false
                );
              }
            }}
            maxHeight={
              windowHeight -
              insets.top -
              24
            }
          >
            {datePickerVisible ? (
              <>
                <View style={styles.sheetHeader}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Back to schedule"
                    style={styles.sheetIconButton}
                    onPress={() =>
                      setDatePickerVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={20}
                      color={COLORS.black}
                    />
                  </TouchableOpacity>

                  <Text style={styles.sheetTitle}>
                    Pick a Date
                  </Text>

                  <View style={styles.sheetIconSpacer} />
                </View>

                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    style={styles.calendarArrow}
                    onPress={() =>
                      changeCalendarMonth(
                        -1
                      )
                    }
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={22}
                      color={COLORS.redButton}
                    />
                  </TouchableOpacity>

                  <Text style={styles.calendarMonth}>
                    {calendarCursor.toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </Text>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    style={styles.calendarArrow}
                    onPress={() =>
                      changeCalendarMonth(
                        1
                      )
                    }
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color={COLORS.redButton}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekRow}>
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
                        key={`${label}-${index}`}
                        style={styles.weekText}
                      >
                        {label}
                      </Text>
                    )
                  )}
                </View>

                <View style={styles.calendarGrid}>
                  {getCalendarDays().map(
                    item => {
                      if (
                        item.type ===
                        'empty'
                      ) {
                        return (
                          <View
                            key={item.key}
                            style={styles.dayCell}
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

                      const unavailable =
                        isPastCalendarDate(
                          item.date
                        ) ||
                        isAfterScheduleLimit(
                          item.date
                        );

                      const isToday =
                        isSameCalendarDate(
                          item.date,
                          new Date()
                        );

                      return (
                        <TouchableOpacity
                          key={item.key}
                          accessibilityRole="button"
                          accessibilityState={{
                            disabled: unavailable,
                            selected,
                          }}
                          accessibilityLabel={item.date.toLocaleDateString(
                            'en-US',
                            {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                          style={styles.dayCell}
                          disabled={unavailable}
                          onPress={() =>
                            setTempSelectedDate(
                              item.date
                            )
                          }
                        >
                          <View
                            style={[
                              styles.dayCircle,

                              isToday &&
                                !selected &&
                                styles.dayCircleToday,

                              selected &&
                                styles.dayCircleSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,

                                unavailable &&
                                  styles.dayTextPast,

                                selected &&
                                  styles.dayTextSelected,
                              ]}
                            >
                              {item.date.getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={
                    !tempSelectedDate
                  }
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,

                    !tempSelectedDate &&
                      styles.disabled,
                  ]}
                  onPress={
                    confirmDatePicker
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Use This Date
                  </Text>
                </TouchableOpacity>
              </>
            ) : timePickerVisible ? (
              <>
                <View style={styles.sheetHeader}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Back to schedule"
                    style={styles.sheetIconButton}
                    onPress={() =>
                      setTimePickerVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={20}
                      color={COLORS.black}
                    />
                  </TouchableOpacity>

                  <Text style={styles.sheetTitle}>
                    Pick a Time
                  </Text>

                  <View style={styles.sheetIconSpacer} />
                </View>

                <TimeWheelPicker
                  hour={tempHour}
                  minute={tempMinute}
                  period={tempPeriod}
                  onHourChange={setTempHour}
                  onMinuteChange={setTempMinute}
                  onPeriodChange={setTempPeriod}
                />

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,
                  ]}
                  onPress={
                    confirmTimePicker
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Use This Time
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetIconSpacer} />

                  <Text style={styles.sheetTitle}>
                    Meeting Time
                  </Text>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    disabled={savingSchedule}
                    style={styles.sheetIconButton}
                    onPress={() =>
                      setScheduleModalVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={COLORS.muted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sheetIntro}>
                  {getOtherFirstName()} can agree to this time or suggest another. It's set once you both agree.
                </Text>

                {scheduleLimitText ? (
                  <View style={styles.limitNote}>
                    <MaterialIcons
                      name={
                        request?.urgency ===
                        'urgent'
                          ? 'bolt'
                          : 'event'
                      }
                      size={16}
                      color={COLORS.redButton}
                    />

                    <Text style={styles.limitNoteText}>
                      {scheduleLimitText}. Pick a time on or
                      before then.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.fieldRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.pickerField}
                    activeOpacity={0.8}
                    onPress={
                      openDatePicker
                    }
                  >
                    <MaterialIcons
                      name="calendar-today"
                      size={17}
                      color={
                        scheduleDate
                          ? COLORS.redButton
                          : COLORS.lightMuted
                      }
                    />

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      maxFontSizeMultiplier={1.3}
                      style={styles.pickerFieldText}
                    >
                      {formatScheduleDateField()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.pickerField}
                    activeOpacity={0.8}
                    onPress={
                      openTimePicker
                    }
                  >
                    <MaterialIcons
                      name="schedule"
                      size={18}
                      color={
                        scheduleTime
                          ? COLORS.redButton
                          : COLORS.lightMuted
                      }
                    />

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      maxFontSizeMultiplier={1.3}
                      style={styles.pickerFieldText}
                    >
                      {formatScheduleTimeField()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>
                  Note{' '}
                  <Text style={styles.fieldOptional}>
                    (optional)
                  </Text>
                </Text>

                <TextInput
                  accessibilityLabel="Meeting note"
                  value={scheduleNote}
                  onChangeText={
                    setScheduleNote
                  }
                  placeholder="e.g. Meet at the blood bank entrance"
                  placeholderTextColor={
                    COLORS.lightMuted
                  }
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  style={styles.sheetInput}
                />

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={
                    savingSchedule
                  }
                  style={[
                    styles.primaryButton,
                    styles.fullWidth,
                    styles.buttonSpaced,

                    savingSchedule &&
                      styles.disabled,
                  ]}
                  onPress={
                    handleSaveSchedule
                  }
                >
                  {savingSchedule ? (
                    <ActivityIndicator
                      color={COLORS.white}
                    />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Suggest This Time
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Sheet>

          {/* ==================================================
              CONFIRM DONATION / RATE / REPORT A PROBLEM
          ================================================== */}

          <ConfirmDonationSheet
            visible={confirmVisible}
            donorName={getOtherFirstName()}
            bloodType={
              request?.blood_type ||
              ''
            }
            requestCreatedAt={
              request?.created_at
            }
            onClose={() =>
              setConfirmVisible(
                false
              )
            }
            onSubmit={
              submitConfirmedDonation
            }
          />

          <DonationFeedbackModal
            visible={
              ratingMode !==
              null
            }
            mode={
              ratingMode ||
              'feedback'
            }
            title={
              ratingMode ===
              'dispute'
                ? 'Report a Problem'
                : `Rate ${getOtherFirstName()}`
            }
            subtitle={
              ratingMode ===
              'dispute'
                ? 'Tell Hemo-Hero what is wrong with this donation record.'
                : myRole ===
                    'requester'
                  ? 'How was the donation? Your rating is shared with the donor.'
                  : 'How was coordinating the donation? Your rating is shared with the requester.'
            }
            initialRating={
              myRating?.rating ||
              0
            }
            // A problem report starts empty; only the rating
            // reuses the earlier comment.
            initialComment={
              ratingMode ===
              'dispute'
                ? ''
                : myRating?.comment ||
                  ''
            }
            quickNotes={
              myRole ===
              'requester'
                ? DONOR_FEEDBACK_NOTES
                : REQUESTER_FEEDBACK_NOTES
            }
            onClose={() =>
              setRatingMode(
                null
              )
            }
            onSubmit={
              submitRating
            }
          />

          {/* ==================================================
              IN-APP MESSAGE
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
            <View style={styles.popupOverlay}>
              <FadeInView
                offset={10}
                style={styles.popupCard}
              >
                <View
                  style={[
                    styles.popupIcon,

                    toneBackground(
                      actionPopup.variant ===
                        'success'
                        ? 'green'
                        : actionPopup.variant ===
                            'warning'
                          ? 'orange'
                          : 'accent'
                    ),
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
                    size={28}
                    color={toneColor(
                      actionPopup.variant ===
                        'success'
                        ? 'green'
                        : actionPopup.variant ===
                            'warning'
                          ? 'orange'
                          : 'accent'
                    )}
                  />
                </View>

                <Text style={styles.popupTitle}>
                  {actionPopup.title}
                </Text>

                <Text style={styles.popupMessage}>
                  {actionPopup.message}
                </Text>

                <View style={styles.popupActions}>
                  {actionPopup.showCancel ? (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      style={styles.secondaryButton}
                      onPress={
                        closeActionPopup
                      }
                    >
                      <Text style={styles.secondaryButtonText}>
                        {actionPopup.cancelText}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.primaryButton,
                      styles.flexButton,
                    ]}
                    onPress={() => {
                      const action =
                        actionPopup.onConfirm;

                      closeActionPopup();

                      if (action) {
                        action();
                      }
                    }}
                  >
                    <Text style={styles.primaryButtonText}>
                      {actionPopup.confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </FadeInView>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// TONE HELPERS
// ============================================================

type Tone =
  | 'accent'
  | 'green'
  | 'orange'
  | 'muted';

function toneColor(
  tone: Tone
) {
  switch (tone) {
    case 'green':
      return COLORS.green;

    case 'orange':
      return COLORS.orange;

    case 'muted':
      return COLORS.muted;

    default:
      return COLORS.redButton;
  }
}

function toneBackground(
  tone: Tone
) {
  switch (tone) {
    case 'green':
      return {
        backgroundColor:
          COLORS.greenLight,
      };

    case 'orange':
      return {
        backgroundColor:
          COLORS.orangeLight,
      };

    case 'muted':
      return {
        backgroundColor:
          COLORS.page,
      };

    default:
      return {
        backgroundColor:
          COLORS.pinkLight,
      };
  }
}

// ============================================================
// PROGRESS STEPS
//
// Four segments (Accepted, Scheduled, Donated, Rated). A newly
// completed segment fills with a short animation.
// ============================================================

const STEP_LABELS = [
  'Accepted',
  'Scheduled',
  'Donated',
  'Rated',
];

function ProgressSteps({
  done,
}: {
  done: boolean[];
}) {
  return (
    <View style={styles.progress}>
      {STEP_LABELS.map(
        (
          label,
          index
        ) => (
          <View
            key={label}
            style={styles.progressItem}
          >
            <ProgressSegment
              filled={Boolean(
                done[index]
              )}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.progressLabel,

                done[index] &&
                  styles.progressLabelDone,
              ]}
            >
              {label}
            </Text>
          </View>
        )
      )}
    </View>
  );
}

function ProgressSegment({
  filled,
}: {
  filled: boolean;
}) {
  const value =
    useRef(
      new Animated.Value(
        filled ? 1 : 0
      )
    ).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: filled ? 1 : 0,
      duration: 420,
      easing: Easing.out(
        Easing.cubic
      ),
      useNativeDriver: false,
    }).start();
  }, [
    filled,
    value,
  ]);

  return (
    <View style={styles.segmentTrack}>
      <Animated.View
        style={[
          styles.segmentFill,

          {
            width: value.interpolate({
              inputRange: [0, 1],
              outputRange: [
                '0%',
                '100%',
              ],
            }),
          },
        ]}
      />
    </View>
  );
}

// ============================================================
// DETAIL ROW (pinned card, expanded)
// ============================================================

function DetailRow({
  icon,
  label,
  value,
  detail,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialIcons
          name={icon}
          size={17}
          color={COLORS.redButton}
        />
      </View>

      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={styles.detailValue}
        >
          {value}
        </Text>

        {detail ? (
          <Text
            numberOfLines={2}
            style={styles.detailText}
          >
            {detail}
          </Text>
        ) : null}
      </View>

      {actionLabel &&
      onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.detailAction}
          activeOpacity={0.75}
          onPress={onAction}
        >
          <Text style={styles.detailActionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ============================================================
// OPTION ROW (chat options sheet)
// ============================================================

function OptionRow({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.option}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View
        style={[
          styles.optionIcon,

          danger &&
            styles.optionIconDanger,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={
            danger
              ? COLORS.redButton
              : COLORS.black
          }
        />
      </View>

      <View style={styles.optionBody}>
        <Text
          style={[
            styles.optionTitle,

            danger &&
              styles.optionTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.optionSubtitle}
        >
          {subtitle}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={22}
        color={COLORS.lightMuted}
      />
    </TouchableOpacity>
  );
}

// ============================================================
// SHEET (bottom sheet used by options and schedule)
// ============================================================

function Sheet({
  visible,
  onClose,
  maxHeight,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  maxHeight: number;
  children: ReactNode;
}) {
  const insets =
    useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <FadeInView
          offset={40}
          style={[
            styles.sheet,

            {
              maxHeight:
                Math.max(
                  260,
                  maxHeight
                ),
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom:
                Math.max(
                  insets.bottom,
                  14
                ) + 6,
            }}
          >
            {children}
          </ScrollView>
        </FadeInView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  disabled: {
    opacity: 0.45,
  },

  fullWidth: {
    alignSelf: 'stretch',
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
  // HEADER (same as Request Blood)
  // ==========================================================

  // Bottom padding leaves room for the rounded body, which
  // overlaps the header by 22.
  header: {
    paddingHorizontal: 12,
    paddingTop:
      Platform.OS === 'web'
        ? 16
        : 8,
    paddingBottom: 34,
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
    gap: 8,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  headerAvatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
  },

  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  headerName: {
    flexShrink: 1,
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
  },

  headerVerified: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  headerSubtitle: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  // Rounded body over the header (same as Request Blood).
  body: {
    flex: 1,
    marginTop: -22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  // ==========================================================
  // STATES
  // ==========================================================

  centerState: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.page,
  },

  centerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

  // ==========================================================
  // PINNED PROGRESS CARD
  // ==========================================================

  pinnedWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: COLORS.page,
  },

  stepCard: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.redDark,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  stepToggle: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  stepChevron: {
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepText: {
    flex: 1,
    minWidth: 0,
  },

  stepTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  stepDetail: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  stepAction: {
    minWidth: 74,
    height: 34,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.redButton,
  },

  stepActionText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },

  // Agree / Suggest another time, under the card.
  stepChoices: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },

  stepChoiceSecondary: {
    flex: 1.4,
    minWidth: 0,
    height: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  stepChoiceSecondaryText: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },

  stepChoicePrimaryWrap: {
    flex: 1,
    minWidth: 0,
  },

  stepChoicePrimary: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: COLORS.redButton,
  },

  progress: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 6,
  },

  progressItem: {
    flex: 1,
    minWidth: 0,
  },

  segmentTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBorder,
  },

  segmentFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.redButton,
  },

  progressLabel: {
    marginTop: 4,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },

  progressLabelDone: {
    color: COLORS.black,
  },

  details: {
    marginTop: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },

  detailRow: {
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  detailBody: {
    flex: 1,
    minWidth: 0,
  },

  detailLabel: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },

  detailValue: {
    marginTop: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  detailText: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  detailAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.white,
  },

  detailActionText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  detailLinks: {
    marginTop: 4,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },

  detailLink: {
    paddingVertical: 4,
  },

  detailLinkText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  detailLinkMuted: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  // ==========================================================
  // MESSAGES
  // ==========================================================

  chatContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    flexGrow: 1,
    backgroundColor: COLORS.page,
  },

  safetyNote: {
    alignSelf: 'center',
    maxWidth: 320,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },

  safetyText: {
    flexShrink: 1,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },

  emptyChat: {
    marginTop: 36,
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  emptyTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },

  emptyText: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  dayChipWrap: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },

  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    color: COLORS.muted,
    backgroundColor: '#F5E6E6',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  messageRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  messageRowGrouped: {
    marginTop: 3,
  },

  messageRowMine: {
    justifyContent: 'flex-end',
  },

  messageRowOther: {
    justifyContent: 'flex-start',
  },

  messageAvatar: {
    width: 28,
    height: 28,
    marginRight: 7,
    marginBottom: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  messageAvatarText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },

  avatarSpacer: {
    width: 35,
  },

  bubbleStack: {
    maxWidth: '78%',
    alignItems: 'flex-start',
  },

  bubbleStackMine: {
    alignItems: 'flex-end',
  },

  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },

  bubbleMine: {
    borderBottomRightRadius: 6,
    backgroundColor: COLORS.redButton,
  },

  bubbleOther: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  // Grouped bubbles keep a small corner where they touch.
  bubbleMineJoinTop: {
    borderTopRightRadius: 6,
  },

  bubbleMineJoinBottom: {
    borderBottomRightRadius: 6,
  },

  bubbleOtherJoinTop: {
    borderTopLeftRadius: 6,
  },

  bubbleOtherJoinBottom: {
    borderBottomLeftRadius: 6,
  },

  bubbleFailed: {
    borderWidth: 1,
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.white,
  },

  bubbleText: {
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
    lineHeight: 21,
  },

  bubbleTextMine: {
    color: COLORS.white,
  },

  metaRow: {
    marginTop: 3,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  metaRowMine: {
    justifyContent: 'flex-end',
  },

  metaText: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  metaFailed: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  // ==========================================================
  // QUICK REPLIES + COMPOSER
  // ==========================================================

  quickRepliesScroll: {
    flexGrow: 0,
    backgroundColor: COLORS.page,
  },

  quickReplies: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 7,
  },

  quickReply: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.white,
  },

  quickReplyText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  composer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  inputWrap: {
    flex: 1,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: COLORS.page,
  },

  input: {
    paddingTop:
      Platform.OS === 'ios'
        ? 12
        : 10,
    paddingBottom:
      Platform.OS === 'ios'
        ? 12
        : 10,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  sendButtonIdle: {
    backgroundColor: COLORS.pinkLight,
  },

  closedBar: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: COLORS.page,
  },

  closedText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  // ==========================================================
  // BUTTONS
  // ==========================================================

  primaryButton: {
    height: 48,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.redButton,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  secondaryButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  secondaryButtonText: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  flexButton: {
    flex: 1,
  },

  buttonSpaced: {
    marginTop: 18,
  },

  // ==========================================================
  // SHEETS
  // ==========================================================

  sheetOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },

  sheet: {
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.white,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    marginBottom: 14,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
  },

  sheetHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sheetTitle: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },

  sheetIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  sheetIconSpacer: {
    width: 34,
  },

  sheetIntro: {
    marginBottom: 14,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  limitNote: {
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  limitNoteText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
  },

  sheetText: {
    marginVertical: 12,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },

  noShowCard: {
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  noShowCardText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },

  successSecondary: {
    marginBottom: 10,
  },

  sheetSuccess: {
    alignItems: 'center',
    paddingTop: 4,
  },

  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
  },

  optionList: {
    gap: 2,
  },

  option: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  optionIconDanger: {
    backgroundColor: COLORS.pinkLight,
  },

  optionBody: {
    flex: 1,
    minWidth: 0,
  },

  optionTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  optionTitleDanger: {
    color: COLORS.redButton,
  },

  optionSubtitle: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  reasonList: {
    marginBottom: 14,
    gap: 7,
  },

  reason: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  reasonSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.pinkLight,
  },

  reasonText: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
  },

  fieldLabel: {
    marginBottom: 7,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  fieldOptional: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
  },

  sheetInput: {
    minHeight: 96,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.page,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  counter: {
    marginTop: 4,
    marginBottom: 12,
    alignSelf: 'flex-end',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  errorBox: {
    marginBottom: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 11,
    backgroundColor: COLORS.pinkLight,
  },

  errorText: {
    flex: 1,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
  },

  fieldRow: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
  },

  pickerField: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.page,
  },

  pickerFieldText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  // CALENDAR

  calendarHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  calendarMonth: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  weekRow: {
    marginBottom: 4,
    flexDirection: 'row',
  },

  weekText: {
    width: '14.285%',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    textAlign: 'center',
  },

  calendarGrid: {
    marginBottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.285%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.tileBorder,
  },

  dayCircleSelected: {
    backgroundColor: COLORS.redButton,
  },

  dayText: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
  },

  dayTextPast: {
    color: '#CFC8C9',
  },

  dayTextSelected: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // ==========================================================
  // IN-APP MESSAGE
  // ==========================================================

  popupOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay,
  },

  popupCard: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    borderRadius: 22,
    backgroundColor: COLORS.white,
  },

  popupIcon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    alignSelf: 'center',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  popupTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },

  popupMessage: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },

  popupActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
});
