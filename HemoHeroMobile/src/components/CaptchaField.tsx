import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SvgXml,
} from 'react-native-svg';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import AuthField from './AuthField';

import {
  FadeInView,
} from './Motion';

import type {
  LoginCaptcha,
} from '../lib/api';

// ============================================================
// CAPTCHA FIELD (sign in)
//
// Shown after an account has been locked: the picture from the
// server, a button for a new one, and the answer field. The
// screen loads the picture and sends the answer with the
// sign-in.
// ============================================================

const COLORS = {
  redButton: '#B42323',
  black: '#171717',
  muted: '#555555',
  border: '#D8D8D8',
  picture: '#F4F6FA',
  icon: '#A08F8F',
};

type CaptchaFieldProps = {
  captcha: LoginCaptcha | null;
  loading: boolean;
  // Why the picture couldn't load.
  loadError?: string | null;
  value: string;
  onChangeText: (value: string) => void;
  onRefresh: () => void;
  // Under the answer field (e.g. "Type the characters").
  error?: string;
  // Red outline only (the message is in the banner).
  invalid?: boolean;
  editable?: boolean;
  onSubmitEditing?: () => void;
};

export default function CaptchaField({
  captcha,
  loading,
  loadError,
  value,
  onChangeText,
  onRefresh,
  error,
  invalid,
  editable = true,
  onSubmitEditing,
}: CaptchaFieldProps) {
  return (
    <FadeInView offset={-6}>
      <Text style={styles.label}>
        Security Check
      </Text>

      <Text style={styles.hint}>
        Type the characters in the picture to continue.
      </Text>

      <View style={styles.pictureRow}>
        <View
          style={styles.picture}
          accessibilityLabel="CAPTCHA picture"
        >
          {loading ? (
            <ActivityIndicator
              color={COLORS.redButton}
            />
          ) : captcha ? (
            <SvgXml
              xml={captcha.svg}
              width="100%"
              height="100%"
            />
          ) : (
            <Text style={styles.pictureError}>
              {loadError ||
                'Tap the arrow for a picture.'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          activeOpacity={0.7}
          disabled={loading || !editable}
          accessibilityRole="button"
          accessibilityLabel="New picture"
          onPress={onRefresh}
        >
          <MaterialIcons
            name="refresh"
            size={21}
            color={COLORS.redButton}
          />
        </TouchableOpacity>
      </View>

      <AuthField
        label="Characters"
        icon="verified-user"
        placeholder="Type the 5 characters"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={5}
        value={value}
        editable={editable && !loading}
        error={error}
        invalid={invalid}
        returnKeyType="go"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
      />
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  hint: {
    marginTop: 3,
    marginBottom: 8,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },

  pictureRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  picture: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.picture,
  },

  pictureError: {
    paddingHorizontal: 10,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
  },

  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
});
