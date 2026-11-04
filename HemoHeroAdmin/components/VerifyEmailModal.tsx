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
  resendAdminVerification,
  verifyAdminEmail,
  type AdminEmailVerification,
} from '../lib/api';

// =======================================================
// VERIFY EMAIL (first sign-in)
//
// An account made by an administrator hasn't confirmed its
// email yet. The right password emails a 6-digit code; the
// right code finishes signing in. The server checks it (10
// minutes, 5 tries, one use; Resend after 60 seconds).
// =======================================================

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

export default function VerifyEmailModal({
  visible,
  scale,
  fontScale,
  email,
  codeSent,
  onClose,
  onVerified,
}: {
  visible: boolean;
  scale: number;
  fontScale: number;
  email: string;
  // False when the server couldn't send the first code.
  codeSent: boolean;
  onClose: () => void;
  onVerified: (
    result: AdminEmailVerification
  ) => void;
}) {
  const [code, setCode] = useState('');
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

    setCode('');
    setBusy(false);
    setError(
      codeSent
        ? ''
        : 'We could not send a code just now. Tap Resend Code to try again.'
    );
    setNotice(
      codeSent
        ? 'We emailed you a 6-digit code.'
        : ''
    );
    setResendSeconds(
      codeSent
        ? RESEND_SECONDS
        : 0
    );
  }, [visible, codeSent]);

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

  async function checkCode() {
    if (busy) {
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Enter the 6-digit code from your email.'
      );

      return;
    }

    try {
      setBusy(true);
      setError('');
      setNotice('');

      onVerified(
        await verifyAdminEmail(
          email,
          code
        )
      );
    } catch (checkError) {
      setCode('');

      setError(
        checkError instanceof Error
          ? checkError.message
          : 'Unable to verify your email.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (
      busy ||
      resendSeconds > 0
    ) {
      return;
    }

    try {
      setBusy(true);
      setError('');

      await resendAdminVerification(
        email
      );

      setCode('');
      setNotice(
        'We emailed you a new 6-digit code.'
      );
      setResendSeconds(RESEND_SECONDS);
    } catch (sendError) {
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
      }

      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send a new code.'
      );
    } finally {
      setBusy(false);
    }
  }

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
                name="mark-email-unread"
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
                Verify Your Email
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
                {`Your first sign-in needs the code sent to ${email}.`}
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
            autoFocus
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={checkCode}
            style={[
              styles.input,

              {
                height: 50 * scale,
                borderRadius: 11 * scale,
                paddingHorizontal: 15 * scale,
                fontSize: 14 * fontScale,
              },

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
              disabled={
                busy ||
                resendSeconds > 0
              }
              onPress={resendCode}
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
              onPress={checkCode}
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
                  Verify and Sign In
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
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    outlineStyle: 'none',
  } as any,

  codeSpacing: {
    letterSpacing: 8,
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  link: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  linkWaiting: {
    color: COLORS.muted,
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
