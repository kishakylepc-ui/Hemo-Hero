const {
  supabaseAdmin
} = require('../config/supabase');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

// ============================================================
// ADMIN REPORT CONTROLLER
//
// Admin Portal "Issues" module.
//
// Reviews feedback and reports submitted by users from a
// donation coordination conversation (public.user_reports).
//
// Routes are protected by requireAuth + requireAdmin in
// adminReportRoutes.js.
// ============================================================

// ============================================================
// CONSTANTS
// ============================================================

const REPORT_STATUSES = [
  'open',
  'in_review',
  'resolved',
  'dismissed'
];

const REPORT_KINDS = [
  'feedback',
  'report'
];

const MAX_ADMIN_NOTE_LENGTH =
  2000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const USER_FIELDS = `
  id,
  email,
  first_name,
  middle_name,
  last_name,
  suffix,
  phone,
  city,
  province,
  blood_type,
  profile_photo_url,
  role,
  is_active
`;

// ============================================================
// HELPERS
// ============================================================

function cleanText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(
    value
  ).trim();
}

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(
      String(
        value ||
          ''
      ),
      10
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function getUserFullName(
  user
) {
  if (!user) {
    return '';
  }

  return [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix
  ]
    .filter(Boolean)
    .join(' ')
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

// ============================================================
// LOAD USERS
// ============================================================

async function getUsersByIds(
  userIds
) {
  const uniqueIds =
    [
      ...new Set(
        (
          userIds ||
          []
        ).filter(Boolean)
      )
    ];

  if (
    uniqueIds.length ===
    0
  ) {
    return new Map();
  }

  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select(
        USER_FIELDS
      )
      .in(
        'id',
        uniqueIds
      );

  if (error) {
    console.error(
      'ADMIN REPORT USER LOOKUP ERROR:',
      error
    );

    return new Map();
  }

  const map =
    new Map();

  (
    data ||
    []
  ).forEach(
    user => {
      map.set(
        user.id,
        {
          ...user,

          full_name:
            getUserFullName(
              user
            )
        }
      );
    }
  );

  return map;
}

// ============================================================
// ATTACH USERS TO REPORTS
// ============================================================

async function attachUsers(
  reports
) {
  const userMap =
    await getUsersByIds(
      reports.flatMap(
        report => [
          report.reporter_id,
          report.reported_user_id,
          report.reviewed_by
        ]
      )
    );

  return reports.map(
    report => ({
      ...report,

      reporter:
        userMap.get(
          report.reporter_id
        ) ||
        null,

      reported_user:
        userMap.get(
          report.reported_user_id
        ) ||
        null,

      reviewer:
        userMap.get(
          report.reviewed_by
        ) ||
        null
    })
  );
}

// ============================================================
// BUILD SUMMARY
// ============================================================

function buildReportSummary(
  rows
) {
  const reports =
    rows ||
    [];

  function countStatus(
    status
  ) {
    return reports.filter(
      report =>
        report.status ===
        status
    ).length;
  }

  return {
    total:
      reports.length,

    open:
      countStatus(
        'open'
      ),

    in_review:
      countStatus(
        'in_review'
      ),

    resolved:
      countStatus(
        'resolved'
      ),

    dismissed:
      countStatus(
        'dismissed'
      ),

    reports:
      reports.filter(
        report =>
          report.kind ===
          'report'
      ).length,

    feedback:
      reports.filter(
        report =>
          report.kind ===
          'feedback'
      ).length,

    // Reports (not feedback) still waiting for action.
    unresolved_reports:
      reports.filter(
        report =>
          report.kind ===
            'report' &&
          (
            report.status ===
              'open' ||
            report.status ===
              'in_review'
          )
      ).length
  };
}

// ============================================================
// SEARCH
// ============================================================

function reportMatchesSearch(
  report,
  search
) {
  if (!search) {
    return true;
  }

  const values = [
    report.id,
    report.kind,
    report.reason,
    report.details,
    report.status,
    report.reporter_email,
    report.reported_user_email,

    report.reporter?.email,
    report.reporter?.full_name,

    report.reported_user?.email,
    report.reported_user?.full_name
  ];

  return values.some(
    value =>
      cleanText(
        value
      )
        .toLowerCase()
        .includes(
          search
        )
  );
}

// ============================================================
// LOAD ONE REPORT WITH DETAILS
// ============================================================

async function loadReportDetails(
  reportId
) {
  const {
    data:
      report,
    error
  } =
    await supabaseAdmin
      .from(
        'user_reports'
      )
      .select(
        '*'
      )
      .eq(
        'id',
        reportId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'ADMIN REPORT DETAILS ERROR:',
      error
    );

    throw new Error(
      'Unable to retrieve report.'
    );
  }

  if (!report) {
    return null;
  }

  const [
    withUsers
  ] =
    await attachUsers([
      report
    ]);

  // ----------------------------------------------------------
  // RELATED BLOOD REQUEST
  // ----------------------------------------------------------

  let request =
    null;

  if (
    report.request_id
  ) {
    const {
      data:
        requestRow,
      error:
        requestError
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(`
          id,
          requester_id,
          blood_type,
          units_needed,
          facility_name,
          urgency,
          status,
          created_at
        `)
        .eq(
          'id',
          report.request_id
        )
        .maybeSingle();

    if (requestError) {
      console.error(
        'ADMIN REPORT REQUEST LOOKUP ERROR:',
        requestError
      );
    }

    request =
      requestRow ||
      null;
  }

  // ----------------------------------------------------------
  // HOW MANY REPORTS EXIST AGAINST THIS USER
  //
  // Helps the admin spot repeat behavior.
  // ----------------------------------------------------------

  let reportedUserReportCount =
    0;

  if (
    report.reported_user_id
  ) {
    const {
      count,
      error:
        countError
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        )
        .eq(
          'kind',
          'report'
        )
        .eq(
          'reported_user_id',
          report.reported_user_id
        );

    if (countError) {
      console.error(
        'ADMIN REPORT COUNT ERROR:',
        countError
      );
    }

    reportedUserReportCount =
      Number(
        count ||
          0
      );
  }

  return {
    ...withUsers,

    request,

    reported_user_report_count:
      reportedUserReportCount
  };
}

// ============================================================
// GET /api/admin/reports/summary
// ============================================================

async function getAdminReportSummary(
  req,
  res
) {
  try {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .select(
          'id, kind, status'
        );

    if (error) {
      console.error(
        'ADMIN REPORT SUMMARY ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load issue summary.'
        });
    }

    return res
      .status(200)
      .json({
        summary:
          buildReportSummary(
            data
          )
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN REPORT SUMMARY ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to load issue summary.'
      });
  }
}

// ============================================================
// GET /api/admin/reports
//
// Optional query:
// ?page=1
// &limit=20
// &status=all|open|in_review|resolved|dismissed
// &kind=all|feedback|report
// &search=text
// &user_id=<uuid>   issues filed by OR about this user
// ============================================================

async function getAdminReports(
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

    const limit =
      Math.min(
        parsePositiveInteger(
          req.query.limit,
          20
        ),
        100
      );

    // --------------------------------------------------------
    // FILTERS
    // --------------------------------------------------------

    const requestedStatus =
      cleanText(
        req.query.status
      ).toLowerCase();

    const status =
      REPORT_STATUSES.includes(
        requestedStatus
      )
        ? requestedStatus
        : 'all';

    const requestedKind =
      cleanText(
        req.query.kind
      ).toLowerCase();

    const kind =
      REPORT_KINDS.includes(
        requestedKind
      )
        ? requestedKind
        : 'all';

    const search =
      cleanText(
        req.query.search
      ).toLowerCase();

    // Optional: only issues involving one user
    // (filed BY them or filed ABOUT them).
    const requestedUserId =
      cleanText(
        req.query.user_id
      );

    const userId =
      UUID_PATTERN.test(
        requestedUserId
      )
        ? requestedUserId
        : '';

    // --------------------------------------------------------
    // LOAD ALL REPORTS
    //
    // Summary always describes the whole system.
    // --------------------------------------------------------

    const {
      data:
        rows,
      error
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .select(
          '*'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      console.error(
        'ADMIN GET REPORTS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve issues.'
        });
    }

    const allReports =
      rows ||
      [];

    const summary =
      buildReportSummary(
        allReports
      );

    // --------------------------------------------------------
    // STATUS / KIND FILTER
    // --------------------------------------------------------

    const filteredByFields =
      allReports.filter(
        report =>
          (
            status ===
              'all' ||
            report.status ===
              status
          ) &&
          (
            kind ===
              'all' ||
            report.kind ===
              kind
          ) &&
          (
            !userId ||
            report.reporter_id ===
              userId ||
            report.reported_user_id ===
              userId
          )
      );

    // --------------------------------------------------------
    // ATTACH USERS + SEARCH
    // --------------------------------------------------------

    const withUsers =
      await attachUsers(
        filteredByFields
      );

    const filtered =
      search
        ? withUsers.filter(
            report =>
              reportMatchesSearch(
                report,
                search
              )
          )
        : withUsers;

    // --------------------------------------------------------
    // PAGINATE
    // --------------------------------------------------------

    const total =
      filtered.length;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total /
              limit
          );

    const safePage =
      totalPages === 0
        ? 1
        : Math.min(
            page,
            totalPages
          );

    const start =
      (
        safePage -
        1
      ) *
      limit;

    return res
      .status(200)
      .json({
        summary,

        reports:
          filtered.slice(
            start,
            start +
              limit
          ),

        pagination: {
          page:
            safePage,

          limit,

          total,

          total_pages:
            totalPages
        },

        filters: {
          status,

          kind,

          search:
            search ||
            null,

          user_id:
            userId ||
            null
        }
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN GET REPORTS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/admin/reports/:id
// ============================================================

async function getAdminReportById(
  req,
  res
) {
  try {
    const reportId =
      cleanText(
        req.params.id
      );

    if (
      !UUID_PATTERN.test(
        reportId
      )
    ) {
      return res
        .status(404)
        .json({
          error:
            'Issue not found.'
        });
    }

    const report =
      await loadReportDetails(
        reportId
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            'Issue not found.'
        });
    }

    return res
      .status(200)
      .json({
        report
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN GET REPORT ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to retrieve issue.'
      });
  }
}

// ============================================================
// PATCH /api/admin/reports/:id
//
// Body (at least one field):
// {
//   status?:     'open' | 'in_review' | 'resolved' | 'dismissed',
//   admin_note?: string | null
// }
//
// Changing the status records who reviewed it and when.
// ============================================================

async function updateAdminReport(
  req,
  res
) {
  try {
    const reportId =
      cleanText(
        req.params.id
      );

    if (
      !UUID_PATTERN.test(
        reportId
      )
    ) {
      return res
        .status(404)
        .json({
          error:
            'Issue not found.'
        });
    }

    const body =
      req.body ||
      {};

    const hasStatus =
      Object.prototype.hasOwnProperty.call(
        body,
        'status'
      );

    const hasNote =
      Object.prototype.hasOwnProperty.call(
        body,
        'admin_note'
      );

    if (
      !hasStatus &&
      !hasNote
    ) {
      return res
        .status(400)
        .json({
          error:
            'Nothing to update.'
        });
    }

    // --------------------------------------------------------
    // CURRENT REPORT
    // --------------------------------------------------------

    const {
      data:
        existing,
      error:
        existingError
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .select(
          'id, status'
        )
        .eq(
          'id',
          reportId
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        'ADMIN UPDATE REPORT LOOKUP ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to update issue.'
        });
    }

    if (!existing) {
      return res
        .status(404)
        .json({
          error:
            'Issue not found.'
        });
    }

    // --------------------------------------------------------
    // BUILD UPDATE
    // --------------------------------------------------------

    const now =
      new Date().toISOString();

    const update = {
      updated_at:
        now
    };

    if (hasStatus) {
      const status =
        cleanText(
          body.status
        ).toLowerCase();

      if (
        !REPORT_STATUSES.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid status.'
          });
      }

      if (
        status !==
        existing.status
      ) {
        update.status =
          status;

        update.reviewed_by =
          req.dbUser.id;

        update.reviewed_at =
          now;
      }
    }

    if (hasNote) {
      const note =
        cleanText(
          body.admin_note
        );

      if (
        note.length >
        MAX_ADMIN_NOTE_LENGTH
      ) {
        return res
          .status(400)
          .json({
            error:
              `Admin note must not exceed ${MAX_ADMIN_NOTE_LENGTH} characters.`
          });
      }

      update.admin_note =
        note ||
        null;
    }

    // --------------------------------------------------------
    // SAVE
    // --------------------------------------------------------

    const {
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .update(
          update
        )
        .eq(
          'id',
          reportId
        );

    if (updateError) {
      console.error(
        'ADMIN UPDATE REPORT ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to update issue.'
        });
    }

    setActivityEntity(
      res,
      'user_report',
      reportId
    );

    const report =
      await loadReportDetails(
        reportId
      );

    return res
      .status(200)
      .json({
        message:
          'Issue updated.',

        report
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN UPDATE REPORT ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to update issue.'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAdminReportSummary,
  getAdminReports,
  getAdminReportById,
  updateAdminReport
};
