import {
  forwardRef,
  useState,
  type ReactNode,
} from 'react';

import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type TextInputInstance,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  FadeInView,
} from './Motion';

// ============================================================
// AUTH FIELD (sign in / sign up)
//
// Label, leading icon, red border while focused or wrong, the
// error under the field, and for passwords an eye button to
// show or hide it.
// ============================================================

const COLORS = {
  redButton: '#B42323',
  black: '#171717',
  border: '#D8D8D8',
  placeholder: '#A3A3A3',
  icon: '#A08F8F',
  green: '#198754',
  errorTint: '#FFF7F7',
};

type IconName =
  keyof typeof MaterialIcons.glyphMap;

export type AuthFieldProps =
  Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
    label: string;
    icon: IconName;
    // Red border + message under the field.
    error?: string | null;
    // Red border only (the message is shown elsewhere).
    invalid?: boolean;
    // Password field with a show/hide eye.
    password?: boolean;
    // Optional: the screen controls show/hide itself.
    passwordVisible?: boolean;
    onTogglePassword?: () => void;
    // Green check on the right (e.g. passwords match).
    valid?: boolean;
    // Extra content under the field (e.g. strength meter).
    children?: ReactNode;
  };

const AuthField = forwardRef<TextInputInstance, AuthFieldProps>(
  function AuthField(
    {
      label,
      icon,
      error,
      invalid,
      password,
      passwordVisible,
      onTogglePassword,
      valid,
      children,
      editable = true,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref
  ) {
    const [
      focused,
      setFocused,
    ] = useState(false);

    const [
      ownVisible,
      setOwnVisible,
    ] = useState(false);

    const visible =
      passwordVisible ??
      ownVisible;

    function toggleVisible() {
      if (onTogglePassword) {
        onTogglePassword();

        return;
      }

      setOwnVisible(
        current => !current
      );
    }

    const showInvalid =
      Boolean(error) ||
      Boolean(invalid);

    const accent =
      showInvalid || focused
        ? COLORS.redButton
        : COLORS.icon;

    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>
          {label}
        </Text>

        <View
          style={[
            styles.box,
            focused && styles.boxFocused,
            showInvalid && styles.boxError,
          ]}
        >
          <MaterialIcons
            name={icon}
            size={18}
            color={accent}
          />

          <TextInput
            ref={ref}
            {...inputProps}
            editable={editable}
            secureTextEntry={
              Boolean(password) &&
              !visible
            }
            placeholderTextColor={
              COLORS.placeholder
            }
            accessibilityLabel={label}
            style={styles.input}
            onFocus={event => {
              setFocused(true);

              onFocus?.(event);
            }}
            onBlur={event => {
              setFocused(false);

              onBlur?.(event);
            }}
          />

          {valid ? (
            <MaterialIcons
              name="check-circle"
              size={18}
              color={COLORS.green}
            />
          ) : null}

          {password ? (
            <TouchableOpacity
              hitSlop={10}
              activeOpacity={0.7}
              disabled={!editable}
              accessibilityRole="button"
              accessibilityLabel={
                visible
                  ? 'Hide password'
                  : 'Show password'
              }
              onPress={
                toggleVisible
              }
            >
              <MaterialIcons
                name={
                  visible
                    ? 'visibility-off'
                    : 'visibility'
                }
                size={19}
                color={COLORS.icon}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <FadeInView offset={-4}>
            <Text
              style={styles.error}
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          </FadeInView>
        ) : null}

        {children}
      </View>
    );
  }
);

export default AuthField;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 7,
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  box: {
    height: 46,
    paddingLeft: 14,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
  },

  boxFocused: {
    borderWidth: 1.5,
    borderColor: COLORS.redButton,
  },

  boxError: {
    borderWidth: 1.5,
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.errorTint,
  },

  input: {
    flex: 1,
    height: '100%',
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as object)
      : null),
  },

  error: {
    marginTop: 5,
    marginLeft: 14,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
});
