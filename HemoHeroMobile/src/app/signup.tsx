import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputInstance,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

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
import AuthHero from '../components/AuthHero';

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

  // Bottom link: Sign In, carrying over the typed email.
  function handleGoToSignIn() {
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
    } as any);
  }

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
    // A chip that turns green once the rule is met.
    return (
      <View
        style={[
          styles.requirementItem,

          valid &&
            styles.requirementItemValid,
        ]}
      >
        <Ionicons
          name={
            valid
              ? 'checkmark'
              : 'ellipse-outline'
          }
          size={12}
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
              {/* ====================================================
                  HERO: red top with the drop and the wave
              ==================================================== */}

              <AuthHero
                topInset={
                  insets.top
                }
                size="small"
                title={"Join Hemo-Hero"}
                subtitle="Request blood or become a donor."
                logoStyle={{
                  opacity:
                    logoOpacity,

                  transform: [
                    {
                      scale:
                        logoScale,
                    },
                  ],
                }}
                textStyle={{
                  opacity:
                    headerOpacity,

                  transform: [
                    {
                      translateY:
                        headerTranslateY,
                    },
                  ],
                }}
              />

              {/* ====================================================
                  FORM
              ==================================================== */}

                <Animated.View
                  style={[
                    styles.sheet,

                    {
                      paddingBottom:
                        Math.max(
                          insets.bottom,
                          12
                        ) + 22,

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

                            <Ionicons
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
                        <Ionicons
                          name="checkmark-circle"
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
                      icon="at-outline"
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
                          style={[
                            styles.usernameHint,

                            usernameStatus ===
                              'available' &&
                              styles.usernameHintAvailable,
                          ]}
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
                      icon="lock-closed-outline"
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
                          {/* One segment per rule met (5 rules). */}
                          <View
                            style={
                              styles.strengthSegments
                            }
                          >
                            {[0, 1, 2, 3, 4].map(
                              index => (
                                <View
                                  key={index}
                                  style={[
                                    styles.strengthSegment,

                                    index <
                                      passwordScore && {
                                      backgroundColor:
                                        strength.color,
                                    },
                                  ]}
                                />
                              )
                            )}
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
                      icon="lock-closed-outline"
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
                            <Ionicons
                              name="checkmark"
                              size={14}
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
                    {/* ==============================================
                        SWITCH TO SIGN IN
                    ============================================== */}

                    <View
                      style={
                        styles.footerRow
                      }
                    >
                      <Text
                        style={
                          styles.footerText
                        }
                      >
                        Already have an account?
                      </Text>

                      <TouchableOpacity
                        activeOpacity={
                          0.7
                        }
                        accessibilityRole="button"
                        disabled={
                          loading
                        }
                        hitSlop={8}
                        onPress={
                          handleGoToSignIn
                        }
                      >
                        <Text
                          style={
                            styles.footerLink
                          }
                        >
                          Sign in
                        </Text>
                      </TouchableOpacity>
                    </View>
                </Animated.View>
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
    // ========================================================
    // FORM (white, right under the hero's wave)
    // ========================================================

    sheet: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 4,
      backgroundColor: COLORS.white,
    },

    // "New to Hemo-Hero? Create an account"
    footerRow: {
      marginTop: 'auto',
      paddingTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },

    footerText: {
      color: '#666666',
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
    },

    footerLink: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },

    // Under the Username field.
    usernameHintAvailable: {
      color: COLORS.success,
    },

    requirementItemValid: {
      backgroundColor: COLORS.successBackground,
    },

    strengthSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#EDE6E6',
    },

    strengthSegments: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
    },

    usernameHint: {
      marginTop: 6,
      marginLeft: 4,
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
        Platform.OS ===
          'web'
          ? '#1E1E1E'
          : COLORS.white,
    },

    // ========================================================
    // PHONE
    // ========================================================

    phone: {
      width:
        '100%',

      height:
        '100%',

      maxWidth:
        Platform.OS ===
          'web'
          ? 440
          : '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.white,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.white,
    },

    scroll: {
      flexGrow: 1,
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

      borderRadius: 12,

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
      marginHorizontal: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
      marginHorizontal: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 6,
      rowGap: 6,
    },

    requirementItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,

      paddingHorizontal: 8,

      paddingVertical: 3,

      borderRadius: 10,

      backgroundColor: '#F2F2F4',
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
      width: 20,

      height: 20,

      marginRight: 10,

      borderWidth: 1.5,

      borderColor:
        '#CCCCCC',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius: 6,
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

      height: 52,

      marginTop: 20,

      borderRadius: 14,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',

      shadowColor: COLORS.redButton,

      shadowOpacity: 0.28,

      shadowRadius: 12,

      shadowOffset: {
        width: 0,
        height: 8,
      },

      elevation: 4,
    },

    disabledButton: {
      opacity: 0.6,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 15.5,
    },
  });