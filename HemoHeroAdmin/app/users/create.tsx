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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  createAdminUser,
  type AdminManagedUser,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

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

export default function AdminCreateUserScreen() {
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

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(
      true
    );

  // ==========================================================
  // ACCOUNT
  // ==========================================================

  const [
    email,
    setEmail,
  ] =
    useState(
      ''
    );

  const [
    password,
    setPassword,
  ] =
    useState(
      ''
    );

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState(
      ''
    );

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false
    );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(
      false
    );

  // ==========================================================
  // PERSONAL
  // ==========================================================

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

  // ==========================================================
  // LOCATION
  // ==========================================================

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
  // SUBMISSION
  // ==========================================================

  const [
    submitting,
    setSubmitting,
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

  const [
    createdUser,
    setCreatedUser,
  ] =
    useState<AdminManagedUser | null>(
      null
    );

  // ==========================================================
  // AUTH GUARD
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        validateAdminSession();
      },
      []
    )
  );

  async function validateAdminSession() {
    try {
      setCheckingSession(
        true
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

      setProfile(
        savedProfile
      );
    } catch (
      error
    ) {
      console.log(
        'CREATE USER SESSION ERROR:',
        error
      );

      await clearAdminSession();

      router.replace(
        '/'
      );
    } finally {
      setCheckingSession(
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
  // PASSWORD VALIDATION
  // ==========================================================

  const passwordRules =
    useMemo(
      () => {
        return {
          length:
            password.length >=
            8,

          lowercase:
            /[a-z]/.test(
              password
            ),

          uppercase:
            /[A-Z]/.test(
              password
            ),

          number:
            /[0-9]/.test(
              password
            ),

          special:
            /[^A-Za-z0-9]/.test(
              password
            ),
        };
      },
      [
        password,
      ]
    );

  const passwordValid =
    Object.values(
      passwordRules
    ).every(
      Boolean
    );

  // ==========================================================
  // VALIDATE FORM
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
      !password
    ) {
      return 'Password is required.';
    }

    if (
      !passwordValid
    ) {
      return 'Password does not meet all security requirements.';
    }

    if (
      !confirmPassword
    ) {
      return 'Please confirm the password.';
    }

    if (
      password !==
      confirmPassword
    ) {
      return 'Passwords do not match.';
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
  // CREATE
  // ==========================================================

  async function handleCreateUser() {
    if (
      submitting
    ) {
      return;
    }

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );

    setCreatedUser(
      null
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
      setSubmitting(
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
        await createAdminUser(
          token,
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password,

            confirm_password:
              confirmPassword,

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

      setCreatedUser(
        result.user
      );

      setSuccessMessage(
        result.message ||
        'User account created successfully.'
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN CREATE USER ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to create user account.'
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ==========================================================
  // RESET FORM
  // ==========================================================

  function resetForm() {
    if (
      submitting
    ) {
      return;
    }

    setEmail(
      ''
    );

    setPassword(
      ''
    );

    setConfirmPassword(
      ''
    );

    setFirstName(
      ''
    );

    setMiddleName(
      ''
    );

    setLastName(
      ''
    );

    setSuffix(
      ''
    );

    setPhone(
      ''
    );

    setDateOfBirth(
      ''
    );

    setGender(
      ''
    );

    setBarangay(
      ''
    );

    setCity(
      ''
    );

    setProvince(
      ''
    );

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );

    setCreatedUser(
      null
    );
  }

  // ==========================================================
  // SESSION LOADING
  // ==========================================================

  if (
    checkingSession
  ) {
    return (
      <View
        style={
          styles.sessionLoading
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
            styles.sessionLoadingText
          }
        >
          Loading Admin Portal...
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
                    source={require('../../assets/images/hemo-hero-logo.png')}
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
                {/* ================================================
                    TITLE
                ================================================ */}

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
                        Create User
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
                        Create a standard Hemo-Hero user account.
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

                {/* ================================================
                    SUCCESS
                ================================================ */}

                {successMessage &&
                createdUser ? (
                  <View
                    style={[
                      styles.createdCard,

                      {
                        padding:
                          20 * s,

                        borderRadius:
                          14 * s,

                        marginBottom:
                          20 * s,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.createdLeft
                      }
                    >
                      <View
                        style={[
                          styles.createdIcon,

                          {
                            width:
                              46 * s,

                            height:
                              46 * s,

                            borderRadius:
                              23 * s,

                            marginRight:
                              13 * s,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="check"
                          size={
                            24 * s
                          }
                          color={
                            COLORS.green
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.createdTextWrap
                        }
                      >
                        <Text
                          style={[
                            styles.createdTitle,

                            {
                              fontSize:
                                12 * s,
                            },
                          ]}
                        >
                          {
                            successMessage
                          }
                        </Text>

                        <Text
                          style={[
                            styles.createdEmail,

                            {
                              fontSize:
                                10 * s,

                              marginTop:
                                3 * s,
                            },
                          ]}
                        >
                          {createdUser.email}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.createdActions,

                        {
                          gap:
                            9 * s,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={
                          resetForm
                        }
                        style={({ pressed }) => [
                          styles.secondarySmallButton,

                          {
                            height:
                              38 * s,

                            paddingHorizontal:
                              14 * s,

                            borderRadius:
                              9 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondarySmallButtonText,

                            {
                              fontSize:
                                9 * s,
                            },
                          ]}
                        >
                          Create Another
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          router.replace(
                            `/users/${createdUser.id}` as any
                          )
                        }
                        style={({ pressed }) => [
                          styles.primarySmallButton,

                          {
                            height:
                              38 * s,

                            paddingHorizontal:
                              14 * s,

                            borderRadius:
                              9 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.primarySmallButtonText,

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
                            16 * s
                          }
                          color={
                            COLORS.white
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {/* ================================================
                    ERROR
                ================================================ */}

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

                {/* ================================================
                    ACCOUNT INFORMATION
                ================================================ */}

                <FormSection
                  scale={
                    s
                  }
                  title="Account Information"
                  description="Login credentials for the new user."
                  icon="lock-outline"
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
                          !submitting
                        }
                        icon="email"
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
                        label="Password"
                        required
                      />

                      <InputBox
                        scale={
                          s
                        }
                        value={
                          password
                        }
                        onChangeText={
                          setPassword
                        }
                        placeholder="Create a secure password"
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        editable={
                          !submitting
                        }
                        icon="lock"
                        rightIcon={
                          showPassword
                            ? 'visibility-off'
                            : 'visibility'
                        }
                        onRightIconPress={() =>
                          setShowPassword(
                            current =>
                              !current
                          )
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
                        label="Confirm Password"
                        required
                      />

                      <InputBox
                        scale={
                          s
                        }
                        value={
                          confirmPassword
                        }
                        onChangeText={
                          setConfirmPassword
                        }
                        placeholder="Re-enter password"
                        secureTextEntry={
                          !showConfirmPassword
                        }
                        autoCapitalize="none"
                        editable={
                          !submitting
                        }
                        icon="lock"
                        rightIcon={
                          showConfirmPassword
                            ? 'visibility-off'
                            : 'visibility'
                        }
                        onRightIconPress={() =>
                          setShowConfirmPassword(
                            current =>
                              !current
                          )
                        }
                      />
                    </View>
                  </View>

                  {/* ============================================
                      PASSWORD REQUIREMENTS
                  ============================================ */}

                  <View
                    style={[
                      styles.passwordRequirements,

                      {
                        marginTop:
                          16 * s,

                        padding:
                          15 * s,

                        borderRadius:
                          11 * s,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.passwordRequirementTitle,

                        {
                          fontSize:
                            9 * s,

                          marginBottom:
                            9 * s,
                        },
                      ]}
                    >
                      PASSWORD REQUIREMENTS
                    </Text>

                    <View
                      style={
                        styles.passwordRulesGrid
                      }
                    >
                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          passwordRules.length
                        }
                        label="At least 8 characters"
                      />

                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          passwordRules.lowercase
                        }
                        label="One lowercase letter"
                      />

                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          passwordRules.uppercase
                        }
                        label="One uppercase letter"
                      />

                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          passwordRules.number
                        }
                        label="One number"
                      />

                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          passwordRules.special
                        }
                        label="One special character"
                      />

                      <PasswordRule
                        scale={
                          s
                        }
                        passed={
                          confirmPassword.length >
                            0 &&
                          confirmPassword ===
                            password
                        }
                        label="Passwords match"
                      />
                    </View>
                  </View>
                </FormSection>

                <View
                  style={{
                    height:
                      20 * s,
                  }}
                />

                {/* ================================================
                    PERSONAL INFORMATION
                ================================================ */}

                <FormSection
                  scale={
                    s
                  }
                  title="Personal Information"
                  description="Basic profile information for the user."
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
                          !submitting
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
                          !submitting
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
                          !submitting
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
                          !submitting
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
                          !submitting
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
                          !submitting
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

                    {/* ==========================================
                        GENDER
                    ========================================== */}

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
                                  submitting
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

                {/* ================================================
                    LOCATION
                ================================================ */}

                <FormSection
                  scale={
                    s
                  }
                  title="Location"
                  description="Optional address information. The user may update this later."
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
                          !submitting
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
                          !submitting
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
                          !submitting
                        }
                      />
                    </View>
                  </View>
                </FormSection>

                {/* ================================================
                    ACTIONS
                ================================================ */}

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
                      submitting
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

                      submitting &&
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
                      submitting
                    }
                    onPress={
                      handleCreateUser
                    }
                    style={({ pressed }) => [
                      styles.createButton,

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

                      submitting &&
                        styles.disabled,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          COLORS.white
                        }
                      />
                    ) : (
                      <>
                        <MaterialIcons
                          name="person-add"
                          size={
                            19 * s
                          }
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={[
                            styles.createButtonText,

                            {
                              fontSize:
                                10 * s,
                            },
                          ]}
                        >
                          Create User
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
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

        <View>
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
// LABEL
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
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
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

  rightIcon?:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  onRightIconPress?: () => void;

  secureTextEntry?: boolean;

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
        secureTextEntry={
          secureTextEntry
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

      {rightIcon &&
      onRightIconPress ? (
        <Pressable
          onPress={
            onRightIconPress
          }
          hitSlop={
            8
          }
        >
          <MaterialIcons
            name={
              rightIcon
            }
            size={
              18 * scale
            }
            color={
              COLORS.muted
            }
          />
        </Pressable>
      ) : null}
    </View>
  );
}

// ============================================================
// PASSWORD RULE
// ============================================================

function PasswordRule({
  scale,
  passed,
  label,
}: {
  scale: number;

  passed: boolean;

  label: string;
}) {
  return (
    <View
      style={
        styles.passwordRule
      }
    >
      <MaterialIcons
        name={
          passed
            ? 'check-circle'
            : 'radio-button-unchecked'
        }
        size={
          15 * scale
        }
        color={
          passed
            ? COLORS.green
            : COLORS.muted
        }
      />

      <Text
        style={[
          styles.passwordRuleText,

          {
            fontSize:
              8 * scale,

            marginLeft:
              6 * scale,
          },

          passed &&
            styles.passwordRulePassed,
        ]}
      >
        {
          label
        }
      </Text>
    </View>
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

    sessionLoading: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    sessionLoadingText: {
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

      backgroundColor:
        COLORS.white,

      overflow:
        'hidden',
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
    // PASSWORD
    // ========================================================

    passwordRequirements: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        'rgba(16,26,53,0.60)',
    },

    passwordRequirementTitle: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.5,
    },

    passwordRulesGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      rowGap:
        8,

    },

    passwordRule: {
      width:
        '33.33%',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    passwordRuleText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    passwordRulePassed: {
      color:
        COLORS.green,
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
    // ERROR
    // ========================================================

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

    // ========================================================
    // SUCCESS
    // ========================================================

    createdCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.40)',

      backgroundColor:
        'rgba(53,201,130,0.08)',
    },

    createdLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    createdIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.35)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    createdTextWrap: {
      flex:
        1,
    },

    createdTitle: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',
    },

    createdEmail: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    createdActions: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    secondarySmallButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    secondarySmallButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    primarySmallButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      backgroundColor:
        '#178F59',
    },

    primarySmallButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
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

    createButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    createButtonText: {
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