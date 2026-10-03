import { Platform } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  ImageManipulator,
  SaveFormat,
} from 'expo-image-manipulator';

import { File } from 'expo-file-system';

// ============================================================
// PICK AND UPLOAD IMAGES
//
// SDK 57 replaces the phone's global fetch with expo/fetch,
// which can't send React Native's { uri, name, type } FormData
// parts (it fails before reaching the server). Phone images are
// sent as expo-file-system File objects instead; the web build
// sends the browser's File.
//
// Phone photos are also resized before upload: camera shots
// are often over the server's 5 MB limit.
// ============================================================

export type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  // Web only: the browser File from the picker.
  webFile?: Blob | null;
};

export type ImageSource =
  | 'camera'
  | 'library';

export type PickImageResult =
  | { status: 'picked'; image: PickedImage }
  | { status: 'canceled' }
  | { status: 'denied' };

// ------------------------------------------------------------
// PICK
// ------------------------------------------------------------

export async function pickImage(
  source: ImageSource,
  options: {
    // Square crop (profile photos).
    square?: boolean;
    // Longest side after resizing (phones only).
    maxSize?: number;
  } = {}
): Promise<PickImageResult> {
  if (Platform.OS !== 'web') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return { status: 'denied' };
    }
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: Boolean(options.square),
    aspect: options.square ? [1, 1] : undefined,
    quality: 0.9,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (
    result.canceled ||
    !result.assets?.length
  ) {
    return { status: 'canceled' };
  }

  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    return {
      status: 'picked',
      image: {
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        webFile: (asset as any).file || null,
      },
    };
  }

  return {
    status: 'picked',
    image: await shrinkImage(
      asset,
      options.maxSize || 1080
    ),
  };
}

// Resizes so the longest side is at most maxSize and saves as
// JPEG (also turns HEIC into JPEG).
async function shrinkImage(
  asset: ImagePicker.ImagePickerAsset,
  maxSize: number
): Promise<PickedImage> {
  const width = asset.width || 0;
  const height = asset.height || 0;

  const context =
    ImageManipulator.manipulate(asset.uri);

  if (Math.max(width, height) > maxSize) {
    context.resize(
      width >= height
        ? { width: maxSize, height: null }
        : { width: null, height: maxSize }
    );
  }

  const rendered = await context.renderAsync();

  const saved = await rendered.saveAsync({
    compress: 0.82,
    format: SaveFormat.JPEG,
  });

  return {
    uri: saved.uri,
    fileName: `photo-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

// ------------------------------------------------------------
// ATTACH TO FORM DATA
// ------------------------------------------------------------

export async function appendImage(
  formData: FormData,
  field: string,
  image: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    webFile?: Blob | null;
  }
) {
  const fileName =
    image.fileName || `photo-${Date.now()}.jpg`;

  if (Platform.OS === 'web') {
    const blob =
      image.webFile ||
      (await (await fetch(image.uri)).blob());

    formData.append(field, blob, fileName);

    return;
  }

  // expo/fetch reads the file's bytes, name and type itself.
  formData.append(
    field,
    new File(image.uri) as unknown as Blob,
    fileName
  );
}
