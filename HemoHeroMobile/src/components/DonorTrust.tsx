import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import {
  COLORS,
  FONTS,
  RADIUS,
  TEXT,
} from '../constants/theme';

import type { DonorStats } from '../lib/donorProfile';

// ============================================================
// DONOR TRUST
//
// Completed donations and the average rating from requesters,
// e.g. "3 donations · ★ 4.8 (2)". Shows "New donor" before the
// first completed donation. Renders nothing when the server
// did not send the figures.
// ============================================================

export default function DonorTrust({
  stats,
  style,
}: {
  stats: Partial<DonorStats> | null | undefined;
  style?: StyleProp<ViewStyle>;
}) {
  if (
    !stats ||
    typeof stats.donations_count !==
      'number'
  ) {
    return null;
  }

  const donations =
    stats.donations_count;

  const ratings =
    stats.ratings_count || 0;

  const average =
    stats.average_rating;

  const hasRating =
    ratings > 0 &&
    typeof average === 'number';

  if (
    donations === 0 &&
    !hasRating
  ) {
    return (
      <View style={[styles.row, style]}>
        <View style={[styles.chip, styles.newChip]}>
          <MaterialIcons
            name="fiber-new"
            size={14}
            color={COLORS.blue}
          />

          <Text style={[styles.chipText, styles.newText]}>
            New donor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <View style={styles.chip}>
        <MaterialIcons
          name="volunteer-activism"
          size={13}
          color={COLORS.redButton}
        />

        <Text style={styles.chipText}>
          {donations}{' '}
          {donations === 1
            ? 'donation'
            : 'donations'}
        </Text>
      </View>

      {hasRating ? (
        <View style={[styles.chip, styles.ratingChip]}>
          <MaterialIcons
            name="star"
            size={14}
            color={COLORS.orange}
          />

          <Text style={[styles.chipText, styles.ratingText]}>
            {(average as number).toFixed(1)}

            <Text style={styles.ratingCount}>
              {' '}({ratings})
            </Text>
          </Text>
        </View>
      ) : (
        <Text style={styles.noRating}>
          No ratings yet
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.pinkLight,
  },

  chipText: {
    fontFamily: FONTS.semiBold,
    fontSize: TEXT.tiny,
    color: COLORS.redButton,
  },

  ratingChip: {
    backgroundColor: COLORS.orangeLight,
  },

  ratingText: {
    color: COLORS.black,
  },

  ratingCount: {
    fontFamily: FONTS.body,
    color: COLORS.muted,
  },

  newChip: {
    backgroundColor: COLORS.blueLight,
  },

  newText: {
    color: COLORS.blue,
  },

  noRating: {
    fontFamily: FONTS.body,
    fontSize: TEXT.tiny,
    color: COLORS.lightMuted,
  },
});
