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
} from 'react-native';

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

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  ApiError,
  getCurrentUser,
  loginUser,
} from '../lib/api';

import {
  getAccessToken,
  saveSession,
} from '../lib/session';

import {
  holdIntro,
  whenIntroDone,
} from '../lib/appIntro';

import AuthField from '../components/AuthField';
import AuthTabs from '../components/AuthTabs';

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
};

// ============================================================
// SCREEN
// ============================================================

export default function SignInScreen() {
  const {
    height,
  } =
    useWindowDimensions();

  /*
    PRIMARY TARGET:
    iPhone 16 Pro = approximately 402 x 874

    Smaller phones such as iPhone 13
    receive slightly tighter spacing.
  */
  const isSmallPhone =
    Platform.OS !==
      'web' &&
    height <=
      844;

  // Email carried over from Sign Up ("Sign in instead").
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

  const [
    password,
    setPassword,
  ] =
    useState('');

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

  // Typing mistakes, shown under each field.
  const [
    fieldErrors,
    setFieldErrors,
  ] =
    useState<{
      email?: string;
      password?: string;
    }>({});

  // Field the banner's problem belongs to (red outline).
  const [
    invalidField,
    setInvalidField,
  ] =
    useState<
      'email' | 'password' | null
    >(null);

  // Next step offered with the error (verify email, sign up).
  const [
    errorAction,
    setErrorAction,
  ] =
    useState<{
      label: string;
      onPress: () => void;
    } | null>(null);

  // Too many attempts: signing in is locked until then.
  const [
    cooldownUntil,
    setCooldownUntil,
  ] =
    useState<number | null>(
      null
    );

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const passwordRef =
    useRef<TextInput>(null);

  // ==========================================================
  // ANIMATION VALUES
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

  const errorShake =
    useRef(
      new Animated.Value(0)
    ).current;

  // ==========================================================
  // SCREEN ENTRANCE ANIMATION
  // ==========================================================

  // Waits for the opening animation (first launch) so this
  // entrance isn't hidden underneath it.
  useEffect(
    () =>
      whenIntroDone(() => {
        Animated.sequence([
          // ----------------------------------------------------
          // HEADER
          // ----------------------------------------------------

          Animated.parallel([
            Animated.timing(
              headerOpacity,
              {
                toValue:
                  1,

                duration:
                  320,

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
                toValue:
                  0,

                duration:
                  320,

                easing:
                  Easing.out(
                    Easing.ease
                  ),

                useNativeDriver:
                  true,
              }
            ),
          ]),

          // ----------------------------------------------------
          // LOGO + CARD
          // ----------------------------------------------------

          Animated.parallel([
            Animated.parallel([
              Animated.timing(
                logoOpacity,
                {
                  toValue:
                    1,

                  duration:
                    330,

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
                  toValue:
                    1,

                  friction:
                    6,

                  tension:
                    70,

                  useNativeDriver:
                    true,
                }
              ),
            ]),

            Animated.parallel([
              Animated.timing(
                cardOpacity,
                {
                  toValue:
                    1,

                  duration:
                    430,

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
                  toValue:
                    0,

                  duration:
                    430,

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
  // STAY SIGNED IN
  //
  // A saved session skips this screen. The opening animation
  // waits for this check, so people go straight from it to the
  // dashboard. (authorizedFetch renews an expired token; if that
  // fails the session is cleared and this screen stays.)
  // ==========================================================

  useEffect(
    () => {
      let active = true;

      const releaseIntro =
        holdIntro();

      (async () => {
        try {
          const token =
            await getAccessToken();

          if (!token) {
            return;
          }

          const data =
            await getCurrentUser(
              token
            );

          if (
            !active ||
            !data?.user
          ) {
            return;
          }

          router.replace(
            data.user
              .onboarding_complete ===
              true
              ? '/dashboard'
              : '/complete-profile/personal'
          );
        } catch (error) {
          console.log(
            'RESTORE SESSION ERROR:',
            error
          );
        } finally {
          releaseIntro();
        }
      })();

      return () => {
        active = false;

        releaseIntro();
      };
    },
    []
  );

  // ==========================================================
  // COOLDOWN COUNTDOWN
  // ==========================================================

  useEffect(
    () => {
      if (!cooldownUntil) {
        return;
      }

      const timer =
        setInterval(
          () => {
            const current =
              Date.now();

            setNow(current);

            if (
              current >=
              cooldownUntil
            ) {
              setCooldownUntil(
                null
              );

              setErrorMessage('');
            }
          },
          1000
        );

      return () =>
        clearInterval(timer);
    },
    [
      cooldownUntil,
    ]
  );

  const cooldownSeconds =
    cooldownUntil
      ? Math.max(
          0,
          Math.ceil(
            (cooldownUntil - now) /
              1000
          )
        )
      : 0;

  const cooldownText =
    `${Math.floor(
      cooldownSeconds / 60
    )}:${String(
      cooldownSeconds % 60
    ).padStart(2, '0')}`;

  // ==========================================================
  // ERRORS
  // ==========================================================

  // Clears everything about a previous attempt.
  function resetErrors() {
    setErrorMessage('');
    setFieldErrors({});
    setInvalidField(null);
    setErrorAction(null);
  }

  // Banner (with an optional next step) + red outline on the
  // field it's about.
  function triggerError(
    message: string,
    options: {
      field?: 'email' | 'password';
      action?: {
        label: string;
        onPress: () => void;
      };
    } = {}
  ) {
    setErrorMessage(
      message
    );

    setInvalidField(
      options.field || null
    );

    setErrorAction(
      options.action || null
    );

    shake();
  }

  function shake() {
    errorShake.setValue(
      0
    );

    Animated.sequence([
      Animated.timing(
        errorShake,
        {
          toValue:
            -8,

          duration:
            55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            8,

          duration:
            70,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            -6,

          duration:
            65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            6,

          duration:
            65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            -3,

          duration:
            55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            3,

          duration:
            55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue:
            0,

          duration:
            55,

          useNativeDriver:
            true,
        }
      ),
    ]).start();
  }

  // ==========================================================
  // BUTTON PRESS ANIMATION
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
        toValue:
          0.97,

        friction:
          7,

        tension:
          160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  function handleButtonPressOut() {
    Animated.spring(
      buttonScale,
      {
        toValue:
          1,

        friction:
          7,

        tension:
          160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  function handleForgotPassword() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    router.push({
      pathname:
        '/forgot-password',

      params: {
        email:
          cleanEmail,
      },
    });
  }

  // ==========================================================
  // SIGN IN
  // ==========================================================

  async function handleSignIn() {
    if (
      loading ||
      cooldownSeconds > 0
    ) {
      return;
    }

    resetErrors();

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
      password?: string;
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

    if (!password) {
      errors.password =
        'Enter your password.';
    }

    if (
      errors.email ||
      errors.password
    ) {
      setFieldErrors(errors);

      shake();

      return;
    }

    try {
      setLoading(
        true
      );

      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      const data =
        await loginUser(
          cleanEmail,
          password
        );

      // ------------------------------------------------------
      // VERIFY SESSION
      // ------------------------------------------------------

      if (
        !data?.session?.access_token
      ) {
        throw new Error(
          'Login succeeded, but no session was returned.'
        );
      }

      // ------------------------------------------------------
      // SAVE SESSION
      // ------------------------------------------------------

      await saveSession(
        data.session
      );

      setErrorMessage(
        ''
      );

      setPassword(
        ''
      );

      // ------------------------------------------------------
      // VERIFY PROFILE
      // ------------------------------------------------------

      if (
        !data?.profile
      ) {
        throw new Error(
          'Your account profile could not be loaded.'
        );
      }

      // ------------------------------------------------------
      // COMPLETED USER
      // ------------------------------------------------------

      if (
        data.profile
          .onboarding_complete ===
        true
      ) {
        router.replace(
          '/dashboard'
        );

        return;
      }

      // ------------------------------------------------------
      // INCOMPLETE USER
      // ------------------------------------------------------

      router.replace(
        '/complete-profile/personal'
      );
    } catch (
      error
    ) {
      console.log(
        'LOGIN ERROR:',
        error
      );

      let message =
        'Unable to sign in. Please try again.';

      let field:
        | 'email'
        | 'password'
        | undefined;

      let action:
        | {
            label: string;
            onPress: () => void;
          }
        | undefined;

      let lockMinutes = 0;

      // ------------------------------------------------------
      // STRUCTURED API ERRORS
      // ------------------------------------------------------

      if (
        error instanceof
        ApiError
      ) {
        const apiData =
          error.data ||
          {};

        // ----------------------------------------------------
        // ACCOUNT DOES NOT EXIST
        // ----------------------------------------------------

        if (
          apiData.code ===
          'ACCOUNT_NOT_FOUND'
        ) {
          message =
            'No account uses this email.';

          field = 'email';

          action = {
            label:
              'Create an account',

            onPress: () =>
              router.replace({
                pathname:
                  '/signup',

                params: {
                  email:
                    cleanEmail,
                },
              }),
          };
        }

        // ----------------------------------------------------
        // INCORRECT PASSWORD
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'INCORRECT_PASSWORD'
        ) {
          message =
            error.message ||
            'Incorrect password.';

          field = 'password';
        }

        // ----------------------------------------------------
        // OLD GENERIC CREDENTIAL RESPONSE
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'INVALID_CREDENTIALS'
        ) {
          const remaining =
            Number(
              apiData
                .attempts_remaining
            );

          if (
            Number.isFinite(
              remaining
            )
          ) {
            const attemptText =
              remaining ===
              1
                ? '1 attempt remaining before a 3-minute cooldown.'
                : `${remaining} attempts remaining.`;

            message =
              `Invalid email or password.\n${attemptText}`;
          } else {
            message =
              'Invalid email or password.';
          }

          field = 'password';
        }

        // ----------------------------------------------------
        // EMAIL NOT VERIFIED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'EMAIL_NOT_VERIFIED'
        ) {
          message =
            'Please verify your email before signing in.';

          field = 'email';

          action = {
            label:
              'Verify email',

            onPress: () =>
              router.push({
                pathname:
                  '/verify-email',

                params: {
                  email:
                    cleanEmail,
                },
              }),
          };
        }

        // ----------------------------------------------------
        // ACCOUNT COOLDOWN
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'LOGIN_ACCOUNT_RATE_LIMIT'
        ) {
          const retryMinutes =
            Number(
              apiData
                .retry_after_minutes
            );

          message =
            'Too many incorrect password attempts.';

          lockMinutes =
            Number.isFinite(
              retryMinutes
            )
              ? retryMinutes
              : 3;
        }

        // ----------------------------------------------------
        // NETWORK / IP COOLDOWN
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'LOGIN_IP_RATE_LIMIT'
        ) {
          const retryMinutes =
            Number(
              apiData
                .retry_after_minutes
            );

          message =
            'Too many login attempts from this network.';

          lockMinutes =
            Number.isFinite(
              retryMinutes
            )
              ? retryMinutes
              : 3;
        }

        // ----------------------------------------------------
        // EMAIL REQUIRED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'EMAIL_REQUIRED'
        ) {
          message =
            'Please enter your email address.';
        }

        // ----------------------------------------------------
        // PASSWORD REQUIRED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'PASSWORD_REQUIRED'
        ) {
          message =
            'Please enter your password.';
        }

        // ----------------------------------------------------
        // BOTH REQUIRED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'EMPTY_CREDENTIALS'
        ) {
          message =
            'Please enter your email address and password.';
        }

        // ----------------------------------------------------
        // INVALID EMAIL
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'INVALID_EMAIL'
        ) {
          message =
            'Please enter a valid email address.';
        }

        // ----------------------------------------------------
        // OTHER API ERROR
        // ----------------------------------------------------

        else {
          message =
            error.message;
        }
      } else if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      // ------------------------------------------------------
      // ERROR STAYS INSIDE APP + SHAKE
      // ------------------------------------------------------

      if (lockMinutes > 0) {
        setNow(Date.now());

        setCooldownUntil(
          Date.now() +
            lockMinutes * 60000
        );
      }

      triggerError(
        message,
        {
          field,
          action,
        }
      );
    } finally {
      setLoading(
        false
      );
    }
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
                    style={[
                      styles.header,

                      isSmallPhone &&
                        styles.headerSmall,
                    ]}
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
                      active="signin"
                      disabled={
                        loading
                      }
                      onSwitch={() =>
                        router.replace({
                          pathname:
                            '/signup',

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
                        ERROR (+ next step)
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
                        accessibilityLiveRegion="polite"
                      >
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {cooldownSeconds >
                          0
                            ? `${errorMessage}\nTry again in ${cooldownText}.`
                            : errorMessage}
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
                        FIELDS
                    ============================================== */}

                    <Animated.View
                      style={{
                        transform: [
                          {
                            translateX:
                              errorMessage
                                ? 0
                                : errorShake,
                          },
                        ],
                      }}
                    >
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
                        invalid={
                          invalidField ===
                          'email'
                        }
                        onChangeText={value => {
                          setEmail(
                            value
                          );

                          if (
                            fieldErrors.email ||
                            invalidField ===
                              'email'
                          ) {
                            setFieldErrors(
                              current => ({
                                ...current,
                                email:
                                  undefined,
                              })
                            );

                            setInvalidField(
                              null
                            );
                          }

                          if (
                            errorMessage &&
                            !cooldownSeconds
                          ) {
                            setErrorMessage(
                              ''
                            );

                            setErrorAction(
                              null
                            );
                          }
                        }}
                        onBlur={() =>
                          setEmail(
                            current =>
                              current.trim()
                          )
                        }
                        onSubmitEditing={() =>
                          passwordRef.current?.focus()
                        }
                      />

                      <AuthField
                        ref={
                          passwordRef
                        }
                        label="Password"
                        icon="lock-outline"
                        password
                        placeholder="Enter your password"
                        autoCapitalize="none"
                        autoCorrect={
                          false
                        }
                        autoComplete="current-password"
                        textContentType="password"
                        value={
                          password
                        }
                        editable={
                          !loading
                        }
                        returnKeyType="go"
                        error={
                          fieldErrors.password
                        }
                        invalid={
                          invalidField ===
                          'password'
                        }
                        onChangeText={value => {
                          setPassword(
                            value
                          );

                          if (
                            fieldErrors.password ||
                            invalidField ===
                              'password'
                          ) {
                            setFieldErrors(
                              current => ({
                                ...current,
                                password:
                                  undefined,
                              })
                            );

                            setInvalidField(
                              null
                            );
                          }

                          if (
                            errorMessage &&
                            !cooldownSeconds
                          ) {
                            setErrorMessage(
                              ''
                            );

                            setErrorAction(
                              null
                            );
                          }
                        }}
                        onSubmitEditing={
                          handleSignIn
                        }
                      />
                    </Animated.View>

                    {/* ==============================================
                        FORGOT PASSWORD
                    ============================================== */}

                    <TouchableOpacity
                      style={
                        styles.forgotButton
                      }
                      activeOpacity={
                        0.7
                      }
                      disabled={
                        loading
                      }
                      onPress={
                        handleForgotPassword
                      }
                    >
                      <Text
                        style={
                          styles.forgotText
                        }
                      >
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>

                    {/* ==============================================
                        SIGN IN BUTTON
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

                          (loading ||
                            cooldownSeconds >
                              0) &&
                            styles.disabledButton,
                        ]}
                        activeOpacity={
                          1
                        }
                        accessibilityRole="button"
                        disabled={
                          loading ||
                          cooldownSeconds >
                            0
                        }
                        onPressIn={
                          handleButtonPressIn
                        }
                        onPressOut={
                          handleButtonPressOut
                        }
                        onPress={
                          handleSignIn
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
                            ? 'Signing In...'
                            : cooldownSeconds >
                                0
                              ? `Try again in ${cooldownText}`
                              : 'Sign In'}
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
    flex: {
      flex:
        1,
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
      : COLORS.pinkBottom,
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

      borderRadius:
        90,

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

      borderRadius:
        90,

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

      fontSize:
        31,
    },

    brandNameSmall: {
      fontSize:
        29,
    },

    tagline: {
      marginTop:
        7,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },

    // ========================================================
    // LOGO
    // ========================================================

    logoCircle: {
      position:
        'absolute',

      top:
        186,

      alignSelf:
        'center',

      width:
        148,

      height:
        148,

      borderRadius:
        74,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      zIndex:
        100,

      elevation:
        100,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        4,
    },

    logoCircleSmall: {
      top:
        167,

      width:
        126,

      height:
        126,

      borderRadius:
        63,
    },

    logoImage: {
      width:
        128,

      height:
        128,
    },

    logoImageSmall: {
      width:
        108,

      height:
        108,
    },

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flexGrow:
        1,

      minHeight:
        614,

      paddingHorizontal:
        26,

      paddingTop:
        Platform.OS ===
          'web'
          ? 115
          : 100,

      paddingBottom:
        36,

      zIndex:
        2,
    },

    bodyBackgroundSmall: {
      minHeight:
        614,

      paddingHorizontal:
        22,

      paddingTop:
        82,

      paddingBottom:
        28,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius:
        25,

      paddingHorizontal:
        22,

      paddingTop:
        17,

      paddingBottom:
        23,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        5,

      elevation:
        2,
    },

    cardSmall: {
      borderRadius:
        23,

      paddingHorizontal:
        20,

      paddingTop:
        15,

      paddingBottom:
        20,
    },

    // ========================================================
    // TABS
    // ========================================================






    // ========================================================
    // ERROR
    // ========================================================

    errorContainer: {
      marginBottom:
        18,

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      borderWidth:
        1,

      borderColor:
        '#F5BABA',

      borderRadius:
        8,

      backgroundColor:
        '#FDECEC',
    },

    // "Verify email" / "Create an account" under the message.
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

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    // ========================================================
    // FORM
    // ========================================================






    // ========================================================
    // FORGOT
    // ========================================================

    forgotButton: {
      alignSelf:
        'flex-end',

      marginTop:
        14,
    },

    forgotText: {
      color:
        COLORS.red,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      flexDirection:
        'row',

      gap: 8,

      height:
        50,

      marginTop:
        28,

      borderRadius:
        7,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    disabledButton: {
      opacity:
        0.6,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },
  });