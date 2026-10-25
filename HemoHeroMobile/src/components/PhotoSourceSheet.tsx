import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
  pickImage,
  type ImageSource,
  type PickedImage,
} from '../lib/imageUpload';

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  muted: '#666666',

  cardBorder: '#E8DADA',
  divider: '#F3E9E9',

  pinkLight: '#FFF1F1',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  overlay: 'rgba(0,0,0,0.45)',
};

// ============================================================
// PHOTO SOURCE SHEET
//
// "Take Photo / Choose from Library / Remove Photo". Picks and
// resizes the image (lib/imageUpload); the screen uploads it.
//
// The sheet closes before the camera or library opens: iOS
// can't show the picker on top of a closing modal.
// ============================================================

export default function PhotoSourceSheet({
  visible,
  title = 'Profile Photo',
  hasPhoto = false,
  square = true,
  onClose,
  onPicked,
  onRemove,
  onError,
}: {
  visible: boolean;
  title?: string;
  // Shows "Remove Photo" when true and onRemove is given.
  hasPhoto?: boolean;
  square?: boolean;
  onClose: () => void;
  onPicked: (image: PickedImage) => void;
  onRemove?: () => void;
  // Permission denied or the picker failed.
  onError: (message: string) => void;
}) {
  const insets =
    useSafeAreaInsets();

  async function choose(
    source: ImageSource
  ) {
    onClose();

    // Let the sheet finish closing (web must open the picker
    // within the tap).
    if (Platform.OS !== 'web') {
      await new Promise(resolve =>
        setTimeout(
          resolve,
          Platform.OS === 'ios'
            ? 450
            : 120
        )
      );
    }

    try {
      const result =
        await pickImage(
          source,
          {
            square,
          }
        );

      if (
        result.status ===
        'picked'
      ) {
        onPicked(
          result.image
        );

        return;
      }

      if (
        result.status ===
        'denied'
      ) {
        onError(
          source === 'camera'
            ? 'Camera access is off. Allow it in your phone settings to take a photo.'
            : 'Photo access is off. Allow it in your phone settings to choose a photo.'
        );
      }
    } catch (error) {
      console.log(
        'PICK PHOTO ERROR:',
        error
      );

      onError(
        source === 'camera'
          ? 'Unable to open the camera on this device.'
          : 'Unable to open your photos.'
      );
    }
  }

  function remove() {
    onClose();

    onRemove?.();
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
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

          <Text style={styles.title}>
            {title}
          </Text>

          <OptionRow
            icon="camera-outline"
            label="Take Photo"
            onPress={() =>
              choose('camera')
            }
          />

          <OptionRow
            icon="images-outline"
            label="Choose from Library"
            onPress={() =>
              choose('library')
            }
          />

          {hasPhoto && onRemove ? (
            <OptionRow
              icon="trash-outline"
              label="Remove Photo"
              danger
              onPress={remove}
            />
          ) : null}

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </FadeInView>
      </View>
    </Modal>
  );
}

function OptionRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.option}
      activeOpacity={0.75}
      accessibilityRole="button"
      onPress={onPress}
    >
      <View
        style={[
          styles.optionIcon,
          danger && styles.optionIconDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            danger
              ? COLORS.redButton
              : COLORS.blue
          }
        />
      </View>

      <Text
        style={[
          styles.optionText,
          danger && styles.optionTextDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: COLORS.cardBorder,
  },

  title: {
    marginBottom: 6,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },

  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueLight,
  },

  optionIconDanger: {
    backgroundColor: COLORS.pinkLight,
  },

  optionText: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14.5,
  },

  optionTextDanger: {
    color: COLORS.redButton,
  },

  cancelButton: {
    height: 48,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: COLORS.cardBorder,

    backgroundColor: '#F2F2F4',
  },

  cancelText: {
    color: COLORS.muted,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },
});
