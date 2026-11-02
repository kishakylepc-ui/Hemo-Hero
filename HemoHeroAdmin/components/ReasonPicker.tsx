import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ============================================================
// REASON PICKER
//
// For pop-ups that need a reason the person will see: why an
// account was deactivated or deleted, or why a review request
// was declined. Tapping a common reason fills the box, which
// can then be edited. Required: the pop-up keeps its button
// disabled until there is text.
// ============================================================

const COLORS = {
  border: '#243554',
  cardLight: '#101A35',
  white: '#FFFFFF',
  muted: '#7F889F',
  soft: '#B7C1D8',
  red: '#EF3340',
  redTint: 'rgba(239,51,64,0.14)',
};

export const REASON_MAX_LENGTH = 300;

// Common reasons, by what the admin is doing.
export const DEACTIVATE_REASONS = [
  'Fake or edited blood type proof',
  'Repeated no-shows for donations',
  'Abusive or unsafe behavior in chats',
  'Asked for payment for blood',
  'Fake or duplicate account',
];

export const DELETE_REASONS = [
  'Fake or duplicate account',
  'Asked for payment for blood',
  'Abusive or unsafe behavior',
  'The person asked us to delete their account',
];

export const DECLINE_REASONS = [
  'The reports against you were confirmed.',
  'Your proof could not be verified. Ask again with a clearer photo.',
];

export default function ReasonPicker({
  value,
  onChange,
  presets,
  hint,
  placeholder = 'Write the reason',
  editable = true,
  scale,
  fontScale,
}: {
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  hint: string;
  placeholder?: string;
  editable?: boolean;
  scale: number;
  fontScale: number;
}) {
  const s = scale;
  const fs = fontScale;

  return (
    <View
      style={[
        styles.wrap,
        {
          marginTop: 16 * s,
          gap: 10 * s,
        },
      ]}
    >
      <Text
        style={[
          styles.hint,
          {
            fontSize: 12 * fs,
            lineHeight: 17 * fs,
          },
        ]}
      >
        {hint}
      </Text>

      <View
        style={[
          styles.chips,
          {
            gap: 8 * s,
          },
        ]}
      >
        {presets.map(preset => {
          const selected =
            value.trim() === preset;

          return (
            <Pressable
              key={preset}
              disabled={!editable}
              accessibilityRole="button"
              accessibilityState={{
                selected,
              }}
              onPress={() =>
                onChange(preset)
              }
              style={({ pressed }) => [
                styles.chip,
                {
                  paddingHorizontal: 12 * s,
                  paddingVertical: 7 * s,
                  borderRadius: 16 * s,
                },
                selected &&
                  styles.chipSelected,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    fontSize: 12 * fs,
                  },
                  selected &&
                    styles.chipTextSelected,
                ]}
              >
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline
        maxLength={REASON_MAX_LENGTH}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        accessibilityLabel="Reason"
        style={[
          styles.input,
          {
            minHeight: 84 * s,
            borderRadius: 10 * s,
            paddingHorizontal: 14 * s,
            paddingVertical: 10 * s,
            fontSize: 13.5 * fs,
            lineHeight: 19 * fs,
          },
        ]}
      />

      <Text
        style={[
          styles.counter,
          {
            fontSize: 11 * fs,
          },
        ]}
      >
        {value.length}/{REASON_MAX_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },

  hint: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  chipSelected: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redTint,
  },

  chipText: {
    color: COLORS.soft,
    fontFamily: 'Inter_500Medium',
  },

  chipTextSelected: {
    color: COLORS.white,
  },

  pressed: {
    opacity: 0.75,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as any,

  counter: {
    alignSelf: 'flex-end',
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },
});
