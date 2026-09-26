import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import {
  createBloodRequest,
  getCurrentUser,
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

  pageTop: '#F3B5B7',
  pageBottom: '#D90B12',

  card: '#FAFAFA',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#D5D5D5',

  pinkLight: '#FFF1F1',
  pinkBorder: '#E7A6A6',

  green: '#159447',

  hospitalSoft: '#FFF0F0',
  bloodBankSoft: '#FDECEF',
  redCrossSoft: '#FBE8E8',
  medicalSoft: '#F2F2F2',
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
// FACILITY DISPLAY HELPERS
// ============================================================

function getFacilityIcon(
  type?: string | null
) {
  switch (type) {
    case 'red_cross':
      return 'add-box';

    case 'blood_bank':
      return 'bloodtype';

    case 'hospital':
      return 'local-hospital';

    default:
      return 'medical-services';
  }
}

function getFacilityLabel(
  type?: string | null
) {
  switch (type) {
    case 'red_cross':
      return 'Philippine Red Cross';

    case 'blood_bank':
      return 'Blood Bank / Blood Center';

    case 'hospital':
      return 'Hospital';

    default:
      return 'Medical Facility';
  }
}

function getFacilityIconBackground(
  type?: string | null
) {
  switch (type) {
    case 'red_cross':
      return COLORS.redCrossSoft;

    case 'blood_bank':
      return COLORS.bloodBankSoft;

    case 'hospital':
      return COLORS.hospitalSoft;

    default:
      return COLORS.medicalSoft;
  }
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

  // ==========================================================
  // PROFILE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<any>(null);

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

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

  async function loadInitialData() {
    await loadProfile();
    await loadNearbyFacilities();
  }

  // ==========================================================
  // PROFILE
  // ==========================================================

  async function loadProfile() {
    try {
      setLoadingProfile(
        true
      );

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
    } finally {
      setLoadingProfile(
        false
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

  const displayName =
    loadingProfile
      ? 'Loading...'
      : [
          profile?.first_name,
          profile?.last_name,
        ]
          .filter(Boolean)
          .join(' ') ||
        'Hemo-Hero User';

  const profilePhotoUrl =
    profile?.profile_photo_url ||
    '';

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

  function showMessage(
    title: string,
    messageText: string,
    variant: ActionPopupVariant =
      'error'
  ) {
    setActionPopup({
      visible: true,
      title,
      message: messageText,
      variant,
      confirmText: 'Okay',
      cancelText: 'Cancel',
      showCancel: false,
      dismissOnBackdrop: true,
      onConfirm: undefined,
    });
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
      const now =
        new Date();

      let minute =
        Math.ceil(
          now.getMinutes() /
            5
        ) * 5;

      let hour =
        now.getHours();

      if (
        minute >= 60
      ) {
        minute = 0;

        hour =
          (hour + 1) %
          24;
      }

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

      setSelectedMinute(
        minute
      );
    }

    setShowTimePicker(
      true
    );
  }

  function decreaseHour() {
    setSelectedHour(
      current =>
        current === 1
          ? 12
          : current - 1
    );
  }

  function increaseHour() {
    setSelectedHour(
      current =>
        current === 12
          ? 1
          : current + 1
    );
  }

  function decreaseMinute() {
    setSelectedMinute(
      current =>
        current === 0
          ? 55
          : current - 5
    );
  }

  function increaseMinute() {
    setSelectedMinute(
      current =>
        current === 55
          ? 0
          : current + 5
    );
  }

  function confirmTime() {
    let hour24 =
      selectedHour;

    if (
      selectedPeriod ===
        'AM' &&
      selectedHour === 12
    ) {
      hour24 = 0;
    }

    if (
      selectedPeriod ===
        'PM' &&
      selectedHour !== 12
    ) {
      hour24 =
        selectedHour + 12;
    }

    const value =
      new Date();

    value.setHours(
      hour24,
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

      showMessage(
        'Incomplete Request',
        validation
      );

      return;
    }

    const facilityName =
      manualFacilityMode
        ? manualFacilityName
            .trim()
        : selectedFacility
            ?.name ||
          '';

    const neededBy =
      urgency === 'urgent'
        ? 'As soon as possible'
        : `${neededDate
            ? formatDate(
                neededDate
              )
            : ''
          } at ${
            neededTime
              ? formatTime(
                  neededTime
                )
              : ''
          }`;

    const summary =
      `Blood Type: ${bloodType}\n` +
      `Units/Bags: ${unitsNeeded}\n` +
      `Location: ${facilityName}\n` +
      `Urgency: ${
        urgency === 'urgent'
          ? 'Urgent'
          : 'Needed'
      }\n` +
      `Needed By: ${neededBy}`;

    setActionPopup({
      visible: true,
      title: 'Submit Blood Request?',
      message:
        `${summary}\n\nPlease confirm that these details are correct.`,
      variant: 'warning',
      confirmText: 'Submit Request',
      cancelText: 'Go Back',
      showCancel: true,
      dismissOnBackdrop: true,
      onConfirm: () => {
        closeActionPopup();
        handleConfirmedSubmit();
      },
    });
  }


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

      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        router.replace('/');
        return;
      }

      const requestData =
        buildRequestData();

      console.log(
        'SUBMITTING BLOOD REQUEST:',
        requestData
      );

      const result =
        await createBloodRequest(
          accessToken,
          requestData
        );

      console.log(
        'BLOOD REQUEST CREATED:',
        result
      );

      setActionPopup({
        visible: true,
        title: 'Request Submitted',
        message:
          'Your blood request has been created successfully and can now be shown to nearby compatible donors.',
        variant: 'success',
        confirmText: 'Go to Dashboard',
        cancelText: 'Cancel',
        showCancel: false,
        dismissOnBackdrop: false,
        onConfirm: () => {
          closeActionPopup();
          router.replace(
            '/dashboard'
          );
        },
      });

    } catch (error) {
      console.log(
        'CREATE BLOOD REQUEST ERROR:',
        error
      );

      const errorText =
        error instanceof Error
          ? error.message
          : 'Unable to submit your blood request. Please try again.';

      setErrorMessage(
        errorText
      );

      showMessage(
        'Unable to Submit Request',
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
          edges={['top']}
        >
          <StatusBar
            style="light"
          />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            {/* ==================================================
                HEADER
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

              <View
                style={
                  styles.headerRow
                }
              >
                <TouchableOpacity
                  style={
                    styles.backButton
                  }
                  disabled={
                    submitting
                  }
                  activeOpacity={
                    0.75
                  }
                  onPress={() =>
                    router.back()
                  }
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={26}
                    color={
                      COLORS.white
                    }
                  />
                </TouchableOpacity>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Request Blood
                </Text>
              </View>
            </LinearGradient>

            {/* ==================================================
                BODY
            ================================================== */}

            <LinearGradient
              colors={[
                COLORS.pageTop,
                COLORS.pageBottom,
              ]}
              style={
                styles.body
              }
            >
              {/* ==================================================
                  FIXED WHITE FORM CONTAINER
              ================================================== */}

              <View
                style={
                  styles.formCard
                }
              >
                <ScrollView
                  style={
                    styles.formScroll
                  }
                  contentContainerStyle={
                    styles.formScrollContent
                  }
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={
                    false
                  }
                  bounces={false}
                >
                  {/* ==================================================
                      REQUESTING AS
                  ================================================== */}

                  <View
                    style={
                      styles.requestingCard
                    }
                  >
                    <Text
                      style={
                        styles.requestingLabel
                      }
                    >
                      Requesting as
                    </Text>

                    <View
                      style={
                        styles.requestingRow
                      }
                    >
                      <View
                        style={
                          styles.avatar
                        }
                      >
                        {profilePhotoUrl ? (
                          <Image
                            source={{
                              uri:
                                profilePhotoUrl,
                            }}
                            style={
                              styles.avatarImage
                            }
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons
                            name="person"
                            size={21}
                            color={
                              COLORS.redDark
                            }
                          />
                        )}
                      </View>

                      <View
                        style={
                          styles.requesterInfo
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={
                            styles.requesterName
                          }
                        >
                          {displayName}
                        </Text>

                        <View
                          style={
                            styles.signedInRow
                          }
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={11}
                            color={
                              COLORS.green
                            }
                          />

                          <Text
                            style={
                              styles.signedInText
                            }
                          >
                            Signed-in account
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* ==================================================
                      BLOOD TYPE
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Blood Type Needed
                    <Text
                      style={
                        styles.required
                      }
                    >
                      {' '}*
                    </Text>
                  </Text>

                  <View
                    style={
                      styles.bloodGrid
                    }
                  >
                    {BLOOD_TYPES.map(
                      type => {
                        const selected =
                          bloodType ===
                          type;

                        return (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.bloodButton,

                              selected &&
                                styles.bloodButtonSelected,
                            ]}
                            disabled={
                              submitting
                            }
                            activeOpacity={
                              0.8
                            }
                            onPress={() => {
                              setBloodType(
                                type
                              );

                              setErrorMessage(
                                ''
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.bloodButtonText,

                                selected &&
                                  styles.bloodButtonTextSelected,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>

                  {/* ==================================================
                      UNITS
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Units / Bags Needed
                    <Text
                      style={
                        styles.required
                      }
                    >
                      {' '}*
                    </Text>
                  </Text>

                  <View
                    style={
                      styles.unitsRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.unitButton,

                        unitsNeeded <=
                          1 &&
                          styles.unitDisabled,
                      ]}
                      disabled={
                        unitsNeeded <=
                          1 ||
                        submitting
                      }
                      onPress={
                        decreaseUnits
                      }
                    >
                      <MaterialIcons
                        name="remove"
                        size={21}
                        color={
                          COLORS.black
                        }
                      />
                    </TouchableOpacity>

                    <View
                      style={
                        styles.unitValue
                      }
                    >
                      <Text
                        style={
                          styles.unitValueText
                        }
                      >
                        {unitsNeeded}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.unitButton
                      }
                      disabled={
                        submitting
                      }
                      onPress={
                        increaseUnits
                      }
                    >
                      <MaterialIcons
                        name="add"
                        size={21}
                        color={
                          COLORS.black
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ==================================================
                      FACILITY
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Donation Facility
                    <Text
                      style={
                        styles.required
                      }
                    >
                      {' '}*
                    </Text>
                  </Text>

                  <Text
                    style={
                      styles.helper
                    }
                  >
                    Choose the hospital, blood center, or Philippine Red Cross location where donors should go.
                  </Text>

                  {!manualFacilityMode ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.facilitySelector,

                          selectedFacility &&
                            styles.facilitySelectorSelected,
                        ]}
                        disabled={
                          submitting
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          openFacilityPicker
                        }
                      >
                        <View
                          style={[
                            styles.selectorIcon,

                            selectedFacility &&
                              styles.selectorIconSelected,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              selectedFacility
                                ? getFacilityIcon(
                                    selectedFacility.type
                                  ) as any
                                : 'medical-services'
                            }
                            size={21}
                            color={
                              selectedFacility
                                ? COLORS.white
                                : COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.selectorContent
                          }
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.selectorTitle,

                              !selectedFacility &&
                                styles.selectorPlaceholder,
                            ]}
                          >
                            {selectedFacility
                              ? selectedFacility
                                  .name
                              : loadingFacilities
                                ? 'Finding nearby facilities...'
                                : 'Choose Nearby Facility'}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={
                              styles.selectorSubtitle
                            }
                          >
                            {selectedFacility
                              ? `${getFacilityLabel(
                                  selectedFacility.type
                                )} • ${
                                  selectedFacility
                                    .distance_km
                                } km away`
                              : facilities.length >
                                  0
                                ? `${facilities.length} nearby facilities found`
                                : 'Tap to view nearby facilities'}
                          </Text>
                        </View>

                        <MaterialIcons
                          name="keyboard-arrow-down"
                          size={24}
                          color={
                            COLORS.muted
                          }
                        />
                      </TouchableOpacity>

                      {facilityError ? (
                        <View
                          style={
                            styles.smallErrorBox
                          }
                        >
                          <MaterialIcons
                            name="error-outline"
                            size={15}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.smallErrorText
                            }
                          >
                            {facilityError}
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={
                          styles.orDivider
                        }
                      >
                        <View
                          style={
                            styles.orLine
                          }
                        />

                        <Text
                          style={
                            styles.orText
                          }
                        >
                          or
                        </Text>

                        <View
                          style={
                            styles.orLine
                          }
                        />
                      </View>

                      <TouchableOpacity
                        style={
                          styles.enterManuallyButton
                        }
                        disabled={
                          submitting
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          switchToManualFacility
                        }
                      >
                        <View
                          style={
                            styles.enterManuallyIcon
                          }
                        >
                          <MaterialIcons
                            name="edit-location-alt"
                            size={18}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.enterManuallyContent
                          }
                        >
                          <Text
                            style={
                              styles.enterManuallyTitle
                            }
                          >
                            Enter Facility Manually
                          </Text>

                          <Text
                            style={
                              styles.enterManuallySubtitle
                            }
                          >
                            Use this if the facility is not listed
                          </Text>
                        </View>

                        <MaterialIcons
                          name="chevron-right"
                          size={22}
                          color={
                            COLORS.redButton
                          }
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View
                        style={
                          styles.manualModeCard
                        }
                      >
                        <View
                          style={
                            styles.manualModeHeader
                          }
                        >
                          <View
                            style={
                              styles.manualModeIcon
                            }
                          >
                            <MaterialIcons
                              name="edit-location-alt"
                              size={18}
                              color={
                                COLORS.redButton
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.manualModeHeading
                            }
                          >
                            <Text
                              style={
                                styles.manualModeTitle
                              }
                            >
                              Manual Facility Entry
                            </Text>

                            <Text
                              style={
                                styles.manualModeSubtitle
                              }
                            >
                              Enter the hospital, blood center, or Red Cross details.
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={
                            styles.manualFieldLabel
                          }
                        >
                          Facility Name
                          <Text
                            style={
                              styles.required
                            }
                          >
                            {' '}*
                          </Text>
                        </Text>

                        <View
                          style={
                            styles.manualInputContainer
                          }
                        >
                          <MaterialIcons
                            name="local-hospital"
                            size={18}
                            color={
                              COLORS.lightMuted
                            }
                          />

                          <TextInput
                            style={
                              styles.manualInput
                            }
                            editable={
                              !submitting
                            }
                            placeholder="Hospital, blood center, or Red Cross name"
                            placeholderTextColor={
                              COLORS.lightMuted
                            }
                            value={
                              manualFacilityName
                            }
                            onChangeText={
                              value => {
                                setManualFacilityName(
                                  value
                                );

                                setErrorMessage(
                                  ''
                                );
                              }
                            }
                          />
                        </View>

                        <Text
                          style={
                            styles.manualFieldLabel
                          }
                        >
                          Address / Location
                          <Text
                            style={
                              styles.required
                            }
                          >
                            {' '}*
                          </Text>
                        </Text>

                        <View
                          style={
                            styles.manualInputContainer
                          }
                        >
                          <MaterialIcons
                            name="location-on"
                            size={18}
                            color={
                              COLORS.lightMuted
                            }
                          />

                          <TextInput
                            style={
                              styles.manualInput
                            }
                            editable={
                              !submitting
                            }
                            placeholder="City, province, or facility address"
                            placeholderTextColor={
                              COLORS.lightMuted
                            }
                            value={
                              manualFacilityAddress
                            }
                            onChangeText={
                              value => {
                                setManualFacilityAddress(
                                  value
                                );

                                setErrorMessage(
                                  ''
                                );
                              }
                            }
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={
                          styles.returnNearbyButton
                        }
                        disabled={
                          submitting
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          switchToNearbyFacility
                        }
                      >
                        <MaterialIcons
                          name="location-searching"
                          size={16}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.returnNearbyText
                          }
                        >
                          Use Nearby Facilities Instead
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* ==================================================
                      URGENCY
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Urgency
                    <Text
                      style={
                        styles.required
                      }
                    >
                      {' '}*
                    </Text>
                  </Text>

                  <View
                    style={
                      styles.urgencyRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.urgencyButton,

                        urgency ===
                          'urgent' &&
                          styles.urgencySelected,
                      ]}
                      disabled={
                        submitting
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        selectUrgency(
                          'urgent'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.urgencyTitle,

                          urgency ===
                            'urgent' &&
                            styles.whiteText,
                        ]}
                      >
                        Urgent
                      </Text>

                      <Text
                        style={[
                          styles.urgencySub,

                          urgency ===
                            'urgent' &&
                            styles.whiteMutedText,
                        ]}
                      >
                        As soon as possible
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.urgencyButton,

                        urgency ===
                          'needed' &&
                          styles.urgencySelected,
                      ]}
                      disabled={
                        submitting
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        selectUrgency(
                          'needed'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.urgencyTitle,

                          urgency ===
                            'needed' &&
                            styles.whiteText,
                        ]}
                      >
                        Needed
                      </Text>

                      <Text
                        style={[
                          styles.urgencySub,

                          urgency ===
                            'needed' &&
                            styles.whiteMutedText,
                        ]}
                      >
                        By selected date
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ==================================================
                      NEEDED BY
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Needed by

                    {urgency ===
                    'needed' ? (
                      <Text
                        style={
                          styles.required
                        }
                      >
                        {' '}*
                      </Text>
                    ) : null}
                  </Text>

                  {urgency ===
                  'urgent' ? (
                    <View
                      style={
                        styles.asapBox
                      }
                    >
                      <MaterialIcons
                        name="bolt"
                        size={19}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.asapText
                        }
                      >
                        As soon as possible
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={
                        styles.dateTimeRow
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.dateTimeButton,

                          urgency !==
                            'needed' &&
                            styles.dateTimeDisabled,
                        ]}
                        disabled={
                          urgency !==
                            'needed' ||
                          submitting
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          handleDatePress
                        }
                      >
                        <MaterialIcons
                          name="calendar-today"
                          size={18}
                          color={
                            neededDate
                              ? COLORS.redButton
                              : COLORS.lightMuted
                          }
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.dateTimeTinyLabel
                            }
                          >
                            Date
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dateTimeValue,

                              neededDate &&
                                styles.dateTimeValueSelected,
                            ]}
                          >
                            {neededDate
                              ? formatDate(
                                  neededDate
                                )
                              : 'Select Date'}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dateTimeButton,

                          urgency !==
                            'needed' &&
                            styles.dateTimeDisabled,
                        ]}
                        disabled={
                          urgency !==
                            'needed' ||
                          submitting
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={
                          handleTimePress
                        }
                      >
                        <MaterialIcons
                          name="access-time"
                          size={19}
                          color={
                            neededTime
                              ? COLORS.redButton
                              : COLORS.lightMuted
                          }
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.dateTimeTinyLabel
                            }
                          >
                            Time
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dateTimeValue,

                              neededTime &&
                                styles.dateTimeValueSelected,
                            ]}
                          >
                            {neededTime
                              ? formatTime(
                                  neededTime
                                )
                              : 'Select Time'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ==================================================
                      MESSAGE
                  ================================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Message to Donors

                    <Text
                      style={
                        styles.optional
                      }
                    >
                      {' '}(Optional)
                    </Text>
                  </Text>

                  <View
                    style={
                      styles.messageBox
                    }
                  >
                    <TextInput
                      style={
                        styles.messageInput
                      }
                      editable={
                        !submitting
                      }
                      placeholder="Briefly explain anything donors should know..."
                      placeholderTextColor={
                        COLORS.lightMuted
                      }
                      multiline
                      maxLength={250}
                      value={message}
                      onChangeText={
                        setMessage
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
                  </View>

                  {/* ==================================================
                      INFO
                  ================================================== */}

                  <View
                    style={
                      styles.infoBox
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
                        styles.infoText
                      }
                    >
                      Your request will be shown to nearby compatible donors based on the selected donation facility.
                    </Text>
                  </View>

                  {/* ==================================================
                      ERROR
                  ================================================== */}

                  {errorMessage ? (
                    <View
                      style={
                        styles.errorBox
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
                          styles.errorText
                        }
                      >
                        {errorMessage}
                      </Text>
                    </View>
                  ) : null}

                  {/* ==================================================
                      SUBMIT
                  ================================================== */}

                  <TouchableOpacity
                    style={[
                      styles.submitButton,

                      submitting &&
                        styles.submitDisabled,
                    ]}
                    disabled={
                      submitting
                    }
                    activeOpacity={
                      0.85
                    }
                    onPress={
                      handleSubmit
                    }
                  >
                    <Text
                      style={
                        styles.submitText
                      }
                    >
                      {submitting
                        ? 'Submitting...'
                        : 'Submit Blood Request'}
                    </Text>

                    {!submitting ? (
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color={
                          COLORS.white
                        }
                      />
                    ) : null}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </LinearGradient>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ====================================================
            FACILITY PICKER
        ==================================================== */}

        <Modal
          transparent
          visible={
            showFacilityPicker
          }
          animationType="fade"
          onRequestClose={() =>
            setShowFacilityPicker(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={
                styles.facilityModal
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Nearby Facilities
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Hospitals, blood centers & Red Cross
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setShowFacilityPicker(
                      false
                    )
                  }
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={
                      COLORS.black
                    }
                  />
                </TouchableOpacity>
              </View>

              {loadingFacilities ? (
                <View
                  style={
                    styles.facilityModalLoading
                  }
                >
                  <MaterialIcons
                    name="location-searching"
                    size={32}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.facilityModalLoadingText
                    }
                  >
                    Finding nearby facilities...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={
                    styles.facilityList
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  {facilities.map(
                    facility => {
                      const selected =
                        selectedFacility
                          ?.id ===
                        facility.id;

                      return (
                        <TouchableOpacity
                          key={
                            facility.id
                          }
                          style={[
                            styles.facilityOption,

                            selected &&
                              styles.facilityOptionSelected,
                          ]}
                          onPress={() =>
                            chooseFacility(
                              facility
                            )
                          }
                        >
                          <View
                            style={[
                              styles.facilityOptionIcon,

                              {
                                backgroundColor:
                                  getFacilityIconBackground(
                                    facility.type
                                  ),
                              },

                              selected &&
                                styles.facilityOptionIconSelected,
                            ]}
                          >
                            <MaterialIcons
                              name={
                                getFacilityIcon(
                                  facility.type
                                ) as any
                              }
                              size={
                                facility.type ===
                                'red_cross'
                                  ? 23
                                  : 20
                              }
                              color={
                                selected
                                  ? COLORS.white
                                  : COLORS.redButton
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.facilityOptionContent
                            }
                          >
                            <Text
                              numberOfLines={2}
                              style={
                                styles.facilityOptionName
                              }
                            >
                              {facility.name}
                            </Text>

                            <Text
                              style={
                                styles.facilityOptionMeta
                              }
                            >
                              {getFacilityLabel(
                                facility.type
                              )}
                              {' • '}
                              {facility.distance_km}{' '}
                              km away
                            </Text>

                            {facility.address ? (
                              <Text
                                numberOfLines={1}
                                style={
                                  styles.facilityOptionAddress
                                }
                              >
                                {facility.address}
                              </Text>
                            ) : null}
                          </View>

                          <View
                            style={[
                              styles.radio,

                              selected &&
                                styles.radioSelected,
                            ]}
                          >
                            {selected ? (
                              <View
                                style={
                                  styles.radioInner
                                }
                              />
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              )}

              <View
                style={
                  styles.modalFooter
                }
              >
                <TouchableOpacity
                  style={
                    styles.refreshFacilityButton
                  }
                  onPress={
                    loadNearbyFacilities
                  }
                >
                  <MaterialIcons
                    name="refresh"
                    size={17}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.refreshFacilityText
                    }
                  >
                    Refresh
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.manualFacilityModalButton
                  }
                  onPress={
                    switchToManualFacility
                  }
                >
                  <MaterialIcons
                    name="edit-location-alt"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.manualFacilityModalText
                    }
                  >
                    Enter Manually
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            DATE PICKER
        ==================================================== */}

        <Modal
          transparent
          visible={
            showDatePicker
          }
          animationType="fade"
          onRequestClose={() =>
            setShowDatePicker(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={
                styles.calendarModal
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Date
                </Text>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setShowDatePicker(
                      false
                    )
                  }
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={
                      COLORS.black
                    }
                  />
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.calendarNavigation
                }
              >
                <TouchableOpacity
                  style={
                    styles.calendarArrow
                  }
                  onPress={
                    previousMonth
                  }
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={25}
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
                  {MONTHS[
                    calendarMonth
                  ]}{' '}
                  {calendarYear}
                </Text>

                <TouchableOpacity
                  style={
                    styles.calendarArrow
                  }
                  onPress={
                    nextMonth
                  }
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={25}
                    color={
                      COLORS.redButton
                    }
                  />
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.weekRow
                }
              >
                {WEEKDAYS.map(
                  (
                    day,
                    index
                  ) => (
                    <Text
                      key={`${day}-${index}`}
                      style={
                        styles.weekDay
                      }
                    >
                      {day}
                    </Text>
                  )
                )}
              </View>

              <View
                style={
                  styles.calendarGrid
                }
              >
                {calendarDays.map(
                  (
                    day,
                    index
                  ) => {
                    if (!day) {
                      return (
                        <View
                          key={index}
                          style={
                            styles.calendarCell
                          }
                        />
                      );
                    }

                    const today =
                      new Date();

                    today.setHours(
                      0,
                      0,
                      0,
                      0
                    );

                    const comparison =
                      new Date(day);

                    comparison.setHours(
                      0,
                      0,
                      0,
                      0
                    );

                    const disabled =
                      comparison.getTime() <
                      today.getTime();

                    const selected =
                      sameDate(
                        neededDate,
                        day
                      );

                    return (
                      <TouchableOpacity
                        key={index}
                        style={
                          styles.calendarCell
                        }
                        disabled={
                          disabled
                        }
                        onPress={() =>
                          selectCalendarDate(
                            day
                          )
                        }
                      >
                        <View
                          style={[
                            styles.dayCircle,

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
                  }
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmPickerButton,

                  !neededDate &&
                    styles.confirmPickerDisabled,
                ]}
                disabled={
                  !neededDate
                }
                onPress={() =>
                  setShowDatePicker(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.confirmPickerText
                  }
                >
                  Confirm Date
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            TIME PICKER
        ==================================================== */}

        <Modal
          transparent
          visible={
            showTimePicker
          }
          animationType="fade"
          onRequestClose={() =>
            setShowTimePicker(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={
                styles.timeModal
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Time
                </Text>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setShowTimePicker(
                      false
                    )
                  }
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={
                      COLORS.black
                    }
                  />
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.timePickerRow
                }
              >
                <View
                  style={
                    styles.timeColumn
                  }
                >
                  <Text
                    style={
                      styles.timeLabel
                    }
                  >
                    Hour
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.timeArrow
                    }
                    onPress={
                      increaseHour
                    }
                  >
                    <MaterialIcons
                      name="keyboard-arrow-up"
                      size={28}
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
                      {selectedHour}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.timeArrow
                    }
                    onPress={
                      decreaseHour
                    }
                  >
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={28}
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
                      styles.timeLabel
                    }
                  >
                    Minute
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.timeArrow
                    }
                    onPress={
                      increaseMinute
                    }
                  >
                    <MaterialIcons
                      name="keyboard-arrow-up"
                      size={28}
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
                      {String(
                        selectedMinute
                      ).padStart(
                        2,
                        '0'
                      )}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.timeArrow
                    }
                    onPress={
                      decreaseMinute
                    }
                  >
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={28}
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

                      selectedPeriod ===
                        'AM' &&
                        styles.periodButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedPeriod(
                        'AM'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.periodText,

                        selectedPeriod ===
                          'AM' &&
                          styles.periodSelectedText,
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.periodButton,

                      selectedPeriod ===
                        'PM' &&
                        styles.periodButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedPeriod(
                        'PM'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.periodText,

                        selectedPeriod ===
                          'PM' &&
                          styles.periodSelectedText,
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.confirmPickerButton
                }
                onPress={
                  confirmTime
                }
              >
                <Text
                  style={
                    styles.confirmPickerText
                  }
                >
                  Confirm Time
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            IN-APP ACTION POPUP
        ==================================================== */}

        <Modal
          transparent
          visible={
            actionPopup.visible
          }
          animationType="fade"
          onRequestClose={() => {
            if (
              actionPopup.dismissOnBackdrop
            ) {
              closeActionPopup();
            }
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={
              styles.actionPopupOverlay
            }
            onPress={() => {
              if (
                actionPopup.dismissOnBackdrop
              ) {
                closeActionPopup();
              }
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={
                styles.actionPopupCard
              }
              onPress={() => {}}
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
                  actionPopup.variant ===
                    'error' &&
                    styles.actionPopupIconError,
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
                            'error'
                          ? 'error-outline'
                          : 'info-outline'
                  }
                  size={30}
                  color={
                    actionPopup.variant ===
                    'success'
                      ? COLORS.green
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
                    activeOpacity={0.8}
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
                  style={
                    styles.actionPopupPrimaryButton
                  }
                  activeOpacity={0.85}
                  onPress={() => {
                    if (
                      actionPopup.onConfirm
                    ) {
                      actionPopup.onConfirm();
                      return;
                    }

                    closeActionPopup();
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
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
          ? 440
          : '100%',

      height:
        Platform.OS === 'web'
          ? '100%'
          : '100%',

      maxWidth: '100%',

      overflow: 'hidden',

      backgroundColor:
        COLORS.pageBottom,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        Platform.OS === 'web'
          ? 118
          : 108,

      paddingHorizontal: 25,

      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 6,

      overflow: 'hidden',
    },

    headerSmall: {
      height: 104,
    },

    headerCircleLeft: {
      position: 'absolute',

      width: 160,
      height: 160,

      borderRadius: 80,

      left: -98,
      top: -73,

      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleRight: {
      position: 'absolute',

      width: 170,
      height: 170,

      borderRadius: 85,

      right: -73,
      top: -78,

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },

    headerRow: {
      flexDirection: 'row',

      alignItems: 'center',

      marginTop: 1,
    },

    backButton: {
      width: 43,
      height: 43,

      borderRadius: 22,

      borderWidth: 3,

      borderColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 17,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,
    },

    // ========================================================
    // BODY / FIXED FORM
    // ========================================================

    body: {
      flex: 1,

      paddingHorizontal: 18,

      paddingBottom: 16,
    },

    formCard: {
      flex: 1,

      marginTop: -14,

      borderRadius: 27,

      backgroundColor:
        COLORS.card,

      overflow: 'hidden',

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.16,

      shadowRadius: 7,

      elevation: 6,
    },

    formScroll: {
      flex: 1,
    },

    formScrollContent: {
      paddingHorizontal: 21,

      paddingTop: 22,

      paddingBottom: 30,
    },

    // ========================================================
    // REQUESTER
    // ========================================================

    requestingCard: {
      minHeight: 72,

      paddingHorizontal: 14,
      paddingVertical: 10,

      marginBottom: 19,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      backgroundColor:
        COLORS.pinkLight,
    },

    requestingLabel: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,

      marginBottom: 7,
    },

    requestingRow: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    avatar: {
      width: 32,
      height: 32,

      borderRadius: 16,

      marginRight: 9,

      backgroundColor:
        '#F8DCDC',

      alignItems: 'center',
      justifyContent: 'center',

      overflow: 'hidden',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
    },

    requesterInfo: {
      flex: 1,
    },

    requesterName: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    signedInRow: {
      marginTop: 2,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 3,
    },

    signedInText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    // ========================================================
    // LABELS
    // ========================================================

    label: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,

      marginBottom: 7,

      marginTop: 2,
    },

    required: {
      color:
        COLORS.red,
    },

    optional: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    helper: {
      marginTop: -3,

      marginBottom: 8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.2,

      lineHeight: 12,
    },

    // ========================================================
    // BLOOD TYPES
    // ========================================================

    bloodGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      rowGap: 9,

      marginBottom: 19,
    },

    bloodButton: {
      width: '22.5%',

      height: 45,

      borderWidth: 1,

      borderColor:
        '#999999',

      borderRadius: 12,

      backgroundColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
    },

    bloodButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    bloodButtonText: {
      color:
        '#333333',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    bloodButtonTextSelected: {
      color:
        COLORS.white,
    },

    // ========================================================
    // UNITS
    // ========================================================

    unitsRow: {
      flexDirection: 'row',

      gap: 7,

      marginBottom: 19,
    },

    unitButton: {
      width: 55,

      height: 43,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
    },

    unitDisabled: {
      opacity: 0.4,
    },

    unitValue: {
      flex: 1,

      height: 43,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
    },

    unitValueText: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },

    // ========================================================
    // FACILITY
    // ========================================================

    facilitySelector: {
      minHeight: 61,

      paddingHorizontal: 11,
      paddingVertical: 9,

      flexDirection: 'row',

      alignItems: 'center',

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },

    facilitySelectorSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        '#FFF8F8',
    },

    selectorIcon: {
      width: 38,
      height: 38,

      borderRadius: 19,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 9,

      backgroundColor:
        COLORS.pinkLight,
    },

    selectorIconSelected: {
      backgroundColor:
        COLORS.redButton,
    },

    selectorContent: {
      flex: 1,

      paddingRight: 5,
    },

    selectorTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    selectorPlaceholder: {
      color:
        '#555555',
    },

    selectorSubtitle: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    smallErrorBox: {
      marginTop: 7,

      paddingHorizontal: 9,
      paddingVertical: 7,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      borderRadius: 8,

      backgroundColor:
        COLORS.pinkLight,
    },

    smallErrorText: {
      flex: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      lineHeight: 11,
    },

    // ========================================================
    // OR / MANUAL
    // ========================================================

    orDivider: {
      flexDirection: 'row',

      alignItems: 'center',

      marginTop: 11,

      marginBottom: 9,
    },

    orLine: {
      flex: 1,

      height: 1,

      backgroundColor:
        '#E2E2E2',
    },

    orText: {
      marginHorizontal: 9,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    enterManuallyButton: {
      minHeight: 55,

      marginBottom: 19,

      paddingHorizontal: 11,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 10,

      backgroundColor:
        COLORS.pinkLight,
    },

    enterManuallyIcon: {
      width: 34,
      height: 34,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 9,

      backgroundColor:
        COLORS.white,
    },

    enterManuallyContent: {
      flex: 1,
    },

    enterManuallyTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    enterManuallySubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    manualModeCard: {
      padding: 12,

      marginBottom: 8,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 11,

      backgroundColor:
        COLORS.pinkLight,
    },

    manualModeHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 12,
    },

    manualModeIcon: {
      width: 35,
      height: 35,

      borderRadius: 18,

      marginRight: 8,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    manualModeHeading: {
      flex: 1,
    },

    manualModeTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    manualModeSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    manualFieldLabel: {
      marginBottom: 5,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8.5,
    },

    manualInputContainer: {
      height: 44,

      marginBottom: 10,

      paddingHorizontal: 11,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,
    },

    manualInput: {
      flex: 1,

      height: '100%',

      marginLeft: 7,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      outlineStyle:
        Platform.OS === 'web'
          ? 'none'
          : undefined,
    } as any,

    returnNearbyButton: {
      height: 40,

      marginBottom: 19,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,
    },

    returnNearbyText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    // ========================================================
    // URGENCY
    // ========================================================

    urgencyRow: {
      flexDirection: 'row',

      gap: 9,

      marginBottom: 19,
    },

    urgencyButton: {
      flex: 1,

      height: 55,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
    },

    urgencySelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    urgencyTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    urgencySub: {
      marginTop: 3,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    whiteText: {
      color:
        COLORS.white,
    },

    whiteMutedText: {
      color:
        'rgba(255,255,255,0.82)',
    },

    // ========================================================
    // DATE / TIME
    // ========================================================

    dateTimeRow: {
      flexDirection: 'row',

      gap: 8,

      marginBottom: 19,
    },

    dateTimeButton: {
      flex: 1,

      height: 49,

      paddingHorizontal: 10,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,
    },

    dateTimeDisabled: {
      opacity: 0.45,
    },

    dateTimeTinyLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 6.5,
    },

    dateTimeValue: {
      marginTop: 1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.7,
    },

    dateTimeValueSelected: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',
    },

    asapBox: {
      height: 45,

      marginBottom: 19,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 9,

      backgroundColor:
        COLORS.pinkLight,
    },

    asapText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,
    },

    // ========================================================
    // MESSAGE
    // ========================================================

    messageBox: {
      minHeight: 105,

      padding: 11,

      marginBottom: 13,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      backgroundColor:
        COLORS.white,
    },

    messageInput: {
      minHeight: 70,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 13,

      outlineStyle:
        Platform.OS === 'web'
          ? 'none'
          : undefined,
    } as any,

    characterCount: {
      alignSelf: 'flex-end',

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    // ========================================================
    // INFO / ERROR
    // ========================================================

    infoBox: {
      minHeight: 70,

      paddingHorizontal: 12,
      paddingVertical: 11,

      marginBottom: 13,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 9,

      backgroundColor:
        COLORS.pinkLight,
    },

    infoText: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,

      lineHeight: 12,
    },

    errorBox: {
      padding: 10,

      marginBottom: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,

      borderRadius: 8,

      backgroundColor:
        COLORS.pinkLight,
    },

    errorText: {
      flex: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    // ========================================================
    // SUBMIT
    // ========================================================

    submitButton: {
      height: 49,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      borderRadius: 9,

      backgroundColor:
        COLORS.redButton,
    },

    submitDisabled: {
      opacity: 0.6,
    },

    submitText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    // ========================================================
    // MODAL
    // ========================================================

    modalOverlay: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 23,

      backgroundColor:
        'rgba(0,0,0,0.45)',
    },

    modalHeader: {
      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'space-between',

      marginBottom: 15,
    },

    modalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 15,
    },

    modalSubtitle: {
      marginTop: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    closeButton: {
      width: 34,
      height: 34,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#F3F3F3',
    },

    // ========================================================
    // FACILITY MODAL
    // ========================================================

    facilityModal: {
      width: '100%',

      maxWidth: 360,

      maxHeight: '78%',

      paddingHorizontal: 16,
      paddingTop: 17,
      paddingBottom: 14,

      borderRadius: 21,

      backgroundColor:
        COLORS.white,
    },

    facilityModalLoading: {
      minHeight: 180,

      alignItems: 'center',
      justifyContent: 'center',
    },

    facilityModalLoadingText: {
      marginTop: 8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,
    },

    facilityList: {
      maxHeight: 430,
    },

    facilityOption: {
      minHeight: 65,

      marginBottom: 8,

      paddingHorizontal: 10,
      paddingVertical: 9,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      backgroundColor:
        COLORS.white,
    },

    facilityOptionSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        '#FFF4F4',
    },

    facilityOptionIcon: {
      width: 37,
      height: 37,

      borderRadius: 19,

      marginRight: 9,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    facilityOptionIconSelected: {
      backgroundColor:
        COLORS.redButton,
    },

    facilityOptionContent: {
      flex: 1,

      paddingRight: 7,
    },

    facilityOptionName: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,

      lineHeight: 13,
    },

    facilityOptionMeta: {
      marginTop: 3,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.5,
    },

    facilityOptionAddress: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7,
    },

    radio: {
      width: 19,
      height: 19,

      borderRadius: 10,

      borderWidth: 1.5,

      borderColor:
        '#BBBBBB',

      alignItems: 'center',
      justifyContent: 'center',
    },

    radioSelected: {
      borderColor:
        COLORS.redButton,
    },

    radioInner: {
      width: 9,
      height: 9,

      borderRadius: 5,

      backgroundColor:
        COLORS.redButton,
    },

    modalFooter: {
      flexDirection: 'row',

      gap: 8,

      marginTop: 8,
    },

    refreshFacilityButton: {
      flex: 0.8,

      height: 41,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 9,

      backgroundColor:
        COLORS.pinkLight,
    },

    refreshFacilityText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8.5,
    },

    manualFacilityModalButton: {
      flex: 1.2,

      height: 41,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      borderRadius: 9,

      backgroundColor:
        COLORS.redButton,
    },

    manualFacilityModalText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    // ========================================================
    // CALENDAR
    // ========================================================

    calendarModal: {
      width: '100%',

      maxWidth: 350,

      padding: 18,

      borderRadius: 21,

      backgroundColor:
        COLORS.white,
    },

    calendarNavigation: {
      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'space-between',

      marginBottom: 13,
    },

    calendarArrow: {
      width: 36,
      height: 36,

      borderRadius: 18,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    calendarMonth: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    weekRow: {
      flexDirection: 'row',

      marginBottom: 4,
    },

    weekDay: {
      width: '14.285%',

      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8,

      textAlign: 'center',
    },

    calendarGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      marginBottom: 15,
    },

    calendarCell: {
      width: '14.285%',

      height: 39,

      alignItems: 'center',
      justifyContent: 'center',
    },

    dayCircle: {
      width: 33,
      height: 33,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',
    },

    dayCircleSelected: {
      backgroundColor:
        COLORS.redButton,
    },

    dayText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9.5,
    },

    dayDisabled: {
      color:
        '#CCCCCC',
    },

    daySelectedText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    confirmPickerButton: {
      height: 44,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 9,

      backgroundColor:
        COLORS.redButton,
    },

    confirmPickerDisabled: {
      opacity: 0.4,
    },

    confirmPickerText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    // ========================================================
    // TIME
    // ========================================================

    timeModal: {
      width: '100%',

      maxWidth: 335,

      padding: 18,

      borderRadius: 21,

      backgroundColor:
        COLORS.white,
    },

    timePickerRow: {
      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 19,
    },

    timeColumn: {
      width: 75,

      alignItems: 'center',
    },

    timeLabel: {
      marginBottom: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    timeArrow: {
      width: 40,
      height: 31,

      alignItems: 'center',
      justifyContent: 'center',
    },

    timeValueBox: {
      width: 61,
      height: 52,

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 11,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    timeValueText: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 19,
    },

    timeColon: {
      marginHorizontal: 3,

      marginTop: 12,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 21,
    },

    periodColumn: {
      marginLeft: 12,

      marginTop: 18,

      gap: 7,
    },

    periodButton: {
      width: 48,
      height: 36,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 8,

      alignItems: 'center',
      justifyContent: 'center',
    },

    periodButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    periodText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9,
    },

    periodSelectedText: {
      color:
        COLORS.white,
    },

    // ========================================================
    // IN-APP ACTION POPUP
    // ========================================================

    actionPopupOverlay: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 24,

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    actionPopupCard: {
      width: '100%',

      maxWidth: 360,

      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.2,

      shadowRadius: 18,

      elevation: 10,
    },

    actionPopupIcon: {
      width: 56,
      height: 56,

      borderRadius: 28,

      alignSelf: 'center',

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 13,

      backgroundColor:
        COLORS.pinkLight,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        '#EAF8EF',
    },

    actionPopupIconWarning: {
      backgroundColor:
        '#FFF6E7',
    },

    actionPopupIconError: {
      backgroundColor:
        COLORS.pinkLight,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 16,

      textAlign: 'center',
    },

    actionPopupMessage: {
      marginTop: 8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,

      lineHeight: 17,

      textAlign: 'center',
    },

    actionPopupActions: {
      flexDirection: 'row',

      gap: 9,

      marginTop: 19,
    },

    actionPopupActionsSingle: {
      justifyContent: 'center',
    },

    actionPopupSecondaryButton: {
      flex: 1,

      height: 45,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius: 10,

      backgroundColor:
        COLORS.white,
    },

    actionPopupSecondaryText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    actionPopupPrimaryButton: {
      flex: 1,

      minWidth: 130,

      height: 45,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupPrimaryText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },
  });