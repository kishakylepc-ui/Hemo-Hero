import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
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

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminHeader from '../../components/AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

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

import { isAdminRole, isSuperAdmin } from '../../lib/roles';

import {
  cleanUsername,
  getUsernameProblem,
} from '../../lib/username';

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

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Prefer not to say',
] as const;

export default function AdminCreateUserScreen() {

  const tablet =
    useAdminCanvas();

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  const fs =
    Math.max(
      tablet.scale,
      0.92
    );

  // Super admin can create admin accounts.
  const [
    newRole,
    setNewRole,
  ] =
    useState<'user' | 'admin'>(
      'user'
    );

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

  const [
    email,
    setEmail,
  ] =
    useState(
      ''
    );

  // Signs in too (with the email); unique.
  const [
    username,
    setUsername,
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

  // Used to bring the success/error message into view after
  // pressing Create User at the bottom of the form.
  const scrollRef =
    useRef<ScrollViewInstance>(null);

  function scrollToTop() {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  }

  useFocusEffect(
    useCallback(
      () => {
        validateAdminSession();
      },
      []
    )
  );

  // The full-screen spinner only shows on the first check
  // (checkingSession starts true); later focus checks run
  // silently so the form does not flash.
  async function validateAdminSession() {
    try {
      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        !isAdminRole(savedProfile?.role)
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

    const usernameProblem =
      getUsernameProblem(
        username
      );

    if (
      usernameProblem
    ) {
      return usernameProblem;
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

      scrollToTop();

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

            username:
              cleanUsername(
                username
              ),

            password,

            confirm_password:
              confirmPassword,

            role:
              newRole,

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

      scrollToTop();
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

      scrollToTop();
    } finally {
      setSubmitting(
        false
      );
    }
  }

  function resetForm() {
    if (
      submitting
    ) {
      return;
    }

    setEmail(
      ''
    );

    setUsername(
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
          style={[
            styles.sessionLoadingText,

            {
              fontSize:
                13 * fs,
            },
          ]}
        >
          Loading Admin Portal...
        </Text>
      </View>
    );
  }

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
            <AdminHeader
              profile={
                profile
              }
              scale={
                s
              }
              fontScale={
                fs
              }
            />

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
                ref={
                  scrollRef
                }
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
                              30 * fs,

                            lineHeight:
                              38 * fs,
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
                              14 * fs,

                            marginTop:
                              3 * s,
                          },
                        ]}
                      >
                        {newRole === 'admin'
                          ? 'Create an administrator account for the Admin Portal.'
                          : 'Create a standard Hemo-Hero user account.'}
                      </Text>
                    </View>
                  </View>

                  {isSuperAdmin(profile?.role) ? (
                    <View
                      style={[
                        styles.roleChoice,

                        {
                          gap: 8 * s,
                        },
                      ]}
                    >
                      {(['user', 'admin'] as const).map(option => {
                        const selected =
                          newRole === option;

                        return (
                          <Pressable
                            key={option}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected,
                            }}
                            disabled={submitting}
                            onPress={() =>
                              setNewRole(option)
                            }
                            style={({ pressed }) => [
                              styles.roleNotice,

                              {
                                height:
                                  41 * s,

                                paddingHorizontal:
                                  14 * s,

                                borderRadius:
                                  10 * s,
                              },

                              selected &&
                                styles.roleOptionSelected,

                              pressed &&
                                styles.pressed,
                            ]}
                          >
                            <MaterialIcons
                              name={
                                option === 'admin'
                                  ? 'admin-panel-settings'
                                  : 'person'
                              }
                              size={
                                18 * s
                              }
                              color={
                                selected
                                  ? COLORS.white
                                  : COLORS.soft
                              }
                            />

                            <Text
                              style={[
                                styles.roleNoticeText,

                                {
                                  fontSize:
                                    12.5 * fs,
                                },

                                selected &&
                                  styles.roleOptionTextSelected,
                              ]}
                            >
                              {option === 'admin'
                                ? 'Admin'
                                : 'User'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
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
                              12.5 * fs,
                          },
                        ]}
                      >
                        Role: User
                      </Text>
                    </View>
                  )}
                </View>

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
                                14 * fs,
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
                                12.5 * fs,

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
                                11.5 * fs,
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
                                11.5 * fs,
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
                            12.5 * fs,
                        },
                      ]}
                    >
                      {
                        errorMessage
                      }
                    </Text>
                  </View>
                ) : null}

                <FadeInView delay={40}>
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
                        styles.halfField
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
                        label="Username"
                        required
                      />

                      <InputBox
                        scale={
                          s
                        }
                        value={
                          username
                        }
                        onChangeText={
                          setUsername
                        }
                        placeholder="3-20 letters, numbers, . or _"
                        autoCapitalize="none"
                        editable={
                          !submitting
                        }
                        icon="alternate-email"
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
                            11.5 * fs,

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
                </FadeInView>

                <View
                  style={{
                    height:
                      20 * s,
                  }}
                />

                <FadeInView delay={90}>
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
                              11 * fs,

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
                                        11.5 * fs,
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
                </FadeInView>

                <View
                  style={{
                    height:
                      20 * s,
                  }}
                />

                <FadeInView delay={140}>
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
                </FadeInView>

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
                            12.5 * fs,
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
                                12.5 * fs,
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
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  children:
    ReactNode;
}) {
  const fs =
    Math.max(
      scale,
      0.92
    );

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
                  16 * fs,
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
                  12 * fs,

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

function FormLabel({
  scale,
  label,
  required = false,
}: {
  scale: number;

  label: string;

  required?: boolean;
}) {
  const fs =
    Math.max(
      scale,
      0.92
    );

  return (
    <Text
      style={[
        styles.formLabel,

        {
          fontSize:
            11.5 * fs,

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
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  rightIcon?:
    ComponentProps<
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
  const fs =
    Math.max(
      scale,
      0.92
    );

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
              13 * fs,
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

function PasswordRule({
  scale,
  passed,
  label,
}: {
  scale: number;

  passed: boolean;

  label: string;
}) {
  const fs =
    Math.max(
      scale,
      0.92
    );

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
              11.5 * fs,

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

    roleChoice: {
      flexDirection:
        'row',
    },

    roleOptionSelected: {
      borderColor:
        COLORS.red,

      backgroundColor:
        COLORS.red,
    },

    roleOptionTextSelected: {
      color:
        COLORS.white,
    },

    roleNoticeText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

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