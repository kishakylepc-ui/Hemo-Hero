import {
  useEffect,
  useRef,
} from 'react';

import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ScrollViewInstance,
} from 'react-native';

import {
  COLORS,
} from '../constants/theme';

// ============================================================
// HEMO-HERO TIME WHEEL PICKER
//
// Scrollable hour (1-12) and minute (00-59) wheels with an
// AM/PM switch. Used by Request Blood and the coordination
// schedule so both pick times the same way.
// ============================================================

const HOURS = Array.from(
  { length: 12 },
  (_, index) => String(index + 1)
);

// Every minute, not 5-minute steps.
const MINUTES = Array.from(
  { length: 60 },
  (_, index) =>
    String(index).padStart(2, '0')
);

const ITEM_HEIGHT = 44;

// The wheel has fixed row sizes, so large system text sizes are
// capped (bigger digits would be clipped).
const MAX_TEXT_SCALE = 1.15;

// Odd, so one row sits in the middle.
const VISIBLE_ITEMS = 5;

const PADDING =
  ITEM_HEIGHT *
  ((VISIBLE_ITEMS - 1) / 2);

export default function TimeWheelPicker({
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: {
  // 1-12
  hour: number;
  // 0-59
  minute: number;
  period: 'AM' | 'PM';
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onPeriodChange: (period: 'AM' | 'PM') => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.wheels}>
        {/* Band behind the middle row = the chosen value. */}
        <View style={styles.band} />

        <WheelColumn
          label="Hour"
          values={HOURS}
          selectedIndex={
            Math.min(
              Math.max(hour, 1),
              12
            ) - 1
          }
          onChange={index =>
            onHourChange(index + 1)
          }
        />

        <Text
          style={styles.colon}
          maxFontSizeMultiplier={MAX_TEXT_SCALE}
        >
          :
        </Text>

        <WheelColumn
          label="Minute"
          values={MINUTES}
          selectedIndex={Math.min(
            Math.max(minute, 0),
            59
          )}
          onChange={onMinuteChange}
        />
      </View>

      <View style={styles.periodColumn}>
        {(['AM', 'PM'] as const).map(value => {
          const selected =
            period === value;

          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.periodButton,

                selected &&
                  styles.periodButtonSelected,
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{
                selected,
              }}
              onPress={() =>
                onPeriodChange(value)
              }
            >
              <Text
                maxFontSizeMultiplier={MAX_TEXT_SCALE}
                style={[
                  styles.periodText,

                  selected &&
                    styles.periodTextSelected,
                ]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================
// WHEEL COLUMN
//
// Scroll (or tap a number) to move it into the middle row.
// selectedIndex only sets the starting position; changes are
// reported through onChange once the wheel settles, so the
// parent screen doesn't re-render on every scroll frame.
// ============================================================

function WheelColumn({
  label,
  values,
  selectedIndex,
  onChange,
}: {
  label: string;
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const scrollRef =
    useRef<ScrollViewInstance>(null);

  const scrollY =
    useRef(
      new Animated.Value(
        selectedIndex * ITEM_HEIGHT
      )
    ).current;

  const reportedIndex =
    useRef(selectedIndex);

  const settleTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  useEffect(() => {
    return () => {
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }
    };
  }, []);

  function scrollToIndex(
    index: number,
    animated: boolean
  ) {
    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated,
    });
  }

  function report(index: number) {
    if (
      index !==
      reportedIndex.current
    ) {
      reportedIndex.current = index;
      onChange(index);
    }
  }

  function handleScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const offset =
      event.nativeEvent.contentOffset.y;

    const index = Math.min(
      Math.max(
        Math.round(
          offset / ITEM_HEIGHT
        ),
        0
      ),
      values.length - 1
    );

    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
    }

    settleTimer.current = setTimeout(() => {
      report(index);

      // Web has no snapToInterval; line up the middle row
      // once scrolling stops.
      if (
        Math.abs(
          offset -
            index * ITEM_HEIGHT
        ) > 1
      ) {
        scrollToIndex(index, true);
      }
    }, 110);
  }

  return (
    <View style={styles.columnFrame}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.column}
        contentContainerStyle={{
          paddingVertical: PADDING,
        }}
        contentOffset={{
          x: 0,
          y: selectedIndex * ITEM_HEIGHT,
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        nestedScrollEnabled
        accessibilityLabel={`${label}, ${values[selectedIndex]}`}
        onLayout={() =>
          scrollToIndex(
            reportedIndex.current,
            false
          )
        }
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY,
                },
              },
            },
          ],
          {
            useNativeDriver:
              Platform.OS !== 'web',
            listener: handleScroll,
          }
        )}
      >
        {values.map((value, index) => {
          // Rows fade and shrink the further they are from the
          // middle, like a wheel.
          const inputRange = [
            (index - 2) * ITEM_HEIGHT,
            (index - 1) * ITEM_HEIGHT,
            index * ITEM_HEIGHT,
            (index + 1) * ITEM_HEIGHT,
            (index + 2) * ITEM_HEIGHT,
          ];

          const opacity =
            scrollY.interpolate({
              inputRange,
              outputRange: [0.2, 0.45, 1, 0.45, 0.2],
              extrapolate: 'clamp',
            });

          const scale =
            scrollY.interpolate({
              inputRange,
              outputRange: [0.82, 0.9, 1.12, 0.9, 0.82],
              extrapolate: 'clamp',
            });

          return (
            <TouchableOpacity
              key={value}
              style={styles.item}
              activeOpacity={0.6}
              accessibilityLabel={`${label} ${value}`}
              onPress={() => {
                report(index);
                scrollToIndex(index, true);
              }}
            >
              <Animated.Text
                maxFontSizeMultiplier={MAX_TEXT_SCALE}
                style={[
                  styles.itemText,

                  {
                    opacity,
                    transform: [{ scale }],
                  },
                ]}
              >
                {value}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PADDING,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0D6D6',
    backgroundColor: COLORS.pinkLight,
    pointerEvents: 'none',
  },

  // A ScrollView grows by default (flexGrow: 1). Straight in this
  // row, that stretched each wheel across the sheet on phones and
  // pushed AM/PM off the edge, so each wheel sits in a plain
  // fixed-size frame.
  columnFrame: {
    width: 72,
    height:
      ITEM_HEIGHT *
      VISIBLE_ITEMS,
    flexGrow: 0,
    flexShrink: 0,
  },

  column: {
    width: '100%',
    height: '100%',
    flexGrow: 0,
    flexShrink: 0,
    // Browser scroll snapping (web ignores snapToInterval).
    scrollSnapType:
      Platform.OS === 'web'
        ? 'y mandatory'
        : undefined,
  } as any,

  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    scrollSnapAlign:
      Platform.OS === 'web'
        ? 'center'
        : undefined,
  } as any,

  // Android adds font padding to Poppins, which pushes digits off
  // centre in the fixed rows.
  itemText: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  colon: {
    marginHorizontal: 4,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    lineHeight: 30,
    includeFontPadding: false,
  },

  periodColumn: {
    flexShrink: 0,
    marginLeft: 16,
    gap: 8,
  },

  periodButton: {
    width: 52,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9CFCF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  periodButtonSelected: {
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.redButton,
  },

  periodText: {
    color: '#333333',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    includeFontPadding: false,
  },

  periodTextSelected: {
    color: COLORS.white,
  },
});
