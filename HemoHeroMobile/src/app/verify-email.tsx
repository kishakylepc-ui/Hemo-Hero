import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  resendVerification,
  verifyEmail,
} from '../lib/api';

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  red:
    '#DB0A0A',

  redDark:
    '#7E0B0B',

  redButton:
    '#B42323',

  pinkTop:
    '#EBA4A7',

  pinkBottom:
    '#D93238',

  white:
    '#FFFFFF',

  black:
    '#111111',

  inputBorder:
    '#D8D8D8',

  muted:
    '#666666',

  errorBackground:
    '#FDECEC',

  errorBorder:
    '#F5BABA',

  codeActive:
    '#FDECEC',
};

const CODE_LENGTH =
  6;

const RESEND_SECONDS =
  60;

// ============================================================
// SCREEN
// ============================================================

export default function VerifyEmailScreen() {
  const params =
    useLocalSearchParams<{
      email?:
        | string
        | string[];
    }>();

  const emailParam =
    params.email;

  const email =
    (
      Array.isArray(
        emailParam
      )
        ? emailParam[0]
        : emailParam ||
          ''
    )
      .trim()
      .toLowerCase();

  const inputRef =
    useRef<TextInput>(
      null
    );

  const [
    code,
    setCode,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    resending,
    setResending,
  ] =
    useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] =
    useState(
      RESEND_SECONDS
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  // ==========================================================
  // RESEND TIMER
  // ==========================================================

  useEffect(() => {
    if (
      resendSeconds <=
      0
    ) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          setResendSeconds(
            current =>
              Math.max(
                0,
                current - 1
              )
          );
        },
        1000
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [
    resendSeconds,
  ]);

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      window.alert(
        `${title}\n\n${message}`
      );

      return;
    }

    Alert.alert(
      title,
      message
    );
  }

  // ==========================================================
  // CODE INPUT
  // ==========================================================

  function handleCodeChange(
    value: string
  ) {
    const digitsOnly =
      value
        .replace(
          /\D/g,
          ''
        )
        .slice(
          0,
          CODE_LENGTH
        );

    setCode(
      digitsOnly
    );

    if (
      errorMessage
    ) {
      setErrorMessage(
        ''
      );
    }
  }

  // ==========================================================
  // VERIFY EMAIL
  // ==========================================================

  async function handleVerify() {
    setErrorMessage(
      ''
    );

    if (!email) {
      const message =
        'Your email address is missing. Please return to Sign Up and try again.';

      setErrorMessage(
        message
      );

      showMessage(
        'Email Missing',
        message
      );

      return;
    }

    if (
      code.length !==
      CODE_LENGTH
    ) {
      const message =
        'Please enter the 6-digit verification code from your email.';

      setErrorMessage(
        message
      );

      showMessage(
        'Invalid Code',
        message
      );

      inputRef
        .current
        ?.focus();

      return;
    }

    try {
      setLoading(
        true
      );

      const data =
        await verifyEmail(
          email,
          code
        );

      setCode(
        ''
      );

      showMessage(
        'Email Verified',
        data?.message ||
          'Your email has been verified successfully. You can now sign in.'
      );

      router.replace(
        '/'
      );
    } catch (error) {
      console.log(
        'VERIFY EMAIL ERROR:',
        error
      );

      let message =
        'Unable to verify the code. Please try again.';

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(
        message
      );

      showMessage(
        'Verification Failed',
        message
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  // ==========================================================
  // RESEND
  // ==========================================================

  async function handleResend() {
    if (
      !email ||
      resendSeconds >
        0 ||
      resending ||
      loading
    ) {
      return;
    }

    setErrorMessage(
      ''
    );

    try {
      setResending(
        true
      );

      const data =
        await resendVerification(
          email
        );

      setCode(
        ''
      );

      setResendSeconds(
        RESEND_SECONDS
      );

      showMessage(
        'Code Sent',
        data?.message ||
          'A new verification code has been sent to your email.'
      );

      setTimeout(
        () => {
          inputRef
            .current
            ?.focus();
        },
        150
      );
    } catch (error) {
      console.log(
        'RESEND VERIFICATION ERROR:',
        error
      );

      let message =
        'Unable to resend the verification code. Please try again later.';

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(
        message
      );

      showMessage(
        'Unable to Resend',
        message
      );
    } finally {
      setResending(
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
                {/* ============================================
                    HEADER
                ============================================ */}

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
                    style={
                      styles.header
                    }
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

                    <Text
                      style={
                        styles.brandName
                      }
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
                  </LinearGradient>
                </View>

                {/* ============================================
                    LOGO
                ============================================ */}

                <View
                  style={
                    styles.logoCircle
                  }
                >
                  <Image
                    source={require(
                      '../../assets/images/LifeLine (5).png'
                    )}
                    style={
                      styles.logoImage
                    }
                    resizeMode="contain"
                  />
                </View>

                {/* ============================================
                    BODY
                ============================================ */}

                <LinearGradient
                  colors={[
                    COLORS.pinkTop,
                    COLORS.pinkBottom,
                  ]}
                  style={
                    styles.bodyBackground
                  }
                >
                  <View
                    style={
                      styles.card
                    }
                  >
                    <Text
                      style={
                        styles.title
                      }
                    >
                      Verify your email
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                    >
                      We sent a 6-digit verification code to
                    </Text>

                    <Text
                      style={
                        styles.emailText
                      }
                      numberOfLines={
                        2
                      }
                    >
                      {email ||
                        'your email address'}
                    </Text>

                    {/* ERROR */}

                    {errorMessage ? (
                      <View
                        style={
                          styles.errorContainer
                        }
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
                      </View>
                    ) : null}

                    {/* ========================================
                        OTP INPUT
                    ======================================== */}

                    <TouchableOpacity
                      style={
                        styles.codeArea
                      }
                      activeOpacity={
                        1
                      }
                      disabled={
                        loading
                      }
                      onPress={() =>
                        inputRef
                          .current
                          ?.focus()
                      }
                    >
                      {Array.from({
                        length:
                          CODE_LENGTH,
                      }).map(
                        (
                          _,
                          index
                        ) => {
                          const digit =
                            code[
                              index
                            ] ||
                            '';

                          const isActive =
                            index ===
                              code.length &&
                            code.length <
                              CODE_LENGTH;

                          return (
                            <View
                              key={
                                index
                              }
                              style={[
                                styles.codeBox,

                                isActive &&
                                  styles.codeBoxActive,
                              ]}
                            >
                              <Text
                                style={
                                  styles.codeDigit
                                }
                              >
                                {
                                  digit
                                }
                              </Text>
                            </View>
                          );
                        }
                      )}

                      <TextInput
                        ref={
                          inputRef
                        }
                        style={
                          styles.hiddenInput
                        }
                        value={
                          code
                        }
                        onChangeText={
                          handleCodeChange
                        }
                        keyboardType="number-pad"
                        maxLength={
                          CODE_LENGTH
                        }
                        autoFocus
                        editable={
                          !loading
                        }
                        caretHidden
                        autoComplete="one-time-code"
                      />
                    </TouchableOpacity>

                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      Enter the code from your Hemo-Hero verification email.
                    </Text>

                    {/* ========================================
                        VERIFY BUTTON
                    ======================================== */}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,

                        loading &&
                          styles.disabledButton,
                      ]}
                      activeOpacity={
                        0.85
                      }
                      disabled={
                        loading ||
                        resending
                      }
                      onPress={
                        handleVerify
                      }
                    >
                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        {loading
                          ? 'Verifying...'
                          : 'Verify Email'}
                      </Text>
                    </TouchableOpacity>

                    {/* ========================================
                        RESEND
                    ======================================== */}

                    <View
                      style={
                        styles.resendRow
                      }
                    >
                      <Text
                        style={
                          styles.resendLabel
                        }
                      >
                        Didn't receive the code?{' '}
                      </Text>

                      <TouchableOpacity
                        disabled={
                          resendSeconds >
                            0 ||
                          resending ||
                          loading
                        }
                        onPress={
                          handleResend
                        }
                      >
                        <Text
                          style={[
                            styles.resendText,

                            resendSeconds >
                              0 &&
                              styles.resendDisabled,
                          ]}
                        >
                          {resending
                            ? 'Sending...'
                            : resendSeconds >
                                0
                              ? `Resend in ${resendSeconds}s`
                              : 'Resend Code'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* ========================================
                        CHANGE EMAIL
                    ======================================== */}

                    <TouchableOpacity
                      style={
                        styles.changeEmailButton
                      }
                      disabled={
                        loading ||
                        resending
                      }
                      onPress={() =>
                        router.replace(
                          '/signup'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.changeEmailText
                        }
                      >
                        Use a different email
                      </Text>
                    </TouchableOpacity>
                  </View>
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

    desktopBackground: {
      flex:
        1,

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

    phone: {
      width:
        Platform.OS ===
        'web'
          ? 440
          : '100%',

      height:
        Platform.OS ===
        'web'
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
      flex:
        1,

      backgroundColor:
        COLORS.red,
    },

    scroll: {
      flexGrow:
        1,

      backgroundColor:
        COLORS.pinkBottom,
    },

    authContent: {
      flexGrow:
        1,

      position:
        'relative',

      backgroundColor:
        COLORS.pinkTop,
    },

    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    headerWrapper: {
      backgroundColor:
        COLORS.pinkTop,

      zIndex:
        1,
    },

    header: {
      height:
        250,

      alignItems:
        'center',

      paddingTop:
        50,

      borderBottomLeftRadius:
        62,

      borderBottomRightRadius:
        62,

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      left:
        -100,

      top:
        -50,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -92,

      top:
        -55,

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

    // --------------------------------------------------------
    // LOGO
    // --------------------------------------------------------

    logoCircle: {
      position:
        'absolute',

      top:
        181,

      alignSelf:
        'center',

      width:
        140,

      height:
        140,

      borderRadius:
        70,

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

    logoImage: {
      width:
        120,

      height:
        120,
    },

    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    bodyBackground: {
      flexGrow:
        1,

      minHeight:
        624,

      paddingHorizontal:
        24,

      paddingTop:
        105,

      paddingBottom:
        34,

      zIndex:
        2,
    },

    // --------------------------------------------------------
    // CARD
    // --------------------------------------------------------

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius:
        25,

      paddingHorizontal:
        22,

      paddingTop:
        28,

      paddingBottom:
        24,

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

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        22,

      textAlign:
        'center',
    },

    description: {
      marginTop:
        10,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    emailText: {
      marginTop:
        3,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    errorContainer: {
      marginTop:
        18,

      paddingHorizontal:
        12,

      paddingVertical:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.errorBorder,

      borderRadius:
        8,

      backgroundColor:
        COLORS.errorBackground,
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        10,

      lineHeight:
        15,

      textAlign:
        'center',
    },

    // --------------------------------------------------------
    // OTP CODE
    // --------------------------------------------------------

    codeArea: {
      position:
        'relative',

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      marginTop:
        25,
    },

    codeBox: {
      width:
        43,

      height:
        52,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    codeBoxActive: {
      borderWidth:
        1.5,

      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.codeActive,
    },

    codeDigit: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        22,
    },

    hiddenInput: {
      position:
        'absolute',

      width:
        1,

      height:
        1,

      opacity:
        0,

      left:
        0,

      bottom:
        0,
    },

    helperText: {
      marginTop:
        14,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        10,

      lineHeight:
        15,

      textAlign:
        'center',
    },

    // --------------------------------------------------------
    // BUTTON
    // --------------------------------------------------------

    primaryButton: {
      height:
        50,

      marginTop:
        24,

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

    // --------------------------------------------------------
    // RESEND
    // --------------------------------------------------------

    resendRow: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'center',

      marginTop:
        18,
    },

    resendLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11,
    },

    resendText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11,
    },

    resendDisabled: {
      color:
        '#999999',
    },

    changeEmailButton: {
      alignSelf:
        'center',

      marginTop:
        17,

      paddingVertical:
        4,

      paddingHorizontal:
        8,
    },

    changeEmailText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11,
    },
  });