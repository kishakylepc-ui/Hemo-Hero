import {
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  forgotPassword,
} from '../lib/api';

import AuthField from '../components/AuthField';
import AuthHero from '../components/AuthHero';

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
  muted: '#666666',

  errorBackground: '#FDECEC',
  errorBorder: '#F5BABA',
};

// ============================================================
// SCREEN
// ============================================================

export default function ForgotPasswordScreen() {
  // The header is drawn behind the status bar (full screen,
  // like the Home screen).
  const insets =
    useSafeAreaInsets();

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

      // A code went out less than a minute ago and still works:
      // go enter it (Resend waits out the rest of the minute).
      if (
        error instanceof ApiError &&
        error.data?.code ===
          'OTP_RESEND_COOLDOWN'
      ) {
        router.push({
          pathname:
            '/reset-password',

          params: {
            email:
              cleanEmail,

            wait:
              String(
                error.data
                  .retry_after_seconds ||
                  60
              ),
          },
        });

        return;
      }

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
              {/* ====================================================
                  HERO: red top with the drop and the wave
              ==================================================== */}

              <AuthHero
                topInset={
                  insets.top
                }
              />

                  <View
                    style={[
                      styles.sheet,

                      {
                        paddingBottom:
                          Math.max(
                            insets.bottom,
                            12
                          ) + 22,
                      },
                    ]}
                  >
                    {/* ========================================
                        ICON
                    ======================================== */}

                    <View
                      style={
                        styles.iconCircle
                      }
                    >
                      <Ionicons
                        name="key-outline"
                        size={28}
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

                    <AuthField
                      label="Email Address"
                      icon="mail-outline"
                      placeholder="Enter your email"
                      value={
                        email
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      autoComplete="email"
                      textContentType="emailAddress"
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
                      onBlur={() =>
                        setEmail(
                          current =>
                            current.trim()
                        )
                      }
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
      paddingTop: 8,
      backgroundColor: COLORS.white,
    },









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
          : COLORS.white,
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
        COLORS.white,
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.white,
    },

    scroll: {
      flexGrow:
        1,

      backgroundColor:
        COLORS.white,
    },


    // ========================================================
    // HEADER
    // ========================================================







    // ========================================================
    // LOGO
    // ========================================================



    // ========================================================
    // BODY
    // ========================================================


    // ========================================================
    // CARD
    // ========================================================


    iconCircle: {
      alignSelf:
        'center',

      width: 56,

      height: 56,

      marginBottom: 16,

      borderRadius: 16,

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

      fontFamily: 'Poppins_600SemiBold',

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

      borderRadius: 12,

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

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      flexDirection: 'row',

      gap: 8,

      height: 52,

      marginTop:
        24,

      borderRadius: 14,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',

      shadowColor: COLORS.redButton,

      shadowOffset: { width: 0, height: 8 },

      shadowOpacity: 0.28,

      shadowRadius: 12,

      elevation: 4,
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