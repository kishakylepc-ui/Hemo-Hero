const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// ANALYTICS TRENDS
//
// Weekly counts for the charts on the Analytics screen. Weeks
// start on Monday, Philippine time.
// ============================================================

const DEFAULT_WEEKS =
  12;

const MIN_WEEKS =
  4;

const MAX_WEEKS =
  26;

const DAY_MS =
  24 * 60 * 60 * 1000;

const WEEK_MS =
  7 * DAY_MS;

const MANILA_OFFSET_MS =
  8 * 60 * 60 * 1000;

const PAGE_SIZE =
  1000;

// This week's Monday as a Philippine calendar date, in
// milliseconds (the date's midnight, read as UTC).
function getWeekStart(
  time
) {
  const local =
    new Date(
      time +
        MANILA_OFFSET_MS
    );

  const daysSinceMonday =
    (local.getUTCDay() + 6) % 7;

  return Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() -
      daysSinceMonday
  );
}

function toDateText(
  time
) {
  return new Date(time)
    .toISOString()
    .slice(0, 10);
}

// When the first week begins, for the database queries.
function getRangeStart(
  weekCount,
  now = Date.now()
) {
  return new Date(
    getWeekStart(now) -
      (weekCount - 1) * WEEK_MS -
      MANILA_OFFSET_MS
  ).toISOString();
}

// One row per week, oldest first. Weeks with nothing still
// appear, so the charts show the gaps.
function buildTrendWeeks(
  {
    requests = [],
    donations = [],
    activity = [],
  },
  weekCount,
  now = Date.now()
) {
  const thisWeek =
    getWeekStart(now);

  const weeks =
    new Map();

  for (
    let index = weekCount - 1;
    index >= 0;
    index -= 1
  ) {
    const start =
      thisWeek -
      index * WEEK_MS;

    weeks.set(
      start,
      {
        start:
          toDateText(start),

        end:
          toDateText(
            start +
              6 * DAY_MS
          ),

        requests:
          0,

        donations:
          0,

        activity_successful:
          0,

        activity_failed:
          0,
      }
    );
  }

  const addTo = (
    value,
    field
  ) => {
    const time =
      Date.parse(value);

    if (
      Number.isNaN(time)
    ) {
      return;
    }

    const week =
      weeks.get(
        getWeekStart(time)
      );

    if (week) {
      week[field] += 1;
    }
  };

  requests.forEach(row =>
    addTo(
      row.created_at,
      'requests'
    )
  );

  donations.forEach(row =>
    addTo(
      row.donated_at,
      'donations'
    )
  );

  activity.forEach(row =>
    addTo(
      row.created_at,
      row.success
        ? 'activity_successful'
        : 'activity_failed'
    )
  );

  return [
    ...weeks.values(),
  ];
}

// Supabase returns at most 1000 rows per query.
async function readAllRows(
  buildQuery
) {
  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const {
      data,
      error,
    } =
      await buildQuery()
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );

    if (error) {
      throw error;
    }

    rows.push(
      ...(data || [])
    );

    if (
      (data || []).length <
      PAGE_SIZE
    ) {
      return rows;
    }
  }
}

// GET /api/admin/analytics/trends?weeks=12
async function getAnalyticsTrends(
  req,
  res
) {
  try {
    const asked =
      Number(
        req.query?.weeks
      );

    const weekCount =
      Number.isInteger(asked)
        ? Math.min(
            Math.max(
              asked,
              MIN_WEEKS
            ),
            MAX_WEEKS
          )
        : DEFAULT_WEEKS;

    const since =
      getRangeStart(
        weekCount
      );

    const [
      requests,
      donations,
      activity,
    ] =
      await Promise.all([
        readAllRows(() =>
          supabaseAdmin
            .from(
              'blood_requests'
            )
            .select(
              'created_at'
            )
            .gte(
              'created_at',
              since
            )
            .order(
              'created_at'
            )
        ),

        readAllRows(() =>
          supabaseAdmin
            .from(
              'blood_donations'
            )
            .select(
              'donated_at'
            )
            .neq(
              'status',
              'rejected'
            )
            .gte(
              'donated_at',
              since
            )
            .order(
              'donated_at'
            )
        ),

        readAllRows(() =>
          supabaseAdmin
            .from(
              'activity_logs'
            )
            .select(
              'created_at,success'
            )
            .gte(
              'created_at',
              since
            )
            .order(
              'created_at'
            )
        ),
      ]);

    return res
      .status(200)
      .json({
        weeks:
          buildTrendWeeks(
            {
              requests,
              donations,
              activity,
            },
            weekCount
          ),
      });
  } catch (error) {
    console.error(
      'ADMIN ANALYTICS TRENDS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load analytics trends.',
      });
  }
}

module.exports = {
  buildTrendWeeks,
  getAnalyticsTrends,
  getRangeStart,
};
