import { useMemo } from 'react';

import {
  Platform,
  useWindowDimensions,
} from 'react-native';

// ============================================================
// ADMIN CANVAS
//
// Every admin screen fills the whole window (no letterboxing)
// and sizes its content from one scale, tuned for the
// iPad Pro 13" (1376 × 1032 points):
//
//   landscape 1376 × 1032 -> scale 1 (the 1366 × 1024 design)
//   portrait  1032 × 1376 -> scale 1 (rows fill the narrower
//                            width; pages scroll)
//
// Screens multiply spacing by s and text by fs (both floored so
// small windows stay readable).
// ============================================================

const LANDSCAPE_WIDTH = 1366;
const LANDSCAPE_HEIGHT = 1024;

const PORTRAIT_WIDTH = 1032;

// Portrait pages scroll, so height only limits short windows.
const PORTRAIT_HEIGHT = 1200;

export type AdminCanvas = {
  // Window size (the canvas fills it).
  width: number;
  height: number;

  scale: number;
};

export function useAdminCanvas(): AdminCanvas {
  const {
    width,
    height,
  } = useWindowDimensions();

  return useMemo(() => {
    let scale =
      height > width
        ? Math.min(
            width / PORTRAIT_WIDTH,
            height / PORTRAIT_HEIGHT
          )
        : Math.min(
            width / LANDSCAPE_WIDTH,
            height / LANDSCAPE_HEIGHT
          );

    // Static web rendering has no window size yet.
    if (
      !Number.isFinite(scale) ||
      scale <= 0
    ) {
      scale = 1;
    }

    // Large desktop browsers keep the iPad sizes.
    if (Platform.OS === 'web') {
      scale = Math.min(
        scale,
        1
      );
    }

    return {
      width,
      height,
      scale,
    };
  }, [width, height]);
}
