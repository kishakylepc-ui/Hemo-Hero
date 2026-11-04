import {
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, {
  Circle,
  Polyline,
} from 'react-native-svg';

// =======================================================
// ANALYTICS CHARTS
//
// Line graphs, column charts (grouped or stacked) and a
// segmented bar, for web and iPad. Hovering, focusing or
// tapping shows the values, and line and column charts can
// switch to a table.
// =======================================================

// The portal's own colors, so a chart means what the rest of
// the screen means: green is good, red is bad, orange is waiting.
export const CHART_COLORS = {
  blue: '#4A8CFF',
  orange: '#F3A34A',
  green: '#35C982',
  gray: '#6E7E9C',
  red: '#EF3340',
};

const INK = {
  primary: '#FFFFFF',
  secondary: '#B7C1D8',
  muted: '#7F889F',
  grid: '#1B2A47',
  baseline: '#243554',
  wash: 'rgba(255,255,255,0.05)',
  tooltip: '#16223E',
  tooltipBorder: '#2C3E63',
  // The card behind the charts: the ring around each point.
  surface: '#091126',
};

// Room above and below the plot, so a point on the top or
// bottom line isn't cut in half.
const LINE_PADDING = 8;

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type ChartBand = {
  key: string;
  // Under the column, e.g. "Oct 5".
  label: string;
  // In the tooltip and table, e.g. "Oct 5 to Oct 11".
  title: string;
  values: Record<string, number>;
};

// Clean round ticks, in whole numbers.
function getScale(
  highest: number
) {
  if (highest <= 0) {
    return {
      top: 4,
      ticks: [0, 1, 2, 3, 4],
    };
  }

  const rough = highest / 4;

  const power =
    10 **
    Math.floor(
      Math.log10(rough)
    );

  const step = Math.max(
    1,
    [1, 2, 5, 10]
      .map(item => item * power)
      .find(item => item >= rough) ??
      10 * power
  );

  const top =
    Math.ceil(highest / step) * step;

  const ticks: number[] = [];

  for (
    let tick = 0;
    tick <= top;
    tick += step
  ) {
    ticks.push(tick);
  }

  return {
    top,
    ticks,
  };
}

function formatCount(
  value: number
) {
  return value.toLocaleString('en-US');
}

// White or near-black text, whichever reads better on the fill.
function getInkOn(
  hex: string
) {
  const toLinear = (start: number) => {
    const channel =
      parseInt(hex.slice(start, start + 2), 16) / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * toLinear(1) +
    0.7152 * toLinear(3) +
    0.0722 * toLinear(5);

  return (1.05) / (luminance + 0.05) >=
    (luminance + 0.05) / 0.05
    ? '#FFFFFF'
    : '#0B0B0B';
}

// =======================================================
// LEGEND
// =======================================================

export function ChartLegend({
  items,
  line = false,
  scale,
  fontScale,
}: {
  items: {
    label: string;
    color: string;
  }[];
  // A short line for line graphs, a square for bars.
  line?: boolean;
  scale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.legend,

        {
          columnGap: 14 * scale,
          rowGap: 4 * scale,
        },
      ]}
    >
      {items.map(item => (
        <View
          key={item.label}
          style={[
            styles.legendItem,

            {
              gap: 6 * scale,
            },
          ]}
        >
          <View
            style={{
              width: (line ? 14 : 10) * scale,
              height: line ? 2 : 10 * scale,
              borderRadius: line ? 1 : 2,
              backgroundColor: item.color,
            }}
          />

          <Text
            style={[
              styles.legendText,

              {
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// =======================================================
// LINE LAYER
//
// Straight lines between the weeks, so the chart never shows
// a value that isn't real. Only the highest and latest points
// carry a number; hovering shows the rest.
// =======================================================

function LineLayer({
  series,
  bands,
  top,
  width,
  height,
  activeIndex,
  fontScale,
}: {
  series: ChartSeries[];
  bands: ChartBand[];
  top: number;
  width: number;
  height: number;
  activeIndex: number | null;
  fontScale: number;
}) {
  const xOf = (index: number) =>
    ((index + 0.5) / bands.length) * width;

  const yOf = (value: number) =>
    height * (1 - value / top);

  const labels: {
    key: string;
    x: number;
    y: number;
    value: number;
    below: boolean;
  }[] = [];

  series.forEach(item => {
    const values = bands.map(
      band => band.values[item.key] || 0
    );

    const most = Math.max(0, ...values);

    const last = values.length - 1;

    [
      most > 0
        ? values.indexOf(most)
        : -1,
      last,
    ].forEach(index => {
      if (index < 0) {
        return;
      }

      const y = yOf(values[index]);

      // Two numbers on one week: the lower one goes under its
      // point, and an identical one isn't repeated.
      const near = labels.find(
        label =>
          label.x === xOf(index) &&
          Math.abs(label.y - y) < 20
      );

      if (
        near &&
        near.value === values[index]
      ) {
        return;
      }

      if (
        labels.some(
          label =>
            label.key ===
            `${item.key}-${index}`
        )
      ) {
        return;
      }

      labels.push({
        key: `${item.key}-${index}`,
        x: xOf(index),
        y,
        value: values[index],
        below:
          Boolean(near) &&
          y > (near?.y ?? 0),
      });
    });
  });

  return (
    <View style={styles.lineLayer}>
      <Svg
        width={width}
        height={height + LINE_PADDING * 2}
        style={{
          position: 'absolute',
          top: -LINE_PADDING,
          left: 0,
        }}
      >
        {series.map(item => (
          <Polyline
            key={item.key}
            points={bands
              .map(
                (band, index) =>
                  `${xOf(index)},${
                    yOf(band.values[item.key] || 0) +
                    LINE_PADDING
                  }`
              )
              .join(' ')}
            fill="none"
            stroke={item.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {series.map(item =>
          bands.map((band, index) => (
            <Circle
              key={`${item.key}-${band.key}`}
              cx={xOf(index)}
              cy={
                yOf(band.values[item.key] || 0) +
                LINE_PADDING
              }
              r={activeIndex === index ? 5.5 : 4}
              fill={item.color}
              stroke={INK.surface}
              strokeWidth={2}
            />
          ))
        )}
      </Svg>

      {labels.map(label => (
        <Text
          key={label.key}
          numberOfLines={1}
          style={[
            styles.lineLabel,

            {
              left: label.x - 22,
              top: label.below
                ? label.y + 8
                : label.y - 8 - 14 * fontScale,
              fontSize: 11 * fontScale,
              lineHeight: 14 * fontScale,
            },
          ]}
        >
          {formatCount(label.value)}
        </Text>
      ))}
    </View>
  );
}

// =======================================================
// LINE OR COLUMN CHART
// =======================================================

export function BandChart({
  mode,
  series,
  bands,
  unit,
  labelEvery = 1,
  scale,
  fontScale,
}: {
  // line: a line graph. grouped: columns side by side.
  // stacked: columns one on top of the other.
  mode: 'line' | 'grouped' | 'stacked';
  series: ChartSeries[];
  bands: ChartBand[];
  // For the screen reader, e.g. "bags".
  unit: string;
  // Show every nth label under the columns.
  labelEvery?: number;
  scale: number;
  fontScale: number;
}) {
  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const [showTable, setShowTable] =
    useState(false);

  const [plotWidth, setPlotWidth] =
    useState(0);

  const plotHeight = 190 * scale;

  const totalOf = (band: ChartBand) =>
    series.reduce(
      (sum, item) =>
        sum + (band.values[item.key] || 0),
      0
    );

  const highest = Math.max(
    0,
    ...bands.flatMap(band =>
      mode === 'stacked'
        ? [totalOf(band)]
        : series.map(
            item => band.values[item.key] || 0
          )
    )
  );

  const { top, ticks } = getScale(highest);

  const percent = (value: number) =>
    `${(value / top) * 100}%` as const;

  // Only the tallest column of each series is labeled.
  const peakIndex = (key: string) => {
    const values = bands.map(
      band => band.values[key] || 0
    );

    const most = Math.max(0, ...values);

    return most > 0
      ? values.indexOf(most)
      : -1;
  };

  const stackPeak = (() => {
    const totals = bands.map(totalOf);

    const most = Math.max(0, ...totals);

    return most > 0
      ? totals.indexOf(most)
      : -1;
  })();

  const valueLabelStyle = [
    styles.valueLabel,

    {
      fontSize: 11 * fontScale,
      bottom: '100%' as const,
      marginBottom: 2,
    },
  ];

  const active =
    activeIndex === null
      ? null
      : bands[activeIndex];

  return (
    <View>
      <View
        style={[
          styles.chartTop,

          {
            marginTop: 16 * scale,
            marginBottom: 14 * scale,
          },
        ]}
      >
        <ChartLegend
          items={series}
          line={mode === 'line'}
          scale={scale}
          fontScale={fontScale}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setShowTable(current => !current)
          }
          hitSlop={8}
        >
          <Text
            style={[
              styles.toggle,

              {
                fontSize: 12 * fontScale,
              },
            ]}
          >
            {showTable
              ? 'View chart'
              : 'View table'}
          </Text>
        </Pressable>
      </View>

      {showTable ? (
        <ChartTable
          series={series}
          bands={bands}
          scale={scale}
          fontScale={fontScale}
        />
      ) : (
        <>
          <View
            style={[
              styles.plotRow,

              {
                marginTop: 16 * scale,
              },
            ]}
          >
            {/* Y AXIS */}

            <View
              style={{
                width: 30 * scale,
                height: plotHeight,
              }}
            >
              {ticks.map(tick => (
                <Text
                  key={tick}
                  style={[
                    styles.tick,

                    {
                      bottom: percent(tick),
                      fontSize: 11 * fontScale,
                      lineHeight: 14 * fontScale,
                      marginBottom: -7 * fontScale,
                    },
                  ]}
                >
                  {formatCount(tick)}
                </Text>
              ))}
            </View>

            <View
              onLayout={event =>
                setPlotWidth(
                  event.nativeEvent.layout.width
                )
              }
              style={[
                styles.plot,

                {
                  height: plotHeight,
                },
              ]}
            >
              {/* GRID */}

              {ticks.map(tick => (
                <View
                  key={tick}
                  style={[
                    styles.gridLine,

                    {
                      bottom: percent(tick),
                      backgroundColor:
                        tick === 0
                          ? INK.baseline
                          : INK.grid,
                    },
                  ]}
                />
              ))}

              {mode === 'line' && plotWidth > 0 ? (
                <LineLayer
                  series={series}
                  bands={bands}
                  top={top}
                  width={plotWidth}
                  height={plotHeight}
                  activeIndex={activeIndex}
                  fontScale={fontScale}
                />
              ) : null}

              {/* COLUMNS, OR THE HOVER AREAS OVER THE LINES */}

              <View style={styles.bands}>
                {bands.map((band, index) => {
                  const summary = series
                    .map(
                      item =>
                        `${item.label} ${band.values[item.key] || 0}`
                    )
                    .join(', ');

                  return (
                    <Pressable
                      key={band.key}
                      accessibilityLabel={`${band.title}: ${summary} ${unit}`}
                      onHoverIn={() =>
                        setActiveIndex(index)
                      }
                      onHoverOut={() =>
                        setActiveIndex(null)
                      }
                      onFocus={() =>
                        setActiveIndex(index)
                      }
                      onBlur={() =>
                        setActiveIndex(null)
                      }
                      onPress={() =>
                        setActiveIndex(current =>
                          current === index
                            ? null
                            : index
                        )
                      }
                      style={[
                        styles.band,

                        activeIndex === index &&
                          mode !== 'line' &&
                          styles.bandActive,
                      ]}
                    >
                      {mode === 'line' ? (
                        activeIndex === index ? (
                          <View style={styles.crosshair} />
                        ) : null
                      ) : mode === 'grouped' ? (
                        <View style={styles.group}>
                          {series.map(item => {
                            const value =
                              band.values[item.key] || 0;

                            return (
                              <View
                                key={item.key}
                                style={[
                                  styles.bar,

                                  {
                                    maxWidth: 24 * scale,
                                    height: percent(value),
                                    minHeight:
                                      value > 0
                                        ? 3
                                        : 0,
                                    backgroundColor:
                                      value > 0
                                        ? item.color
                                        : 'transparent',
                                  },
                                ]}
                              >
                                {peakIndex(item.key) === index ? (
                                  <Text
                                    numberOfLines={1}
                                    style={valueLabelStyle}
                                  >
                                    {formatCount(value)}
                                  </Text>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.stack,

                            {
                              maxWidth: 24 * scale,
                            },
                          ]}
                        >
                          {stackPeak === index ? (
                            <View
                              style={[
                                styles.stackPeak,

                                {
                                  height: percent(
                                    totalOf(band)
                                  ),
                                },
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={valueLabelStyle}
                              >
                                {formatCount(
                                  totalOf(band)
                                )}
                              </Text>
                            </View>
                          ) : null}

                          {[...series]
                            .reverse()
                            .filter(
                              item =>
                                (band.values[item.key] || 0) > 0
                            )
                            .map(
                              (item, order) => (
                                <View
                                  key={item.key}
                                  style={[
                                    styles.segment,

                                    {
                                      height: percent(
                                        band.values[item.key] || 0
                                      ),
                                      minHeight: 3,
                                      backgroundColor:
                                        item.color,
                                    },

                                    order === 0
                                      ? styles.segmentTop
                                      : styles.segmentGap,
                                  ]}
                                />
                              )
                            )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* TOOLTIP */}

              {active && activeIndex !== null ? (
                <View
                  style={[
                    styles.tooltip,

                    {
                      width: 205 * scale,
                      padding: 10 * scale,
                      borderRadius: 10 * scale,
                      gap: 5 * scale,
                    },

                    activeIndex <
                    bands.length / 2
                      ? {
                          left: `${
                            ((activeIndex + 1) /
                              bands.length) *
                            100
                          }%`,
                          marginLeft: 6,
                        }
                      : {
                          right: `${
                            ((bands.length -
                              activeIndex) /
                              bands.length) *
                            100
                          }%`,
                          marginRight: 6,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.tooltipTitle,

                      {
                        fontSize: 11.5 * fontScale,
                      },
                    ]}
                  >
                    {active.title}
                  </Text>

                  {series.map(item => (
                    <View
                      key={item.key}
                      style={[
                        styles.tooltipRow,

                        {
                          gap: 7 * scale,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 12 * scale,
                          height: 2,
                          backgroundColor:
                            item.color,
                        }}
                      />

                      <Text
                        style={[
                          styles.tooltipValue,

                          {
                            fontSize: 13 * fontScale,
                          },
                        ]}
                      >
                        {formatCount(
                          active.values[item.key] || 0
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.tooltipLabel,

                          {
                            fontSize: 11.5 * fontScale,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* X AXIS */}

          <View
            style={[
              styles.xAxis,

              {
                marginLeft: 30 * scale,
                marginTop: 7 * scale,
              },
            ]}
          >
            {bands.map((band, index) => (
              <View
                key={band.key}
                style={styles.xCell}
              >
                {(bands.length - 1 - index) %
                  labelEvery ===
                0 ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.xLabel,

                      {
                        fontSize: 11 * fontScale,
                      },
                    ]}
                  >
                    {band.label}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// =======================================================
// TABLE VIEW
// =======================================================

function ChartTable({
  series,
  bands,
  scale,
  fontScale,
}: {
  series: ChartSeries[];
  bands: ChartBand[];
  scale: number;
  fontScale: number;
}) {
  const cell = {
    fontSize: 12.5 * fontScale,
  };

  return (
    <View>
      <View
        style={[
          styles.tableRow,

          {
            paddingVertical: 7 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.tableHead,
            styles.tableFirst,
            cell,
          ]}
        />

        {series.map(item => (
          <Text
            key={item.key}
            style={[
              styles.tableHead,
              styles.tableNumber,
              cell,
            ]}
          >
            {item.label}
          </Text>
        ))}
      </View>

      {bands.map(band => (
        <View
          key={band.key}
          style={[
            styles.tableRow,

            {
              paddingVertical: 6 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.tableCell,
              styles.tableFirst,
              cell,
            ]}
          >
            {band.title}
          </Text>

          {series.map(item => (
            <Text
              key={item.key}
              style={[
                styles.tableCell,
                styles.tableNumber,
                cell,
              ]}
            >
              {formatCount(
                band.values[item.key] || 0
              )}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// =======================================================
// SEGMENTED BAR
//
// How one whole splits. Each part's share prints on it where
// it fits; hover, focus or tap gives the name and amount.
// =======================================================

export function SegmentedBar({
  label,
  parts,
  scale,
  fontScale,
}: {
  label: string;
  parts: {
    label: string;
    value: number;
    color: string;
  }[];
  scale: number;
  fontScale: number;
}) {
  const [activeLabel, setActiveLabel] =
    useState<string | null>(null);

  const total = parts.reduce(
    (sum, part) => sum + part.value,
    0
  );

  const shareOf = (value: number) =>
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  const active = parts.find(
    part => part.label === activeLabel
  );

  return (
    <View>
      <View
        style={[
          styles.segmentHead,

          {
            marginBottom: 7 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.segmentTitle,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {label}
        </Text>

        {/* Reads the hovered part, or the total. */}
        <Text
          numberOfLines={1}
          style={[
            styles.segmentReadout,

            {
              fontSize: 12 * fontScale,
            },
          ]}
        >
          {active
            ? `${active.label}: ${formatCount(active.value)} (${shareOf(active.value)}%)`
            : `${formatCount(total)} total`}
        </Text>
      </View>

      {total > 0 ? (
        <View
          style={[
            styles.segments,

            {
              height: 28,
            },
          ]}
        >
          {parts
            .filter(part => part.value > 0)
            .map(part => {
              const share = shareOf(part.value);

              return (
                <Pressable
                  key={part.label}
                  accessibilityLabel={`${part.label}: ${part.value}, ${share} percent`}
                  onHoverIn={() =>
                    setActiveLabel(part.label)
                  }
                  onHoverOut={() =>
                    setActiveLabel(null)
                  }
                  onFocus={() =>
                    setActiveLabel(part.label)
                  }
                  onBlur={() =>
                    setActiveLabel(null)
                  }
                  onPress={() =>
                    setActiveLabel(current =>
                      current === part.label
                        ? null
                        : part.label
                    )
                  }
                  style={[
                    styles.block,

                    {
                      flexGrow: part.value,
                      backgroundColor: part.color,
                      paddingHorizontal: 7 * scale,
                    },
                  ]}
                >
                  {share >= 12 ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.blockText,

                        {
                          fontSize: 12 * fontScale,
                          color: getInkOn(part.color),
                        },
                      ]}
                    >
                      {`${share}%`}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
        </View>
      ) : (
        <View
          style={[
            styles.segmentsEmpty,

            {
              height: 28,
            },
          ]}
        />
      )}

      <View
        style={{
          marginTop: 8 * scale,
        }}
      >
        <ChartLegend
          items={parts}
          scale={scale}
          fontScale={fontScale}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  legend: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendText: {
    color: INK.secondary,
    fontFamily: 'Inter_500Medium',
  },

  toggle: {
    color: INK.secondary,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'underline',
  },

  plotRow: {
    flexDirection: 'row',
  },

  plot: {
    flex: 1,
    position: 'relative',
  },

  tick: {
    position: 'absolute',
    right: 8,
    color: INK.muted,
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },

  bands: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },

  band: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bandActive: {
    backgroundColor: INK.wash,
  },

  lineLayer: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },

  lineLabel: {
    position: 'absolute',
    width: 44,
    textAlign: 'center',
    color: INK.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },

  // Marks the week being read.
  crosshair: {
    width: 1,
    height: '100%',
    backgroundColor: INK.tooltipBorder,
  },

  group: {
    width: '74%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },

  bar: {
    flex: 1,
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  valueLabel: {
    position: 'absolute',
    alignSelf: 'center',
    width: 44,
    textAlign: 'center',
    color: INK.secondary,
    fontFamily: 'Inter_600SemiBold',
  },

  stack: {
    width: '62%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },

  stackPeak: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },

  segment: {
    width: '100%',
  },

  segmentTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  segmentGap: {
    marginTop: 2,
  },

  tooltip: {
    position: 'absolute',
    top: 0,
    zIndex: 5,
    borderWidth: 1,
    borderColor: INK.tooltipBorder,
    backgroundColor: INK.tooltip,
    pointerEvents: 'none',
  },

  tooltipTitle: {
    color: INK.muted,
    fontFamily: 'Inter_500Medium',
  },

  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tooltipValue: {
    color: INK.primary,
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },

  tooltipLabel: {
    flex: 1,
    color: INK.secondary,
    fontFamily: 'Inter_400Regular',
  },

  xAxis: {
    flexDirection: 'row',
  },

  xCell: {
    flex: 1,
    alignItems: 'center',
  },

  xLabel: {
    color: INK.muted,
    fontFamily: 'Inter_400Regular',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: INK.grid,
  },

  tableFirst: {
    flex: 2,
  },

  tableNumber: {
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  tableHead: {
    color: INK.muted,
    fontFamily: 'Inter_600SemiBold',
  },

  tableCell: {
    color: INK.secondary,
    fontFamily: 'Inter_400Regular',
  },

  segmentHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },

  segmentTitle: {
    color: INK.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  segmentReadout: {
    flexShrink: 1,
    color: INK.muted,
    fontFamily: 'Inter_400Regular',
    fontVariant: ['tabular-nums'],
  },

  segments: {
    flexDirection: 'row',
    gap: 2,
  },

  segmentsEmpty: {
    borderRadius: 4,
    backgroundColor: INK.grid,
  },

  block: {
    flexBasis: 0,
    minWidth: 3,
    justifyContent: 'center',
    borderRadius: 4,
  },

  blockText: {
    fontFamily: 'Inter_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
});
