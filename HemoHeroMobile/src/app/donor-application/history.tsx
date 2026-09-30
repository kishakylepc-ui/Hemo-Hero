import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { getNearbyFacilities } from '../../lib/api';
import { getAccessToken } from '../../lib/session';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',
  muted: '#666666',
  lightMuted: '#9A9A9A',
  border: '#D5D5D5',
  pink: '#FFF1F1',
  green: '#198754',
  amber: '#8A5A00',
  amberBackground: '#FFF8E6',
  amberBorder: '#F0D9A0',
  hospitalBackground: '#FFF0F0',
  bloodBankBackground: '#FFF1F1',
  redCrossBackground: '#FDECEC',
  medicalBackground: '#F3F3F3',
};

type NearbyFacility = {
  id: string;
  name: string;
  type?: 'hospital' | 'blood_bank' | 'red_cross' | 'medical_facility' | string | null;
  category_label?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_verified?: boolean;
};

type FacilityMode = 'none' | 'nearby' | 'manual';
type CalendarView = 'days' | 'months' | 'years';
type SelectorKind = 'month' | 'year' | null;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MIN_DONATION_YEAR = 1950;
const COOLDOWN_DAYS = 56;
const YEAR_ROW_HEIGHT = 46;
const PROGRESS_STEPS = ['Blood', 'History', 'Availability', 'Verify'];

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, styles.labelInline]}>{text}</Text>
      {required ? (
        <Text style={styles.requiredMark}>*</Text>
      ) : (
        <Text style={styles.optionalTag}>Optional</Text>
      )}
    </View>
  );
}

function FacilityIcon({
  type,
  size,
  color,
}: {
  type?: string | null;
  size: number;
  color: string;
}) {
  switch (type) {
    case 'red_cross':
      return <MaterialCommunityIcons name="hospital-box" size={size} color={color} />;
    case 'blood_bank':
      return <MaterialCommunityIcons name="blood-bag" size={size} color={color} />;
    case 'hospital':
      return <MaterialCommunityIcons name="hospital-building" size={size} color={color} />;
    default:
      return <MaterialCommunityIcons name="medical-bag" size={size} color={color} />;
  }
}

export default function DonorHistoryScreen() {
  const params = useLocalSearchParams<{ blood_type?: string }>();

  const [donatedBefore, setDonatedBefore] = useState<'' | 'yes' | 'no'>('');
  const [donationDate, setDonationDate] = useState<Date | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const today = new Date();

  const [visibleYear, setVisibleYear] = useState(today.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(today.getMonth());
  const [dontRemember, setDontRemember] = useState(false);
  const [approxMonth, setApproxMonth] = useState<number | null>(null);
  const [approxYear, setApproxYear] = useState<number | null>(null);
  const [selectorVisible, setSelectorVisible] = useState<SelectorKind>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>('days');

  const [facilityModalVisible, setFacilityModalVisible] = useState(false);
  const [facilityMode, setFacilityMode] = useState<FacilityMode>('none');
  const [selectedFacility, setSelectedFacility] = useState<NearbyFacility | null>(null);
  const [manualFacility, setManualFacility] = useState('');
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const donationFacility =
    facilityMode === 'nearby'
      ? selectedFacility?.name || ''
      : facilityMode === 'manual'
        ? manualFacility.trim()
        : '';

  function getFacilityLabel(facility: NearbyFacility) {
    if (facility.category_label) return facility.category_label;

    switch (facility.type) {
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

  function getFacilityIconBackground(type?: string | null) {
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

  function formatDisplayDate(date: Date | null) {
    if (!date) return '';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatApiDate(date: Date | null) {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function openCalendar() {
    const startingDate = donationDate || today;
    setVisibleYear(startingDate.getFullYear());
    setVisibleMonth(startingDate.getMonth());
    setCalendarView('days');
    setCalendarVisible(true);
  }

  function handlePreviousMonth() {
    if (visibleMonth === 0) {
      setVisibleMonth(11);
      setVisibleYear((current) => current - 1);
      return;
    }

    setVisibleMonth((current) => current - 1);
  }

  function handleNextMonth() {
    const displayedMonth = new Date(visibleYear, visibleMonth, 1);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (displayedMonth >= currentMonth) return;

    if (visibleMonth === 11) {
      setVisibleMonth(0);
      setVisibleYear((current) => current + 1);
      return;
    }

    setVisibleMonth((current) => current + 1);
  }

  const canGoNextMonth = useMemo(() => {
    const displayed = new Date(visibleYear, visibleMonth, 1);
    const current = new Date(today.getFullYear(), today.getMonth(), 1);
    return displayed < current;
  }, [visibleMonth, visibleYear]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleYear, visibleMonth, 1).getDay();
    const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let index = 0; index < firstDay; index += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [visibleYear, visibleMonth]);

  function isFutureDay(day: number) {
    const date = new Date(visibleYear, visibleMonth, day);
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date > todayOnly;
  }

  function isSelectedDay(day: number) {
    if (!donationDate) return false;

    return (
      donationDate.getFullYear() === visibleYear &&
      donationDate.getMonth() === visibleMonth &&
      donationDate.getDate() === day
    );
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === visibleYear &&
      today.getMonth() === visibleMonth &&
      today.getDate() === day
    );
  }

  function handleSelectDate(day: number) {
    if (isFutureDay(day)) return;

    setDonationDate(new Date(visibleYear, visibleMonth, day));
    setCalendarVisible(false);
    setErrorMessage('');
  }

  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();

  const yearOptions = useMemo(() => {
    const years: number[] = [];

    for (let year = currentYear; year >= MIN_DONATION_YEAR; year -= 1) {
      years.push(year);
    }

    return years;
  }, [currentYear]);

  function isFutureMonth(year: number, monthIndex: number) {
    return year > currentYear || (year === currentYear && monthIndex > currentMonthIndex);
  }

  function handleSelectDonatedBefore(value: 'yes' | 'no') {
    setDonatedBefore(value);
    setErrorMessage('');

    if (value === 'no') {
      setDonationDate(null);
      setDontRemember(false);
      setApproxMonth(null);
      setApproxYear(null);
      clearFacility();
    }
  }

  function handleToggleDontRemember() {
    const next = !dontRemember;
    setDontRemember(next);
    setErrorMessage('');

    if (next) {
      setDonationDate(null);
    } else {
      setApproxMonth(null);
      setApproxYear(null);
    }
  }

  function handleSelectApproxMonth(monthIndex: number) {
    if (approxYear !== null && isFutureMonth(approxYear, monthIndex)) return;

    setApproxMonth(monthIndex);
    setSelectorVisible(null);
    setErrorMessage('');
  }

  function handleSelectApproxYear(year: number) {
    setApproxYear(year);

    if (approxMonth !== null && isFutureMonth(year, approxMonth)) {
      setApproxMonth(null);
    }

    setSelectorVisible(null);
    setErrorMessage('');
  }

  function handlePickCalendarYear(year: number) {
    setVisibleYear(year);

    if (isFutureMonth(year, visibleMonth)) {
      setVisibleMonth(currentMonthIndex);
    }

    setCalendarView('months');
  }

  function handlePickCalendarMonth(monthIndex: number) {
    if (isFutureMonth(visibleYear, monthIndex)) return;

    setVisibleMonth(monthIndex);
    setCalendarView('days');
  }

  function getDonationNotice() {
    if (donatedBefore !== 'yes') return null;

    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    if (!dontRemember && donationDate) {
      const donated = new Date(
        donationDate.getFullYear(),
        donationDate.getMonth(),
        donationDate.getDate(),
      ).getTime();

      const daysSince = Math.round((todayStart - donated) / dayMs);

      if (daysSince >= COOLDOWN_DAYS) return null;

      const when =
        daysSince <= 0 ? 'today' : daysSince === 1 ? '1 day ago' : `${daysSince} days ago`;

      return `You donated ${when}. Donors usually wait about 8 weeks (${COOLDOWN_DAYS} days) between whole blood donations. You can still apply, and medical staff will confirm your eligibility.`;
    }

    if (dontRemember && approxMonth !== null && approxYear !== null) {
      const earliest = new Date(approxYear, approxMonth, 1).getTime();
      const latest = new Date(approxYear, approxMonth + 1, 0).getTime();
      const minDaysSince = (todayStart - latest) / dayMs;
      const maxDaysSince = (todayStart - earliest) / dayMs;

      if (minDaysSince >= COOLDOWN_DAYS) return null;

      if (maxDaysSince < COOLDOWN_DAYS) {
        return `Your last donation was recent, within the usual 8-week (${COOLDOWN_DAYS}-day) waiting period between whole blood donations. You can still apply, and medical staff will confirm your eligibility.`;
      }

      return `Because you chose an approximate date, we can't tell whether 8 weeks have passed since your last donation. You can still apply, and medical staff will confirm your eligibility.`;
    }

    return null;
  }

  function renderMonthGrid(
    selectedIndex: number | null,
    isDisabled: (monthIndex: number) => boolean,
    onSelect: (monthIndex: number) => void,
  ) {
    return (
      <View style={styles.monthGrid}>
        {MONTH_NAMES.map((name, index) => {
          const disabled = isDisabled(index);
          const selected = selectedIndex === index;

          return (
            <View key={name} style={styles.monthGridCell}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.monthGridButton,
                  selected && styles.monthGridButtonSelected,
                  disabled && styles.monthGridButtonDisabled,
                ]}
                disabled={disabled}
                activeOpacity={0.8}
                onPress={() => onSelect(index)}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.monthGridText,
                    selected && styles.monthGridTextSelected,
                    disabled && styles.monthGridTextDisabled,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  }

  function renderYearList(selectedYear: number | null, onSelect: (year: number) => void) {
    const selectedIndex = selectedYear === null ? -1 : yearOptions.indexOf(selectedYear);

    return (
      <FlatList
        style={styles.yearList}
        data={yearOptions}
        keyExtractor={(year: number) => String(year)}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={selectedIndex > 2 ? selectedIndex - 2 : 0}
        getItemLayout={(_data: unknown, index: number) => ({
          length: YEAR_ROW_HEIGHT,
          offset: YEAR_ROW_HEIGHT * index,
          index,
        })}
        renderItem={({ item: year }: { item: number }) => {
          const selected = selectedYear === year;

          return (
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.yearRow, selected && styles.yearRowSelected]}
              activeOpacity={0.8}
              onPress={() => onSelect(year)}
            >
              <Text style={[styles.yearText, selected && styles.yearTextSelected]}>
                {year}
              </Text>
              {selected ? (
                <MaterialIcons name="check" size={20} color={COLORS.redButton} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  function openFacilityModal() {
    setFacilityError('');
    setFacilityModalVisible(true);
  }

  async function loadNearbyFacilities() {
    try {
      setLoadingFacilities(true);
      setFacilityError('');
      setFacilityMode('nearby');

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setFacilityError('Location permission is required to find nearby facilities.');
        setNearbyFacilities([]);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      const data = await getNearbyFacilities(token, latitude, longitude);
      const facilities = Array.isArray(data?.facilities) ? data.facilities : [];

      setNearbyFacilities(facilities);

      if (facilities.length === 0) {
        setFacilityError(
          'No nearby facilities were found. You can enter the facility manually instead.',
        );
      }
    } catch (error) {
      console.log('LOAD DONATION FACILITIES ERROR:', error);
      setNearbyFacilities([]);
      setFacilityError(
        error instanceof Error ? error.message : 'Unable to load nearby facilities.',
      );
    } finally {
      setLoadingFacilities(false);
    }
  }

  function handleSelectFacility(facility: NearbyFacility) {
    setSelectedFacility(facility);
    setFacilityMode('nearby');
    setManualFacility('');
    setFacilityModalVisible(false);
    setErrorMessage('');
  }

  function handleManualMode() {
    setFacilityMode('manual');
    setSelectedFacility(null);
    setFacilityError('');
  }

  function clearFacility() {
    setFacilityMode('none');
    setSelectedFacility(null);
    setManualFacility('');
    setNearbyFacilities([]);
    setFacilityError('');
  }

  function handleContinue() {
    if (!donatedBefore) {
      setErrorMessage('Select whether you have donated blood before.');
      return;
    }

    let lastDonationDate = '';
    let lastDonationMonth = '';
    let lastDonationYear = '';

    if (donatedBefore === 'yes') {
      if (dontRemember) {
        if (approxMonth === null || approxYear === null) {
          setErrorMessage('Choose the closest month and year you remember.');
          return;
        }

        if (isFutureMonth(approxYear, approxMonth)) {
          setErrorMessage('Your last donation cannot be in the future.');
          return;
        }

        lastDonationMonth = String(approxMonth + 1);
        lastDonationYear = String(approxYear);
      } else {
        if (!donationDate) {
          setErrorMessage(
            'Select your last donation date, or choose "I don\'t remember the exact date".',
          );
          return;
        }

        const todayOnly = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );

        if (donationDate.getTime() > todayOnly.getTime()) {
          setErrorMessage('Your last donation date cannot be in the future.');
          return;
        }

        lastDonationDate = formatApiDate(donationDate);
      }
    }

    router.push({
      pathname: '/donor-application/availability',
      params: {
        blood_type: params.blood_type || '',
        has_donated_before: donatedBefore === 'yes' ? 'true' : 'false',
        last_donation_date: lastDonationDate,
        last_donation_month: lastDonationMonth,
        last_donation_year: lastDonationYear,
        last_donation_facility: donatedBefore === 'yes' ? donationFacility : '',
      },
    } as any);
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar style="light" />

          <LinearGradient
            colors={['#D2151A', COLORS.redDark]}
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />
            <View style={styles.headerCircleRight} />

            <View style={styles.headerRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to dashboard"
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() => router.replace('/dashboard')}
              >
                <MaterialIcons name="arrow-back" size={26} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Apply as a Donor</Text>
                <Text style={styles.headerSubtitle}>Step 2 of 4</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
            style={styles.body}
          >
            <View style={styles.card}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.progressRow}>
                  {PROGRESS_STEPS.map((step, index) => (
                    <View key={step} style={styles.progressStep}>
                      <View style={[styles.progressLine, index <= 1 && styles.progressActive]} />
                      <Text
                        style={[
                          styles.progressLabel,
                          index === 1 && styles.progressLabelActive,
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.title}>Donation History</Text>
                <Text style={styles.description}>
                  Tell us about your previous blood donation experience.
                </Text>

                <FieldLabel text="Have you donated blood before?" required />

                <View style={styles.optionRow}>
                  {(['yes', 'no'] as const).map((option) => {
                    const selected = donatedBefore === option;

                    return (
                      <TouchableOpacity
                        key={option}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={[styles.optionButton, selected && styles.optionButtonSelected]}
                        activeOpacity={0.85}
                        onPress={() => handleSelectDonatedBefore(option)}
                      >
                        <MaterialIcons
                          name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={selected ? COLORS.redButton : COLORS.muted}
                        />
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option === 'yes' ? 'Yes' : 'No'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {donatedBefore === 'no' ? (
                  <View style={styles.noticeCard}>
                    <MaterialIcons name="favorite-border" size={19} color={COLORS.redButton} />
                    <Text style={styles.noticeText}>
                      No previous donation details needed. You can continue.
                    </Text>
                  </View>
                ) : null}

                {donatedBefore === 'yes' ? (
                  <>
                    <FieldLabel
                      text={dontRemember ? 'Approximate Last Donation' : 'Last Donation Date'}
                      required
                    />

                    {dontRemember ? (
                      <>
                        <View style={styles.approxRow}>
                          <View style={styles.approxColumn}>
                            <Text style={styles.approxLabel}>Month</Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={[
                                styles.selectField,
                                approxMonth !== null && styles.pressableFieldSelected,
                              ]}
                              activeOpacity={0.8}
                              onPress={() => setSelectorVisible('month')}
                            >
                              <Text
                                numberOfLines={1}
                                style={
                                  approxMonth !== null
                                    ? styles.selectValue
                                    : styles.selectPlaceholder
                                }
                              >
                                {approxMonth !== null ? MONTH_NAMES[approxMonth] : 'Select month'}
                              </Text>
                              <MaterialIcons
                                name="arrow-drop-down"
                                size={24}
                                color={COLORS.lightMuted}
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.approxColumn}>
                            <Text style={styles.approxLabel}>Year</Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={[
                                styles.selectField,
                                approxYear !== null && styles.pressableFieldSelected,
                              ]}
                              activeOpacity={0.8}
                              onPress={() => setSelectorVisible('year')}
                            >
                              <Text
                                numberOfLines={1}
                                style={
                                  approxYear !== null
                                    ? styles.selectValue
                                    : styles.selectPlaceholder
                                }
                              >
                                {approxYear !== null ? String(approxYear) : 'Select year'}
                              </Text>
                              <MaterialIcons
                                name="arrow-drop-down"
                                size={24}
                                color={COLORS.lightMuted}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={styles.helperText}>
                          Choose the closest month and year you remember. It will be saved
                          as an approximate date, not an exact day.
                        </Text>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={[
                            styles.pressableField,
                            donationDate && styles.pressableFieldSelected,
                          ]}
                          activeOpacity={0.8}
                          onPress={openCalendar}
                        >
                          <View style={styles.fieldIcon}>
                            <MaterialIcons
                              name="calendar-today"
                              size={18}
                              color={COLORS.redButton}
                            />
                          </View>

                          <View style={styles.fieldContent}>
                            <Text
                              style={donationDate ? styles.fieldValue : styles.fieldPlaceholder}
                            >
                              {donationDate ? formatDisplayDate(donationDate) : 'Select date'}
                            </Text>
                            <Text style={styles.fieldHint}>Tap to choose from calendar</Text>
                          </View>

                          <MaterialIcons
                            name="chevron-right"
                            size={21}
                            color={COLORS.lightMuted}
                          />
                        </TouchableOpacity>

                        {donationDate ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.clearFieldButton}
                            onPress={() => setDonationDate(null)}
                          >
                            <Text style={styles.clearFieldText}>Clear date</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    )}

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.checkboxRow}
                      activeOpacity={0.8}
                      onPress={handleToggleDontRemember}
                    >
                      <MaterialIcons
                        name={dontRemember ? 'check-box' : 'check-box-outline-blank'}
                        size={23}
                        color={dontRemember ? COLORS.redButton : COLORS.muted}
                      />
                      <Text style={styles.checkboxText}>
                        I don't remember the exact date
                      </Text>
                    </TouchableOpacity>

                    {getDonationNotice() ? (
                      <View style={styles.warningCard}>
                        <MaterialIcons name="schedule" size={19} color={COLORS.amber} />
                        <Text style={styles.warningText}>{getDonationNotice()}</Text>
                      </View>
                    ) : null}

                    <FieldLabel text="Last Donation Facility" />

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.pressableField,
                        donationFacility && styles.pressableFieldSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={openFacilityModal}
                    >
                      <View style={styles.fieldIcon}>
                        <FacilityIcon
                          type={selectedFacility ? selectedFacility.type : 'hospital'}
                          size={22}
                          color={COLORS.redButton}
                        />
                      </View>

                      <View style={styles.fieldContent}>
                        <Text
                          numberOfLines={1}
                          style={
                            donationFacility ? styles.fieldValue : styles.fieldPlaceholder
                          }
                        >
                          {donationFacility || 'Select or enter facility'}
                        </Text>
                        <Text style={styles.fieldHint}>Choose nearby or enter manually</Text>
                      </View>

                      <MaterialIcons name="chevron-right" size={21} color={COLORS.lightMuted} />
                    </TouchableOpacity>

                    {donationFacility ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.clearFieldButton}
                        onPress={clearFacility}
                      >
                        <Text style={styles.clearFieldText}>Clear facility</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.fieldSpacer} />
                    )}
                  </>
                ) : null}

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <View style={styles.spacer} />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.backBottom}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.backBottomText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.continueButton}
                    onPress={handleContinue}
                  >
                    <Text style={styles.continueText}>Continue</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </LinearGradient>

          <Modal
            visible={calendarVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCalendarVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.calendarModal}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Last Donation Date</Text>
                    <Text style={styles.modalSubtitle}>
                      Select the date you last donated blood.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.modalCloseButton}
                    onPress={() => setCalendarVisible(false)}
                  >
                    <MaterialIcons name="close" size={20} color={COLORS.black} />
                  </TouchableOpacity>
                </View>

                <View style={styles.monthNavigation}>
                  {calendarView === 'days' ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.monthButton}
                      onPress={handlePreviousMonth}
                    >
                      <MaterialIcons name="chevron-left" size={24} color={COLORS.redButton} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.monthButtonSpacer} />
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.monthTitleButton}
                    activeOpacity={0.7}
                    onPress={() =>
                      setCalendarView((current) => (current === 'days' ? 'years' : 'days'))
                    }
                  >
                    <Text style={styles.monthText}>
                      {calendarView === 'years'
                        ? 'Select year'
                        : calendarView === 'months'
                          ? String(visibleYear)
                          : `${MONTH_NAMES[visibleMonth]} ${visibleYear}`}
                    </Text>
                    <MaterialIcons
                      name={calendarView === 'days' ? 'arrow-drop-down' : 'arrow-drop-up'}
                      size={24}
                      color={COLORS.redButton}
                    />
                  </TouchableOpacity>

                  {calendarView === 'days' ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.monthButton, !canGoNextMonth && styles.monthButtonDisabled]}
                      disabled={!canGoNextMonth}
                      onPress={handleNextMonth}
                    >
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={canGoNextMonth ? COLORS.redButton : '#CFCFCF'}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.monthButtonSpacer} />
                  )}
                </View>

                {calendarView === 'years' ? (
                  renderYearList(visibleYear, handlePickCalendarYear)
                ) : calendarView === 'months' ? (
                  renderMonthGrid(
                    visibleMonth,
                    (monthIndex) => isFutureMonth(visibleYear, monthIndex),
                    handlePickCalendarMonth,
                  )
                ) : (
                  <>
                    <View style={styles.weekRow}>
                      {WEEK_DAYS.map((weekDay, index) => (
                        <View key={`${weekDay}-${index}`} style={styles.weekCell}>
                          <Text style={styles.weekText}>{weekDay}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.daysGrid}>
                      {calendarDays.map((day, index) => {
                        if (day === null) {
                          return <View key={`blank-${index}`} style={styles.dayCell} />;
                        }

                        const future = isFutureDay(day);
                        const selected = isSelectedDay(day);
                        const currentDay = isToday(day);

                        return (
                          <View
                            key={`${visibleYear}-${visibleMonth}-${day}`}
                            style={styles.dayCell}
                          >
                            <TouchableOpacity
                              accessibilityRole="button"
                              style={[
                                styles.dayButton,
                                currentDay && styles.todayButton,
                                selected && styles.selectedDayButton,
                              ]}
                              disabled={future}
                              onPress={() => handleSelectDate(day)}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  currentDay && styles.todayText,
                                  selected && styles.selectedDayText,
                                  future && styles.futureDayText,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}

                <View style={styles.calendarFooter}>
                  <MaterialIcons name="info-outline" size={17} color={COLORS.redButton} />
                  <Text style={styles.calendarFooterText}>
                    Tap the month and year at the top to jump quickly. Future dates
                    cannot be selected.
                  </Text>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={selectorVisible !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectorVisible(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.calendarModal}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {selectorVisible === 'year' ? 'Select Year' : 'Select Month'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      Choose the closest {selectorVisible === 'year' ? 'year' : 'month'} you
                      remember.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.modalCloseButton}
                    onPress={() => setSelectorVisible(null)}
                  >
                    <MaterialIcons name="close" size={20} color={COLORS.black} />
                  </TouchableOpacity>
                </View>

                {selectorVisible === 'year'
                  ? renderYearList(approxYear, handleSelectApproxYear)
                  : renderMonthGrid(
                      approxMonth,
                      (monthIndex) =>
                        approxYear !== null && isFutureMonth(approxYear, monthIndex),
                      handleSelectApproxMonth,
                    )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={facilityModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFacilityModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.facilityModal}>
                <View style={styles.modalHeader}>
                  <View style={styles.facilityHeaderText}>
                    <Text style={styles.modalTitle}>Donation Facility</Text>
                    <Text style={styles.modalSubtitle}>
                      Choose the hospital, blood center, or Red Cross location where you
                      last donated.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.modalCloseButton}
                    onPress={() => setFacilityModalVisible(false)}
                  >
                    <MaterialIcons name="close" size={20} color={COLORS.black} />
                  </TouchableOpacity>
                </View>

                <View style={styles.facilityModeRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.facilityModeButton,
                      facilityMode === 'nearby' && styles.facilityModeButtonSelected,
                    ]}
                    onPress={loadNearbyFacilities}
                  >
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color={facilityMode === 'nearby' ? COLORS.white : COLORS.redButton}
                    />
                    <Text
                      style={[
                        styles.facilityModeText,
                        facilityMode === 'nearby' && styles.facilityModeTextSelected,
                      ]}
                    >
                      Nearby
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.facilityModeButton,
                      facilityMode === 'manual' && styles.facilityModeButtonSelected,
                    ]}
                    onPress={handleManualMode}
                  >
                    <MaterialIcons
                      name="edit"
                      size={18}
                      color={facilityMode === 'manual' ? COLORS.white : COLORS.redButton}
                    />
                    <Text
                      style={[
                        styles.facilityModeText,
                        facilityMode === 'manual' && styles.facilityModeTextSelected,
                      ]}
                    >
                      Manual
                    </Text>
                  </TouchableOpacity>
                </View>

                {facilityMode === 'none' ? (
                  <View style={styles.facilityInitial}>
                    <View style={styles.facilityInitialIcon}>
                      <MaterialIcons
                        name="medical-services"
                        size={31}
                        color={COLORS.redButton}
                      />
                    </View>
                    <Text style={styles.facilityInitialTitle}>Select a Donation Facility</Text>
                    <Text style={styles.facilityInitialText}>
                      Choose a hospital, blood center, or Philippine Red Cross location nearby.
                    </Text>
                  </View>
                ) : null}

                {facilityMode === 'nearby' ? (
                  <View style={styles.facilityResults}>
                    {loadingFacilities ? (
                      <View style={styles.facilityLoading}>
                        <ActivityIndicator size="small" color={COLORS.redButton} />
                        <Text style={styles.facilityLoadingText}>
                          Finding nearby facilities...
                        </Text>
                      </View>
                    ) : nearbyFacilities.length > 0 ? (
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        style={styles.facilityList}
                        showsVerticalScrollIndicator={false}
                      >
                        {nearbyFacilities.map((facility) => (
                          <TouchableOpacity
                            key={facility.id}
                            accessibilityRole="button"
                            style={styles.facilityItem}
                            onPress={() => handleSelectFacility(facility)}
                          >
                            <View
                              style={[
                                styles.facilityItemIcon,
                                {
                                  backgroundColor: getFacilityIconBackground(facility.type),
                                },
                              ]}
                            >
                              <FacilityIcon
                                type={facility.type}
                                size={22}
                                color={COLORS.redButton}
                              />
                            </View>

                            <View style={styles.facilityItemContent}>
                              <Text
                                style={[
                                  styles.facilityTypeLabel,
                                  facility.type === 'red_cross' && styles.redCrossLabel,
                                ]}
                              >
                                {getFacilityLabel(facility)}
                              </Text>

                              <Text numberOfLines={2} style={styles.facilityItemName}>
                                {facility.name}
                              </Text>

                              {facility.address ? (
                                <View style={styles.facilityAddressRow}>
                                  <MaterialIcons
                                    name="location-on"
                                    size={12}
                                    color={COLORS.lightMuted}
                                  />
                                  <Text numberOfLines={2} style={styles.facilityItemAddress}>
                                    {facility.address}
                                  </Text>
                                </View>
                              ) : null}

                              <Text style={styles.facilityItemDistance}>
                                {Number(facility.distance_km).toFixed(1)} km away
                              </Text>
                            </View>

                            {facility.is_verified ? (
                              <MaterialIcons name="verified" size={17} color={COLORS.green} />
                            ) : (
                              <MaterialIcons
                                name="chevron-right"
                                size={21}
                                color={COLORS.lightMuted}
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={styles.noFacilities}>
                        <MaterialIcons name="location-off" size={30} color={COLORS.redButton} />
                        <Text style={styles.noFacilitiesTitle}>No nearby facilities found</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={styles.retryFacilityButton}
                          onPress={loadNearbyFacilities}
                        >
                          <Text style={styles.retryFacilityText}>Search Again</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {facilityError ? (
                      <View style={styles.facilityErrorCard}>
                        <Text style={styles.facilityErrorText}>{facilityError}</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={handleManualMode}
                        >
                          <Text style={styles.manualInsteadText}>
                            Enter manually instead
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {facilityMode === 'manual' ? (
                  <View style={styles.manualSection}>
                    <Text style={styles.manualLabel}>Facility Name</Text>
                    <View style={styles.manualInputContainer}>
                      <MaterialIcons
                        name="medical-services"
                        size={19}
                        color={COLORS.lightMuted}
                      />
                      <TextInput
                        style={styles.manualInput}
                        value={manualFacility}
                        onChangeText={setManualFacility}
                        placeholder="Hospital, blood center, or Red Cross"
                        placeholderTextColor={COLORS.lightMuted}
                        autoCapitalize="words"
                      />
                    </View>

                    <Text style={styles.manualHint}>
                      Enter the facility where you previously donated blood.
                    </Text>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.manualDoneButton,
                        !manualFacility.trim() && styles.manualDoneButtonDisabled,
                      ]}
                      disabled={!manualFacility.trim()}
                      onPress={() => {
                        setSelectedFacility(null);
                        setFacilityModalVisible(false);
                        setErrorMessage('');
                      }}
                    >
                      <Text style={styles.manualDoneText}>Use This Facility</Text>
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

const styles = StyleSheet.create({
  headerCopy: { flex: 1, minWidth: 0 },
  desktopBackground: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Platform.OS === 'web' ? '#242424' : COLORS.backgroundBottom,
  },
  phone: {
    width: Platform.OS === 'web' ? 440 : '100%',
    height: '100%', maxWidth: '100%', overflow: 'hidden',
    backgroundColor: COLORS.backgroundBottom,
  },
  safeArea: { flex: 1, backgroundColor: COLORS.red },
  header: {
    height: Platform.OS === 'web' ? 118 : 108,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'web' ? 18 : 6,
    overflow: 'hidden',
  },
  headerCircleLeft: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    left: -98, top: -73, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerCircleRight: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    right: -73, top: -78, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  backButton: {
    width: 43, height: 43, marginRight: 17, borderRadius: 22,
    borderWidth: 3, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white, fontFamily: 'Poppins_700Bold', fontSize: 20, lineHeight: 27,
  },
  headerSubtitle: {
    marginTop: 1, color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18,
  },
  body: { flex: 1, paddingHorizontal: 18, paddingBottom: 16 },
  card: {
    flex: 1, marginTop: -14, borderRadius: 27, overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16, shadowRadius: 7, elevation: 6,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 22, paddingBottom: 30 },
  progressRow: { flexDirection: 'row', gap: 7, marginBottom: 24 },
  progressLine: { height: 4, borderRadius: 2, backgroundColor: '#D8D8D8' },
  progressActive: { backgroundColor: COLORS.redButton },
  title: {
    color: COLORS.black, fontFamily: 'Poppins_600SemiBold', fontSize: 17, lineHeight: 24,
  },
  description: {
    marginTop: 3, marginBottom: 18, color: COLORS.muted,
    fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18,
  },
  label: {
    marginBottom: 8, color: COLORS.black,
    fontFamily: 'Inter_500Medium', fontSize: 12.5, lineHeight: 18,
  },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  optionButton: {
    flex: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
    gap: 7, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11,
    backgroundColor: COLORS.white, paddingVertical: 10, minHeight: 48,
  },
  optionButtonSelected: { borderColor: COLORS.redButton, backgroundColor: COLORS.pink },
  optionText: {
    color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18,
  },
  pressableField: {
    minHeight: 52, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 11,
    backgroundColor: COLORS.white, paddingVertical: 12,
  },
  pressableFieldSelected: { borderColor: '#DDA6A6', backgroundColor: '#FFFDFD' },
  fieldIcon: {
    width: 38, height: 38, marginRight: 10, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pink,
  },
  fieldContent: { flex: 1 },
  fieldPlaceholder: {
    color: COLORS.lightMuted, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  fieldValue: {
    color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18,
  },
  fieldHint: {
    marginTop: 2, color: COLORS.lightMuted, fontFamily: 'Inter_400Regular', fontSize: 12,
  },
  clearFieldButton: {
    alignSelf: 'flex-end', marginTop: 5, marginBottom: 15,
    paddingVertical: 3, minHeight: 44, justifyContent: 'center',
  },
  clearFieldText: {
    color: COLORS.redButton, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  errorText: {
    marginTop: 12, color: COLORS.redButton,
    fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'center',
  },
  spacer: { flex: 1, minHeight: 24 },
  buttonRow: { flexDirection: 'row', gap: 11 },
  backBottom: {
    flex: 0.8, alignItems: 'center', justifyContent: 'center', borderRadius: 13,
    backgroundColor: '#F3F0F1', minHeight: 49, paddingVertical: 12, paddingHorizontal: 10,
  },
  backBottomText: {
    color: '#444444', fontFamily: 'Poppins_600SemiBold', fontSize: 13,
    lineHeight: 20, textAlign: 'center', flexShrink: 1,
  },
  continueButton: {
    flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 13, backgroundColor: COLORS.redButton,
    minHeight: 49, paddingVertical: 12, paddingHorizontal: 10,
  },
  continueText: {
    color: COLORS.white, fontFamily: 'Poppins_600SemiBold', fontSize: 13,
    lineHeight: 20, textAlign: 'center', flexShrink: 1,
  },
  modalBackdrop: {
    flex: 1, paddingHorizontal: 20, alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 18,
  },
  modalTitle: { color: COLORS.black, fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  modalSubtitle: {
    marginTop: 2, color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18, flexShrink: 1,
  },
  modalCloseButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#F4F4F4',
  },
  calendarModal: {
    width: '100%', maxWidth: 360, paddingHorizontal: 17,
    paddingTop: 18, paddingBottom: 17, borderRadius: 22, backgroundColor: COLORS.white,
  },
  monthNavigation: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  monthButton: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.pink,
  },
  monthButtonDisabled: { backgroundColor: '#F6F6F6' },
  monthText: { color: COLORS.black, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  weekRow: { flexDirection: 'row', marginBottom: 5 },
  weekCell: { width: '14.2857%', alignItems: 'center', justifyContent: 'center' },
  weekText: { color: COLORS.lightMuted, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center',
  },
  dayButton: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
  },
  todayButton: { borderWidth: 1, borderColor: COLORS.redButton },
  selectedDayButton: { borderColor: COLORS.redButton, backgroundColor: COLORS.redButton },
  dayText: { color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 12 },
  todayText: { color: COLORS.redButton, fontFamily: 'Inter_600SemiBold' },
  selectedDayText: { color: COLORS.white, fontFamily: 'Inter_600SemiBold' },
  futureDayText: { color: '#D5D5D5' },
  calendarFooter: {
    marginTop: 11, padding: 10, flexDirection: 'row', alignItems: 'center',
    gap: 7, borderRadius: 10, backgroundColor: COLORS.pink,
  },
  calendarFooterText: {
    flex: 1, color: COLORS.muted, fontFamily: 'Inter_400Regular', fontSize: 12,
  },
  facilityModal: {
    width: '100%', maxWidth: 370, maxHeight: '78%', paddingHorizontal: 17,
    paddingTop: 18, paddingBottom: 17, borderRadius: 22, backgroundColor: COLORS.white,
  },
  facilityHeaderText: { flex: 1, paddingRight: 10 },
  facilityModeRow: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  facilityModeButton: {
    flex: 1, height: 43, borderWidth: 1, borderColor: '#E0B6B6', borderRadius: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: COLORS.white,
  },
  facilityModeButtonSelected: {
    borderColor: COLORS.redButton, backgroundColor: COLORS.redButton,
  },
  facilityModeText: {
    color: COLORS.redButton, fontFamily: 'Inter_600SemiBold', fontSize: 12,
  },
  facilityModeTextSelected: { color: COLORS.white },
  facilityInitial: {
    minHeight: 220, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  facilityInitialIcon: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.pink, marginBottom: 12,
  },
  facilityInitialTitle: {
    color: COLORS.black, fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center',
  },
  facilityInitialText: {
    marginTop: 5, maxWidth: 260, color: COLORS.muted,
    fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center',
  },
  facilityResults: { minHeight: 220 },
  facilityLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  facilityLoadingText: {
    marginTop: 9, color: COLORS.muted, fontFamily: 'Inter_400Regular', fontSize: 12,
  },
  facilityList: { maxHeight: 330 },
  facilityItem: {
    minHeight: 84, paddingVertical: 11, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  facilityItemIcon: {
    width: 44, height: 44, marginRight: 10, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  facilityItemContent: { flex: 1, paddingRight: 8 },
  facilityTypeLabel: {
    marginBottom: 2, color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'uppercase',
  },
  redCrossLabel: { color: COLORS.redDark },
  facilityItemName: {
    color: COLORS.black, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18,
  },
  facilityAddressRow: {
    marginTop: 3, flexDirection: 'row', alignItems: 'flex-start', gap: 2,
  },
  facilityItemAddress: {
    flex: 1, color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18,
  },
  facilityItemDistance: {
    marginTop: 3, color: COLORS.redButton, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  noFacilities: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  noFacilitiesTitle: {
    marginTop: 8, color: COLORS.black, fontFamily: 'Inter_600SemiBold', fontSize: 12,
  },
  retryFacilityButton: {
    marginTop: 12, paddingHorizontal: 17, paddingVertical: 9,
    borderRadius: 9, backgroundColor: COLORS.redButton,
  },
  retryFacilityText: { color: COLORS.white, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  facilityErrorCard: {
    marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.pink,
  },
  facilityErrorText: {
    color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18, textAlign: 'center',
  },
  manualInsteadText: {
    marginTop: 7, color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center',
  },
  manualSection: { paddingTop: 5, minHeight: 220 },
  manualLabel: {
    marginBottom: 7, color: COLORS.black, fontFamily: 'Inter_600SemiBold', fontSize: 12,
  },
  manualInputContainer: {
    minHeight: 50, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
    gap: 8, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 11, backgroundColor: COLORS.white,
  },
  manualInput: {
    flex: 1, color: COLORS.black, fontFamily: 'Inter_400Regular', fontSize: 12,
  },
  manualHint: {
    marginTop: 5, color: COLORS.lightMuted, fontFamily: 'Inter_400Regular', fontSize: 12,
  },
  manualDoneButton: {
    height: 45, marginTop: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.redButton,
  },
  manualDoneButtonDisabled: { opacity: 0.45 },
  manualDoneText: {
    color: COLORS.white, fontFamily: 'Poppins_600SemiBold', fontSize: 12,
  },
  progressStep: { flex: 1 },
  progressLabel: {
    marginTop: 6, color: COLORS.lightMuted, fontFamily: 'Inter_500Medium',
    fontSize: 11.5, lineHeight: 16,
  },
  progressLabelActive: {
    color: COLORS.redButton, fontFamily: 'Inter_600SemiBold',
  },
  labelRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelInline: { marginBottom: 0 },
  requiredMark: { color: COLORS.redButton, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  optionalTag: { color: COLORS.lightMuted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  optionTextSelected: { color: COLORS.redButton, fontFamily: 'Inter_600SemiBold' },
  noticeCard: {
    marginBottom: 6, padding: 12, flexDirection: 'row', alignItems: 'flex-start',
    gap: 9, borderWidth: 1, borderColor: '#EFC1C1',
    borderRadius: 11, backgroundColor: COLORS.pink,
  },
  noticeText: {
    flex: 1, color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18,
  },
  approxRow: { flexDirection: 'row', gap: 10 },
  approxColumn: { flex: 1 },
  approxLabel: {
    marginBottom: 5, color: COLORS.muted, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  selectField: {
    paddingLeft: 12, paddingRight: 6, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 11, backgroundColor: COLORS.white, paddingVertical: 10, minHeight: 48,
  },
  selectPlaceholder: {
    flex: 1, color: COLORS.lightMuted, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  selectValue: {
    flex: 1, color: COLORS.black, fontFamily: 'Inter_600SemiBold',
    fontSize: 13, lineHeight: 18,
  },
  helperText: {
    marginTop: 8, color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18,
  },
  checkboxRow: {
    marginTop: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  checkboxText: {
    flex: 1, color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 12,
  },
  warningCard: {
    marginBottom: 16, padding: 12, flexDirection: 'row', alignItems: 'flex-start',
    gap: 9, borderWidth: 1, borderColor: COLORS.amberBorder,
    borderRadius: 11, backgroundColor: COLORS.amberBackground,
  },
  warningText: {
    flex: 1, color: COLORS.amber, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18,
  },
  fieldSpacer: { height: 16 },
  monthButtonSpacer: { width: 37, height: 37 },
  monthTitleButton: {
    paddingVertical: 6, paddingLeft: 12, paddingRight: 6,
    flexDirection: 'row', alignItems: 'center', borderRadius: 10,
  },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthGridCell: { width: '33.3333%', padding: 4 },
  monthGridButton: {
    height: 46, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, backgroundColor: COLORS.white,
  },
  monthGridButtonSelected: {
    borderColor: COLORS.redButton, backgroundColor: COLORS.redButton,
  },
  monthGridButtonDisabled: { borderColor: '#EEEEEE', backgroundColor: '#F7F7F7' },
  monthGridText: { color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 12 },
  monthGridTextSelected: { color: COLORS.white, fontFamily: 'Inter_600SemiBold' },
  monthGridTextDisabled: { color: '#C8C8C8' },
  yearList: { maxHeight: 300 },
  yearRow: {
    height: YEAR_ROW_HEIGHT, paddingHorizontal: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  yearRowSelected: { borderRadius: 10, backgroundColor: COLORS.pink },
  yearText: { color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 13 },
  yearTextSelected: { color: COLORS.redButton, fontFamily: 'Inter_600SemiBold' },
});