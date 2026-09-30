import {
  useState,
} from 'react';

import {
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
  forgotPassword,
} from '../lib/api';

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
  muted: '#666666',

  errorBackground: '#FDECEC',
  errorBorder: '#F5BABA',
};

// ============================================================
// SCREEN
// ============================================================

export default function ForgotPasswordScreen() {
  // ==========================================================
  // EMAIL PASSED FROM SIGN IN
  // ==========================================================

  const params =
    useLocalSearchParams<{
      email?:
        | string
        | string[];
    }>();

  const emailParam =
    params.email;

  const initialEmail =
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

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    email,
    setEmail,
  ] =
    useState(
      initialEmail
    );

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
  // SEND RESET CODE
  // ==========================================================

  async function handleSendCode() {
    setErrorMessage('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // REQUIRED
    // --------------------------------------------------------

    if (
      !cleanEmail
    ) {
      setErrorMessage(
        'Please enter your email address.'
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
      setErrorMessage(
        'Please enter a valid email address.'
      );

      return;
    }

    // --------------------------------------------------------
    // SEND RESET CODE
    // --------------------------------------------------------

    try {
      setLoading(
        true
      );

      await forgotPassword(
        cleanEmail
      );

      setErrorMessage('');

      // ------------------------------------------------------
      // GO DIRECTLY TO VERIFICATION CODE SCREEN
      // ------------------------------------------------------

      router.push({
        pathname:
          '/reset-password',

        params: {
          email:
            cleanEmail,
        },
      });
    } catch (
      error
    ) {
      console.log(
        'FORGOT PASSWORD ERROR:',
        error
      );

      let message =
        'Unable to send the reset code. Please try again.';

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
              Platform.OS === 'ios'
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
                    {/* ========================================
                        ICON
                    ======================================== */}

                    <View
                      style={
                        styles.iconCircle
                      }
                    >
                      <MaterialIcons
                        name="lock-reset"
                        size={32}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    {/* ========================================
                        TITLE
                    ======================================== */}

                    <Text
                      style={
                        styles.title
                      }
                    >
                      Forgot Password?
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                    >
                      Enter the email address associated with your Hemo-Hero account.
                      We'll send you a 6-digit verification code.
                    </Text>

                    {/* ========================================
                        ERROR
                    ======================================== */}

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
                        EMAIL
                    ======================================== */}

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
                      value={
                        email
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="email"
                      editable={
                        !loading
                      }
                      returnKeyType="send"
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
                      onSubmitEditing={
                        handleSendCode
                      }
                    />

                    {/* ========================================
                        SEND CODE
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
                        loading
                      }
                      onPress={
                        handleSendCode
                      }
                    >
                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        {loading
                          ? 'Sending Code...'
                          : 'Send Reset Code'}
                      </Text>
                    </TouchableOpacity>

                    {/* ========================================
                        BACK TO SIGN IN
                    ======================================== */}

                    <TouchableOpacity
                      style={
                        styles.backButton
                      }
                      activeOpacity={
                        0.7
                      }
                      disabled={
                        loading
                      }
                      onPress={() =>
                        router.replace(
                          '/'
                        )
                      }
                    >
                      <Text
                        style={
                          styles.backText
                        }
                      >
                        Back to Sign In
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

    // ========================================================
    // DESKTOP
    // ========================================================

    desktopBackground: {
      flex:
        1,

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
        12.5,
    },

    // ========================================================
    // LOGO
    // ========================================================

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

    // ========================================================
    // BODY
    // ========================================================

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
        28,

      paddingBottom:
        25,

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

    iconCircle: {
      alignSelf:
        'center',

      width:
        62,

      height:
        62,

      marginBottom:
        17,

      borderRadius:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FDECEC',
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
        9,

      marginBottom:
        24,

      paddingHorizontal:
        4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        19,

      textAlign:
        'center',
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorContainer: {
      marginBottom:
        17,

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
        12,

      lineHeight:
        17,

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
        12.5,
    },

    input: {
      height:
        45,

      paddingHorizontal:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        23,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      outlineStyle:
        Platform.OS === 'web'
          ? 'none'
          : undefined,
    } as any,

    // ========================================================
    // BUTTON
    // ========================================================

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
        14.5,
    },

    // ========================================================
    // BACK TO SIGN IN
    // ========================================================

    backButton: {
      alignSelf:
        'center',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        22,

      paddingVertical:
        5,

      paddingHorizontal:
        8,
    },

    backText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,
    },
  });