import {
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// ============================================================
// FULL-SCREEN HEADERS
//
// Screens draw their red header behind the status bar (clock,
// camera cutout) instead of leaving a flat strip above it. The
// header keeps its look by growing by the status-bar height:
// its top padding, plus its fixed height or minHeight if it has
// one. Pass the top inset from useSafeAreaInsets().
// ============================================================

export function withStatusBar(
  style: StyleProp<ViewStyle>,
  insetTop: number
): StyleProp<ViewStyle> {
  const flat =
    StyleSheet.flatten(style) ||
    {};

  const paddingTop =
    Number(
      flat.paddingTop ??
        flat.paddingVertical ??
        flat.padding ??
        0
    ) || 0;

  const grown: ViewStyle = {
    paddingTop:
      paddingTop +
      insetTop,
  };

  if (
    typeof flat.height ===
    'number'
  ) {
    grown.height =
      flat.height +
      insetTop;
  }

  if (
    typeof flat.minHeight ===
    'number'
  ) {
    grown.minHeight =
      flat.minHeight +
      insetTop;
  }

  return [
    style,
    grown,
  ];
}

// Decorative header circles move down with the header so they
// sit where they did before.
export function shiftedDown(
  style: StyleProp<ViewStyle>,
  insetTop: number
): StyleProp<ViewStyle> {
  return [
    style,
    {
      transform: [
        {
          translateY:
            insetTop,
        },
      ],
    },
  ];
}
