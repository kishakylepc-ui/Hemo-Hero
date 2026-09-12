import { useState } from 'react';

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
  useWindowDimensions,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerUser } from '../lib/api';
import { saveSession } from '../lib/session';

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

export default function SignUpScreen() {
  const { height } =
    useWindowDimensions();

  /*
    PRIMARY TARGET:
    iPhone 16 Pro = approximately 402 x 874

    iPhone 13 and other shorter phones
    get slightly tighter spacing.
  */
  const isSmallPhone =
    Platform.OS !== 'web' &&
    height <= 844;

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

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

  const [accepted, setAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

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
  // CREATE ACCOUNT
  // ==========================================================

  async function handleCreateAccount() {
    setErrorMessage('');

    const cleanEmail =
      email.trim().toLowerCase();

    // REQUIRED

    if (
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      const message =
        'Please complete all required fields.';

      setErrorMessage(message);

      showMessage(
        'Missing Information',
        message
      );

      return;
    }

    // EMAIL

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      const message =
        'Please enter a valid email address.';

      setErrorMessage(message);

      showMessage(
        'Invalid Email',
        message
      );

      return;
    }

    // PASSWORD LENGTH

    if (
      password.length < 8
    ) {
      const message =
        'Password must be at least 8 characters.';

      setErrorMessage(message);

      showMessage(
        'Invalid Password',
        message
      );

      return;
    }

    // PASSWORD REQUIREMENTS

    const hasLetter =
      /[A-Za-z]/.test(password);

    const hasNumber =
      /[0-9]/.test(password);

    if (
      !hasLetter ||
      !hasNumber
    ) {
      const message =
        'Password must contain at least one letter and one number.';

      setErrorMessage(message);

      showMessage(
        'Invalid Password',
        message
      );

      return;
    }

    // PASSWORD MATCH

    if (
      password !==
      confirmPassword
    ) {
      const message =
        'Passwords do not match.';

      setErrorMessage(message);

      showMessage(
        'Passwords Do Not Match',
        message
      );

      return;
    }

    // TERMS

    if (!accepted) {
      const message =
        'Please agree to the Terms of Service and Privacy Policy.';

      setErrorMessage(message);

      showMessage(
        'Agreement Required',
        message
      );

      return;
    }

    // API

    try {
      setLoading(true);

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

        showMessage(
          'Account Created',
          'Your Hemo-Hero account was created successfully.'
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
    } catch (error) {
      console.log(
        'REGISTER ERROR:',
        error
      );

      let message =
        'Unable to create your account. Please try again.';

      if (
        error instanceof Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(message);

      showMessage(
        'Sign Up Failed',
        message
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top']}
        >
          <StatusBar style="light" />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={
              Platform.OS === 'ios'
                ? 'padding'
                : undefined
            }
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={
                styles.scroll
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              bounces={false}
            >
              <View style={styles.authContent}>
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
                  </LinearGradient>
                </View>

                {/* ==================================================
                    LOGO
                ================================================== */}

                <View
                  style={[
                    styles.logoCircle,

                    isSmallPhone &&
                      styles.logoCircleSmall,
                  ]}
                >
                  <Image
                    source={require('../../assets/images/LifeLine (5).png')}
                    style={[
                      styles.logoImage,

                      isSmallPhone &&
                        styles.logoImageSmall,
                    ]}
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
                  style={[
                    styles.bodyBackground,

                    isSmallPhone &&
                      styles.bodyBackgroundSmall,
                  ]}
                >
                  {/* ================================================
                      CARD
                  ================================================ */}

                  <View
                    style={[
                      styles.card,

                      isSmallPhone &&
                        styles.cardSmall,
                    ]}
                  >
                    {/* TABS */}

                    <View style={styles.tabs}>
                      <TouchableOpacity
                        style={
                          styles.inactiveTab
                        }
                        activeOpacity={0.7}
                        disabled={loading}
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

                    {/* EMAIL */}

                    <Text
                      style={styles.label}
                    >
                      Email Address
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={
                        COLORS.placeholder
                      }
                      value={email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      editable={!loading}
                      onChangeText={value => {
                        setEmail(value);

                        if (
                          errorMessage
                        ) {
                          setErrorMessage('');
                        }
                      }}
                    />

                    {/* PASSWORD */}

                    <Text
                      style={styles.label}
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
                        value={password}
                        secureTextEntry={
                          !showPassword
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        editable={!loading}
                        onChangeText={value => {
                          setPassword(value);

                          if (
                            errorMessage
                          ) {
                            setErrorMessage('');
                          }
                        }}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={loading}
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
                        autoCorrect={false}
                        autoComplete="new-password"
                        editable={!loading}
                        returnKeyType="done"
                        onChangeText={value => {
                          setConfirmPassword(
                            value
                          );

                          if (
                            errorMessage
                          ) {
                            setErrorMessage('');
                          }
                        }}
                        onSubmitEditing={
                          handleCreateAccount
                        }
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={loading}
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

                    {/* TERMS */}

<View
  style={
    styles.agreementRow
  }
>
  <TouchableOpacity
    activeOpacity={0.7}
    disabled={loading}
    onPress={() =>
      setAccepted(
        current =>
          !current
      )
    }
  >
    <View
      style={[
        styles.checkbox,

        accepted &&
          styles.checkboxChecked,
      ]}
    >
      {accepted && (
        <MaterialIcons
          name="check"
          size={13}
          color={
            COLORS.white
          }
        />
      )}
    </View>
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

                    {/* CREATE ACCOUNT */}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,

                        loading &&
                          styles.disabledButton,
                      ]}
                      activeOpacity={0.85}
                      disabled={loading}
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ==========================================================
  // DESKTOP
  // ==========================================================

  desktopBackground: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      Platform.OS === 'web'
        ? '#1E1E1E'
        : COLORS.pinkBottom,
  },

  // ==========================================================
  // PHONE
  // ==========================================================

  phone: {
    width:
      Platform.OS === 'web'
        ? 402
        : '100%',

    height:
      Platform.OS === 'web'
        ? 874
        : '100%',

    maxWidth: '100%',

    overflow: 'hidden',

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

    position: 'relative',

    backgroundColor:
      COLORS.pinkTop,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  headerWrapper: {
    backgroundColor:
      COLORS.pinkTop,

    zIndex: 1,
  },

  header: {
    height: 260,

    alignItems: 'center',

    paddingTop: 55,

    borderBottomLeftRadius: 62,
    borderBottomRightRadius: 62,

    overflow: 'hidden',
  },

  headerSmall: {
    height: 230,

    paddingTop: 38,

    borderBottomLeftRadius: 54,
    borderBottomRightRadius: 54,
  },

  headerCircleLeft: {
    position: 'absolute',

    width: 180,
    height: 180,

    borderRadius: 90,

    left: -100,
    top: -50,

    backgroundColor:
      'rgba(255,255,255,0.07)',
  },

  headerCircleRight: {
    position: 'absolute',

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

    fontSize: 12,
  },

  // ==========================================================
  // LOGO
  // ==========================================================

  logoCircle: {
    position: 'absolute',

    top: 186,

    alignSelf: 'center',

    width: 148,
    height: 148,

    borderRadius: 74,

    backgroundColor:
      COLORS.white,

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',

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

  // ==========================================================
  // BODY
  // ==========================================================

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

  // ==========================================================
  // CARD
  // ==========================================================

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

  // ==========================================================
  // TABS
  // ==========================================================

  tabs: {
    flexDirection: 'row',

    marginBottom: 19,
  },

  activeTab: {
    flex: 1,

    height: 43,

    marginHorizontal: 7,

    borderRadius: 22,

    backgroundColor:
      COLORS.redButton,

    alignItems: 'center',
    justifyContent: 'center',
  },

  inactiveTab: {
    flex: 1,

    height: 43,

    marginHorizontal: 7,

    alignItems: 'center',
    justifyContent: 'center',
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

  // ==========================================================
  // ERROR
  // ==========================================================

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

    fontSize: 10,

    lineHeight: 15,

    textAlign: 'center',
  },

  // ==========================================================
  // FORM
  // ==========================================================

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

    fontSize: 12,

    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

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

  showText: {
    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 11,
  },

  // ==========================================================
  // TERMS
  // ==========================================================

  agreementRow: {
    flexDirection: 'row',

    alignItems: 'flex-start',

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

  alignItems: 'center',
  justifyContent: 'center',
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

    fontSize: 9,

    lineHeight: 14,
  },

  linkText: {
    color:
      COLORS.red,
  },

  // ==========================================================
  // BUTTON
  // ==========================================================

  primaryButton: {
    height: 50,

    marginTop: 26,

    borderRadius: 7,

    backgroundColor:
      COLORS.redButton,

    alignItems: 'center',
    justifyContent: 'center',
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
});