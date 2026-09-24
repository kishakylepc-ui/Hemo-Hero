import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  ApiError,
  loginUser,
} from '../lib/api';

import {
  saveSession,
} from '../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#7E0B0B',
  redButton: '#B42323',

  pinkTop: '#EBA4A7',
  pinkBottom: '#D93238',

  white: '#FFFFFF',
  black: '#111111',

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

  // ==========================================================
  // FORM STATE
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
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

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

  useEffect(
    () => {
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
    },
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
  // SHAKE ERROR
  // ==========================================================

  function triggerError(
    message: string
  ) {
    setErrorMessage(
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
    setErrorMessage('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // BOTH EMPTY
    // --------------------------------------------------------

    if (
      !cleanEmail &&
      !password
    ) {
      triggerError(
        'Please enter your email address and password.'
      );

      return;
    }

    // --------------------------------------------------------
    // EMAIL EMPTY
    // --------------------------------------------------------

    if (
      !cleanEmail
    ) {
      triggerError(
        'Please enter your email address.'
      );

      return;
    }

    // --------------------------------------------------------
    // PASSWORD EMPTY
    // --------------------------------------------------------

    if (
      !password
    ) {
      triggerError(
        'Please enter your password.'
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
      triggerError(
        'Please enter a valid email address.'
      );

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

      console.log(
        'LOGIN PROFILE:',
        data.profile
      );

      console.log(
        'ONBOARDING COMPLETE:',
        data.profile
          .onboarding_complete
      );

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
            error.message ||
            'Account does not exist.';
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
        }

        // ----------------------------------------------------
        // EMAIL NOT VERIFIED
        // ----------------------------------------------------

        else if (
          apiData.code ===
          'EMAIL_NOT_VERIFIED'
        ) {
          message =
            error.message ||
            'Please verify your email before signing in.';
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
            Number.isFinite(
              retryMinutes
            )
              ? `Too many incorrect password attempts.\nPlease try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`
              : 'Too many incorrect password attempts. Please try again later.';
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
            Number.isFinite(
              retryMinutes
            )
              ? `Too many login attempts from this network.\nPlease try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`
              : 'Too many login attempts from this network. Please try again later.';
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

                    <View
                      style={
                        styles.tabs
                      }
                    >
                      <View
                        style={
                          styles.activeTab
                        }
                      >
                        <Text
                          style={
                            styles.activeTabText
                          }
                        >
                          Sign In
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={
                          styles.inactiveTab
                        }
                        activeOpacity={
                          0.7
                        }
                        disabled={
                          loading
                        }
                        onPress={() =>
                          router.push(
                            '/signup'
                          )
                        }
                      >
                        <Text
                          style={
                            styles.inactiveTabText
                          }
                        >
                          Sign Up
                        </Text>
                      </TouchableOpacity>
                    </View>

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
                      </Animated.View>
                    ) : null}

                    {/* ==============================================
                        EMAIL
                    ============================================== */}

                    <Text
                      style={
                        styles.label
                      }
                    >
                      Email Address
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      placeholder="Enter your email"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="email"
                      value={
                        email
                      }
                      editable={
                        !loading
                      }
                      returnKeyType="next"
                      onChangeText={value => {
                        setEmail(
                          value
                        );

                        if (
                          errorMessage
                        ) {
                          setErrorMessage(
                            ''
                          );
                        }
                      }}
                    />

                    {/* ==============================================
                        PASSWORD
                    ============================================== */}

                    <Text
                      style={
                        styles.label
                      }
                    >
                      Password
                    </Text>

                    <View
                      style={
                        styles.passwordBox
                      }
                    >
                      <TextInput
                        style={
                          styles.passwordInput
                        }
                        placeholder="Enter your password"
                        placeholderTextColor={
                          COLORS.placeholder
                        }
                        value={
                          password
                        }
                        editable={
                          !loading
                        }
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={
                          false
                        }
                        autoComplete="password"
                        returnKeyType="done"
                        onChangeText={value => {
                          setPassword(
                            value
                          );

                          if (
                            errorMessage
                          ) {
                            setErrorMessage(
                              ''
                            );
                          }
                        }}
                        onSubmitEditing={
                          handleSignIn
                        }
                      />

                      <TouchableOpacity
                        activeOpacity={
                          0.7
                        }
                        disabled={
                          loading
                        }
                        onPress={() =>
                          setShowPassword(
                            current =>
                              !current
                          )
                        }
                      >
                        <Text
                          style={
                            styles.showText
                          }
                        >
                          {showPassword
                            ? 'Hide'
                            : 'Show'}
                        </Text>
                      </TouchableOpacity>
                    </View>

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

                          loading &&
                            styles.disabledButton,
                        ]}
                        activeOpacity={
                          1
                        }
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
                          handleSignIn
                        }
                      >
                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          {loading
                            ? 'Signing In...'
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
        12,
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

    tabs: {
      flexDirection:
        'row',

      marginBottom:
        24,
    },

    activeTab: {
      flex:
        1,

      height:
        43,

      marginHorizontal:
        7,

      borderRadius:
        22,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    inactiveTab: {
      flex:
        1,

      height:
        43,

      marginHorizontal:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    activeTabText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    inactiveTabText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13,
    },

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

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11,

      lineHeight:
        16,

      textAlign:
        'center',
    },

    // ========================================================
    // FORM
    // ========================================================

    label: {
      marginBottom:
        7,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,
    },

    input: {
      height:
        43,

      marginBottom:
        19,

      paddingHorizontal:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        22,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      outlineStyle:
        Platform.OS ===
          'web'
          ? 'none'
          : undefined,
    } as any,

    passwordBox: {
      height:
        43,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingLeft:
        15,

      paddingRight:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        22,

      backgroundColor:
        COLORS.white,
    },

    passwordInput: {
      flex:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      outlineStyle:
        Platform.OS ===
          'web'
          ? 'none'
          : undefined,
    } as any,

    showText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11,
    },

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
        11,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
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
        13,
    },
  });