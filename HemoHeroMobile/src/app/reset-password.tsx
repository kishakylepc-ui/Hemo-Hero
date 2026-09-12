import {
  resetPassword,
} from '../lib/api';

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

import { LinearGradient } from 'expo-linear-gradient';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import { SafeAreaView } from 'react-native-safe-area-context';

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

  codeActive: '#FDECEC',
};

const CODE_LENGTH = 6;

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
    loading,
    setLoading,
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
  // CODE
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
      setErrorMessage('');
    }
  }

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  async function handleResetPassword() {
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
      'Please enter the 6-digit verification code sent to your email.';

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
    password.length < 8
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
    setLoading(
      true
    );

    const data =
      await resetPassword(
        email,
        code,
        password,
        confirmPassword
      );

    setCode('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');

    showMessage(
      'Password Reset',
      data?.message ||
        'Your password has been reset successfully. You can now sign in.'
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
      'Unable to reset your password. Please try again.';

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
          edges={['top']}
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
                        styles.title
                      }
                    >
                      Reset Password
                    </Text>

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

                    {/* OTP */}

                    <TouchableOpacity
                      style={
                        styles.codeArea
                      }
                      activeOpacity={1}
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
                        style={
                          styles.hiddenInput
                        }
                      />
                    </TouchableOpacity>

                    {/* NEW PASSWORD */}

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
                        onChangeText={
                          setPassword
                        }
                      />

                      <TouchableOpacity
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

                    {/* CONFIRM PASSWORD */}

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
                        onChangeText={
                          setConfirmPassword
                        }
                      />

                      <TouchableOpacity
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

                    {/* BUTTON */}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,

                        loading &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        loading
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
                        {loading
                          ? 'Resetting Password...'
                          : 'Reset Password'}
                      </Text>
                    </TouchableOpacity>

                    {/* BACK */}

                    <TouchableOpacity
                      style={
                        styles.backButton
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

      paddingHorizontal:
        24,

      paddingTop: 91,

      paddingBottom: 30,

      zIndex: 2,
    },

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius: 25,

      paddingHorizontal:
        22,

      paddingTop: 25,

      paddingBottom: 22,

      elevation: 2,
    },

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 21,

      textAlign:
        'center',
    },

    description: {
      marginTop: 7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      textAlign:
        'center',
    },

    emailText: {
      marginTop: 3,

      marginBottom: 13,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11,

      textAlign:
        'center',
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

      textAlign:
        'center',
    },

    codeArea: {
      position:
        'relative',

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      marginBottom: 22,
    },

    codeBox: {
      width: 43,
      height: 50,

      borderWidth: 1,

      borderColor:
        COLORS.inputBorder,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    codeBoxActive: {
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
      position:
        'absolute',

      width: 1,
      height: 1,

      opacity: 0,
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

      flexDirection:
        'row',

      alignItems:
        'center',

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

    showText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,
    },

    primaryButton: {
      height: 50,

      marginTop: 24,

      borderRadius: 7,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    disabledButton: {
      opacity: 0.6,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13,
    },

    backButton: {
      alignSelf:
        'center',

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