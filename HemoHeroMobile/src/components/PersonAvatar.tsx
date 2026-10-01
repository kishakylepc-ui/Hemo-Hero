import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

// ============================================================
// PERSON AVATAR
//
// Profile photo when there is one, otherwise (or if it fails to
// load) the person's initials. The caller's style sets the size,
// shape and colors; children (e.g. an unread dot) sit on top.
// ============================================================

export default function PersonAvatar({
  uri,
  label,
  style,
  textStyle,
  children,
}: {
  uri?: string | null;
  // Initials shown without a photo.
  label: string;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  children?: ReactNode;
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showPhoto =
    Boolean(uri) &&
    !failed;

  return (
    <View style={style}>
      {showPhoto ? (
        <Image
          source={{
            uri: uri as string,
          }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() =>
            setFailed(true)
          }
        />
      ) : (
        <Text style={textStyle}>
          {label}
        </Text>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
  },
});
