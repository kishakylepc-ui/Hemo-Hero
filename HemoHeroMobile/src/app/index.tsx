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
  MaterialIcons,
} from '@expo/vector-icons';

import {
  ApiError,
  getCurrentUser,
  getLoginCaptcha,
  loginUser,
  type LoginCaptcha,
} from '../lib/api';

import {
  getAccessToken,
  saveSession,
} from '../lib/session';

import {
  clearLoginLock,
  getLoginLock,
  saveLoginLock,
} from '../lib/loginLock';

import {
  IDLE_TIMEOUT_MINUTES,
  isSessionIdle,
} from '../lib/sessionTimeout';

import { getUsernameProblem } from '../lib/username';

import {
  holdIntro,
  whenIntroDone,
} from '../lib/appIntro';

import AuthField from '../components/AuthField';
import AuthTabs from '../components/AuthTabs';
import CaptchaField from '../components/CaptchaField';

// A lockout or CAPTCHA the server asked for. email null means
// the whole network is limited, not one account.
type SignInLock = {
  email: string | null;
  until: number | null;
  captcha: boolean;
};

type SignInField =
  | 'email'
  | 'password'
  | 'captcha';

// Seconds left on a lockout, from the server's reply.
function getRetrySeconds(
  apiData: any
) {
  const seconds =
    Number(
      apiData?.retry_after_seconds
    );

  if (
    Number.isFinite(seconds) &&
    seconds > 0
  ) {
    return seconds;
  }

  const minutes =
    Number(
      apiData?.retry_after_minutes
    );

  return Number.isFinite(minutes) &&
    minutes > 0
    ? minutes * 60
    : 60;
}

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

  noticeText: '#9A5B0C',
  noticeBorder: '#F3D3A8',
  noticeBackground: '#FFF6EA',
};

// ============================================================
// SCREEN
// ============================================================

export default function SignInScreen() {
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
    iPhone 16 Pro = approximately 402 x 874

    Smaller phones such as iPhone 13
    receive slightly tighter spacing.
  */
  const isSmallPhone =
    Platform.OS !==
      'web' &&
    height <=
      844;

  // Email carried over from Sign Up ("Sign in instead"), and
  // why the last session ended (SessionTimeout).
  const params =
    useLocalSearchParams<{
      email?: string | string[];
      signedOut?: string | string[];
    }>();

  const signedOutNotice =
    params.signedOut ===
    'inactivity'
      ? `You were signed out after ${IDLE_TIMEOUT_MINUTES} minute${IDLE_TIMEOUT_MINUTES === 1 ? '' : 's'} of inactivity.`
      : params.signedOut ===
          'signed_out'
        ? 'You signed out in another tab.'
        : '';

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
    useState<
      Partial<
        Record<SignInField, string>
      >
    >({});

  // Field the banner's problem belongs to (red outline).
  const [
    invalidField,
    setInvalidField,
  ] =
    useState<SignInField | null>(
      null
    );

  // Next step offered with the error (verify email, sign up).
  const [
    errorAction,
    setErrorAction,
  ] =
    useState<{
      label: string;
      onPress: () => void;
    } | null>(null);

  // Too many attempts: signing in is locked until lock.until,
  // and after a lockout every attempt needs a CAPTCHA.
  const [
    lock,
    setLock,
  ] =
    useState<SignInLock | null>(
      null
    );

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const [
    captcha,
    setCaptcha,
  ] =
    useState<LoginCaptcha | null>(
      null
    );

  const [
    captchaAnswer,
    setCaptchaAnswer,
  ] =
    useState('');

  const [
    captchaLoading,
    setCaptchaLoading,
  ] =
    useState(false);

  const [
    captchaLoadError,
    setCaptchaLoadError,
  ] =
    useState<string | null>(
      null
    );

  const passwordRef =
    useRef<TextInputInstance>(null);

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

          // Unused too long: SessionTimeout signs out and says
          // why, so stay here.
          if (
            await isSessionIdle()
          ) {
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
  // LOCKOUT + CAPTCHA
  //
  // The server decides; this only shows it. A lock is saved on
  // the phone so reopening the app shows the countdown (and the
  // CAPTCHA) again before the next attempt.
  // ==========================================================

  function applyLock(
    next: SignInLock | null
  ) {
    setNow(Date.now());
    setLock(next);

    if (!next) {
      void clearLoginLock();

      return;
    }

    // A network limit isn't about one account; not saved.
    if (next.email) {
      void saveLoginLock({
        email:
          next.email,

        lockedUntil:
          next.until,

        captchaRequired:
          next.captcha,
      });
    }
  }

  // Saved lock from before the app was closed.
  useEffect(
    () => {
      let active = true;

      (async () => {
        const saved =
          await getLoginLock();

        if (
          !active ||
          !saved
        ) {
          return;
        }

        const until =
          saved.lockedUntil &&
          saved.lockedUntil >
            Date.now()
            ? saved.lockedUntil
            : null;

        if (
          !until &&
          !saved.captchaRequired
        ) {
          void clearLoginLock();

          return;
        }

        setNow(Date.now());

        setLock({
          email:
            saved.email,

          until,

          captcha:
            saved.captchaRequired,
        });

        // The locked account, unless Sign Up passed another.
        const passedEmail =
          typeof params.email ===
          'string'
            ? params.email
                .trim()
                .toLowerCase()
            : '';

        if (!passedEmail) {
          setEmail(
            saved.email
          );
        }

        if (
          until &&
          (!passedEmail ||
            passedEmail ===
              saved.email)
        ) {
          setErrorMessage(
            'Too many incorrect password attempts.'
          );
        }
      })();

      return () => {
        active = false;
      };
    },
    []
  );

  // Countdown; when it ends, the CAPTCHA (if needed) remains.
  useEffect(
    () => {
      const until =
        lock?.until;

      if (!until) {
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
              until
            ) {
              setErrorMessage('');
              setErrorAction(null);

              applyLock(
                lock.captcha
                  ? {
                      ...lock,
                      until:
                        null,
                    }
                  : null
              );
            }
          },
          1000
        );

      return () =>
        clearInterval(timer);
    },
    [
      lock,
    ]
  );

  // A lock applies to the account it came from (or to every
  // account, for a network limit).
  const currentEmail =
    email
      .trim()
      .toLowerCase();

  const lockApplies =
    Boolean(lock) &&
    (lock?.email === null ||
      lock?.email ===
        currentEmail);

  const cooldownSeconds =
    lockApplies &&
    lock?.until
      ? Math.max(
          0,
          Math.ceil(
            (lock.until - now) /
              1000
          )
        )
      : 0;

  const showCaptcha =
    lockApplies &&
    lock?.captcha === true &&
    cooldownSeconds === 0;

  async function loadCaptcha() {
    setCaptchaLoading(true);
    setCaptchaLoadError(null);
    setCaptchaAnswer('');

    try {
      setCaptcha(
        await getLoginCaptcha()
      );
    } catch (error) {
      setCaptcha(null);

      setCaptchaLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load the picture.'
      );
    } finally {
      setCaptchaLoading(false);
    }
  }

  // A picture whenever one is needed and there isn't one (also
  // after each attempt, since a CAPTCHA works only once).
  useEffect(
    () => {
      if (
        showCaptcha &&
        !captcha &&
        !captchaLoading &&
        !captchaLoadError
      ) {
        void loadCaptcha();
      }
    },
    [
      showCaptcha,
      captcha,
      captchaLoading,
      captchaLoadError,
    ]
  );

  // The server forgets a CAPTCHA after 5 minutes; swap it for a
  // new one just before.
  useEffect(
    () => {
      if (!captcha) {
        return;
      }

      const timer =
        setTimeout(
          () =>
            setCaptcha(null),
          Math.max(
            30,
            captcha.expires_in_seconds -
              10
          ) * 1000
        );

      return () =>
        clearTimeout(timer);
    },
    [
      captcha,
    ]
  );

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
      field?: SignInField;
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

    const errors: Partial<
      Record<SignInField, string>
    > = {};

    // A username or an email (only an email has @).
    if (!cleanEmail) {
      errors.email =
        'Enter your username or email.';
    } else if (
      cleanEmail.includes('@')
        ? !emailPattern.test(
            cleanEmail
          )
        : Boolean(
            getUsernameProblem(
              cleanEmail
            )
          )
    ) {
      errors.email =
        cleanEmail.includes('@')
          ? 'Enter a valid email address.'
          : 'Enter a valid username or email.';
    }

    if (!password) {
      errors.password =
        'Enter your password.';
    }

    if (showCaptcha) {
      if (!captcha) {
        errors.captcha =
          'Wait for the picture to load.';
      } else if (
        !captchaAnswer.trim()
      ) {
        errors.captcha =
          'Type the characters in the picture.';
      }
    }

    if (
      errors.email ||
      errors.password ||
      errors.captcha
    ) {
      setFieldErrors(errors);

      shake();

      return;
    }

    // A CAPTCHA works for one attempt only.
    const captchaSent =
      showCaptcha &&
      captcha
        ? {
            captcha_id:
              captcha.captcha_id,

            captcha_answer:
              captchaAnswer.trim(),
          }
        : null;

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
          password,
          captchaSent
        );

      // Signed in: no lockout or CAPTCHA anymore.
      applyLock(null);

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
        | SignInField
        | undefined;

      let action:
        | {
            label: string;
            onPress: () => void;
          }
        | undefined;

      // The CAPTCHA just sent is used up; a new one loads.
      if (captchaSent) {
        setCaptcha(null);
        setCaptchaAnswer('');
      }

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
          const typedEmail =
            cleanEmail.includes('@');

          message =
            typedEmail
              ? 'No account uses this email.'
              : 'No account uses this username.';

          field = 'email';

          action = {
            label:
              'Create an account',

            onPress: () =>
              router.replace({
                pathname:
                  '/signup',

                params: typedEmail
                  ? {
                      email:
                        cleanEmail,
                    }
                  : {},
              } as any),
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

          if (
            apiData.captcha_required ===
            true
          ) {
            applyLock({
              email:
                cleanEmail,

              until:
                null,

              captcha:
                true,
            });
          }
        }

        // ----------------------------------------------------
        // CAPTCHA NEEDED (after a lockout) OR WRONG
        // ----------------------------------------------------

        else if (
          apiData.code ===
            'CAPTCHA_REQUIRED' ||
          apiData.code ===
            'CAPTCHA_INCORRECT'
        ) {
          message =
            apiData.code ===
            'CAPTCHA_INCORRECT'
              ? "The characters didn't match. Try the new picture."
              : 'This account was locked recently. Complete the security check to sign in.';

          field = 'captcha';

          applyLock({
            email:
              cleanEmail,

            until:
              null,

            captcha:
              true,
          });
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
                ? '1 attempt remaining before a temporary lockout.'
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
          message =
            'Too many incorrect password attempts.';

          applyLock({
            email:
              cleanEmail,

            until:
              Date.now() +
              getRetrySeconds(
                apiData
              ) *
                1000,

            captcha:
              apiData.captcha_required ===
              true,
          });
        }

        // ----------------------------------------------------
        // NETWORK / IP COOLDOWN
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'LOGIN_IP_RATE_LIMIT'
        ) {
          message =
            'Too many login attempts from this network.';

          applyLock({
            email:
              null,

            until:
              Date.now() +
              getRetrySeconds(
                apiData
              ) *
                1000,

            captcha:
              false,
          });
        }

        // ----------------------------------------------------
        // EMAIL REQUIRED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'EMAIL_REQUIRED'
        ) {
          message =
            'Please enter your username or email.';
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
            'Please enter your username or email, and your password.';
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
                        WHY THE LAST SESSION ENDED
                    ============================================== */}

                    {signedOutNotice &&
                    !errorMessage ? (
                      <View
                        style={
                          styles.noticeContainer
                        }
                        accessibilityLiveRegion="polite"
                      >
                        <MaterialIcons
                          name="info-outline"
                          size={17}
                          color={
                            COLORS.noticeText
                          }
                        />

                        <Text
                          style={
                            styles.noticeText
                          }
                        >
                          {
                            signedOutNotice
                          }
                        </Text>
                      </View>
                    ) : null}

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
                        label="Username or Email"
                        icon="person-outline"
                        placeholder="Enter your username or email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={
                          false
                        }
                        autoComplete="username"
                        textContentType="username"
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

                      {/* After a lockout: CAPTCHA before signing in */}

                      {showCaptcha ? (
                        <CaptchaField
                          captcha={
                            captcha
                          }
                          loading={
                            captchaLoading
                          }
                          loadError={
                            captchaLoadError
                          }
                          value={
                            captchaAnswer
                          }
                          editable={
                            !loading
                          }
                          error={
                            fieldErrors.captcha
                          }
                          invalid={
                            invalidField ===
                            'captcha'
                          }
                          onRefresh={() => {
                            setCaptcha(null);
                            setCaptchaLoadError(null);
                          }}
                          onChangeText={value => {
                            setCaptchaAnswer(
                              value
                            );

                            if (
                              fieldErrors.captcha ||
                              invalidField ===
                                'captcha'
                            ) {
                              setFieldErrors(
                                current => ({
                                  ...current,
                                  captcha:
                                    undefined,
                                })
                              );

                              setInvalidField(
                                null
                              );
                            }
                          }}
                          onSubmitEditing={
                            handleSignIn
                          }
                        />
                      ) : null}
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

    // "You were signed out after 15 minutes of inactivity."
    noticeContainer: {
      marginBottom: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: COLORS.noticeBorder,
      borderRadius: 8,
      backgroundColor: COLORS.noticeBackground,
    },

    noticeText: {
      flex: 1,
      color: COLORS.noticeText,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      lineHeight: 17,
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