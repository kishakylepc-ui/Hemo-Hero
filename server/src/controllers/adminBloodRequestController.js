const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// CONSTANTS
// ============================================================

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

const REQUEST_STATUSES = [
  'active',
  'fulfilled',
  'cancelled',
];

const URGENCY_TYPES = [
  'urgent',
  'needed',
];

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
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

function isAdmin(req) {
  return (
    String(
      req.dbUser?.role ||
        ''
    )
      .trim()
      .toLowerCase() ===
    'admin'
  );
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
    user.suffix,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function normalizeSearchValue(
  value
) {
  return cleanText(
    value
  ).toLowerCase();
}

// ============================================================
// LOAD USERS
//
// Used for attaching requester/donor details without relying
// on a Supabase relationship configuration.
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
      ),
    ];

  if (
    uniqueIds.length ===
    0
  ) {
    return new Map();
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select(`
        id,
        email,
        first_name,
        middle_name,
        last_name,
        suffix,
        phone,
        gender,
        date_of_birth,
        barangay,
        city,
        province,
        blood_type,
        profile_photo_url,
        role,
        is_active
      `)
      .in(
        'id',
        uniqueIds
      );

  if (error) {
    console.error(
      'ADMIN BLOOD REQUEST USER LOOKUP ERROR:',
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
            ),
        }
      );
    }
  );

  return map;
}

// ============================================================
// BUILD ADMIN SUMMARY
// ============================================================

function buildRequestSummary(
  requests
) {
  const rows =
    requests ||
    [];

  const active =
    rows.filter(
      request =>
        request.status ===
        'active'
    );

  const fulfilled =
    rows.filter(
      request =>
        request.status ===
        'fulfilled'
    );

  const cancelled =
    rows.filter(
      request =>
        request.status ===
        'cancelled'
    );

  const urgentActive =
    active.filter(
      request =>
        request.urgency ===
        'urgent'
    );

  const scheduledActive =
    active.filter(
      request =>
        request.urgency ===
        'needed'
    );

  const activeUnits =
    active.reduce(
      (
        total,
        request
      ) => {
        const units =
          Number(
            request.units_needed
          );

        return (
          total +
          (
            Number.isFinite(
              units
            )
              ? units
              : 0
          )
        );
      },
      0
    );

  return {
    total:
      rows.length,

    active:
      active.length,

    fulfilled:
      fulfilled.length,

    cancelled:
      cancelled.length,

    urgent_active:
      urgentActive.length,

    scheduled_active:
      scheduledActive.length,

    active_units_needed:
      activeUnits,
  };
}

// ============================================================
// SEARCH FILTER
// ============================================================

function requestMatchesSearch(
  request,
  requester,
  search
) {
  if (
    !search
  ) {
    return true;
  }

  const values = [
    request.id,
    request.blood_type,
    request.facility_name,
    request.facility_type,
    request.facility_address,
    request.message,
    request.status,
    request.urgency,

    requester?.email,
    requester?.first_name,
    requester?.middle_name,
    requester?.last_name,
    requester?.suffix,
    requester?.full_name,
    requester?.phone,
    requester?.city,
    requester?.province,
  ];

  return values.some(
    value =>
      normalizeSearchValue(
        value
      ).includes(
        search
      )
  );
}

// ============================================================
// GET /api/requests/admin
//
// ADMIN ONLY
//
// Returns:
// - all blood requests
// - requester details
// - filters
// - pagination
// - request summary
// ============================================================

async function getAdminBloodRequests(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // ADMIN AUTHORIZATION
    // --------------------------------------------------------

    if (
      !isAdmin(
        req
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Admin access is required.',
        });
    }

    // --------------------------------------------------------
    // QUERY PARAMETERS
    // --------------------------------------------------------

    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const requestedLimit =
      parsePositiveInteger(
        req.query.limit,
        15
      );

    const limit =
      Math.min(
        requestedLimit,
        50
      );

    const rawStatus =
      cleanText(
        req.query.status
      )
        .toLowerCase();

    const status =
      !rawStatus ||
      rawStatus ===
        'all'
        ? 'all'
        : rawStatus;

    const bloodType =
      cleanText(
        req.query.blood_type
      );

    const rawUrgency =
      cleanText(
        req.query.urgency
      )
        .toLowerCase();

    const urgency =
      !rawUrgency ||
      rawUrgency ===
        'all'
        ? 'all'
        : rawUrgency;

    const search =
      normalizeSearchValue(
        req.query.search
      );

    // --------------------------------------------------------
    // VALIDATE FILTERS
    // --------------------------------------------------------

    if (
      status !==
        'all' &&
      !REQUEST_STATUSES.includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid blood request status filter.',
        });
    }

    if (
      bloodType &&
      bloodType !==
        'all' &&
      !BLOOD_TYPES.includes(
        bloodType
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid blood type filter.',
        });
    }

    if (
      urgency !==
        'all' &&
      !URGENCY_TYPES.includes(
        urgency
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid urgency filter.',
        });
    }

    // --------------------------------------------------------
    // LOAD ALL REQUESTS FOR SUMMARY
    //
    // The summary should describe the whole system, not only
    // the currently selected page/filter.
    // --------------------------------------------------------

    const {
      data:
        summaryRows,
      error:
        summaryError,
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(`
          id,
          status,
          urgency,
          units_needed
        `);

    if (
      summaryError
    ) {
      console.error(
        'ADMIN BLOOD REQUEST SUMMARY ERROR:',
        summaryError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request summary.',
        });
    }

    const summary =
      buildRequestSummary(
        summaryRows ||
          []
      );

    // --------------------------------------------------------
    // LOAD FILTERED REQUESTS
    // --------------------------------------------------------

    let query =
      supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(
          '*'
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (
      status !==
      'all'
    ) {
      query =
        query.eq(
          'status',
          status
        );
    }

    if (
      bloodType &&
      bloodType !==
        'all'
    ) {
      query =
        query.eq(
          'blood_type',
          bloodType
        );
    }

    if (
      urgency !==
      'all'
    ) {
      query =
        query.eq(
          'urgency',
          urgency
        );
    }

    const {
      data:
        requestRows,
      error:
        requestError,
    } =
      await query;

    if (
      requestError
    ) {
      console.error(
        'ADMIN GET BLOOD REQUESTS ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood requests.',
        });
    }

    const requests =
      requestRows ||
      [];

    // --------------------------------------------------------
    // REQUESTERS
    // --------------------------------------------------------

    const requesterMap =
      await getUsersByIds(
        requests.map(
          request =>
            request.requester_id
        )
      );

    // --------------------------------------------------------
    // ATTACH REQUESTER
    // --------------------------------------------------------

    const withRequester =
      requests.map(
        request => {
          const requester =
            requesterMap.get(
              request.requester_id
            ) ||
            null;

          return {
            ...request,

            requester,
          };
        }
      );

    // --------------------------------------------------------
    // SEARCH
    //
    // Search is handled after the requester has been attached,
    // allowing the Admin to search by:
    // - requester name
    // - requester email
    // - facility
    // - blood type
    // - request ID
    // --------------------------------------------------------

    const filtered =
      search
        ? withRequester.filter(
            request =>
              requestMatchesSearch(
                request,
                request.requester,
                search
              )
          )
        : withRequester;

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const total =
      filtered.length;

    const totalPages =
      total ===
        0
        ? 0
        : Math.ceil(
            total /
              limit
          );

    const safePage =
      totalPages ===
        0
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

    const end =
      start +
      limit;

    const paginated =
      filtered.slice(
        start,
        end
      );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res
      .status(200)
      .json({
        summary,

        requests:
          paginated,

        pagination: {
          page:
            safePage,

          limit,

          total,

          total_pages:
            totalPages,
        },

        filters: {
          status,

          blood_type:
            bloodType ||
            'all',

          urgency,

          search:
            search ||
            null,
        },
      });
  } catch (error) {
    console.error(
      'ADMIN GET BLOOD REQUESTS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error',
      });
  }
}

// ============================================================
// GET /api/requests/admin/demand
//
// ADMIN ONLY
//
// Returns demand calculated only from ACTIVE blood requests.
// ============================================================

async function getAdminBloodTypeDemand(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // ADMIN AUTHORIZATION
    // --------------------------------------------------------

    if (
      !isAdmin(
        req
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Admin access is required.',
        });
    }

    // --------------------------------------------------------
    // LOAD ACTIVE REQUESTS
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(`
          id,
          blood_type,
          units_needed,
          urgency,
          status,
          created_at
        `)
        .eq(
          'status',
          'active'
        );

    if (
      error
    ) {
      console.error(
        'ADMIN BLOOD DEMAND ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood type demand.',
        });
    }

    const requests =
      data ||
      [];

    // --------------------------------------------------------
    // INITIALIZE ALL BLOOD TYPES
    // --------------------------------------------------------

    const demandMap =
      new Map();

    BLOOD_TYPES.forEach(
      bloodType => {
        demandMap.set(
          bloodType,
          {
            blood_type:
              bloodType,

            request_count:
              0,

            units_needed:
              0,

            urgent_requests:
              0,

            scheduled_requests:
              0,
          }
        );
      }
    );

    // --------------------------------------------------------
    // AGGREGATE
    // --------------------------------------------------------

    requests.forEach(
      request => {
        const bloodType =
          String(
            request.blood_type ||
              ''
          ).trim();

        if (
          !demandMap.has(
            bloodType
          )
        ) {
          return;
        }

        const current =
          demandMap.get(
            bloodType
          );

        const units =
          Number(
            request.units_needed
          );

        current.request_count +=
          1;

        current.units_needed +=
          Number.isFinite(
            units
          )
            ? units
            : 0;

        if (
          request.urgency ===
          'urgent'
        ) {
          current.urgent_requests +=
            1;
        }

        if (
          request.urgency ===
          'needed'
        ) {
          current.scheduled_requests +=
            1;
        }
      }
    );

    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    const demand =
      Array.from(
        demandMap.values()
      )
        .sort(
          (
            first,
            second
          ) => {
            if (
              second.units_needed !==
              first.units_needed
            ) {
              return (
                second.units_needed -
                first.units_needed
              );
            }

            if (
              second.request_count !==
              first.request_count
            ) {
              return (
                second.request_count -
                first.request_count
              );
            }

            return (
              second.urgent_requests -
              first.urgent_requests
            );
          }
        );

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    const totalActiveRequests =
      requests.length;

    const totalUnitsNeeded =
      requests.reduce(
        (
          total,
          request
        ) => {
          const units =
            Number(
              request.units_needed
            );

          return (
            total +
            (
              Number.isFinite(
                units
              )
                ? units
                : 0
            )
          );
        },
        0
      );

    const urgentRequests =
      requests.filter(
        request =>
          request.urgency ===
          'urgent'
      ).length;

    const scheduledRequests =
      requests.filter(
        request =>
          request.urgency ===
          'needed'
      ).length;

    // --------------------------------------------------------
    // HIGHEST DEMAND
    // --------------------------------------------------------

    const highestDemand =
      demand.find(
        item =>
          item.request_count >
            0 ||
          item.units_needed >
            0
      ) ||
      null;

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res
      .status(200)
      .json({
        summary: {
          active_requests:
            totalActiveRequests,

          units_needed:
            totalUnitsNeeded,

          urgent_requests:
            urgentRequests,

          scheduled_requests:
            scheduledRequests,
        },

        highest_demand:
          highestDemand,

        demand,
      });
  } catch (error) {
    console.error(
      'ADMIN BLOOD DEMAND ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error',
      });
  }
}

// ============================================================
// GET /api/requests/admin/:id
//
// ADMIN ONLY
//
// Returns one request with:
// - requester details
// - donor responses
// - donor details
// - response summary
// ============================================================

async function getAdminBloodRequestById(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // ADMIN AUTHORIZATION
    // --------------------------------------------------------

    if (
      !isAdmin(
        req
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Admin access is required.',
        });
    }

    const requestId =
      cleanText(
        req.params.id
      );

    if (
      !requestId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Blood request ID is required.',
        });
    }

    // --------------------------------------------------------
    // REQUEST
    // --------------------------------------------------------

    const {
      data:
        request,
      error:
        requestError,
    } =
      await supabaseAdmin
        .from(
          'blood_requests'
        )
        .select(
          '*'
        )
        .eq(
          'id',
          requestId
        )
        .maybeSingle();

    if (
      requestError
    ) {
      console.error(
        'ADMIN BLOOD REQUEST DETAIL ERROR:',
        requestError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve blood request.',
        });
    }

    if (
      !request
    ) {
      return res
        .status(404)
        .json({
          error:
            'Blood request not found.',
        });
    }

    // --------------------------------------------------------
    // DONOR RESPONSES
    // --------------------------------------------------------

    const {
      data:
        responseRows,
      error:
        responsesError,
    } =
      await supabaseAdmin
        .from(
          'blood_request_responses'
        )
        .select(
          '*'
        )
        .eq(
          'request_id',
          requestId
        );

    if (
      responsesError
    ) {
      console.error(
        'ADMIN BLOOD REQUEST RESPONSES ERROR:',
        responsesError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve donor responses.',
        });
    }

    const responses =
      responseRows ||
      [];

    // --------------------------------------------------------
    // LOAD REQUESTER + DONORS
    // --------------------------------------------------------

    const userMap =
      await getUsersByIds([
        request.requester_id,

        ...responses.map(
          response =>
            response.donor_id
        ),
      ]);

    const requester =
      userMap.get(
        request.requester_id
      ) ||
      null;

    const responsesWithDonors =
      responses.map(
        response => ({
          ...response,

          donor:
            userMap.get(
              response.donor_id
            ) ||
            null,
        })
      );

    // --------------------------------------------------------
    // RESPONSE SUMMARY
    // --------------------------------------------------------

    const responseSummary = {
      total:
        responsesWithDonors.length,

      pending:
        responsesWithDonors.filter(
          response =>
            response.status ===
            'pending'
        ).length,

      accepted:
        responsesWithDonors.filter(
          response =>
            response.status ===
            'accepted'
        ).length,

      rejected:
        responsesWithDonors.filter(
          response =>
            response.status ===
            'rejected'
        ).length,

      withdrawn:
        responsesWithDonors.filter(
          response =>
            response.status ===
            'withdrawn'
        ).length,
    };

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res
      .status(200)
      .json({
        request: {
          ...request,

          requester,
        },

        response_summary:
          responseSummary,

        responses:
          responsesWithDonors,
      });
  } catch (error) {
    console.error(
      'ADMIN BLOOD REQUEST DETAIL ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAdminBloodRequests,
  getAdminBloodTypeDemand,
  getAdminBloodRequestById,
};