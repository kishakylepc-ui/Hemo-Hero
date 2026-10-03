import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import {
  FadeInView,
  PressableScale,
} from './Motion';

import {
  COLORS,
  FONTS,
} from '../constants/theme';

// ============================================================
// SPOTLIGHT TOUR
//
// Walks through real buttons on a screen: everything but the
// current target is dimmed, the target gets a soft pulsing ring,
// and a card above or below it explains what it does.
//
// Render it as the last child of the screen's root view. Each
// step points at a view ref (use collapsable={false} on plain
// Views). onReveal can scroll the target into view first; steps
// whose target isn't on screen are skipped.
// ============================================================

export type SpotlightStep = {
  key: string;
  target: RefObject<View | null>;
  title: string;
  text: string;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const USE_NATIVE_DRIVER =
  Platform.OS !== 'web';

// Space around the target, and between it and the card.
const HOLE_PADDING = 8;
const CARD_GAP = 14;

// Position of a view on screen, or null when it isn't laid out
// (a zero-height marker still counts).
export function measureView(
  view: View | null
): Promise<Rect | null> {
  return new Promise(resolve => {
    if (!view) {
      resolve(null);

      return;
    }

    view.measureInWindow(
      (x, y, width, height) =>
        resolve(
          width > 0 || height > 0
            ? { x, y, width, height }
            : null
        )
    );
  });
}

export default function SpotlightTour({
  steps,
  visible,
  onReveal,
  onFinish,
}: {
  steps: SpotlightStep[];
  visible: boolean;
  // Scroll the step's target into view before it is measured.
  onReveal?: (step: SpotlightStep) => Promise<void>;
  // The tour ended (finished or skipped).
  onFinish: () => void;
}) {
  const rootRef =
    useRef<View>(null);

  const [index, setIndex] =
    useState(0);

  // Target position inside this overlay.
  const [hole, setHole] =
    useState<Rect | null>(null);

  const [size, setSize] =
    useState({
      width: 0,
      height: 0,
    });

  const fade =
    useRef(
      new Animated.Value(0)
    ).current;

  const pulse =
    useRef(
      new Animated.Value(0)
    ).current;

  const step = steps[index];

  const last =
    index >= steps.length - 1;

  // Fade in, and keep the ring pulsing while the tour is open.
  useEffect(() => {
    if (!visible) {
      return;
    }

    setIndex(0);

    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    const loop =
      Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      );

    loop.start();

    return () => {
      loop.stop();
      fade.setValue(0);
    };
  }, [visible]);

  // Find the current step's target (skipping missing ones).
  useEffect(() => {
    if (!visible || !step) {
      return;
    }

    let cancelled = false;

    setHole(null);

    (async () => {
      if (onReveal) {
        await onReveal(step);
      }

      const [root, target] =
        await Promise.all([
          measureView(rootRef.current),
          measureView(step.target.current),
        ]);

      if (cancelled) {
        return;
      }

      if (!root || !target) {
        if (last) {
          onFinish();
        } else {
          setIndex(index + 1);
        }

        return;
      }

      setHole({
        x: target.x - root.x,
        y: target.y - root.y,
        width: target.width,
        height: target.height,
      });
    })();

    return () => {
      cancelled = true;
    };
    // Re-measure only when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index]);

  if (!visible || !step) {
    return null;
  }

  const width = size.width;
  const height = size.height;

  const area =
    hole
      ? {
          left: Math.max(0, hole.x - HOLE_PADDING),
          top: Math.max(0, hole.y - HOLE_PADDING),
          right: Math.min(width, hole.x + hole.width + HOLE_PADDING),
          bottom: Math.min(height, hole.y + hole.height + HOLE_PADDING),
        }
      : null;

  // The card goes on the side with more room.
  const cardBelow =
    area
      ? height - area.bottom >= area.top
      : true;

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={StyleSheet.absoluteFill}
      onLayout={event =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
      // The screen underneath isn't usable during the tour.
      onStartShouldSetResponder={() => true}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,

          {
            opacity: fade,
          },
        ]}
      >
        {area ? (
          <>
            <View
              style={[
                styles.shade,
                { left: 0, top: 0, width, height: area.top },
              ]}
            />

            <View
              style={[
                styles.shade,
                { left: 0, top: area.bottom, width, height: height - area.bottom },
              ]}
            />

            <View
              style={[
                styles.shade,
                { left: 0, top: area.top, width: area.left, height: area.bottom - area.top },
              ]}
            />

            <View
              style={[
                styles.shade,
                { left: area.right, top: area.top, width: width - area.right, height: area.bottom - area.top },
              ]}
            />

            {/* Ring around the target, plus a soft pulse */}

            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  left: area.left,
                  top: area.top,
                  width: area.right - area.left,
                  height: area.bottom - area.top,
                },
              ]}
            >
              {/* Red inner line: the white one alone vanishes on
                  light cards. */}
              <View style={styles.ringInner} />
            </View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                styles.pulseRing,
                {
                  left: area.left,
                  top: area.top,
                  width: area.right - area.left,
                  height: area.bottom - area.top,

                  opacity:
                    pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 0],
                    }),

                  transform: [
                    {
                      scale:
                        pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.06],
                        }),
                    },
                  ],
                },
              ]}
            />

            {/* Explanation */}

            <FadeInView
              key={step.key}
              offset={cardBelow ? 8 : -8}
              style={[
                styles.card,

                cardBelow
                  ? { top: area.bottom + CARD_GAP }
                  : { bottom: height - area.top + CARD_GAP },
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.stepText}>
                  {index + 1} of {steps.length}
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Skip the tour"
                  hitSlop={10}
                  onPress={onFinish}
                >
                  <Text style={styles.skipText}>
                    Skip tour
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>
                {step.title}
              </Text>

              <Text style={styles.text}>
                {step.text}
              </Text>

              <View style={styles.buttons}>
                {index > 0 ? (
                  <PressableScale
                    containerStyle={styles.buttonSlot}
                    style={styles.secondaryButton}
                    accessibilityRole="button"
                    onPress={() =>
                      setIndex(index - 1)
                    }
                  >
                    <Text style={styles.secondaryText}>
                      Back
                    </Text>
                  </PressableScale>
                ) : null}

                <PressableScale
                  containerStyle={styles.buttonSlot}
                  style={styles.primaryButton}
                  accessibilityRole="button"
                  onPress={() =>
                    last
                      ? onFinish()
                      : setIndex(index + 1)
                  }
                >
                  <Text style={styles.primaryText}>
                    {last ? 'Done' : 'Next'}
                  </Text>

                  <MaterialIcons
                    name={
                      last
                        ? 'check'
                        : 'arrow-forward'
                    }
                    size={17}
                    color={COLORS.white}
                  />
                </PressableScale>
              </View>
            </FadeInView>
          </>
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.shade,
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: {
    position: 'absolute',
    backgroundColor: 'rgba(23,8,8,0.66)',
  },

  ring: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: COLORS.white,
  },

  ringInner: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.redButton,
  },

  pulseRing: {
    borderWidth: 3,
  },

  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  stepText: {
    color: COLORS.redButton,
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },

  skipText: {
    color: COLORS.muted,
    fontFamily: FONTS.semiBold,
    fontSize: 12.5,
  },

  title: {
    marginTop: 8,
    color: COLORS.black,
    fontFamily: FONTS.heading,
    fontSize: 17,
  },

  text: {
    marginTop: 5,
    color: COLORS.muted,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 20,
  },

  buttons: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },

  buttonSlot: {
    flex: 1,
  },

  primaryButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: COLORS.redButton,
  },

  primaryText: {
    color: COLORS.white,
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
  },

  secondaryButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.white,
  },

  secondaryText: {
    color: COLORS.redButton,
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
  },
});
