import { useCallback, useEffect, useMemo, useState } from 'react';

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
import PhotoSourceSheet from '../../components/PhotoSourceSheet';
import BloodTypeProofField from '../../components/BloodTypeProofField';
import type { PickedImage } from '../../lib/imageUpload';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../lib/fullScreen';

import {
  deleteProfilePhoto,
  getCurrentUser,
  saveBloodTypeWithProof,
  updateProfile,
  uploadProfilePhoto,
} from '../../lib/api';

import {
  getMyDonorApplication,
} from '../../lib/donorApplication';

import type {
  DonorApplication,
} from '../../lib/donorApplication';

import {
  getAccessToken,
} from '../../lib/session';

import {
  cleanUsername,
  getUsernameProblem,
} from '../../lib/username';

import {
  normalizePhone,
  PHONE_ERROR,
} from '../../lib/phone';

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
  card: '#FFFFFF',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#EFE3E3',

  pinkSoft: '#FFF1F1',

  green: '#159447',
  greenSoft: '#EAF7EF',

  orange: '#DF721D',
  orangeSoft: '#FDF1E6',

  graySoft: '#F5EFEF',
};

// ============================================================
// OPTIONS
// ============================================================

const GENDERS = [
  'Male',
  'Female',
  'Prefer not to say',
] as const;

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

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
// DATE CONSTANTS
// ============================================================

const DEFAULT_BIRTHDAY =
  new Date(
    2000,
    0,
    1
  );

const CURRENT_YEAR =
  new Date()
    .getFullYear();

const MIN_BIRTH_YEAR =
  CURRENT_YEAR - 120;

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
  visible: boolean;

  title: string;

  message: string;

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
// EDIT PROFILE SCREEN
// ============================================================

export default function EditProfileScreen() {
  // Full screen: the red header reaches the top edge, with
  // its content kept below the clock.
  const insets = useSafeAreaInsets();

  // ==========================================================
  // DATA
  // ==========================================================

  const [
    originalProfile,
    setOriginalProfile,
  ] =
    useState<any>(
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
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    photoBusy,
    setPhotoBusy,
  ] =
    useState(
      false
    );

  // Take Photo / Choose from Library sheet.
  const [
    photoSheetVisible,
    setPhotoSheetVisible,
  ] =
    useState(
      false
    );

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
  // FORM
  // ==========================================================

  // Sign in with it or the email; unique.
  const [
    username,
    setUsername,
  ] =
    useState('');

  const [
    firstName,
    setFirstName,
  ] =
    useState('');

  const [
    middleName,
    setMiddleName,
  ] =
    useState('');

  const [
    lastName,
    setLastName,
  ] =
    useState('');

  const [
    suffix,
    setSuffix,
  ] =
    useState('');

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
    barangay,
    setBarangay,
  ] =
    useState('');

  const [
    city,
    setCity,
  ] =
    useState('');

  const [
    province,
    setProvince,
  ] =
    useState('');

  const [
    bloodType,
    setBloodType,
  ] =
    useState('');

  // The blood type saved on the profile, whether it has a proof
  // photo, and a new proof chosen here. A new blood type needs a
  // proof photo.
  const [
    savedBloodType,
    setSavedBloodType,
  ] =
    useState('');

  const [
    proofOnFile,
    setProofOnFile,
  ] =
    useState(false);

  const [
    bloodTypeProof,
    setBloodTypeProof,
  ] =
    useState<PickedImage | null>(
      null
    );

  const [
    profilePhotoUrl,
    setProfilePhotoUrl,
  ] =
    useState('');

  // ==========================================================
  // BIRTHDAY CALENDAR
  // ==========================================================

  const [
    showBirthdayPicker,
    setShowBirthdayPicker,
  ] =
    useState(
      false
    );

  const [
    birthdayDraft,
    setBirthdayDraft,
  ] =
    useState<Date>(
      DEFAULT_BIRTHDAY
    );

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState<Date>(
      new Date(
        DEFAULT_BIRTHDAY
          .getFullYear(),

        DEFAULT_BIRTHDAY
          .getMonth(),

        1
      )
    );

  const [
    showYearPicker,
    setShowYearPicker,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DONOR STATE
  // ==========================================================

  const isApprovedDonor =
    donorApplication
      ?.status ===
    'approved';

  const verifiedDonorBloodType =
    donorApplication
      ?.blood_type ||
    '';

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setErrorMessage(
            ''
          );

          const accessToken =
            await getAccessToken();

          if (
            !accessToken
          ) {
            router.replace(
              '/'
            );

            return;
          }

          const [
            profileResult,
            donorResult,
          ] =
            await Promise.all([
              getCurrentUser(
                accessToken
              ),

              getMyDonorApplication(
                accessToken
              ).catch(
                () => ({
                  application:
                    null,
                })
              ),
            ]);

          if (
            !profileResult?.user
          ) {
            throw new Error(
              'Unable to load your profile.'
            );
          }

          const user =
            profileResult.user;

          const application =
            donorResult
              ?.application ||
            null;

          setOriginalProfile(
            user
          );

          setDonorApplication(
            application
          );

          setUsername(
            user.username ||
            ''
          );

          setFirstName(
            user.first_name ||
            ''
          );

          setMiddleName(
            user.middle_name ||
            ''
          );

          setLastName(
            user.last_name ||
            ''
          );

          setSuffix(
            user.suffix ||
            ''
          );

          setPhone(
            user.phone ||
            ''
          );

          setDateOfBirth(
            user.date_of_birth ||
            ''
          );

          setGender(
            user.gender ||
            ''
          );

          setBarangay(
            user.barangay ||
            ''
          );

          setCity(
            user.city ||
            ''
          );

          setProvince(
            user.province ||
            ''
          );

          setProfilePhotoUrl(
            user.profile_photo_url ||
            ''
          );

          setSavedBloodType(
            user.blood_type ||
            ''
          );

          setProofOnFile(
            Boolean(
              user.blood_type_proof
            )
          );

          if (
            application
              ?.status ===
            'approved'
          ) {
            setBloodType(
              application
                .blood_type ||
              user.blood_type ||
              ''
            );
          } else {
            setBloodType(
              user.blood_type ||
              application
                ?.blood_type ||
              ''
            );
          }
        } catch (
          error
        ) {
          console.log(
            'EDIT PROFILE LOAD ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your profile.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      loadProfile();
    },
    [
      loadProfile,
    ]
  );

  // ==========================================================
  // DISPLAY DATA
  // ==========================================================

  const email =
    originalProfile
      ?.email ||
    '';

  // ==========================================================
  // ADDRESS CHANGED
  // ==========================================================

  const addressChanged =
    useMemo(
      () => {
        if (
          !originalProfile
        ) {
          return false;
        }

        const oldBarangay =
          String(
            originalProfile
              .barangay ||
            ''
          ).trim();

        const oldCity =
          String(
            originalProfile
              .city ||
            ''
          ).trim();

        const oldProvince =
          String(
            originalProfile
              .province ||
            ''
          ).trim();

        return (
          barangay.trim() !==
            oldBarangay ||

          city.trim() !==
            oldCity ||

          province.trim() !==
            oldProvince
        );
      },
      [
        barangay,
        city,
        province,
        originalProfile,
      ]
    );

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
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes(
        'updated'
      ) ||
      value.includes(
        'removed'
      ) ||
      value.includes(
        'success'
      )
    ) {
      return 'success';
    }

    if (
      value.includes(
        'failed'
      ) ||
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
      ) ||
      value.includes(
        'invalid'
      ) ||
      value.includes(
        'permission'
      )
    ) {
      return 'warning';
    }

    return 'info';
  }

  function showMessage(
    title: string,
    message: string,
    onConfirm?: () => void
  ) {
    setActionPopup({
      visible:
        true,

      title,

      message,

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

      onConfirm,
    });
  }

  function showConfirmation(
    options: {
      title: string;

      message: string;

      confirmText: string;

      cancelText?: string;

      variant?:
        ActionPopupVariant;

      onConfirm:
        () => void;
    }
  ) {
    setActionPopup({
      visible:
        true,

      title:
        options.title,

      message:
        options.message,

      variant:
        options.variant ||
        'warning',

      confirmText:
        options.confirmText,

      cancelText:
        options.cancelText ||
        'Cancel',

      showCancel:
        true,

      onConfirm:
        options.onConfirm,
    });
  }

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  function isValidDateString(
    value: string
  ) {
    const cleanValue =
      value.trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        cleanValue
      )
    ) {
      return false;
    }

    const [
      year,
      month,
      day,
    ] =
      cleanValue
        .split('-')
        .map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() ===
        year &&

      date.getUTCMonth() ===
        month - 1 &&

      date.getUTCDate() ===
        day
    );
  }

  function parseBirthday(
    value: string
  ) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        value
      );

    if (
      !match
    ) {
      return DEFAULT_BIRTHDAY;
    }

    return new Date(
      Number(
        match[1]
      ),

      Number(
        match[2]
      ) - 1,

      Number(
        match[3]
      )
    );
  }

  function formatBirthdayForApi(
    date: Date
  ) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() +
        1
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

  function formatBirthdayForDisplay(
    value: string
  ) {
    if (
      !value ||
      !isValidDateString(
        value
      )
    ) {
      return 'Select your birthday';
    }

    return parseBirthday(
      value
    ).toLocaleDateString(
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

  function isSameDate(
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

  function isFutureDate(
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

    const compareDate =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

    return (
      compareDate >
      today
    );
  }

  // ==========================================================
  // CALENDAR DAYS
  // ==========================================================

  const calendarDays =
    useMemo(
      () => {
        const year =
          calendarMonth
            .getFullYear();

        const month =
          calendarMonth
            .getMonth();

        const firstDay =
          new Date(
            year,
            month,
            1
          ).getDay();

        const daysInMonth =
          new Date(
            year,
            month + 1,
            0
          ).getDate();

        const cells:
          Array<
            number | null
          > = [];

        for (
          let index =
            0;

          index <
          firstDay;

          index +=
            1
        ) {
          cells.push(
            null
          );
        }

        for (
          let day =
            1;

          day <=
          daysInMonth;

          day +=
            1
        ) {
          cells.push(
            day
          );
        }

        while (
          cells.length %
            7 !==
          0
        ) {
          cells.push(
            null
          );
        }

        return cells;
      },
      [
        calendarMonth,
      ]
    );

  // ==========================================================
  // BIRTH YEAR OPTIONS
  // ==========================================================

  const birthYears =
    useMemo(
      () => {
        const years:
          number[] = [];

        for (
          let year =
            CURRENT_YEAR;

          year >=
          MIN_BIRTH_YEAR;

          year -=
            1
        ) {
          years.push(
            year
          );
        }

        return years;
      },
      []
    );

  // ==========================================================
  // CALENDAR CONTROLS
  // ==========================================================

  function openBirthdayPicker() {
    const initialDate =
      dateOfBirth &&
      isValidDateString(
        dateOfBirth
      )
        ? parseBirthday(
            dateOfBirth
          )
        : DEFAULT_BIRTHDAY;

    setBirthdayDraft(
      initialDate
    );

    setCalendarMonth(
      new Date(
        initialDate
          .getFullYear(),

        initialDate
          .getMonth(),

        1
      )
    );

    setShowYearPicker(
      false
    );

    setShowBirthdayPicker(
      true
    );
  }

  function closeBirthdayPicker() {
    setShowYearPicker(
      false
    );

    setShowBirthdayPicker(
      false
    );
  }

  function toggleYearPicker() {
    setShowYearPicker(
      current =>
        !current
    );
  }

  function selectCalendarYear(
    year: number
  ) {
    setCalendarMonth(
      current =>
        new Date(
          year,

          current
            .getMonth(),

          1
        )
    );

    setShowYearPicker(
      false
    );
  }

  function goPreviousMonth() {
    setShowYearPicker(
      false
    );

    setCalendarMonth(
      current =>
        new Date(
          current
            .getFullYear(),

          current
            .getMonth() -
            1,

          1
        )
    );
  }

  function goNextMonth() {
    setShowYearPicker(
      false
    );

    const nextMonth =
      new Date(
        calendarMonth
          .getFullYear(),

        calendarMonth
          .getMonth() +
          1,

        1
      );

    const currentMonth =
      new Date(
        new Date()
          .getFullYear(),

        new Date()
          .getMonth(),

        1
      );

    if (
      nextMonth >
      currentMonth
    ) {
      return;
    }

    setCalendarMonth(
      nextMonth
    );
  }

  function canGoNextMonth() {
    const nextMonth =
      new Date(
        calendarMonth
          .getFullYear(),

        calendarMonth
          .getMonth() +
          1,

        1
      );

    const currentMonth =
      new Date(
        new Date()
          .getFullYear(),

        new Date()
          .getMonth(),

        1
      );

    return (
      nextMonth <=
      currentMonth
    );
  }

  function selectCalendarDay(
    day: number
  ) {
    const selected =
      new Date(
        calendarMonth
          .getFullYear(),

        calendarMonth
          .getMonth(),

        day
      );

    if (
      isFutureDate(
        selected
      )
    ) {
      return;
    }

    setBirthdayDraft(
      selected
    );
  }

  function confirmBirthday() {
    setDateOfBirth(
      formatBirthdayForApi(
        birthdayDraft
      )
    );

    setShowBirthdayPicker(
      false
    );
  }

  // ==========================================================
  // PROFILE PHOTO
  // ==========================================================

  function handleChooseProfilePhoto() {
    if (
      photoBusy ||
      saving
    ) {
      return;
    }

    setPhotoSheetVisible(
      true
    );
  }

  async function handlePhotoPicked(
    image: PickedImage
  ) {
    try {
      setPhotoBusy(
        true
      );

      setErrorMessage(
        ''
      );

      const accessToken =
        await getAccessToken();

      if (
        !accessToken
      ) {
        router.replace(
          '/'
        );

        return;
      }

      const uploadResult =
        await uploadProfilePhoto(
          accessToken,
          image
        );

      const newPhotoUrl =
        uploadResult
          ?.profile_photo_url ||

        uploadResult
          ?.user
          ?.profile_photo_url ||

        '';

      if (
        !newPhotoUrl
      ) {
        throw new Error(
          'Profile photo uploaded, but no photo URL was returned.'
        );
      }

      setProfilePhotoUrl(
        newPhotoUrl
      );

      if (
        uploadResult?.user
      ) {
        setOriginalProfile(
          uploadResult.user
        );
      }

      showMessage(
        'Profile Photo Updated',
        'Your new profile photo has been saved.'
      );
    } catch (
      error
    ) {
      console.log(
        'PROFILE PHOTO UPLOAD ERROR:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to upload your profile photo.';

      setErrorMessage(
        message
      );

      showMessage(
        'Upload Failed',
        message
      );
    } finally {
      setPhotoBusy(
        false
      );
    }
  }

  async function performRemoveProfilePhoto() {
    try {
      setPhotoBusy(
        true
      );

      setErrorMessage(
        ''
      );

      const accessToken =
        await getAccessToken();

      if (
        !accessToken
      ) {
        router.replace(
          '/'
        );

        return;
      }

      const result =
        await deleteProfilePhoto(
          accessToken
        );

      setProfilePhotoUrl(
        ''
      );

      if (
        result?.user
      ) {
        setOriginalProfile(
          result.user
        );
      }

      showMessage(
        'Profile Photo Removed',
        'Your profile photo has been removed.'
      );
    } catch (
      error
    ) {
      console.log(
        'PROFILE PHOTO REMOVE ERROR:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to remove your profile photo.';

      setErrorMessage(
        message
      );

      showMessage(
        'Remove Failed',
        message
      );
    } finally {
      setPhotoBusy(
        false
      );
    }
  }

  function handleRemoveProfilePhoto() {
    if (
      !profilePhotoUrl ||
      photoBusy ||
      saving
    ) {
      return;
    }

    showConfirmation({
      title:
        'Remove Profile Photo',

      message:
        'Remove your current profile photo?',

      confirmText:
        'Remove',

      cancelText:
        'Cancel',

      variant:
        'danger',

      onConfirm:
        performRemoveProfilePhoto,
    });
  }

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  async function handleSave() {
    if (
      saving ||
      photoBusy
    ) {
      return;
    }

    setErrorMessage(
      ''
    );

    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanDate =
      dateOfBirth.trim();

    const cleanBarangay =
      barangay.trim();

    const cleanCity =
      city.trim();

    const cleanProvince =
      province.trim();

    if (
      !cleanFirstName ||
      !cleanLastName
    ) {
      const message =
        'First name and last name are required.';

      setErrorMessage(
        message
      );

      showMessage(
        'Missing Name',
        message
      );

      return;
    }

    if (
      !cleanDate
    ) {
      const message =
        'Date of birth is required.';

      setErrorMessage(
        message
      );

      showMessage(
        'Birthday Required',
        message
      );

      return;
    }

    if (
      !isValidDateString(
        cleanDate
      )
    ) {
      const message =
        'Please select a valid date of birth.';

      setErrorMessage(
        message
      );

      showMessage(
        'Invalid Birthday',
        message
      );

      return;
    }

    if (
      !gender
    ) {
      const message =
        'Please select your gender.';

      setErrorMessage(
        message
      );

      showMessage(
        'Gender Required',
        message
      );

      return;
    }

    if (
      !cleanBarangay ||
      !cleanCity ||
      !cleanProvince
    ) {
      const message =
        'Barangay, city or municipality, and province are required.';

      setErrorMessage(
        message
      );

      showMessage(
        'Address Required',
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

    // Username: sent only when changed (the server checks it is
    // free). An account without one may leave it empty.
    const newUsername =
      cleanUsername(username);

    const usernameChanged =
      newUsername !==
      (originalProfile?.username || '');

    const usernameProblem =
      usernameChanged &&
      (newUsername ||
        originalProfile?.username)
        ? getUsernameProblem(
            newUsername
          )
        : null;

    if (usernameProblem) {
      setErrorMessage(
        usernameProblem
      );

      showMessage(
        'Check Username',
        usernameProblem
      );

      return;
    }

    const bloodTypeChanged =
      !isApprovedDonor &&
      bloodType !==
        savedBloodType;

    if (
      bloodTypeChanged &&
      bloodType &&
      !bloodTypeProof
    ) {
      const message =
        'Add a photo of your blood type proof, or clear the blood type.';

      setErrorMessage(
        message
      );

      showMessage(
        'Proof Required',
        message
      );

      return;
    }

    try {
      setSaving(
        true
      );

      const accessToken =
        await getAccessToken();

      if (
        !accessToken
      ) {
        router.replace(
          '/'
        );

        return;
      }

      // A new blood type (or a new proof for the same one) is
      // saved with its photo first.
      if (
        !isApprovedDonor &&
        bloodType &&
        bloodTypeProof
      ) {
        await saveBloodTypeWithProof(
          accessToken,
          bloodType,
          bloodTypeProof
        );
      }

      const payload:
        Record<
          string,
          unknown
        > = {
        first_name:
          cleanFirstName,

        middle_name:
          middleName.trim() ||
          null,

        last_name:
          cleanLastName,

        suffix:
          suffix.trim() ||
          null,

        phone:
          cleanPhone ||
          null,

        date_of_birth:
          cleanDate,

        gender,

        barangay:
          cleanBarangay,

        city:
          cleanCity,

        province:
          cleanProvince,
      };

      if (
        usernameChanged &&
        newUsername
      ) {
        payload.username =
          newUsername;
      }

      // Clearing the blood type also removes its proof.
      if (
        bloodTypeChanged &&
        !bloodType
      ) {
        payload.blood_type =
          null;
      }

      if (
        addressChanged
      ) {
        payload.latitude =
          null;

        payload.longitude =
          null;
      }

      const result =
        await updateProfile(
          accessToken,
          payload
        );

      showMessage(
        'Profile Updated',

        result?.message ||
          'Your profile was updated successfully.',

        () => {
          router.back();
        }
      );
    } catch (
      error
    ) {
      console.log(
        'EDIT PROFILE SAVE ERROR:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update your profile.';

      setErrorMessage(
        message
      );

      showMessage(
        'Update Failed',
        message
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
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
              styles.loadingSafeArea
            }
          >
            <View
              style={
                styles.loadingContainer
              }
            >
              <View
                style={
                  styles.loadingIcon
                }
              >
                <MaterialIcons
                  name="person"
                  size={32}
                  color={
                    COLORS.redButton
                  }
                />
              </View>

              <Text
                style={
                  styles.loadingTitle
                }
              >
                Loading Profile
              </Text>

              <Text
                style={
                  styles.loadingText
                }
              >
                Preparing your profile information...
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
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
          // The header is drawn behind the status bar.
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
            {/* ==================================================
                HEADER
            ================================================== */}

            <LinearGradient
              colors={[
                '#D2151A',
                COLORS.redDark,
              ]}
              style={withStatusBar(
                styles.header,
                insets.top
              )}
            >
              <View
                style={shiftedDown(
                  styles.headerCircleLeft,
                  insets.top
                )}
              />

              <View
                style={shiftedDown(
                  styles.headerCircleRight,
                  insets.top
                )}
              />

              <TouchableOpacity
                style={
                  styles.headerButton
                }
                activeOpacity={
                  0.7
                }
                disabled={
                  saving ||
                  photoBusy
                }
                onPress={() =>
                  router.back()
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>

              <View
                style={
                  styles.headerCenter
                }
              >
                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Edit Profile
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Keep your information accurate
                </Text>
              </View>

              <View
                style={
                  styles.headerRightSpacer
                }
              />
            </LinearGradient>

            <ScrollView
              style={
                styles.content
              }
              contentContainerStyle={[
                styles.contentContainer,

                {
                  // Ends above the home bar.
                  paddingBottom:
                    36 + insets.bottom,
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
                  ERROR
              ================================================== */}

              {errorMessage ? (
                <View
                  style={
                    styles.errorCard
                  }
                >
                  <View
                    style={
                      styles.errorIcon
                    }
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={20}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

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

              {/* ==================================================
                  ACCOUNT
              ================================================== */}

              <SectionHeader
                icon="lock-outline"
                title="Account"
                subtitle="Your account email cannot be changed here."
              />

              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.fieldContainerLast
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Email Address
                  </Text>

                  <View
                    style={
                      styles.readOnlyInput
                    }
                  >
                    <MaterialIcons
                      name="email"
                      size={19}
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      numberOfLines={1}
                      style={
                        styles.readOnlyText
                      }
                    >
                      {
                        email
                      }
                    </Text>

                    <MaterialIcons
                      name="lock"
                      size={16}
                      color={
                        COLORS.lightMuted
                      }
                    />
                  </View>
                </View>
              </View>

              {/* ==================================================
                  NAME
              ================================================== */}

              <SectionHeader
                icon="person-outline"
                title="Name"
                subtitle="Use your real name for blood request coordination."
              />

              <View
                style={
                  styles.card
                }
              >
                <Field
                  label="First Name"
                  value={
                    firstName
                  }
                  placeholder="First name"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setFirstName
                  }
                />

                <Field
                  label="Middle Name"
                  value={
                    middleName
                  }
                  placeholder="Optional"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setMiddleName
                  }
                />

                <Field
                  label="Last Name"
                  value={
                    lastName
                  }
                  placeholder="Last name"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setLastName
                  }
                />

                <Field
                  label="Suffix"
                  value={
                    suffix
                  }
                  placeholder="Jr., Sr., III, etc. (optional)"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setSuffix
                  }
                  last
                />
              </View>

              {/* ==================================================
                  PERSONAL INFORMATION
              ================================================== */}

              <SectionHeader
                icon="badge"
                title="Personal Information"
                subtitle="Basic information used in your Hemo-Hero profile."
              />

              <View
                style={
                  styles.card
                }
              >
                <Field
                  label="Username"
                  value={
                    username
                  }
                  placeholder="Choose a username"
                  autoCapitalize="none"
                  hint="Sign in with your username or email. 3 to 20 letters, numbers, periods or underscores."
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setUsername
                  }
                />

                <Field
                  label="Phone Number"
                  value={
                    phone
                  }
                  placeholder="0917 123 4567 (optional)"
                  keyboardType="phone-pad"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setPhone
                  }
                />

                {/* ================================================
                    DATE OF BIRTH
                ================================================ */}

                <View
                  style={
                    styles.fieldContainer
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Date of Birth
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.birthdayButton
                    }
                    activeOpacity={
                      0.8
                    }
                    disabled={
                      saving ||
                      photoBusy
                    }
                    onPress={
                      openBirthdayPicker
                    }
                  >
                    <View
                      style={
                        styles.birthdayIcon
                      }
                    >
                      <MaterialIcons
                        name="calendar-month"
                        size={20}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.birthdayContent
                      }
                    >
                      <Text
                        style={
                          styles.birthdayLabel
                        }
                      >
                        Birthday
                      </Text>

                      <Text
                        style={[
                          styles.birthdayValue,

                          !dateOfBirth &&
                            styles.birthdayPlaceholder,
                        ]}
                      >
                        {formatBirthdayForDisplay(
                          dateOfBirth
                        )}
                      </Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color={
                        COLORS.lightMuted
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* ================================================
                    GENDER
                ================================================ */}

                <View
                  style={
                    styles.optionSection
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
                      styles.genderContainer
                    }
                  >
                    {GENDERS.map(
                      option => {
                        const active =
                          gender ===
                          option;

                        return (
                          <TouchableOpacity
                            key={
                              option
                            }
                            style={[
                              styles.genderButton,

                              active &&
                                styles.genderButtonActive,
                            ]}
                            activeOpacity={
                              0.8
                            }
                            disabled={
                              saving ||
                              photoBusy
                            }
                            onPress={() =>
                              setGender(
                                option
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.genderButtonText,

                                active &&
                                  styles.genderButtonTextActive,
                              ]}
                            >
                              {
                                option
                              }
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>
              </View>

              {/* ==================================================
                  ADDRESS
              ================================================== */}

              <SectionHeader
                icon="location-on"
                title="Address"
                subtitle="Used for your profile and nearby blood request features."
              />

              <View
                style={
                  styles.card
                }
              >
                <Field
                  label="Barangay"
                  value={
                    barangay
                  }
                  placeholder="Enter barangay"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setBarangay
                  }
                />

                <Field
                  label="City / Municipality"
                  value={
                    city
                  }
                  placeholder="Enter city or municipality"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setCity
                  }
                />

                <Field
                  label="Province"
                  value={
                    province
                  }
                  placeholder="Enter province"
                  editable={
                    !saving &&
                    !photoBusy
                  }
                  onChangeText={
                    setProvince
                  }
                  last
                />

                {addressChanged ? (
                  <View
                    style={
                      styles.locationNotice
                    }
                  >
                    <View
                      style={
                        styles.locationNoticeIcon
                      }
                    >
                      <MaterialIcons
                        name="location-off"
                        size={18}
                        color={
                          COLORS.orange
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.locationNoticeText
                      }
                    >
                      Your address changed. Your previous GPS coordinates will be cleared so they do not conflict with the new address.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ==================================================
                  BLOOD TYPE
              ================================================== */}

              <SectionHeader
                icon="bloodtype"
                title="Blood Type"
                subtitle={
                  isApprovedDonor
                    ? 'Verified through your approved donor application.'
                    : 'Add it only with proof. Not tested yet? Get typed at your local Red Cross chapter, hospital or health center.'
                }
              />

              <View
                style={
                  styles.card
                }
              >
                {isApprovedDonor ? (
                  <View
                    style={
                      styles.verifiedBloodContainer
                    }
                  >
                    <View
                      style={
                        styles.verifiedBloodIcon
                      }
                    >
                      <MaterialIcons
                        name="bloodtype"
                        size={23}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.verifiedBloodContent
                      }
                    >
                      <Text
                        style={
                          styles.verifiedBloodLabel
                        }
                      >
                        Verified Blood Type
                      </Text>

                      <Text
                        style={
                          styles.verifiedBloodValue
                        }
                      >
                        {verifiedDonorBloodType ||
                          bloodType ||
                          'Not available'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.verifiedBadge
                      }
                    >
                      <MaterialIcons
                        name="verified"
                        size={14}
                        color={
                          COLORS.green
                        }
                      />

                      <Text
                        style={
                          styles.verifiedBadgeText
                        }
                      >
                        Verified
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={
                      styles.bloodTypeGrid
                    }
                  >
                    {BLOOD_TYPES.map(
                      type => {
                        const selected =
                          bloodType ===
                          type;

                        return (
                          <TouchableOpacity
                            key={
                              type
                            }
                            style={[
                              styles.bloodTypeButton,

                              selected &&
                                styles.bloodTypeButtonSelected,
                            ]}
                            activeOpacity={
                              0.8
                            }
                            disabled={
                              saving ||
                              photoBusy
                            }
                            onPress={() => {
                              setBloodType(
                                selected
                                  ? ''
                                  : type
                              );

                              if (selected) {
                                setBloodTypeProof(
                                  null
                                );
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.bloodTypeText,

                                selected &&
                                  styles.bloodTypeTextSelected,
                              ]}
                            >
                              {
                                type
                              }
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                )}

                {!isApprovedDonor &&
                bloodType ? (
                  <BloodTypeProofField
                    image={bloodTypeProof}
                    proofOnFile={
                      proofOnFile &&
                      bloodType ===
                        savedBloodType
                    }
                    required={
                      bloodType !==
                      savedBloodType
                    }
                    disabled={
                      saving ||
                      photoBusy
                    }
                    onChange={
                      setBloodTypeProof
                    }
                    onError={message =>
                      showMessage(
                        'Photo Not Added',
                        message
                      )
                    }
                  />
                ) : null}
              </View>

              {/* ==================================================
                  PROFILE PHOTO
              ================================================== */}

              <SectionHeader
                icon="photo-camera"
                title="Profile Photo"
                subtitle="Choose a photo that will appear on your Hemo-Hero profile."
              />

              <View
                style={
                  styles.photoCard
                }
              >
                {profilePhotoUrl ? (
                  <Image
                    source={{
                      uri:
                        profilePhotoUrl,
                    }}
                    style={
                      styles.profilePhotoPreview
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={
                      styles.photoIcon
                    }
                  >
                    <MaterialIcons
                      name="person"
                      size={24}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>
                )}

                <View
                  style={
                    styles.photoContent
                  }
                >
                  <Text
                    style={
                      styles.photoTitle
                    }
                  >
                    {profilePhotoUrl
                      ? 'Profile Photo'
                      : 'Add Profile Photo'}
                  </Text>

                  <Text
                    style={
                      styles.photoDescription
                    }
                  >
                    JPG, PNG or WEBP. Maximum 5 MB.
                  </Text>

                  <View
                    style={
                      styles.photoActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.photoActionButton
                      }
                      activeOpacity={
                        0.8
                      }
                      disabled={
                        photoBusy ||
                        saving
                      }
                      onPress={
                        handleChooseProfilePhoto
                      }
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={15}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.photoActionText
                        }
                      >
                        {photoBusy
                          ? 'Please wait...'
                          : profilePhotoUrl
                            ? 'Change'
                            : 'Choose Photo'}
                      </Text>
                    </TouchableOpacity>

                    {profilePhotoUrl ? (
                      <TouchableOpacity
                        style={
                          styles.removePhotoButton
                        }
                        activeOpacity={
                          0.8
                        }
                        disabled={
                          photoBusy ||
                          saving
                        }
                        onPress={
                          handleRemoveProfilePhoto
                        }
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={15}
                          color={
                            COLORS.muted
                          }
                        />

                        <Text
                          style={
                            styles.removePhotoText
                          }
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* ==================================================
                  SAVE
              ================================================== */}

              <TouchableOpacity
                style={[
                  styles.saveButton,

                  (
                    saving ||
                    photoBusy
                  ) &&
                    styles.saveButtonDisabled,
                ]}
                activeOpacity={
                  0.85
                }
                disabled={
                  saving ||
                  photoBusy
                }
                onPress={
                  handleSave
                }
              >
                <MaterialIcons
                  name="check"
                  size={20}
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {saving
                    ? 'Saving Changes...'
                    : photoBusy
                      ? 'Updating Photo...'
                      : 'Save Changes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                activeOpacity={
                  0.7
                }
                disabled={
                  saving ||
                  photoBusy
                }
                onPress={() =>
                  router.back()
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* ======================================================
          BIRTHDAY CALENDAR MODAL
      ====================================================== */}

      <Modal
        visible={
          showBirthdayPicker
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeBirthdayPicker
        }
      >
        <View
          style={
            styles.calendarOverlay
          }
        >
          <TouchableOpacity
            style={
              styles.calendarBackdrop
            }
            activeOpacity={1}
            onPress={
              closeBirthdayPicker
            }
          />

          <View
            style={
              styles.calendarModal
            }
          >
            {/* ==================================================
                TITLE
            ================================================== */}

            <View
              style={
                styles.calendarTitleRow
              }
            >
              <View>
                <Text
                  style={
                    styles.calendarTitle
                  }
                >
                  Select Date
                </Text>

                <Text
                  style={
                    styles.calendarSubtitle
                  }
                >
                  Choose your date of birth
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.calendarClose
                }
                activeOpacity={
                  0.75
                }
                onPress={
                  closeBirthdayPicker
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

            {/* ==================================================
                MONTH NAVIGATION
            ================================================== */}

            <View
              style={
                styles.calendarMonthRow
              }
            >
              <TouchableOpacity
                style={
                  styles.calendarArrow
                }
                activeOpacity={
                  0.75
                }
                onPress={
                  goPreviousMonth
                }
              >
                <MaterialIcons
                  name="chevron-left"
                  size={22}
                  color={
                    COLORS.red
                  }
                />
              </TouchableOpacity>

              <View
                style={
                  styles.calendarMonthCenter
                }
              >
                <Text
                  style={
                    styles.calendarMonthText
                  }
                >
                  {
                    MONTH_NAMES[
                      calendarMonth
                        .getMonth()
                    ]
                  }
                </Text>

                <TouchableOpacity
                  style={[
                    styles.calendarYearButton,

                    showYearPicker &&
                      styles.calendarYearButtonActive,
                  ]}
                  activeOpacity={
                    0.75
                  }
                  onPress={
                    toggleYearPicker
                  }
                >
                  <Text
                    style={
                      styles.calendarYearText
                    }
                  >
                    {calendarMonth
                      .getFullYear()}
                  </Text>

                  <MaterialIcons
                    name={
                      showYearPicker
                        ? 'keyboard-arrow-up'
                        : 'keyboard-arrow-down'
                    }
                    size={17}
                    color={
                      COLORS.redButton
                    }
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.calendarArrow,

                  !canGoNextMonth() &&
                    styles.calendarArrowDisabled,
                ]}
                activeOpacity={
                  0.75
                }
                disabled={
                  !canGoNextMonth()
                }
                onPress={
                  goNextMonth
                }
              >
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={
                    canGoNextMonth()
                      ? COLORS.red
                      : '#C9C9CD'
                  }
                />
              </TouchableOpacity>
            </View>

            {/* ==================================================
                YEAR PICKER
            ================================================== */}

            {showYearPicker ? (
              <View
                style={
                  styles.calendarYearPicker
                }
              >
                <Text
                  style={
                    styles.calendarYearPickerTitle
                  }
                >
                  Select Year
                </Text>

                <ScrollView
                  style={
                    styles.calendarYearList
                  }
                  contentContainerStyle={
                    styles.calendarYearListContent
                  }
                  showsVerticalScrollIndicator={
                    true
                  }
                  nestedScrollEnabled
                >
                  {birthYears.map(
                    year => {
                      const selectedYear =
                        calendarMonth
                          .getFullYear() ===
                        year;

                      return (
                        <TouchableOpacity
                          key={
                            year
                          }
                          style={[
                            styles.calendarYearOption,

                            selectedYear &&
                              styles.calendarYearOptionSelected,
                          ]}
                          activeOpacity={
                            0.75
                          }
                          onPress={() =>
                            selectCalendarYear(
                              year
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.calendarYearOptionText,

                              selectedYear &&
                                styles.calendarYearOptionTextSelected,
                            ]}
                          >
                            {
                              year
                            }
                          </Text>

                          {selectedYear ? (
                            <MaterialIcons
                              name="check"
                              size={17}
                              color={
                                COLORS.white
                              }
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>
            ) : null}

            {!showYearPicker ? (
              <>
                {/* ==============================================
                    WEEKDAYS
                ============================================== */}

                <View
                  style={
                    styles.weekRow
                  }
                >
                  {WEEK_DAYS.map(
                    (
                      day,
                      index
                    ) => (
                      <View
                        key={`${day}-${index}`}
                        style={
                          styles.weekCell
                        }
                      >
                        <Text
                          style={
                            styles.weekText
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

                {/* ==============================================
                    DAYS
                ============================================== */}

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
                              styles.calendarDayCell
                            }
                          />
                        );
                      }

                      const currentDate =
                        new Date(
                          calendarMonth
                            .getFullYear(),

                          calendarMonth
                            .getMonth(),

                          day
                        );

                      const selected =
                        isSameDate(
                          currentDate,
                          birthdayDraft
                        );

                      const future =
                        isFutureDate(
                          currentDate
                        );

                      return (
                        <View
                          key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}-${day}`}
                          style={
                            styles.calendarDayCell
                          }
                        >
                          <TouchableOpacity
                            style={[
                              styles.calendarDayButton,

                              selected &&
                                styles.calendarDaySelected,
                            ]}
                            activeOpacity={
                              0.75
                            }
                            disabled={
                              future
                            }
                            onPress={() =>
                              selectCalendarDay(
                                day
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.calendarDayText,

                                future &&
                                  styles.calendarDayDisabled,

                                selected &&
                                  styles.calendarDaySelectedText,
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
              </>
            ) : null}

            {/* ==================================================
                SELECTED DATE
            ================================================== */}

            <View
              style={
                styles.calendarSelectedInfo
              }
            >
              <MaterialIcons
                name="event"
                size={17}
                color={
                  COLORS.redButton
                }
              />

              <Text
                style={
                  styles.calendarSelectedLabel
                }
              >
                Selected:
              </Text>

              <Text
                style={
                  styles.calendarSelectedValue
                }
              >
                {birthdayDraft
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
                  )}
              </Text>
            </View>

            {/* ==================================================
                CONFIRM
            ================================================== */}

            <TouchableOpacity
              style={
                styles.confirmDateButton
              }
              activeOpacity={
                0.85
              }
              onPress={
                confirmBirthday
              }
            >
              <Text
                style={
                  styles.confirmDateText
                }
              >
                Confirm Date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================
          HEMO-HERO ACTION POPUP
      ====================================================== */}

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
                  'success' &&
                  styles.actionPopupIconSuccess,

                actionPopup.variant ===
                  'warning' &&
                  styles.actionPopupIconWarning,

                (
                  actionPopup.variant ===
                    'danger' ||
                  actionPopup.variant ===
                    'error'
                ) &&
                  styles.actionPopupIconDanger,
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
                      : (
                            actionPopup.variant ===
                              'danger' ||
                            actionPopup.variant ===
                              'error'
                          )
                        ? 'error-outline'
                        : 'info-outline'
                }
                size={31}
                color={
                  actionPopup.variant ===
                  'success'
                    ? COLORS.green
                    : actionPopup.variant ===
                        'warning'
                      ? COLORS.orange
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
                  activeOpacity={
                    0.82
                  }
                  onPress={
                    closeActionPopup
                  }
                >
                  <Text
                    style={
                      styles.actionPopupSecondaryText
                    }
                  >
                    {
                      actionPopup.cancelText
                    }
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.actionPopupPrimaryButton,

                  actionPopup.variant ===
                    'success' &&
                    styles.actionPopupPrimarySuccess,

                  actionPopup.variant ===
                    'danger' &&
                    styles.actionPopupPrimaryDanger,
                ]}
                activeOpacity={
                  0.85
                }
                onPress={() => {
                  const action =
                    actionPopup.onConfirm;

                  closeActionPopup();

                  if (
                    action
                  ) {
                    action();
                  }
                }}
              >
                <Text
                  style={
                    styles.actionPopupPrimaryText
                  }
                >
                  {
                    actionPopup.confirmText
                  }
                </Text>
              </TouchableOpacity>
            </View>
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
        onPicked={
          handlePhotoPicked
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
// SECTION HEADER
// ============================================================

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  title:
    string;

  subtitle:
    string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={
          styles.sectionTitleRow
        }
      >
        <MaterialIcons
          name={
            icon
          }
          size={17}
          color={
            COLORS.redButton
          }
        />

        <Text
          style={
            styles.sectionTitle
          }
        >
          {
            title
          }
        </Text>
      </View>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {
          subtitle
        }
      </Text>
    </View>
  );
}

// ============================================================
// INPUT FIELD
// ============================================================

type FieldProps = {
  label:
    string;

  value:
    string;

  placeholder:
    string;

  editable:
    boolean;

  onChangeText:
    (
      value:
        string
    ) => void;

  keyboardType?:
    | 'default'
    | 'phone-pad'
    | 'numbers-and-punctuation';

  // 'none' for the username.
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words';

  // Under the input (e.g. the username rule).
  hint?: string;

  last?:
    boolean;
};

function Field({
  label,
  value,
  placeholder,
  editable,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize,
  hint,
  last = false,
}: FieldProps) {
  return (
    <View
      style={[
        styles.fieldContainer,

        last &&
          styles.fieldContainerLast,
      ]}
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {
          label
        }
      </Text>

      <TextInput
        style={
          styles.input
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#9A9A9A"
        editable={
          editable
        }
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={
          false
        }
        onChangeText={
          onChangeText
        }
      />

      {hint ? (
        <Text
          style={
            styles.fieldHint
          }
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // GENERAL
    // ========================================================

    flex: {
      flex:
        1,
    },

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
          ? '#242424'
          : COLORS.page,
    },

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
        COLORS.page,
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingSafeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },

    loadingContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    loadingIcon: {
      width:
        66,

      height:
        66,

      marginBottom:
        16,

      borderRadius:
        33,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    loadingTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        15,
    },

    loadingText: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      textAlign:
        'center',
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        82,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        170,

      height:
        170,

      borderRadius:
        85,

      top:
        -115,

      left:
        -90,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      top:
        -120,

      right:
        -95,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerButton: {
      width:
        44,

      height:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerRightSpacer: {
      width:
        44,

      height:
        44,
    },

    headerCenter: {
      flex:
        1,

      alignItems:
        'center',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,

      lineHeight:
        26,
    },

    headerSubtitle: {
      marginTop:
        1,

      color:
        'rgba(255,255,255,0.8)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },

    // paddingBottom is set inline: it includes the home bar.
    contentContainer: {
      paddingHorizontal:
        18,

      paddingTop:
        20,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      minHeight:
        58,

      marginBottom:
        20,

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,

      borderWidth:
        1,

      borderColor:
        '#ECB0B2',

      borderRadius:
        14,

      backgroundColor:
        COLORS.pinkSoft,
    },

    errorIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    errorText: {
      flex:
        1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    // ========================================================
    // SECTION HEADERS
    // ========================================================

    sectionHeader: {
      marginLeft:
        2,

      marginBottom:
        9,
    },

    sectionTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,

      lineHeight:
        20,
    },

    sectionSubtitle: {
      marginTop:
        3,

      marginLeft:
        23,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      marginBottom:
        22,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        5,

      elevation:
        1,
    },

    // ========================================================
    // FIELDS
    // ========================================================

    fieldContainer: {
      paddingTop:
        14,

      paddingBottom:
        15,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        COLORS.border,
    },

    fieldContainerLast: {
      paddingTop:
        14,

      paddingBottom:
        15,

      borderBottomWidth:
        0,
    },

    fieldLabel: {
      marginBottom:
        7,

      color:
        '#444449',

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12.5,
    },

    fieldHint: {
      marginTop: 5,
      color: '#8A8A8A',
      fontFamily: 'Inter_400Regular',
      fontSize: 11.5,
    },

    input: {
      height:
        44,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        '#DDDDE2',

      borderRadius:
        11,

      color:
        COLORS.black,

      backgroundColor:
        '#FCFCFD',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,
    },

    // ========================================================
    // BIRTHDAY FIELD
    // ========================================================

    birthdayButton: {
      minHeight:
        58,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        '#DDDDE2',

      borderRadius:
        12,

      backgroundColor:
        '#FCFCFD',
    },

    birthdayIcon: {
      width:
        38,

      height:
        38,

      marginRight:
        10,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    birthdayContent: {
      flex:
        1,
    },

    birthdayLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    birthdayValue: {
      marginTop:
        2,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    birthdayPlaceholder: {
      color:
        COLORS.lightMuted,
    },

    // ========================================================
    // READ ONLY
    // ========================================================

    readOnlyInput: {
      height:
        45,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        11,

      backgroundColor:
        COLORS.graySoft,
    },

    readOnlyText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13,
    },

    // ========================================================
    // GENDER
    // ========================================================

    optionSection: {
      paddingTop:
        14,

      paddingBottom:
        15,
    },

    genderContainer: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        8,
    },

    genderButton: {
      minHeight:
        39,

      paddingHorizontal:
        14,

      borderWidth:
        1,

      borderColor:
        '#DEDEE2',

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    genderButtonActive: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.pinkSoft,
    },

    genderButtonText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13,
    },

    genderButtonTextActive: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // LOCATION
    // ========================================================

    locationNotice: {
      marginTop:
        2,

      marginBottom:
        14,

      paddingHorizontal:
        11,

      paddingVertical:
        10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      borderRadius:
        12,

      backgroundColor:
        COLORS.orangeSoft,
    },

    locationNoticeIcon: {
      width:
        31,

      height:
        31,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    locationNoticeText: {
      flex:
        1,

      color:
        '#875622',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    // ========================================================
    // BLOOD TYPE
    // ========================================================

    bloodTypeGrid: {
      paddingVertical:
        15,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      rowGap:
        9,
    },

    bloodTypeButton: {
      width:
        '23%',

      height:
        41,

      borderWidth:
        1,

      borderColor:
        '#DDDDE1',

      borderRadius:
        11,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    bloodTypeButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    bloodTypeText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    bloodTypeTextSelected: {
      color:
        COLORS.white,
    },

    // ========================================================
    // VERIFIED BLOOD TYPE
    // ========================================================

    verifiedBloodContainer: {
      minHeight:
        76,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    verifiedBloodIcon: {
      width:
        42,

      height:
        42,

      marginRight:
        11,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    verifiedBloodContent: {
      flex:
        1,
    },

    verifiedBloodLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    verifiedBloodValue: {
      marginTop:
        1,

      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        16,

      lineHeight:
        21,
    },

    verifiedBadge: {
      minHeight:
        27,

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      borderRadius:
        14,

      backgroundColor:
        COLORS.greenSoft,
    },

    verifiedBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    // ========================================================
    // PROFILE PHOTO
    // ========================================================

    photoCard: {
      minHeight:
        104,

      marginBottom:
        22,

      paddingHorizontal:
        14,

      paddingVertical:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        5,

      elevation:
        1,
    },

    profilePhotoPreview: {
      width:
        68,

      height:
        68,

      marginRight:
        13,

      borderRadius:
        34,

      backgroundColor:
        COLORS.graySoft,
    },

    photoIcon: {
      width:
        68,

      height:
        68,

      marginRight:
        13,

      borderRadius:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    photoContent: {
      flex:
        1,

      minWidth:
        0,
    },

    photoTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    photoDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    photoActions: {
      marginTop:
        9,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        7,
    },

    photoActionButton: {
      minHeight:
        31,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderWidth:
        1,

      borderColor:
        '#E8C4C5',

      borderRadius:
        9,

      backgroundColor:
        COLORS.pinkSoft,
    },

    photoActionText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12.5,
    },

    removePhotoButton: {
      minHeight:
        31,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        9,

      backgroundColor:
        COLORS.white,
    },

    removePhotoText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,
    },

    // ========================================================
    // SAVE
    // ========================================================

    saveButton: {
      height:
        50,

      borderRadius:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,

      backgroundColor:
        COLORS.redButton,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.1,

      shadowRadius:
        5,

      elevation:
        3,
    },

    saveButtonDisabled: {
      opacity:
        0.55,
    },

    saveButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    cancelButton: {
      height:
        46,

      marginTop:
        6,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cancelButtonText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13.5,
    },

    // ========================================================
    // CALENDAR MODAL
    // ========================================================

    calendarOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        16,
    },

    calendarBackdrop: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(0,0,0,0.42)',
    },

    calendarModal: {
      width:
        '100%',

      maxWidth:
        380,

      paddingHorizontal:
        18,

      paddingTop:
        18,

      paddingBottom:
        20,

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
        0.18,

      shadowRadius:
        22,

      elevation:
        12,
    },

    // ========================================================
    // CALENDAR TITLE
    // ========================================================

    calendarTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        15,
    },

    calendarTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        17,
    },

    calendarSubtitle: {
      marginTop:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    calendarClose: {
      width:
        38,

      height:
        38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5F5F6',
    },

    // ========================================================
    // MONTH
    // ========================================================

    calendarMonthRow: {
      marginTop:
        2,

      marginBottom:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    calendarArrow: {
      width:
        40,

      height:
        40,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    calendarArrowDisabled: {
      backgroundColor:
        '#F5F5F6',
    },

    calendarMonthCenter: {
      flex:
        1,

      marginHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,
    },

    calendarMonthText: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    calendarYearButton: {
      minWidth:
        76,

      height:
        34,

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        2,

      borderWidth:
        1,

      borderColor:
        '#E7C5C7',

      borderRadius:
        10,

      backgroundColor:
        COLORS.pinkSoft,
    },

    calendarYearButtonActive: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        '#FFE8E9',
    },

    calendarYearText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12.5,
    },

    // ========================================================
    // YEAR PICKER
    // ========================================================

    calendarYearPicker: {
      marginTop:
        4,

      marginBottom:
        12,

      padding:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        14,

      backgroundColor:
        '#FCFCFD',
    },

    calendarYearPickerTitle: {
      marginBottom:
        7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,

      textAlign:
        'center',
    },

    calendarYearList: {
      maxHeight:
        190,
    },

    calendarYearListContent: {
      paddingBottom:
        2,

      gap:
        5,
    },

    calendarYearOption: {
      minHeight:
        38,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,
    },

    calendarYearOptionSelected: {
      backgroundColor:
        COLORS.redButton,
    },

    calendarYearOptionText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    calendarYearOptionTextSelected: {
      color:
        COLORS.white,
    },

    // ========================================================
    // WEEK DAYS
    // ========================================================

    weekRow: {
      flexDirection:
        'row',

      marginBottom:
        4,
    },

    weekCell: {
      width:
        `${100 / 7}%`,

      height:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    weekText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11.5,
    },

    // ========================================================
    // CALENDAR GRID
    // ========================================================

    calendarGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',
    },

    calendarDayCell: {
      width:
        `${100 / 7}%`,

      height:
        42,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    calendarDayButton: {
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
    },

    calendarDaySelected: {
      backgroundColor:
        COLORS.red,
    },

    calendarDayText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    calendarDayDisabled: {
      color:
        '#C6C6CA',
    },

    calendarDaySelectedText: {
      color:
        COLORS.white,
    },

    // ========================================================
    // SELECTED DATE
    // ========================================================

    calendarSelectedInfo: {
      minHeight:
        40,

      marginTop:
        8,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        11,

      backgroundColor:
        COLORS.pinkSoft,
    },

    calendarSelectedLabel: {
      marginLeft:
        7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    calendarSelectedValue: {
      marginLeft:
        4,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    // ========================================================
    // CONFIRM DATE
    // ========================================================

    confirmDateButton: {
      height:
        47,

      marginTop:
        14,

      borderRadius:
        11,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    confirmDateText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    // ========================================================
    // HEMO-HERO ACTION POPUP
    // ========================================================

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
        COLORS.pinkSoft,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        COLORS.greenSoft,
    },

    actionPopupIconWarning: {
      backgroundColor:
        COLORS.orangeSoft,
    },

    actionPopupIconDanger: {
      backgroundColor:
        COLORS.pinkSoft,
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

    actionPopupActions: {
      marginTop:
        19,

      flexDirection:
        'row',

      gap:
        9,
    },

    actionPopupActionsSingle: {
      justifyContent:
        'center',
    },

    actionPopupSecondaryButton: {
      flex:
        1,

      height:
        45,

      borderWidth:
        1,

      borderColor:
        '#E5CCCC',

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    actionPopupSecondaryText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    actionPopupPrimaryButton: {
      flex:
        1,

      minWidth:
        128,

      height:
        45,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupPrimarySuccess: {
      backgroundColor:
        COLORS.green,
    },

    actionPopupPrimaryDanger: {
      backgroundColor:
        COLORS.redButton,
    },

    actionPopupPrimaryText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },
  });