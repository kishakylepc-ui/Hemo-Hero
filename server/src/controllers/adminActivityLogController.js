const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// HELPERS
// ============================================================

function cleanText(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function parsePositiveInteger(
  value,
  fallback
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(
      number
    ) ||
    number < 1
  ) {
    return fallback;
  }

  return number;
}

// ============================================================
// GET /api/admin/activity-logs
//
// ADMIN ONLY
//
// Query parameters:
//
// page
// limit
// action
// module
// success
// user_email
//
// Example:
// /api/admin/activity-logs?page=1&limit=25
// ============================================================

async function getActivityLogs(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const requestedLimit =
      parsePositiveInteger(
        req.query.limit,
        25
      );

    const limit =
      Math.min(
        requestedLimit,
        100
      );

    const from =
      (page - 1) *
      limit;

    const to =
      from +
      limit -
      1;

    // --------------------------------------------------------
    // FILTERS
    // --------------------------------------------------------

    const action =
      cleanText(
        req.query.action
      );

    const moduleName =
      cleanText(
        req.query.module
      );

    const userEmail =
      cleanText(
        req.query.user_email
      ).toLowerCase();

    const successParam =
      cleanText(
        req.query.success
      ).toLowerCase();

    // Date range: from (included) and to (not included), as ISO
    // times. The portal sends the start of the first day and
    // the start of the day after the last one, in its timezone.
    const dateFrom =
      cleanText(
        req.query.from
      );

    const dateTo =
      cleanText(
        req.query.to
      );

    for (const value of [
      dateFrom,
      dateTo,
    ]) {
      if (
        value &&
        !Number.isFinite(
          Date.parse(value)
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid date filter.',

            code:
              'INVALID_DATE_FILTER',
          });
      }
    }

    if (
      dateFrom &&
      dateTo &&
      Date.parse(dateFrom) >=
        Date.parse(dateTo)
    ) {
      return res
        .status(400)
        .json({
          error:
            'The start date must be before the end date.',

          code:
            'INVALID_DATE_FILTER',
        });
    }

    let successFilter =
      null;

    if (
      successParam ===
      'true'
    ) {
      successFilter =
        true;
    }

    if (
      successParam ===
      'false'
    ) {
      successFilter =
        false;
    }

    // --------------------------------------------------------
    // QUERY
    // --------------------------------------------------------

    let query =
      supabaseAdmin
        .from(
          'activity_logs'
        )
        .select(
          `
            id,
            user_id,
            user_email,
            user_role,
            action,
            module,
            http_method,
            route,
            status_code,
            success,
            description,
            entity_type,
            entity_id,
            ip_address,
            user_agent,
            metadata,
            created_at
          `,
          {
            count:
              'exact',
          }
        );

    // --------------------------------------------------------
    // ACTION FILTER
    // --------------------------------------------------------

    if (
      action
    ) {
      query =
        query.eq(
          'action',
          action
        );
    }

    // --------------------------------------------------------
    // MODULE FILTER
    // --------------------------------------------------------

    if (
      moduleName
    ) {
      query =
        query.eq(
          'module',
          moduleName
        );
    }

    // --------------------------------------------------------
    // SUCCESS FILTER
    // --------------------------------------------------------

    if (
      successFilter !==
      null
    ) {
      query =
        query.eq(
          'success',
          successFilter
        );
    }

    // --------------------------------------------------------
    // EMAIL FILTER
    // --------------------------------------------------------

    if (
      userEmail
    ) {
      query =
        query.ilike(
          'user_email',
          `%${userEmail}%`
        );
    }

    // --------------------------------------------------------
    // DATE FILTER
    // --------------------------------------------------------

    if (
      dateFrom
    ) {
      query =
        query.gte(
          'created_at',
          new Date(
            dateFrom
          ).toISOString()
        );
    }

    if (
      dateTo
    ) {
      query =
        query.lt(
          'created_at',
          new Date(
            dateTo
          ).toISOString()
        );
    }

    // --------------------------------------------------------
    // ORDER + PAGINATION
    // --------------------------------------------------------

    query =
      query
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .range(
          from,
          to
        );

    const {
      data,
      error,
      count,
    } =
      await query;

    if (
      error
    ) {
      console.error(
        'GET ACTIVITY LOGS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load activity logs.',

          code:
            'ACTIVITY_LOGS_LOAD_FAILED',
        });
    }

    const total =
      Number(
        count || 0
      );

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total /
              limit
          );

    return res
      .status(200)
      .json({
        logs:
          data || [],

        pagination: {
          page,

          limit,

          total,

          total_pages:
            totalPages,
        },

        filters: {
          action:
            action ||
            null,

          module:
            moduleName ||
            null,

          success:
            successFilter,

          user_email:
            userEmail ||
            null,
        },
      });
  } catch (
    error
  ) {
    console.error(
      'GET ACTIVITY LOGS CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load activity logs.',

        code:
          'ACTIVITY_LOGS_LOAD_FAILED',
      });
  }
}

// ============================================================
// GET /api/admin/activity-logs/summary
//
// ADMIN ONLY
// ============================================================

async function getActivityLogSummary(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // TOTAL LOGS
    // --------------------------------------------------------

    const {
      count:
        totalLogs,

      error:
        totalError,
    } =
      await supabaseAdmin
        .from(
          'activity_logs'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          }
        );

    if (
      totalError
    ) {
      console.error(
        'ACTIVITY LOG SUMMARY TOTAL ERROR:',
        totalError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load activity log summary.',

          code:
            'ACTIVITY_LOG_SUMMARY_FAILED',
        });
    }

    // --------------------------------------------------------
    // SUCCESSFUL ACTIVITIES
    // --------------------------------------------------------

    const {
      count:
        successfulLogs,

      error:
        successError,
    } =
      await supabaseAdmin
        .from(
          'activity_logs'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          }
        )
        .eq(
          'success',
          true
        );

    if (
      successError
    ) {
      console.error(
        'ACTIVITY LOG SUMMARY SUCCESS ERROR:',
        successError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load activity log summary.',

          code:
            'ACTIVITY_LOG_SUMMARY_FAILED',
        });
    }

    // --------------------------------------------------------
    // FAILED ACTIVITIES
    // --------------------------------------------------------

    const {
      count:
        failedLogs,

      error:
        failedError,
    } =
      await supabaseAdmin
        .from(
          'activity_logs'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          }
        )
        .eq(
          'success',
          false
        );

    if (
      failedError
    ) {
      console.error(
        'ACTIVITY LOG SUMMARY FAILED ERROR:',
        failedError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load activity log summary.',

          code:
            'ACTIVITY_LOG_SUMMARY_FAILED',
        });
    }

    return res
      .status(200)
      .json({
        total:
          Number(
            totalLogs ||
              0
          ),

        successful:
          Number(
            successfulLogs ||
              0
          ),

        failed:
          Number(
            failedLogs ||
              0
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'GET ACTIVITY LOG SUMMARY ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load activity log summary.',

        code:
          'ACTIVITY_LOG_SUMMARY_FAILED',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getActivityLogs,
  getActivityLogSummary,
};