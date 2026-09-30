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
  registerUser,
} from '../lib/api';

import {
  saveSession,
} from '../lib/session';

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
  muted: '#555555',

  success: '#198754',
  successBackground: '#EAF7EF',
  successBorder: '#B8DFC7',

  requirementInactive: '#8B8B8B',
  requirementActive: '#198754',
};

// ============================================================
// SCREEN
// ============================================================

export default function SignUpScreen() {
  const {
    height,
  } =
    useWindowDimensions();

  /*
    PRIMARY TARGET:
    iPhone 17 Pro = approximately 402 x 874

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
    accepted,
    setAccepted,
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

  const passwordsMatch =
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword;

  // ==========================================================
  // ANIMATIONS
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

  const checkboxScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const errorShake =
    useRef(
      new Animated.Value(0)
    ).current;

  // ==========================================================
  // ENTRANCE ANIMATION
  // ==========================================================

  useEffect(
    () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(
            headerOpacity,
            {
              toValue: 1,

              duration: 320,

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
              toValue: 0,

              duration: 320,

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
          Animated.parallel([
            Animated.timing(
              logoOpacity,
              {
                toValue: 1,

                duration: 330,

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
                toValue: 1,

                friction: 6,

                tension: 70,

                useNativeDriver:
                  true,
              }
            ),
          ]),

          Animated.parallel([
            Animated.timing(
              cardOpacity,
              {
                toValue: 1,

                duration: 430,

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
                toValue: 0,

                duration: 430,

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
  // ERROR SHAKE
  // ==========================================================

  function triggerError(
    message: string
  ) {
    setSuccessMessage('');

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
          toValue: -8,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 8,

          duration: 70,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: -6,

          duration: 65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 6,

          duration: 65,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: -3,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 3,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        errorShake,
        {
          toValue: 0,

          duration: 55,

          useNativeDriver:
            true,
        }
      ),
    ]).start();
  }

  // ==========================================================
  // CREATE BUTTON ANIMATION
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
        toValue: 0.97,

        friction: 7,

        tension: 160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  function handleButtonPressOut() {
    Animated.spring(
      buttonScale,
      {
        toValue: 1,

        friction: 7,

        tension: 160,

        useNativeDriver:
          true,
      }
    ).start();
  }

  // ==========================================================
  // TERMS CHECKBOX
  // ==========================================================

  function handleToggleAgreement() {
    if (
      loading
    ) {
      return;
    }

    setAccepted(
      current =>
        !current
    );

    Animated.sequence([
      Animated.timing(
        checkboxScale,
        {
          toValue: 0.82,

          duration: 70,

          useNativeDriver:
            true,
        }
      ),

      Animated.spring(
        checkboxScale,
        {
          toValue: 1,

          friction: 5,

          tension: 180,

          useNativeDriver:
            true,
        }
      ),
    ]).start();

    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }

  // ==========================================================
  // CREATE ACCOUNT
  // ==========================================================

  async function handleCreateAccount() {
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // REQUIRED
    // --------------------------------------------------------

    if (
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      triggerError(
        'Please complete all required fields.'
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

    // --------------------------------------------------------
    // PASSWORD LENGTH
    // --------------------------------------------------------

    if (
      !passwordHasMinimumLength
    ) {
      triggerError(
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
      triggerError(
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
      triggerError(
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
      triggerError(
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
      triggerError(
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
      triggerError(
        'Passwords do not match.'
      );

      return;
    }

    // --------------------------------------------------------
    // TERMS
    // --------------------------------------------------------

    if (
      !accepted
    ) {
      triggerError(
        'Please agree to the Terms of Service and Privacy Policy.'
      );

      return;
    }

    // --------------------------------------------------------
    // API
    // --------------------------------------------------------

    try {
      setLoading(
        true
      );

      const data =
        await registerUser(
          cleanEmail,
          password,
          confirmPassword
        );

      setErrorMessage('');

      // ------------------------------------------------------
      // SESSION RETURNED
      // ------------------------------------------------------

      if (
        data?.session?.access_token
      ) {
        await saveSession(
          data.session
        );

        setPassword('');

        setConfirmPassword('');

        setSuccessMessage(
          'Account created successfully.'
        );

        setTimeout(
          () => {
            router.replace(
              '/complete-profile/personal'
            );
          },
          700
        );

        return;
      }

      // ------------------------------------------------------
      // EMAIL VERIFICATION REQUIRED
      // ------------------------------------------------------

      setPassword('');

      setConfirmPassword('');

      router.push({
        pathname:
          '/verify-email',

        params: {
          email:
            cleanEmail,
        },
      });
    } catch (
      error
    ) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      let message =
        'Unable to create your account. Please try again.';

      if (
        error instanceof
        Error
      ) {
        message =
          error.message;
      }

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
                          router.replace(
                            '/'
                          )
                        }
                      >
                        <Text
                          style={
                            styles.inactiveTabText
                          }
                        >
                          Sign In
                        </Text>
                      </TouchableOpacity>

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
                          Sign Up
                        </Text>
                      </View>
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
                        SUCCESS
                    ============================================== */}

                    {successMessage ? (
                      <View
                        style={
                          styles.successContainer
                        }
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={17}
                          color={
                            COLORS.success
                          }
                        />

                        <Text
                          style={
                            styles.successText
                          }
                        >
                          {
                            successMessage
                          }
                        </Text>
                      </View>
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

                        if (
                          successMessage
                        ) {
                          setSuccessMessage(
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
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={
                          false
                        }
                        autoComplete="new-password"
                        editable={
                          !loading
                        }
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

                          if (
                            successMessage
                          ) {
                            setSuccessMessage(
                              ''
                            );
                          }
                        }}
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
                        PASSWORD REQUIREMENTS
                    ============================================== */}

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

                    {/* ==============================================
                        CONFIRM PASSWORD
                    ============================================== */}

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
                        placeholder="Confirm your password"
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
                          !loading
                        }
                        returnKeyType="done"
                        onChangeText={value => {
                          setConfirmPassword(
                            value
                          );

                          if (
                            errorMessage
                          ) {
                            setErrorMessage(
                              ''
                            );
                          }

                          if (
                            successMessage
                          ) {
                            setSuccessMessage(
                              ''
                            );
                          }
                        }}
                        onSubmitEditing={
                          handleCreateAccount
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
                              ? COLORS.success
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

                    {/* ==============================================
                        TERMS
                    ============================================== */}

                    <View
                      style={
                        styles.agreementRow
                      }
                    >
                      <TouchableOpacity
                        activeOpacity={
                          0.7
                        }
                        disabled={
                          loading
                        }
                        onPress={
                          handleToggleAgreement
                        }
                      >
                        <Animated.View
                          style={[
                            styles.checkbox,

                            accepted &&
                              styles.checkboxChecked,

                            {
                              transform: [
                                {
                                  scale:
                                    checkboxScale,
                                },
                              ],
                            },
                          ]}
                        >
                          {accepted ? (
                            <MaterialIcons
                              name="check"
                              size={13}
                              color={
                                COLORS.white
                              }
                            />
                          ) : null}
                        </Animated.View>
                      </TouchableOpacity>

                      <Text
                        style={
                          styles.agreementText
                        }
                      >
                        I agree to the{' '}

                        <Text
                          style={
                            styles.linkText
                          }
                          onPress={() =>
                            router.push(
                              '/terms-of-service'
                            )
                          }
                        >
                          Terms of Service
                        </Text>

                        {' '}and{' '}

                        <Text
                          style={
                            styles.linkText
                          }
                          onPress={() =>
                            router.push(
                              '/privacy-policy'
                            )
                          }
                        >
                          Privacy Policy
                        </Text>

                        .
                      </Text>
                    </View>

                    {/* ==============================================
                        CREATE ACCOUNT
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
                          handleCreateAccount
                        }
                      >
                        <Text
                          style={
                            styles.primaryButtonText
                          }
                        >
                          {loading
                            ? 'Creating Account...'
                            : 'Create Account'}
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
      flex: 1,
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

      fontSize: 31,
    },

    brandNameSmall: {
      fontSize: 29,
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

      top: 186,

      alignSelf:
        'center',

      width: 148,

      height: 148,

      borderRadius: 74,

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

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.08,

      shadowRadius: 4,
    },

    logoCircleSmall: {
      top: 167,

      width: 126,

      height: 126,

      borderRadius: 63,
    },

    logoImage: {
      width: 128,

      height: 128,
    },

    logoImageSmall: {
      width: 108,

      height: 108,
    },

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flexGrow: 1,

      minHeight: 614,

      paddingHorizontal: 26,

      paddingTop:
        Platform.OS === 'web'
          ? 115
          : 100,

      paddingBottom: 36,

      zIndex: 2,
    },

    bodyBackgroundSmall: {
      minHeight: 614,

      paddingHorizontal: 22,

      paddingTop: 82,

      paddingBottom: 28,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      backgroundColor:
        COLORS.white,

      borderRadius: 25,

      paddingHorizontal: 22,

      paddingTop: 17,

      paddingBottom: 23,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.06,

      shadowRadius: 5,

      elevation: 2,
    },

    cardSmall: {
      borderRadius: 23,

      paddingHorizontal: 20,

      paddingTop: 15,

      paddingBottom: 20,
    },

    // ========================================================
    // TABS
    // ========================================================

    tabs: {
      flexDirection:
        'row',

      marginBottom: 19,
    },

    activeTab: {
      flex: 1,

      height: 43,

      marginHorizontal: 7,

      borderRadius: 22,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    inactiveTab: {
      flex: 1,

      height: 43,

      marginHorizontal: 7,

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

      fontSize: 13,
    },

    inactiveTabText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 13,
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
        '#F5BABA',

      borderRadius: 8,

      backgroundColor:
        '#FDECEC',
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      lineHeight: 17,

      textAlign:
        'center',
    },

    // ========================================================
    // SUCCESS
    // ========================================================

    successContainer: {
      marginBottom: 15,

      paddingHorizontal: 12,

      paddingVertical: 9,

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

    successText: {
      flex: 1,

      color:
        COLORS.success,

      fontFamily:
        'Inter_500Medium',

      fontSize: 12,

      lineHeight: 17,

      textAlign:
        'center',
    },

    // ========================================================
    // FORM
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

    input: {
      height: 43,

      marginBottom: 14,

      paddingHorizontal: 15,

      borderWidth: 1,

      borderColor:
        COLORS.inputBorder,

      borderRadius: 22,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,

      outlineStyle:
        Platform.OS === 'web'
          ? 'none'
          : undefined,
    } as any,

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
        COLORS.success,
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
        COLORS.success,
    },

    passwordMatchTextError: {
      color:
        COLORS.redButton,
    },

    // ========================================================
    // TERMS
    // ========================================================

    agreementRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop: 15,

      paddingHorizontal: 4,
    },

    checkbox: {
      width: 15,

      height: 15,

      marginRight: 9,

      borderWidth: 1,

      borderColor:
        '#CCCCCC',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    checkboxChecked: {
      borderColor:
        COLORS.red,

      backgroundColor:
        COLORS.red,
    },

    agreementText: {
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    linkText: {
      color:
        COLORS.red,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    primaryButton: {
      height: 50,

      marginTop: 26,

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

      fontSize: 14.5,
    },
  });