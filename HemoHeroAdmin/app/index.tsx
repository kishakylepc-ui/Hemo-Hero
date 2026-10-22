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
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  SvgXml,
} from 'react-native-svg';

import { useAdminCanvas } from '../components/AdminCanvas';

import {
  AdminApiError,
  getLoginCaptcha,
  loginAdmin,
  requestAdminPasswordReset,
  type LoginCaptcha,
} from '../lib/api';

import {
  clearAdminLoginLock,
  clearAdminSession,
  getAdminAccessToken,
  getAdminLoginLock,
  getAdminProfile,
  getRememberAdmin,
  saveAdminLoginLock,
  saveAdminSession,
} from '../lib/session';

import { isAdminRole } from '../lib/roles';

import {
  endIdleAdminSession,
  IDLE_TIMEOUT_MINUTES,
  isAdminSessionIdle,
} from '../lib/sessionTimeout';

// Why the last session ended (see SessionGuard).
function describeSignOut(
  reason: unknown
) {
  if (reason === 'inactivity') {
    return `You were signed out after ${IDLE_TIMEOUT_MINUTES} minute${IDLE_TIMEOUT_MINUTES === 1 ? '' : 's'} of inactivity.`;
  }

  if (reason === 'signed_out') {
    return 'You signed out in another tab.';
  }

  return '';
}

// A lockout or CAPTCHA the server asked for. email null means
// the whole network is limited, not one account.
type SignInLock = {
  email: string | null;
  until: number | null;
  captcha: boolean;
};

// Seconds left on a lockout, from the server's reply.
function getRetrySeconds(
  data: any
) {
  const seconds =
    Number(
      data?.retry_after_seconds
    );

  if (
    Number.isFinite(seconds) &&
    seconds > 0
  ) {
    return seconds;
  }

  const minutes =
    Number(
      data?.retry_after_minutes
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
  outer:
    '#02040A',

  navy:
    '#071126',

  navyLight:
    '#102044',

  navyInput:
    '#152543',

  card:
    'rgba(11, 23, 49, 0.95)',

  border:
    'rgba(123, 147, 201, 0.28)',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  redDark:
    '#8F1018',

  white:
    '#FFFFFF',

  text:
    '#F7F8FC',

  muted:
    '#8B97B6',

  soft:
    '#B9C3DA',

  error:
    '#FF727C',

  success:
    '#59D98E',

  successBackground:
    'rgba(89, 217, 142, 0.10)',

  notice:
    '#F3A34A',
};

// ============================================================
// LOGIN SCREEN
// ============================================================

export default function AdminLoginScreen() {

  // ==========================================================
  // IPAD PRO RESPONSIVE FRAME
  // ==========================================================

  const tablet =
    useAdminCanvas();

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] =
    useState(true);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('');

  // Why the last session ended (inactivity, another tab).
  const {
    signedOut,
  } =
    useLocalSearchParams<{
      signedOut?: string;
    }>();

  const [
    notice,
    setNotice,
  ] =
    useState(
      describeSignOut(
        signedOut
      )
    );

  useEffect(
    () => {
      const text =
        describeSignOut(
          signedOut
        );

      if (text) {
        setNotice(text);
      }
    },
    [
      signedOut,
    ]
  );

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

  // ==========================================================
  // ANIMATION VALUES
  // ==========================================================

  const brandOpacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const brandTranslateY =
    useRef(
      new Animated.Value(
        -16
      )
    ).current;

  const cardOpacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const cardTranslateY =
    useRef(
      new Animated.Value(
        32
      )
    ).current;

  const cardScale =
    useRef(
      new Animated.Value(
        0.98
      )
    ).current;

  const buttonScale =
    useRef(
      new Animated.Value(
        1
      )
    ).current;

  const checkboxScale =
    useRef(
      new Animated.Value(
        1
      )
    ).current;

  const errorShake =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const securityOpacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  // ==========================================================
  // EXISTING SESSION
  // ==========================================================

  useEffect(
    () => {
      checkExistingSession();
    },
    []
  );

  async function checkExistingSession() {
    try {
      const remember =
        await getRememberAdmin();

      if (
        !remember
      ) {
        await clearAdminSession();

        return;
      }

      const token =
        await getAdminAccessToken();

      const profile =
        await getAdminProfile();

      if (
        token &&
        isAdminRole(profile?.role)
      ) {
        // Remembered, but unused for too long: sign out
        // instead of reopening the portal.
        if (
          await isAdminSessionIdle()
        ) {
          await endIdleAdminSession();

          setNotice(
            describeSignOut(
              'inactivity'
            )
          );

          return;
        }

        router.replace(
          '/dashboard'
        );
      }
    } catch (
      sessionError
    ) {
      console.log(
        'ADMIN SESSION ERROR:',
        sessionError
      );

      await clearAdminSession();
    } finally {
      setCheckingSession(
        false
      );
    }
  }

  // ==========================================================
  // ENTRANCE ANIMATION
  // ==========================================================

  useEffect(
    () => {
      if (
        checkingSession
      ) {
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(
            brandOpacity,
            {
              toValue:
                1,

              duration:
                380,

              easing:
                Easing.out(
                  Easing.ease
                ),

              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            brandTranslateY,
            {
              toValue:
                0,

              duration:
                380,

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
          Animated.timing(
            cardOpacity,
            {
              toValue:
                1,

              duration:
                480,

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
                480,

              easing:
                Easing.out(
                  Easing.cubic
                ),

              useNativeDriver:
                true,
            }
          ),

          Animated.spring(
            cardScale,
            {
              toValue:
                1,

              friction:
                8,

              tension:
                70,

              useNativeDriver:
                true,
            }
          ),
        ]),

        Animated.timing(
          securityOpacity,
          {
            toValue:
              1,

            duration:
              280,

            useNativeDriver:
              true,
          }
        ),
      ]).start();
    },
    [
      checkingSession,
      brandOpacity,
      brandTranslateY,
      cardOpacity,
      cardTranslateY,
      cardScale,
      securityOpacity,
    ]
  );

  // ==========================================================
  // LOCKOUT + CAPTCHA
  //
  // The server decides; this only shows it. A lock is saved in
  // the browser so a refresh shows the countdown (and the
  // CAPTCHA) again before the next attempt.
  // ==========================================================

  function applyLock(
    next: SignInLock | null
  ) {
    setNow(Date.now());
    setLock(next);

    if (!next) {
      void clearAdminLoginLock();

      return;
    }

    // A network limit isn't about one account; not saved.
    if (next.email) {
      void saveAdminLoginLock({
        email:
          next.email,

        lockedUntil:
          next.until,

        captchaRequired:
          next.captcha,
      });
    }
  }

  // Saved lock from before the page was refreshed.
  useEffect(
    () => {
      let active = true;

      (async () => {
        const saved =
          await getAdminLoginLock();

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
          void clearAdminLoginLock();

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

        setEmail(
          saved.email
        );

        if (until) {
          setError(
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
              setError('');

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

  const cooldownText =
    `${Math.floor(
      cooldownSeconds / 60
    )}:${String(
      cooldownSeconds % 60
    ).padStart(2, '0')}`;

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
    } catch (loadError) {
      setCaptcha(null);

      setCaptchaLoadError(
        loadError instanceof Error
          ? loadError.message
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

  // ==========================================================
  // ERROR SHAKE
  // ==========================================================

  function showError(
    message: string
  ) {
    setSuccessMessage(
      ''
    );

    setError(
      message
    );

    errorShake.setValue(
      0
    );

    Animated.sequence([
      Animated.timing(
        errorShake,
        {
          toValue:
            -9,

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
            9,

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
  // BUTTON ANIMATION
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
          0.98,

        friction:
          8,

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
          8,

        tension:
          160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  // ==========================================================
  // REMEMBER ME
  // ==========================================================

  function handleToggleRemember() {
    if (
      loading
    ) {
      return;
    }

    setRememberMe(
      current =>
        !current
    );

    Animated.sequence([
      Animated.timing(
        checkboxScale,
        {
          toValue:
            0.82,

          duration:
            65,

          useNativeDriver:
            true,
        }
      ),

      Animated.spring(
        checkboxScale,
        {
          toValue:
            1,

          friction:
            5,

          tension:
            180,

          useNativeDriver:
            true,
        }
      ),
    ]).start();
  }

  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleSignIn() {
    if (
      loading ||
      resettingPassword ||
      cooldownSeconds > 0
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setNotice('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail
    ) {
      showError(
        'Please enter your admin email address.'
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      showError(
        'Please enter a valid admin email address.'
      );

      return;
    }

    if (
      !password
    ) {
      showError(
        'Please enter your password.'
      );

      return;
    }

    if (showCaptcha) {
      if (!captcha) {
        showError(
          'Please wait for the security check picture to load.'
        );

        return;
      }

      if (
        !captchaAnswer.trim()
      ) {
        showError(
          'Type the characters in the security check picture.'
        );

        return;
      }
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

      const result =
        await loginAdmin(
          cleanEmail,
          password,
          captchaSent
        );

      // Signed in: no lockout or CAPTCHA anymore.
      applyLock(null);

      if (
        !result?.session?.access_token
      ) {
        throw new Error(
          'No administrator session was returned.'
        );
      }

      if (
        !isAdminRole(result?.profile?.role)
      ) {
        await clearAdminSession();

        throw new Error(
          'This account is not authorized to access the Admin Portal.'
        );
      }

      await saveAdminSession(
        result.session,
        result.profile,
        rememberMe
      );

      setError('');
      setSuccessMessage('');

      router.replace(
        '/dashboard'
      );
    } catch (
      signInError
    ) {
      console.log(
        'ADMIN LOGIN ERROR:',
        signInError
      );

      // The CAPTCHA just sent is used up; a new one loads.
      if (captchaSent) {
        setCaptcha(null);
        setCaptchaAnswer('');
      }

      let message =
        signInError instanceof
          Error
          ? signInError.message
          : 'Unable to sign in.';

      if (
        signInError instanceof
        AdminApiError
      ) {
        const data =
          signInError.data ||
          {};

        // Locked: countdown from the server's exact time.
        if (
          signInError.code ===
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
                data
              ) *
                1000,

            captcha:
              data.captcha_required ===
              true,
          });
        }

        else if (
          signInError.code ===
          'LOGIN_IP_RATE_LIMIT'
        ) {
          message =
            'Too many sign-in attempts from this network.';

          applyLock({
            email:
              null,

            until:
              Date.now() +
              getRetrySeconds(
                data
              ) *
                1000,

            captcha:
              false,
          });
        }

        // After a lockout, every attempt needs a CAPTCHA.
        else if (
          signInError.code ===
            'CAPTCHA_REQUIRED' ||
          signInError.code ===
            'CAPTCHA_INCORRECT' ||
          (signInError.code ===
            'INCORRECT_PASSWORD' &&
            data.captcha_required ===
              true)
        ) {
          if (
            signInError.code ===
            'CAPTCHA_INCORRECT'
          ) {
            message =
              "The characters didn't match. Try the new picture.";
          } else if (
            signInError.code ===
            'CAPTCHA_REQUIRED'
          ) {
            message =
              'This account was locked recently. Complete the security check to sign in.';
          }

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

      showError(
        message
      );
    } finally {
      setLoading(
        false
      );

      buttonScale.setValue(
        1
      );
    }
  }

  // ==========================================================
  // PASSWORD RESET
  // ==========================================================

  async function handleForgotPassword() {
    if (
      loading ||
      resettingPassword
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail
    ) {
      showError(
        'Enter your administrator email address first.'
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      showError(
        'Please enter a valid administrator email address.'
      );

      return;
    }

    try {
      setResettingPassword(
        true
      );

      const result =
        await requestAdminPasswordReset(
          cleanEmail
        );

      setError('');

      setSuccessMessage(
        result?.message ||
          'Password reset instructions have been sent to the administrator email.'
      );
    } catch (
      resetError
    ) {
      console.log(
        'ADMIN RESET ERROR:',
        resetError
      );

      showError(
        resetError instanceof
          Error
          ? resetError.message
          : 'Unable to request a password reset.'
      );
    } finally {
      setResettingPassword(
        false
      );
    }
  }

  // ==========================================================
  // SESSION LOADER
  // ==========================================================

  if (
    checkingSession
  ) {
    return (
      <View
        style={
          styles.outerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.redBright
          }
        />
      </View>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.outerScreen
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
            '#12295B',
            COLORS.navy,
            '#040A18',
          ]}
          start={{
            x:
              0,

            y:
              0,
          }}
          end={{
            x:
              1,

            y:
              1,
          }}
          style={
            styles.gradient
          }
        >
          <SafeAreaView
            style={
              styles.safeArea
            }
          >
            <KeyboardAvoidingView
              style={
                styles.layout
              }
              behavior={
                Platform.OS ===
                  'ios'
                  ? 'padding'
                  : undefined
              }
            >
              {/* LEFT DECORATION */}

              <View
                style={
                  styles.sideColumn
                }
              >
                <View
                  style={[
                    styles.largeCross,

                    {
                      width:
                        250 * s,

                      height:
                        250 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.crossHorizontal,

                      {
                        width:
                          250 * s,

                        height:
                          82 * s,

                        top:
                          84 * s,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.crossVertical,

                      {
                        width:
                          82 * s,

                        height:
                          250 * s,

                        left:
                          84 * s,
                      },
                    ]}
                  />
                </View>

                <View
                  style={
                    styles.leftMessage
                  }
                >
                  <View
                    style={
                      styles.redLine
                    }
                  />

                  <Text
                    style={[
                      styles.sideText,

                      {
                        fontSize:
                          11 * s,

                        lineHeight:
                          26 * s,
                      },
                    ]}
                  >
                    SAVING LIVES{'\n'}
                    THROUGH{'\n'}
                    STRONGER{'\n'}
                    COMMUNITIES
                  </Text>
                </View>
              </View>

              {/* LOGIN */}

              <View
                style={
                  styles.centerColumn
                }
              >
                {/* BRAND */}

                <Animated.View
                  style={{
                    alignItems:
                      'center',

                    opacity:
                      brandOpacity,

                    transform: [
                      {
                        translateY:
                          brandTranslateY,
                      },
                    ],
                  }}
                >
                  <View
                    style={
                      styles.brandRow
                    }
                  >
                    <View
                      style={[
                        styles.logoCircle,

                        {
                          width:
                            76 * s,

                          height:
                            76 * s,

                          borderRadius:
                            38 * s,
                        },
                      ]}
                    >
                      <Image
                        source={require(
                          '../assets/images/hemo-hero-logo.png'
                        )}
                        style={{
                          width:
                            66 * s,

                          height:
                            66 * s,
                        }}
                        resizeMode="contain"
                      />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.brandName,

                          {
                            fontSize:
                              38 * s,

                            lineHeight:
                              43 * s,
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
                          styles.portalLabel,

                          {
                            fontSize:
                              11 * s,

                            letterSpacing:
                              2.5 * s,
                          },
                        ]}
                      >
                        ADMIN PORTAL
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.authorizedText,

                      {
                        fontSize:
                          13 * s,

                        marginBottom:
                          30 * s,
                      },
                    ]}
                  >
                    Authorized personnel only
                  </Text>
                </Animated.View>

                {/* LOGIN CARD */}

                <Animated.View
                  style={[
                    styles.loginCard,

                    {
                      width:
                        560 * s,

                      paddingHorizontal:
                        38 * s,

                      paddingVertical:
                        35 * s,

                      borderRadius:
                        22 * s,

                      opacity:
                        cardOpacity,

                      transform: [
                        {
                          translateY:
                            cardTranslateY,
                        },

                        {
                          scale:
                            cardScale,
                        },
                      ],
                    },
                  ]}
                >
                  {/* WHY THE LAST SESSION ENDED */}

                  {notice ? (
                    <View
                      style={[
                        styles.noticeBox,

                        {
                          marginBottom:
                            22 * s,

                          padding:
                            12 * s,

                          borderRadius:
                            9 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.notice
                        }
                      />

                      <Text
                        style={[
                          styles.noticeText,

                          {
                            fontSize:
                              11 * s,

                            lineHeight:
                              16 * s,
                          },
                        ]}
                      >
                        {notice}
                      </Text>
                    </View>
                  ) : null}

                  {/* EMAIL */}

                  <View
                    style={[
                      styles.labelRow,

                      {
                        marginBottom:
                          10 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="mail-outline"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.soft
                      }
                    />

                    <Text
                      style={[
                        styles.label,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      EMAIL ADDRESS
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.inputContainer,

                      {
                        height:
                          64 * s,

                        borderRadius:
                          12 * s,
                      },
                    ]}
                  >
                    <TextInput
                      value={
                        email
                      }
                      onChangeText={value => {
                        setEmail(
                          value
                        );

                        setError('');
                        setSuccessMessage('');
                      }}
                      style={[
                        styles.input,

                        {
                          fontSize:
                            14 * s,

                          paddingHorizontal:
                            18 * s,
                        },
                      ]}
                      placeholder="name@organization.com"
                      placeholderTextColor={
                        COLORS.muted
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={
                        !loading &&
                        !resettingPassword
                      }
                    />
                  </View>

                  {/* PASSWORD */}

                  <View
                    style={[
                      styles.labelRow,

                      {
                        marginTop:
                          24 * s,

                        marginBottom:
                          10 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="lock-outline"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.soft
                      }
                    />

                    <Text
                      style={[
                        styles.label,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      PASSWORD
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.inputContainer,

                      {
                        height:
                          64 * s,

                        borderRadius:
                          12 * s,
                      },
                    ]}
                  >
                    <TextInput
                      value={
                        password
                      }
                      onChangeText={value => {
                        setPassword(
                          value
                        );

                        setError('');
                        setSuccessMessage('');
                      }}
                      style={[
                        styles.input,

                        {
                          fontSize:
                            14 * s,

                          paddingLeft:
                            18 * s,
                        },
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor={
                        COLORS.muted
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      secureTextEntry={
                        !showPassword
                      }
                      autoComplete="password"
                      editable={
                        !loading &&
                        !resettingPassword
                      }
                      returnKeyType="done"
                      onSubmitEditing={
                        handleSignIn
                      }
                    />

                    <Pressable
                      style={[
                        styles.eyeButton,

                        {
                          width:
                            58 * s,
                        },
                      ]}
                      disabled={
                        loading ||
                        resettingPassword
                      }
                      onPress={() =>
                        setShowPassword(
                          current =>
                            !current
                        )
                      }
                    >
                      <MaterialIcons
                        name={
                          showPassword
                            ? 'visibility'
                            : 'visibility-off'
                        }
                        size={
                          22 * s
                        }
                        color={
                          COLORS.muted
                        }
                      />
                    </Pressable>
                  </View>

                  {/* SECURITY CHECK (after a lockout) */}

                  {showCaptcha ? (
                    <View>
                      <View
                        style={[
                          styles.labelRow,

                          {
                            marginTop:
                              24 * s,

                            marginBottom:
                              6 * s,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="verified-user"
                          size={
                            21 * s
                          }
                          color={
                            COLORS.soft
                          }
                        />

                        <Text
                          style={[
                            styles.label,

                            {
                              fontSize:
                                11 * s,
                            },
                          ]}
                        >
                          SECURITY CHECK
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.captchaHint,

                          {
                            fontSize:
                              11 * s,

                            marginBottom:
                              10 * s,
                          },
                        ]}
                      >
                        This account was locked recently. Type the characters in the picture.
                      </Text>

                      <View
                        style={[
                          styles.captchaRow,

                          {
                            gap:
                              10 * s,

                            marginBottom:
                              10 * s,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.captchaPicture,

                            {
                              height:
                                64 * s,

                              borderRadius:
                                12 * s,
                            },
                          ]}
                          accessibilityLabel="CAPTCHA picture"
                        >
                          {captchaLoading ? (
                            <ActivityIndicator
                              color={
                                COLORS.red
                              }
                            />
                          ) : captcha ? (
                            <SvgXml
                              xml={
                                captcha.svg
                              }
                              width="100%"
                              height="100%"
                            />
                          ) : (
                            <Text
                              style={[
                                styles.captchaPictureError,

                                {
                                  fontSize:
                                    11 * s,
                                },
                              ]}
                            >
                              {captchaLoadError ||
                                'Press the arrow for a picture.'}
                            </Text>
                          )}
                        </View>

                        <Pressable
                          style={[
                            styles.captchaRefresh,

                            {
                              width:
                                64 * s,

                              height:
                                64 * s,

                              borderRadius:
                                12 * s,
                            },
                          ]}
                          disabled={
                            loading ||
                            captchaLoading
                          }
                          accessibilityRole="button"
                          accessibilityLabel="New picture"
                          onPress={() => {
                            setCaptcha(null);
                            setCaptchaLoadError(null);
                          }}
                        >
                          <MaterialIcons
                            name="refresh"
                            size={
                              24 * s
                            }
                            color={
                              COLORS.soft
                            }
                          />
                        </Pressable>
                      </View>

                      <View
                        style={[
                          styles.inputContainer,

                          {
                            height:
                              64 * s,

                            borderRadius:
                              12 * s,
                          },
                        ]}
                      >
                        <TextInput
                          value={
                            captchaAnswer
                          }
                          onChangeText={value => {
                            setCaptchaAnswer(
                              value
                            );

                            setError('');
                          }}
                          style={[
                            styles.input,

                            {
                              fontSize:
                                14 * s,

                              paddingHorizontal:
                                18 * s,
                            },
                          ]}
                          placeholder="Type the 5 characters"
                          placeholderTextColor={
                            COLORS.muted
                          }
                          autoCapitalize="none"
                          autoCorrect={
                            false
                          }
                          autoComplete="off"
                          spellCheck={
                            false
                          }
                          maxLength={
                            5
                          }
                          editable={
                            !loading &&
                            !captchaLoading
                          }
                          returnKeyType="done"
                          onSubmitEditing={
                            handleSignIn
                          }
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* OPTIONS */}

                  <View
                    style={[
                      styles.optionsRow,

                      {
                        marginTop:
                          20 * s,
                      },
                    ]}
                  >
                    <Pressable
                      style={
                        styles.rememberRow
                      }
                      disabled={
                        loading ||
                        resettingPassword
                      }
                      onPress={
                        handleToggleRemember
                      }
                    >
                      <Animated.View
                        style={[
                          styles.checkbox,

                          {
                            width:
                              21 * s,

                            height:
                              21 * s,

                            borderRadius:
                              4 * s,

                            transform: [
                              {
                                scale:
                                  checkboxScale,
                              },
                            ],
                          },

                          rememberMe &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {rememberMe ? (
                          <MaterialIcons
                            name="check"
                            size={
                              15 * s
                            }
                            color={
                              COLORS.white
                            }
                          />
                        ) : null}
                      </Animated.View>

                      <Text
                        style={[
                          styles.optionText,

                          {
                            fontSize:
                              12 * s,
                          },
                        ]}
                      >
                        Remember me
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        loading ||
                        resettingPassword
                      }
                      onPress={
                        handleForgotPassword
                      }
                    >
                      <Text
                        style={[
                          styles.forgotText,

                          {
                            fontSize:
                              12 * s,
                          },
                        ]}
                      >
                        {resettingPassword
                          ? 'Sending...'
                          : 'Forgot Password?'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* ERROR */}

                  {error ? (
                    <Animated.View
                      style={[
                        styles.errorBox,

                        {
                          marginTop:
                            18 * s,

                          padding:
                            12 * s,

                          borderRadius:
                            9 * s,

                          transform: [
                            {
                              translateX:
                                errorShake,
                            },
                          ],
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.error
                        }
                      />

                      <Text
                        style={[
                          styles.errorText,

                          {
                            fontSize:
                              11 * s,

                            lineHeight:
                              16 * s,
                          },
                        ]}
                      >
                        {cooldownSeconds >
                        0
                          ? `${error}\nTry again in ${cooldownText}.`
                          : error}
                      </Text>
                    </Animated.View>
                  ) : null}

                  {/* SUCCESS */}

                  {successMessage ? (
                    <View
                      style={[
                        styles.successBox,

                        {
                          marginTop:
                            18 * s,

                          padding:
                            12 * s,

                          borderRadius:
                            9 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="check-circle-outline"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.success
                        }
                      />

                      <Text
                        style={[
                          styles.successText,

                          {
                            fontSize:
                              11 * s,

                            lineHeight:
                              16 * s,
                          },
                        ]}
                      >
                        {
                          successMessage
                        }
                      </Text>
                    </View>
                  ) : null}

                  {/* SIGN IN */}

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
                    <Pressable
                      disabled={
                        loading ||
                        resettingPassword ||
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
                      style={{
                        marginTop:
                          26 * s,

                        borderRadius:
                          12 * s,

                        overflow:
                          'hidden',

                        opacity:
                          loading ||
                          resettingPassword ||
                          cooldownSeconds >
                            0
                            ? 0.6
                            : 1,
                      }}
                    >
                      <LinearGradient
                        colors={[
                          COLORS.redBright,
                          COLORS.red,
                          COLORS.redDark,
                        ]}
                        start={{
                          x:
                            0,

                          y:
                            0,
                        }}
                        end={{
                          x:
                            1,

                          y:
                            0,
                        }}
                        style={[
                          styles.signInButton,

                          {
                            height:
                              64 * s,
                          },
                        ]}
                      >
                        {loading ? (
                          <ActivityIndicator
                            color={
                              COLORS.white
                            }
                          />
                        ) : (
                          <Text
                            style={[
                              styles.signInText,

                              {
                                fontSize:
                                  15 * s,
                              },
                            ]}
                          >
                            {cooldownSeconds >
                            0
                              ? `Try again in ${cooldownText}`
                              : 'Sign In'}
                          </Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                </Animated.View>

                {/* SECURITY */}

                <Animated.View
                  style={[
                    styles.securityRow,

                    {
                      marginTop:
                        22 * s,

                      gap:
                        8 * s,

                      opacity:
                        securityOpacity,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="verified-user"
                    size={
                      18 * s
                    }
                    color={
                      COLORS.muted
                    }
                  />

                  <Text
                    style={[
                      styles.securityText,

                      {
                        fontSize:
                          10 * s,
                      },
                    ]}
                  >
                    Access restricted to authorized Hemo-Hero system administrators.
                  </Text>
                </Animated.View>
              </View>

              {/* RIGHT DECORATION */}

              <View
                style={
                  styles.sideColumn
                }
              >
                <View
                  style={
                    styles.rightMessage
                  }
                >
                  <View
                    style={
                      styles.redLine
                    }
                  />

                  <Text
                    style={[
                      styles.sideText,

                      {
                        fontSize:
                          11 * s,

                        lineHeight:
                          26 * s,
                      },
                    ]}
                  >
                    BLOOD{'\n'}
                    DONORS{'\n'}
                    BUILD{'\n'}
                    BRIGHTER{'\n'}
                    TOMORROWS
                  </Text>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    outerScreen: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
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

    layout: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'stretch',
    },

    sideColumn: {
      flex:
        1,

      position:
        'relative',

      overflow:
        'hidden',
    },

    centerColumn: {
      flex:
        1.75,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    largeCross: {
      position:
        'absolute',

      left:
        -35,

      top:
        '18%',

      opacity:
        0.2,
    },

    crossHorizontal: {
      position:
        'absolute',

      left:
        0,

      borderWidth:
        1,

      borderColor:
        COLORS.red,

      borderRadius:
        20,

      backgroundColor:
        'rgba(219,10,10,0.06)',
    },

    crossVertical: {
      position:
        'absolute',

      top:
        0,

      borderWidth:
        1,

      borderColor:
        COLORS.red,

      borderRadius:
        20,

      backgroundColor:
        'rgba(219,10,10,0.06)',
    },

    leftMessage: {
      position:
        'absolute',

      left:
        '18%',

      bottom:
        '15%',
    },

    rightMessage: {
      position:
        'absolute',

      right:
        '20%',

      top:
        '24%',
    },

    redLine: {
      width:
        28,

      height:
        2,

      marginBottom:
        14,

      backgroundColor:
        COLORS.redBright,
    },

    sideText: {
      color:
        'rgba(164,179,211,0.60)',

      fontFamily:
        'Inter_500Medium',

      letterSpacing:
        3,
    },

    brandRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        10,
    },

    logoCircle: {
      marginRight:
        16,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',
    },

    brandName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portalLabel: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_700Bold',

      textAlign:
        'center',
    },

    authorizedText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    loginCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOpacity:
        0.32,

      shadowRadius:
        22,

      shadowOffset: {
        width:
          0,

        height:
          12,
      },

      elevation:
        10,
    },

    labelRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    label: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.7,
    },

    inputContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(133,154,203,0.28)',

      backgroundColor:
        COLORS.navyInput,
    },

    input: {
      flex:
        1,

      height:
        '100%',

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      outlineStyle:
        Platform.OS ===
          'web'
          ? 'none'
          : undefined,
    } as any,

    eyeButton: {
      height:
        '100%',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    captchaHint: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    captchaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    // Light, like most CAPTCHAs, so the characters read well.
    captchaPicture: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        '#F4F6FA',
    },

    captchaPictureError: {
      paddingHorizontal:
        10,

      color:
        '#555F75',

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    captchaRefresh: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(133,154,203,0.28)',

      backgroundColor:
        COLORS.navyInput,
    },

    optionsRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    rememberRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    checkbox: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        '#8492B2',
    },

    checkboxSelected: {
      borderColor:
        COLORS.redBright,

      backgroundColor:
        COLORS.red,
    },

    optionText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    forgotText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    errorBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(255,114,124,0.24)',

      backgroundColor:
        'rgba(255,114,124,0.10)',
    },

    errorText: {
      flex:
        1,

      color:
        COLORS.error,

      fontFamily:
        'Inter_400Regular',
    },

    successBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(89,217,142,0.24)',

      backgroundColor:
        COLORS.successBackground,
    },

    successText: {
      flex:
        1,

      color:
        COLORS.success,

      fontFamily:
        'Inter_400Regular',
    },

    noticeBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.28)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    noticeText: {
      flex:
        1,

      color:
        COLORS.notice,

      fontFamily:
        'Inter_400Regular',
    },

    signInButton: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    signInText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    securityRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    securityText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },
  });