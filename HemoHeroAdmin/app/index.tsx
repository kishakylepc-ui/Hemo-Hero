import {
  useEffect,
  useMemo,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  loginAdmin,
  requestAdminPasswordReset,
} from '../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
  getRememberAdmin,
  saveAdminSession,
} from '../lib/session';

// ============================================================
// IPAD PRO DESIGN SIZE
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
};

// ============================================================
// LOGIN SCREEN
// ============================================================

export default function AdminLoginScreen() {
  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // IPAD PRO RESPONSIVE FRAME
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
        profile?.role ===
          'admin'
      ) {
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

    // --------------------------------------------------------
    // EMAIL REQUIRED
    // --------------------------------------------------------

    if (
      !cleanEmail
    ) {
      showError(
        'Please enter your admin email address.'
      );

      return;
    }

    // --------------------------------------------------------
    // EMAIL FORMAT
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // PASSWORD REQUIRED
    // --------------------------------------------------------

    if (
      !password
    ) {
      showError(
        'Please enter your password.'
      );

      return;
    }

    try {
      setLoading(
        true
      );

      const result =
        await loginAdmin(
          cleanEmail,
          password
        );

      // ------------------------------------------------------
      // VERIFY RESPONSE
      // ------------------------------------------------------

      if (
        !result?.session?.access_token
      ) {
        throw new Error(
          'No administrator session was returned.'
        );
      }

      if (
        result?.profile?.role !==
        'admin'
      ) {
        await clearAdminSession();

        throw new Error(
          'This account is not authorized to access the Admin Portal.'
        );
      }

      // ------------------------------------------------------
      // SAVE SESSION
      // ------------------------------------------------------

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

      showError(
        signInError instanceof
          Error
          ? signInError.message
          : 'Unable to sign in.'
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

    // --------------------------------------------------------
    // EMAIL REQUIRED
    // --------------------------------------------------------

    if (
      !cleanEmail
    ) {
      showError(
        'Enter your administrator email address first.'
      );

      return;
    }

    // --------------------------------------------------------
    // EMAIL FORMAT
    // --------------------------------------------------------

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
              {/* ============================================== */}
              {/* LEFT DECORATION */}
              {/* ============================================== */}

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

              {/* ============================================== */}
              {/* LOGIN */}
              {/* ============================================== */}

              <View
                style={
                  styles.centerColumn
                }
              >
                {/* ============================================ */}
                {/* BRAND */}
                {/* ============================================ */}

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

                {/* ============================================ */}
                {/* LOGIN CARD */}
                {/* ============================================ */}

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
                  {/* ========================================== */}
                  {/* EMAIL */}
                  {/* ========================================== */}

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

                  {/* ========================================== */}
                  {/* PASSWORD */}
                  {/* ========================================== */}

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

                  {/* ========================================== */}
                  {/* OPTIONS */}
                  {/* ========================================== */}

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

                  {/* ========================================== */}
                  {/* ERROR */}
                  {/* ========================================== */}

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
                        {
                          error
                        }
                      </Text>
                    </Animated.View>
                  ) : null}

                  {/* ========================================== */}
                  {/* SUCCESS */}
                  {/* ========================================== */}

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

                  {/* ========================================== */}
                  {/* SIGN IN */}
                  {/* ========================================== */}

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
                        resettingPassword
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
                          resettingPassword
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

                            gap:
                              11 * s,
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
                          <>
                            <Text
                              style={[
                                styles.signInText,

                                {
                                  fontSize:
                                    15 * s,
                                },
                              ]}
                            >
                              Sign In
                            </Text>

                            <MaterialIcons
                              name="arrow-forward"
                              size={
                                22 * s
                              }
                              color={
                                COLORS.white
                              }
                            />
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                </Animated.View>

                {/* ============================================ */}
                {/* SECURITY */}
                {/* ============================================ */}

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

              {/* ============================================== */}
              {/* RIGHT DECORATION */}
              {/* ============================================== */}

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

    // ========================================================
    // DECORATION
    // ========================================================

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

    // ========================================================
    // BRAND
    // ========================================================

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

    // ========================================================
    // CARD
    // ========================================================

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

    // ========================================================
    // INPUTS
    // ========================================================

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

    // ========================================================
    // OPTIONS
    // ========================================================

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

    // ========================================================
    // ERROR
    // ========================================================

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

    // ========================================================
    // SUCCESS
    // ========================================================

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

    // ========================================================
    // SIGN IN BUTTON
    // ========================================================

    signInButton: {
      flexDirection:
        'row',

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

    // ========================================================
    // SECURITY
    // ========================================================

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