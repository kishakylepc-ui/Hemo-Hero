import { useState } from 'react';

import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import PhotoSourceSheet from './PhotoSourceSheet';

import {
  COLORS,
  FONTS,
  RADIUS,
  TEXT,
} from '../constants/theme';

import type { PickedImage } from '../lib/imageUpload';

// ============================================================
// BLOOD TYPE PROOF FIELD
//
// The photo that proves the chosen blood type: a blood donor
// card, blood typing result or lab result. The screen uploads it
// together with the blood type when it saves.
// ============================================================

export default function BloodTypeProofField({
  image,
  proofOnFile = false,
  required = true,
  disabled = false,
  onChange,
  onError,
}: {
  // Photo chosen on this screen, not uploaded yet.
  image: PickedImage | null;
  // A proof for the current blood type is already saved.
  proofOnFile?: boolean;
  // Shows the required mark (a new blood type needs proof).
  required?: boolean;
  disabled?: boolean;
  onChange: (image: PickedImage | null) => void;
  onError: (message: string) => void;
}) {
  const [
    sheetVisible,
    setSheetVisible,
  ] = useState(false);

  function openSheet() {
    if (!disabled) {
      setSheetVisible(true);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialIcons
          name="fact-check"
          size={18}
          color={COLORS.redButton}
        />

        <Text style={styles.title}>
          Proof of blood type
          {proofOnFile || !required ? null : (
            <Text style={styles.required}>
              {' '}*
            </Text>
          )}
        </Text>
      </View>

      <Text style={styles.hint}>
        A clear photo of your blood donor card, blood typing result
        or lab result that shows your name and blood type.
      </Text>

      {image ? (
        <View style={styles.preview}>
          <Image
            source={{
              uri: image.uri,
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          <View style={styles.previewText}>
            <Text style={styles.previewTitle}>
              Photo added
            </Text>

            <Text style={styles.previewMeta}>
              Saved with your blood type.
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={disabled}
            style={styles.linkButton}
            onPress={openSheet}
          >
            <Text style={styles.linkText}>
              Replace
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            disabled={disabled}
            hitSlop={8}
            onPress={() =>
              onChange(null)
            }
          >
            <MaterialIcons
              name="close"
              size={18}
              color={COLORS.muted}
            />
          </TouchableOpacity>
        </View>
      ) : proofOnFile ? (
        <View style={styles.onFile}>
          <MaterialIcons
            name="verified"
            size={17}
            color={COLORS.green}
          />

          <Text style={styles.onFileText}>
            Proof on file
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={disabled}
            style={styles.linkButton}
            onPress={openSheet}
          >
            <Text style={styles.linkText}>
              Replace
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={disabled}
          activeOpacity={0.85}
          style={[
            styles.addButton,

            disabled &&
              styles.disabled,
          ]}
          onPress={openSheet}
        >
          <MaterialIcons
            name="add-a-photo"
            size={19}
            color={COLORS.redButton}
          />

          <Text style={styles.addText}>
            Add a photo
          </Text>
        </TouchableOpacity>
      )}

      <PhotoSourceSheet
        visible={sheetVisible}
        title="Blood Type Proof"
        square={false}
        onClose={() =>
          setSheetVisible(false)
        }
        onPicked={picked =>
          onChange(picked)
        }
        onError={onError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  title: {
    color: COLORS.black,
    fontFamily: FONTS.semiBold,
    fontSize: 13.5,
  },

  required: {
    color: COLORS.redButton,
  },

  hint: {
    marginTop: 6,
    marginBottom: 12,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: TEXT.small,
    lineHeight: 18,
  },

  addButton: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.pinkLight,
  },

  addText: {
    color: COLORS.redButton,
    fontFamily: FONTS.headingSemi,
    fontSize: 13.5,
  },

  disabled: {
    opacity: 0.5,
  },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.pinkLight,
  },

  previewText: {
    flex: 1,
    minWidth: 0,
  },

  previewTitle: {
    color: COLORS.black,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  previewMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: TEXT.tiny + 0.5,
  },

  onFile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.greenLight,
  },

  onFileText: {
    flex: 1,
    color: COLORS.green,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },

  linkButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  linkText: {
    color: COLORS.redButton,
    fontFamily: FONTS.semiBold,
    fontSize: 12.5,
  },
});
