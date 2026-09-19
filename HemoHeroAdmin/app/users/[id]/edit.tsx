import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  getAdminUserById,
  updateAdminUser,
  type AdminManagedUser,
  type AdminProfile,
} from '../../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../../lib/session';

// ============================================================
// IPAD PRO LANDSCAPE
// ============================================================

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer:
    '#02040A',

  navy:
    '#050B19',

  card:
    '#091126',

  cardLight:
    '#101A35',

  border:
    '#243554',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  green:
    '#35C982',

  orange:
    '#F3A34A',
};

// ============================================================
// GENDER OPTIONS
// ============================================================

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Prefer not to say',
] as const;

// ============================================================
// SCREEN
// ============================================================

export default function AdminEditUserScreen() {
  const {
    id,
  } =
    useLocalSearchParams<{
      id?: string;
    }>();

  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // RESPONSIVE TABLET FRAME
  // ==========================================================

  const tablet =
    useMemo(
      () => {
        if (
          Platform.OS !==
          'web'
        ) {
          return {
            width,
            height,

            scale:
              Math.min(
                width /
                  DESIGN_WIDTH,

                height /
                  DESIGN_HEIGHT
              ),
          };
        }

        const padding =
          24;

        const availableWidth =
          Math.max(
            width -
              padding * 2,

            320
          );

        const availableHeight =
          Math.max(
            height -
              padding * 2,

            320
          );

        const scale =
          Math.min(
            availableWidth /
              DESIGN_WIDTH,

            availableHeight /
              DESIGN_HEIGHT,

            1
          );

        return {
          width:
            DESIGN_WIDTH *
            scale,

          height:
            DESIGN_HEIGHT *
            scale,

          scale,
        };
      },
      [
        width,
        height,
      ]
    );

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  // ==========================================================
  // ADMIN
  // ==========================================================

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  // ==========================================================
  // USER
  // ==========================================================

  const [
    user,
    setUser,
  ] =
    useState<AdminManagedUser | null>(
      null
    );

  // ==========================================================
  // FORM
  // ==========================================================

  const [
    email,
    setEmail,
  ] =
    useState(
      ''
    );

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      ''
    );

  const [
    middleName,
    setMiddleName,
  ] =
    useState(
      ''
    );

  const [
    lastName,
    setLastName,
  ] =
    useState(
      ''
    );

  const [
    suffix,
    setSuffix,
  ] =
    useState(
      ''
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      ''
    );

  const [
    dateOfBirth,
    setDateOfBirth,
  ] =
    useState(
      ''
    );

  const [
    gender,
    setGender,
  ] =
    useState(
      ''
    );

  const [
    barangay,
    setBarangay,
  ] =
    useState(
      ''
    );

  const [
    city,
    setCity,
  ] =
    useState(
      ''
    );

  const [
    province,
    setProvince,
  ] =
    useState(
      ''
    );

  // ==========================================================
  // UI STATE
  // ==========================================================

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
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ''
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ''
    );

  // ==========================================================
  // LOAD
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadUser();
      },
      [
        id,
      ]
    )
  );

  async function loadUser() {
    try {
      setLoading(
        true
      );

      setErrorMessage(
        ''
      );

      setSuccessMessage(
        ''
      );

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        savedProfile?.role !==
          'admin'
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      if (
        !id ||
        typeof id !==
          'string'
      ) {
        setErrorMessage(
          'Invalid user ID.'
        );

        return;
      }

      setProfile(
        savedProfile
      );

      const result =
        await getAdminUserById(
          token,
          id
        );

      const loadedUser =
        result.user;

      setUser(
        loadedUser
      );

      setEmail(
        loadedUser.email ||
        ''
      );

      setFirstName(
        loadedUser.first_name ||
        ''
      );

      setMiddleName(
        loadedUser.middle_name ||
        ''
      );

      setLastName(
        loadedUser.last_name ||
        ''
      );

      setSuffix(
        loadedUser.suffix ||
        ''
      );

      setPhone(
        loadedUser.phone ||
        ''
      );

      setDateOfBirth(
        loadedUser.date_of_birth ||
        ''
      );

      setGender(
        loadedUser.gender ||
        ''
      );

      setBarangay(
        loadedUser.barangay ||
        ''
      );

      setCity(
        loadedUser.city ||
        ''
      );

      setProvince(
        loadedUser.province ||
        ''
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN EDIT USER LOAD ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to load user account.'
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  // ==========================================================
  // ADMIN DISPLAY
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(
        0
      )
      .toUpperCase();

  // ==========================================================
  // USER DISPLAY
  // ==========================================================

  const userName =
    user
      ? getUserDisplayName(
          user
        )
      : 'User';

  // ==========================================================
  // VALIDATE
  // ==========================================================

  function validateForm() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !firstName.trim()
    ) {
      return 'First name is required.';
    }

    if (
      !lastName.trim()
    ) {
      return 'Last name is required.';
    }

    if (
      !cleanEmail
    ) {
      return 'Email address is required.';
    }

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return 'Please enter a valid email address.';
    }

    if (
      dateOfBirth.trim() &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        dateOfBirth.trim()
      )
    ) {
      return 'Date of birth must use YYYY-MM-DD format.';
    }

    return null;
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSave() {
    if (
      saving ||
      !user
    ) {
      return;
    }

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setErrorMessage(
        validationError
      );

      return;
    }

    try {
      setSaving(
        true
      );

      const token =
        await getAdminAccessToken();

      if (
        !token
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      const result =
        await updateAdminUser(
          token,
          user.id,
          {
            email:
              email
                .trim()
                .toLowerCase(),

            first_name:
              firstName.trim(),

            middle_name:
              middleName.trim() ||
              null,

            last_name:
              lastName.trim(),

            suffix:
              suffix.trim() ||
              null,

            phone:
              phone.trim() ||
              null,

            date_of_birth:
              dateOfBirth.trim() ||
              null,

            gender:
              gender ||
              null,

            barangay:
              barangay.trim() ||
              null,

            city:
              city.trim() ||
              null,

            province:
              province.trim() ||
              null,
          }
        );

      setUser(
        result.user
      );

      setSuccessMessage(
        result.message ||
        'User account updated successfully.'
      );

      setEmail(
        result.user.email ||
        ''
      );

      setFirstName(
        result.user.first_name ||
        ''
      );

      setMiddleName(
        result.user.middle_name ||
        ''
      );

      setLastName(
        result.user.last_name ||
        ''
      );

      setSuffix(
        result.user.suffix ||
        ''
      );

      setPhone(
        result.user.phone ||
        ''
      );

      setDateOfBirth(
        result.user.date_of_birth ||
        ''
      );

      setGender(
        result.user.gender ||
        ''
      );

      setBarangay(
        result.user.barangay ||
        ''
      );

      setCity(
        result.user.city ||
        ''
      );

      setProvince(
        result.user.province ||
        ''
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN EDIT USER SAVE ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to update user account.'
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
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.redBright
          }
        />

        <Text
          style={
            styles.loadingScreenText
          }
        >
          Loading user information...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.outer
      }
    >
      <View
        style={[
          styles.ipadCanvas,

          {
            width:
              tablet.width,

            height:
              tablet.height,
          },

          Platform.OS !==
            'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar
          style="light"
        />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={
            styles.gradient
          }
        >
          <SafeAreaView
            style={
              styles.safeArea
            }
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <View
              style={[
                styles.header,

                {
                  height:
                    96 * s,

                  paddingHorizontal:
                    48 * s,
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.brandArea,

                  pressed &&
                    styles.pressed,
                ]}
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <View
                  style={[
                    styles.logoCircle,

                    {
                      width:
                        52 * s,

                      height:
                        52 * s,

                      borderRadius:
                        26 * s,
                    },
                  ]}
                >
                  <Image
                    source={require('../../../assets/images/hemo-hero-logo.png')}
                    style={{
                      width:
                        46 * s,

                      height:
                        46 * s,
                    }}
                    resizeMode="contain"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.brand,

                      {
                        fontSize:
                          27 * s,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.brandRed
                      }
                    >
                      Hemo-
                    </Text>

                    Hero
                  </Text>

                  <Text
                    style={[
                      styles.portal,

                      {
                        fontSize:
                          9 * s,

                        letterSpacing:
                          1.6 * s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              <View
                style={
                  styles.adminSection
                }
              >
                <View
                  style={
                    styles.notificationWrap
                  }
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={
                      24 * s
                    }
                    color={
                      COLORS.white
                    }
                  />

                  <View
                    style={[
                      styles.notificationBadge,

                      {
                        minWidth:
                          18 * s,

                        height:
                          18 * s,

                        borderRadius:
                          9 * s,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.notificationBadgeText,

                        {
                          fontSize:
                            9 * s,
                        },
                      ]}
                    >
                      3
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.adminAvatar,

                    {
                      width:
                        48 * s,

                      height:
                        48 * s,

                      borderRadius:
                        24 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.adminAvatarText,

                      {
                        fontSize:
                          15 * s,
                      },
                    ]}
                  >
                    {
                      adminInitial
                    }
                  </Text>
                </View>

                <View>
                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.adminName,

                      {
                        fontSize:
                          12 * s,
                      },
                    ]}
                  >
                    {
                      adminName
                    }
                  </Text>

                  <Text
                    style={[
                      styles.adminRole,

                      {
                        fontSize:
                          10 * s,
                      },
                    ]}
                  >
                    Admin
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <KeyboardAvoidingView
              style={
                styles.keyboardView
              }
              behavior={
                Platform.OS ===
                'ios'
                  ? 'padding'
                  : undefined
              }
            >
              <ScrollView
                style={
                  styles.scroll
                }
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal:
                      48 * s,

                    paddingTop:
                      30 * s,

                    paddingBottom:
                      48 * s,
                  },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* ==============================================
                    TITLE
                ============================================== */}

                <View
                  style={[
                    styles.titleRow,

                    {
                      marginBottom:
                        24 * s,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.titleLeft
                    }
                  >
                    <Pressable
                      onPress={() =>
                        router.back()
                      }
                      style={({ pressed }) => [
                        styles.backButton,

                        {
                          width:
                            43 * s,

                          height:
                            43 * s,

                          borderRadius:
                            11 * s,

                          marginRight:
                            14 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <MaterialIcons
                        name="arrow-back"
                        size={
                          21 * s
                        }
                        color={
                          COLORS.white
                        }
                      />
                    </Pressable>

                    <View>
                      <Text
                        style={[
                          styles.title,

                          {
                            fontSize:
                              30 * s,

                            lineHeight:
                              38 * s,
                          },
                        ]}
                      >
                        Edit User
                      </Text>

                      <Text
                        style={[
                          styles.subtitle,

                          {
                            fontSize:
                              12 * s,

                            marginTop:
                              3 * s,
                          },
                        ]}
                      >
                        Update account and profile information for {userName}.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.roleNotice,

                      {
                        height:
                          41 * s,

                        paddingHorizontal:
                          14 * s,

                        borderRadius:
                          10 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person"
                      size={
                        18 * s
                      }
                      color={
                        COLORS.soft
                      }
                    />

                    <Text
                      style={[
                        styles.roleNoticeText,

                        {
                          fontSize:
                            10 * s,
                        },
                      ]}
                    >
                      Role: User
                    </Text>
                  </View>
                </View>

                {/* ==============================================
                    SUCCESS
                ============================================== */}

                {successMessage ? (
                  <View
                    style={[
                      styles.successCard,

                      {
                        padding:
                          14 * s,

                        borderRadius:
                          12 * s,

                        marginBottom:
                          20 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.green
                      }
                    />

                    <Text
                      style={[
                        styles.successText,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      {
                        successMessage
                      }
                    </Text>

                    <Pressable
                      onPress={() =>
                        router.replace(
                          `/users/${user?.id}` as any
                        )
                      }
                      style={({ pressed }) => [
                        styles.viewButton,

                        {
                          height:
                            34 * s,

                          paddingHorizontal:
                            12 * s,

                          borderRadius:
                            8 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.viewButtonText,

                          {
                            fontSize:
                              9 * s,
                          },
                        ]}
                      >
                        View User
                      </Text>

                      <MaterialIcons
                        name="arrow-forward"
                        size={
                          15 * s
                        }
                        color={
                          COLORS.white
                        }
                      />
                    </Pressable>
                  </View>
                ) : null}

                {/* ==============================================
                    ERROR
                ============================================== */}

                {errorMessage ? (
                  <View
                    style={[
                      styles.errorCard,

                      {
                        padding:
                          14 * s,

                        borderRadius:
                          12 * s,

                        marginBottom:
                          20 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.redBright
                      }
                    />

                    <Text
                      style={[
                        styles.errorText,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      {
                        errorMessage
                      }
                    </Text>
                  </View>
                ) : null}

                {!user ? (
                  <View
                    style={[
                      styles.noUserCard,

                      {
                        padding:
                          30 * s,

                        borderRadius:
                          14 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person-off"
                      size={
                        40 * s
                      }
                      color={
                        COLORS.muted
                      }
                    />

                    <Text
                      style={[
                        styles.noUserTitle,

                        {
                          fontSize:
                            16 * s,

                          marginTop:
                            12 * s,
                        },
                      ]}
                    >
                      User unavailable
                    </Text>

                    <Text
                      style={[
                        styles.noUserText,

                        {
                          fontSize:
                            10 * s,

                          marginTop:
                            5 * s,
                        },
                      ]}
                    >
                      The requested user could not be loaded.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* ==========================================
                        ACCOUNT INFORMATION
                    ========================================== */}

                    <FormSection
                      scale={
                        s
                      }
                      title="Account Information"
                      description="Update the email address associated with this account."
                      icon="manage-accounts"
                    >
                      <View
                        style={
                          styles.formGrid
                        }
                      >
                        <View
                          style={
                            styles.fullField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Email Address"
                            required
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              email
                            }
                            onChangeText={
                              setEmail
                            }
                            placeholder="user@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={
                              !saving
                            }
                            icon="email"
                          />

                          <View
                            style={[
                              styles.warningBox,

                              {
                                padding:
                                  12 * s,

                                borderRadius:
                                  9 * s,

                                marginTop:
                                  10 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="info-outline"
                              size={
                                17 * s
                              }
                              color={
                                COLORS.orange
                              }
                            />

                            <Text
                              style={[
                                styles.warningText,

                                {
                                  fontSize:
                                    9 * s,
                                },
                              ]}
                            >
                              Changing the email updates both the Hemo-Hero profile and the user&apos;s authentication email.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </FormSection>

                    <View
                      style={{
                        height:
                          20 * s,
                      }}
                    />

                    {/* ==========================================
                        PERSONAL INFORMATION
                    ========================================== */}

                    <FormSection
                      scale={
                        s
                      }
                      title="Personal Information"
                      description="Edit the user's basic personal details."
                      icon="person-outline"
                    >
                      <View
                        style={[
                          styles.formGrid,

                          {
                            gap:
                              16 * s,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="First Name"
                            required
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              firstName
                            }
                            onChangeText={
                              setFirstName
                            }
                            placeholder="First name"
                            editable={
                              !saving
                            }
                            icon="person"
                          />
                        </View>

                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Middle Name"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              middleName
                            }
                            onChangeText={
                              setMiddleName
                            }
                            placeholder="Middle name"
                            editable={
                              !saving
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Last Name"
                            required
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              lastName
                            }
                            onChangeText={
                              setLastName
                            }
                            placeholder="Last name"
                            editable={
                              !saving
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Suffix"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              suffix
                            }
                            onChangeText={
                              setSuffix
                            }
                            placeholder="e.g. Jr., Sr., III"
                            editable={
                              !saving
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Phone"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              phone
                            }
                            onChangeText={
                              setPhone
                            }
                            placeholder="Phone number"
                            keyboardType="phone-pad"
                            editable={
                              !saving
                            }
                            icon="phone"
                          />
                        </View>

                        <View
                          style={
                            styles.halfField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Date of Birth"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              dateOfBirth
                            }
                            onChangeText={
                              setDateOfBirth
                            }
                            placeholder="YYYY-MM-DD"
                            autoCapitalize="none"
                            editable={
                              !saving
                            }
                            icon="calendar-today"
                          />

                          <Text
                            style={[
                              styles.helperText,

                              {
                                fontSize:
                                  8 * s,

                                marginTop:
                                  5 * s,
                              },
                            ]}
                          >
                            Format: YYYY-MM-DD
                          </Text>
                        </View>

                        <View
                          style={
                            styles.fullField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Gender"
                          />

                          <View
                            style={[
                              styles.genderRow,

                              {
                                gap:
                                  9 * s,
                              },
                            ]}
                          >
                            {GENDER_OPTIONS.map(
                              option => {
                                const active =
                                  gender ===
                                  option;

                                return (
                                  <Pressable
                                    key={
                                      option
                                    }
                                    disabled={
                                      saving
                                    }
                                    onPress={() =>
                                      setGender(
                                        active
                                          ? ''
                                          : option
                                      )
                                    }
                                    style={({ pressed }) => [
                                      styles.genderButton,

                                      {
                                        minHeight:
                                          40 * s,

                                        paddingHorizontal:
                                          15 * s,

                                        borderRadius:
                                          9 * s,
                                      },

                                      active &&
                                        styles.genderButtonActive,

                                      pressed &&
                                        styles.pressed,
                                    ]}
                                  >
                                    <MaterialIcons
                                      name={
                                        active
                                          ? 'radio-button-checked'
                                          : 'radio-button-unchecked'
                                      }
                                      size={
                                        16 * s
                                      }
                                      color={
                                        active
                                          ? COLORS.redBright
                                          : COLORS.muted
                                      }
                                    />

                                    <Text
                                      style={[
                                        styles.genderButtonText,

                                        {
                                          fontSize:
                                            9 * s,
                                        },

                                        active &&
                                          styles.genderButtonTextActive,
                                      ]}
                                    >
                                      {
                                        option
                                      }
                                    </Text>
                                  </Pressable>
                                );
                              }
                            )}
                          </View>
                        </View>
                      </View>
                    </FormSection>

                    <View
                      style={{
                        height:
                          20 * s,
                      }}
                    />

                    {/* ==========================================
                        LOCATION
                    ========================================== */}

                    <FormSection
                      scale={
                        s
                      }
                      title="Location"
                      description="Update the user's registered address information."
                      icon="location-on"
                    >
                      <View
                        style={[
                          styles.formGrid,

                          {
                            gap:
                              16 * s,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.thirdField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Barangay"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              barangay
                            }
                            onChangeText={
                              setBarangay
                            }
                            placeholder="Barangay"
                            editable={
                              !saving
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.thirdField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="City / Municipality"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              city
                            }
                            onChangeText={
                              setCity
                            }
                            placeholder="City"
                            editable={
                              !saving
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.thirdField
                          }
                        >
                          <FormLabel
                            scale={
                              s
                            }
                            label="Province"
                          />

                          <InputBox
                            scale={
                              s
                            }
                            value={
                              province
                            }
                            onChangeText={
                              setProvince
                            }
                            placeholder="Province"
                            editable={
                              !saving
                            }
                          />
                        </View>
                      </View>
                    </FormSection>

                    {/* ==========================================
                        ACTIONS
                    ========================================== */}

                    <View
                      style={[
                        styles.formActions,

                        {
                          marginTop:
                            26 * s,

                          gap:
                            12 * s,
                        },
                      ]}
                    >
                      <Pressable
                        disabled={
                          saving
                        }
                        onPress={() =>
                          router.back()
                        }
                        style={({ pressed }) => [
                          styles.cancelButton,

                          {
                            height:
                              49 * s,

                            minWidth:
                              125 * s,

                            paddingHorizontal:
                              20 * s,

                            borderRadius:
                              10 * s,
                          },

                          pressed &&
                            styles.pressed,

                          saving &&
                            styles.disabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cancelButtonText,

                            {
                              fontSize:
                                10 * s,
                            },
                          ]}
                        >
                          Cancel
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={
                          saving
                        }
                        onPress={
                          handleSave
                        }
                        style={({ pressed }) => [
                          styles.saveButton,

                          {
                            height:
                              49 * s,

                            minWidth:
                              165 * s,

                            paddingHorizontal:
                              22 * s,

                            borderRadius:
                              10 * s,

                            gap:
                              8 * s,
                          },

                          pressed &&
                            styles.pressed,

                          saving &&
                            styles.disabled,
                        ]}
                      >
                        {saving ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              COLORS.white
                            }
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="save"
                              size={
                                19 * s
                              }
                              color={
                                COLORS.white
                              }
                            />

                            <Text
                              style={[
                                styles.saveButtonText,

                                {
                                  fontSize:
                                    10 * s,
                                },
                              ]}
                            >
                              Save Changes
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// FORM SECTION
// ============================================================

function FormSection({
  scale,
  title,
  description,
  icon,
  children,
}: {
  scale: number;

  title: string;

  description: string;

  icon:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  children:
    React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          borderRadius:
            14 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            minHeight:
              66 * scale,

            paddingHorizontal:
              20 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width:
                38 * scale,

              height:
                38 * scale,

              borderRadius:
                10 * scale,

              marginRight:
                11 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              icon
            }
            size={
              20 * scale
            }
            color={
              COLORS.redBright
            }
          />
        </View>

        <View
          style={
            styles.sectionHeaderText
          }
        >
          <Text
            style={[
              styles.sectionTitle,

              {
                fontSize:
                  12 * scale,
              },
            ]}
          >
            {
              title
            }
          </Text>

          <Text
            style={[
              styles.sectionDescription,

              {
                fontSize:
                  9 * scale,

                marginTop:
                  2 * scale,
              },
            ]}
          >
            {
              description
            }
          </Text>
        </View>
      </View>

      <View
        style={{
          padding:
            20 * scale,
        }}
      >
        {
          children
        }
      </View>
    </View>
  );
}

// ============================================================
// FORM LABEL
// ============================================================

function FormLabel({
  scale,
  label,
  required = false,
}: {
  scale: number;

  label: string;

  required?: boolean;
}) {
  return (
    <Text
      style={[
        styles.formLabel,

        {
          fontSize:
            9 * scale,

          marginBottom:
            6 * scale,
        },
      ]}
    >
      {
        label
      }

      {required ? (
        <Text
          style={
            styles.required
          }
        >
          {' *'}
        </Text>
      ) : null}
    </Text>
  );
}

// ============================================================
// INPUT
// ============================================================

function InputBox({
  scale,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'words',
  editable = true,
}: {
  scale: number;

  value: string;

  onChangeText: (
    value: string
  ) => void;

  placeholder: string;

  icon?:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad'
    | 'numeric';

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  editable?: boolean;
}) {
  return (
    <View
      style={[
        styles.inputContainer,

        {
          height:
            45 * scale,

          borderRadius:
            9 * scale,

          paddingHorizontal:
            13 * scale,
        },

        !editable &&
          styles.disabled,
      ]}
    >
      {icon ? (
        <MaterialIcons
          name={
            icon
          }
          size={
            18 * scale
          }
          color={
            COLORS.muted
          }
          style={{
            marginRight:
              8 * scale,
          }}
        />
      ) : null}

      <TextInput
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          COLORS.muted
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
        editable={
          editable
        }
        style={[
          styles.input,

          {
            fontSize:
              10 * scale,
          },
        ]}
      />
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getUserDisplayName(
  user: AdminManagedUser
) {
  if (
    user.full_name
      ?.trim()
  ) {
    return user.full_name.trim();
  }

  const name =
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return (
    name ||
    user.email ||
    'Hemo-Hero User'
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    outer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    loadingScreen: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    loadingScreenText: {
      marginTop:
        14,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    ipadCanvas: {
      overflow:
        'hidden',

      backgroundColor:
        COLORS.navy,

      borderRadius:
        Platform.OS ===
          'web'
          ? 24
          : 0,
    },

    nativeCanvas: {
      width:
        '100%',

      height:
        '100%',
    },

    gradient: {
      flex:
        1,
    },

    safeArea: {
      flex:
        1,
    },

    keyboardView: {
      flex:
        1,
    },

    scroll: {
      flex:
        1,
    },

    content: {
      flexGrow:
        1,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    brandArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.white,
    },

    brand: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portal: {
      marginTop:
        1,

      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    notificationWrap: {
      position:
        'relative',

      width:
        28,

      marginRight:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBadge: {
      position:
        'absolute',

      top:
        -4,

      right:
        -6,

      paddingHorizontal:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redBright,
    },

    notificationBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ECECEC',
    },

    adminAvatarText: {
      color:
        '#111111',

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      maxWidth:
        180,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // TITLE
    // ========================================================

    titleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    titleLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    title: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    subtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    roleNotice: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    roleNoticeText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SECTION
    // ========================================================

    sectionCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,

      backgroundColor:
        'rgba(12,20,40,0.94)',
    },

    sectionHeaderText: {
      flex:
        1,
    },

    sectionIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    sectionTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    sectionDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // FORM
    // ========================================================

    formGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',
    },

    fullField: {
      width:
        '100%',
    },

    halfField: {
      width:
        '48.8%',
    },

    thirdField: {
      width:
        '32%',
    },

    formLabel: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    required: {
      color:
        COLORS.redBright,
    },

    inputContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    input: {
      flex:
        1,

      height:
        '100%',

      paddingVertical:
        0,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      outlineStyle:
        'none',
    } as any,

    helperText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // GENDER
    // ========================================================

    genderRow: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',
    },

    genderButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    genderButtonActive: {
      borderColor:
        COLORS.redBright,

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    genderButtonText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',
    },

    genderButtonTextActive: {
      color:
        COLORS.white,
    },

    // ========================================================
    // INFO / MESSAGES
    // ========================================================

    warningBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.35)',

      backgroundColor:
        'rgba(243,163,74,0.07)',
    },

    warningText: {
      flex:
        1,

      color:
        '#E8C79F',

      fontFamily:
        'Inter_400Regular',

      lineHeight:
        15,
    },

    successCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.40)',

      backgroundColor:
        'rgba(53,201,130,0.08)',
    },

    successText: {
      flex:
        1,

      color:
        COLORS.green,

      fontFamily:
        'Inter_500Medium',
    },

    errorCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.55)',

      backgroundColor:
        'rgba(80,16,30,0.55)',
    },

    errorText: {
      flex:
        1,

      color:
        '#FFB8BE',

      fontFamily:
        'Inter_500Medium',
    },

    viewButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      backgroundColor:
        '#178F59',
    },

    viewButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    noUserCard: {
      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    noUserTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    noUserText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // ACTIONS
    // ========================================================

    formActions: {
      flexDirection:
        'row',

      justifyContent:
        'flex-end',
    },

    cancelButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    cancelButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    saveButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    saveButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // GENERIC
    // ========================================================

    pressed: {
      opacity:
        0.75,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity:
        0.42,
    },
  });