import {
  type ComponentProps,
  type ReactNode,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  COLORS,
  FONTS,
  ICON_TILE,
  RADIUS,
} from '../constants/theme';

// ============================================================
// HEMO-HERO APP MODAL
//
// Shared in-app dialog for confirmations and messages.
// Replaces browser alerts everywhere in the mobile app.
//
// Usage:
//   <AppModal
//     visible={open}
//     variant="danger"
//     title="Withdraw application?"
//     message="..."
//     confirmLabel="Withdraw"
//     cancelLabel="Keep"
//     onConfirm={...}
//     onClose={...}
//   />
//
// Leave cancelLabel out for a single-button message.
// ============================================================

export type AppModalVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'error';

type IconName =
  ComponentProps<
    typeof Ionicons
  >['name'];

const VARIANTS: Record<
  AppModalVariant,
  {
    icon: IconName;
    color: string;
    tint: string;
    button: string;
  }
> = {
  info: {
    icon: 'information-circle',
    color: COLORS.blue,
    tint: COLORS.blueLight,
    button: COLORS.redButton,
  },

  success: {
    icon: 'checkmark-circle',
    color: COLORS.green,
    tint: COLORS.greenLight,
    button: COLORS.green,
  },

  warning: {
    icon: 'warning',
    color: COLORS.orange,
    tint: COLORS.orangeLight,
    button: COLORS.orange,
  },

  danger: {
    icon: 'alert-circle',
    color: COLORS.red,
    tint: COLORS.pinkLight,
    button: COLORS.redDark,
  },

  error: {
    icon: 'close-circle',
    color: COLORS.red,
    tint: COLORS.pinkLight,
    button: COLORS.redButton,
  },
};

export default function AppModal({
  visible,
  variant = 'info',
  icon,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  visible: boolean;
  variant?: AppModalVariant;
  icon?: IconName;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const palette =
    VARIANTS[variant];

  function handleConfirm() {
    if (loading) {
      return;
    }

    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  }

  function handleClose() {
    if (!loading) {
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />

        <View style={styles.card}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor:
                  palette.tint,
              },
            ]}
          >
            <Ionicons
              name={icon || palette.icon}
              size={ICON_TILE.lg.glyph}
              color={palette.color}
            />
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          {message ? (
            <Text style={styles.message}>
              {message}
            </Text>
          ) : null}

          {children}

          <View style={styles.actions}>
            {cancelLabel ? (
              <Pressable
                disabled={loading}
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text style={styles.cancelText}>
                  {cancelLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                {
                  backgroundColor:
                    palette.button,
                },
                !cancelLabel &&
                  styles.confirmSingle,
                pressed &&
                  styles.pressed,
                loading &&
                  styles.loading,
              ]}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Text style={styles.confirmText}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.overlay,
  },

  card: {
    width: '100%',
    maxWidth: 340,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  // iPhone-style tile: a tinted rounded square.
  iconCircle: {
    width: ICON_TILE.lg.size,
    height: ICON_TILE.lg.size,
    borderRadius: ICON_TILE.lg.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 16,
    color: COLORS.black,
    fontFamily: FONTS.headingSemi,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },

  message: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },

  actions: {
    width: '100%',
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: '#F2F2F4',
  },

  cancelText: {
    color: COLORS.black,
    fontFamily: FONTS.headingSemi,
    fontSize: 13.5,
  },

  confirmButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },

  confirmSingle: {
    flex: 0,
    minWidth: 150,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },

  confirmText: {
    color: COLORS.white,
    fontFamily: FONTS.headingSemi,
    fontSize: 13.5,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  loading: {
    opacity: 0.7,
  },
});
