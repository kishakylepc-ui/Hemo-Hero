import { useCallback, useMemo, useState } from 'react';

import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ICON_TILE } from '../../constants/theme';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import PhotoSourceSheet from '../../components/PhotoSourceSheet';

import {
  normalizePhone,
  PHONE_ERROR,
} from '../../lib/phone';
import AppModal from '../../components/AppModal';
import AuthField from '../../components/AuthField';
import SetupHeader from '../../components/SetupHeader';
import { useKeyboardOpen } from '../../lib/useKeyboardOpen';
import { logoutUser } from '../../lib/api';
import { unregisterPushNotifications } from '../../lib/pushNotifications';
import {
  clearSession,
  getAccessToken,
  setLogoutReason,
} from '../../lib/session';
import { goToSignIn } from '../../lib/signInRoute';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#171717',

  inputBorder: '#D6D6D6',
  placeholder: '#A0A0A0',
  muted: '#646464',

  progressInactive: '#D6D6D6',
  photoBackground: '#EFE3E3',

  selectedDate: '#B42323',

  // Form (same as Sign Up's fields)
  label: '#444449',
  border: '#E4D7D7',
  fill: '#FCFCFD',
  icon: '#9A8C8C',
  segment: '#F3EDED',
  hint: '#666666',
};

const MONTH_NAMES = [
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

const DAY_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

type ActionPopupVariant =
  | 'info'
  | 'warning'
  | 'error';

type ActionPopupState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionPopupVariant;
};

export default function PersonalInformationScreen() {
  // The page runs to the bottom edge; its content ends above
  // the home bar.
  const insets = useSafeAreaInsets();

  // The bottom bar hides while typing (see below).
  const keyboardOpen =
    useKeyboardOpen();

  // ==========================================================
  // PERSONAL INFORMATION
  // ==========================================================

  const [
    firstName,
    setFirstName,
  ] =
    useState('');

  const [
    lastName,
    setLastName,
  ] =
    useState('');

  const [
    middleName,
    setMiddleName,
  ] =
    useState('');

  // Optional.
  const [
    phone,
    setPhone,
  ] =
    useState('');

  const [
    dateOfBirth,
    setDateOfBirth,
  ] =
    useState('');

  const [
    gender,
    setGender,
  ] =
    useState('');


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    actionPopup,
    setActionPopup,
  ] =
    useState<ActionPopupState>({
      visible: false,
      title: '',
      message: '',
      variant: 'info',
    });

  // ==========================================================
  // PROFILE PHOTO
  // ==========================================================

  const [
    profilePhoto,
    setProfilePhoto,
  ] =
    useState<string | null>(
      null
    );

  // Take Photo / Choose from Library sheet.
  const [
    photoSheetVisible,
    setPhotoSheetVisible,
  ] =
    useState(
      false
    );

  // ==========================================================
  // CALENDAR
  // ==========================================================

  const today =
    new Date();

  const [
    calendarVisible,
    setCalendarVisible,
  ] =
    useState(false);

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(
      today.getMonth()
    );

  const [
    calendarYear,
    setCalendarYear,
  ] =
    useState(
      today.getFullYear() -
        18
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState<Date | null>(
      null
    );

  const genderOptions = [
    'Male',
    'Female',
    'Prefer not to say',
  ];

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function closeActionPopup() {
    setActionPopup(
      current => ({
        ...current,
        visible: false,
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
        'unable'
      ) ||
      value.includes(
        'error'
      )
    ) {
      return 'error';
    }

    if (
      value.includes(
        'required'
      ) ||
      value.includes(
        'missing'
      )
    ) {
      return 'warning';
    }

    return 'info';
  }

  // ==========================================================
  // LEAVE SETUP (back on step 1)
  //
  // Step 1 opens with replace after signing in, so there is no
  // screen to go back to. Back offers to sign out instead; they
  // finish the profile the next time they sign in.
  // ==========================================================

  const [
    leaveVisible,
    setLeaveVisible,
  ] = useState(false);

  const [
    leaving,
    setLeaving,
  ] = useState(false);

  // Android's back button asks too.
  useFocusEffect(
    useCallback(() => {
      const subscription =
        BackHandler.addEventListener(
          'hardwareBackPress',
          () => {
            setLeaveVisible(true);

            return true;
          }
        );

      return () =>
        subscription.remove();
    }, [])
  );

  async function leaveSetup() {
    setLeaving(true);

    try {
      const token =
        await getAccessToken();

      if (token) {
        await unregisterPushNotifications(
          token
        );

        try {
          await logoutUser(token);
        } catch (error) {
          console.log(
            'LEAVE SETUP LOGOUT ERROR:',
            error
          );
        }
      }

      await setLogoutReason(
        'signed_out'
      );

      await clearSession();

      setLeaveVisible(false);

      // Closes every screen, so Back can't return.
      goToSignIn();
    } finally {
      setLeaving(false);
    }
  }

  function showMessage(
    title: string,
    message: string
  ) {
    setActionPopup({
      visible: true,
      title,
      message,
      variant:
        getMessageVariant(
          title
        ),
    });
  }

  function clearError() {
    if (
      errorMessage
    ) {
      setErrorMessage(
        ''
      );
    }
  }

  // ==========================================================
  // PROFILE PHOTO PICKER
  // ==========================================================

  // The photo is uploaded when the last step saves the profile.
  function handlePhotoPress() {
    setPhotoSheetVisible(
      true
    );
  }

  function handleRemovePhoto() {
    setProfilePhoto(
      null
    );
  }

  // ==========================================================
  // DATE FUNCTIONS
  // ==========================================================

  function formatDatabaseDate(
    date: Date
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

  function formatDisplayDate(
    date: Date
  ) {
    return date
      .toLocaleDateString(
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
  }

  function openCalendar() {
    if (
      selectedDate
    ) {
      setCalendarMonth(
        selectedDate
          .getMonth()
      );

      setCalendarYear(
        selectedDate
          .getFullYear()
      );
    }

    setCalendarVisible(
      true
    );
  }

  function previousMonth() {
    if (
      calendarMonth ===
      0
    ) {
      setCalendarMonth(
        11
      );

      setCalendarYear(
        current =>
          current -
          1
      );

      return;
    }

    setCalendarMonth(
      current =>
        current -
        1
    );
  }

  function nextMonth() {
    const proposed =
      new Date(
        calendarYear,
        calendarMonth +
          1,
        1
      );

    const currentMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    if (
      proposed >
      currentMonth
    ) {
      return;
    }

    if (
      calendarMonth ===
      11
    ) {
      setCalendarMonth(
        0
      );

      setCalendarYear(
        current =>
          current +
          1
      );

      return;
    }

    setCalendarMonth(
      current =>
        current +
        1
    );
  }

  function previousYear() {
    setCalendarYear(
      current =>
        current -
        1
    );
  }

  function nextYear() {
    if (
      calendarYear <
      today.getFullYear()
    ) {
      setCalendarYear(
        current =>
          current +
          1
      );
    }
  }

  function selectCalendarDate(
    day: number
  ) {
    const date =
      new Date(
        calendarYear,
        calendarMonth,
        day
      );

    if (
      date >
      today
    ) {
      return;
    }

    setSelectedDate(
      date
    );

    setDateOfBirth(
      formatDatabaseDate(
        date
      )
    );

    clearError();

    setCalendarVisible(
      false
    );
  }

  // ==========================================================
  // BUILD CALENDAR
  // ==========================================================

  const calendarDays =
    useMemo(
      () => {
        const firstDay =
          new Date(
            calendarYear,
            calendarMonth,
            1
          )
            .getDay();

        const daysInMonth =
          new Date(
            calendarYear,
            calendarMonth +
              1,
            0
          )
            .getDate();

        const days:
          Array<
            number | null
          > = [];

        for (
          let i =
            0;
          i <
          firstDay;
          i++
        ) {
          days.push(
            null
          );
        }

        for (
          let day =
            1;
          day <=
          daysInMonth;
          day++
        ) {
          days.push(
            day
          );
        }

        while (
          days.length %
            7 !==
          0
        ) {
          days.push(
            null
          );
        }

        return days;
      },
      [
        calendarMonth,
        calendarYear,
      ]
    );

  // ==========================================================
  // NEXT
  // ==========================================================

  function handleNext() {
    setErrorMessage(
      ''
    );

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    if (
      !cleanFirstName ||
      !cleanLastName ||
      !dateOfBirth ||
      !gender
    ) {
      const message =
        'Please complete all required personal information.';

      setErrorMessage(
        message
      );

      showMessage(
        'Missing Information',
        message
      );

      return;
    }

    const cleanPhone =
      normalizePhone(
        phone
      );

    if (
      cleanPhone === null
    ) {
      setErrorMessage(
        PHONE_ERROR
      );

      showMessage(
        'Check Phone Number',
        PHONE_ERROR
      );

      return;
    }

    router.push({
      pathname:
        '/complete-profile/location',

      params: {
        first_name:
          cleanFirstName,

        last_name:
          cleanLastName,

        middle_name:
          middleName.trim(),

        phone:
          cleanPhone,

        date_of_birth:
          dateOfBirth,

        gender,

        profile_photo_uri:
          profilePhoto ||
          '',
      },
    });
  }

  // ==========================================================
  // SCREEN
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
          // The red top draws behind the status bar; the bottom
          // bar keeps clear of the home indicator itself.
          edges={[
            'left',
            'right',
          ]}
        >
          <StatusBar
            style="light"
          />

          <KeyboardAvoidingView
            style={
              styles.flex
            }
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            <ScrollView
              contentContainerStyle={
                styles.scroll
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              bounces={
                false
              }
            >
              <SetupHeader
                topInset={
                  insets.top
                }
                step={1}
                title="Complete your profile"
                subtitle="Tell us a bit about yourself."
                onBack={() =>
                  setLeaveVisible(true)
                }
              />

              <View
                style={
                  styles.form
                }
              >
                {/* ==============================================
                    PROFILE PHOTO (optional)
                ============================================== */}

                <View
                  style={
                    styles.photoRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.photoMain
                    }
                    activeOpacity={
                      0.8
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      profilePhoto
                        ? 'Change profile photo'
                        : 'Add a profile photo'
                    }
                    onPress={
                      handlePhotoPress
                    }
                  >
                    <View
                      style={
                        styles.photoCircle
                      }
                    >
                      {profilePhoto ? (
                        <Image
                          source={{
                            uri:
                              profilePhoto,
                          }}
                          style={
                            styles.profileImage
                          }
                        />
                      ) : (
                        <Ionicons
                          name="camera-outline"
                          size={26}
                          color={
                            COLORS.redButton
                          }
                        />
                      )}

                      <View
                        style={
                          styles.photoBadge
                        }
                      >
                        <Ionicons
                          name={
                            profilePhoto
                              ? 'pencil'
                              : 'add'
                          }
                          size={13}
                          color={
                            COLORS.white
                          }
                        />
                      </View>
                    </View>

                    <View
                      style={
                        styles.photoText
                      }
                    >
                      <Text
                        style={
                          styles.photoTitle
                        }
                      >
                        {profilePhoto
                          ? 'Profile photo added'
                          : 'Add a profile photo'}
                      </Text>

                      <Text
                        style={
                          styles.photoSubtitle
                        }
                      >
                        {profilePhoto
                          ? 'Tap to choose another'
                          : 'Optional · helps others recognize you'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {profilePhoto ? (
                    <TouchableOpacity
                      style={
                        styles.removePhotoButton
                      }
                      activeOpacity={
                        0.7
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                      onPress={
                        handleRemovePhoto
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {errorMessage ? (
                  <View
                    style={
                      styles.errorBox
                    }
                  >
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {errorMessage}
                    </Text>
                  </View>
                ) : null}

                {/* ==============================================
                    NAME
                ============================================== */}

                <View
                  style={
                    styles.nameRow
                  }
                >
                  <View
                    style={
                      styles.nameField
                    }
                  >
                    <AuthField
                      label="First name"
                      icon="person-outline"
                      placeholder="e.g. Juan"
                      value={
                        firstName
                      }
                      autoCapitalize="words"
                      autoCorrect={
                        false
                      }
                      textContentType="givenName"
                      autoComplete="name-given"
                      onChangeText={value => {
                        setFirstName(
                          value
                        );
                        clearError();
                      }}
                    />
                  </View>

                  <View
                    style={
                      styles.nameField
                    }
                  >
                    <AuthField
                      label="Last name"
                      icon="person-outline"
                      placeholder="e.g. Dela Cruz"
                      value={
                        lastName
                      }
                      autoCapitalize="words"
                      autoCorrect={
                        false
                      }
                      textContentType="familyName"
                      autoComplete="name-family"
                      onChangeText={value => {
                        setLastName(
                          value
                        );
                        clearError();
                      }}
                    />
                  </View>
                </View>

                <AuthField
                  label="Middle name (optional)"
                  icon="person-outline"
                  placeholder="e.g. Santos"
                  value={
                    middleName
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  textContentType="middleName"
                  autoComplete="name-middle"
                  onChangeText={
                    setMiddleName
                  }
                />

                {/* ==============================================
                    DATE OF BIRTH
                ============================================== */}

                <View
                  style={
                    styles.fieldWrap
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Date of birth
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.fieldBox
                    }
                    activeOpacity={
                      0.8
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectedDate
                        ? `Date of birth, ${formatDisplayDate(
                            selectedDate
                          )}`
                        : 'Select date of birth'
                    }
                    onPress={
                      openCalendar
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={
                        selectedDate
                          ? COLORS.redButton
                          : COLORS.icon
                      }
                    />

                    <Text
                      style={[
                        styles.fieldValue,
                        !selectedDate &&
                          styles.fieldPlaceholder,
                      ]}
                    >
                      {selectedDate
                        ? formatDisplayDate(
                            selectedDate
                          )
                        : 'Select your birthday'}
                    </Text>

                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={
                        COLORS.icon
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* ==============================================
                    GENDER (three-way switch)
                ============================================== */}

                <View
                  style={
                    styles.fieldWrap
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Gender
                  </Text>

                  <View
                    style={
                      styles.segment
                    }
                    accessibilityRole="radiogroup"
                  >
                    {genderOptions.map(
                      option => {
                        const selected =
                          gender ===
                          option;

                        return (
                          <TouchableOpacity
                            key={
                              option
                            }
                            style={[
                              styles.segmentOption,
                              option ===
                                'Prefer not to say' &&
                                styles.segmentOptionWide,
                              selected &&
                                styles.segmentOptionActive,
                            ]}
                            activeOpacity={
                              0.8
                            }
                            accessibilityRole="radio"
                            accessibilityState={{
                              checked:
                                selected,
                            }}
                            onPress={() => {
                              setGender(
                                option
                              );
                              clearError();
                            }}
                          >
                            <Text
                              numberOfLines={
                                1
                              }
                              style={[
                                styles.segmentText,
                                selected &&
                                  styles.segmentTextActive,
                              ]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>

                {/* ==============================================
                    PHONE (optional)
                ============================================== */}

                <AuthField
                  label="Phone number (optional)"
                  icon="call-outline"
                  placeholder="0917 123 4567"
                  value={
                    phone
                  }
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={
                    17
                  }
                  onChangeText={value => {
                    setPhone(
                      value
                    );
                    clearError();
                  }}
                >
                  <View
                    style={
                      styles.hintRow
                    }
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={12}
                      color={
                        COLORS.hint
                      }
                    />

                    <Text
                      style={
                        styles.fieldHint
                      }
                    >
                      Only Hemo-Hero staff can see it. Other users never do.
                    </Text>
                  </View>
                </AuthField>
              </View>
            </ScrollView>

            {/* Stays at the bottom: hidden while the keyboard is
                open instead of riding up on top of it. */}
            {keyboardOpen ? null : (
              <View
                style={[
                  styles.bottomBar,

                  {
                    paddingBottom:
                      12 +
                      insets.bottom,
                  },
                ]}
              >
                <TouchableOpacity
                  style={
                    styles.nextButton
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={
                    handleNext
                  }
                >
                  <Text
                    style={
                      styles.nextButtonText
                    }
                  >
                    Next
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={
                      COLORS.white
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* ========================================================
          DATE PICKER MODAL
      ======================================================== */}

      <Modal
        visible={
          calendarVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCalendarVisible(
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
            {/* ================================================
                CALENDAR TITLE
            ================================================ */}

            <View
              style={
                styles.calendarTitleRow
              }
            >
              <View>
                <Text
                  style={
                    styles.calendarSmallTitle
                  }
                >
                  Date of Birth
                </Text>

                <Text
                  style={
                    styles.calendarSelectedText
                  }
                >
                  {selectedDate
                    ? formatDisplayDate(
                        selectedDate
                      )
                    : 'Select a date'}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeCalendarButton
                }
                onPress={() =>
                  setCalendarVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={17}
                  color={
                    COLORS.black
                  }
                />
              </TouchableOpacity>
            </View>

            {/* ================================================
                YEAR
            ================================================ */}

            <View
              style={
                styles.yearSelector
              }
            >
              <TouchableOpacity
                style={
                  styles.yearArrow
                }
                onPress={
                  previousYear
                }
              >
                <Ionicons
                  name="play-back-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.redButton
                  }
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.yearText
                }
              >
                {
                  calendarYear
                }
              </Text>

              <TouchableOpacity
                style={
                  styles.yearArrow
                }
                onPress={
                  nextYear
                }
              >
                <Ionicons
                  name="play-forward-outline"
                  size={
                    20
                  }
                  color={
                    COLORS.redButton
                  }
                />
              </TouchableOpacity>
            </View>

            {/* ================================================
                MONTH
            ================================================ */}

            <View
              style={
                styles.monthHeader
              }
            >
              <TouchableOpacity
                style={
                  styles.monthArrow
                }
                onPress={
                  previousMonth
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={
                    24
                  }
                  color={
                    COLORS.black
                  }
                />
              </TouchableOpacity>

              <Text
                style={
                  styles.monthTitle
                }
              >
                {
                  MONTH_NAMES[
                    calendarMonth
                  ]
                }
              </Text>

              <TouchableOpacity
                style={
                  styles.monthArrow
                }
                onPress={
                  nextMonth
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={
                    24
                  }
                  color={
                    COLORS.black
                  }
                />
              </TouchableOpacity>
            </View>

            {/* ================================================
                DAY LABELS
            ================================================ */}

            <View
              style={
                styles.daysHeader
              }
            >
              {DAY_NAMES.map(
                day => (
                  <View
                    key={
                      day
                    }
                    style={
                      styles.dayCell
                    }
                  >
                    <Text
                      style={
                        styles.dayName
                      }
                    >
                      {
                        day
                      }
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* ================================================
                CALENDAR DAYS
            ================================================ */}

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
                  if (
                    !day
                  ) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={
                          styles.dayCell
                        }
                      />
                    );
                  }

                  const currentDate =
                    new Date(
                      calendarYear,
                      calendarMonth,
                      day
                    );

                  const isFuture =
                    currentDate >
                    today;

                  const isSelected =
                    selectedDate !==
                      null &&
                    selectedDate
                      .getFullYear() ===
                      calendarYear &&
                    selectedDate
                      .getMonth() ===
                      calendarMonth &&
                    selectedDate
                      .getDate() ===
                      day;

                  return (
                    <View
                      key={
                        day
                      }
                      style={
                        styles.dayCell
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.dayButton,

                          isSelected &&
                            styles.dayButtonSelected,
                        ]}
                        disabled={
                          isFuture
                        }
                        activeOpacity={
                          0.7
                        }
                        onPress={() =>
                          selectCalendarDate(
                            day
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.dayText,

                            isSelected &&
                              styles.dayTextSelected,

                            isFuture &&
                              styles.dayTextDisabled,
                          ]}
                        >
                          {
                            day
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
              )}
            </View>

            {/* ================================================
                CANCEL
            ================================================ */}

            <TouchableOpacity
              style={
                styles.cancelCalendarButton
              }
              onPress={() =>
                setCalendarVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.cancelCalendarText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          HEMO-HERO ACTION POPUP
      ======================================================== */}

      <Modal
        visible={
          actionPopup.visible
        }
        transparent
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
                  'warning' &&
                  styles.actionPopupIconWarning,

                actionPopup.variant ===
                  'error' &&
                  styles.actionPopupIconError,
              ]}
            >
              <Ionicons
                name={
                  actionPopup.variant ===
                    'warning'
                    ? 'warning'
                    : actionPopup.variant ===
                        'error'
                      ? 'close-circle'
                      : 'information-circle'
                }
                size={
            ICON_TILE.lg.glyph
          }
                color={
                  actionPopup.variant ===
                    'warning'
                    ? '#C96A18'
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

            <TouchableOpacity
              style={
                styles.actionPopupButton
              }
              activeOpacity={
                0.85
              }
              onPress={
                closeActionPopup
              }
            >
              <Text
                style={
                  styles.actionPopupButtonText
                }
              >
                Okay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PhotoSourceSheet
        visible={
          photoSheetVisible
        }
        onClose={() =>
          setPhotoSheetVisible(
            false
          )
        }
        onPicked={image =>
          setProfilePhoto(
            image.uri
          )
        }
        onError={message =>
          showMessage(
            'Permission Required',
            message
          )
        }
      />

      <AppModal
        visible={leaveVisible}
        variant="warning"
        icon="log-out-outline"
        title="Leave setup?"
        message="You'll be signed out, and what you entered here won't be saved. You can finish your profile the next time you sign in."
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        loading={leaving}
        onConfirm={leaveSetup}
        onClose={() =>
          setLeaveVisible(false)
        }
      />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // FORM (new look: same fields as Sign Up)
    // ========================================================

    safeArea: {
      flex: 1,
      backgroundColor: COLORS.white,
    },

    scroll: {
      flexGrow: 1,
      backgroundColor: COLORS.white,
    },

    form: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 24,
    },

    photoRow: {
      marginBottom: 20,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: COLORS.border,
      borderRadius: 16,
      backgroundColor: '#FFFBFB',
    },

    photoMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    photoCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FDECEC',
    },

    profileImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },

    photoBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.redButton,
    },

    photoText: {
      flex: 1,
    },

    photoTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    photoSubtitle: {
      marginTop: 2,
      color: COLORS.hint,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    removePhotoButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FDECEC',
    },

    errorBox: {
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#FDECEC',
    },

    errorText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      textAlign: 'center',
    },

    nameRow: {
      flexDirection: 'row',
      gap: 12,
    },

    nameField: {
      flex: 1,
      minWidth: 0,
    },

    // Same frame as AuthField, for the date and gender.
    fieldWrap: {
      marginBottom: 16,
    },

    fieldLabel: {
      marginBottom: 8,
      color: COLORS.label,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    fieldBox: {
      height: 50,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      backgroundColor: COLORS.fill,
    },

    fieldValue: {
      flex: 1,
      color: COLORS.black,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
    },

    fieldPlaceholder: {
      color: COLORS.placeholder,
    },

    segment: {
      height: 46,
      padding: 3,
      flexDirection: 'row',
      gap: 3,
      borderRadius: 12,
      backgroundColor: COLORS.segment,
    },

    segmentOption: {
      flex: 1,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },

    segmentOptionWide: {
      flex: 1.6,
    },

    segmentOptionActive: {
      backgroundColor: COLORS.white,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },

    segmentText: {
      color: '#555555',
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
    },

    segmentTextActive: {
      color: COLORS.redButton,
    },

    hintRow: {
      marginTop: 8,
      marginLeft: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    fieldHint: {
      flex: 1,
      color: COLORS.hint,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    bottomBar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#F0E3E3',
      backgroundColor: COLORS.white,
    },

    nextButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      backgroundColor: COLORS.redButton,
      shadowColor: COLORS.redButton,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },

    nextButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    flex: {
      flex:
        1,
    },

    // ==========================================================
    // DESKTOP
    // ==========================================================

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
          ? '#1E1E1E'
          : COLORS.backgroundBottom,
    },

    // ==========================================================
    // PHONE
    // ==========================================================

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
        COLORS.backgroundBottom,
    },


    // ==========================================================
    // CALENDAR MODAL
    // ==========================================================

    modalOverlay: {
      flex:
        1,

      backgroundColor:
        'rgba(0,0,0,0.45)',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,
    },

    calendarModal: {
      width:
        '100%',

      maxWidth:
        350,

      paddingHorizontal: 20,

      paddingTop: 24,

      paddingBottom: 20,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          5,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        10,

      elevation:
        10,
    },

    calendarTitleRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',

      marginBottom: 16,
    },

    calendarSmallTitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,
    },

    calendarSelectedText: {
      marginTop:
        3,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        15,
    },

    closeCalendarButton: {
      width: 30,

      height: 30,

      borderRadius: 15,

      backgroundColor: '#F2F2F4',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ==========================================================
    // YEAR
    // ==========================================================

    yearSelector: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 8,
    },

    yearArrow: {
      width:
        40,

      height:
        32,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    yearText: {
      width:
        80,

      textAlign:
        'center',

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    // ==========================================================
    // MONTH
    // ==========================================================

    monthHeader: {
      height:
        42,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    monthArrow: {
      width:
        38,

      height:
        38,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    monthTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    // ==========================================================
    // DAY LABELS
    // ==========================================================

    daysHeader: {
      flexDirection:
        'row',

      marginTop:
        4,

      marginBottom:
        4,
    },

    dayCell: {
      width:
        `${100 / 7}%`,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    dayName: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11.5,
    },

    // ==========================================================
    // CALENDAR DAYS
    // ==========================================================

    calendarGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      marginTop:
        3,
    },

    dayButton: {
      width:
        34,

      height:
        34,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginVertical:
        2,
    },

    dayButtonSelected: {
      backgroundColor:
        COLORS.selectedDate,
    },

    dayText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,
    },

    dayTextSelected: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    dayTextDisabled: {
      color:
        '#D1D1D1',
    },

    // ==========================================================
    // CALENDAR CANCEL
    // ==========================================================

    cancelCalendarButton: {
      height: 48,

      marginTop: 16,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor: '#F2F2F4',
    },

    cancelCalendarText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    // ==========================================================
    // ACTION POPUP
    // ==========================================================

    actionPopupOverlay: {
      flex:
        1,

      paddingHorizontal:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    actionPopupCard: {
      width:
        '100%',

      maxWidth: 340,

      paddingHorizontal: 24,

      paddingTop: 28,

      paddingBottom: 20,

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
      width: ICON_TILE.lg.size,

      height: ICON_TILE.lg.size,

      alignSelf:
        'center',

      marginBottom: 16,

      borderRadius: ICON_TILE.lg.radius,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFF1F1',
    },

    actionPopupIconWarning: {
      backgroundColor:
        '#FFF5E8',
    },

    actionPopupIconError: {
      backgroundColor:
        '#FFF1F1',
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 17,

      lineHeight: 24,

      textAlign:
        'center',
    },

    actionPopupMessage: {
      marginTop: 6,

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

    actionPopupButton: {
      height: 48,

      marginTop: 24,

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },
  });