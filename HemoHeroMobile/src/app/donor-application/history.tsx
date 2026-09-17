import {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
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
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import {
  getNearbyFacilities,
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

  backgroundTop: '#F1B2B4',
  backgroundBottom: '#D90B12',

  muted: '#666666',
  lightMuted: '#999999',

  border: '#DDD6D6',

  pink: '#FFF1F1',

  green: '#198754',

  hospitalBackground: '#FFF0F0',
  bloodBankBackground: '#FFF1F1',
  redCrossBackground: '#FDECEC',
  medicalBackground: '#F3F3F3',
};

// ============================================================
// TYPES
// ============================================================

type NearbyFacility = {
  id: string;

  name: string;

  type?:
    | 'hospital'
    | 'blood_bank'
    | 'red_cross'
    | 'medical_facility'
    | string
    | null;

  category_label?:
    | string
    | null;

  address?:
    | string
    | null;

  latitude: number;

  longitude: number;

  distance_km: number;

  is_verified?:
    boolean;
};

type FacilityMode =
  | 'none'
  | 'nearby'
  | 'manual';

// ============================================================
// MONTHS
// ============================================================

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

const WEEK_DAYS = [
  'S',
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
];

// ============================================================
// SCREEN
// ============================================================

export default function DonorHistoryScreen() {
  const params =
    useLocalSearchParams<{
      blood_type?: string;
    }>();

  // ==========================================================
  // DONATION HISTORY
  // ==========================================================

  const [
    donatedBefore,
    setDonatedBefore,
  ] =
    useState<
      '' | 'yes' | 'no'
    >('');

  // ==========================================================
  // DONATION DATE
  // ==========================================================

  const [
    donationDate,
    setDonationDate,
  ] =
    useState<Date | null>(
      null
    );

  const [
    calendarVisible,
    setCalendarVisible,
  ] = useState(false);

  const today =
    new Date();

  const [
    visibleYear,
    setVisibleYear,
  ] = useState(
    today.getFullYear()
  );

  const [
    visibleMonth,
    setVisibleMonth,
  ] = useState(
    today.getMonth()
  );

  // ==========================================================
  // FACILITY
  // ==========================================================

  const [
    facilityModalVisible,
    setFacilityModalVisible,
  ] = useState(false);

  const [
    facilityMode,
    setFacilityMode,
  ] =
    useState<FacilityMode>(
      'none'
    );

  const [
    selectedFacility,
    setSelectedFacility,
  ] =
    useState<NearbyFacility | null>(
      null
    );

  const [
    manualFacility,
    setManualFacility,
  ] = useState('');

  const [
    nearbyFacilities,
    setNearbyFacilities,
  ] =
    useState<NearbyFacility[]>(
      []
    );

  const [
    loadingFacilities,
    setLoadingFacilities,
  ] = useState(false);

  const [
    facilityError,
    setFacilityError,
  ] = useState('');

  // ==========================================================
  // FORM ERROR
  // ==========================================================

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // DISPLAY FACILITY
  // ==========================================================

  const donationFacility =
    facilityMode ===
      'nearby'
      ? selectedFacility?.name ||
        ''
      : facilityMode ===
          'manual'
        ? manualFacility.trim()
        : '';

  // ==========================================================
  // FACILITY ICON
  // ==========================================================

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

  // ==========================================================
  // FACILITY LABEL
  // ==========================================================

  function getFacilityLabel(
    facility: NearbyFacility
  ) {
    if (
      facility.category_label
    ) {
      return facility.category_label;
    }

    switch (
      facility.type
    ) {
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

  // ==========================================================
  // FACILITY ICON BACKGROUND
  // ==========================================================

  function getFacilityIconBackground(
    type?: string | null
  ) {
    switch (type) {
      case 'red_cross':
        return COLORS.redCrossBackground;

      case 'blood_bank':
        return COLORS.bloodBankBackground;

      case 'hospital':
        return COLORS.hospitalBackground;

      default:
        return COLORS.medicalBackground;
    }
  }

  // ==========================================================
  // DISPLAY DATE
  // ==========================================================

  function formatDisplayDate(
    date: Date | null
  ) {
    if (!date) {
      return '';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  }

  // ==========================================================
  // API DATE
  // ==========================================================

  function formatApiDate(
    date: Date | null
  ) {
    if (!date) {
      return '';
    }

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

  // ==========================================================
  // OPEN CALENDAR
  // ==========================================================

  function openCalendar() {
    const startingDate =
      donationDate ||
      today;

    setVisibleYear(
      startingDate.getFullYear()
    );

    setVisibleMonth(
      startingDate.getMonth()
    );

    setCalendarVisible(
      true
    );
  }

  // ==========================================================
  // PREVIOUS MONTH
  // ==========================================================

  function handlePreviousMonth() {
    if (
      visibleMonth === 0
    ) {
      setVisibleMonth(
        11
      );

      setVisibleYear(
        current =>
          current - 1
      );

      return;
    }

    setVisibleMonth(
      current =>
        current - 1
    );
  }

  // ==========================================================
  // NEXT MONTH
  // ==========================================================

  function handleNextMonth() {
    const displayedMonth =
      new Date(
        visibleYear,
        visibleMonth,
        1
      );

    const currentMonth =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    if (
      displayedMonth >=
      currentMonth
    ) {
      return;
    }

    if (
      visibleMonth === 11
    ) {
      setVisibleMonth(
        0
      );

      setVisibleYear(
        current =>
          current + 1
      );

      return;
    }

    setVisibleMonth(
      current =>
        current + 1
    );
  }

  // ==========================================================
  // NEXT MONTH AVAILABLE
  // ==========================================================

  const canGoNextMonth =
    useMemo(
      () => {
        const displayed =
          new Date(
            visibleYear,
            visibleMonth,
            1
          );

        const current =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

        return displayed <
          current;
      },
      [
        visibleMonth,
        visibleYear,
      ]
    );

  // ==========================================================
  // CALENDAR DAYS
  // ==========================================================

  const calendarDays =
    useMemo(
      () => {
        const firstDay =
          new Date(
            visibleYear,
            visibleMonth,
            1
          ).getDay();

        const daysInMonth =
          new Date(
            visibleYear,
            visibleMonth + 1,
            0
          ).getDate();

        const cells:
          Array<number | null> =
          [];

        for (
          let index = 0;
          index < firstDay;
          index += 1
        ) {
          cells.push(
            null
          );
        }

        for (
          let day = 1;
          day <= daysInMonth;
          day += 1
        ) {
          cells.push(
            day
          );
        }

        while (
          cells.length % 7 !==
          0
        ) {
          cells.push(
            null
          );
        }

        return cells;
      },
      [
        visibleYear,
        visibleMonth,
      ]
    );

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  function isFutureDay(
    day: number
  ) {
    const date =
      new Date(
        visibleYear,
        visibleMonth,
        day
      );

    const todayOnly =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

    return date >
      todayOnly;
  }

  function isSelectedDay(
    day: number
  ) {
    if (!donationDate) {
      return false;
    }

    return (
      donationDate.getFullYear() ===
        visibleYear &&
      donationDate.getMonth() ===
        visibleMonth &&
      donationDate.getDate() ===
        day
    );
  }

  function isToday(
    day: number
  ) {
    return (
      today.getFullYear() ===
        visibleYear &&
      today.getMonth() ===
        visibleMonth &&
      today.getDate() ===
        day
    );
  }

  function handleSelectDate(
    day: number
  ) {
    if (
      isFutureDay(
        day
      )
    ) {
      return;
    }

    const selected =
      new Date(
        visibleYear,
        visibleMonth,
        day
      );

    setDonationDate(
      selected
    );

    setCalendarVisible(
      false
    );

    setErrorMessage(
      ''
    );
  }

  // ==========================================================
  // FACILITY MODAL
  // ==========================================================

  function openFacilityModal() {
    setFacilityError(
      ''
    );

    setFacilityModalVisible(
      true
    );
  }

  // ==========================================================
  // LOAD NEARBY FACILITIES
  // ==========================================================

  async function loadNearbyFacilities() {
    try {
      setLoadingFacilities(
        true
      );

      setFacilityError(
        ''
      );

      setFacilityMode(
        'nearby'
      );

      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          '/'
        );

        return;
      }

      let permission =
        await Location
          .getForegroundPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        permission =
          await Location
            .requestForegroundPermissionsAsync();
      }

      if (
        permission.status !==
        'granted'
      ) {
        setFacilityError(
          'Location permission is required to find nearby facilities.'
        );

        setNearbyFacilities(
          []
        );

        return;
      }

      const location =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location.Accuracy
                .Balanced,
          });

      const latitude =
        location.coords
          .latitude;

      const longitude =
        location.coords
          .longitude;

      const data =
        await getNearbyFacilities(
          token,
          latitude,
          longitude
        );

      const facilities =
        Array.isArray(
          data?.facilities
        )
          ? data.facilities
          : [];

      setNearbyFacilities(
        facilities
      );

      if (
        facilities.length ===
        0
      ) {
        setFacilityError(
          'No nearby facilities were found. You can enter the facility manually instead.'
        );
      }
    } catch (error) {
      console.log(
        'LOAD DONATION FACILITIES ERROR:',
        error
      );

      setNearbyFacilities(
        []
      );

      setFacilityError(
        error instanceof Error
          ? error.message
          : 'Unable to load nearby facilities.'
      );
    } finally {
      setLoadingFacilities(
        false
      );
    }
  }

  // ==========================================================
  // SELECT FACILITY
  // ==========================================================

  function handleSelectFacility(
    facility: NearbyFacility
  ) {
    setSelectedFacility(
      facility
    );

    setFacilityMode(
      'nearby'
    );

    setManualFacility(
      ''
    );

    setFacilityModalVisible(
      false
    );

    setErrorMessage(
      ''
    );
  }

  // ==========================================================
  // MANUAL FACILITY
  // ==========================================================

  function handleManualMode() {
    setFacilityMode(
      'manual'
    );

    setSelectedFacility(
      null
    );

    setFacilityError(
      ''
    );
  }

  // ==========================================================
  // CLEAR FACILITY
  // ==========================================================

  function clearFacility() {
    setFacilityMode(
      'none'
    );

    setSelectedFacility(
      null
    );

    setManualFacility(
      ''
    );

    setNearbyFacilities(
      []
    );

    setFacilityError(
      ''
    );
  }

  // ==========================================================
  // CONTINUE
  // ==========================================================

  function handleContinue() {
    if (!donatedBefore) {
      setErrorMessage(
        'Select whether you have donated blood before.'
      );

      return;
    }

    router.push({
      pathname:
        '/donor-application/availability',

      params: {
        blood_type:
          params.blood_type ||
          '',

        has_donated_before:
          donatedBefore ===
          'yes'
            ? 'true'
            : 'false',

        last_donation_date:
          donatedBefore ===
          'yes'
            ? formatApiDate(
                donationDate
              )
            : '',

        last_donation_facility:
          donatedBefore ===
          'yes'
            ? donationFacility
            : '',
      },
    } as any);
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
            'bottom',
          ]}
        >
          <StatusBar
            style="light"
          />

          <LinearGradient
            colors={[
              COLORS.red,
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
                size={22}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>

            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                Apply as a Donor
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Step 2 of 4
              </Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[
              COLORS.backgroundTop,
              COLORS.backgroundBottom,
            ]}
            style={
              styles.body
            }
          >
            <View
              style={
                styles.card
              }
            >
              <ScrollView
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
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

                <Text
                  style={
                    styles.title
                  }
                >
                  Donation History
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Tell us about your previous blood donation experience.
                </Text>

                <Text
                  style={
                    styles.label
                  }
                >
                  Have you donated blood before?
                </Text>

                <View
                  style={
                    styles.optionRow
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.optionButton,

                      donatedBefore ===
                        'yes' &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      setDonatedBefore(
                        'yes'
                      );

                      setErrorMessage(
                        ''
                      );
                    }}
                  >
                    <MaterialIcons
                      name={
                        donatedBefore ===
                        'yes'
                          ? 'radio-button-checked'
                          : 'radio-button-unchecked'
                      }
                      size={19}
                      color={
                        donatedBefore ===
                        'yes'
                          ? COLORS.redButton
                          : COLORS.muted
                      }
                    />

                    <Text
                      style={
                        styles.optionText
                      }
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionButton,

                      donatedBefore ===
                        'no' &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      setDonatedBefore(
                        'no'
                      );

                      setDonationDate(
                        null
                      );

                      clearFacility();

                      setErrorMessage(
                        ''
                      );
                    }}
                  >
                    <MaterialIcons
                      name={
                        donatedBefore ===
                        'no'
                          ? 'radio-button-checked'
                          : 'radio-button-unchecked'
                      }
                      size={19}
                      color={
                        donatedBefore ===
                        'no'
                          ? COLORS.redButton
                          : COLORS.muted
                      }
                    />

                    <Text
                      style={
                        styles.optionText
                      }
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>

                {donatedBefore ===
                'yes' ? (
                  <>
                    <Text
                      style={
                        styles.label
                      }
                    >
                      Last Donation Date
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.pressableField,

                        donationDate &&
                          styles.pressableFieldSelected,
                      ]}
                      activeOpacity={
                        0.8
                      }
                      onPress={
                        openCalendar
                      }
                    >
                      <View
                        style={
                          styles.fieldIcon
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
                          styles.fieldContent
                        }
                      >
                        <Text
                          style={
                            donationDate
                              ? styles.fieldValue
                              : styles.fieldPlaceholder
                          }
                        >
                          {donationDate
                            ? formatDisplayDate(
                                donationDate
                              )
                            : 'Select date'}
                        </Text>

                        <Text
                          style={
                            styles.fieldHint
                          }
                        >
                          Tap to choose from calendar
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={21}
                        color={
                          COLORS.lightMuted
                        }
                      />
                    </TouchableOpacity>

                    {donationDate ? (
                      <TouchableOpacity
                        style={
                          styles.clearFieldButton
                        }
                        onPress={() =>
                          setDonationDate(
                            null
                          )
                        }
                      >
                        <Text
                          style={
                            styles.clearFieldText
                          }
                        >
                          Clear date
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text
                        style={
                          styles.optional
                        }
                      >
                        Optional if you do not remember the exact date.
                      </Text>
                    )}

                    <Text
                      style={
                        styles.label
                      }
                    >
                      Last Donation Facility
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.pressableField,

                        donationFacility &&
                          styles.pressableFieldSelected,
                      ]}
                      activeOpacity={
                        0.8
                      }
                      onPress={
                        openFacilityModal
                      }
                    >
                      <View
                        style={
                          styles.fieldIcon
                        }
                      >
                        <MaterialIcons
                          name={
                            selectedFacility
                              ? getFacilityIcon(
                                  selectedFacility.type
                                ) as any
                              : 'local-hospital'
                          }
                          size={20}
                          color={
                            COLORS.redButton
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.fieldContent
                        }
                      >
                        <Text
                          numberOfLines={
                            1
                          }
                          style={
                            donationFacility
                              ? styles.fieldValue
                              : styles.fieldPlaceholder
                          }
                        >
                          {donationFacility ||
                            'Select or enter facility'}
                        </Text>

                        <Text
                          style={
                            styles.fieldHint
                          }
                        >
                          Choose nearby or enter manually
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={21}
                        color={
                          COLORS.lightMuted
                        }
                      />
                    </TouchableOpacity>

                    {donationFacility ? (
                      <TouchableOpacity
                        style={
                          styles.clearFieldButton
                        }
                        onPress={
                          clearFacility
                        }
                      >
                        <Text
                          style={
                            styles.clearFieldText
                          }
                        >
                          Clear facility
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text
                        style={
                          styles.optional
                        }
                      >
                        Optional
                      </Text>
                    )}
                  </>
                ) : null}

                <View
                  style={
                    styles.infoCard
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
                    Donation history helps with coordination, but medical staff
                    will determine your actual eligibility to donate.
                  </Text>
                </View>

                {errorMessage ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                <View
                  style={
                    styles.spacer
                  }
                />

                <View
                  style={
                    styles.buttonRow
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.backBottom
                    }
                    onPress={() =>
                      router.back()
                    }
                  >
                    <Text
                      style={
                        styles.backBottomText
                      }
                    >
                      Back
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={
                      styles.continueButton
                    }
                    onPress={
                      handleContinue
                    }
                  >
                    <Text
                      style={
                        styles.continueText
                      }
                    >
                      Continue
                    </Text>

                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color={
                        COLORS.white
                      }
                    />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </LinearGradient>

          {/* ==================================================
              CALENDAR MODAL
          ================================================== */}

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
                styles.modalBackdrop
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
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Last Donation Date
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Select the date you last donated blood.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.modalCloseButton
                    }
                    onPress={() =>
                      setCalendarVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.monthNavigation
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.monthButton
                    }
                    onPress={
                      handlePreviousMonth
                    }
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={24}
                      color={
                        COLORS.redButton
                      }
                    />
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.monthText
                    }
                  >
                    {
                      MONTH_NAMES[
                        visibleMonth
                      ]
                    }{' '}
                    {visibleYear}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.monthButton,

                      !canGoNextMonth &&
                        styles.monthButtonDisabled,
                    ]}
                    disabled={
                      !canGoNextMonth
                    }
                    onPress={
                      handleNextMonth
                    }
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={
                        canGoNextMonth
                          ? COLORS.redButton
                          : '#CFCFCF'
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.weekRow
                  }
                >
                  {WEEK_DAYS.map(
                    (
                      weekDay,
                      index
                    ) => (
                      <View
                        key={`${weekDay}-${index}`}
                        style={
                          styles.weekCell
                        }
                      >
                        <Text
                          style={
                            styles.weekText
                          }
                        >
                          {weekDay}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                <View
                  style={
                    styles.daysGrid
                  }
                >
                  {calendarDays.map(
                    (
                      day,
                      index
                    ) => {
                      if (
                        day ===
                        null
                      ) {
                        return (
                          <View
                            key={`blank-${index}`}
                            style={
                              styles.dayCell
                            }
                          />
                        );
                      }

                      const future =
                        isFutureDay(
                          day
                        );

                      const selected =
                        isSelectedDay(
                          day
                        );

                      const currentDay =
                        isToday(
                          day
                        );

                      return (
                        <View
                          key={`${visibleYear}-${visibleMonth}-${day}`}
                          style={
                            styles.dayCell
                          }
                        >
                          <TouchableOpacity
                            style={[
                              styles.dayButton,

                              currentDay &&
                                styles.todayButton,

                              selected &&
                                styles.selectedDayButton,
                            ]}
                            disabled={
                              future
                            }
                            onPress={() =>
                              handleSelectDate(
                                day
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.dayText,

                                currentDay &&
                                  styles.todayText,

                                selected &&
                                  styles.selectedDayText,

                                future &&
                                  styles.futureDayText,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }
                  )}
                </View>

                <View
                  style={
                    styles.calendarFooter
                  }
                >
                  <MaterialIcons
                    name="info-outline"
                    size={17}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.calendarFooterText
                    }
                  >
                    Future dates cannot be selected.
                  </Text>
                </View>
              </View>
            </View>
          </Modal>

          {/* ==================================================
              FACILITY MODAL
          ================================================== */}

          <Modal
            visible={
              facilityModalVisible
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setFacilityModalVisible(
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
                  styles.facilityModal
                }
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={
                      styles.facilityHeaderText
                    }
                  >
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Donation Facility
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Choose the hospital, blood center, or Red Cross location
                      where you last donated.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.modalCloseButton
                    }
                    onPress={() =>
                      setFacilityModalVisible(
                        false
                      )
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.facilityModeRow
                  }
                >
                  <TouchableOpacity
                    style={[
                      styles.facilityModeButton,

                      facilityMode ===
                        'nearby' &&
                        styles.facilityModeButtonSelected,
                    ]}
                    onPress={
                      loadNearbyFacilities
                    }
                  >
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color={
                        facilityMode ===
                        'nearby'
                          ? COLORS.white
                          : COLORS.redButton
                      }
                    />

                    <Text
                      style={[
                        styles.facilityModeText,

                        facilityMode ===
                          'nearby' &&
                          styles.facilityModeTextSelected,
                      ]}
                    >
                      Nearby
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.facilityModeButton,

                      facilityMode ===
                        'manual' &&
                        styles.facilityModeButtonSelected,
                    ]}
                    onPress={
                      handleManualMode
                    }
                  >
                    <MaterialIcons
                      name="edit"
                      size={18}
                      color={
                        facilityMode ===
                        'manual'
                          ? COLORS.white
                          : COLORS.redButton
                      }
                    />

                    <Text
                      style={[
                        styles.facilityModeText,

                        facilityMode ===
                          'manual' &&
                          styles.facilityModeTextSelected,
                      ]}
                    >
                      Manual
                    </Text>
                  </TouchableOpacity>
                </View>

                {facilityMode ===
                'none' ? (
                  <View
                    style={
                      styles.facilityInitial
                    }
                  >
                    <View
                      style={
                        styles.facilityInitialIcon
                      }
                    >
                      <MaterialIcons
                        name="medical-services"
                        size={31}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.facilityInitialTitle
                      }
                    >
                      Select a Donation Facility
                    </Text>

                    <Text
                      style={
                        styles.facilityInitialText
                      }
                    >
                      Choose a hospital, blood center, or Philippine Red Cross
                      location nearby.
                    </Text>
                  </View>
                ) : null}

                {facilityMode ===
                'nearby' ? (
                  <View
                    style={
                      styles.facilityResults
                    }
                  >
                    {loadingFacilities ? (
                      <View
                        style={
                          styles.facilityLoading
                        }
                      >
                        <ActivityIndicator
                          size="small"
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.facilityLoadingText
                          }
                        >
                          Finding nearby facilities...
                        </Text>
                      </View>
                    ) : nearbyFacilities.length >
                      0 ? (
                      <ScrollView
                        style={
                          styles.facilityList
                        }
                        showsVerticalScrollIndicator={
                          false
                        }
                      >
                        {nearbyFacilities.map(
                          facility => (
                            <TouchableOpacity
                              key={
                                facility.id
                              }
                              style={
                                styles.facilityItem
                              }
                              onPress={() =>
                                handleSelectFacility(
                                  facility
                                )
                              }
                            >
                              {/* DIFFERENT ICON PER TYPE */}

                              <View
                                style={[
                                  styles.facilityItemIcon,

                                  {
                                    backgroundColor:
                                      getFacilityIconBackground(
                                        facility.type
                                      ),
                                  },
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
                                    COLORS.redButton
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.facilityItemContent
                                }
                              >
                                {/* TYPE */}

                                <Text
                                  style={[
                                    styles.facilityTypeLabel,

                                    facility.type ===
                                      'red_cross' &&
                                      styles.redCrossLabel,
                                  ]}
                                >
                                  {getFacilityLabel(
                                    facility
                                  )}
                                </Text>

                                {/* NAME */}

                                <Text
                                  numberOfLines={
                                    2
                                  }
                                  style={
                                    styles.facilityItemName
                                  }
                                >
                                  {
                                    facility.name
                                  }
                                </Text>

                                {/* ADDRESS */}

                                {facility.address ? (
                                  <View
                                    style={
                                      styles.facilityAddressRow
                                    }
                                  >
                                    <MaterialIcons
                                      name="location-on"
                                      size={12}
                                      color={
                                        COLORS.lightMuted
                                      }
                                    />

                                    <Text
                                      numberOfLines={
                                        2
                                      }
                                      style={
                                        styles.facilityItemAddress
                                      }
                                    >
                                      {
                                        facility.address
                                      }
                                    </Text>
                                  </View>
                                ) : null}

                                {/* DISTANCE */}

                                <Text
                                  style={
                                    styles.facilityItemDistance
                                  }
                                >
                                  {Number(
                                    facility.distance_km
                                  ).toFixed(
                                    1
                                  )}{' '}
                                  km away
                                </Text>
                              </View>

                              {facility.is_verified ? (
                                <MaterialIcons
                                  name="verified"
                                  size={17}
                                  color={
                                    COLORS.green
                                  }
                                />
                              ) : (
                                <MaterialIcons
                                  name="chevron-right"
                                  size={21}
                                  color={
                                    COLORS.lightMuted
                                  }
                                />
                              )}
                            </TouchableOpacity>
                          )
                        )}
                      </ScrollView>
                    ) : (
                      <View
                        style={
                          styles.noFacilities
                        }
                      >
                        <MaterialIcons
                          name="location-off"
                          size={30}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.noFacilitiesTitle
                          }
                        >
                          No nearby facilities found
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.retryFacilityButton
                          }
                          onPress={
                            loadNearbyFacilities
                          }
                        >
                          <Text
                            style={
                              styles.retryFacilityText
                            }
                          >
                            Search Again
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {facilityError ? (
                      <View
                        style={
                          styles.facilityErrorCard
                        }
                      >
                        <Text
                          style={
                            styles.facilityErrorText
                          }
                        >
                          {facilityError}
                        </Text>

                        <TouchableOpacity
                          onPress={
                            handleManualMode
                          }
                        >
                          <Text
                            style={
                              styles.manualInsteadText
                            }
                          >
                            Enter manually instead
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {facilityMode ===
                'manual' ? (
                  <View
                    style={
                      styles.manualSection
                    }
                  >
                    <Text
                      style={
                        styles.manualLabel
                      }
                    >
                      Facility Name
                    </Text>

                    <View
                      style={
                        styles.manualInputContainer
                      }
                    >
                      <MaterialIcons
                        name="medical-services"
                        size={19}
                        color={
                          COLORS.lightMuted
                        }
                      />

                      <TextInput
                        style={
                          styles.manualInput
                        }
                        value={
                          manualFacility
                        }
                        onChangeText={
                          setManualFacility
                        }
                        placeholder="Hospital, blood center, or Red Cross"
                        placeholderTextColor={
                          COLORS.lightMuted
                        }
                        autoCapitalize="words"
                      />
                    </View>

                    <Text
                      style={
                        styles.manualHint
                      }
                    >
                      Enter the facility where you previously donated blood.
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.manualDoneButton,

                        !manualFacility.trim() &&
                          styles.manualDoneButtonDisabled,
                      ]}
                      disabled={
                        !manualFacility.trim()
                      }
                      onPress={() => {
                        setSelectedFacility(
                          null
                        );

                        setFacilityModalVisible(
                          false
                        );

                        setErrorMessage(
                          ''
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.manualDoneText
                        }
                      >
                        Use This Facility
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          </Modal>
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
          ? '#222222'
          : COLORS.backgroundBottom,
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
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    header: {
      height: 126,

      paddingHorizontal: 22,
      paddingTop: 18,

      flexDirection: 'row',

      alignItems: 'flex-start',
    },

    backButton: {
      width: 40,
      height: 40,

      marginRight: 13,

      borderRadius: 20,

      borderWidth: 2,

      borderColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 19,
    },

    headerSubtitle: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.75)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
    },

    body: {
      flex: 1,

      paddingHorizontal: 18,
      paddingBottom: 16,
    },

    card: {
      flex: 1,

      marginTop: -18,

      borderRadius: 27,

      overflow: 'hidden',

      backgroundColor:
        '#FAFAFA',
    },

    scrollContent: {
      flexGrow: 1,

      padding: 20,
    },

    progressRow: {
      flexDirection: 'row',

      gap: 7,

      marginBottom: 23,
    },

    progressLine: {
      flex: 1,

      height: 4,

      borderRadius: 2,

      backgroundColor:
        '#D8D8D8',
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    description: {
      marginTop: 3,
      marginBottom: 22,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 15,
    },

    label: {
      marginBottom: 8,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    optionRow: {
      flexDirection: 'row',

      gap: 10,

      marginBottom: 22,
    },

    optionButton: {
      flex: 1,

      height: 48,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    optionButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.pink,
    },

    optionText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10,
    },

    pressableField: {
      minHeight: 60,

      paddingHorizontal: 11,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    pressableFieldSelected: {
      borderColor:
        '#DDA6A6',

      backgroundColor:
        '#FFFDFD',
    },

    fieldIcon: {
      width: 38,
      height: 38,

      marginRight: 10,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pink,
    },

    fieldContent: {
      flex: 1,
    },

    fieldPlaceholder: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10,
    },

    fieldValue: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    fieldHint: {
      marginTop: 2,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    clearFieldButton: {
      alignSelf:
        'flex-end',

      marginTop: 5,
      marginBottom: 15,

      paddingVertical: 3,
    },

    clearFieldText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8.5,
    },

    optional: {
      marginTop: 4,
      marginBottom: 16,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    infoCard: {
      marginTop: 4,

      padding: 13,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 8,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        '#EFC1C1',

      backgroundColor:
        COLORS.pink,
    },

    infoText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,
    },

    errorText: {
      marginTop: 12,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,

      textAlign: 'center',
    },

    spacer: {
      flex: 1,

      minHeight: 35,
    },

    buttonRow: {
      flexDirection: 'row',

      gap: 11,
    },

    backBottom: {
      flex: 0.8,

      height: 49,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,

      backgroundColor:
        '#E1E1E1',
    },

    backBottomText: {
      color:
        '#444444',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10.5,
    },

    continueButton: {
      flex: 1.2,

      height: 49,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    continueText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10.5,
    },

    modalBackdrop: {
      flex: 1,

      paddingHorizontal: 20,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    modalHeader: {
      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent:
        'space-between',

      marginBottom: 18,
    },

    modalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },

    modalSubtitle: {
      marginTop: 2,

      maxWidth: 280,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,

      lineHeight: 13,
    },

    modalCloseButton: {
      width: 33,
      height: 33,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#F4F4F4',
    },

    calendarModal: {
      width: '100%',
      maxWidth: 360,

      paddingHorizontal: 17,
      paddingTop: 18,
      paddingBottom: 17,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,
    },

    monthNavigation: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginBottom: 12,
    },

    monthButton: {
      width: 37,
      height: 37,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pink,
    },

    monthButtonDisabled: {
      backgroundColor:
        '#F6F6F6',
    },

    monthText: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    weekRow: {
      flexDirection: 'row',

      marginBottom: 5,
    },

    weekCell: {
      width: '14.2857%',

      alignItems: 'center',
      justifyContent: 'center',
    },

    weekText: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    daysGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',
    },

    dayCell: {
      width: '14.2857%',

      height: 42,

      alignItems: 'center',
      justifyContent: 'center',
    },

    dayButton: {
      width: 34,
      height: 34,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',
    },

    todayButton: {
      borderWidth: 1,

      borderColor:
        COLORS.redButton,
    },

    selectedDayButton: {
      borderColor:
        COLORS.redButton,

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

    todayText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    selectedDayText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    futureDayText: {
      color:
        '#D5D5D5',
    },

    calendarFooter: {
      marginTop: 11,

      padding: 10,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,

      borderRadius: 10,

      backgroundColor:
        COLORS.pink,
    },

    calendarFooterText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    facilityModal: {
      width: '100%',
      maxWidth: 370,

      maxHeight: '78%',

      paddingHorizontal: 17,
      paddingTop: 18,
      paddingBottom: 17,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,
    },

    facilityHeaderText: {
      flex: 1,

      paddingRight: 10,
    },

    facilityModeRow: {
      flexDirection: 'row',

      gap: 9,

      marginBottom: 16,
    },

    facilityModeButton: {
      flex: 1,

      height: 43,

      borderWidth: 1,

      borderColor:
        '#E0B6B6',

      borderRadius: 11,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      backgroundColor:
        COLORS.white,
    },

    facilityModeButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    facilityModeText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    facilityModeTextSelected: {
      color:
        COLORS.white,
    },

    facilityInitial: {
      minHeight: 220,

      paddingHorizontal: 20,

      alignItems: 'center',
      justifyContent: 'center',
    },

    facilityInitialIcon: {
      width: 62,
      height: 62,

      borderRadius: 31,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.pink,

      marginBottom: 12,
    },

    facilityInitialTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11,

      textAlign: 'center',
    },

    facilityInitialText: {
      marginTop: 5,

      maxWidth: 260,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,

      textAlign: 'center',
    },

    facilityResults: {
      minHeight: 220,
    },

    facilityLoading: {
      minHeight: 180,

      alignItems: 'center',
      justifyContent: 'center',
    },

    facilityLoadingText: {
      marginTop: 9,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,
    },

    facilityList: {
      maxHeight: 330,
    },

    facilityItem: {
      minHeight: 84,

      paddingVertical: 11,

      flexDirection: 'row',

      alignItems: 'center',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        COLORS.border,
    },

    facilityItemIcon: {
      width: 44,
      height: 44,

      marginRight: 10,

      borderRadius: 13,

      alignItems: 'center',
      justifyContent: 'center',
    },

    facilityItemContent: {
      flex: 1,

      paddingRight: 8,
    },

    facilityTypeLabel: {
      marginBottom: 2,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 7.5,

      textTransform:
        'uppercase',
    },

    redCrossLabel: {
      color:
        COLORS.redDark,
    },

    facilityItemName: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.8,

      lineHeight: 13,
    },

    facilityAddressRow: {
      marginTop: 3,

      flexDirection: 'row',

      alignItems:
        'flex-start',

      gap: 2,
    },

    facilityItemAddress: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 7.8,

      lineHeight: 11,
    },

    facilityItemDistance: {
      marginTop: 3,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 7.8,
    },

    noFacilities: {
      minHeight: 190,

      alignItems: 'center',
      justifyContent: 'center',
    },

    noFacilitiesTitle: {
      marginTop: 8,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    retryFacilityButton: {
      marginTop: 12,

      paddingHorizontal: 17,
      paddingVertical: 9,

      borderRadius: 9,

      backgroundColor:
        COLORS.redButton,
    },

    retryFacilityText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9,
    },

    facilityErrorCard: {
      marginTop: 10,

      padding: 10,

      borderRadius: 10,

      backgroundColor:
        COLORS.pink,
    },

    facilityErrorText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,

      lineHeight: 12,

      textAlign: 'center',
    },

    manualInsteadText: {
      marginTop: 7,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,

      textAlign: 'center',
    },

    manualSection: {
      paddingTop: 5,

      minHeight: 220,
    },

    manualLabel: {
      marginBottom: 7,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    manualInputContainer: {
      minHeight: 50,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    manualInput: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    manualHint: {
      marginTop: 5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    manualDoneButton: {
      height: 45,

      marginTop: 20,

      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    manualDoneButtonDisabled: {
      opacity: 0.45,
    },

    manualDoneText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 9.5,
    },
  });