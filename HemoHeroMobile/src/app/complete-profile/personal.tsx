import { useMemo, useState } from 'react';

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
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
    genderOpen,
    setGenderOpen,
  ] =
    useState(false);

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
    setGenderOpen(
      false
    );

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
          // The header scrolls with the page, so the top keeps its
          // padding; the bottom is drawn edge to edge.
          edges={[
            'top',
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
              contentContainerStyle={[
                styles.scroll,
                {
                  paddingBottom:
                    insets.bottom,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              bounces={
                false
              }
            >
              {/* ==================================================
                  HEADER
              ================================================== */}

              <LinearGradient
                colors={[
                  COLORS.red,
                  COLORS.redDark,
                ]}
                style={
                  styles.header
                }
              >
                <View
                  style={
                    styles.headerDecoration
                  }
                />

                <View
                  style={
                    styles.headerRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.backCircle
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
                      size={
                        21
                      }
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
                    Complete your Profile
                  </Text>
                </View>
              </LinearGradient>

              {/* ==================================================
                  BODY
              ================================================== */}

              <LinearGradient
                colors={[
                  COLORS.backgroundTop,
                  COLORS.backgroundBottom,
                ]}
                style={
                  styles.bodyBackground
                }
              >
                <View
                  style={
                    styles.card
                  }
                >
                  {/* ==============================================
                      PROGRESS
                  ============================================== */}

                  <View
                    style={
                      styles.progressRow
                    }
                  >
                    <View
                      style={[
                        styles.progressLine,
                        styles.progressActive,
                      ]}
                    />

                    <View
                      style={
                        styles.progressLine
                      }
                    />

                    <View
                      style={
                        styles.progressLine
                      }
                    />
                  </View>

                  {/* ==============================================
                      TITLE
                  ============================================== */}

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Personal Information
                  </Text>

                  {/* ==============================================
                      PROFILE PHOTO
                  ============================================== */}

                  <TouchableOpacity
                    style={
                      styles.photoArea
                    }
                    activeOpacity={
                      0.8
                    }
                    onPress={
                      handlePhotoPress
                    }
                  >
                    <View
                      style={
                        styles.photoWrapper
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
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons
                            name="photo-camera"
                            size={
                              30
                            }
                            color="#444444"
                          />
                        )}
                      </View>

                      <View
                        style={
                          styles.addPhotoBadge
                        }
                      >
                        <MaterialIcons
                          name={
                            profilePhoto
                              ? 'edit'
                              : 'add'
                          }
                          size={
                            12
                          }
                          color={
                            COLORS.white
                          }
                        />
                      </View>
                    </View>

                    <Text
                      style={
                        styles.photoTitle
                      }
                    >
                      {profilePhoto
                        ? 'Change Profile Photo'
                        : 'Add a Profile Photo'}
                    </Text>

                    <Text
                      style={
                        styles.photoSubtitle
                      }
                    >
                      {profilePhoto
                        ? 'Tap the photo to choose another'
                        : 'Help others recognize you'}
                    </Text>
                  </TouchableOpacity>

                  {profilePhoto ? (
                    <TouchableOpacity
                      style={
                        styles.removePhotoButton
                      }
                      activeOpacity={
                        0.7
                      }
                      onPress={
                        handleRemovePhoto
                      }
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={
                          13
                        }
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.removePhotoText
                        }
                      >
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* ==============================================
                      ERROR
                  ============================================== */}

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
                        {
                          errorMessage
                        }
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      FIRST NAME
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    First Name
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter First Name"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      firstName
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      value => {
                        setFirstName(
                          value
                        );

                        clearError();
                      }
                    }
                  />

                  {/* ==============================================
                      LAST NAME
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Last Name
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter Last Name"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      lastName
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      value => {
                        setLastName(
                          value
                        );

                        clearError();
                      }
                    }
                  />

                  {/* ==============================================
                      MIDDLE NAME
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Middle Name (Optional)
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter Middle Name"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      middleName
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      setMiddleName
                    }
                  />

                  {/* ==============================================
                      DATE OF BIRTH
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Date of Birth
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.dateSelector
                    }
                    activeOpacity={
                      0.8
                    }
                    onPress={
                      openCalendar
                    }
                  >
                    <View
                      style={
                        styles.dateLeft
                      }
                    >
                      <MaterialIcons
                        name="calendar-today"
                        size={
                          15
                        }
                        color={
                          COLORS.muted
                        }
                      />

                      <Text
                        style={[
                          styles.dateText,

                          !selectedDate &&
                            styles.placeholderText,
                        ]}
                      >
                        {selectedDate
                          ? formatDisplayDate(
                              selectedDate
                            )
                          : 'Select Date of Birth'}
                      </Text>
                    </View>

                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={
                        19
                      }
                      color={
                        COLORS.muted
                      }
                    />
                  </TouchableOpacity>

                  {/* ==============================================
                      GENDER
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Gender
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.genderSelector
                    }
                    activeOpacity={
                      0.8
                    }
                    onPress={() => {
                      setGenderOpen(
                        current =>
                          !current
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.genderText,

                        !gender &&
                          styles.placeholderText,
                      ]}
                    >
                      {gender ||
                        'Select Gender'}
                    </Text>

                    <MaterialIcons
                      name={
                        genderOpen
                          ? 'keyboard-arrow-up'
                          : 'keyboard-arrow-down'
                      }
                      size={
                        20
                      }
                      color="#555555"
                    />
                  </TouchableOpacity>

                  {/* ==============================================
                      GENDER DROPDOWN
                  ============================================== */}

                  {genderOpen ? (
                    <View
                      style={
                        styles.genderDropdown
                      }
                    >
                      {genderOptions.map(
                        (
                          option,
                          index
                        ) => (
                          <TouchableOpacity
                            key={
                              option
                            }
                            style={[
                              styles.genderOption,

                              index !==
                                genderOptions.length -
                                  1 &&
                                styles.genderOptionBorder,
                            ]}
                            activeOpacity={
                              0.75
                            }
                            onPress={() => {
                              setGender(
                                option
                              );

                              setGenderOpen(
                                false
                              );

                              clearError();
                            }}
                          >
                            <Text
                              style={
                                styles.genderOptionText
                              }
                            >
                              {
                                option
                              }
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  ) : null}

                  {/* ==============================================
                      PHONE (OPTIONAL)
                  ============================================== */}

                  <Text
                    style={[
                      styles.label,
                      styles.phoneLabel,
                    ]}
                  >
                    Phone Number (Optional)
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="0917 123 4567"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
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
                  />

                  <Text
                    style={
                      styles.fieldHint
                    }
                  >
                    Only Hemo-Hero staff can see it. Other users never do.
                  </Text>

                  {/* ==============================================
                      NEXT BUTTON
                  ============================================== */}

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
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </ScrollView>
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
                <MaterialIcons
                  name="close"
                  size={
                    20
                  }
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
                <MaterialIcons
                  name="keyboard-double-arrow-left"
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
                <MaterialIcons
                  name="keyboard-double-arrow-right"
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
                <MaterialIcons
                  name="chevron-left"
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
                <MaterialIcons
                  name="chevron-right"
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
              <MaterialIcons
                name={
                  actionPopup.variant ===
                    'warning'
                    ? 'warning-amber'
                    : actionPopup.variant ===
                        'error'
                      ? 'error-outline'
                      : 'info-outline'
                }
                size={
                  31
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
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
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

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.red,
    },

    scroll: {
      flexGrow:
        1,

      backgroundColor:
        COLORS.backgroundBottom,
    },

    // ==========================================================
    // HEADER
    // ==========================================================

    header: {
      height:
        205,

      paddingHorizontal:
        27,

      paddingTop:
        52,

      overflow:
        'hidden',
    },

    headerDecoration: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -82,

      top:
        -70,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backCircle: {
      width:
        37,

      height:
        37,

      borderRadius:
        19,

      borderWidth:
        2,

      borderColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        12,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,
    },

    // ==========================================================
    // BODY
    // ==========================================================

    // flexGrow (not flex: 1): fills the screen when the form is
    // short but grows with it, so the page stays scrollable when
    // the keyboard is open.
    bodyBackground: {
      flexGrow:
        1,

      minHeight:
        669,

      paddingHorizontal:
        20,

      paddingBottom:
        30,
    },

    // ==========================================================
    // CARD
    // ==========================================================

    card: {
      marginTop:
        -72,

      minHeight:
        640,

      paddingHorizontal:
        20,

      paddingTop:
        16,

      paddingBottom:
        24,

      backgroundColor:
        '#FAFAFA',

      borderRadius:
        27,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.15,

      shadowRadius:
        5,

      elevation:
        5,
    },

    // ==========================================================
    // PROGRESS
    // ==========================================================

    progressRow: {
      width:
        155,

      flexDirection:
        'row',

      alignSelf:
        'center',

      gap:
        8,

      marginBottom:
        16,
    },

    progressLine: {
      flex:
        1,

      height:
        4,

      borderRadius:
        3,

      backgroundColor:
        COLORS.progressInactive,
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        14.5,

      marginBottom:
        12,
    },

    // ==========================================================
    // PROFILE PHOTO
    // ==========================================================

    photoArea: {
      alignItems:
        'center',

      marginBottom:
        8,
    },

    photoWrapper: {
      width:
        88,

      height:
        88,

      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        8,

      overflow:
        'visible',
    },

    photoCircle: {
      width:
        80,

      height:
        80,

      borderRadius:
        40,

      backgroundColor:
        COLORS.photoBackground,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      borderWidth:
        2,

      borderColor:
        COLORS.white,
    },

    profileImage: {
      width:
        '100%',

      height:
        '100%',
    },

    addPhotoBadge: {
      position:
        'absolute',

      right:
        0,

      bottom:
        3,

      width:
        22,

      height:
        22,

      borderRadius:
        11,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        2.5,

      borderColor:
        '#FAFAFA',

      zIndex:
        10,

      elevation:
        5,
    },

    photoTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13.5,
    },

    photoSubtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      marginTop:
        2,
    },

    removePhotoButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      alignSelf:
        'center',

      gap:
        3,

      marginTop:
        2,

      marginBottom:
        8,
    },

    removePhotoText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,
    },

    // ==========================================================
    // ERROR
    // ==========================================================

    errorBox: {
      marginBottom:
        11,

      paddingHorizontal:
        10,

      paddingVertical:
        8,

      borderRadius:
        7,

      borderWidth:
        1,

      borderColor:
        '#E9AAAA',

      backgroundColor:
        '#FDECEC',
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,

      textAlign:
        'center',
    },

    // ==========================================================
    // FORM
    // ==========================================================

    label: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      marginBottom:
        6,
    },

    // The gender field above has no bottom margin.
    phoneLabel: {
      marginTop:
        12,
    },

    fieldHint: {
      marginTop:
        -6,

      marginBottom:
        14,

      color:
        COLORS.placeholder,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,

      lineHeight:
        16,
    },

    input: {
      height:
        44,

      marginBottom:
        12,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        8,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      outlineStyle:
        Platform.OS ===
        'web'
          ? 'none'
          : undefined,
    } as any,

    // ==========================================================
    // DATE FIELD
    // ==========================================================

    dateSelector: {
      height:
        44,

      marginBottom:
        12,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        8,

      backgroundColor:
        COLORS.white,
    },

    dateLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    dateText: {
      marginLeft:
        8,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,
    },

    placeholderText: {
      color:
        COLORS.placeholder,
    },

    // ==========================================================
    // GENDER
    // ==========================================================

    genderSelector: {
      height:
        44,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        8,

      backgroundColor:
        COLORS.white,
    },

    genderText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,
    },

    genderDropdown: {
      marginTop:
        5,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        8,

      backgroundColor:
        COLORS.white,

      overflow:
        'hidden',
    },

    genderOption: {
      height:
        40,

      paddingHorizontal:
        14,

      justifyContent:
        'center',
    },

    genderOptionBorder: {
      borderBottomWidth:
        1,

      borderBottomColor:
        '#EEEEEE',
    },

    genderOptionText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,
    },

    // ==========================================================
    // NEXT BUTTON
    // ==========================================================

    nextButton: {
      height:
        49,

      marginTop:
        24,

      borderRadius:
        8,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    nextButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
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

      paddingHorizontal:
        19,

      paddingTop:
        20,

      paddingBottom:
        18,

      borderRadius:
        20,

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

      marginBottom:
        15,
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
      width:
        32,

      height:
        32,

      borderRadius:
        16,

      backgroundColor:
        '#F2F2F2',

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

      marginBottom:
        7,
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
      height:
        42,

      marginTop:
        13,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F0F0F0',
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

      fontSize:
        17,

      lineHeight:
        22,

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

    actionPopupButton: {
      height:
        45,

      marginTop:
        19,

      borderRadius:
        10,

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