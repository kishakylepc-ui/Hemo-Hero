const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// DONOR TRACK RECORD
//
// For requesters choosing a donor: how many donations the
// donor has completed through Hemo-Hero, and how requesters
// rated them (donation_feedback written by the requester about
// the donor).
//
// Returns a Map of donorId -> { donations_count,
// ratings_count, average_rating }. Never throws: on a lookup
// error the stats are simply left out.
// ============================================================

function emptyStats() {
  return {
    donations_count: 0,
    ratings_count: 0,
    average_rating: null
  };
}

async function getDonorStats(
  donorIds
) {
  const ids = [
    ...new Set(
      (donorIds || []).filter(Boolean)
    )
  ];

  const stats =
    new Map(
      ids.map(id => [
        id,
        emptyStats()
      ])
    );

  if (!ids.length) {
    return stats;
  }

  try {
    const [
      donationsResult,
      feedbackResult
    ] =
      await Promise.all([
        supabaseAdmin
          .from(
            'blood_donations'
          )
          .select(
            'donor_id'
          )
          .in(
            'donor_id',
            ids
          )
          .eq(
            'status',
            'completed'
          ),

        supabaseAdmin
          .from(
            'donation_feedback'
          )
          .select(
            'to_user_id,rating'
          )
          .in(
            'to_user_id',
            ids
          )
          .eq(
            'from_role',
            'requester'
          )
      ]);

    if (donationsResult.error) {
      console.error(
        'DONOR STATS DONATIONS ERROR:',
        donationsResult.error
      );
    } else {
      for (const row of donationsResult.data || []) {
        const entry =
          stats.get(row.donor_id);

        if (entry) {
          entry.donations_count += 1;
        }
      }
    }

    if (feedbackResult.error) {
      console.error(
        'DONOR STATS FEEDBACK ERROR:',
        feedbackResult.error
      );
    } else {
      const totals =
        new Map();

      for (const row of feedbackResult.data || []) {
        const total =
          totals.get(row.to_user_id) ||
          { sum: 0, count: 0 };

        total.sum +=
          Number(row.rating) || 0;

        total.count += 1;

        totals.set(
          row.to_user_id,
          total
        );
      }

      for (const [donorId, total] of totals) {
        const entry =
          stats.get(donorId);

        if (entry && total.count) {
          entry.ratings_count =
            total.count;

          entry.average_rating =
            Math.round(
              (total.sum / total.count) * 10
            ) / 10;
        }
      }
    }
  } catch (error) {
    console.error(
      'DONOR STATS ERROR:',
      error
    );
  }

  return stats;
}

module.exports = {
  getDonorStats
};
