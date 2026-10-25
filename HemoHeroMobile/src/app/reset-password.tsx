import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputInstance,
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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown } from '../lib/fullScreen';

import {
  ApiError,
  forgotPassword,
  resetPassword,
  verifyRecoveryCode,
} from '../lib/api';

// A new code only 60 seconds after the last one (the server
// enforces it too).
const RESEND_SECONDS =
  60;

import AuthField from '../components/AuthField';

import {
  FadeInView,
} from '../components/Motion';

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  heroTop: '#D31115',
  heroMiddle: '#A10F12',
  heroBottom: '#8F1111',

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
  // The header is drawn behind the status bar (full screen,
  // like the Home screen).
  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      email?:
        | string
        | string[];

      // Seconds before Resend works (when Forgot Password
      // found a code sent less than a minute ago).
      wait?:
        | string
        | string[];
    }>();

  const waitParam =
    Number(
      Array.isArray(
        params.wait
      )
        ? params.wait[0]
        : params.wait
    );

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
    useRef<TextInputInstance>(
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

  // Rules show while typing the new password.
  const [
    passwordFocused,
    setPasswordFocused,
  ] =
    useState(false);

  // "Passwords don't match" waits until the field is left.
  const [
    confirmTouched,
    setConfirmTouched,
  ] =
    useState(false);

  const confirmRef =
    useRef<TextInputInstance>(null);

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

  // The code was sent just before this screen opened.
  const [
    resendSeconds,
    setResendSeconds,
  ] =
    useState(
      Number.isFinite(
        waitParam
      ) &&
        waitParam > 0
        ? Math.ceil(
            waitParam
          )
        : RESEND_SECONDS
    );

  useEffect(() => {
    if (
      resendSeconds <=
      0
    ) {
      return;
    }

    const timer =
      setTimeout(
        () =>
          setResendSeconds(
            current =>
              Math.max(
                0,
                current - 1
              )
          ),
        1000
      );

    return () =>
      clearTimeout(timer);
  }, [
    resendSeconds,
  ]);

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

  const passwordScore =
    [
      passwordHasMinimumLength,
      passwordHasLowercase,
      passwordHasUppercase,
      passwordHasNumber,
      passwordHasSpecialCharacter,
    ].filter(Boolean).length;

  const strength =
    passwordIsValid
      ? {
          label: 'Strong',
          color: COLORS.successText,
        }
      : passwordScore >= 3
        ? {
            label: 'Fair',
            color: '#DF721D',
          }
        : {
            label: 'Weak',
            color: COLORS.redButton,
          };

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

      // Used up (5 wrong tries) or too old: a new code is
      // needed, so empty the boxes.
      if (
        error instanceof ApiError &&
        [
          'OTP_TOO_MANY_ATTEMPTS',
          'OTP_EXPIRED',
        ].includes(
          error.data?.code
        )
      ) {
        setCode('');
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
      resendSeconds > 0 ||
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

      setResendSeconds(
        RESEND_SECONDS
      );

      setSuccessMessage(
        'A new password reset code has been sent to your email. Codes sent earlier no longer work.'
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

      // Too soon: count down the time the server gave.
      const waitSeconds =
        error instanceof ApiError
          ? Number(
              error.data
                ?.retry_after_seconds
            )
          : NaN;

      if (
        Number.isFinite(
          waitSeconds
        ) &&
        waitSeconds > 0
      ) {
        setResendSeconds(
          waitSeconds
        );
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
              {/* ====================================================
                  HERO (red) + SHEET (the form), like Sign In
              ==================================================== */}

              <LinearGradient
                colors={[
                  COLORS.heroTop,
                  COLORS.heroMiddle,
                  COLORS.heroBottom,
                ]}
                locations={[
                  0,
                  0.45,
                  1,
                ]}
                style={
                  styles.hero
                }
              >
                <View
                  style={shiftedDown(
                    styles.headerCircleRight,
                    insets.top
                  )}
                />

                <View
                  style={[
                    styles.heroRow,

                    {
                      paddingTop:
                        insets.top + 16,
                    },
                  ]}
                >
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

                  <Text
                    style={
                      styles.brandName
                    }
                  >
                    Hemo-Hero
                  </Text>
                </View>

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
                              resendSeconds > 0 ||
                              resending ||
                              verifying
                            }
                            onPress={
                              handleResendCode
                            }
                          >
                            <Text
                              style={[
                                styles.resendText,

                                resendSeconds > 0 &&
                                  styles.resendTextWaiting,
                              ]}
                            >
                              {resending
                                ? 'Sending...'
                                : resendSeconds > 0
                                  ? `Resend in ${resendSeconds}s`
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
                        <AuthField
                          label="New Password"
                          icon="lock-closed-outline"
                          password
                          placeholder="Enter new password"
                          value={
                            password
                          }
                          autoCapitalize="none"
                          autoCorrect={
                            false
                          }
                          autoComplete="new-password"
                          textContentType="newPassword"
                          editable={
                            !resetting
                          }
                          returnKeyType="next"
                          submitBehavior="submit"
                          onFocus={() =>
                            setPasswordFocused(
                              true
                            )
                          }
                          onBlur={() =>
                            setPasswordFocused(
                              false
                            )
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
                          onSubmitEditing={() =>
                            confirmRef.current?.focus()
                          }
                        >
                          {password.length >
                          0 ? (
                            <View
                              style={
                                styles.strengthRow
                              }
                            >
                              <View
                                style={
                                  styles.strengthTrack
                                }
                              >
                                <View
                                  style={[
                                    styles.strengthFill,
                                    {
                                      width: `${
                                        (passwordScore /
                                          5) *
                                        100
                                      }%`,
                                      backgroundColor:
                                        strength.color,
                                    },
                                  ]}
                                />
                              </View>

                              <Text
                                style={[
                                  styles.strengthLabel,
                                  {
                                    color:
                                      strength.color,
                                  },
                                ]}
                              >
                                {passwordIsValid
                                  ? 'Password looks good'
                                  : strength.label}
                              </Text>
                            </View>
                          ) : null}

                          {/* Rules: while typing, until all are met */}
                          {!passwordIsValid &&
                          passwordFocused ? (
                            <FadeInView
                              offset={-4}
                              style={
                                styles.requirementsList
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
                            </FadeInView>
                          ) : null}
                        </AuthField>

                        <AuthField
                          ref={
                            confirmRef
                          }
                          label="Confirm Password"
                          icon="lock-closed-outline"
                          password
                          placeholder="Confirm new password"
                          value={
                            confirmPassword
                          }
                          autoCapitalize="none"
                          autoCorrect={
                            false
                          }
                          autoComplete="new-password"
                          textContentType="newPassword"
                          editable={
                            !resetting
                          }
                          returnKeyType="done"
                          valid={
                            passwordsMatch
                          }
                          error={
                            confirmTouched &&
                            confirmPassword.length >
                              0 &&
                            !passwordsMatch
                              ? 'Passwords don’t match.'
                              : null
                          }
                          onBlur={() =>
                            setConfirmTouched(
                              true
                            )
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
                          {resetting ? (
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
    // HERO (red, full screen) + SHEET, like Sign In / Sign Up
    // ========================================================

    hero: {
      flexGrow: 1,
    },

    headerCircleRight: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      right: -90,
      top: -110,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },

    // Logo and name in one centered row.
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },

    logoCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 6,
    },

    logoImage: {
      width: 40,
      height: 40,
    },

    brandName: {
      color: COLORS.white,
      fontFamily: 'Poppins_700Bold',
      fontSize: 24,
      lineHeight: 30,
    },

    // The form, on a white sheet rising from the bottom.
    sheet: {
      flexGrow: 1,
      marginTop: 24,
      paddingHorizontal: 24,
      paddingTop: 28,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      backgroundColor: COLORS.white,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: -12,
      },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },

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
          : COLORS.heroBottom,
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
        COLORS.heroBottom,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    scroll: {
      flexGrow: 1,

      backgroundColor:
        COLORS.heroBottom,
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

      fontFamily: 'Poppins_600SemiBold',

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

      borderRadius: 12,

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

      borderRadius: 12,

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

      borderRadius: 12,

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

    // "Resend in 42s" (same grey as Verify Email).
    resendTextWaiting: {
      color:
        '#999999',
    },

    // ========================================================
    // PASSWORD
    // ========================================================

    // ========================================================
    // PASSWORD REQUIREMENTS
    // ========================================================

    // Password strength bar under the field.
    strengthRow: {
      marginTop: 8,
      marginHorizontal: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    strengthTrack: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: '#EFE6E6',
    },

    strengthFill: {
      height: '100%',
      borderRadius: 3,
    },

    strengthLabel: {
      minWidth: 52,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11.5,
      textAlign: 'right',
    },

    // Rules, shown while typing until all are met.
    requirementsList: {
      marginTop: 8,
      marginHorizontal: 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
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

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      flexDirection: 'row',

      gap: 8,

      height: 52,

      marginTop: 22,

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