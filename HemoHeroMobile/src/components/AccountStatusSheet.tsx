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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  FadeInView,
} from './Motion';

import {
  ApiError,
  requestAccountReview,
  type AccountDeactivation,
  type AccountRemoval,
  type AccountReviewStatus,
} from '../lib/api';

// ============================================================
// ACCOUNT STATUS SHEET (sign in)
//
// Shown instead of a plain error when the account can't sign
// in because Hemo-Hero deactivated or removed it: when, the
// reason the admin gave, and for a deactivated account a way
// to ask for a review (one open request at a time). A review
// needs the token sign-in returned once the password was
// confirmed.
// ============================================================

const COLORS = {
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  muted: '#666666',
  lightMuted: '#9A9A9A',
  cardBorder: '#E8DADA',
  pinkLight: '#FFF1F1',
  orange: '#B4570F',
  orangeLight: '#FFF3E6',
  grey: '#F7F2F2',
  overlay: 'rgba(0,0,0,0.45)',
};

const MIN_MESSAGE_LENGTH = 10;

const MAX_MESSAGE_LENGTH = 1000;

export type AccountStatus =
  | {
      kind: 'deactivated';
      deactivation: AccountDeactivation;
      review: AccountReviewStatus | null;
      reviewToken: string;
    }
  | {
      kind: 'removed';
      removal: AccountRemoval;
    };

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AccountStatusSheet({
  status,
  onClose,
}: {
  status: AccountStatus | null;
  onClose: () => void;
}) {
  const insets =
    useSafeAreaInsets();

  const [message, setMessage] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState('');

  // Updated after sending, so the sheet shows "sent".
  const [review, setReview] =
    useState<AccountReviewStatus | null>(null);

  useEffect(() => {
    setMessage('');
    setError('');
    setSending(false);
    setReview(
      status?.kind === 'deactivated'
        ? status.review
        : null
    );
  }, [status]);

  function close() {
    if (!sending) {
      onClose();
    }
  }

  async function sendRequest() {
    if (
      status?.kind !== 'deactivated' ||
      sending ||
      message.trim().length <
        MIN_MESSAGE_LENGTH
    ) {
      return;
    }

    try {
      setSending(true);
      setError('');

      const result =
        await requestAccountReview(
          status.reviewToken,
          message
        );

      setReview(result.review);
      setMessage('');
    } catch (requestError) {
      // Already waiting: show it instead of an error.
      if (
        requestError instanceof ApiError &&
        requestError.data?.code ===
          'REVIEW_PENDING' &&
        requestError.data?.review
      ) {
        setReview(
          requestError.data.review
        );

        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to send your request. Please try again.'
      );
    } finally {
      setSending(false);
    }
  }

  if (!status) {
    return null;
  }

  const deactivated =
    status.kind === 'deactivated';

  const since =
    deactivated
      ? formatDate(
          status.deactivation
            .deactivated_at
        )
      : formatDate(
          status.removal.removed_at
        );

  const reason =
    deactivated
      ? status.deactivation.reason
      : status.removal.reason;

  const bySelf =
    deactivated &&
    status.deactivation.by_self;

  const pending =
    review?.status === 'pending';

  const canSend =
    message.trim().length >=
      MIN_MESSAGE_LENGTH &&
    !sending;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
        />

        <FadeInView
          offset={40}
          style={[
            styles.sheet,
            {
              paddingBottom:
                Math.max(insets.bottom, 14) + 6,
            },
          ]}
        >
          <View style={styles.handle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HEADER */}

            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name={
                    deactivated
                      ? 'person-remove-outline'
                      : 'trash-outline'
                  }
                  size={22}
                  color={COLORS.redButton}
                />
              </View>

              <View style={styles.headerText}>
                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  {deactivated
                    ? 'Your account is deactivated'
                    : 'This account was removed'}
                </Text>

                {since ? (
                  <Text style={styles.subtitle}>
                    {deactivated
                      ? `Since ${since}`
                      : `Removed ${since}`}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.close}
                disabled={sending}
                accessibilityLabel="Close"
                onPress={close}
              >
                <Ionicons
                  name="close"
                  size={17}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* WHY */}

            <View style={styles.reasonBox}>
              {bySelf ? (
                <Text style={styles.reasonText}>
                  You deactivated your account. To use it again, ask Hemo-Hero to reactivate it below.
                </Text>
              ) : (
                <>
                  <Text style={styles.reasonLabel}>
                    Reason from Hemo-Hero
                  </Text>

                  <Text style={styles.reasonText}>
                    {reason ||
                      'No reason was recorded.'}
                  </Text>
                </>
              )}
            </View>

            {!deactivated ? (
              <Text style={styles.note}>
                The account and its data were deleted, so it can't be restored.
              </Text>
            ) : pending && review ? (
              // ALREADY ASKED
              <View style={styles.pendingBox}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.orange}
                />

                <Text style={styles.pendingText}>
                  Your review request was sent {formatDate(review.created_at)}. An admin will look at it. Try signing in again later to see the answer.
                </Text>
              </View>
            ) : (
              // ASK FOR A REVIEW
              <>
                {review?.status === 'declined' ? (
                  <View style={styles.declinedBox}>
                    <Text style={styles.declinedTitle}>
                      Your last request was declined {formatDate(review.reviewed_at)}
                    </Text>

                    {review.admin_note ? (
                      <Text style={styles.declinedText}>
                        {review.admin_note}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <Text style={styles.label}>
                  Ask for a review
                </Text>

                <TextInput
                  value={message}
                  onChangeText={value => {
                    setMessage(value);
                    setError('');
                  }}
                  editable={!sending}
                  multiline
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Tell Hemo-Hero why your account should be reactivated."
                  placeholderTextColor={COLORS.lightMuted}
                  accessibilityLabel="Your message to Hemo-Hero"
                  style={styles.input}
                />

                <Text style={styles.counter}>
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </Text>

                {error ? (
                  <Text
                    style={styles.error}
                    accessibilityLiveRegion="polite"
                  >
                    {error}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !canSend &&
                      styles.sendButtonDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={!canSend}
                  onPress={sendRequest}
                >
                  {sending ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.white}
                    />
                  ) : (
                    <Text style={styles.sendText}>
                      Send Request
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </FadeInView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },

  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.white,
  },

  handle: {
    width: 36,
    height: 5,
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#E6DADA',
  },

  headerRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },

  subtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F4',
  },

  reasonBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.grey,
  },

  reasonLabel: {
    marginBottom: 4,
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  reasonText: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },

  note: {
    marginTop: 12,
    marginBottom: 8,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  pendingBox: {
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    backgroundColor: COLORS.orangeLight,
  },

  pendingText: {
    flex: 1,
    color: '#6B3A0C',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },

  declinedBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  declinedTitle: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  declinedText: {
    marginTop: 4,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },

  label: {
    marginTop: 18,
    marginBottom: 8,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  input: {
    minHeight: 96,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as object)
      : null),
  },

  counter: {
    marginTop: 6,
    alignSelf: 'flex-end',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },

  error: {
    marginTop: 6,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  sendButton: {
    height: 50,
    marginTop: 14,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.redButton,
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
});
