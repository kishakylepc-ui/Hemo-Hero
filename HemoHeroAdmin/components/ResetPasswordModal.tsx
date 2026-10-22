import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import {
  AdminApiError,
  requestAdminPasswordReset,
  resetAdminPassword,
  verifyAdminRecoveryCode,
} from '../lib/api';

// ============================================================
// RESET PASSWORD (Forgot Password on the sign-in screen)
//
// 1. Email: the server emails a 6-digit code.
// 2. Code: checked by the server (10 minutes, 5 tries, one use;
//    Resend after 60 seconds).
// 3. New password, with the rules shown while typing. The reset
//    signs the account out everywhere.
// ============================================================

const COLORS = {
  card: '#0B142A',
  cardLight: '#101A35',
  input: '#152543',
  border: '#243554',
  white: '#FFFFFF',
  muted: '#7F889F',
  soft: '#B7C1D8',
  red: '#DB0A0A',
  redBright: '#EF3340',
  error: '#FF727C',
  green: '#35C982',
};

const RESEND_SECONDS = 60;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rules as the server (validatePassword).
const PASSWORD_RULES: {
  label: string;
  test: (value: string) => boolean;
}[] = [
  {
    label: 'At least 8 characters',
    test: value => value.length >= 8,
  },
  {
    label: 'One uppercase letter',
    test: value => /[A-Z]/.test(value),
  },
  {
    label: 'One lowercase letter',
    test: value => /[a-z]/.test(value),
  },
  {
    label: 'One number',
    test: value => /[0-9]/.test(value),
  },
  {
    label: 'One special character',
    test: value => /[^A-Za-z0-9]/.test(value),
  },
];

type Step = 'email' | 'code' | 'password';

export default function ResetPasswordModal({
  visible,
  scale,
  fontScale,
  initialEmail,
  onClose,
  onDone,
}: {
  visible: boolean;
  scale: number;
  fontScale: number;
  // What was typed on the sign-in screen (used if it's an email).
  initialEmail: string;
  onClose: () => void;
  // The password changed; the message for the sign-in screen.
  onDone: (message: string) => void;
}) {
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [showPassword, setShowPassword] =
    useState(false);

  const [recoveryToken, setRecoveryToken] =
    useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [resendSeconds, setResendSeconds] =
    useState(0);

  // Fresh each time it opens.
  useEffect(() => {
    if (!visible) {
      return;
    }

    const typed = initialEmail
      .trim()
      .toLowerCase();

    setStep('email');
    setEmail(
      typed.includes('@') ? typed : ''
    );
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setRecoveryToken('');
    setBusy(false);
    setError('');
    setNotice('');
  }, [visible, initialEmail]);

  // Counts down to when a new code may be sent.
  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setTimeout(
      () =>
        setResendSeconds(current =>
          Math.max(0, current - 1)
        ),
      1000
    );

    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const cleanEmail = email
    .trim()
    .toLowerCase();

  const rulesMet = PASSWORD_RULES.map(rule =>
    rule.test(password)
  );

  const passwordValid = rulesMet.every(Boolean);

  const passwordsMatch =
    Boolean(confirmPassword) &&
    password === confirmPassword;

  // ==========================================================
  // STEP 1 + RESEND: SEND A CODE
  // ==========================================================

  async function sendCode() {
    if (busy) {
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError(
        'Enter the email address of your administrator account.'
      );

      return;
    }

    try {
      setBusy(true);
      setError('');

      await requestAdminPasswordReset(
        cleanEmail
      );

      setCode('');
      setNotice(
        `If ${cleanEmail} has an account, a 6-digit code is on its way. Codes sent earlier no longer work.`
      );
      setResendSeconds(RESEND_SECONDS);
      setStep('code');
    } catch (sendError) {
      // A code went out less than a minute ago and still works.
      if (
        sendError instanceof AdminApiError &&
        sendError.code === 'OTP_RESEND_COOLDOWN'
      ) {
        setResendSeconds(
          Number(
            sendError.data
              ?.retry_after_seconds
          ) || RESEND_SECONDS
        );

        if (step === 'email') {
          setNotice(
            'A code was sent to this email less than a minute ago. Enter it below.'
          );
          setStep('code');

          return;
        }
      }

      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send the code.'
      );
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================
  // STEP 2: CHECK THE CODE
  // ==========================================================

  async function checkCode() {
    if (busy) {
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Enter the 6-digit code from the email.'
      );

      return;
    }

    try {
      setBusy(true);
      setError('');

      const result =
        await verifyAdminRecoveryCode(
          cleanEmail,
          code
        );

      setRecoveryToken(
        result.recovery_token
      );

      setNotice('');
      setStep('password');
    } catch (verifyError) {
      // Used up or too old: a new code is needed.
      if (
        verifyError instanceof AdminApiError &&
        (verifyError.code ===
          'OTP_TOO_MANY_ATTEMPTS' ||
          verifyError.code ===
            'OTP_EXPIRED')
      ) {
        setCode('');
      }

      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'Unable to check the code.'
      );
    } finally {
      setBusy(false);
    }
  }

  // ==========================================================
  // STEP 3: NEW PASSWORD
  // ==========================================================

  async function changePassword() {
    if (busy) {
      return;
    }

    if (!passwordValid) {
      setError(
        'The new password doesn\'t meet all the rules yet.'
      );

      return;
    }

    if (!passwordsMatch) {
      setError('The passwords don\'t match.');

      return;
    }

    try {
      setBusy(true);
      setError('');

      await resetAdminPassword(
        recoveryToken,
        password,
        confirmPassword
      );

      onDone(
        'Password changed. Sign in with your new password.'
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to change the password.'
      );
    } finally {
      setBusy(false);
    }
  }

  const primary = {
    email: {
      label: 'Send Code',
      onPress: sendCode,
    },
    code: {
      label: 'Verify Code',
      onPress: checkCode,
    },
    password: {
      label: 'Change Password',
      onPress: changePassword,
    },
  }[step];

  const subtitle = {
    email:
      'Enter your administrator email. We will send a 6-digit code to it.',
    code: `Enter the 6-digit code sent to ${cleanEmail}.`,
    password:
      'Choose a new password. Every device signed in to this account will be signed out.',
  }[step];

  const inputStyle = [
    styles.input,

    {
      height: 50 * scale,
      borderRadius: 11 * scale,
      paddingHorizontal: 15 * scale,
      fontSize: 14 * fontScale,
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'landscape',
      ]}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={busy}
          onPress={onClose}
        />

        <View
          style={[
            styles.card,

            {
              width: 500 * scale,
              padding: 26 * scale,
              borderRadius: 18 * scale,
            },
          ]}
        >
          {/* HEADER + STEPS */}

          <View
            style={[
              styles.row,

              {
                gap: 12 * scale,
                marginBottom: 18 * scale,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,

                {
                  width: 44 * scale,
                  height: 44 * scale,
                  borderRadius: 11 * scale,
                },
              ]}
            >
              <MaterialIcons
                name="lock-reset"
                size={23 * scale}
                color={COLORS.redBright}
              />
            </View>

            <View style={styles.flexFill}>
              <Text
                style={[
                  styles.title,

                  {
                    fontSize: 19 * fontScale,
                  },
                ]}
              >
                Reset Password
              </Text>

              <Text
                style={[
                  styles.subtitle,

                  {
                    fontSize: 12.5 * fontScale,
                    lineHeight: 18 * fontScale,
                    marginTop: 2 * scale,
                  },
                ]}
              >
                {subtitle}
              </Text>
            </View>

            <Pressable
              disabled={busy}
              hitSlop={8}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <MaterialIcons
                name="close"
                size={22 * scale}
                color={COLORS.muted}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.row,

              {
                gap: 6 * scale,
                marginBottom: 18 * scale,
              },
            ]}
          >
            {(['email', 'code', 'password'] as Step[]).map(
              (name, index, list) => (
                <View
                  key={name}
                  style={[
                    styles.stepBar,

                    {
                      height: 4 * scale,
                      borderRadius: 2 * scale,
                    },

                    list.indexOf(step) >= index &&
                      styles.stepBarDone,
                  ]}
                />
              )
            )}
          </View>

          {notice ? (
            <View
              style={[
                styles.notice,

                {
                  padding: 12 * scale,
                  borderRadius: 10 * scale,
                  gap: 8 * scale,
                  marginBottom: 14 * scale,
                },
              ]}
            >
              <MaterialIcons
                name="mark-email-read"
                size={18 * scale}
                color={COLORS.green}
              />

              <Text
                style={[
                  styles.noticeText,

                  {
                    fontSize: 12.5 * fontScale,
                  },
                ]}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          {/* STEP 1 */}

          {step === 'email' ? (
            <TextInput
              value={email}
              onChangeText={value => {
                setEmail(value);
                setError('');
              }}
              placeholder="name@organization.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!busy}
              returnKeyType="send"
              onSubmitEditing={sendCode}
              style={inputStyle}
            />
          ) : null}

          {/* STEP 2 */}

          {step === 'code' ? (
            <>
              <TextInput
                value={code}
                onChangeText={value => {
                  setCode(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  );
                  setError('');
                }}
                placeholder="6-digit code"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={checkCode}
                style={[
                  inputStyle,
                  styles.codeInput,

                  // Spaced digits (not the placeholder).
                  code
                    ? styles.codeSpacing
                    : null,
                ]}
              />

              <View
                style={[
                  styles.linkRow,

                  {
                    marginTop: 12 * scale,
                  },
                ]}
              >
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setStep('email');
                    setNotice('');
                    setError('');
                  }}
                >
                  <Text
                    style={[
                      styles.link,

                      {
                        fontSize: 12.5 * fontScale,
                      },
                    ]}
                  >
                    Use a different email
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    busy ||
                    resendSeconds > 0
                  }
                  onPress={sendCode}
                >
                  <Text
                    style={[
                      styles.link,

                      resendSeconds > 0 &&
                        styles.linkWaiting,

                      {
                        fontSize: 12.5 * fontScale,
                      },
                    ]}
                  >
                    {resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : 'Resend Code'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* STEP 3 */}

          {step === 'password' ? (
            <>
              <View
                style={[
                  styles.passwordBox,

                  {
                    height: 50 * scale,
                    borderRadius: 11 * scale,
                  },
                ]}
              >
                <TextInput
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    setError('');
                  }}
                  placeholder="New password"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!busy}
                  style={[
                    styles.passwordInput,

                    {
                      paddingHorizontal: 15 * scale,
                      fontSize: 14 * fontScale,
                    },
                  ]}
                />

                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    setShowPassword(
                      current => !current
                    )
                  }
                  accessibilityLabel={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  style={{
                    paddingHorizontal: 14 * scale,
                  }}
                >
                  <MaterialIcons
                    name={
                      showPassword
                        ? 'visibility'
                        : 'visibility-off'
                    }
                    size={21 * scale}
                    color={COLORS.muted}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  styles.rules,

                  {
                    marginTop: 10 * scale,
                    marginBottom: 12 * scale,
                    rowGap: 5 * scale,
                  },
                ]}
              >
                {PASSWORD_RULES.map((rule, index) => (
                  <View
                    key={rule.label}
                    style={[
                      styles.rule,

                      {
                        gap: 6 * scale,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        rulesMet[index]
                          ? 'check-circle'
                          : 'radio-button-unchecked'
                      }
                      size={15 * scale}
                      color={
                        rulesMet[index]
                          ? COLORS.green
                          : COLORS.muted
                      }
                    />

                    <Text
                      style={[
                        styles.ruleText,

                        rulesMet[index] &&
                          styles.ruleMet,

                        {
                          fontSize: 12 * fontScale,
                        },
                      ]}
                    >
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TextInput
                value={confirmPassword}
                onChangeText={value => {
                  setConfirmPassword(value);
                  setError('');
                }}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={changePassword}
                style={inputStyle}
              />

              {confirmPassword ? (
                <Text
                  style={[
                    passwordsMatch
                      ? styles.matchText
                      : styles.mismatchText,

                    {
                      fontSize: 12 * fontScale,
                      marginTop: 6 * scale,
                    },
                  ]}
                >
                  {passwordsMatch
                    ? 'Passwords match.'
                    : 'Passwords don\'t match yet.'}
                </Text>
              ) : null}
            </>
          ) : null}

          {/* ERROR */}

          {error ? (
            <View
              style={[
                styles.errorBox,

                {
                  padding: 12 * scale,
                  borderRadius: 10 * scale,
                  gap: 8 * scale,
                  marginTop: 14 * scale,
                },
              ]}
            >
              <MaterialIcons
                name="error-outline"
                size={18 * scale}
                color={COLORS.error}
              />

              <Text
                style={[
                  styles.errorText,

                  {
                    fontSize: 12.5 * fontScale,
                  },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* BUTTONS */}

          <View
            style={[
              styles.row,

              {
                gap: 10 * scale,
                marginTop: 20 * scale,
              },
            ]}
          >
            <Pressable
              disabled={busy}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                },

                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.cancelText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={busy}
              onPress={primary.onPress}
              style={({ pressed }) => [
                styles.primaryButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                },

                busy && styles.disabled,

                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={[
                    styles.primaryText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  {primary.label}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,4,10,0.78)',
  },

  card: {
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 18,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  flexFill: {
    flex: 1,
  },

  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(219,10,10,0.12)',
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  subtitle: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
  },

  stepBar: {
    flex: 1,
    backgroundColor: COLORS.border,
  },

  stepBarDone: {
    backgroundColor: COLORS.redBright,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(53,201,130,0.28)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  noticeText: {
    flex: 1,
    color: COLORS.green,
    fontFamily: 'Inter_500Medium',
  },

  input: {
    borderWidth: 1,
    borderColor: 'rgba(133,154,203,0.28)',
    backgroundColor: COLORS.input,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,

  codeInput: {
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },

  codeSpacing: {
    letterSpacing: 8,
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  link: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  linkWaiting: {
    color: COLORS.muted,
  },

  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(133,154,203,0.28)',
    backgroundColor: COLORS.input,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,

  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
  },

  rule: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ruleText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  ruleMet: {
    color: COLORS.green,
  },

  matchText: {
    color: COLORS.green,
    fontFamily: 'Inter_500Medium',
  },

  mismatchText: {
    color: COLORS.error,
    fontFamily: 'Inter_500Medium',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,114,124,0.24)',
    backgroundColor: 'rgba(255,114,124,0.10)',
  },

  errorText: {
    flex: 1,
    color: COLORS.error,
    fontFamily: 'Inter_400Regular',
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  cancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  primaryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  disabled: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.82,
  },
});
