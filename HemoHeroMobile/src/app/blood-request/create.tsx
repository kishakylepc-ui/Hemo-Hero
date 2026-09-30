import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  router,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import {
  FadeInView,
  PressableScale,
  PulseRing,
} from '../../components/Motion';

import TimeWheelPicker from '../../components/TimeWheelPicker';

import {
  type BloodType,
  getCompatibleDonorTypes,
  isBloodType,
} from '../../lib/bloodCompatibility';

import {
  createBloodRequest,
  getCurrentUser,
  getMyActiveBloodRequest,
  getNearbyFacilities,
} from '../../lib/api';

import type {
  CreateBloodRequestInput,
  NearbyFacility,
} from '../../lib/api';

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
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#D5D5D5',
  softBorder: '#EFE3E3',
  tileBorder: '#F0D6D6',
  divider: '#F3E9E9',

  inputBackground: '#FFFCFC',

  pinkLight: '#FFF1F1',
  pinkBorder: '#E7A6A6',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  cardBorder: '#E8DADA',
};

// ============================================================
// BLOOD TYPES
// ============================================================

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// ============================================================
// FORM
// ============================================================

// Blood, location and timing are required; the note is not.
const REQUIRED_STEPS = 3;

const MESSAGE_LIMIT = 250;

// One-tap notes: a short chip label, and the sentence it adds.
const QUICK_NOTES = [
  {
    label: 'In the ER',
    text: 'Patient is admitted in the ER',
  },
  {
    label: 'For surgery',
    text: 'Needed for a scheduled surgery',
  },
  {
    label: 'Message me first',
    text: 'Please message me before going',
  },
];

const URGENCY_OPTIONS = [
  {
    value: 'urgent',
    title: 'Urgent',
    icon: 'bolt',
  },
  {
    value: 'needed',
    title: 'Scheduled',
    icon: 'event',
  },
] as const;


// ============================================================
// IN-APP ACTION POPUP
// ============================================================

type ActionPopupVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

type ActionPopupState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionPopupVariant;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  dismissOnBackdrop: boolean;
  onConfirm?: () => void;
};


// ============================================================
// CALENDAR
// ============================================================

const WEEKDAYS = [
  'S',
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ============================================================
// HELPERS
// ============================================================

function sameDate(
  first: Date | null,
  second: Date
) {
  if (!first) {
    return false;
  }

  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatDateForApi(
  value: Date
) {
  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      value.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

// ============================================================
// FACILITY VISUALS
//
// Each facility type gets its own icon and tint so the list is
// easy to scan: hospital building, blood bag, Red Cross plus,
// and a medical bag for clinics.
// ============================================================

type FacilityVisual = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  background: string;
};

function getFacilityVisual(
  type?: string | null
): FacilityVisual {
  switch (type) {
    case 'hospital':
      return {
        icon: 'hospital-building',
        label: 'Hospital',
        color: COLORS.blue,
        background: COLORS.blueLight,
      };

    case 'blood_bank':
      return {
        icon: 'blood-bag',
        label: 'Blood Bank',
        color: COLORS.redButton,
        background: COLORS.pinkLight,
      };

    case 'red_cross':
      return {
        icon: 'plus-thick',
        label: 'Red Cross',
        color: COLORS.red,
        background: COLORS.white,
      };

    default:
      return {
        icon: 'medical-bag',
        label: 'Clinic',
        color: COLORS.green,
        background: COLORS.greenLight,
      };
  }
}

function formatDistance(
  km?: number | null
) {
  const value =
    Number(km);

  if (!Number.isFinite(value)) {
    return '';
  }

  return value < 1
    ? `${Math.round(value * 1000)} m`
    : `${value.toFixed(1)} km`;
}

// ============================================================
// SCREEN
// ============================================================

export default function CreateBloodRequestScreen() {
  const {
    height,
  } = useWindowDimensions();

  const isSmallPhone =
    Platform.OS !== 'web' &&
    height <= 844;

  const insets =
    useSafeAreaInsets();

  // ==========================================================
  // PROFILE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<any>(null);

  // ==========================================================
  // REQUEST
  // ==========================================================

  const [
    bloodType,
    setBloodType,
  ] = useState('');

  const [
    unitsNeeded,
    setUnitsNeeded,
  ] = useState(1);

  // ==========================================================
  // FACILITIES
  // ==========================================================

  const [
    facilities,
    setFacilities,
  ] = useState<
    NearbyFacility[]
  >([]);

  const [
    selectedFacility,
    setSelectedFacility,
  ] = useState<
    NearbyFacility | null
  >(null);

  const [
    loadingFacilities,
    setLoadingFacilities,
  ] = useState(false);

  const [
    facilityError,
    setFacilityError,
  ] = useState('');

  const [
    showFacilityPicker,
    setShowFacilityPicker,
  ] = useState(false);

  // ==========================================================
  // MANUAL FACILITY
  // ==========================================================

  const [
    manualFacilityMode,
    setManualFacilityMode,
  ] = useState(false);

  const [
    manualFacilityName,
    setManualFacilityName,
  ] = useState('');

  const [
    manualFacilityAddress,
    setManualFacilityAddress,
  ] = useState('');

  // ==========================================================
  // URGENCY
  // ==========================================================

  const [
    urgency,
    setUrgency,
  ] = useState<
    'urgent' |
    'needed' |
    ''
  >('');

  // ==========================================================
  // DATE
  // ==========================================================

  const [
    neededDate,
    setNeededDate,
  ] = useState<Date | null>(
    null
  );

  const [
    showDatePicker,
    setShowDatePicker,
  ] = useState(false);

  const currentDate =
    new Date();

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    currentDate.getMonth()
  );

  const [
    calendarYear,
    setCalendarYear,
  ] = useState(
    currentDate.getFullYear()
  );

  // ==========================================================
  // TIME
  // ==========================================================

  const [
    neededTime,
    setNeededTime,
  ] = useState<Date | null>(
    null
  );

  const [
    showTimePicker,
    setShowTimePicker,
  ] = useState(false);

  const [
    selectedHour,
    setSelectedHour,
  ] = useState(12);

  const [
    selectedMinute,
    setSelectedMinute,
  ] = useState(0);

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState<
    'AM' |
    'PM'
  >('PM');

  // ==========================================================
  // MESSAGE
  // ==========================================================

  const [
    message,
    setMessage,
  ] = useState('');

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  // Highlights the input being typed in.
  const [
    focusedField,
    setFocusedField,
  ] = useState<
    | 'facilityName'
    | 'facilityAddress'
    | 'message'
    | null
  >(null);

  // Bottom sheet: what's missing / review before posting /
  // posted confirmation.
  const [
    sheet,
    setSheet,
  ] = useState<
    | 'missing'
    | 'review'
    | 'success'
    | null
  >(null);

  const [
    submitError,
    setSubmitError,
  ] = useState('');

  const [
    createdRequestId,
    setCreatedRequestId,
  ] = useState('');

  // Set when the user already has an active request (the
  // server allows only one at a time).
  const [
    activeRequestId,
    setActiveRequestId,
  ] = useState<string | null>(
    null
  );

  const [
    actionPopup,
    setActionPopup,
  ] = useState<ActionPopupState>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'Okay',
    cancelText: 'Cancel',
    showCancel: false,
    dismissOnBackdrop: true,
    onConfirm: undefined,
  });

  // ==========================================================
  // CALENDAR DAYS
  // ==========================================================

  const calendarDays =
    useMemo(() => {
      const firstDay =
        new Date(
          calendarYear,
          calendarMonth,
          1
        );

      const lastDay =
        new Date(
          calendarYear,
          calendarMonth + 1,
          0
        );

      const emptyDays =
        firstDay.getDay();

      const days: (
        Date |
        null
      )[] = [];

      for (
        let i = 0;
        i < emptyDays;
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <=
          lastDay.getDate();
        day++
      ) {
        days.push(
          new Date(
            calendarYear,
            calendarMonth,
            day
          )
        );
      }

      while (
        days.length % 7 !==
        0
      ) {
        days.push(null);
      }

      return days;
    }, [
      calendarMonth,
      calendarYear,
    ]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  // Profile, facilities and the active-request check are
  // independent: load them together.
  async function loadInitialData() {
    await Promise.all([
      loadProfile(),
      loadNearbyFacilities(),
      checkActiveRequest(),
    ]);
  }

  // ==========================================================
  // ACTIVE REQUEST CHECK
  //
  // The server allows one active request per user (409), so
  // warn before the form is filled in. Returns the id.
  // ==========================================================

  async function checkActiveRequest() {
    try {
      const token =
        await getAccessToken();

      if (!token) {
        return null;
      }

      const data =
        await getMyActiveBloodRequest(
          token
        );

      const requestId =
        data?.request?.id ||
        null;

      setActiveRequestId(
        requestId
      );

      return requestId as
        | string
        | null;
    } catch (error) {
      console.log(
        'ACTIVE REQUEST CHECK ERROR:',
        error
      );

      return null;
    }
  }

  function openActiveRequest() {
    if (!activeRequestId) {
      return;
    }

    router.replace(
      `/blood-request/${activeRequestId}` as any
    );
  }

  // ==========================================================
  // PROFILE
  // ==========================================================

  async function loadProfile() {
    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const data =
        await getCurrentUser(
          token
        );

      if (!data?.user) {
        throw new Error(
          'Unable to load your profile.'
        );
      }

      setProfile(
        data.user
      );
    } catch (error) {
      console.log(
        'REQUEST PROFILE ERROR:',
        error
      );
    }
  }

  // ==========================================================
  // NEARBY FACILITIES
  // ==========================================================

  async function loadNearbyFacilities() {
    if (
      loadingFacilities ||
      submitting
    ) {
      return;
    }

    try {
      setLoadingFacilities(
        true
      );

      setFacilityError('');

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const permission =
        await Location
          .requestForegroundPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        setFacilityError(
          'Location permission is required to find nearby hospitals, blood centers, and Philippine Red Cross locations.'
        );

        return;
      }

      const currentLocation =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location.Accuracy
                .Balanced,
          });

      const result =
        await getNearbyFacilities(
          token,
          currentLocation
            .coords
            .latitude,
          currentLocation
            .coords
            .longitude
        );

      const nearby =
        Array.isArray(
          result?.facilities
        )
          ? result.facilities
          : [];

      setFacilities(
        nearby
      );

      if (
        nearby.length === 0
      ) {
        setFacilityError(
          'No nearby hospitals, blood centers, or Philippine Red Cross locations were found.'
        );
      }
    } catch (error) {
      console.log(
        'FACILITY SEARCH ERROR:',
        error
      );

      setFacilityError(
        error instanceof Error
          ? error.message
          : 'Unable to retrieve nearby facilities.'
      );
    } finally {
      setLoadingFacilities(
        false
      );
    }
  }

  // ==========================================================
  // DISPLAY
  // ==========================================================

  const profilePhotoUrl =
    profile?.profile_photo_url ||
    '';

  const initials =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .map(value =>
        String(value || '')
          .trim()
          .charAt(0)
      )
      .join('')
      .toUpperCase();

  // ==========================================================
  // PROGRESS (required steps)
  // ==========================================================

  const bloodStepDone =
    isBloodType(bloodType);

  const locationStepDone =
    manualFacilityMode
      ? Boolean(
          manualFacilityName.trim() &&
            manualFacilityAddress.trim()
        )
      : Boolean(
          selectedFacility
        );

  const timingStepDone =
    urgency === 'urgent' ||
    (urgency === 'needed' &&
      Boolean(neededDate) &&
      Boolean(neededTime));

  const completedSteps =
    [
      bloodStepDone,
      locationStepDone,
      timingStepDone,
    ].filter(Boolean).length;

  const allStepsDone =
    completedSteps ===
    REQUIRED_STEPS;

  // Header bar eases to the new value as steps complete.
  const progress =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue:
        completedSteps /
        REQUIRED_STEPS,
      duration: 420,
      easing: Easing.out(
        Easing.cubic
      ),
      useNativeDriver: false,
    }).start();
  }, [completedSteps]);

  // Checklist shown when something is still missing.
  const requiredChecklist = [
    {
      label: 'Blood type',
      done: bloodStepDone,
    },
    {
      label: 'Donation place',
      done: locationStepDone,
    },
    {
      label:
        urgency === 'needed'
          ? 'Date and time needed'
          : 'When it is needed',
      done: timingStepDone,
    },
  ];

  // ==========================================================
  // QUICK NOTES
  //
  // Tapping a suggestion adds it to the message as a
  // sentence; tapping it again removes it.
  // ==========================================================

  function toggleQuickNote(
    note: string
  ) {
    if (submitting) {
      return;
    }

    const sentence =
      `${note}.`;

    setMessage(current => {
      if (
        current.includes(
          sentence
        )
      ) {
        return current
          .replace(
            sentence,
            ''
          )
          .replace(
            /\s{2,}/g,
            ' '
          )
          .trim();
      }

      const next =
        current.trim()
          ? `${current.trim()} ${sentence}`
          : sentence;

      return next.length <=
        MESSAGE_LIMIT
        ? next
        : current;
    });
  }

  // ==========================================================
  // MESSAGE HELPER
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

  // ==========================================================
  // FACILITY
  // ==========================================================

  function openFacilityPicker() {
    if (
      facilities.length === 0
    ) {
      loadNearbyFacilities();
    }

    setShowFacilityPicker(
      true
    );
  }

  function chooseFacility(
    facility: NearbyFacility
  ) {
    setSelectedFacility(
      facility
    );

    setManualFacilityMode(
      false
    );

    setShowFacilityPicker(
      false
    );

    setErrorMessage('');
  }

  function switchToManualFacility() {
    setShowFacilityPicker(
      false
    );

    setSelectedFacility(
      null
    );

    setManualFacilityMode(
      true
    );

    setErrorMessage('');
  }

  function switchToNearbyFacility() {
    setManualFacilityMode(
      false
    );

    setErrorMessage('');
  }

  // ==========================================================
  // UNITS
  // ==========================================================

  function decreaseUnits() {
    if (
      unitsNeeded <= 1 ||
      submitting
    ) {
      return;
    }

    setUnitsNeeded(
      current =>
        current - 1
    );
  }

  function increaseUnits() {
    if (
      unitsNeeded >= 20 ||
      submitting
    ) {
      return;
    }

    setUnitsNeeded(
      current =>
        current + 1
    );
  }

  // ==========================================================
  // URGENCY
  // ==========================================================

  function selectUrgency(
    value:
      | 'urgent'
      | 'needed'
  ) {
    if (submitting) {
      return;
    }

    setUrgency(value);

    setErrorMessage('');

    if (
      value === 'urgent'
    ) {
      setNeededDate(null);

      setNeededTime(null);

      setShowDatePicker(
        false
      );

      setShowTimePicker(
        false
      );
    }
  }

  // ==========================================================
  // DATE
  // ==========================================================

  function handleDatePress() {
    if (
      urgency !== 'needed'
    ) {
      return;
    }

    const baseDate =
      neededDate ||
      new Date();

    setCalendarMonth(
      baseDate.getMonth()
    );

    setCalendarYear(
      baseDate.getFullYear()
    );

    setShowDatePicker(
      true
    );
  }

  function previousMonth() {
    const today =
      new Date();

    if (
      calendarYear ===
        today.getFullYear() &&
      calendarMonth ===
        today.getMonth()
    ) {
      return;
    }

    if (
      calendarMonth === 0
    ) {
      setCalendarMonth(11);

      setCalendarYear(
        current =>
          current - 1
      );

      return;
    }

    setCalendarMonth(
      current =>
        current - 1
    );
  }

  function nextMonth() {
    if (
      calendarMonth === 11
    ) {
      setCalendarMonth(0);

      setCalendarYear(
        current =>
          current + 1
      );

      return;
    }

    setCalendarMonth(
      current =>
        current + 1
    );
  }

  function selectCalendarDate(
    value: Date
  ) {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const selected =
      new Date(value);

    selected.setHours(
      0,
      0,
      0,
      0
    );

    if (
      selected.getTime() <
      today.getTime()
    ) {
      return;
    }

    setNeededDate(value);

    setErrorMessage('');
  }

  // ==========================================================
  // TIME
  // ==========================================================

  function handleTimePress() {
    if (
      urgency !== 'needed'
    ) {
      return;
    }

    if (neededTime) {
      const hours =
        neededTime
          .getHours();

      setSelectedPeriod(
        hours >= 12
          ? 'PM'
          : 'AM'
      );

      setSelectedHour(
        hours % 12 === 0
          ? 12
          : hours % 12
      );

      setSelectedMinute(
        neededTime
          .getMinutes()
      );
    } else {
      // Start the wheels at the next full hour.
      const nextHour =
        new Date();

      nextHour.setHours(
        nextHour.getHours() + 1,
        0,
        0,
        0
      );

      const hour =
        nextHour.getHours();

      setSelectedPeriod(
        hour >= 12
          ? 'PM'
          : 'AM'
      );

      setSelectedHour(
        hour % 12 === 0
          ? 12
          : hour % 12
      );

      setSelectedMinute(0);
    }

    setShowTimePicker(
      true
    );
  }

  function getSelectedHour24() {
    if (selectedPeriod === 'AM') {
      return selectedHour === 12
        ? 0
        : selectedHour;
    }

    return selectedHour === 12
      ? 12
      : selectedHour + 12;
  }

  // True when the picked date is today and the wheel time has
  // already passed, so it's caught here instead of on submit.
  const selectedTimeHasPassed =
    (() => {
      if (!neededDate) {
        return false;
      }

      const combined =
        new Date(neededDate);

      combined.setHours(
        getSelectedHour24(),
        selectedMinute,
        0,
        0
      );

      return (
        combined.getTime() <=
        Date.now()
      );
    })();

  function confirmTime() {
    if (selectedTimeHasPassed) {
      return;
    }

    const value =
      new Date();

    value.setHours(
      getSelectedHour24(),
      selectedMinute,
      0,
      0
    );

    setNeededTime(value);

    setShowTimePicker(
      false
    );

    setErrorMessage('');
  }

  // ==========================================================
  // FORMATTERS
  // ==========================================================

  function formatDate(
    value: Date
  ) {
    return value
      .toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );
  }

  function formatTime(
    value: Date
  ) {
    return value
      .toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      );
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateForm() {
    if (!bloodType) {
      return (
        'Please select the blood type needed.'
      );
    }

    if (
      unitsNeeded < 1
    ) {
      return (
        'At least one unit or bag is required.'
      );
    }

    if (
      manualFacilityMode
    ) {
      if (
        !manualFacilityName
          .trim()
      ) {
        return (
          'Please enter the donation facility name.'
        );
      }

      if (
        !manualFacilityAddress
          .trim()
      ) {
        return (
          'Please enter the facility address.'
        );
      }
    } else if (
      !selectedFacility
    ) {
      return (
        'Please select a donation facility.'
      );
    }

    if (!urgency) {
      return (
        'Please select the urgency.'
      );
    }

    if (
      urgency === 'needed' &&
      !neededDate
    ) {
      return (
        'Please select the date the blood is needed.'
      );
    }

    if (
      urgency === 'needed' &&
      !neededTime
    ) {
      return (
        'Please select the time the blood is needed.'
      );
    }

    if (
      urgency === 'needed' &&
      neededDate &&
      neededTime
    ) {
      const combined =
        new Date(
          neededDate
        );

      combined.setHours(
        neededTime
          .getHours(),

        neededTime
          .getMinutes(),

        0,
        0
      );

      if (
        combined.getTime() <=
        Date.now()
      ) {
        return (
          'The needed date and time must be in the future.'
        );
      }
    }

    return null;
  }

  // ==========================================================
  // BUILD REQUEST
  // ==========================================================

  function buildRequestData():
    CreateBloodRequestInput {
    return {
      blood_type:
        bloodType,

      units_needed:
        unitsNeeded,

      facility_source:
        manualFacilityMode
          ? 'manual'
          : 'nearby',

      facility_id:
        manualFacilityMode
          ? null
          : selectedFacility
              ?.id ||
            null,

      facility_name:
        manualFacilityMode
          ? manualFacilityName
              .trim()
          : selectedFacility
              ?.name ||
            '',

      facility_type:
        manualFacilityMode
          ? 'manual'
          : selectedFacility
              ?.type ||
            null,

      facility_address:
        manualFacilityMode
          ? manualFacilityAddress
              .trim()
          : selectedFacility
              ?.address ||
            null,

      facility_latitude:
        manualFacilityMode
          ? null
          : selectedFacility
              ?.latitude ??
            null,

      facility_longitude:
        manualFacilityMode
          ? null
          : selectedFacility
              ?.longitude ??
            null,

      urgency:
        urgency === 'urgent'
          ? 'urgent'
          : 'needed',

      needed_date:
        urgency === 'needed' &&
        neededDate
          ? formatDateForApi(
              neededDate
            )
          : null,

      needed_time:
        urgency === 'needed' &&
        neededTime
          ? `${String(
              neededTime
                .getHours()
            ).padStart(
              2,
              '0'
            )}:${String(
              neededTime
                .getMinutes()
            ).padStart(
              2,
              '0'
            )}`
          : null,

      message:
        message
          .trim() ||
        null,
    };
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  // Missing items -> checklist sheet; complete -> review sheet.
  function handleSubmit() {
    if (submitting) {
      return;
    }

    setErrorMessage('');

    const validation =
      validateForm();

    if (validation) {
      setErrorMessage(
        validation
      );

      setSheet('missing');

      return;
    }

    setSubmitError('');

    setSheet('review');
  }

  function closeSheet() {
    if (submitting) {
      return;
    }

    setSheet(null);
  }

  // Text for the review sheet.
  const reviewFacilityName =
    manualFacilityMode
      ? manualFacilityName.trim()
      : selectedFacility?.name ||
        '';

  const reviewFacilityAddress =
    manualFacilityMode
      ? manualFacilityAddress.trim()
      : selectedFacility?.address ||
        '';

  const reviewNeededBy =
    urgency === 'urgent'
      ? 'As soon as possible'
      : neededDate &&
          neededTime
        ? `${formatDate(
            neededDate
          )} • ${formatTime(
            neededTime
          )}`
        : '';


  // ==========================================================
  // REAL API SUBMISSION
  // ==========================================================

  async function handleConfirmedSubmit() {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      setErrorMessage('');
      setSubmitError('');

      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        router.replace('/');
        return;
      }

      const requestData =
        buildRequestData();

      const result =
        await createBloodRequest(
          accessToken,
          requestData
        );

      setCreatedRequestId(
        result?.request?.id || ''
      );

      // Same sheet switches to the "posted" state.
      setSheet('success');
    } catch (error) {
      console.log(
        'CREATE BLOOD REQUEST ERROR:',
        error
      );

      const errorText =
        error instanceof Error
          ? error.message
          : 'Unable to submit your blood request. Please try again.';

      // Another request became active (e.g. from another
      // device): offer to open it instead.
      if (
        /active blood request/i.test(
          errorText
        )
      ) {
        const existingId =
          await checkActiveRequest();

        if (existingId) {
          setSheet(null);

          setActionPopup({
            visible: true,
            title: 'Active Request Found',
            message:
              'You already have an active blood request. Mark it fulfilled or cancel it before posting a new one.',
            variant: 'warning',
            confirmText:
              'View Active Request',
            cancelText: 'Stay Here',
            showCancel: true,
            dismissOnBackdrop: true,
            onConfirm: () => {
              closeActionPopup();

              router.replace(
                `/blood-request/${existingId}` as any
              );
            },
          });

          return;
        }
      }

      // Shown inside the review sheet so the details stay visible.
      setSubmitError(
        errorText
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  // Keep the last sheet's content on screen while it fades out.
  const lastSheet =
    useRef(sheet);

  if (sheet) {
    lastSheet.current = sheet;
  }

  const visibleSheet =
    sheet ||
    lastSheet.current;

  const compatibleDonors =
    isBloodType(bloodType)
      ? getCompatibleDonorTypes(
          bloodType as BloodType
        )
      : [];

  function leaveAfterPosting(
    destination: 'request' | 'home'
  ) {
    setSheet(null);

    // Replace so "back" never returns to the submitted form.
    router.replace(
      destination === 'request' &&
        createdRequestId
        ? (`/blood-request/${createdRequestId}` as any)
        : '/dashboard'
    );
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top']}
        >
          <StatusBar style="light" />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
          >
            {/* ==================================================
                HEADER + PROGRESS
            ================================================== */}

            <LinearGradient
              colors={[
                '#D2151A',
                COLORS.redDark,
              ]}
              style={[
                styles.header,

                isSmallPhone &&
                  styles.headerSmall,
              ]}
            >
              <View style={styles.headerCircleLeft} />
              <View style={styles.headerCircleRight} />

              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  disabled={submitting}
                  activeOpacity={0.75}
                  accessibilityLabel="Go back"
                  onPress={() => router.back()}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={23}
                    color={COLORS.white}
                  />
                </TouchableOpacity>

                <View style={styles.headerText}>
                  <Text style={styles.headerTitle}>
                    Request Blood
                  </Text>

                  <Text style={styles.headerSubtitle}>
                    {allStepsDone
                      ? 'Ready to review'
                      : `${completedSteps} of ${REQUIRED_STEPS} steps done`}
                  </Text>
                </View>

                <View style={styles.headerAvatar}>
                  {profilePhotoUrl ? (
                    <Image
                      source={{
                        uri: profilePhotoUrl,
                      }}
                      style={styles.headerAvatarImage}
                      resizeMode="cover"
                    />
                  ) : initials ? (
                    <Text style={styles.headerAvatarText}>
                      {initials}
                    </Text>
                  ) : (
                    <MaterialIcons
                      name="person"
                      size={20}
                      color={COLORS.white}
                    />
                  )}
                </View>
              </View>

              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,

                    {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </LinearGradient>

            {/* ==================================================
                BODY (rounded sheet over the header)
            ================================================== */}

            <View style={styles.body}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* EXISTING ACTIVE REQUEST */}

                {activeRequestId ? (
                  <FadeInView style={styles.activeBanner}>
                    <MaterialIcons
                      name="info-outline"
                      size={20}
                      color={COLORS.orange}
                    />

                    <Text style={styles.activeBannerText}>
                      You already have an active request.
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={openActiveRequest}
                    >
                      <Text style={styles.activeBannerLink}>
                        View
                      </Text>
                    </TouchableOpacity>
                  </FadeInView>
                ) : null}

                {/* ================================================
                    1. BLOOD TYPE + BAGS
                ================================================ */}

                <FadeInView delay={0}>
                  <SectionHeader
                    icon="bloodtype"
                    title="Blood Type"
                    done={bloodStepDone}
                  />

                  <View style={styles.card}>
                    <View style={styles.bloodGrid}>
                      {BLOOD_TYPES.map(type => {
                        const selected =
                          bloodType === type;

                        return (
                          <PressableScale
                            key={type}
                            containerStyle={styles.bloodTileContainer}
                            style={[
                              styles.bloodTile,

                              selected &&
                                styles.bloodTileSelected,
                            ]}
                            disabled={submitting}
                            accessibilityRole="button"
                            accessibilityLabel={`Blood type ${type}`}
                            accessibilityState={{
                              selected,
                            }}
                            onPress={() => {
                              setBloodType(type);
                              setErrorMessage('');
                            }}
                          >
                            <Text
                              style={[
                                styles.bloodTileText,

                                selected &&
                                  styles.bloodTileTextSelected,
                              ]}
                            >
                              {type}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>

                    {compatibleDonors.length > 0 ? (
                      <FadeInView
                        key={bloodType}
                        offset={4}
                        style={styles.compatRow}
                      >
                        <Text style={styles.compatText}>
                          Compatible donors{'  '}
                          <Text style={styles.compatTypes}>
                            {compatibleDonors.join('  ')}
                          </Text>
                        </Text>
                      </FadeInView>
                    ) : null}

                    <View style={styles.divider} />

                    <View style={styles.unitsRow}>
                      <Text style={styles.fieldLabel}>
                        Bags needed
                      </Text>

                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={[
                            styles.stepperButton,

                            unitsNeeded <= 1 &&
                              styles.stepperButtonDisabled,
                          ]}
                          disabled={
                            unitsNeeded <= 1 ||
                            submitting
                          }
                          activeOpacity={0.75}
                          accessibilityLabel="Fewer bags"
                          onPress={decreaseUnits}
                        >
                          <MaterialIcons
                            name="remove"
                            size={19}
                            color={COLORS.redButton}
                          />
                        </TouchableOpacity>

                        <View style={styles.stepperValue}>
                          <FadeInView
                            key={unitsNeeded}
                            offset={5}
                          >
                            <Text style={styles.stepperValueText}>
                              {unitsNeeded}
                            </Text>
                          </FadeInView>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.stepperButton,
                            styles.stepperButtonAdd,

                            unitsNeeded >= 20 &&
                              styles.stepperButtonDisabled,
                          ]}
                          disabled={
                            unitsNeeded >= 20 ||
                            submitting
                          }
                          activeOpacity={0.75}
                          accessibilityLabel="More bags"
                          onPress={increaseUnits}
                        >
                          <MaterialIcons
                            name="add"
                            size={19}
                            color={COLORS.white}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </FadeInView>

                {/* ================================================
                    2. DONATION PLACE
                ================================================ */}

                <FadeInView delay={60}>
                  <SectionHeader
                    icon="place"
                    title="Donation Place"
                    done={locationStepDone}
                  />

                  {!manualFacilityMode ? (
                    <>
                      <FadeInView
                        key={
                          selectedFacility?.id ||
                          'empty'
                        }
                        offset={4}
                      >
                        <PressableScale
                          style={[
                            styles.card,
                            styles.placeCard,

                            !selectedFacility &&
                              styles.placeCardEmpty,
                          ]}
                          disabled={submitting}
                          accessibilityRole="button"
                          accessibilityLabel={
                            selectedFacility
                              ? `Donation place ${selectedFacility.name}. Tap to change.`
                              : 'Choose a nearby donation place'
                          }
                          onPress={openFacilityPicker}
                        >
                          {loadingFacilities &&
                          !selectedFacility ? (
                            <View
                              style={[
                                styles.placeIconEmpty,
                              ]}
                            >
                              <ActivityIndicator
                                size="small"
                                color={COLORS.redButton}
                              />
                            </View>
                          ) : selectedFacility ? (
                            <FacilityIcon
                              type={selectedFacility.type}
                              size={46}
                            />
                          ) : (
                            <View style={styles.placeIconEmpty}>
                              <MaterialCommunityIcons
                                name="map-marker-plus-outline"
                                size={24}
                                color={COLORS.redButton}
                              />
                            </View>
                          )}

                          <View style={styles.placeBody}>
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.placeTitle,

                                !selectedFacility &&
                                  styles.placePlaceholder,
                              ]}
                            >
                              {selectedFacility
                                ? selectedFacility.name
                                : loadingFacilities
                                  ? 'Finding places near you...'
                                  : 'Choose a nearby place'}
                            </Text>

                            <Text
                              numberOfLines={1}
                              style={styles.placeMeta}
                            >
                              {selectedFacility
                                ? [
                                    getFacilityVisual(
                                      selectedFacility.type
                                    ).label,
                                    formatDistance(
                                      selectedFacility.distance_km
                                    ),
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')
                                : facilities.length > 0
                                  ? `${facilities.length} found near you`
                                  : 'Hospitals, blood banks & Red Cross'}
                            </Text>
                          </View>

                          <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={COLORS.lightMuted}
                          />
                        </PressableScale>
                      </FadeInView>

                      {facilityError ? (
                        <FadeInView
                          offset={4}
                          style={styles.inlineError}
                        >
                          <Text style={styles.inlineErrorText}>
                            {facilityError}{' '}
                            <Text
                              style={styles.inlineErrorLink}
                              onPress={loadNearbyFacilities}
                            >
                              Try again
                            </Text>
                          </Text>
                        </FadeInView>
                      ) : null}

                      <TouchableOpacity
                        style={styles.textLink}
                        disabled={submitting}
                        activeOpacity={0.7}
                        onPress={switchToManualFacility}
                      >
                        <Text style={styles.textLinkMuted}>
                          Not listed?{' '}
                          <Text style={styles.textLinkStrong}>
                            Enter manually
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <FadeInView
                      key="manual"
                      offset={6}
                    >
                      <View
                        style={[
                          styles.card,
                          styles.cardAttached,
                        ]}
                      >
                        <View
                          style={[
                            styles.inputBox,

                            focusedField ===
                              'facilityName' &&
                              styles.inputFocused,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="hospital-building"
                            size={19}
                            color={
                              focusedField ===
                              'facilityName'
                                ? COLORS.redButton
                                : COLORS.lightMuted
                            }
                          />

                          <TextInput
                            style={styles.input}
                            editable={!submitting}
                            placeholder="Place name"
                            placeholderTextColor={COLORS.lightMuted}
                            value={manualFacilityName}
                            onFocus={() =>
                              setFocusedField('facilityName')
                            }
                            onBlur={() =>
                              setFocusedField(null)
                            }
                            onChangeText={value => {
                              setManualFacilityName(value);
                              setErrorMessage('');
                            }}
                          />
                        </View>

                        <View
                          style={[
                            styles.inputBox,
                            styles.inputBoxSpaced,

                            focusedField ===
                              'facilityAddress' &&
                              styles.inputFocused,
                          ]}
                        >
                          <MaterialIcons
                            name="place"
                            size={19}
                            color={
                              focusedField ===
                              'facilityAddress'
                                ? COLORS.redButton
                                : COLORS.lightMuted
                            }
                          />

                          <TextInput
                            style={styles.input}
                            editable={!submitting}
                            placeholder="Address or city"
                            placeholderTextColor={COLORS.lightMuted}
                            value={manualFacilityAddress}
                            onFocus={() =>
                              setFocusedField('facilityAddress')
                            }
                            onBlur={() =>
                              setFocusedField(null)
                            }
                            onChangeText={value => {
                              setManualFacilityAddress(value);
                              setErrorMessage('');
                            }}
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.textLink}
                        disabled={submitting}
                        activeOpacity={0.7}
                        onPress={switchToNearbyFacility}
                      >
                        <Text style={styles.textLinkStrong}>
                          Use nearby places
                        </Text>
                      </TouchableOpacity>
                    </FadeInView>
                  )}
                </FadeInView>

                {/* ================================================
                    3. WHEN
                ================================================ */}

                <FadeInView delay={120}>
                  <SectionHeader
                    icon="schedule"
                    title="When"
                    done={timingStepDone}
                  />

                  <View style={styles.card}>
                    <View style={styles.segment}>
                      {URGENCY_OPTIONS.map(option => {
                        const selected =
                          urgency === option.value;

                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.segmentItem,

                              selected &&
                                styles.segmentItemSelected,
                            ]}
                            disabled={submitting}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected,
                            }}
                            onPress={() =>
                              selectUrgency(option.value)
                            }
                          >
                            <MaterialIcons
                              name={option.icon}
                              size={18}
                              color={
                                selected
                                  ? COLORS.white
                                  : COLORS.redButton
                              }
                            />

                            <Text
                              style={[
                                styles.segmentText,

                                selected &&
                                  styles.segmentTextSelected,
                              ]}
                            >
                              {option.title}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {urgency === 'urgent' ? (
                      <FadeInView
                        key="urgent"
                        offset={4}
                      >
                        <Text style={styles.whenHint}>
                          Donors will see this as needed as soon as possible.
                        </Text>
                      </FadeInView>
                    ) : urgency === 'needed' ? (
                      <FadeInView
                        key="needed"
                        offset={4}
                        style={styles.dateTimeRow}
                      >
                        <PressableScale
                          containerStyle={styles.flexFill}
                          style={[
                            styles.dateTimeField,

                            neededDate &&
                              styles.dateTimeFieldFilled,
                          ]}
                          disabled={submitting}
                          accessibilityRole="button"
                          accessibilityLabel="Pick the date"
                          onPress={handleDatePress}
                        >
                          <MaterialIcons
                            name="calendar-today"
                            size={17}
                            color={
                              neededDate
                                ? COLORS.redButton
                                : COLORS.lightMuted
                            }
                          />

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dateTimeText,

                              neededDate &&
                                styles.dateTimeTextFilled,
                            ]}
                          >
                            {neededDate
                              ? formatDate(neededDate)
                              : 'Date'}
                          </Text>
                        </PressableScale>

                        <PressableScale
                          containerStyle={styles.flexFill}
                          style={[
                            styles.dateTimeField,

                            neededTime &&
                              styles.dateTimeFieldFilled,
                          ]}
                          disabled={submitting}
                          accessibilityRole="button"
                          accessibilityLabel="Pick the time"
                          onPress={handleTimePress}
                        >
                          <MaterialIcons
                            name="access-time"
                            size={18}
                            color={
                              neededTime
                                ? COLORS.redButton
                                : COLORS.lightMuted
                            }
                          />

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dateTimeText,

                              neededTime &&
                                styles.dateTimeTextFilled,
                            ]}
                          >
                            {neededTime
                              ? formatTime(neededTime)
                              : 'Time'}
                          </Text>
                        </PressableScale>
                      </FadeInView>
                    ) : null}
                  </View>
                </FadeInView>

                {/* ================================================
                    4. NOTE (optional)
                ================================================ */}

                <FadeInView delay={180}>
                  <SectionHeader
                    icon="notes"
                    title="Note"
                    optional
                    done={message.trim().length > 0}
                  />

                  <View
                    style={[
                      styles.card,

                      focusedField === 'message' &&
                        styles.cardFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.messageInput}
                      editable={!submitting}
                      placeholder="Anything donors should know"
                      placeholderTextColor={COLORS.lightMuted}
                      multiline
                      maxLength={MESSAGE_LIMIT}
                      value={message}
                      onFocus={() =>
                        setFocusedField('message')
                      }
                      onBlur={() =>
                        setFocusedField(null)
                      }
                      onChangeText={setMessage}
                      textAlignVertical="top"
                    />

                    <Text style={styles.characterCount}>
                      {message.length}/{MESSAGE_LIMIT}
                    </Text>

                    <View style={styles.quickNotes}>
                      {QUICK_NOTES.map(note => {
                        const active =
                          message.includes(
                            `${note.text}.`
                          );

                        return (
                          <TouchableOpacity
                            key={note.label}
                            style={[
                              styles.quickNote,

                              active &&
                                styles.quickNoteActive,
                            ]}
                            disabled={submitting}
                            activeOpacity={0.8}
                            accessibilityState={{
                              selected: active,
                            }}
                            onPress={() =>
                              toggleQuickNote(note.text)
                            }
                          >
                            <Text
                              style={[
                                styles.quickNoteText,

                                active &&
                                  styles.quickNoteTextActive,
                              ]}
                            >
                              {active ? '✓ ' : '+ '}
                              {note.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </FadeInView>
              </ScrollView>
            </View>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <View
              style={[
                styles.footer,

                {
                  paddingBottom: Math.max(
                    insets.bottom,
                    12
                  ),
                },
              ]}
            >
              <PressableScale
                style={[
                  styles.submitButton,

                  !allStepsDone &&
                    !activeRequestId &&
                    styles.submitButtonIncomplete,
                ]}
                disabled={submitting}
                accessibilityRole="button"
                onPress={
                  activeRequestId
                    ? openActiveRequest
                    : handleSubmit
                }
              >
                <LinearGradient
                  colors={[
                    '#D2151A',
                    COLORS.redDark,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitText}>
                    {activeRequestId
                      ? 'View Active Request'
                      : 'Review Request'}
                  </Text>

                  <MaterialIcons
                    name="arrow-forward"
                    size={19}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </PressableScale>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ====================================================
            REQUEST SHEET: missing / review / posted
        ==================================================== */}

        <BottomSheet
          visible={sheet !== null}
          onClose={
            visibleSheet === 'success'
              ? undefined
              : closeSheet
          }
        >
          {visibleSheet === 'missing' ? (
            <>
              <View
                style={[
                  styles.sheetIcon,

                  {
                    backgroundColor: COLORS.orangeLight,
                  },
                ]}
              >
                <MaterialIcons
                  name="checklist"
                  size={28}
                  color={COLORS.orange}
                />
              </View>

              <Text style={styles.sheetTitle}>
                {allStepsDone
                  ? 'Check the time'
                  : 'Almost there'}
              </Text>

              {/* Every step can be filled yet still invalid
                  (a past date/time) — then show that reason
                  instead of an all-green checklist. */}
              <Text style={styles.sheetText}>
                {allStepsDone
                  ? errorMessage
                  : 'Complete these to post your request.'}
              </Text>

              {!allStepsDone ? (
                <View style={styles.checklist}>
                  {requiredChecklist.map(item => (
                    <View
                      key={item.label}
                      style={styles.checkRow}
                    >
                      <MaterialIcons
                        name={
                          item.done
                            ? 'check-circle'
                            : 'radio-button-unchecked'
                        }
                        size={21}
                        color={
                          item.done
                            ? COLORS.green
                            : COLORS.redButton
                        }
                      />

                      <Text
                        style={[
                          styles.checkText,

                          item.done &&
                            styles.checkTextDone,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.sheetPrimaryFull}
                activeOpacity={0.85}
                onPress={closeSheet}
              >
                <Text style={styles.sheetPrimaryText}>
                  Got it
                </Text>
              </TouchableOpacity>
            </>
          ) : visibleSheet === 'review' ? (
            <>
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitleLeft}>
                  Review Request
                </Text>

                <TouchableOpacity
                  style={styles.sheetClose}
                  disabled={submitting}
                  accessibilityLabel="Close"
                  onPress={closeSheet}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </View>

              {/* Blood type + bags + urgency */}
              <View style={styles.reviewHero}>
                <View style={styles.reviewBlood}>
                  <Text style={styles.reviewBloodText}>
                    {bloodType}
                  </Text>
                </View>

                <View style={styles.flexFill}>
                  <Text style={styles.reviewHeroTitle}>
                    {unitsNeeded}{' '}
                    {unitsNeeded === 1 ? 'bag' : 'bags'} of{' '}
                    {bloodType}
                  </Text>

                  <View
                    style={[
                      styles.urgencyPill,

                      {
                        backgroundColor:
                          urgency === 'urgent'
                            ? COLORS.pinkLight
                            : COLORS.blueLight,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        urgency === 'urgent'
                          ? 'bolt'
                          : 'event'
                      }
                      size={14}
                      color={
                        urgency === 'urgent'
                          ? COLORS.redButton
                          : COLORS.blue
                      }
                    />

                    <Text
                      style={[
                        styles.urgencyPillText,

                        {
                          color:
                            urgency === 'urgent'
                              ? COLORS.redButton
                              : COLORS.blue,
                        },
                      ]}
                    >
                      {urgency === 'urgent'
                        ? 'Urgent'
                        : 'Scheduled'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Details */}
              <View style={styles.reviewRows}>
                <ReviewRow
                  icon="place"
                  iconNode={
                    manualFacilityMode ? undefined : (
                      <FacilityIcon
                        type={selectedFacility?.type}
                        size={38}
                      />
                    )
                  }
                  label="Place"
                  value={reviewFacilityName}
                  detail={reviewFacilityAddress}
                />

                <ReviewRow
                  icon="schedule"
                  label="Needed"
                  value={reviewNeededBy}
                />

                {message.trim() ? (
                  <ReviewRow
                    icon="notes"
                    label="Note"
                    value={message.trim()}
                    last
                  />
                ) : null}
              </View>

              {compatibleDonors.length > 0 ? (
                <View style={styles.reviewVisibility}>
                  <MaterialIcons
                    name="visibility"
                    size={16}
                    color={COLORS.green}
                  />

                  <Text style={styles.reviewVisibilityText}>
                    Visible to nearby{' '}
                    <Text style={styles.reviewVisibilityStrong}>
                      {compatibleDonors.join(', ')}
                    </Text>{' '}
                    donors
                  </Text>
                </View>
              ) : null}

              {submitError ? (
                <FadeInView
                  key={submitError}
                  offset={4}
                  style={styles.sheetError}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={17}
                    color={COLORS.redButton}
                  />

                  <Text style={styles.sheetErrorText}>
                    {submitError}
                  </Text>
                </FadeInView>
              ) : null}

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={styles.sheetSecondary}
                  disabled={submitting}
                  activeOpacity={0.8}
                  onPress={closeSheet}
                >
                  <MaterialIcons
                    name="edit"
                    size={17}
                    color={COLORS.redButton}
                  />

                  <Text style={styles.sheetSecondaryText}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <PressableScale
                  containerStyle={styles.flexFill}
                  style={styles.sheetPrimaryWrap}
                  disabled={submitting}
                  accessibilityRole="button"
                  onPress={handleConfirmedSubmit}
                >
                  <LinearGradient
                    colors={[
                      '#D2151A',
                      COLORS.redDark,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sheetPrimaryGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.white}
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="send"
                          size={17}
                          color={COLORS.white}
                        />

                        <Text style={styles.sheetPrimaryText}>
                          Post Request
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </PressableScale>
              </View>
            </>
          ) : visibleSheet === 'success' ? (
            <FadeInView
              key="success"
              offset={8}
              style={styles.centered}
            >
              <View style={styles.successIconWrap}>
                <PulseRing
                  size={76}
                  color="rgba(21,148,71,0.35)"
                />

                <View style={styles.successIcon}>
                  <MaterialIcons
                    name="check"
                    size={40}
                    color={COLORS.white}
                  />
                </View>
              </View>

              <Text style={styles.sheetTitle}>
                Request Posted
              </Text>

              <Text style={styles.sheetText}>
                Compatible donors nearby can now see your{' '}
                {bloodType} request. We&apos;ll notify you when
                someone offers to help.
              </Text>

              <TouchableOpacity
                style={styles.sheetPrimaryFull}
                activeOpacity={0.85}
                onPress={() =>
                  leaveAfterPosting('request')
                }
              >
                <Text style={styles.sheetPrimaryText}>
                  View My Request
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetTextButton}
                activeOpacity={0.7}
                onPress={() =>
                  leaveAfterPosting('home')
                }
              >
                <Text style={styles.sheetTextButtonText}>
                  Back to Home
                </Text>
              </TouchableOpacity>
            </FadeInView>
          ) : null}
        </BottomSheet>

        {/* ====================================================
            NEARBY PLACES PICKER
        ==================================================== */}

        <BottomSheet
          visible={showFacilityPicker}
          onClose={() =>
            setShowFacilityPicker(false)
          }
        >
          <View style={styles.sheetHeaderRow}>
            <View style={styles.flexFill}>
              <Text style={styles.sheetTitleLeft}>
                Nearby Places
              </Text>

              {facilities.length > 0 ? (
                <Text style={styles.sheetSubtitleLeft}>
                  {facilities.length} found near you
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.sheetClose}
              accessibilityLabel="Close"
              onPress={() =>
                setShowFacilityPicker(false)
              }
            >
              <MaterialIcons
                name="close"
                size={20}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          {loadingFacilities ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator
                size="large"
                color={COLORS.redButton}
              />

              <Text style={styles.sheetLoadingText}>
                Finding places near you...
              </Text>
            </View>
          ) : facilities.length === 0 ? (
            <View style={styles.sheetLoading}>
              <MaterialCommunityIcons
                name="map-search-outline"
                size={38}
                color={COLORS.lightMuted}
              />

              <Text style={styles.sheetLoadingText}>
                {facilityError ||
                  'No places found nearby.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.facilityList}
              showsVerticalScrollIndicator={false}
            >
              {facilities.map((facility, index) => {
                const selected =
                  selectedFacility?.id === facility.id;

                const visual =
                  getFacilityVisual(facility.type);

                return (
                  <FadeInView
                    key={facility.id}
                    delay={Math.min(index * 35, 210)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.facilityOption,

                        selected &&
                          styles.facilityOptionSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        chooseFacility(facility)
                      }
                    >
                      <FacilityIcon
                        type={facility.type}
                        size={42}
                      />

                      <View style={styles.facilityOptionBody}>
                        <Text
                          numberOfLines={2}
                          style={styles.facilityOptionName}
                        >
                          {facility.name}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={styles.facilityOptionMeta}
                        >
                          <Text style={{ color: visual.color }}>
                            {visual.label}
                          </Text>
                          {facility.distance_km !== undefined
                            ? `  •  ${formatDistance(
                                facility.distance_km
                              )}`
                            : ''}
                        </Text>
                      </View>

                      <MaterialIcons
                        name={
                          selected
                            ? 'check-circle'
                            : 'chevron-right'
                        }
                        size={22}
                        color={
                          selected
                            ? COLORS.redButton
                            : COLORS.lightMuted
                        }
                      />
                    </TouchableOpacity>
                  </FadeInView>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.sheetSecondary}
              disabled={loadingFacilities}
              activeOpacity={0.8}
              onPress={loadNearbyFacilities}
            >
              <MaterialIcons
                name="refresh"
                size={18}
                color={COLORS.redButton}
              />

              <Text style={styles.sheetSecondaryText}>
                Refresh
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetSecondary}
              activeOpacity={0.8}
              onPress={switchToManualFacility}
            >
              <MaterialIcons
                name="edit-location-alt"
                size={18}
                color={COLORS.redButton}
              />

              <Text style={styles.sheetSecondaryText}>
                Enter manually
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* ====================================================
            DATE PICKER
        ==================================================== */}

        <BottomSheet
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
        >
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitleLeft}>
              Pick a Date
            </Text>

            <TouchableOpacity
              style={styles.sheetClose}
              accessibilityLabel="Close"
              onPress={() => setShowDatePicker(false)}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarNavigation}>
            <TouchableOpacity
              style={styles.calendarArrow}
              accessibilityLabel="Previous month"
              onPress={previousMonth}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={COLORS.redButton}
              />
            </TouchableOpacity>

            <Text style={styles.calendarMonth}>
              {MONTHS[calendarMonth]} {calendarYear}
            </Text>

            <TouchableOpacity
              style={styles.calendarArrow}
              accessibilityLabel="Next month"
              onPress={nextMonth}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={COLORS.redButton}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={styles.weekDay}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <View
                    key={index}
                    style={styles.calendarCell}
                  />
                );
              }

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const comparison = new Date(day);
              comparison.setHours(0, 0, 0, 0);

              const disabled =
                comparison.getTime() <
                today.getTime();

              const isToday =
                comparison.getTime() ===
                today.getTime();

              const selected =
                sameDate(neededDate, day);

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.calendarCell}
                  disabled={disabled}
                  onPress={() =>
                    selectCalendarDate(day)
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

                        disabled &&
                          styles.dayDisabled,

                        selected &&
                          styles.daySelectedText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.sheetPrimaryFull,

              !neededDate &&
                styles.buttonDisabled,
            ]}
            disabled={!neededDate}
            activeOpacity={0.85}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.sheetPrimaryText}>
              {neededDate
                ? `Use ${formatDate(neededDate)}`
                : 'Pick a date'}
            </Text>
          </TouchableOpacity>
        </BottomSheet>

        {/* ====================================================
            TIME PICKER
        ==================================================== */}

        <BottomSheet
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
        >
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitleLeft}>
              Pick a Time
            </Text>

            <TouchableOpacity
              style={styles.sheetClose}
              accessibilityLabel="Close"
              onPress={() => setShowTimePicker(false)}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          <TimeWheelPicker
            hour={selectedHour}
            minute={selectedMinute}
            period={selectedPeriod}
            onHourChange={setSelectedHour}
            onMinuteChange={setSelectedMinute}
            onPeriodChange={setSelectedPeriod}
          />

          <TouchableOpacity
            style={[
              styles.sheetPrimaryFull,

              selectedTimeHasPassed &&
                styles.buttonDisabled,
            ]}
            disabled={selectedTimeHasPassed}
            activeOpacity={0.85}
            onPress={confirmTime}
          >
            <Text style={styles.sheetPrimaryText}>
              {selectedTimeHasPassed
                ? 'That time has passed'
                : `Use ${selectedHour}:${String(
                    selectedMinute
                  ).padStart(2, '0')} ${selectedPeriod}`}
            </Text>
          </TouchableOpacity>
        </BottomSheet>

        {/* ====================================================
            IN-APP MESSAGE (e.g. active request found)
        ==================================================== */}

        <Modal
          transparent
          visible={actionPopup.visible}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            if (actionPopup.dismissOnBackdrop) {
              closeActionPopup();
            }
          }}
        >
          <View style={styles.popupOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (actionPopup.dismissOnBackdrop) {
                  closeActionPopup();
                }
              }}
            />

            <FadeInView
              offset={10}
              style={styles.popupCard}
            >
              <View
                style={[
                  styles.sheetIcon,

                  {
                    backgroundColor:
                      actionPopup.variant === 'success'
                        ? COLORS.greenLight
                        : actionPopup.variant === 'warning'
                          ? COLORS.orangeLight
                          : COLORS.pinkLight,
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    actionPopup.variant === 'success'
                      ? 'check-circle-outline'
                      : actionPopup.variant === 'warning'
                        ? 'info-outline'
                        : actionPopup.variant === 'error'
                          ? 'error-outline'
                          : 'info-outline'
                  }
                  size={28}
                  color={
                    actionPopup.variant === 'success'
                      ? COLORS.green
                      : actionPopup.variant === 'warning'
                        ? COLORS.orange
                        : COLORS.redButton
                  }
                />
              </View>

              <Text style={styles.sheetTitle}>
                {actionPopup.title}
              </Text>

              <Text style={styles.sheetText}>
                {actionPopup.message}
              </Text>

              <View style={styles.sheetActions}>
                {actionPopup.showCancel ? (
                  <TouchableOpacity
                    style={styles.sheetSecondary}
                    activeOpacity={0.8}
                    onPress={closeActionPopup}
                  >
                    <Text style={styles.sheetSecondaryText}>
                      {actionPopup.cancelText}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.sheetPrimarySolid,

                    !actionPopup.showCancel &&
                      styles.flexFill,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (actionPopup.onConfirm) {
                      actionPopup.onConfirm();
                      return;
                    }

                    closeActionPopup();
                  }}
                >
                  <Text style={styles.sheetPrimaryText}>
                    {actionPopup.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// ============================================================
// SECTION HEADER (dashboard-style: icon + title, check when
// the section is complete)
// ============================================================

function SectionHeader({
  icon,
  title,
  done,
  optional = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <MaterialIcons
          name={icon}
          size={19}
          color={COLORS.redButton}
        />

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {done ? (
        <FadeInView offset={0}>
          <MaterialIcons
            name="check-circle"
            size={19}
            color={COLORS.green}
          />
        </FadeInView>
      ) : optional ? (
        <Text style={styles.sectionOptional}>
          Optional
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// FACILITY ICON
// ============================================================

function FacilityIcon({
  type,
  size,
}: {
  type?: string | null;
  size: number;
}) {
  const visual =
    getFacilityVisual(type);

  return (
    <View
      style={[
        styles.facilityIcon,

        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: visual.background,
        },

        // Red Cross: red plus on white, like the emblem.
        type === 'red_cross' &&
          styles.facilityIconRedCross,
      ]}
    >
      <MaterialCommunityIcons
        name={visual.icon}
        size={size * 0.52}
        color={visual.color}
      />
    </View>
  );
}

// ============================================================
// REVIEW ROW
// ============================================================

function ReviewRow({
  icon,
  iconNode,
  label,
  value,
  detail,
  last = false,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconNode?: ReactNode;
  label: string;
  value: string;
  detail?: string | null;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.reviewRow,

        last &&
          styles.reviewRowLast,
      ]}
    >
      {iconNode || (
        <View style={styles.reviewRowIcon}>
          <MaterialIcons
            name={icon || 'info-outline'}
            size={19}
            color={COLORS.redButton}
          />
        </View>
      )}

      <View style={styles.flexFill}>
        <Text style={styles.reviewRowLabel}>
          {label}
        </Text>

        <Text
          numberOfLines={3}
          style={styles.reviewRowValue}
        >
          {value || '—'}
        </Text>

        {detail ? (
          <Text
            numberOfLines={1}
            style={styles.reviewRowDetail}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================
// BOTTOM SHEET
//
// Slides up from the bottom; same width as the phone frame on
// web. Tapping outside closes it unless onClose is omitted.
// ============================================================

function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose?: () => void;
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
      onRequestClose={() => onClose?.()}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onClose?.()}
        />

        <FadeInView
          offset={48}
          style={[
            styles.sheet,

            {
              paddingBottom:
                Math.max(insets.bottom, 14) + 6,
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          {children}
        </FadeInView>
      </View>
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

  flexFill: {
    flex: 1,
    minWidth: 0,
  },

  centered: {
    alignItems: 'center',
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
    backgroundColor: '#D2151A',
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

  headerSmall: {
    paddingBottom: 34,
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

  headerAvatar: {
    width: 40,
    height: 40,
    marginLeft: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },

  headerAvatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  progressTrack: {
    height: 6,
    marginTop: 16,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.white,
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
    paddingTop: 20,
    paddingBottom: 16,
  },

  activeBanner: {
    marginBottom: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5D2B3',
    backgroundColor: COLORS.orangeLight,
  },

  activeBannerText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },

  activeBannerLink: {
    color: COLORS.orange,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // ==========================================================
  // SECTIONS (dashboard style)
  // ==========================================================

  sectionHeader: {
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  sectionTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  sectionOptional: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  card: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  cardFocused: {
    borderColor: COLORS.redButton,
  },

  // A card followed by a small link; the link carries the gap.
  cardAttached: {
    marginBottom: 0,
  },

  // ==========================================================
  // BLOOD TYPE
  // ==========================================================

  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },

  bloodTileContainer: {
    width: '22.8%',
  },

  bloodTile: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D9CFCF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  bloodTileSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  bloodTileText: {
    color: '#333333',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  bloodTileTextSelected: {
    color: COLORS.white,
  },

  compatRow: {
    marginTop: 11,
  },

  compatText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  compatTypes: {
    color: COLORS.green,
    fontFamily: 'Inter_600SemiBold',
  },

  divider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: COLORS.divider,
  },

  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  fieldLabel: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  stepperButtonAdd: {
    backgroundColor: COLORS.redButton,
  },

  stepperButtonDisabled: {
    opacity: 0.4,
  },

  stepperValue: {
    width: 42,
    alignItems: 'center',
  },

  stepperValueText: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
  },

  // ==========================================================
  // DONATION PLACE
  // ==========================================================

  placeCard: {
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  placeCardEmpty: {
    borderStyle: 'dashed',
    borderColor: COLORS.pinkBorder,
    backgroundColor: '#FFFBFB',
  },

  placeIconEmpty: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  placeBody: {
    flex: 1,
    minWidth: 0,
  },

  placeTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },

  placePlaceholder: {
    color: COLORS.redButton,
  },

  placeMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  facilityIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  facilityIconRedCross: {
    borderWidth: 1.5,
    borderColor: '#F3C4C4',
  },

  inlineError: {
    marginTop: 8,
  },

  inlineErrorText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  inlineErrorLink: {
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },

  textLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 2,
  },

  textLinkMuted: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  textLinkStrong: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  inputBox: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.softBorder,
    backgroundColor: COLORS.inputBackground,
  },

  inputBoxSpaced: {
    marginTop: 10,
  },

  inputFocused: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.white,
  },

  input: {
    flex: 1,
    height: '100%',
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  // ==========================================================
  // WHEN
  // ==========================================================

  segment: {
    flexDirection: 'row',
    gap: 8,
  },

  segmentItem: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D9CFCF',
    backgroundColor: COLORS.white,
  },

  segmentItemSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  segmentText: {
    color: '#333333',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },

  segmentTextSelected: {
    color: COLORS.white,
  },

  whenHint: {
    marginTop: 11,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  dateTimeRow: {
    marginTop: 11,
    flexDirection: 'row',
    gap: 8,
  },

  dateTimeField: {
    height: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.softBorder,
    backgroundColor: COLORS.inputBackground,
  },

  dateTimeFieldFilled: {
    borderColor: COLORS.redButton,
    backgroundColor: '#FFF6F6',
  },

  dateTimeText: {
    flex: 1,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },

  dateTimeTextFilled: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
  },

  // ==========================================================
  // NOTE
  // ==========================================================

  messageInput: {
    minHeight: 64,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  characterCount: {
    alignSelf: 'flex-end',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  quickNotes: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  quickNote: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.white,
  },

  quickNoteActive: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  quickNoteText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  quickNoteTextActive: {
    color: COLORS.white,
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.softBorder,
    backgroundColor: COLORS.white,
  },

  submitButton: {
    borderRadius: 13,
    overflow: 'hidden',
  },

  submitButtonIncomplete: {
    opacity: 0.7,
  },

  submitGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  submitText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  // ==========================================================
  // BOTTOM SHEETS
  // ==========================================================

  sheetOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.white,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: '#E6DADA',
  },

  sheetHeaderRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  sheetTitleLeft: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },

  sheetSubtitleLeft: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6EFEF',
  },

  sheetIcon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    alignSelf: 'center',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },

  sheetText: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },

  checklist: {
    marginTop: 16,
    padding: 6,
    borderRadius: 14,
    backgroundColor: COLORS.page,
  },

  checkRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  checkText: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  checkTextDone: {
    color: COLORS.lightMuted,
    textDecorationLine: 'line-through',
  },

  sheetPrimaryFull: {
    height: 50,
    marginTop: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.redButton,
  },

  sheetPrimarySolid: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.redButton,
  },

  sheetPrimaryText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  sheetActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },

  sheetSecondary: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.white,
  },

  sheetSecondaryText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },

  sheetPrimaryWrap: {
    borderRadius: 13,
    overflow: 'hidden',
  },

  sheetPrimaryGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  sheetTextButton: {
    marginTop: 10,
    paddingVertical: 8,
    alignSelf: 'center',
  },

  sheetTextButtonText: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  sheetError: {
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 11,
    backgroundColor: COLORS.pinkLight,
  },

  sheetErrorText: {
    flex: 1,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 18,
  },

  sheetLoading: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  sheetLoadingText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },

  // REVIEW

  reviewHero: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 16,
    backgroundColor: COLORS.page,
  },

  reviewBlood: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  reviewBloodText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },

  reviewHeroTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15.5,
  },

  urgencyPill: {
    marginTop: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
  },

  urgencyPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  reviewRows: {
    marginTop: 6,
  },

  reviewRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  reviewRowLast: {
    borderBottomWidth: 0,
  },

  reviewRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  reviewRowLabel: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },

  reviewRowValue: {
    marginTop: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 19,
  },

  reviewRowDetail: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  reviewVisibility: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 11,
    backgroundColor: COLORS.greenLight,
  },

  reviewVisibilityText: {
    flex: 1,
    color: '#355B43',
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  reviewVisibilityStrong: {
    color: COLORS.green,
    fontFamily: 'Inter_600SemiBold',
  },

  // SUCCESS

  successIconWrap: {
    width: 76,
    height: 76,
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
  },

  // PLACES PICKER

  facilityList: {
    maxHeight: 400,
  },

  facilityOption: {
    marginBottom: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.softBorder,
    backgroundColor: COLORS.white,
  },

  facilityOptionSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: '#FFF6F6',
  },

  facilityOptionBody: {
    flex: 1,
    minWidth: 0,
  },

  facilityOptionName: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
  },

  facilityOptionMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  // CALENDAR

  calendarNavigation: {
    marginBottom: 12,
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

  weekDay: {
    width: '14.285%',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    textAlign: 'center',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarCell: {
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
    borderColor: COLORS.pinkBorder,
  },

  dayCircleSelected: {
    backgroundColor: COLORS.redButton,
  },

  dayText: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
  },

  dayDisabled: {
    color: '#CFCFCF',
  },

  daySelectedText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // IN-APP MESSAGE

  popupOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
});
