const {
  supabaseAdmin
} = require('../config/supabase');

const {
  isMissingMigration
} = require(
  '../services/accountReviewService'
);

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  createNotification,
  createNotifications
} = require(
  '../services/notificationService'
);

const {
  releaseDeactivatedAccount,
  describeRelease
} = require(
  '../services/accountReleaseService'
);

// ============================================================
// ADMIN REPORT CONTROLLER
//
// Admin Portal "Issues" module.
//
// Reviews feedback and reports submitted by users from a
// donation coordination conversation (public.user_reports).
//
// Closing an issue tells the person who submitted it, and a
// report about a person can end with a real action (warn or
// deactivate), saved in user_reports.action_taken.
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

const OPEN_STATUSES = [
  'open',
  'in_review'
];

// Actions an admin can take on a report about a person.
// Each one resolves the report.
const REPORT_ACTIONS = {
  warn:
    'warned',

  deactivate:
    'deactivated'
};

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

// Made from the request page (false request, asking for
// payment), not from a conversation. These are decided with
// Keep / Remove Request instead.
function isRequestReport(
  report
) {
  return (
    report.kind ===
      'report' &&
    Boolean(
      report.request_id
    ) &&
    !report.response_id
  );
}

function asSentence(
  text
) {
  const value =
    cleanText(
      text
    );

  return /[.!?]$/.test(
    value
  )
    ? value
    : `${value}.`;
}

// ============================================================
// TELL REPORTERS THEIR ISSUE WAS CLOSED
//
// Never includes the admin note (it can name the other
// person's penalty). One notification per reporter.
// ============================================================

function buildReviewedNotification(
  report,
  status
) {
  if (
    !report.reporter_id
  ) {
    return null;
  }

  const isFeedback =
    report.kind ===
    'feedback';

  let message =
    'An administrator read your feedback. Thank you for helping us improve Hemo-Hero.';

  if (!isFeedback) {
    message =
      status ===
      'resolved'
        ? 'We reviewed your report and took action. Thank you for helping keep Hemo-Hero safe.'
        : 'We reviewed your report and found nothing that breaks Hemo-Hero rules, so no action was taken. Thank you for letting us know.';
  }

  return {
    userId:
      report.reporter_id,

    type:
      'report_reviewed',

    title:
      isFeedback
        ? 'Feedback Reviewed'
        : 'Report Reviewed',

    message,

    data: {
      report_id:
        report.id,

      report_kind:
        report.kind,

      status,

      request_id:
        report.request_id ||
        null,

      response_id:
        report.response_id ||
        null
    }
  };
}

// The chat behind a report can only be opened while the offer is
// accepted or released after a no-show. Otherwise (e.g. the
// donor's account was deactivated) the notification opens the
// request instead: the requester's page or the donor's view.
async function pointClosedChatsToRequest(
  rows,
  reports
) {
  const responseIds = [
    ...new Set(
      rows
        .map(
          row =>
            row.data.response_id
        )
        .filter(Boolean)
    )
  ];

  if (!responseIds.length) {
    return;
  }

  const {
    data: responses,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_request_responses'
      )
      .select(
        'id, status, donor_id'
      )
      .in(
        'id',
        responseIds
      );

  if (error) {
    console.error(
      'REVIEWED NOTIFICATION CHAT CHECK ERROR:',
      error
    );

    return;
  }

  const responseMap =
    new Map(
      (responses || []).map(
        response => [
          response.id,
          response
        ]
      )
    );

  rows.forEach(
    (row, index) => {
      const response =
        responseMap.get(
          row.data.response_id
        );

      if (
        !response ||
        response.status ===
          'accepted' ||
        response.status ===
          'no_show'
      ) {
        return;
      }

      row.data.response_id =
        null;

      row.data.recipient_role =
        response.donor_id ===
        reports[index].reporter_id
          ? 'donor'
          : 'requester';
    }
  );
}

async function notifyReporters(
  reports,
  status
) {
  const seen =
    new Set();

  const unique =
    (
      reports ||
      []
    ).filter(
      report => {
        if (
          !report.reporter_id ||
          seen.has(
            report.reporter_id
          )
        ) {
          return false;
        }

        seen.add(
          report.reporter_id
        );

        return true;
      }
    );

  const rows =
    unique.map(
      report =>
        buildReviewedNotification(
          report,
          status
        )
    );

  try {
    await pointClosedChatsToRequest(
      rows,
      unique
    );
  } catch (error) {
    console.error(
      'REVIEWED NOTIFICATION CHAT CHECK ERROR:',
      error
    );
  }

  // Never throws.
  await createNotifications(
    rows
  );
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
    report.action_taken,
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
          created_at,
          flagged_at,
          removed_at,
          removal_reason
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

  // ----------------------------------------------------------
  // NO-SHOWS AGAINST THIS USER / OPEN REPORTS ON THIS REQUEST
  // ----------------------------------------------------------

  let reportedUserNoShowCount =
    0;

  if (
    report.reported_user_id
  ) {
    const {
      count,
      error:
        noShowError
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
          'reason',
          'No-show'
        )
        .eq(
          'reported_user_id',
          report.reported_user_id
        );

    if (noShowError) {
      console.error(
        'ADMIN NO-SHOW COUNT ERROR:',
        noShowError
      );
    }

    reportedUserNoShowCount =
      Number(
        count ||
          0
      );
  }

  // ----------------------------------------------------------
  // WARNINGS ALREADY GIVEN TO THIS USER
  //
  // So the admin can decide between another warning and
  // deactivating the account.
  // ----------------------------------------------------------

  let reportedUserWarningCount =
    0;

  if (
    report.reported_user_id
  ) {
    const {
      count,
      error:
        warningError
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
          'action_taken',
          'warned'
        )
        .eq(
          'reported_user_id',
          report.reported_user_id
        );

    if (warningError) {
      console.error(
        'ADMIN WARNING COUNT ERROR:',
        warningError
      );
    }

    reportedUserWarningCount =
      Number(
        count ||
          0
      );
  }

  let requestReportCount =
    0;

  if (
    report.request_id &&
    !report.response_id
  ) {
    const {
      count,
      error:
        requestCountError
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
          'request_id',
          report.request_id
        )
        .is(
          'response_id',
          null
        )
        .in(
          'status',
          [
            'open',
            'in_review'
          ]
        );

    if (requestCountError) {
      console.error(
        'ADMIN REQUEST REPORT COUNT ERROR:',
        requestCountError
      );
    }

    requestReportCount =
      Number(
        count ||
          0
      );
  }

  return {
    ...withUsers,

    request,

    reported_user_report_count:
      reportedUserReportCount,

    reported_user_no_show_count:
      reportedUserNoShowCount,

    reported_user_warning_count:
      reportedUserWarningCount,

    // Open reports about the request itself (false request,
    // asking for payment). Only for request-level reports.
    request_report_count:
      requestReportCount
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
// Closing an open issue (resolved / dismissed) notifies the
// person who submitted it.
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
          'id, kind, status, reporter_id, request_id, response_id'
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

    if (
      (
        update.status ===
          'resolved' ||
        update.status ===
          'dismissed'
      ) &&
      OPEN_STATUSES.includes(
        existing.status
      )
    ) {
      await notifyReporters(
        [
          existing
        ],
        update.status
      );
    }

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
// POST /api/admin/reports/:id/action
//
// Body:
// {
//   action:     'warn' | 'deactivate',
//   admin_note: string (required)
// }
//
// Only for an open report about a person (from a coordination
// chat). Reports about a blood request use Keep / Remove
// Request instead.
//
// warn       -> the reported user receives the admin note as a
//               warning; this report is resolved.
// deactivate -> the reported user's account is deactivated
//               (they can no longer sign in); this report and
//               every other open chat report about them are
//               resolved.
//
// Either way the reporters are told their report was reviewed.
// ============================================================

async function takeAdminReportAction(
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

    const action =
      cleanText(
        req.body?.action
      ).toLowerCase();

    if (
      !Object.prototype.hasOwnProperty.call(
        REPORT_ACTIONS,
        action
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid action.'
        });
    }

    const actionTaken =
      REPORT_ACTIONS[
        action
      ];

    const note =
      cleanText(
        req.body?.admin_note
      );

    if (!note) {
      return res
        .status(400)
        .json({
          error:
            action ===
            'warn'
              ? 'Write the warning in the admin note first. The user will see it.'
              : 'Write the reason in the admin note first.'
        });
    }

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

    // --------------------------------------------------------
    // REPORT
    // --------------------------------------------------------

    const {
      data:
        report,
      error:
        reportError
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

    if (reportError) {
      console.error(
        'ADMIN REPORT ACTION LOOKUP ERROR:',
        reportError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load issue.'
        });
    }

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            'Issue not found.'
        });
    }

    if (
      report.kind !==
      'report'
    ) {
      return res
        .status(400)
        .json({
          error:
            'Only reports can end in a warning or deactivation. Resolve or dismiss feedback instead.'
        });
    }

    if (
      isRequestReport(
        report
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'This report is about a blood request. Use Keep Request or Remove Request.'
        });
    }

    if (
      !OPEN_STATUSES.includes(
        report.status
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'This issue is already closed. Reopen it first.'
        });
    }

    // --------------------------------------------------------
    // REPORTED USER
    // --------------------------------------------------------

    let target =
      null;

    if (
      report.reported_user_id
    ) {
      const {
        data:
          targetRow,
        error:
          targetError
      } =
        await supabaseAdmin
          .from(
            'users'
          )
          .select(
            'id, role, is_active'
          )
          .eq(
            'id',
            report.reported_user_id
          )
          .maybeSingle();

      if (targetError) {
        console.error(
          'ADMIN REPORT ACTION USER ERROR:',
          targetError
        );

        return res
          .status(500)
          .json({
            error:
              'Unable to load the reported user.'
          });
      }

      target =
        targetRow ||
        null;
    }

    if (!target) {
      return res
        .status(409)
        .json({
          error:
            'The reported account no longer exists.'
        });
    }

    if (
      target.role !==
      'user'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Administrator accounts cannot be warned or deactivated from an issue.'
        });
    }

    if (
      action ===
        'warn' &&
      target.is_active ===
        false
    ) {
      return res
        .status(409)
        .json({
          error:
            'This account is already deactivated.'
        });
    }

    setActivityEntity(
      res,
      'user_report',
      reportId
    );

    // --------------------------------------------------------
    // RESOLVE THIS REPORT
    //
    // Guarded on the status so two admins can't both act.
    // --------------------------------------------------------

    const now =
      new Date().toISOString();

    const {
      data:
        closedRows,
      error:
        closeError
    } =
      await supabaseAdmin
        .from(
          'user_reports'
        )
        .update({
          status:
            'resolved',

          action_taken:
            actionTaken,

          admin_note:
            note,

          reviewed_by:
            req.dbUser.id,

          reviewed_at:
            now,

          updated_at:
            now
        })
        .eq(
          'id',
          reportId
        )
        .in(
          'status',
          OPEN_STATUSES
        )
        .select(
          'id'
        );

    if (closeError) {
      console.error(
        'ADMIN REPORT ACTION CLOSE ERROR:',
        closeError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to update issue.'
        });
    }

    if (
      !closedRows?.length
    ) {
      return res
        .status(409)
        .json({
          error:
            'Another administrator already closed this issue.'
        });
    }

    // Puts the report back if the action itself fails.
    async function undoClose() {
      const {
        error:
          undoError
      } =
        await supabaseAdmin
          .from(
            'user_reports'
          )
          .update({
            status:
              report.status,

            action_taken:
              report.action_taken,

            admin_note:
              report.admin_note,

            reviewed_by:
              report.reviewed_by,

            reviewed_at:
              report.reviewed_at,

            updated_at:
              report.updated_at
          })
          .eq(
            'id',
            reportId
          );

      if (undoError) {
        console.error(
          'ADMIN REPORT ACTION UNDO ERROR:',
          undoError
        );
      }
    }

    // --------------------------------------------------------
    // WARN
    // --------------------------------------------------------

    let reportsToClose = [
      report
    ];

    let releaseSummary =
      '';

    if (
      action ===
      'warn'
    ) {
      const reasonText =
        report.reason &&
        report.reason !==
          'Other'
          ? ` (${report.reason})`
          : '';

      const warning =
        await createNotification({
          userId:
            target.id,

          type:
            'account_warning',

          title:
            'Warning from Hemo-Hero',

          message:
            `An administrator reviewed a report about you${reasonText}. ${asSentence(note)} More reports can lead to your account being deactivated.`,

          data: {
            report_id:
              reportId,

            reason:
              report.reason ||
              null
          }
        });

      if (!warning) {
        await undoClose();

        return res
          .status(500)
          .json({
            error:
              'Unable to send the warning. Please try again.'
          });
      }
    }

    // --------------------------------------------------------
    // DEACTIVATE
    // --------------------------------------------------------

    if (
      action ===
      'deactivate'
    ) {
      if (
        target.is_active !==
        false
      ) {
        // The admin note is the reason the person sees when
        // they try to sign in (migration 20261102).
        const deactivate =
          fields =>
            supabaseAdmin
              .from(
                'users'
              )
              .update({
                is_active:
                  false,

                deactivated_at:
                  now,

                updated_at:
                  now,

                ...fields
              })
              .eq(
                'id',
                target.id
              )
              .eq(
                'role',
                'user'
              );

        let {
          error:
            deactivateError
        } =
          await deactivate({
            deactivation_reason:
              note,

            deactivated_by:
              req.dbUser?.id ||
              null
          });

        if (
          isMissingMigration(
            deactivateError
          )
        ) {
          ({
            error:
              deactivateError
          } =
            await deactivate({}));
        }

        if (deactivateError) {
          console.error(
            'ADMIN REPORT ACTION DEACTIVATE ERROR:',
            deactivateError
          );

          await undoClose();

          return res
            .status(500)
            .json({
              error:
                'Unable to deactivate this account.'
            });
        }
      }

      // Their open offers, invitations and active requests stop
      // waiting on them (also when the account was already
      // deactivated before the release existed).
      releaseSummary =
        describeRelease(
          await releaseDeactivatedAccount(
            target.id
          )
        );

      // Every other open chat report about this person is
      // answered by the same decision.
      const {
        data:
          otherRows,
        error:
          otherError
      } =
        await supabaseAdmin
          .from(
            'user_reports'
          )
          .select(
            'id, kind, reporter_id, request_id, response_id'
          )
          .eq(
            'kind',
            'report'
          )
          .eq(
            'reported_user_id',
            target.id
          )
          .neq(
            'id',
            reportId
          )
          .in(
            'status',
            OPEN_STATUSES
          );

      if (otherError) {
        console.error(
          'ADMIN REPORT ACTION OTHER REPORTS ERROR:',
          otherError
        );
      }

      const others =
        (
          otherRows ||
          []
        ).filter(
          row =>
            !isRequestReport(
              row
            )
        );

      if (
        others.length >
        0
      ) {
        const otherIds =
          others.map(
            row =>
              row.id
          );

        const {
          error:
            closeOthersError
        } =
          await supabaseAdmin
            .from(
              'user_reports'
            )
            .update({
              status:
                'resolved',

              action_taken:
                actionTaken,

              reviewed_by:
                req.dbUser.id,

              reviewed_at:
                now,

              updated_at:
                now
            })
            .in(
              'id',
              otherIds
            )
            .in(
              'status',
              OPEN_STATUSES
            );

        if (closeOthersError) {
          console.error(
            'ADMIN REPORT ACTION CLOSE OTHERS ERROR:',
            closeOthersError
          );
        } else {
          // Keep any note an admin already wrote on them.
          await supabaseAdmin
            .from(
              'user_reports'
            )
            .update({
              admin_note:
                note
            })
            .in(
              'id',
              otherIds
            )
            .is(
              'admin_note',
              null
            );

          reportsToClose = [
            report,
            ...others
          ];
        }
      }
    }

    // --------------------------------------------------------
    // TELL THE REPORTERS
    // --------------------------------------------------------

    await notifyReporters(
      reportsToClose,
      'resolved'
    );

    const updated =
      await loadReportDetails(
        reportId
      );

    const otherCount =
      reportsToClose.length -
      1;

    const deactivatedMessage =
      otherCount > 0
        ? `Account deactivated. This report and ${otherCount} other open report${otherCount === 1 ? '' : 's'} about them were resolved.`
        : 'Account deactivated. The report was resolved.';

    return res
      .status(200)
      .json({
        message:
          action ===
          'warn'
            ? 'Warning sent. The report was resolved.'
            : releaseSummary
              ? `${deactivatedMessage} ${releaseSummary}`
              : deactivatedMessage,

        closed_count:
          reportsToClose.length,

        report:
          updated
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN REPORT ACTION ERROR:',
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
  updateAdminReport,
  takeAdminReportAction
};
