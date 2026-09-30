import {
  useRef,
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
  resetPassword,
  verifyRecoveryCode,
} from '../lib/api';

// ============================================================
// CONSTANTS
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

  successBackground: '#EAF7EE',
  successBorder: '#A8DAB5',
  successText: '#237A3B',

  codeActive: '#FDECEC',

  requirementInactive: '#8B8B8B',
  requirementActive: '#198754',
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

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    code,
    setCode,
  ] =
    useState('');

  const [
    codeVerified,
    setCodeVerified,
  ] =
    useState(false);

  const [
    recoveryToken,
    setRecoveryToken,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    verifying,
    setVerifying,
  ] =
    useState(false);

  const [
    resetting,
    setResetting,
  ] =
    useState(false);

  const [
    resending,
    setResending,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('');

  // ==========================================================
  // PASSWORD REQUIREMENTS
  // ==========================================================

  const passwordHasMinimumLength =
    password.length >=
    8;

  const passwordHasLowercase =
    /[a-z]/.test(
      password
    );

  const passwordHasUppercase =
    /[A-Z]/.test(
      password
    );

  const passwordHasNumber =
    /[0-9]/.test(
      password
    );

  const passwordHasSpecialCharacter =
    /[^A-Za-z0-9]/.test(
      password
    );

  const passwordIsValid =
    passwordHasMinimumLength &&
    passwordHasLowercase &&
    passwordHasUppercase &&
    passwordHasNumber &&
    passwordHasSpecialCharacter;

  const passwordsMatch =
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword;

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
    setSuccessMessage('');
  }

  // ==========================================================
  // VERIFY CODE
  // ==========================================================

  async function handleVerifyCode() {
    setErrorMessage('');
    setSuccessMessage('');

    // --------------------------------------------------------
    // EMAIL REQUIRED
    // --------------------------------------------------------

    if (
      !email
    ) {
      setErrorMessage(
        'Your email address is missing. Please start the password reset process again.'
      );

      return;
    }

    // --------------------------------------------------------
    // COMPLETE CODE REQUIRED
    // --------------------------------------------------------

    if (
      code.length !==
      CODE_LENGTH
    ) {
      setErrorMessage(
        'Please finish entering the 6-digit verification code.'
      );

      inputRef
        .current
        ?.focus();

      return;
    }

    // --------------------------------------------------------
    // VERIFY
    // --------------------------------------------------------

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
      setSuccessMessage('');
    } catch (
      error
    ) {
      console.log(
        'VERIFY RECOVERY CODE ERROR:',
        error
      );

      let message =
        'Invalid or expired password reset code.';

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

      setSuccessMessage('');

      setCodeVerified(
        false
      );

      setRecoveryToken(
        ''
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

      setErrorMessage('');
      setSuccessMessage('');

      await forgotPassword(
        email
      );

      // ------------------------------------------------------
      // RESET CURRENT VERIFICATION STATE
      // ------------------------------------------------------

      setCode('');
      setCodeVerified(false);
      setRecoveryToken('');
      setPassword('');
      setConfirmPassword('');

      setErrorMessage('');

      setSuccessMessage(
        'A new password reset code has been sent to your email.'
      );

      // ------------------------------------------------------
      // FOCUS CODE INPUT
      // ------------------------------------------------------

      setTimeout(
        () => {
          inputRef
            .current
            ?.focus();
        },
        150
      );
    } catch (
      error
    ) {
      console.log(
        'RESEND PASSWORD CODE ERROR:',
        error
      );

      let message =
        'Unable to resend the password reset code.';

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      setSuccessMessage('');

      setErrorMessage(
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
    setSuccessMessage('');

    // --------------------------------------------------------
    // CODE MUST BE VERIFIED
    // --------------------------------------------------------

    if (
      !codeVerified ||
      !recoveryToken
    ) {
      setErrorMessage(
        'Please verify your recovery code first.'
      );

      return;
    }

    // --------------------------------------------------------
    // REQUIRED PASSWORDS
    // --------------------------------------------------------

    if (
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        'Please enter and confirm your new password.'
      );

      return;
    }

    // --------------------------------------------------------
    // MINIMUM LENGTH
    // --------------------------------------------------------

    if (
      !passwordHasMinimumLength
    ) {
      setErrorMessage(
        'Password must be at least 8 characters.'
      );

      return;
    }

    // --------------------------------------------------------
    // LOWERCASE
    // --------------------------------------------------------

    if (
      !passwordHasLowercase
    ) {
      setErrorMessage(
        'Password must contain at least one lowercase letter.'
      );

      return;
    }

    // --------------------------------------------------------
    // UPPERCASE
    // --------------------------------------------------------

    if (
      !passwordHasUppercase
    ) {
      setErrorMessage(
        'Password must contain at least one uppercase letter.'
      );

      return;
    }

    // --------------------------------------------------------
    // NUMBER
    // --------------------------------------------------------

    if (
      !passwordHasNumber
    ) {
      setErrorMessage(
        'Password must contain at least one number.'
      );

      return;
    }

    // --------------------------------------------------------
    // SPECIAL CHARACTER
    // --------------------------------------------------------

    if (
      !passwordHasSpecialCharacter
    ) {
      setErrorMessage(
        'Password must contain at least one special character.'
      );

      return;
    }

    // --------------------------------------------------------
    // PASSWORD MATCH
    // --------------------------------------------------------

    if (
      !passwordsMatch
    ) {
      setErrorMessage(
        'Passwords do not match.'
      );

      return;
    }

    // --------------------------------------------------------
    // FINAL PASSWORD VALIDITY CHECK
    // --------------------------------------------------------

    if (
      !passwordIsValid
    ) {
      setErrorMessage(
        'Please complete all password requirements.'
      );

      return;
    }

    // --------------------------------------------------------
    // CHANGE PASSWORD
    // --------------------------------------------------------

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

      setErrorMessage('');

      setSuccessMessage(
        data?.message ||
          'Your password has been changed successfully.'
      );

      setPassword('');
      setConfirmPassword('');

      // ------------------------------------------------------
      // RETURN TO SIGN IN AFTER SUCCESS
      // ------------------------------------------------------

      setTimeout(
        () => {
          router.replace(
            '/'
          );
        },
        1000
      );
    } catch (
      error
    ) {
      console.log(
        'RESET PASSWORD ERROR:',
        error
      );

      let message =
        'Unable to change your password. Please try again.';

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

      setSuccessMessage('');

      setErrorMessage(
        message
      );
    } finally {
      setResetting(
        false
      );
    }
  }

  // ==========================================================
  // PASSWORD REQUIREMENT ITEM
  // ==========================================================

  function PasswordRequirement({
    valid,
    label,
  }: {
    valid: boolean;
    label: string;
  }) {
    return (
      <View
        style={
          styles.requirementItem
        }
      >
        <MaterialIcons
          name={
            valid
              ? 'check-circle'
              : 'radio-button-unchecked'
          }
          size={13}
          color={
            valid
              ? COLORS.requirementActive
              : COLORS.requirementInactive
          }
        />

        <Text
          style={[
            styles.requirementText,

            valid &&
              styles.requirementTextValid,
          ]}
        >
          {label}
        </Text>
      </View>
    );
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

                {/* ==================================================
                    LOGO
                ================================================== */}

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

                {/* ==================================================
                    BODY
                ================================================== */}

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
                    {/* ==============================================
                        STEP
                    ============================================== */}

                    <Text
                      style={
                        styles.stepLabel
                      }
                    >
                      {codeVerified
                        ? 'STEP 2 OF 2'
                        : 'STEP 1 OF 2'}
                    </Text>

                    {/* ==============================================
                        TITLE
                    ============================================== */}

                    <Text
                      style={
                        styles.title
                      }
                    >
                      {codeVerified
                        ? 'Create New Password'
                        : 'Verify Reset Code'}
                    </Text>

                    {/* ==============================================
                        STEP 1 DESCRIPTION
                    ============================================== */}

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

                    {/* ==============================================
                        ERROR MESSAGE
                    ============================================== */}

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

                    {/* ==============================================
                        SUCCESS MESSAGE
                    ============================================== */}

                    {successMessage ? (
                      <View
                        style={
                          styles.successContainer
                        }
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color={
                            COLORS.successText
                          }
                        />

                        <Text
                          style={
                            styles.successMessageText
                          }
                        >
                          {
                            successMessage
                          }
                        </Text>
                      </View>
                    ) : null}

                    {/* ==================================================
                        STEP 1 - OTP
                    ================================================== */}

                    {!codeVerified ? (
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

                        {/* ==========================================
                            VERIFY BUTTON
                        ========================================== */}

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

                        {/* ==========================================
                            RESEND
                        ========================================== */}

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
                    ) : null}

                    {/* ==================================================
                        STEP 2 - NEW PASSWORD
                    ================================================== */}

                    {codeVerified ? (
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

                              setSuccessMessage(
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

                        {/* ==========================================
                            PASSWORD REQUIREMENTS
                        ========================================== */}

                        <View
                          style={
                            styles.requirementsContainer
                          }
                        >
                          <Text
                            style={
                              styles.requirementsTitle
                            }
                          >
                            Password must contain:
                          </Text>

                          <View
                            style={
                              styles.requirementsGrid
                            }
                          >
                            <PasswordRequirement
                              valid={
                                passwordHasMinimumLength
                              }
                              label="8+ characters"
                            />

                            <PasswordRequirement
                              valid={
                                passwordHasLowercase
                              }
                              label="Lowercase letter"
                            />

                            <PasswordRequirement
                              valid={
                                passwordHasUppercase
                              }
                              label="Uppercase letter"
                            />

                            <PasswordRequirement
                              valid={
                                passwordHasNumber
                              }
                              label="Number"
                            />

                            <PasswordRequirement
                              valid={
                                passwordHasSpecialCharacter
                              }
                              label="Special character"
                            />
                          </View>
                        </View>

                        {/* ==========================================
                            CONFIRM PASSWORD
                        ========================================== */}

                        <Text
                          style={
                            styles.confirmLabel
                          }
                        >
                          Confirm Password
                        </Text>

                        <View
                          style={[
                            styles.passwordBox,

                            confirmPassword.length >
                              0 &&
                              passwordsMatch &&
                              styles.passwordBoxSuccess,
                          ]}
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

                              setSuccessMessage(
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

                        {/* ==========================================
                            PASSWORD MATCH
                        ========================================== */}

                        {confirmPassword.length >
                        0 ? (
                          <View
                            style={
                              styles.passwordMatchRow
                            }
                          >
                            <MaterialIcons
                              name={
                                passwordsMatch
                                  ? 'check-circle'
                                  : 'cancel'
                              }
                              size={13}
                              color={
                                passwordsMatch
                                  ? COLORS.successText
                                  : COLORS.redButton
                              }
                            />

                            <Text
                              style={[
                                styles.passwordMatchText,

                                passwordsMatch
                                  ? styles.passwordMatchTextSuccess
                                  : styles.passwordMatchTextError,
                              ]}
                            >
                              {passwordsMatch
                                ? 'Passwords match'
                                : 'Passwords do not match'}
                            </Text>
                          </View>
                        ) : null}

                        {/* ==========================================
                            CHANGE PASSWORD BUTTON
                        ========================================== */}

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
                    ) : null}

                    {/* ==================================================
                        BACK TO SIGN IN
                    ================================================== */}

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

    // ========================================================
    // PAGE
    // ========================================================

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

      fontSize: 12.5,
    },

    // ========================================================
    // LOGO
    // ========================================================

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

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flexGrow: 1,

      minHeight: 644,

      paddingHorizontal: 24,

      paddingTop: 91,

      paddingBottom: 30,

      zIndex: 2,
    },

    // ========================================================
    // CARD
    // ========================================================

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

      fontSize: 11,

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

      fontSize: 12.5,

      textAlign: 'center',
    },

    emailText: {
      marginTop: 3,

      marginBottom: 16,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,

      textAlign: 'center',
    },

    // ========================================================
    // VERIFIED
    // ========================================================

    verifiedBox: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

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

      fontSize: 12,
    },

    // ========================================================
    // ERROR
    // ========================================================

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

      fontSize: 12,

      lineHeight: 17,

      textAlign: 'center',
    },

    // ========================================================
    // SUCCESS
    // ========================================================

    successContainer: {
      marginBottom: 15,

      paddingHorizontal: 12,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

      borderWidth: 1,

      borderColor:
        COLORS.successBorder,

      borderRadius: 8,

      backgroundColor:
        COLORS.successBackground,
    },

    successMessageText: {
      flex: 1,

      color:
        COLORS.successText,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      lineHeight: 17,

      textAlign: 'center',
    },

    // ========================================================
    // OTP
    // ========================================================

    codeArea: {
      position:
        'relative',

      flexDirection:
        'row',

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

      alignItems:
        'center',

      justifyContent:
        'center',

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
      position:
        'absolute',

      width: 1,

      height: 1,

      opacity: 0,
    },

    resendRow: {
      flexDirection:
        'row',

      justifyContent:
        'center',

      marginTop: 16,
    },

    resendLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    resendText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    // ========================================================
    // PASSWORD
    // ========================================================

    label: {
      marginBottom: 6,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12.5,
    },

    confirmLabel: {
      marginTop: 14,

      marginBottom: 6,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12.5,
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

    passwordBoxSuccess: {
      borderColor:
        COLORS.successText,
    },

    passwordInput: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,

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

      fontSize: 12,
    },

    // ========================================================
    // PASSWORD REQUIREMENTS
    // ========================================================

    requirementsContainer: {
      marginTop: 10,

      paddingHorizontal: 5,
    },

    requirementsTitle: {
      marginBottom: 6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    requirementsGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      columnGap: 12,

      rowGap: 5,
    },

    requirementItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,
    },

    requirementText: {
      color:
        COLORS.requirementInactive,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    requirementTextValid: {
      color:
        COLORS.requirementActive,
    },

    passwordMatchRow: {
      marginTop: 6,

      marginLeft: 5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 4,
    },

    passwordMatchText: {
      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,
    },

    passwordMatchTextSuccess: {
      color:
        COLORS.successText,
    },

    passwordMatchTextError: {
      color:
        COLORS.redButton,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      height: 50,

      marginTop: 22,

      borderRadius: 7,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    disabledButton: {
      opacity: 0.5,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14.5,
    },

    // ========================================================
    // BACK TO SIGN IN
    // ========================================================

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

      fontSize: 12.5,
    },
  });