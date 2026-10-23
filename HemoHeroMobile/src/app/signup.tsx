import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type TextInputInstance,
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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../lib/fullScreen';

import {
  ApiError,
  checkUsernameAvailable,
  registerUser,
} from '../lib/api';

import {
  saveSession,
} from '../lib/session';

import {
  cleanUsername,
  getUsernameProblem,
} from '../lib/username';

import {
  whenIntroDone,
} from '../lib/appIntro';

import AuthField from '../components/AuthField';
import AuthTabs from '../components/AuthTabs';

import {
  FadeInView,
} from '../components/Motion';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  pinkTop: '#EBA4A7',
  pinkBottom: '#D93238',

  white: '#FFFFFF',
  black: '#171717',

  inputBorder: '#D8D8D8',
  placeholder: '#A3A3A3',
  muted: '#555555',

  success: '#198754',
  successBackground: '#EAF7EF',
  successBorder: '#B8DFC7',

  requirementInactive: '#8B8B8B',
  requirementActive: '#198754',
};

// ============================================================
// SCREEN
// ============================================================

export default function SignUpScreen() {
  // The header is drawn behind the status bar (full screen,
  // like the Home screen).
  const insets =
    useSafeAreaInsets();

  const {
    height,
  } =
    useWindowDimensions();

  /*
    PRIMARY TARGET:
    iPhone 17 Pro = approximately 402 x 874

    Smaller phones such as iPhone 13
    receive slightly tighter spacing.
  */
  const isSmallPhone =
    Platform.OS !==
      'web' &&
    height <=
      844;

  // Email carried over from Sign In.
  const params =
    useLocalSearchParams<{
      email?: string | string[];
    }>();

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    email,
    setEmail,
  ] =
    useState(
      typeof params.email ===
        'string'
        ? params.email
        : ''
    );

  // Sign in with it or the email; unique.
  const [
    username,
    setUsername,
  ] =
    useState('');

  // Checked with the server while typing.
  const [
    usernameStatus,
    setUsernameStatus,
  ] =
    useState<
      'idle' | 'checking' | 'available' | 'taken'
    >('idle');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');

  // Rules checklist shows while typing the password.
  const [
    passwordFocused,
    setPasswordFocused,
  ] =
    useState(false);

  // "Passwords don't match" waits until the field is left.
  const [
    confirmTouched,
    setConfirmTouched,
  ] =
    useState(false);

  // Typing mistakes, shown under each field.
  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<{
      email?: string;
      username?: string;
      password?: string;
      confirm?: string;
    }>({});

  // ==========================================================
  // USERNAME AVAILABILITY (half a second after typing stops)
  // ==========================================================

  useEffect(() => {
    const clean =
      cleanUsername(username);

    if (
      !clean ||
      getUsernameProblem(clean)
    ) {
      setUsernameStatus('idle');

      return;
    }

    setUsernameStatus('checking');

    let active = true;

    const timer = setTimeout(async () => {
      try {
        const result =
          await checkUsernameAvailable(
            clean
          );

        if (active) {
          setUsernameStatus(
            result.available
              ? 'available'
              : 'taken'
          );
        }
      } catch {
        // The server checks again on Create Account.
        if (active) {
          setUsernameStatus('idle');
        }
      }
    }, 500);

    return () => {
      active = false;

      clearTimeout(timer);
    };
  }, [username]);

  // Next step offered with the error ("Sign in instead").
  const [
    errorAction,
    setErrorAction,
  ] =
    useState<{
      label: string;
      onPress: () => void;
    } | null>(null);

  const [
    termsError,
    setTermsError,
  ] =
    useState(false);

  const usernameRef =
    useRef<TextInputInstance>(null);

  const passwordRef =
    useRef<TextInputInstance>(null);

  const confirmRef =
    useRef<TextInputInstance>(null);

  const [
    accepted,
    setAccepted,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('');

  // ==========================================================
  // PASSWORD REQUIREMENTS
  // ==========================================================

  const passwordHasMinimumLength =
    password.length >=
    8;

  const passwordHasLowercase =
    /[a-z]/.test(
      password
    );

  const passwordHasUppercase =
    /[A-Z]/.test(
      password
    );

  const passwordHasNumber =
    /[0-9]/.test(
      password
    );

  const passwordHasSpecialCharacter =
    /[^A-Za-z0-9]/.test(
      password
    );

  const passwordsMatch =
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword;

  const passwordScore =
    [
      passwordHasMinimumLength,
      passwordHasLowercase,
      passwordHasUppercase,
      passwordHasNumber,
      passwordHasSpecialCharacter,
    ].filter(Boolean).length;

  const passwordValid =
    passwordScore === 5;

  const strength =
    passwordValid
      ? {
          label: 'Strong',
          color: COLORS.success,
        }
      : passwordScore >= 3
        ? {
            label: 'Fair',
            color: '#DF721D',
          }
        : {
            label: 'Weak',
            color: COLORS.redButton,
          };

  // ==========================================================
  // ANIMATIONS
  // ==========================================================

  const headerOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const headerTranslateY =
    useRef(
      new Animated.Value(-10)
    ).current;

  const logoOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const logoScale =
    useRef(
      new Animated.Value(0.88)
    ).current;

  const cardOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const cardTranslateY =
    useRef(
      new Animated.Value(28)
    ).current;

  const buttonScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const checkboxScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const errorShake =
    useRef(
      new Animated.Value(0)
    ).current;

  // ==========================================================
  // ENTRANCE ANIMATION
  // ==========================================================

  // Waits for the opening animation (first launch) so this
  // entrance isn't hidden underneath it.
  useEffect(
    () =>
      whenIntroDone(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(
              headerOpacity,
              {
                toValue: 1,

                duration: 320,

                easing:
                  Easing.out(
                    Easing.ease
                  ),

                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              headerTranslateY,
              {
                toValue: 0,

                duration: 320,

                easing:
                  Easing.out(
                    Easing.ease
                  ),

                useNativeDriver:
                  true,
              }
            ),
          ]),

          Animated.parallel([
            Animated.parallel([
              Animated.timing(
                logoOpacity,
                {
                  toValue: 1,

                  duration: 330,

                  easing:
                    Easing.out(
                      Easing.ease
                    ),

                  useNativeDriver:
                    true,
                }
              ),

              Animated.spring(
                logoScale,
                {
                  toValue: 1,

                  friction: 6,

                  tension: 70,

                  useNativeDriver:
                    true,
                }
              ),
            ]),

            Animated.parallel([
              Animated.timing(
                cardOpacity,
                {
                  toValue: 1,

                  duration: 430,

                  easing:
                    Easing.out(
                      Easing.cubic
                    ),

                  useNativeDriver:
                    true,
                }
              ),

              Animated.timing(
                cardTranslateY,
                {
                  toValue: 0,

                  duration: 430,

                  easing:
                    Easing.out(
                      Easing.cubic
                    ),

                  useNativeDriver:
                    true,
                }
              ),
            ]),
          ]),
        ]).start();
      }),
    [
      headerOpacity,
      headerTranslateY,
      logoOpacity,
      logoScale,
      cardOpacity,
      cardTranslateY,
    ]
  );

  // ==========================================================
  // ERROR SHAKE
  // ==========================================================

  function triggerError(
    message: string,
    action: {
      label: string;
      onPress: () => void;
    } | null = null
  ) {
    setSuccessMessage('');

    setErrorMessage(
      message
    );

    setErrorAction(action);

    errorShake.setValue(
      0
    );

    Animated.sequence([
      Animated.timing(
        errorShake,
        {
          toValue: -8,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 8,

          duration: 70,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: -6,

          duration: 65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 6,

          duration: 65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: -3,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 3,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 0,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),
    ]).start();
  }

  // ==========================================================
  // CREATE BUTTON ANIMATION
  // ==========================================================

  function handleButtonPressIn() {
    if (
      loading
    ) {
      return;
    }

    Animated.spring(
      buttonScale,
      {
        toValue: 0.97,

        friction: 7,

        tension: 160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  function handleButtonPressOut() {
    Animated.spring(
      buttonScale,
      {
        toValue: 1,

        friction: 7,

        tension: 160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  // ==========================================================
  // TERMS CHECKBOX
  // ==========================================================

  function handleToggleAgreement() {
    if (
      loading
    ) {
      return;
    }

    setAccepted(
      current =>
        !current
    );

    setTermsError(false);

    Animated.sequence([
      Animated.timing(
        checkboxScale,
        {
          toValue: 0.82,

          duration: 70,

          useNativeDriver:
            true,
        }
      ),

      Animated.spring(
        checkboxScale,
        {
          toValue: 1,

          friction: 5,

          tension: 180,

          useNativeDriver:
            true,
        }
      ),
    ]).start();

    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }

  // ==========================================================
  // CREATE ACCOUNT
  // ==========================================================

  async function handleCreateAccount() {
    if (loading) {
      return;
    }

    setErrorMessage('');
    setErrorAction(null);
    setSuccessMessage('');
    setTermsError(false);

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // CHECK THE FIELDS (messages under each one)
    // --------------------------------------------------------

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors: {
      email?: string;
      username?: string;
      password?: string;
      confirm?: string;
    } = {};

    if (!cleanEmail) {
      errors.email =
        'Enter your email address.';
    } else if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      errors.email =
        'Enter a valid email address.';
    }

    const usernameProblem =
      getUsernameProblem(username);

    if (usernameProblem) {
      errors.username =
        usernameProblem;
    } else if (
      usernameStatus === 'taken'
    ) {
      errors.username =
        'This username is taken.';
    }

    if (!password) {
      errors.password =
        'Create a password.';
    } else if (!passwordValid) {
      errors.password =
        'Your password doesn’t meet all the rules yet.';
    }

    if (!confirmPassword) {
      errors.confirm =
        'Type your password again.';
    } else if (!passwordsMatch) {
      errors.confirm =
        'Passwords don’t match.';
    }

    setFieldErrors(errors);

    if (
      errors.email ||
      errors.username ||
      errors.password ||
      errors.confirm
    ) {
      setConfirmTouched(true);

      triggerError(
        'Please fix the highlighted fields.'
      );

      return;
    }

    // --------------------------------------------------------
    // TERMS
    // --------------------------------------------------------

    if (!accepted) {
      setTermsError(true);

      triggerError(
        'Please agree to the Terms of Service and Privacy Policy.'
      );

      return;
    }

    // --------------------------------------------------------
    // API
    // --------------------------------------------------------

    try {
      setLoading(
        true
      );

      const data =
        await registerUser(
          cleanEmail,
          cleanUsername(username),
          password,
          confirmPassword
        );

      setErrorMessage('');

      // ------------------------------------------------------
      // SESSION RETURNED
      // ------------------------------------------------------

      if (
        data?.session?.access_token
      ) {
        await saveSession(
          data.session
        );

        setPassword('');

        setConfirmPassword('');

        setSuccessMessage(
          'Account created successfully.'
        );

        setTimeout(
          () => {
            router.replace(
              '/complete-profile/personal'
            );
          },
          700
        );

        return;
      }

      // ------------------------------------------------------
      // EMAIL VERIFICATION REQUIRED
      // ------------------------------------------------------

      setPassword('');

      setConfirmPassword('');

      router.push({
        pathname:
          '/verify-email',

        params: {
          email:
            cleanEmail,
        },
      });
    } catch (
      error
    ) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      let message =
        'Unable to create your account. Please try again.';

      // Already has an account: offer to sign in instead.
      if (
        error instanceof
          ApiError &&
        error.data?.code ===
          'EMAIL_ALREADY_REGISTERED'
      ) {
        setFieldErrors({
          email:
            'This email already has an account.',
        });

        triggerError(
          'An account with this email already exists.',
          {
            label:
              'Sign in instead',

            onPress: () =>
              router.replace({
                pathname:
                  '/',

                params: {
                  email:
                    cleanEmail,
                },
              }),
          }
        );

        return;
      }

      // Username taken (someone just picked it) or not allowed.
      if (
        error instanceof ApiError &&
        (error.data?.code ===
          'USERNAME_TAKEN' ||
          error.data?.code ===
            'INVALID_USERNAME')
      ) {
        if (
          error.data.code ===
          'USERNAME_TAKEN'
        ) {
          setUsernameStatus('taken');
        }

        setFieldErrors({
          username:
            error.message,
        });

        triggerError(
          'Please choose another username.'
        );

        return;
      }

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      triggerError(
        message
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  // ==========================================================
  // CLEAR A FIELD ERROR WHILE TYPING
  // ==========================================================

  function clearFieldError(
    field: 'email' | 'username' | 'password' | 'confirm'
  ) {
    if (fieldErrors[field]) {
      setFieldErrors(
        current => ({
          ...current,
          [field]: undefined,
        })
      );
    }

    if (errorMessage) {
      setErrorMessage('');

      setErrorAction(null);
    }
  }

  // ==========================================================
  // PASSWORD REQUIREMENT ITEM
  // ==========================================================

  function PasswordRequirement({
    valid,
    label,
  }: {
    valid: boolean;
    label: string;
  }) {
    return (
      <View
        style={
          styles.requirementItem
        }
      >
        <MaterialIcons
          name={
            valid
              ? 'check-circle'
              : 'radio-button-unchecked'
          }
          size={13}
          color={
            valid
              ? COLORS.requirementActive
              : COLORS.requirementInactive
          }
        />

        <Text
          style={[
            styles.requirementText,

            valid &&
              styles.requirementTextValid,
          ]}
        >
          {label}
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
            <ScrollView
              style={
                styles.flex
              }
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
              <View
                style={
                  styles.authContent
                }
              >
                {/* ==================================================
                    HEADER
                ================================================== */}

                <View
                  style={
                    styles.headerWrapper
                  }
                >
                  <LinearGradient
                    colors={[
                      COLORS.red,
                      COLORS.redDark,
                    ]}
                    style={withStatusBar(
                      [
                        styles.header,

                        isSmallPhone &&
                          styles.headerSmall,
                      ],
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

                    <Animated.View
                      style={{
                        alignItems:
                          'center',

                        opacity:
                          headerOpacity,

                        transform: [
                          {
                            translateY:
                              headerTranslateY,
                          },
                        ],
                      }}
                    >
                      <Text
                        style={[
                          styles.brandName,

                          isSmallPhone &&
                            styles.brandNameSmall,
                        ]}
                      >
                        Hemo-Hero
                      </Text>

                      <Text
                        style={
                          styles.tagline
                        }
                      >
                        Connect to Donors Near You
                      </Text>
                    </Animated.View>
                  </LinearGradient>
                </View>

                {/* ==================================================
                    LOGO
                ================================================== */}

                <Animated.View
                  style={[
                    styles.logoCircle,

                    isSmallPhone &&
                      styles.logoCircleSmall,

                    // Moves down with the header.
                    {
                      marginTop:
                        insets.top,
                    },

                    {
                      opacity:
                        logoOpacity,

                      transform: [
                        {
                          scale:
                            logoScale,
                        },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={require(
                      '../../assets/images/LifeLine (5).png'
                    )}
                    style={[
                      styles.logoImage,

                      isSmallPhone &&
                        styles.logoImageSmall,
                    ]}
                    resizeMode="contain"
                  />
                </Animated.View>

                {/* ==================================================
                    BODY
                ================================================== */}

                <LinearGradient
                  colors={[
                    COLORS.pinkTop,
                    COLORS.pinkBottom,
                  ]}
                  style={[
                    styles.bodyBackground,

                    isSmallPhone &&
                      styles.bodyBackgroundSmall,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.card,

                      isSmallPhone &&
                        styles.cardSmall,

                      {
                        opacity:
                          cardOpacity,

                        transform: [
                          {
                            translateY:
                              cardTranslateY,
                          },
                        ],
                      },
                    ]}
                  >
                    {/* ==============================================
                        TABS
                    ============================================== */}

                    <AuthTabs
                      active="signup"
                      disabled={
                        loading
                      }
                      onSwitch={() =>
                        router.replace({
                          pathname:
                            '/',

                          params:
                            email.trim()
                              ? {
                                  email:
                                    email
                                      .trim()
                                      .toLowerCase(),
                                }
                              : {},
                        } as any)
                      }
                    />

                    {/* ==============================================
                        ERROR
                    ============================================== */}

                    {errorMessage ? (
                      <Animated.View
                        style={[
                          styles.errorContainer,

                          {
                            transform: [
                              {
                                translateX:
                                  errorShake,
                              },
                            ],
                          },
                        ]}
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

                        {errorAction ? (
                          <TouchableOpacity
                            style={
                              styles.errorAction
                            }
                            activeOpacity={
                              0.75
                            }
                            accessibilityRole="button"
                            onPress={
                              errorAction.onPress
                            }
                          >
                            <Text
                              style={
                                styles.errorActionText
                              }
                            >
                              {
                                errorAction.label
                              }
                            </Text>

                            <MaterialIcons
                              name="arrow-forward"
                              size={15}
                              color={
                                COLORS.redButton
                              }
                            />
                          </TouchableOpacity>
                        ) : null}
                      </Animated.View>
                    ) : null}

                    {/* ==============================================
                        SUCCESS
                    ============================================== */}

                    {successMessage ? (
                      <View
                        style={
                          styles.successContainer
                        }
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={17}
                          color={
                            COLORS.success
                          }
                        />

                        <Text
                          style={
                            styles.successText
                          }
                        >
                          {
                            successMessage
                          }
                        </Text>
                      </View>
                    ) : null}

                    {/* ==============================================
                        EMAIL
                    ============================================== */}

                    <AuthField
                      label="Email Address"
                      icon="mail-outline"
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="email"
                      textContentType="emailAddress"
                      value={
                        email
                      }
                      editable={
                        !loading
                      }
                      returnKeyType="next"
                      submitBehavior="submit"
                      error={
                        fieldErrors.email
                      }
                      onChangeText={value => {
                        setEmail(
                          value
                        );

                        clearFieldError(
                          'email'
                        );
                      }}
                      onBlur={() =>
                        setEmail(
                          current =>
                            current.trim()
                        )
                      }
                      onSubmitEditing={() =>
                        usernameRef.current?.focus()
                      }
                    />

                    {/* ==============================================
                        USERNAME (checked while typing)
                    ============================================== */}

                    <AuthField
                      ref={
                        usernameRef
                      }
                      label="Username"
                      icon="alternate-email"
                      placeholder="Choose a username"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="username-new"
                      textContentType="username"
                      maxLength={21}
                      value={
                        username
                      }
                      editable={
                        !loading
                      }
                      returnKeyType="next"
                      submitBehavior="submit"
                      error={
                        fieldErrors.username ||
                        (usernameStatus === 'taken'
                          ? 'This username is taken.'
                          : undefined)
                      }
                      valid={
                        usernameStatus ===
                        'available'
                      }
                      onChangeText={value => {
                        setUsername(
                          value
                        );

                        clearFieldError(
                          'username'
                        );
                      }}
                      onSubmitEditing={() =>
                        passwordRef.current?.focus()
                      }
                    >
                      {!fieldErrors.username &&
                      usernameStatus !== 'taken' ? (
                        <Text
                          style={
                            styles.usernameHint
                          }
                        >
                          {usernameStatus ===
                          'checking'
                            ? 'Checking...'
                            : usernameStatus ===
                                'available'
                              ? 'Available. You can sign in with it or your email.'
                              : '3 to 20 letters, numbers, periods or underscores.'}
                        </Text>
                      ) : null}
                    </AuthField>

                    {/* ==============================================
                        PASSWORD (+ strength and rules)
                    ============================================== */}

                    <AuthField
                      ref={
                        passwordRef
                      }
                      label="Password"
                      icon="lock-outline"
                      password
                      placeholder="Create a password"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="new-password"
                      textContentType="newPassword"
                      value={
                        password
                      }
                      editable={
                        !loading
                      }
                      returnKeyType="next"
                      submitBehavior="submit"
                      error={
                        fieldErrors.password
                      }
                      onFocus={() =>
                        setPasswordFocused(
                          true
                        )
                      }
                      onBlur={() =>
                        setPasswordFocused(
                          false
                        )
                      }
                      onChangeText={value => {
                        setPassword(
                          value
                        );

                        clearFieldError(
                          'password'
                        );
                      }}
                      onSubmitEditing={() =>
                        confirmRef.current?.focus()
                      }
                    >
                      {password.length >
                      0 ? (
                        <View
                          style={
                            styles.strengthRow
                          }
                        >
                          <View
                            style={
                              styles.strengthTrack
                            }
                          >
                            <View
                              style={[
                                styles.strengthFill,
                                {
                                  width: `${
                                    (passwordScore /
                                      5) *
                                    100
                                  }%`,
                                  backgroundColor:
                                    strength.color,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={[
                              styles.strengthLabel,
                              {
                                color:
                                  strength.color,
                              },
                            ]}
                          >
                            {passwordValid
                              ? 'Password looks good'
                              : strength.label}
                          </Text>
                        </View>
                      ) : null}

                      {/* Rules: while typing, until all are met */}
                      {!passwordValid &&
                      (passwordFocused ||
                        Boolean(
                          fieldErrors.password
                        )) ? (
                        <FadeInView
                          offset={-4}
                          style={
                            styles.requirementsList
                          }
                        >
                          <PasswordRequirement
                            valid={
                              passwordHasMinimumLength
                            }
                            label="8+ characters"
                          />

                          <PasswordRequirement
                            valid={
                              passwordHasLowercase
                            }
                            label="Lowercase letter"
                          />

                          <PasswordRequirement
                            valid={
                              passwordHasUppercase
                            }
                            label="Uppercase letter"
                          />

                          <PasswordRequirement
                            valid={
                              passwordHasNumber
                            }
                            label="Number"
                          />

                          <PasswordRequirement
                            valid={
                              passwordHasSpecialCharacter
                            }
                            label="Special character"
                          />
                        </FadeInView>
                      ) : null}
                    </AuthField>

                    {/* ==============================================
                        CONFIRM PASSWORD
                    ============================================== */}

                    <AuthField
                      ref={
                        confirmRef
                      }
                      label="Confirm Password"
                      icon="lock-outline"
                      password
                      placeholder="Type it again"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="new-password"
                      textContentType="newPassword"
                      value={
                        confirmPassword
                      }
                      editable={
                        !loading
                      }
                      returnKeyType="done"
                      valid={
                        passwordsMatch
                      }
                      error={
                        fieldErrors.confirm ||
                        (confirmTouched &&
                        confirmPassword.length >
                          0 &&
                        !passwordsMatch
                          ? 'Passwords don’t match.'
                          : null)
                      }
                      onBlur={() =>
                        setConfirmTouched(
                          true
                        )
                      }
                      onChangeText={value => {
                        setConfirmPassword(
                          value
                        );

                        clearFieldError(
                          'confirm'
                        );
                      }}
                    />

                    {/* ==============================================
                        TERMS
                    ============================================== */}

                    <View
                      style={
                        styles.agreementRow
                      }
                    >
                      <TouchableOpacity
                        activeOpacity={
                          0.7
                        }
                        disabled={
                          loading
                        }
                        onPress={
                          handleToggleAgreement
                        }
                      >
                        <Animated.View
                          style={[
                            styles.checkbox,

                            accepted &&
                              styles.checkboxChecked,

                            termsError &&
                              styles.checkboxError,

                            {
                              transform: [
                                {
                                  scale:
                                    checkboxScale,
                                },
                              ],
                            },
                          ]}
                        >
                          {accepted ? (
                            <MaterialIcons
                              name="check"
                              size={13}
                              color={
                                COLORS.white
                              }
                            />
                          ) : null}
                        </Animated.View>
                      </TouchableOpacity>

                      <Text
                        style={
                          styles.agreementText
                        }
                      >
                        I agree to the{' '}

                        <Text
                          style={
                            styles.linkText
                          }
                          onPress={() =>
                            router.push(
                              '/terms-of-service'
                            )
                          }
                        >
                          Terms of Service
                        </Text>

                        {' '}and{' '}

                        <Text
                          style={
                            styles.linkText
                          }
                          onPress={() =>
                            router.push(
                              '/privacy-policy'
                            )
                          }
                        >
                          Privacy Policy
                        </Text>

                        .
                      </Text>
                    </View>

                    {/* ==============================================
                        CREATE ACCOUNT
                    ============================================== */}

                    <Animated.View
                      style={{
                        transform: [
                          {
                            scale:
                              buttonScale,
                          },
                        ],
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,

                          loading &&
                            styles.disabledButton,
                        ]}
                        activeOpacity={
                          1
                        }
                        accessibilityRole="button"
                        disabled={
                          loading
                        }
                        onPressIn={
                          handleButtonPressIn
                        }
                        onPressOut={
                          handleButtonPressOut
                        }
                        onPress={
                          handleCreateAccount
                        }
                      >
                        {loading ? (
                          <ActivityIndicator
                            color={
                              COLORS.white
                            }
                          />
                        ) : null}

                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          {loading
                            ? 'Creating Account...'
                            : 'Create Account'}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </Animated.View>
                </LinearGradient>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
    // Under the Username field.
    usernameHint: {
      marginTop: 5,
      marginLeft: 14,
      color: '#777777',
      fontFamily: 'Inter_400Regular',
      fontSize: 11.5,
    },

    flex: {
      flex: 1,
    },

    // ========================================================
    // DESKTOP
    // ========================================================

    desktopBackground: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS === 'web'
          ? '#1E1E1E'
          : COLORS.pinkBottom,
    },

    // ========================================================
    // PHONE
    // ========================================================

    phone: {
      width:
        Platform.OS === 'web'
          ? 440
          : '100%',

      height:
        Platform.OS === 'web'
          ? '100%'
          : '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.pinkBottom,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    scroll: {
      flexGrow: 1,

      backgroundColor:
        COLORS.pinkBottom,
    },

    authContent: {
      flexGrow: 1,

      position:
        'relative',

      backgroundColor:
        COLORS.pinkTop,
    },

    // ========================================================
    // HEADER
    // ========================================================

    headerWrapper: {
      backgroundColor:
        COLORS.pinkTop,

      zIndex:
        1,
    },

    header: {
      height: 260,

      alignItems:
        'center',

      paddingTop: 55,

      borderBottomLeftRadius:
        62,

      borderBottomRightRadius:
        62,

      overflow:
        'hidden',
    },

    headerSmall: {
      height: 230,

      paddingTop: 38,

      borderBottomLeftRadius:
        54,

      borderBottomRightRadius:
        54,
    },

    headerCircleLeft: {
      position:
        'absolute',

      width: 180,

      height: 180,

      borderRadius: 90,

      left: -100,

      top: -50,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width: 180,

      height: 180,

      borderRadius: 90,

      right: -92,

      top: -55,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    brandName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 31,
    },

    brandNameSmall: {
      fontSize: 29,
    },

    tagline: {
      marginTop: 7,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,
    },

    // ========================================================
    // LOGO
    // ========================================================

    logoCircle: {
      position:
        'absolute',

      top: 186,

      alignSelf:
        'center',

      width: 148,

      height: 148,

      borderRadius: 74,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      zIndex: 100,

      elevation: 100,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.08,

      shadowRadius: 4,
    },

    logoCircleSmall: {
      top: 167,

      width: 126,

      height: 126,

      borderRadius: 63,
    },

    logoImage: {
      width: 128,

      height: 128,
    },

    logoImageSmall: {
      width: 108,

      height: 108,
    },

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flexGrow: 1,

      minHeight: 614,

      paddingHorizontal: 26,

      paddingTop:
        Platform.OS === 'web'
          ? 115
          : 100,

      paddingBottom: 36,

      zIndex: 2,
    },

    bodyBackgroundSmall: {
      minHeight: 614,

      paddingHorizontal: 22,

      paddingTop: 82,

      paddingBottom: 28,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius: 25,

      paddingHorizontal: 22,

      paddingTop: 17,

      paddingBottom: 23,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.06,

      shadowRadius: 5,

      elevation: 2,
    },

    cardSmall: {
      borderRadius: 23,

      paddingHorizontal: 20,

      paddingTop: 15,

      paddingBottom: 20,
    },

    // ========================================================
    // TABS
    // ========================================================

    // ========================================================
    // ERROR
    // ========================================================

    errorContainer: {
      marginBottom: 15,

      paddingHorizontal: 12,

      paddingVertical: 9,

      borderWidth: 1,

      borderColor:
        '#F5BABA',

      borderRadius: 8,

      backgroundColor:
        '#FDECEC',
    },

    // "Sign in instead" under the message.
    errorAction: {
      marginTop: 8,
      alignSelf: 'center',
      minHeight: 30,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 15,
      backgroundColor: COLORS.white,
    },

    errorActionText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      lineHeight: 17,

      textAlign:
        'center',
    },

    // ========================================================
    // SUCCESS
    // ========================================================

    successContainer: {
      marginBottom: 15,

      paddingHorizontal: 12,

      paddingVertical: 9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

      borderWidth: 1,

      borderColor:
        COLORS.successBorder,

      borderRadius: 8,

      backgroundColor:
        COLORS.successBackground,
    },

    successText: {
      flex: 1,

      color:
        COLORS.success,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      lineHeight: 17,

      textAlign:
        'center',
    },

    // ========================================================
    // FORM
    // ========================================================

    // ========================================================
    // PASSWORD REQUIREMENTS
    // ========================================================

    // Password strength bar under the field.
    strengthRow: {
      marginTop: 8,
      marginHorizontal: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    strengthTrack: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: '#EFE6E6',
    },

    strengthFill: {
      height: '100%',
      borderRadius: 3,
    },

    strengthLabel: {
      minWidth: 52,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11.5,
      textAlign: 'right',
    },

    // Rules, shown while typing until all are met.
    requirementsList: {
      marginTop: 8,
      marginHorizontal: 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 12,
      rowGap: 5,
    },

    requirementItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,
    },

    requirementText: {
      color:
        COLORS.requirementInactive,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    requirementTextValid: {
      color:
        COLORS.requirementActive,
    },

    // ========================================================
    // TERMS
    // ========================================================

    agreementRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop: 15,

      paddingHorizontal: 4,
    },

    checkbox: {
      width: 15,

      height: 15,

      marginRight: 9,

      borderWidth: 1,

      borderColor:
        '#CCCCCC',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    checkboxError: {
      borderWidth: 1.5,
      borderColor: COLORS.redButton,
    },

    checkboxChecked: {
      borderColor:
        COLORS.red,

      backgroundColor:
        COLORS.red,
    },

    agreementText: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    linkText: {
      color:
        COLORS.red,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      flexDirection: 'row',

      gap: 8,

      height: 50,

      marginTop: 26,

      borderRadius: 7,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    disabledButton: {
      opacity: 0.6,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14.5,
    },
  });