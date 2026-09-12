import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  KeyboardAvoidingView,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  getCurrentUser,
  updateProfile,
} from '../lib/api';

import {
  getMyDonorApplication,
} from '../lib/donorApplication';

import type {
  DonorApplication,
} from '../lib/donorApplication';

import {
  getAccessToken,
} from '../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#D31217',
  redDark: '#8F1014',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#1D1D1F',

  page: '#F7F7F8',
  card: '#FFFFFF',

  muted: '#6E6E73',
  lightMuted: '#A0A0A5',

  border: '#ECECEF',

  pinkSoft: '#FFF1F2',

  green: '#178B49',
  greenSoft: '#EAF7EF',

  orange: '#DD7A20',
  orangeSoft: '#FFF3E7',

  graySoft: '#F2F2F4',
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

// ============================================================
// EDIT PROFILE SCREEN
// ============================================================

export default function EditProfileScreen() {
  // ==========================================================
  // DATA
  // ==========================================================

  const [
    originalProfile,
    setOriginalProfile,
  ] = useState<any>(null);

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
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    firstName,
    setFirstName,
  ] = useState('');

  const [
    middleName,
    setMiddleName,
  ] = useState('');

  const [
    lastName,
    setLastName,
  ] = useState('');

  const [
    suffix,
    setSuffix,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    dateOfBirth,
    setDateOfBirth,
  ] = useState('');

  const [
    gender,
    setGender,
  ] = useState('');

  const [
    barangay,
    setBarangay,
  ] = useState('');

  const [
    city,
    setCity,
  ] = useState('');

  const [
    province,
    setProvince,
  ] = useState('');

  const [
    bloodType,
    setBloodType,
  ] = useState('');

  // ==========================================================
  // DONOR STATE
  // ==========================================================

  const isApprovedDonor =
    donorApplication?.status ===
    'approved';

  const verifiedDonorBloodType =
    donorApplication?.blood_type ||
    '';

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile =
    useCallback(async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const accessToken =
          await getAccessToken();

        if (!accessToken) {
          router.replace('/');
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
            ).catch(() => ({
              application:
                null,
            })),
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

        setFirstName(
          user.first_name || ''
        );

        setMiddleName(
          user.middle_name || ''
        );

        setLastName(
          user.last_name || ''
        );

        setSuffix(
          user.suffix || ''
        );

        setPhone(
          user.phone || ''
        );

        setDateOfBirth(
          user.date_of_birth || ''
        );

        setGender(
          user.gender || ''
        );

        setBarangay(
          user.barangay || ''
        );

        setCity(
          user.city || ''
        );

        setProvince(
          user.province || ''
        );

        if (
          application?.status ===
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
      } catch (error) {
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
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ==========================================================
  // DISPLAY DATA
  // ==========================================================

  const email =
    originalProfile?.email ||
    '';

  // ==========================================================
  // ADDRESS CHANGED
  // ==========================================================

  const addressChanged =
    useMemo(() => {
      if (!originalProfile) {
        return false;
      }

      const oldBarangay =
        String(
          originalProfile
            .barangay || ''
        ).trim();

      const oldCity =
        String(
          originalProfile
            .city || ''
        ).trim();

      const oldProvince =
        String(
          originalProfile
            .province || ''
        ).trim();

      return (
        barangay.trim() !==
          oldBarangay ||
        city.trim() !==
          oldCity ||
        province.trim() !==
          oldProvince
      );
    }, [
      barangay,
      city,
      province,
      originalProfile,
    ]);

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !==
        'undefined'
    ) {
      window.alert(
        `${title}\n\n${message}`
      );

      return;
    }

    Alert.alert(
      title,
      message
    );
  }

  // ==========================================================
  // DATE VALIDATION
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

  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSave() {
    if (saving) {
      return;
    }

    setErrorMessage('');

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

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // DATE OF BIRTH
    // --------------------------------------------------------

    if (!cleanDate) {
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
        'Enter your birthday using YYYY-MM-DD format.';

      setErrorMessage(
        message
      );

      showMessage(
        'Invalid Birthday',
        message
      );

      return;
    }

    // --------------------------------------------------------
    // GENDER
    // --------------------------------------------------------

    if (!gender) {
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

    // --------------------------------------------------------
    // ADDRESS
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    try {
      setSaving(true);

      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        router.replace('/');
        return;
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
          phone.trim() ||
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

      // ------------------------------------------------------
      // VERIFIED DONOR BLOOD TYPE
      // ------------------------------------------------------

      if (!isApprovedDonor) {
        payload.blood_type =
          bloodType || null;
      }

      // ------------------------------------------------------
      // LOCATION CHANGED
      // ------------------------------------------------------

      if (addressChanged) {
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
          'Your profile was updated successfully.'
      );

      router.back();
    } catch (error) {
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
      setSaving(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
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
          edges={[
            'top',
            'bottom',
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
                '#D9191E',
                COLORS.redDark,
              ]}
              style={
                styles.header
              }
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

              <TouchableOpacity
                style={
                  styles.headerButton
                }
                activeOpacity={
                  0.7
                }
                disabled={
                  saving
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

              {/* Keeps title centered */}
              <View
                style={
                  styles.headerRightSpacer
                }
              />
            </LinearGradient>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <ScrollView
              style={
                styles.content
              }
              contentContainerStyle={
                styles.contentContainer
              }
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
                    {errorMessage}
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
                      {email}
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
                    !saving
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
                    !saving
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
                    !saving
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
                    !saving
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
                  label="Phone Number"
                  value={
                    phone
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  editable={
                    !saving
                  }
                  onChangeText={
                    setPhone
                  }
                />

                <Field
                  label="Date of Birth"
                  value={
                    dateOfBirth
                  }
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  editable={
                    !saving
                  }
                  onChangeText={value =>
                    setDateOfBirth(
                      value
                        .replace(
                          /[^0-9-]/g,
                          ''
                        )
                        .slice(
                          0,
                          10
                        )
                    )
                  }
                />

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
                              saving
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
                              {option}
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
                    !saving
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
                    !saving
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
                    !saving
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
                    : 'Select your blood type if you know it.'
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
                              saving
                            }
                            onPress={() =>
                              setBloodType(
                                selected
                                  ? ''
                                  : type
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.bloodTypeText,

                                selected &&
                                  styles.bloodTypeTextSelected,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                )}
              </View>

              {/* ==================================================
                  PROFILE PHOTO
              ================================================== */}

              <SectionHeader
                icon="photo-camera"
                title="Profile Photo"
                subtitle="Profile image upload will be connected next."
              />

              <TouchableOpacity
                style={
                  styles.photoCard
                }
                activeOpacity={
                  0.7
                }
                onPress={() =>
                  showMessage(
                    'Profile Photo',
                    'Profile photo upload will be connected next.'
                  )
                }
              >
                <View
                  style={
                    styles.photoIcon
                  }
                >
                  <MaterialIcons
                    name="photo-camera"
                    size={22}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

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
                    Change Profile Photo
                  </Text>

                  <Text
                    style={
                      styles.photoDescription
                    }
                  >
                    Choose a photo for your Hemo-Hero profile.
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color="#B5B5BA"
                />
              </TouchableOpacity>

              {/* ==================================================
                  SAVE CHANGES
              ================================================== */}

              <TouchableOpacity
                style={[
                  styles.saveButton,

                  saving &&
                    styles.saveButtonDisabled,
                ]}
                activeOpacity={
                  0.85
                }
                disabled={
                  saving
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
                  saving
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

  title: string;

  subtitle: string;
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
          name={icon}
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
          {title}
        </Text>
      </View>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}

// ============================================================
// INPUT FIELD
// ============================================================

type FieldProps = {
  label: string;

  value: string;

  placeholder: string;

  editable: boolean;

  onChangeText:
    (value: string) => void;

  keyboardType?:
    | 'default'
    | 'phone-pad'
    | 'numbers-and-punctuation';

  last?: boolean;
};

function Field({
  label,
  value,
  placeholder,
  editable,
  onChangeText,
  keyboardType = 'default',
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
        {label}
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
        placeholderTextColor="#A0A0A5"
        editable={
          editable
        }
        keyboardType={
          keyboardType
        }
        autoCorrect={
          false
        }
        onChangeText={
          onChangeText
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
    // GENERAL
    // ========================================================

    flex: {
      flex: 1,
    },

    desktopBackground: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

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

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingSafeArea: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,
    },

    loadingIcon: {
      width: 66,

      height: 66,

      marginBottom: 16,

      borderRadius: 33,

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

      fontSize: 16,
    },

    loadingText: {
      marginTop: 5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10.5,

      textAlign:
        'center',
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height: 82,

      paddingHorizontal: 14,

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

      width: 170,

      height: 170,

      borderRadius: 85,

      top: -115,

      left: -90,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width: 180,

      height: 180,

      borderRadius: 90,

      top: -120,

      right: -95,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerButton: {
      width: 44,

      height: 44,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerRightSpacer: {
      width: 44,

      height: 44,
    },

    headerCenter: {
      flex: 1,

      alignItems:
        'center',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 18,

      lineHeight: 23,
    },

    headerSubtitle: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.8)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal: 18,

      paddingTop: 20,

      paddingBottom: 36,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      minHeight: 58,

      marginBottom: 20,

      paddingHorizontal: 12,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,

      borderWidth: 1,

      borderColor:
        '#ECB0B2',

      borderRadius: 14,

      backgroundColor:
        COLORS.pinkSoft,
    },

    errorIcon: {
      width: 36,

      height: 36,

      borderRadius: 18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    errorText: {
      flex: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10.5,

      lineHeight: 15,
    },

    // ========================================================
    // SECTION HEADERS
    // ========================================================

    sectionHeader: {
      marginLeft: 2,

      marginBottom: 9,
    },

    sectionTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,

      lineHeight: 19,
    },

    sectionSubtitle: {
      marginTop: 3,

      marginLeft: 23,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 14,
    },

    // ========================================================
    // CARDS
    // ========================================================

    card: {
      marginBottom: 22,

      paddingHorizontal: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity: 0.04,

      shadowRadius: 5,

      elevation: 1,
    },

    // ========================================================
    // FIELDS
    // ========================================================

    fieldContainer: {
      paddingTop: 14,

      paddingBottom: 15,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        COLORS.border,
    },

    fieldContainerLast: {
      paddingTop: 14,

      paddingBottom: 15,

      borderBottomWidth: 0,
    },

    fieldLabel: {
      marginBottom: 7,

      color:
        '#444449',

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    input: {
      height: 44,

      paddingHorizontal: 13,

      borderWidth: 1,

      borderColor:
        '#DDDDE2',

      borderRadius: 11,

      color:
        COLORS.black,

      backgroundColor:
        '#FCFCFD',

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,
    },

    // ========================================================
    // READ ONLY EMAIL
    // ========================================================

    readOnlyInput: {
      height: 45,

      paddingHorizontal: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.graySoft,
    },

    readOnlyText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10.5,
    },

    // ========================================================
    // GENDER
    // ========================================================

    optionSection: {
      paddingTop: 14,

      paddingBottom: 15,
    },

    genderContainer: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap: 8,
    },

    genderButton: {
      minHeight: 39,

      paddingHorizontal: 14,

      borderWidth: 1,

      borderColor:
        '#DEDEE2',

      borderRadius: 20,

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

      fontSize: 10,
    },

    genderButtonTextActive: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // LOCATION NOTICE
    // ========================================================

    locationNotice: {
      marginTop: 2,

      marginBottom: 14,

      paddingHorizontal: 11,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 9,

      borderRadius: 12,

      backgroundColor:
        COLORS.orangeSoft,
    },

    locationNoticeIcon: {
      width: 31,

      height: 31,

      borderRadius: 16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    locationNoticeText: {
      flex: 1,

      color:
        '#875622',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      lineHeight: 14,
    },

    // ========================================================
    // BLOOD TYPE GRID
    // ========================================================

    bloodTypeGrid: {
      paddingVertical: 15,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      rowGap: 9,
    },

    bloodTypeButton: {
      width: '23%',

      height: 41,

      borderWidth: 1,

      borderColor:
        '#DDDDE1',

      borderRadius: 11,

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

      fontSize: 11,
    },

    bloodTypeTextSelected: {
      color:
        COLORS.white,
    },

    // ========================================================
    // VERIFIED BLOOD TYPE
    // ========================================================

    verifiedBloodContainer: {
      minHeight: 76,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    verifiedBloodIcon: {
      width: 42,

      height: 42,

      marginRight: 11,

      borderRadius: 21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    verifiedBloodContent: {
      flex: 1,
    },

    verifiedBloodLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
    },

    verifiedBloodValue: {
      marginTop: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 16,

      lineHeight: 21,
    },

    verifiedBadge: {
      minHeight: 27,

      paddingHorizontal: 9,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,

      borderRadius: 14,

      backgroundColor:
        COLORS.greenSoft,
    },

    verifiedBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9,
    },

    // ========================================================
    // PROFILE PHOTO
    // ========================================================

    photoCard: {
      minHeight: 76,

      marginBottom: 22,

      paddingHorizontal: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity: 0.04,

      shadowRadius: 5,

      elevation: 1,
    },

    photoIcon: {
      width: 40,

      height: 40,

      marginRight: 11,

      borderRadius: 20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    photoContent: {
      flex: 1,

      minWidth: 0,
    },

    photoTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    photoDescription: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 14,
    },

    // ========================================================
    // SAVE
    // ========================================================

    saveButton: {
      height: 50,

      borderRadius: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,

      backgroundColor:
        COLORS.redButton,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 3,
      },

      shadowOpacity: 0.1,

      shadowRadius: 5,

      elevation: 3,
    },

    saveButtonDisabled: {
      opacity: 0.55,
    },

    saveButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 12,
    },

    cancelButton: {
      height: 46,

      marginTop: 6,

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

      fontSize: 10.5,
    },
  });