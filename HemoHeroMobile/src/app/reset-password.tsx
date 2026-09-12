import {
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
  resetPassword,
  verifyRecoveryCode,
} from '../lib/api';

// ============================================================
// CONSTANTS
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
  muted: '#666666',

  errorBackground: '#FDECEC',
  errorBorder: '#F5BABA',

  successBackground: '#EAF7EE',
  successBorder: '#A8DAB5',
  successText: '#237A3B',

  codeActive: '#FDECEC',
};

const CODE_LENGTH =
  6;

// ============================================================
// SCREEN
// ============================================================

export default function ResetPasswordScreen() {
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
        : emailParam || ''
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
  ] = useState('');

  const [
    codeVerified,
    setCodeVerified,
  ] = useState(false);

  const [
    recoveryToken,
    setRecoveryToken,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  const [
    resetting,
    setResetting,
  ] = useState(false);

  const [
    resending,
    setResending,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
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

    setErrorMessage('');
  }

  // ==========================================================
  // VERIFY CODE
  // ==========================================================

  async function handleVerifyCode() {
    setErrorMessage('');

    if (!email) {
      const message =
        'Your email address is missing. Please start the password reset process again.';

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
        'Please finish entering the 6-digit verification code.';

      setErrorMessage(
        message
      );

      showMessage(
        'Incomplete Code',
        message
      );

      inputRef
        .current
        ?.focus();

      return;
    }

    try {
      setVerifying(
        true
      );

      const data =
        await verifyRecoveryCode(
          email,
          code
        );

      if (
        !data?.recovery_token
      ) {
        throw new Error(
          'Verification succeeded, but no recovery session was returned.'
        );
      }

      setRecoveryToken(
        data.recovery_token
      );

      setCodeVerified(
        true
      );

      setErrorMessage('');

      showMessage(
        'Code Verified',
        'Your verification code is correct. You can now create a new password.'
      );
    } catch (error) {
      console.log(
        'VERIFY RECOVERY CODE ERROR:',
        error
      );

      let message =
        'Invalid or expired password reset code.';

      if (
        error instanceof Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(
        message
      );

      setCodeVerified(
        false
      );

      setRecoveryToken(
        ''
      );

      showMessage(
        'Verification Failed',
        message
      );
    } finally {
      setVerifying(
        false
      );
    }
  }

  // ==========================================================
  // RESEND CODE
  // ==========================================================

  async function handleResendCode() {
    if (
      !email ||
      resending ||
      verifying ||
      resetting
    ) {
      return;
    }

    try {
      setResending(
        true
      );

      await forgotPassword(
        email
      );

      setCode('');
      setCodeVerified(false);
      setRecoveryToken('');
      setPassword('');
      setConfirmPassword('');
      setErrorMessage('');

      showMessage(
        'Code Sent',
        'A new password reset code has been sent to your email.'
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
      let message =
        'Unable to resend the password reset code.';

      if (
        error instanceof Error
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
  // CHANGE PASSWORD
  // ==========================================================

  async function handleResetPassword() {
    setErrorMessage('');

    if (
      !codeVerified ||
      !recoveryToken
    ) {
      const message =
        'Please verify your recovery code first.';

      setErrorMessage(
        message
      );

      return;
    }

    if (
      !password ||
      !confirmPassword
    ) {
      const message =
        'Please enter and confirm your new password.';

      setErrorMessage(
        message
      );

      showMessage(
        'Missing Information',
        message
      );

      return;
    }

    if (
      password.length <
      8
    ) {
      const message =
        'Password must be at least 8 characters.';

      setErrorMessage(
        message
      );

      showMessage(
        'Invalid Password',
        message
      );

      return;
    }

    const hasLetter =
      /[A-Za-z]/.test(
        password
      );

    const hasNumber =
      /[0-9]/.test(
        password
      );

    if (
      !hasLetter ||
      !hasNumber
    ) {
      const message =
        'Password must contain at least one letter and one number.';

      setErrorMessage(
        message
      );

      showMessage(
        'Invalid Password',
        message
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      const message =
        'Passwords do not match.';

      setErrorMessage(
        message
      );

      showMessage(
        'Passwords Do Not Match',
        message
      );

      return;
    }

    try {
      setResetting(
        true
      );

      const data =
        await resetPassword(
          recoveryToken,
          password,
          confirmPassword
        );

      showMessage(
        'Password Changed',
        data?.message ||
          'Your password has been changed successfully.'
      );

      router.replace(
        '/'
      );
    } catch (error) {
      console.log(
        'RESET PASSWORD ERROR:',
        error
      );

      let message =
        'Unable to change your password. Please try again.';

      if (
        error instanceof Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(
        message
      );

      showMessage(
        'Reset Failed',
        message
      );
    } finally {
      setResetting(
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
                {/* HEADER */}

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

                {/* LOGO */}

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

                {/* BODY */}

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
                        styles.stepLabel
                      }
                    >
                      {codeVerified
                        ? 'STEP 2 OF 2'
                        : 'STEP 1 OF 2'}
                    </Text>

                    <Text
                      style={
                        styles.title
                      }
                    >
                      {codeVerified
                        ? 'Create New Password'
                        : 'Verify Reset Code'}
                    </Text>

                    {!codeVerified ? (
                      <>
                        <Text
                          style={
                            styles.description
                          }
                        >
                          Enter the 6-digit code sent to
                        </Text>

                        <Text
                          style={
                            styles.emailText
                          }
                        >
                          {email}
                        </Text>
                      </>
                    ) : (
                      <View
                        style={
                          styles.verifiedBox
                        }
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={
                            COLORS.successText
                          }
                        />

                        <Text
                          style={
                            styles.verifiedText
                          }
                        >
                          Verification code confirmed
                        </Text>
                      </View>
                    )}

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
                          {errorMessage}
                        </Text>
                      </View>
                    ) : null}

                    {/* ==================================================
                        STEP 1 - OTP
                    ================================================== */}

                    {!codeVerified && (
                      <>
                        <TouchableOpacity
                          style={
                            styles.codeArea
                          }
                          activeOpacity={
                            1
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
                                ] || '';

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
                                    {digit}
                                  </Text>
                                </View>
                              );
                            }
                          )}

                          <TextInput
                            ref={
                              inputRef
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
                            caretHidden
                            editable={
                              !verifying &&
                              !resending
                            }
                            autoComplete="one-time-code"
                            style={
                              styles.hiddenInput
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.primaryButton,

                            (
                              verifying ||
                              code.length !==
                                CODE_LENGTH
                            ) &&
                              styles.disabledButton,
                          ]}
                          disabled={
                            verifying ||
                            code.length !==
                              CODE_LENGTH
                          }
                          onPress={
                            handleVerifyCode
                          }
                        >
                          <Text
                            style={
                              styles.primaryButtonText
                            }
                          >
                            {verifying
                              ? 'Verifying Code...'
                              : 'Verify Code'}
                          </Text>
                        </TouchableOpacity>

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
                              resending ||
                              verifying
                            }
                            onPress={
                              handleResendCode
                            }
                          >
                            <Text
                              style={
                                styles.resendText
                              }
                            >
                              {resending
                                ? 'Sending...'
                                : 'Resend Code'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {/* ==================================================
                        STEP 2 - PASSWORD
                    ================================================== */}

                    {codeVerified && (
                      <>
                        <Text
                          style={
                            styles.label
                          }
                        >
                          New Password
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
                            placeholder="Enter new password"
                            placeholderTextColor={
                              COLORS.placeholder
                            }
                            value={
                              password
                            }
                            secureTextEntry={
                              !showPassword
                            }
                            autoCapitalize="none"
                            autoCorrect={
                              false
                            }
                            autoComplete="new-password"
                            editable={
                              !resetting
                            }
                            onChangeText={value => {
                              setPassword(
                                value
                              );

                              setErrorMessage(
                                ''
                              );
                            }}
                          />

                          <TouchableOpacity
                            disabled={
                              resetting
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

                        <Text
                          style={
                            styles.passwordHint
                          }
                        >
                          At least 8 characters with one letter and one number.
                        </Text>

                        <Text
                          style={
                            styles.confirmLabel
                          }
                        >
                          Confirm Password
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
                            placeholder="Confirm new password"
                            placeholderTextColor={
                              COLORS.placeholder
                            }
                            value={
                              confirmPassword
                            }
                            secureTextEntry={
                              !showConfirmPassword
                            }
                            autoCapitalize="none"
                            autoCorrect={
                              false
                            }
                            autoComplete="new-password"
                            editable={
                              !resetting
                            }
                            onChangeText={value => {
                              setConfirmPassword(
                                value
                              );

                              setErrorMessage(
                                ''
                              );
                            }}
                            onSubmitEditing={
                              handleResetPassword
                            }
                          />

                          <TouchableOpacity
                            disabled={
                              resetting
                            }
                            onPress={() =>
                              setShowConfirmPassword(
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
                              {showConfirmPassword
                                ? 'Hide'
                                : 'Show'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.primaryButton,

                            resetting &&
                              styles.disabledButton,
                          ]}
                          disabled={
                            resetting
                          }
                          onPress={
                            handleResetPassword
                          }
                        >
                          <Text
                            style={
                              styles.primaryButtonText
                            }
                          >
                            {resetting
                              ? 'Changing Password...'
                              : 'Change Password'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* BACK */}

                    <TouchableOpacity
                      style={
                        styles.backButton
                      }
                      disabled={
                        verifying ||
                        resetting
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
      flex: 1,
    },

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

    phone: {
      width:
        Platform.OS === 'web'
          ? 402
          : '100%',

      height:
        Platform.OS === 'web'
          ? 874
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

    headerWrapper: {
      backgroundColor:
        COLORS.pinkTop,

      zIndex: 1,
    },

    header: {
      height: 230,

      alignItems:
        'center',

      paddingTop: 42,

      borderBottomLeftRadius:
        58,

      borderBottomRightRadius:
        58,

      overflow:
        'hidden',
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

      fontSize: 30,
    },

    tagline: {
      marginTop: 7,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    logoCircle: {
      position:
        'absolute',

      top: 165,

      alignSelf:
        'center',

      width: 130,
      height: 130,

      borderRadius: 65,

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
    },

    logoImage: {
      width: 110,
      height: 110,
    },

    bodyBackground: {
      flexGrow: 1,

      minHeight: 644,

      paddingHorizontal: 24,

      paddingTop: 91,

      paddingBottom: 30,

      zIndex: 2,
    },

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius: 25,

      paddingHorizontal: 22,

      paddingTop: 23,

      paddingBottom: 22,

      elevation: 2,
    },

    stepLabel: {
      marginBottom: 6,

      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 9,

      letterSpacing: 1,

      textAlign: 'center',
    },

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,

      textAlign: 'center',
    },

    description: {
      marginTop: 7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      textAlign: 'center',
    },

    emailText: {
      marginTop: 3,

      marginBottom: 16,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11,

      textAlign: 'center',
    },

    verifiedBox: {
      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      marginTop: 15,
      marginBottom: 20,

      paddingVertical: 10,
      paddingHorizontal: 12,

      borderWidth: 1,

      borderColor:
        COLORS.successBorder,

      borderRadius: 8,

      backgroundColor:
        COLORS.successBackground,
    },

    verifiedText: {
      marginLeft: 6,

      color:
        COLORS.successText,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11,
    },

    errorContainer: {
      marginBottom: 15,

      paddingHorizontal: 12,
      paddingVertical: 9,

      borderWidth: 1,

      borderColor:
        COLORS.errorBorder,

      borderRadius: 8,

      backgroundColor:
        COLORS.errorBackground,
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10,

      lineHeight: 15,

      textAlign: 'center',
    },

    codeArea: {
      position: 'relative',

      flexDirection: 'row',

      justifyContent:
        'space-between',

      marginBottom: 5,
    },

    codeBox: {
      width: 43,
      height: 50,

      borderWidth: 1,

      borderColor:
        COLORS.inputBorder,

      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    codeBoxActive: {
      borderWidth: 1.5,

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

      fontSize: 21,
    },

    hiddenInput: {
      position: 'absolute',

      width: 1,
      height: 1,

      opacity: 0,
    },

    resendRow: {
      flexDirection: 'row',

      justifyContent: 'center',

      marginTop: 16,
    },

    resendLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    resendText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    label: {
      marginBottom: 6,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,
    },

    confirmLabel: {
      marginTop: 14,
      marginBottom: 6,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,
    },

    passwordBox: {
      height: 43,

      flexDirection: 'row',

      alignItems: 'center',

      paddingLeft: 15,
      paddingRight: 13,

      borderWidth: 1,

      borderColor:
        COLORS.inputBorder,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,
    },

    passwordInput: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      outlineStyle:
        Platform.OS === 'web'
          ? 'none'
          : undefined,
    } as any,

    passwordHint: {
      marginTop: 6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 13,
    },

    showText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,
    },

    primaryButton: {
      height: 50,

      marginTop: 22,

      borderRadius: 7,

      backgroundColor:
        COLORS.redButton,

      alignItems: 'center',

      justifyContent: 'center',
    },

    disabledButton: {
      opacity: 0.5,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },

    backButton: {
      alignSelf: 'center',

      marginTop: 18,

      paddingVertical: 5,
      paddingHorizontal: 8,
    },

    backText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11,
    },
  });