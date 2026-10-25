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

import type {
  RequestReportReason,
} from '../lib/donorRequests';

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  page: '#FFF8F8',
  muted: '#666666',
  lightMuted: '#9A9A9A',
  cardBorder: '#E8DADA',
  pinkLight: '#FFF1F1',
  overlay: 'rgba(0,0,0,0.45)',
};

// ============================================================
// REPORT REQUEST SHEET
//
// A donor reports a blood request that looks false. Several
// separate reports hide it from nearby donors until Hemo-Hero
// reviews it.
// ============================================================

const REASONS: {
  value: RequestReportReason;
  title: string;
  subtitle: string;
}[] = [
  {
    value: 'False request',
    title: 'Fake or not a real need',
    subtitle: 'The request or the patient doesn’t seem real',
  },
  {
    value: 'Asking for payment',
    title: 'Asking for money',
    subtitle: 'Payment for blood or “processing” fees',
  },
  {
    value: 'Misleading information',
    title: 'Wrong details',
    subtitle: 'Wrong place, blood type, or facts',
  },
  {
    value: 'Other',
    title: 'Something else',
    subtitle: 'Tell us in the details',
  },
];

const DETAILS_LIMIT = 1000;

export default function ReportRequestSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  // Throws with a readable message on failure.
  onSubmit: (value: {
    reason: RequestReportReason;
    details: string;
  }) => Promise<void>;
}) {
  const insets =
    useSafeAreaInsets();

  const [reason, setReason] =
    useState<RequestReportReason | null>(
      null
    );

  const [details, setDetails] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  // Fresh values each time it opens.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
      setSaving(false);
      setError('');
    }
  }, [visible]);

  function close() {
    if (!saving) {
      onClose();
    }
  }

  async function submit() {
    if (
      !reason ||
      saving
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await onSubmit({
        reason,
        details:
          details.trim(),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to send your report. Please try again.'
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
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="flag-outline"
                  size={22}
                  color={COLORS.redButton}
                />
              </View>

              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Report This Request
                </Text>

                <Text style={styles.subtitle}>
                  Hemo-Hero reviews every report.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.close}
                disabled={saving}
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

            <View
              accessibilityRole="radiogroup"
              style={styles.reasons}
            >
              {REASONS.map(item => {
                const selected =
                  reason ===
                  item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selected,
                    }}
                    disabled={saving}
                    activeOpacity={0.8}
                    style={[
                      styles.reason,

                      selected &&
                        styles.reasonSelected,
                    ]}
                    onPress={() =>
                      setReason(
                        item.value
                      )
                    }
                  >
                    <Ionicons
                      name={
                        selected
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={20}
                      color={
                        selected
                          ? COLORS.redButton
                          : COLORS.lightMuted
                      }
                    />

                    <View style={styles.reasonBody}>
                      <Text style={styles.reasonTitle}>
                        {item.title}
                      </Text>

                      <Text style={styles.reasonSubtitle}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>
              Details{' '}
              <Text style={styles.optional}>
                (optional)
              </Text>
            </Text>

            <TextInput
              style={styles.input}
              value={details}
              editable={!saving}
              multiline
              maxLength={DETAILS_LIMIT}
              placeholder="What made you think this request isn't real?"
              placeholderTextColor={COLORS.lightMuted}
              textAlignVertical="top"
              onChangeText={setDetails}
            />

            <View style={styles.info}>
              <Ionicons
                name="eye-off-outline"
                size={16}
                color={COLORS.muted}
              />

              <Text style={styles.infoText}>
                The requester won’t see who reported it. After several reports, it’s hidden from donors until reviewed.
              </Text>
            </View>

            {error ? (
              <FadeInView
                key={error}
                offset={4}
                style={styles.error}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={COLORS.redButton}
                />

                <Text style={styles.errorText}>
                  {error}
                </Text>
              </FadeInView>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.secondary}
                disabled={saving}
                activeOpacity={0.8}
                onPress={close}
              >
                <Text style={styles.secondaryText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primary,

                  (!reason ||
                    saving) &&
                    styles.disabled,
                ]}
                disabled={
                  !reason ||
                  saving
                }
                activeOpacity={0.85}
                onPress={submit}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />
                ) : (
                  <Text style={styles.primaryText}>
                    Send Report
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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

  reasons: {
    marginBottom: 16,
    gap: 8,
  },

  reason: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  reasonSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: '#FFF6F6',
  },

  reasonBody: {
    flex: 1,
    minWidth: 0,
  },

  reasonTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  reasonSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  label: {
    marginBottom: 8,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  optional: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
  },

  input: {
    minHeight: 84,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: '#FFFCFC',
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  info: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },

  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
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
    lineHeight: 18,
  },

  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },

  secondary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#F0D6D6',
    backgroundColor: '#F2F2F4',
  },

  secondaryText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  primary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.redButton,
  },

  primaryText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  disabled: {
    opacity: 0.45,
  },
});
