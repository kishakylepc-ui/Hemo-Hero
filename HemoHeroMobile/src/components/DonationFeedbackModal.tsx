import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/theme';

import { FadeInView } from './Motion';

// ============================================================
// DONATION FEEDBACK / REPORT DIALOG
//
// Shared by the requester and donor screens.
//
// mode 'feedback' -> 1-5 stars + optional comment
// mode 'dispute'  -> required note ("this record isn't right")
//
// onSubmit throws on failure; the error is shown inside the
// dialog so nothing typed is lost.
// ============================================================

const COMMENT_LIMIT = 500;

const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

const RATING_LABELS = [
  '',
  'Poor',
  'Fair',
  'Good',
  'Great',
  'Excellent',
];

type Props = {
  visible: boolean;
  mode: 'feedback' | 'dispute';
  title: string;
  subtitle: string;
  initialRating?: number;
  initialComment?: string | null;
  // One-tap phrases added to the comment (feedback mode).
  quickNotes?: string[];
  onClose: () => void;
  onSubmit: (value: {
    rating: number;
    comment: string;
  }) => Promise<void>;
};

export default function DonationFeedbackModal({
  visible,
  mode,
  title,
  subtitle,
  initialRating = 0,
  initialComment = '',
  quickNotes = [],
  onClose,
  onSubmit,
}: Props) {
  const isDispute =
    mode === 'dispute';

  const [rating, setRating] =
    useState(initialRating);

  const [comment, setComment] =
    useState(initialComment || '');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  // Small pop on the star that was tapped.
  const pop =
    useRef(
      new Animated.Value(1)
    ).current;

  const [poppedStar, setPoppedStar] =
    useState(0);

  // Fresh values every time the dialog opens.
  useEffect(() => {
    if (!visible) {
      return;
    }

    setRating(initialRating);
    setComment(initialComment || '');
    setSaving(false);
    setError('');
  }, [visible]);

  function chooseRating(
    value: number
  ) {
    if (saving) {
      return;
    }

    setRating(value);
    setError('');
    setPoppedStar(value);

    pop.setValue(0.6);

    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver:
        USE_NATIVE_DRIVER,
    }).start();
  }

  function toggleQuickNote(
    note: string
  ) {
    if (saving) {
      return;
    }

    const sentence =
      `${note}.`;

    setComment(current => {
      if (
        current.includes(
          sentence
        )
      ) {
        return current
          .replace(
            sentence,
            ''
          )
          .replace(
            /\s{2,}/g,
            ' '
          )
          .trim();
      }

      const next =
        current.trim()
          ? `${current.trim()} ${sentence}`
          : sentence;

      return next.length <=
        COMMENT_LIMIT
        ? next
        : current;
    });
  }

  function handleClose() {
    if (saving) {
      return;
    }

    onClose();
  }

  async function handleSubmit() {
    if (saving) {
      return;
    }

    if (
      !isDispute &&
      rating < 1
    ) {
      setError(
        'Tap a star to rate this transaction.'
      );

      return;
    }

    if (
      isDispute &&
      comment.trim().length < 5
    ) {
      setError(
        'Please tell us what is wrong with this record.'
      );

      return;
    }

    try {
      setSaving(true);
      setError('');

      await onSubmit({
        rating,
        comment:
          comment.trim(),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Lifts the card above the keyboard while writing. */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.card}>
          <View
            style={[
              styles.icon,

              isDispute &&
                styles.iconDispute,
            ]}
          >
            <Ionicons
              name={
                isDispute
                  ? 'alert-circle'
                  : 'star-outline'
              }
              size={29}
              color={
                isDispute
                  ? COLORS.redButton
                  : COLORS.orange
              }
            />
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle}
          </Text>

          {/* STARS */}

          {!isDispute ? (
            <>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(
                  value => {
                    const filled =
                      value <= rating;

                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.7}
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityLabel={`${value} star${
                          value === 1
                            ? ''
                            : 's'
                        }`}
                        onPress={() =>
                          chooseRating(value)
                        }
                        style={styles.starButton}
                      >
                        <Animated.View
                          style={{
                            transform: [
                              {
                                scale:
                                  poppedStar ===
                                  value
                                    ? pop
                                    : 1,
                              },
                            ],
                          }}
                        >
                          <Ionicons
                            name={
                              filled
                                ? 'star'
                                : 'star-outline'
                            }
                            size={38}
                            color={
                              filled
                                ? '#F2A516'
                                : '#D9C3C3'
                            }
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <Text style={styles.ratingLabel}>
                {rating > 0
                  ? RATING_LABELS[rating]
                  : 'Tap a star'}
              </Text>

              {quickNotes.length > 0 ? (
                <View style={styles.quickNotes}>
                  {quickNotes.map(note => {
                    const active =
                      comment.includes(
                        `${note}.`
                      );

                    return (
                      <TouchableOpacity
                        key={note}
                        activeOpacity={0.8}
                        disabled={saving}
                        onPress={() =>
                          toggleQuickNote(note)
                        }
                        style={[
                          styles.quickNote,

                          active &&
                            styles.quickNoteActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            active
                              ? 'checkmark'
                              : 'add'
                          }
                          size={13}
                          color={
                            active
                              ? COLORS.white
                              : COLORS.redButton
                          }
                        />

                        <Text
                          style={[
                            styles.quickNoteText,

                            active &&
                              styles.quickNoteTextActive,
                          ]}
                        >
                          {note}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : null}

          {/* COMMENT */}

          <TextInput
            style={styles.input}
            editable={!saving}
            multiline
            maxLength={COMMENT_LIMIT}
            placeholder={
              isDispute
                ? 'What is wrong? e.g. I did not donate on this date.'
                : 'Add a comment (optional)'
            }
            placeholderTextColor={
              COLORS.lightMuted
            }
            value={comment}
            onChangeText={value => {
              setComment(value);
              setError('');
            }}
            textAlignVertical="top"
          />

          <Text style={styles.counter}>
            {comment.length}/{COMMENT_LIMIT}
          </Text>

          {error ? (
            <FadeInView
              key={error}
              offset={4}
              style={styles.error}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={COLORS.redButton}
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </FadeInView>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={saving}
              onPress={handleClose}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              onPress={handleSubmit}
              style={[
                styles.primaryButton,

                isDispute &&
                  styles.primaryButtonDispute,

                saving &&
                  styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Text style={styles.primaryText}>
                  {isDispute
                    ? 'Report Problem'
                    : 'Send Feedback'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },

  card: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },

  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.orangeLight,
  },

  iconDispute: {
    backgroundColor: COLORS.pinkLight,
  },

  title: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  starRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },

  starButton: {
    padding: 2,
  },

  ratingLabel: {
    marginTop: 4,
    color: COLORS.orange,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },

  quickNotes: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  quickNote: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0D6D6',
    backgroundColor: COLORS.white,
  },

  quickNoteActive: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  quickNoteText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  quickNoteTextActive: {
    color: COLORS.white,
  },

  input: {
    minHeight: 80,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.page,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  counter: {
    marginTop: 4,
    alignSelf: 'flex-end',
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },

  error: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  errorText: {
    flex: 1,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    lineHeight: 17,
  },

  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
  },

  secondaryButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#E7A6A6',
    backgroundColor: '#F2F2F4',
  },

  secondaryText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  primaryButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },

  primaryButtonDispute: {
    backgroundColor: COLORS.redButton,
  },

  primaryText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  disabled: {
    opacity: 0.6,
  },
});
