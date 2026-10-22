import {
  useEffect,
  useState,
} from 'react';

import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

// ============================================================
// DATE RANGE MODAL
//
// A month calendar for picking a date range (Log Trail filter).
// Tap the first day, then the last day; one tap alone picks a
// single day. Days after today can't be picked. Dates are
// 'YYYY-MM-DD' in the device's timezone.
// ============================================================

const COLORS = {
  card: '#0B142A',
  cardLight: '#101A35',
  border: '#243554',
  white: '#FFFFFF',
  muted: '#7F889F',
  soft: '#B7C1D8',
  red: '#DB0A0A',
  redBright: '#EF3340',
  range: 'rgba(219,10,10,0.18)',
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ------------------------------------------------------------
// DATE KEYS ('YYYY-MM-DD', local time)
// ------------------------------------------------------------

export function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function fromDateKey(key: string) {
  const [year, month, day] = key
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
}

// "Oct 3" or "Oct 3, 2025" (other years).
export function formatDateKey(key: string) {
  const date = fromDateKey(key);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !==
    new Date().getFullYear()
      ? { year: 'numeric' as const }
      : {}),
  });
}

export default function DateRangeModal({
  visible,
  scale,
  fontScale,
  initialStart,
  initialEnd,
  onApply,
  onClose,
}: {
  visible: boolean;
  scale: number;
  fontScale: number;
  initialStart?: string | null;
  initialEnd?: string | null;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const todayKey = toDateKey(new Date());

  const [start, setStart] =
    useState<string | null>(null);

  const [end, setEnd] =
    useState<string | null>(null);

  // First day of the month shown.
  const [month, setMonth] = useState(
    () => new Date()
  );

  // Starts from the current filter each time it opens.
  useEffect(() => {
    if (!visible) {
      return;
    }

    setStart(initialStart || null);
    setEnd(initialEnd || null);

    const shown = initialStart
      ? fromDateKey(initialStart)
      : new Date();

    setMonth(
      new Date(
        shown.getFullYear(),
        shown.getMonth(),
        1
      )
    );
  }, [visible, initialStart, initialEnd]);

  function pickDay(key: string) {
    if (key > todayKey) {
      return;
    }

    // New range, or a day before the start.
    if (!start || end || key < start) {
      setStart(key);
      setEnd(null);

      return;
    }

    setEnd(key);
  }

  function moveMonth(step: number) {
    setMonth(
      current =>
        new Date(
          current.getFullYear(),
          current.getMonth() + step,
          1
        )
    );
  }

  // 6 weeks, starting on the Sunday before the 1st.
  const firstShown = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - month.getDay()
  );

  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        firstShown.getFullYear(),
        firstShown.getMonth(),
        firstShown.getDate() + index
      )
  );

  const atCurrentMonth =
    month.getFullYear() ===
      new Date().getFullYear() &&
    month.getMonth() ===
      new Date().getMonth();

  const rangeEnd = end || start;

  const summary = start
    ? end && end !== start
      ? `${formatDateKey(start)} – ${formatDateKey(end)}`
      : `${formatDateKey(start)} only (tap another day for a range)`
    : 'Tap the first day';

  const cell = 40 * scale;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'landscape',
      ]}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View
          style={[
            styles.card,

            {
              // 7 days, the padding, and the 1px border.
              width: cell * 7 + 48 * scale + 2,
              padding: 24 * scale,
              borderRadius: 18 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.title,

              {
                fontSize: 18 * fontScale,
              },
            ]}
          >
            Choose Dates
          </Text>

          <Text
            style={[
              styles.summary,

              {
                fontSize: 12.5 * fontScale,
                marginTop: 4 * scale,
                marginBottom: 16 * scale,
              },
            ]}
          >
            {summary}
          </Text>

          {/* MONTH */}

          <View
            style={[
              styles.monthRow,

              {
                marginBottom: 8 * scale,
              },
            ]}
          >
            <Pressable
              hitSlop={8}
              onPress={() => moveMonth(-1)}
              accessibilityLabel="Previous month"
            >
              <MaterialIcons
                name="chevron-left"
                size={26 * scale}
                color={COLORS.soft}
              />
            </Pressable>

            <Text
              style={[
                styles.monthText,

                {
                  fontSize: 14.5 * fontScale,
                },
              ]}
            >
              {MONTHS[month.getMonth()]}{' '}
              {month.getFullYear()}
            </Text>

            <Pressable
              hitSlop={8}
              disabled={atCurrentMonth}
              onPress={() => moveMonth(1)}
              accessibilityLabel="Next month"
            >
              <MaterialIcons
                name="chevron-right"
                size={26 * scale}
                color={
                  atCurrentMonth
                    ? COLORS.border
                    : COLORS.soft
                }
              />
            </Pressable>
          </View>

          {/* GRID */}

          <View
            style={[
              styles.grid,

              {
                width: cell * 7,
              },
            ]}
          >
            {WEEKDAYS.map(day => (
              <Text
                key={day}
                style={[
                  styles.weekday,

                  {
                    width: cell,
                    fontSize: 11 * fontScale,
                    paddingVertical: 6 * scale,
                  },
                ]}
              >
                {day}
              </Text>
            ))}

            {days.map(date => {
              const key = toDateKey(date);

              const inMonth =
                date.getMonth() ===
                month.getMonth();

              const future = key > todayKey;

              const isEdge =
                key === start ||
                key === rangeEnd;

              const inRange =
                Boolean(start) &&
                Boolean(rangeEnd) &&
                key > (start as string) &&
                key < (rangeEnd as string);

              return (
                <Pressable
                  key={key}
                  disabled={future}
                  onPress={() => pickDay(key)}
                  style={({ pressed }) => [
                    styles.day,

                    {
                      width: cell,
                      height: cell,
                      borderRadius: cell / 2,
                    },

                    inRange &&
                      styles.dayInRange,

                    isEdge &&
                      styles.dayEdge,

                    pressed &&
                      !future &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,

                      {
                        fontSize: 13 * fontScale,
                      },

                      !inMonth &&
                        styles.dayOutside,

                      future &&
                        styles.dayFuture,

                      key === todayKey &&
                        styles.dayToday,

                      isEdge &&
                        styles.dayEdgeText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* BUTTONS */}

          <View
            style={[
              styles.buttons,

              {
                gap: 10 * scale,
                marginTop: 20 * scale,
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,

                {
                  height: 46 * scale,
                  borderRadius: 10 * scale,
                },

                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.cancelText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!start}
              onPress={() =>
                start &&
                onApply(start, end || start)
              }
              style={({ pressed }) => [
                styles.applyButton,

                {
                  height: 46 * scale,
                  borderRadius: 10 * scale,
                },

                !start &&
                  styles.disabled,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.applyText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Show Activity
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,4,10,0.78)',
  },

  card: {
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 18,
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  summary: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  monthText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  weekday: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },

  day: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayInRange: {
    backgroundColor: COLORS.range,
  },

  dayEdge: {
    backgroundColor: COLORS.red,
  },

  dayText: {
    color: COLORS.white,
    fontFamily: 'Inter_500Medium',
  },

  dayOutside: {
    color: COLORS.muted,
  },

  dayFuture: {
    color: COLORS.border,
  },

  dayToday: {
    color: COLORS.redBright,
    fontFamily: 'Inter_700Bold',
  },

  dayEdgeText: {
    color: COLORS.white,
  },

  buttons: {
    flexDirection: 'row',
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  cancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  applyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  applyText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  disabled: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.82,
  },
});
