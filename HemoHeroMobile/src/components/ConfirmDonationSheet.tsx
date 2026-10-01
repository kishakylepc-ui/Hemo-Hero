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

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  FadeInView,
} from './Motion';

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  tileBorder: '#F0D6D6',

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  star: '#F2A516',

  overlay: 'rgba(0,0,0,0.45)',
};

// ============================================================
// CONFIRM DONATION SHEET
//
// The requester confirms an accepted donor's donation: how many
// bags and which day. Recording it saves the transaction to both
// histories. Same rules as the request page: bags up to what the
// request needs, and no day before the request was posted.
// ============================================================

const DAY_MS =
  24 * 60 * 60 * 1000;

const NOTE_LIMIT = 500;

const DAY_OPTIONS = [
  {
    offset: 0,
    label: 'Today',
  },
  {
    offset: 1,
    label: 'Yesterday',
  },
  {
    offset: 2,
    label: '2 days ago',
  },
];

function startOfDay(
  value: number
) {
  const date =
    new Date(value);

  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

export default function ConfirmDonationSheet({
  visible,
  donorName,
  bloodType,
  unitsNeeded,
  requestCreatedAt,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  donorName: string;
  bloodType: string;
  unitsNeeded: number;
  requestCreatedAt?: string | null;
  onClose: () => void;
  // Throws with a readable message on failure.
  onSubmit: (value: {
    units: number;
    donatedAt: string;
    note: string | null;
  }) => Promise<void>;
}) {
  const insets =
    useSafeAreaInsets();

  const [units, setUnits] =
    useState(1);

  const [dayOffset, setDayOffset] =
    useState(0);

  const [note, setNote] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  // Fresh values each time it opens.
  useEffect(() => {
    if (visible) {
      setUnits(1);
      setDayOffset(0);
      setNote('');
      setSaving(false);
      setError('');
    }
  }, [visible]);

  const maxUnits =
    Math.max(
      1,
      Math.min(
        20,
        Number(unitsNeeded) || 1
      )
    );

  const postedDay =
    startOfDay(
      requestCreatedAt
        ? new Date(
            requestCreatedAt
          ).getTime()
        : Date.now()
    );

  const dayOptions =
    DAY_OPTIONS.filter(
      option =>
        option.offset === 0 ||
        startOfDay(
          Date.now() -
            option.offset * DAY_MS
        ) >= postedDay
    );

  function close() {
    if (!saving) {
      onClose();
    }
  }

  async function submit() {
    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      await onSubmit({
        units,
        donatedAt: new Date(
          Date.now() -
            dayOffset * DAY_MS
        ).toISOString(),
        note:
          note.trim() || null,
      });
    } catch (submitError) {
      // Stay open so nothing typed is lost.
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to confirm the donation. Please try again.'
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
                <MaterialIcons
                  name="task-alt"
                  size={22}
                  color={COLORS.green}
                />
              </View>

              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Confirm Donation
                </Text>

                <Text style={styles.subtitle}>
                  Did {donorName} donate {bloodType} blood?
                </Text>
              </View>

              <TouchableOpacity
                style={styles.close}
                disabled={saving}
                accessibilityLabel="Close"
                onPress={close}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* BAGS */}

            <View style={styles.row}>
              <Text style={styles.label}>
                Bags donated
              </Text>

              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,

                    units <= 1 &&
                      styles.disabled,
                  ]}
                  disabled={
                    units <= 1 ||
                    saving
                  }
                  accessibilityLabel="Fewer bags"
                  onPress={() =>
                    setUnits(value =>
                      Math.max(1, value - 1)
                    )
                  }
                >
                  <MaterialIcons
                    name="remove"
                    size={19}
                    color={COLORS.redButton}
                  />
                </TouchableOpacity>

                <Text style={styles.stepperValue}>
                  {units}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.stepperButton,

                    units >= maxUnits &&
                      styles.disabled,
                  ]}
                  disabled={
                    units >= maxUnits ||
                    saving
                  }
                  accessibilityLabel="More bags"
                  onPress={() =>
                    setUnits(value =>
                      Math.min(
                        maxUnits,
                        value + 1
                      )
                    )
                  }
                >
                  <MaterialIcons
                    name="add"
                    size={19}
                    color={COLORS.redButton}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* DAY */}

            <Text style={styles.label}>
              When
            </Text>

            <View style={styles.chips}>
              {dayOptions.map(option => {
                const selected =
                  dayOffset ===
                  option.offset;

                return (
                  <TouchableOpacity
                    key={option.offset}
                    style={[
                      styles.chip,

                      selected &&
                        styles.chipSelected,
                    ]}
                    disabled={saving}
                    activeOpacity={0.8}
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setDayOffset(
                        option.offset
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,

                        selected &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* NOTE */}

            <Text style={styles.label}>
              Note{' '}
              <Text style={styles.optional}>
                (optional)
              </Text>
            </Text>

            <TextInput
              style={styles.input}
              value={note}
              editable={!saving}
              multiline
              maxLength={NOTE_LIMIT}
              placeholder="e.g. Donated at the blood bank lobby"
              placeholderTextColor={COLORS.lightMuted}
              textAlignVertical="top"
              onChangeText={setNote}
            />

            <View style={styles.info}>
              <MaterialIcons
                name="history"
                size={16}
                color={COLORS.muted}
              />

              <Text style={styles.infoText}>
                Saved to both of your donation histories.
              </Text>
            </View>

            {error ? (
              <FadeInView
                key={error}
                offset={4}
                style={styles.error}
              >
                <MaterialIcons
                  name="error-outline"
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

                  saving &&
                    styles.disabled,
                ]}
                disabled={saving}
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
                    Confirm
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
    width: 40,
    height: 4,
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
  },

  headerRow: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
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
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  row: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  stepper: {
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.page,
  },

  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  stepperValue: {
    width: 42,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    textAlign: 'center',
  },

  chips: {
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  chipSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.pinkLight,
  },

  chipText: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  chipTextSelected: {
    color: COLORS.redButton,
  },

  input: {
    minHeight: 76,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.page,
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
    alignItems: 'center',
    gap: 6,
  },

  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  error: {
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 11,
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
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },

  secondary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  secondaryText: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  primary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
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
