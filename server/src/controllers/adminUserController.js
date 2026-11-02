const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

const {
  setActivityEntity,
  setActivityOutcome,
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  clearLoginLockout,
} = require(
  '../middleware/loginRateLimiter'
);

const {
  normalizeUsername,
  checkUsernameTaken,
  isUsernameConflict,
} = require(
  '../utils/username'
);

const {
  normalizePhone,
} = require(
  '../utils/phone'
);

const {
  isSuperAdmin
} = require(
  '../utils/roles'
);

const {
  releaseDeactivatedAccount,
  describeRelease,
} = require(
  '../services/accountReleaseService'
);

// Regular users can be managed by any admin, admin accounts only
const {
  MIGRATION_MESSAGE,
  readReason,
  emailHash,
  isMissingMigration,
  getLatestReview,
} = require(
  '../services/accountReviewService'
);

// People waiting on a review of their deactivated account.
async function getPendingReviewUserIds() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'account_reviews'
      )
      .select(
        'user_id'
      )
      .eq(
        'status',
        'pending'
      );

  if (error) {
    if (!isMissingMigration(error)) {
      console.error(
        'ADMIN PENDING REVIEWS ERROR:',
        error
      );
    }

    return new Set();
  }

  return new Set(
    (data || []).map(
      row =>
        row.user_id
    )
  );
}

// by the super admin, and super admin accounts not from the app.
function getManageError(
  req,
  targetUser
) {
  if (
    targetUser.role ===
    'user'
  ) {
    return null;
  }

  if (
    targetUser.role ===
      'admin' &&
    isSuperAdmin(
      req.dbUser?.role
    )
  ) {
    return null;
  }

  return targetUser.role ===
    'admin'
    ? 'Only the super admin can manage administrator accounts.'
    : 'Super admin accounts cannot be changed from the Users module.';
}

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_LIMIT =
  20;

const MAX_LIMIT =
  100;

const VALID_GENDERS = [
  'Male',
  'Female',
  'Prefer not to say',
];

// ============================================================
// BASIC HELPERS
// ============================================================

function cleanText(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(
    value
  ).trim();
}

function cleanRequiredText(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function cleanOptionalText(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    null;
}

// ============================================================
// PAGINATION
// ============================================================

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

// ============================================================
// EMAIL VALIDATION
// ============================================================

function validateEmail(
  email
) {
  const cleanEmail =
    cleanText(
      email
    ).toLowerCase();

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(
      cleanEmail
    )
  ) {
    return {
      valid:
        false,

      error:
        'Please enter a valid email address.',
    };
  }

  return {
    valid:
      true,

    value:
      cleanEmail,
  };
}

// ============================================================
// PASSWORD VALIDATION
//
// SAME POLICY AS CURRENT AUTH CONTROLLER
// ============================================================

function validatePassword(
  password
) {
  if (
    typeof password !==
    'string'
  ) {
    return {
      valid:
        false,

      error:
        'Password must be text.',
    };
  }

  if (
    password.length <
    8
  ) {
    return {
      valid:
        false,

      error:
        'Password must be at least 8 characters.',
    };
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return {
      valid:
        false,

      error:
        'Password must contain at least one lowercase letter.',
    };
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return {
      valid:
        false,

      error:
        'Password must contain at least one uppercase letter.',
    };
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return {
      valid:
        false,

      error:
        'Password must contain at least one number.',
    };
  }

  if (
    !/[^A-Za-z0-9]/.test(
      password
    )
  ) {
    return {
      valid:
        false,

      error:
        'Password must contain at least one special character.',
    };
  }

  return {
    valid:
      true,
  };
}

// ============================================================
// DATE OF BIRTH
// ============================================================

function validateDateOfBirth(
  dateOfBirth
) {
  if (
    typeof dateOfBirth !==
    'string'
  ) {
    return {
      valid:
        false,

      error:
        'date_of_birth must be text.',
    };
  }

  const cleanDate =
    dateOfBirth.trim();

  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(
      cleanDate
    )
  ) {
    return {
      valid:
        false,

      error:
        'date_of_birth must use YYYY-MM-DD format.',
    };
  }

  const [
    year,
    month,
    day,
  ] =
    cleanDate
      .split(
        '-'
      )
      .map(
        Number
      );

  const birthDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    birthDate
      .getUTCFullYear() !==
      year ||
    birthDate
      .getUTCMonth() !==
      month - 1 ||
    birthDate
      .getUTCDate() !==
      day
  ) {
    return {
      valid:
        false,

      error:
        'Invalid date of birth.',
    };
  }

  const today =
    new Date();

  const todayUtc =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );

  if (
    birthDate >
    todayUtc
  ) {
    return {
      valid:
        false,

      error:
        'Date of birth cannot be in the future.',
    };
  }

  return {
    valid:
      true,

    value:
      cleanDate,
  };
}

// ============================================================
// SAFE USER RESPONSE
// ============================================================

// ============================================================
// SIGN-IN LOCKOUTS (wrong passwords)
//
// From login_lockouts (loginRateLimiter.js). Shown while it
// matters: locked now, or wrong passwords within the last day
// (after a quiet day the limiter starts the account over).
// ============================================================

const LOCKOUT_MEMORY_MS =
  24 * 60 * 60 * 1000;

function describeLoginLockout(
  row
) {
  if (!row) {
    return null;
  }

  const now =
    Date.now();

  const lockedUntil =
    Date.parse(
      row.locked_until ||
        ''
    );

  const lockedNow =
    Number.isFinite(
      lockedUntil
    ) &&
    lockedUntil >
      now;

  const lastEvent =
    Math.max(
      Date.parse(
        row.last_failed_at ||
          ''
      ) || 0,
      Number.isFinite(
        lockedUntil
      )
        ? lockedUntil
        : 0
    );

  if (
    !lockedNow &&
    (!lastEvent ||
      now - lastEvent >=
        LOCKOUT_MEMORY_MS)
  ) {
    return null;
  }

  const lockouts =
    Number(
      row.lock_level
    ) || 0;

  return {
    locked:
      lockedNow,

    locked_until:
      lockedNow
        ? row.locked_until
        : null,

    failed_attempts:
      Number(
        row.failed_count
      ) || 0,

    lockouts,

    // After a lockout, signing in needs a CAPTCHA.
    captcha_required:
      lockouts >= 1,
  };
}

// email -> login_lockouts row. Empty when the table is missing.
async function getLoginLockoutsByEmails(
  emails
) {
  const map =
    new Map();

  const clean = [
    ...new Set(
      (emails || [])
        .filter(Boolean)
        .map(email =>
          String(email)
            .trim()
            .toLowerCase()
        )
    ),
  ];

  if (
    clean.length ===
    0
  ) {
    return map;
  }

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'login_lockouts'
        )
        .select(
          '*'
        )
        .in(
          'email',
          clean
        );

    if (error) {
      console.error(
        'LOGIN LOCKOUT LOOKUP ERROR:',
        error.message
      );

      return map;
    }

    for (const row of data || []) {
      map.set(
        row.email,
        row
      );
    }
  } catch (error) {
    console.error(
      'LOGIN LOCKOUT LOOKUP ERROR:',
      error
    );
  }

  return map;
}

function lockoutFor(
  map,
  user
) {
  return map.get(
    String(
      user?.email ||
        ''
    )
      .trim()
      .toLowerCase()
  ) || null;
}

// Locked by an admin, or locked now after wrong passwords.
function isUserLocked(
  user,
  lockoutRow
) {
  return (
    user?.is_locked ===
      true ||
    describeLoginLockout(
      lockoutRow
    )?.locked ===
      true
  );
}

function buildSafeUser(
  user,
  donorApplication = null,
  loginLockout = null
) {
  if (
    !user
  ) {
    return null;
  }

  const fullName =
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return {
    id:
      user.id,

    email:
      user.email ??
      null,

    username:
      user.username ??
      null,

    first_name:
      user.first_name ??
      null,

    middle_name:
      user.middle_name ??
      null,

    last_name:
      user.last_name ??
      null,

    suffix:
      user.suffix ??
      null,

    full_name:
      fullName ||
      user.email ||
      'Hemo-Hero User',

    phone:
      user.phone ??
      null,

    date_of_birth:
      user.date_of_birth ??
      null,

    gender:
      user.gender ??
      null,

    barangay:
      user.barangay ??
      null,

    city:
      user.city ??
      null,

    province:
      user.province ??
      null,

    blood_type:
      user.blood_type ??
      null,

    profile_photo_url:
      user.profile_photo_url ??
      null,

    onboarding_complete:
      user.onboarding_complete ===
      true,

    role:
      user.role ??
      'user',

    is_active:
      user.is_active !==
      false,

    deactivated_at:
      user.deactivated_at ??
      null,

    // Why an admin deactivated it, shown to the person too
    // (migration 20261102_account_reviews).
    deactivation_reason:
      user.is_active ===
      false
        ? user.deactivation_reason ??
          null
        : null,

    deactivated_by_self:
      user.is_active ===
        false &&
      Boolean(
        user.deactivated_by
      ) &&
      user.deactivated_by ===
        user.id,

    // Locked by an admin (migration 20261022_account_lock).
    is_locked:
      user.is_locked ===
      true,

    locked_at:
      user.is_locked ===
      true
        ? user.locked_at ??
          null
        : null,

    locked_reason:
      user.is_locked ===
      true
        ? user.locked_reason ??
          null
        : null,

    // Locked for a while after wrong passwords (login_lockouts).
    login_lockout:
      describeLoginLockout(
        loginLockout
      ),

    created_at:
      user.created_at ??
      null,

    updated_at:
      user.updated_at ??
      null,

    donor:
      donorApplication
        ? {
            application_id:
              donorApplication.id ??
              null,

            status:
              donorApplication.status ??
              null,

            blood_type:
              donorApplication.blood_type ??
              null,

            availability_status:
              donorApplication.availability_status ??
              null,
          }
        : null,
  };
}

// ============================================================
// LOAD DONOR APPLICATIONS
// ============================================================

async function getDonorApplicationsByUserIds(
  userIds
) {
  const cleanIds =
    [
      ...new Set(
        (
          userIds ||
          []
        ).filter(
          Boolean
        )
      ),
    ];

  if (
    cleanIds.length ===
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
        'donor_applications'
      )
      .select(`
        id,
        user_id,
        status,
        blood_type,
        availability_status,
        submitted_at,
        created_at,
        updated_at
      `)
      .in(
        'user_id',
        cleanIds
      );

  if (
    error
  ) {
    console.error(
      'ADMIN USERS DONOR LOOKUP ERROR:',
      error
    );

    return new Map();
  }

  const map =
    new Map();

  for (
    const application of
      data ||
      []
  ) {
    const current =
      map.get(
        application.user_id
      );

    if (
      !current
    ) {
      map.set(
        application.user_id,
        application
      );

      continue;
    }

    const currentTime =
      new Date(
        current.updated_at ||
        current.submitted_at ||
        current.created_at ||
        0
      ).getTime();

    const candidateTime =
      new Date(
        application.updated_at ||
        application.submitted_at ||
        application.created_at ||
        0
      ).getTime();

    if (
      candidateTime >
      currentTime
    ) {
      map.set(
        application.user_id,
        application
      );
    }
  }

  return map;
}

// ============================================================
// LOAD TARGET USER
// ============================================================

async function findTargetUser(
  userId
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'users'
      )
      .select('*')
      .eq(
        'id',
        userId
      )
      .maybeSingle();

  return {
    user:
      data,

    error,
  };
}

// ============================================================
// GET USER SUMMARY
//
// GET /api/admin/users/summary
// ============================================================

async function getAdminUserSummary(
  req,
  res
) {
  try {
    const {
      data:
        users,
      error,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        // '*': is_locked only exists after migration 20261022.
        .select(
          '*'
        )
        .in(
          'role',
          ['user', 'admin']
        );

    if (
      error
    ) {
      console.error(
        'ADMIN USER SUMMARY ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user summary.',
        });
    }

    const summary = {
      total:
        0,

      active:
        0,

      inactive:
        0,

      // Locked by an admin or after wrong passwords.
      locked:
        0,
    };

    const lockouts =
      await getLoginLockoutsByEmails(
        (users || []).map(
          user =>
            user.email
        )
      );

    const superAdmin =
      isSuperAdmin(
        req.dbUser?.role
      );

    if (superAdmin) {
      summary.admins =
        0;
    }

    for (
      const user of
        users ||
        []
    ) {
      if (
        user.role ===
        'admin'
      ) {
        if (superAdmin) {
          summary.admins +=
            1;
        }

        continue;
      }

      summary.total +=
        1;

      if (
        user.is_active ===
        false
      ) {
        summary.inactive +=
          1;
      } else {
        summary.active +=
          1;
      }

      if (
        isUserLocked(
          user,
          lockoutFor(
            lockouts,
            user
          )
        )
      ) {
        summary.locked +=
          1;
      }
    }

    return res
      .status(200)
      .json({
        summary,
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN USER SUMMARY SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// GET USERS
//
// GET /api/admin/users
// ============================================================

async function getAdminUsers(
  req,
  res
) {
  try {
    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const requestedLimit =
      parsePositiveInteger(
        req.query.limit,
        DEFAULT_LIMIT
      );

    const limit =
      Math.min(
        requestedLimit,
        MAX_LIMIT
      );

    const search =
      cleanText(
        req.query.search
      )
        .toLowerCase();

    const status =
      cleanText(
        req.query.status ||
        'all'
      )
        .toLowerCase();

    if (
      ![
        'all',
        'active',
        'inactive',
        'locked',
        'review',
      ].includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid account status filter.',
        });
    }

    const listRole =
      cleanText(
        req.query.role ||
        'user'
      )
        .toLowerCase();

    if (
      ![
        'user',
        'admin',
      ].includes(
        listRole
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid role filter.',
        });
    }

    if (
      listRole ===
        'admin' &&
      !isSuperAdmin(
        req.dbUser?.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Only the super admin can manage administrator accounts.',
        });
    }

    const {
      data:
        allUsers,
      error:
        usersError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select('*')
        .eq(
          'role',
          listRole
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (
      usersError
    ) {
      console.error(
        'ADMIN USERS FETCH ERROR:',
        usersError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load users.',
        });
    }

    let filteredUsers =
      allUsers ||
      [];

    const pendingReviewIds =
      await getPendingReviewUserIds();

    const reviewCount =
      filteredUsers.filter(
        user =>
          pendingReviewIds.has(
            user.id
          )
      ).length;

    if (
      status ===
      'review'
    ) {
      filteredUsers =
        filteredUsers.filter(
          user =>
            pendingReviewIds.has(
              user.id
            )
        );
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (
      status ===
      'active'
    ) {
      filteredUsers =
        filteredUsers.filter(
          user =>
            user.is_active !==
            false
        );
    }

    if (
      status ===
      'inactive'
    ) {
      filteredUsers =
        filteredUsers.filter(
          user =>
            user.is_active ===
            false
        );
    }

    // Sign-in lockouts: for the Locked filter and each row.
    const lockouts =
      await getLoginLockoutsByEmails(
        filteredUsers.map(
          user =>
            user.email
        )
      );

    if (
      status ===
      'locked'
    ) {
      filteredUsers =
        filteredUsers.filter(
          user =>
            isUserLocked(
              user,
              lockoutFor(
                lockouts,
                user
              )
            )
        );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (
      search
    ) {
      filteredUsers =
        filteredUsers.filter(
          user => {
            const searchable =
              [
                user.email,
                user.username,
                user.first_name,
                user.middle_name,
                user.last_name,
                user.suffix,
                [
                  user.first_name,
                  user.middle_name,
                  user.last_name,
                  user.suffix,
                ]
                  .filter(
                    Boolean
                  )
                  .join(' '),
              ]
                .filter(
                  Boolean
                )
                .join(' ')
                .toLowerCase();

            return searchable.includes(
              search
            );
          }
        );
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const total =
      filteredUsers.length;

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

    const pagedUsers =
      filteredUsers.slice(
        start,
        start +
        limit
      );

    const donorMap =
      await getDonorApplicationsByUserIds(
        pagedUsers.map(
          user =>
            user.id
        )
      );

    const users =
      pagedUsers.map(
        user => ({
          ...buildSafeUser(
            user,
            donorMap.get(
              user.id
            ) ||
            null,
            lockoutFor(
              lockouts,
              user
            )
          ),

          review_pending:
            pendingReviewIds.has(
              user.id
            ),
        })
      );

    return res
      .status(200)
      .json({
        users,

        // Deactivated people waiting on a review.
        review_count:
          reviewCount,

        pagination: {
          page:
            safePage,

          limit,

          total,

          total_pages:
            totalPages,
        },
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN USERS SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// GET USER BY ID
//
// GET /api/admin/users/:id
// ============================================================

async function getAdminUserById(
  req,
  res
) {
  try {
    const userId =
      cleanText(
        req.params.id
      );

    if (
      !userId
    ) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    const {
      user,
      error:
        userError,
    } =
      await findTargetUser(
        userId
      );

    if (
      userError
    ) {
      console.error(
        'ADMIN USER DETAIL ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user.',
        });
    }

    if (
      !user
    ) {
      return res
        .status(404)
        .json({
          error:
            'User not found.',
        });
    }

    const manageError =
        getManageError(
          req,
          user
        );

      if (
        manageError
      ) {
        return res
          .status(403)
          .json({
            error:
              manageError,
          });
      }

    const donorMap =
      await getDonorApplicationsByUserIds(
        [
          user.id,
        ]
      );

    const lockouts =
      await getLoginLockoutsByEmails(
        [
          user.email,
        ]
      );

    const review =
      await getLatestReview(
        user.id
      );

    return res
      .status(200)
      .json({
        user:
          buildSafeUser(
            user,
            donorMap.get(
              user.id
            ) ||
            null,
            lockoutFor(
              lockouts,
              user
            )
          ),

        // The person's latest "please review my account" request.
        review,
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN USER DETAIL SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// CREATE USER
//
// POST /api/admin/users
//
// ADMIN CREATED ACCOUNTS:
// - always role = user
// - email is confirmed immediately
// - password follows normal Hemo-Hero password policy
// ============================================================

async function createAdminUser(
  req,
  res
) {
  let createdAuthUserId =
    null;

  try {
    const {
      email,
      password,
      confirm_password,

      first_name,
      middle_name,
      last_name,
      suffix,

      phone,
      date_of_birth,
      gender,

      barangay,
      city,
      province,

      role,

      username,
    } =
      req.body ||
      {};

    // --------------------------------------------------------
    // USERNAME (required, unique)
    // --------------------------------------------------------

    const usernameCheck =
      normalizeUsername(
        username
      );

    if (
      !usernameCheck.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            usernameCheck.error,

          code:
            'INVALID_USERNAME',
        });
    }

    const usernameLookup =
      await checkUsernameTaken(
        usernameCheck.value
      );

    if (
      usernameLookup.error
    ) {
      return res
        .status(500)
        .json({
          error:
            usernameLookup.error,
        });
    }

    if (
      usernameLookup.taken
    ) {
      return res
        .status(409)
        .json({
          error:
            'This username is taken. Please choose another.',

          code:
            'USERNAME_TAKEN',
        });
    }

    // --------------------------------------------------------
    // PHONE (optional)
    // --------------------------------------------------------

    const phoneCheck =
      normalizePhone(
        phone
      );

    if (
      !phoneCheck.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            phoneCheck.error,
        });
    }

    // --------------------------------------------------------
    // ROLE (admin accounts: super admin only)
    // --------------------------------------------------------

    const newRole =
      cleanText(
        role ||
        'user'
      )
        .toLowerCase();

    if (
      ![
        'user',
        'admin',
      ].includes(
        newRole
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Role must be user or admin.',
        });
    }

    if (
      newRole ===
        'admin' &&
      !isSuperAdmin(
        req.dbUser?.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Only the super admin can create administrator accounts.',
        });
    }

    // --------------------------------------------------------
    // REQUIRED ACCOUNT FIELDS
    // --------------------------------------------------------

    if (
      !email ||
      !password ||
      !confirm_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'Email, password, and confirm password are required.',
        });
    }

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    const emailValidation =
      validateEmail(
        email
      );

    if (
      !emailValidation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            emailValidation.error,
        });
    }

    const cleanEmail =
      emailValidation.value;

    // --------------------------------------------------------
    // PASSWORD CONFIRMATION
    // --------------------------------------------------------

    if (
      password !==
      confirm_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'Passwords do not match.',
        });
    }

    // --------------------------------------------------------
    // PASSWORD POLICY
    // --------------------------------------------------------

    const passwordValidation =
      validatePassword(
        password
      );

    if (
      !passwordValidation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            passwordValidation.error,
        });
    }

    // --------------------------------------------------------
    // REQUIRED NAMES FOR ADMIN-CREATED USERS
    // --------------------------------------------------------

    const cleanFirstName =
      cleanRequiredText(
        first_name
      );

    const cleanLastName =
      cleanRequiredText(
        last_name
      );

    if (
      !cleanFirstName ||
      !cleanLastName
    ) {
      return res
        .status(400)
        .json({
          error:
            'First name and last name are required.',
        });
    }

    // --------------------------------------------------------
    // OPTIONAL DATE OF BIRTH
    // --------------------------------------------------------

    let cleanDateOfBirth =
      null;

    if (
      date_of_birth !==
      undefined &&
      date_of_birth !==
      null &&
      cleanText(
        date_of_birth
      )
    ) {
      const validation =
        validateDateOfBirth(
          date_of_birth
        );

      if (
        !validation.valid
      ) {
        return res
          .status(400)
          .json({
            error:
              validation.error,
          });
      }

      cleanDateOfBirth =
        validation.value;
    }

    // --------------------------------------------------------
    // OPTIONAL GENDER
    // --------------------------------------------------------

    let cleanGender =
      null;

    if (
      gender !==
      undefined &&
      gender !==
      null &&
      cleanText(
        gender
      )
    ) {
      cleanGender =
        cleanText(
          gender
        );

      if (
        !VALID_GENDERS.includes(
          cleanGender
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Invalid gender value.',
          });
      }
    }

    // --------------------------------------------------------
    // CHECK PUBLIC USERS DUPLICATE
    // --------------------------------------------------------

    const {
      data:
        existingUser,
      error:
        lookupError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          'id'
        )
        .eq(
          'email',
          cleanEmail
        )
        .maybeSingle();

    if (
      lookupError
    ) {
      console.error(
        'ADMIN CREATE USER LOOKUP ERROR:',
        lookupError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify email availability.',
        });
    }

    if (
      existingUser
    ) {
      return res
        .status(409)
        .json({
          error:
            'An account with this email already exists.',
        });
    }

    // --------------------------------------------------------
    // CREATE SUPABASE AUTH USER
    //
    // Admin-created accounts are confirmed immediately so the
    // user can sign in using the temporary password supplied by
    // the administrator.
    // --------------------------------------------------------

    const {
      data:
        authResult,
      error:
        authCreateError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .createUser({
          email:
            cleanEmail,

          password,

          email_confirm:
            true,

          user_metadata: {
            onboarding_complete:
              false,

            first_name:
              cleanFirstName,

            last_name:
              cleanLastName,
          },
        });

    if (
      authCreateError ||
      !authResult?.user
    ) {
      console.error(
        'ADMIN CREATE AUTH USER ERROR:',
        authCreateError
      );

      const message =
        String(
          authCreateError
            ?.message ||
          ''
        ).toLowerCase();

      if (
        message.includes(
          'already'
        ) ||
        message.includes(
          'registered'
        ) ||
        message.includes(
          'exists'
        )
      ) {
        return res
          .status(409)
          .json({
            error:
              'An account with this email already exists.',
          });
      }

      return res
        .status(400)
        .json({
          error:
            authCreateError
              ?.message ||
            'Unable to create user account.',
        });
    }

    createdAuthUserId =
      authResult.user.id;

    setActivityEntity(
      res,
      'user_account',
      createdAuthUserId
    );

    // --------------------------------------------------------
    // PREPARE PUBLIC PROFILE
    // --------------------------------------------------------

    const now =
      new Date()
        .toISOString();

    const profileUpdates = {
      email:
        cleanEmail,

      username:
        usernameCheck.value,

      first_name:
        cleanFirstName,

      middle_name:
        cleanOptionalText(
          middle_name
        ),

      last_name:
        cleanLastName,

      suffix:
        cleanOptionalText(
          suffix
        ),

      phone:
        phoneCheck.value,

      date_of_birth:
        cleanDateOfBirth,

      gender:
        cleanGender,

      barangay:
        cleanOptionalText(
          barangay
        ),

      city:
        cleanOptionalText(
          city
        ),

      province:
        cleanOptionalText(
          province
        ),

      role:
        newRole,

      is_active:
        true,

      deactivated_at:
        null,

      onboarding_complete:
        false,

      updated_at:
        now,
    };

    // --------------------------------------------------------
    // AUTH SIGN-UP/TRIGGERS MAY ALREADY CREATE PUBLIC.USERS.
    //
    // Check first, then update or insert.
    // --------------------------------------------------------

    const {
      data:
        existingProfile,
      error:
        profileLookupError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          'id'
        )
        .eq(
          'id',
          createdAuthUserId
        )
        .maybeSingle();

    if (
      profileLookupError
    ) {
      console.error(
        'ADMIN CREATE USER PROFILE LOOKUP ERROR:',
        profileLookupError
      );

      await rollbackCreatedAuthUser(
        createdAuthUserId
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to create the user profile.',
        });
    }

    let createdProfile;
    let profileError;

    if (
      existingProfile
    ) {
      const result =
        await supabaseAdmin
          .from(
            'users'
          )
          .update(
            profileUpdates
          )
          .eq(
            'id',
            createdAuthUserId
          )
          .select('*')
          .single();

      createdProfile =
        result.data;

      profileError =
        result.error;
    } else {
      const result =
        await supabaseAdmin
          .from(
            'users'
          )
          .insert({
            id:
              createdAuthUserId,

            ...profileUpdates,
          })
          .select('*')
          .single();

      createdProfile =
        result.data;

      profileError =
        result.error;
    }

    // --------------------------------------------------------
    // ROLLBACK AUTH USER IF PUBLIC PROFILE FAILS
    // --------------------------------------------------------

    if (
      profileError ||
      !createdProfile
    ) {
      console.error(
        'ADMIN CREATE USER PROFILE ERROR:',
        profileError
      );

      await rollbackCreatedAuthUser(
        createdAuthUserId
      );

      // Someone took the username a moment ago.
      if (
        isUsernameConflict(
          profileError
        )
      ) {
        return res
          .status(409)
          .json({
            error:
              'This username is taken. Please choose another.',

            code:
              'USERNAME_TAKEN',
          });
      }

      return res
        .status(500)
        .json({
          error:
            'Unable to create the user profile.',
        });
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'user_account',
      createdProfile.id
    );

    return res
      .status(201)
      .json({
        message:
          'User account created successfully.',

        user:
          buildSafeUser(
            createdProfile
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN CREATE USER SERVER ERROR:',
      error
    );

    if (
      createdAuthUserId
    ) {
      await rollbackCreatedAuthUser(
        createdAuthUserId
      );
    }

    return res
      .status(500)
      .json({
        error:
          'Unable to create user account.',
      });
  }
}

// ============================================================
// ROLLBACK AUTH USER
// ============================================================

async function rollbackCreatedAuthUser(
  userId
) {
  try {
    const {
      error,
    } =
      await supabaseAdmin
        .auth
        .admin
        .deleteUser(
          userId
        );

    if (
      error
    ) {
      console.error(
        'ADMIN CREATE USER AUTH ROLLBACK ERROR:',
        error.message
      );
    }
  } catch (
    error
  ) {
    console.error(
      'ADMIN CREATE USER AUTH ROLLBACK ERROR:',
      error
    );
  }
}

// ============================================================
// UPDATE USER
//
// PATCH /api/admin/users/:id
// ============================================================

async function updateAdminUser(
  req,
  res
) {
  try {
    const targetUserId =
      cleanText(
        req.params.id
      );

    if (
      !targetUserId
    ) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    // --------------------------------------------------------
    // LOAD TARGET
    // --------------------------------------------------------

    const {
      user:
        targetUser,
      error:
        targetError,
    } =
      await findTargetUser(
        targetUserId
      );

    if (
      targetError
    ) {
      console.error(
        'ADMIN UPDATE USER LOOKUP ERROR:',
        targetError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user account.',
        });
    }

    if (
      !targetUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'User not found.',
        });
    }

    // --------------------------------------------------------
    // NORMAL USERS ONLY
    // --------------------------------------------------------

    const manageError =
        getManageError(
          req,
          targetUser
        );

      if (
        manageError
      ) {
        return res
          .status(403)
          .json({
            error:
              manageError,
          });
      }

    const {
      email,
      first_name,
      middle_name,
      last_name,
      suffix,
      phone,
      date_of_birth,
      gender,
      barangay,
      city,
      province,
      username,
    } =
      req.body ||
      {};

    const updates =
      {};

    // --------------------------------------------------------
    // USERNAME (unique; can be changed, not removed)
    // --------------------------------------------------------

    if (
      username !==
      undefined
    ) {
      const usernameCheck =
        normalizeUsername(
          username
        );

      if (
        !usernameCheck.valid
      ) {
        return res
          .status(400)
          .json({
            error:
              usernameCheck.error,

            code:
              'INVALID_USERNAME',
          });
      }

      if (
        usernameCheck.value !==
        targetUser.username
      ) {
        const lookup =
          await checkUsernameTaken(
            usernameCheck.value,
            targetUser.id
          );

        if (lookup.error) {
          return res
            .status(500)
            .json({
              error:
                lookup.error,
            });
        }

        if (lookup.taken) {
          return res
            .status(409)
            .json({
              error:
                'This username is taken. Please choose another.',

              code:
                'USERNAME_TAKEN',
            });
        }

        updates.username =
          usernameCheck.value;
      }
    }

    let emailChanged =
      false;

    let originalEmail =
      cleanText(
        targetUser.email
      ).toLowerCase();

    let nextEmail =
      originalEmail;

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (
      email !==
      undefined
    ) {
      const validation =
        validateEmail(
          email
        );

      if (
        !validation.valid
      ) {
        return res
          .status(400)
          .json({
            error:
              validation.error,
          });
      }

      nextEmail =
        validation.value;

      if (
        nextEmail !==
        originalEmail
      ) {
        const {
          data:
            duplicateUser,
          error:
            duplicateError,
        } =
          await supabaseAdmin
            .from(
              'users'
            )
            .select(
              'id'
            )
            .eq(
              'email',
              nextEmail
            )
            .neq(
              'id',
              targetUserId
            )
            .maybeSingle();

        if (
          duplicateError
        ) {
          console.error(
            'ADMIN UPDATE USER EMAIL LOOKUP ERROR:',
            duplicateError
          );

          return res
            .status(500)
            .json({
              error:
                'Unable to verify email availability.',
            });
        }

        if (
          duplicateUser
        ) {
          return res
            .status(409)
            .json({
              error:
                'An account with this email already exists.',
            });
        }

        emailChanged =
          true;

        updates.email =
          nextEmail;
      }
    }

    // --------------------------------------------------------
    // FIRST NAME
    // --------------------------------------------------------

    if (
      first_name !==
      undefined
    ) {
      const value =
        cleanRequiredText(
          first_name
        );

      if (
        !value
      ) {
        return res
          .status(400)
          .json({
            error:
              'First name cannot be empty.',
          });
      }

      updates.first_name =
        value;
    }

    // --------------------------------------------------------
    // MIDDLE NAME
    // --------------------------------------------------------

    if (
      middle_name !==
      undefined
    ) {
      updates.middle_name =
        cleanOptionalText(
          middle_name
        );
    }

    // --------------------------------------------------------
    // LAST NAME
    // --------------------------------------------------------

    if (
      last_name !==
      undefined
    ) {
      const value =
        cleanRequiredText(
          last_name
        );

      if (
        !value
      ) {
        return res
          .status(400)
          .json({
            error:
              'Last name cannot be empty.',
          });
      }

      updates.last_name =
        value;
    }

    // --------------------------------------------------------
    // SUFFIX
    // --------------------------------------------------------

    if (
      suffix !==
      undefined
    ) {
      updates.suffix =
        cleanOptionalText(
          suffix
        );
    }

    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (
      phone !==
      undefined
    ) {
      const phoneCheck =
        normalizePhone(
          phone
        );

      if (
        !phoneCheck.valid
      ) {
        return res
          .status(400)
          .json({
            error:
              phoneCheck.error,
          });
      }

      updates.phone =
        phoneCheck.value;
    }

    // --------------------------------------------------------
    // DATE OF BIRTH
    // --------------------------------------------------------

    if (
      date_of_birth !==
      undefined
    ) {
      if (
        date_of_birth ===
        null ||
        cleanText(
          date_of_birth
        ) ===
        ''
      ) {
        updates.date_of_birth =
          null;
      } else {
        const validation =
          validateDateOfBirth(
            date_of_birth
          );

        if (
          !validation.valid
        ) {
          return res
            .status(400)
            .json({
              error:
                validation.error,
            });
        }

        updates.date_of_birth =
          validation.value;
      }
    }

    // --------------------------------------------------------
    // GENDER
    // --------------------------------------------------------

    if (
      gender !==
      undefined
    ) {
      if (
        gender ===
        null ||
        cleanText(
          gender
        ) ===
        ''
      ) {
        updates.gender =
          null;
      } else {
        const value =
          cleanText(
            gender
          );

        if (
          !VALID_GENDERS.includes(
            value
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                'Invalid gender value.',
            });
        }

        updates.gender =
          value;
      }
    }

    // --------------------------------------------------------
    // ADDRESS
    // --------------------------------------------------------

    if (
      barangay !==
      undefined
    ) {
      updates.barangay =
        cleanOptionalText(
          barangay
        );
    }

    if (
      city !==
      undefined
    ) {
      updates.city =
        cleanOptionalText(
          city
        );
    }

    if (
      province !==
      undefined
    ) {
      updates.province =
        cleanOptionalText(
          province
        );
    }

    // --------------------------------------------------------
    // EMPTY UPDATE
    // --------------------------------------------------------

    if (
      Object.keys(
        updates
      ).length ===
      0
    ) {
      return res
        .status(400)
        .json({
          error:
            'No valid fields to update.',
        });
    }

    // --------------------------------------------------------
    // UPDATE AUTH EMAIL FIRST
    // --------------------------------------------------------

    if (
      emailChanged
    ) {
      const {
        error:
          authEmailError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .updateUserById(
            targetUserId,
            {
              email:
                nextEmail,

              email_confirm:
                true,
            }
          );

      if (
        authEmailError
      ) {
        console.error(
          'ADMIN UPDATE AUTH EMAIL ERROR:',
          authEmailError
        );

        const message =
          String(
            authEmailError.message ||
            ''
          ).toLowerCase();

        if (
          message.includes(
            'already'
          ) ||
          message.includes(
            'registered'
          )
        ) {
          return res
            .status(409)
            .json({
              error:
                'An account with this email already exists.',
            });
        }

        return res
          .status(500)
          .json({
            error:
              'Unable to update the user email address.',
          });
      }
    }

    // --------------------------------------------------------
    // UPDATE PUBLIC PROFILE
    // --------------------------------------------------------

    updates.updated_at =
      new Date()
        .toISOString();

    const {
      data:
        updatedUser,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update(
          updates
        )
        .eq(
          'id',
          targetUserId
        )
        .eq(
          'role',
          targetUser.role
        )
        .select('*')
        .single();

    // --------------------------------------------------------
    // ROLLBACK AUTH EMAIL IF PUBLIC UPDATE FAILS
    // --------------------------------------------------------

    if (
      updateError ||
      !updatedUser
    ) {
      console.error(
        'ADMIN UPDATE USER DATABASE ERROR:',
        updateError
      );

      if (
        emailChanged &&
        originalEmail
      ) {
        try {
          await supabaseAdmin
            .auth
            .admin
            .updateUserById(
              targetUserId,
              {
                email:
                  originalEmail,

                email_confirm:
                  true,
              }
            );
        } catch (
          rollbackError
        ) {
          console.error(
            'ADMIN UPDATE USER EMAIL ROLLBACK ERROR:',
            rollbackError
          );
        }
      }

      // Someone took the username a moment ago.
      if (
        isUsernameConflict(
          updateError
        )
      ) {
        return res
          .status(409)
          .json({
            error:
              'This username is taken. Please choose another.',

            code:
              'USERNAME_TAKEN',
          });
      }

      return res
        .status(500)
        .json({
          error:
            'Unable to update user account.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      updatedUser.id
    );

    const donorMap =
      await getDonorApplicationsByUserIds(
        [
          updatedUser.id,
        ]
      );

    return res
      .status(200)
      .json({
        message:
          'User account updated successfully.',

        user:
          buildSafeUser(
            updatedUser,
            donorMap.get(
              updatedUser.id
            ) ||
            null
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN UPDATE USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to update user account.',
      });
  }
}

// ============================================================
// DEACTIVATE USER
//
// PATCH /api/admin/users/:id/deactivate
// ============================================================

async function deactivateAdminUser(
  req,
  res
) {
  try {
    const targetUserId =
      cleanText(
        req.params.id
      );

    const adminId =
      req.dbUser?.id;

    if (
      !targetUserId
    ) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    if (
      targetUserId ===
      adminId
    ) {
      return res
        .status(400)
        .json({
          error:
            'You cannot deactivate your own administrator account.',
        });
    }

    const {
      user:
        targetUser,
      error:
        targetError,
    } =
      await findTargetUser(
        targetUserId
      );

    if (
      targetError
    ) {
      console.error(
        'ADMIN DEACTIVATE USER LOOKUP ERROR:',
        targetError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user account.',
        });
    }

    if (
      !targetUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'User not found.',
        });
    }

    const manageError =
        getManageError(
          req,
          targetUser
        );

      if (
        manageError
      ) {
        return res
          .status(403)
          .json({
            error:
              manageError,
          });
      }

    if (
      targetUser.is_active ===
      false
    ) {
      return res
        .status(200)
        .json({
          message:
            'User account is already deactivated.',

          user:
            buildSafeUser(
              targetUser
            ),
        });
    }

    const {
      reason,
      error:
        reasonError,
    } =
      readReason(
        req.body?.reason
      );

    if (reasonError) {
      return res
        .status(400)
        .json({
          error:
            reasonError,
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updatedUser,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          is_active:
            false,

          deactivated_at:
            now,

          deactivation_reason:
            reason,

          deactivated_by:
            adminId,

          updated_at:
            now,
        })
        .eq(
          'id',
          targetUserId
        )
        .eq(
          'role',
          targetUser.role
        )
        .select('*')
        .single();

    if (
      updateError
    ) {
      console.error(
        'ADMIN DEACTIVATE USER ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            isMissingMigration(
              updateError
            )
              ? MIGRATION_MESSAGE
              : 'Unable to deactivate user account.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      updatedUser.id
    );

    // Their open offers, invitations and active requests stop
    // waiting on them.
    const released =
      await releaseDeactivatedAccount(
        updatedUser.id
      );

    const releaseSummary =
      describeRelease(
        released
      );

    return res
      .status(200)
      .json({
        message:
          releaseSummary
            ? `User account deactivated successfully. ${releaseSummary}`
            : 'User account deactivated successfully.',

        released,

        user:
          buildSafeUser(
            updatedUser
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN DEACTIVATE USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// ACTIVATE USER
//
// PATCH /api/admin/users/:id/activate
// ============================================================

async function activateAdminUser(
  req,
  res
) {
  try {
    const targetUserId =
      cleanText(
        req.params.id
      );

    if (
      !targetUserId
    ) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    const {
      user:
        targetUser,
      error:
        targetError,
    } =
      await findTargetUser(
        targetUserId
      );

    if (
      targetError
    ) {
      console.error(
        'ADMIN ACTIVATE USER LOOKUP ERROR:',
        targetError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user account.',
        });
    }

    if (
      !targetUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'User not found.',
        });
    }

    const manageError =
        getManageError(
          req,
          targetUser
        );

      if (
        manageError
      ) {
        return res
          .status(403)
          .json({
            error:
              manageError,
          });
      }

    if (
      targetUser.is_active !==
      false
    ) {
      return res
        .status(200)
        .json({
          message:
            'User account is already active.',

          user:
            buildSafeUser(
              targetUser
            ),
        });
    }

    const now =
      new Date()
        .toISOString();

    const activate =
      fields =>
        supabaseAdmin
          .from(
            'users'
          )
          .update({
            is_active:
              true,

            deactivated_at:
              null,

            updated_at:
              now,

            ...fields,
          })
          .eq(
            'id',
            targetUserId
          )
          .eq(
            'role',
            targetUser.role
          )
          .select('*')
          .single();

    let {
      data:
        updatedUser,
      error:
        updateError,
    } =
      await activate({
        deactivation_reason:
          null,

        deactivated_by:
          null,
      });

    // Before migration 20261102 there is no reason to clear.
    if (
      isMissingMigration(
        updateError
      )
    ) {
      ({
        data:
          updatedUser,
        error:
          updateError,
      } =
        await activate({}));
    }

    if (
      updateError
    ) {
      console.error(
        'ADMIN ACTIVATE USER ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to activate user account.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      updatedUser.id
    );

    // Reactivating answers an open review request.
    const {
      error:
        reviewError,
    } =
      await supabaseAdmin
        .from(
          'account_reviews'
        )
        .update({
          status:
            'approved',

          reviewed_by:
            req.dbUser?.id ||
            null,

          reviewed_at:
            now,
        })
        .eq(
          'user_id',
          updatedUser.id
        )
        .eq(
          'status',
          'pending'
        );

    if (
      reviewError &&
      !isMissingMigration(
        reviewError
      )
    ) {
      console.error(
        'ADMIN APPROVE REVIEW ERROR:',
        reviewError
      );
    }

    return res
      .status(200)
      .json({
        message:
          'User account activated successfully.',

        user:
          buildSafeUser(
            updatedUser
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN ACTIVATE USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// PERMANENTLY DELETE USER
//
// DELETE /api/admin/users/:id
//
// ADMIN ONLY
//
// The administrator is the actor in the activity log.
// The deleted user UUID remains in entity_id.
// ============================================================

async function deleteAdminUser(
  req,
  res
) {
  try {
    const targetUserId =
      cleanText(
        req.params.id
      );

    if (
      !targetUserId
    ) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    // --------------------------------------------------------
    // LOAD TARGET
    // --------------------------------------------------------

    const {
      user:
        targetUser,
      error:
        targetError,
    } =
      await findTargetUser(
        targetUserId
      );

    if (
      targetError
    ) {
      console.error(
        'ADMIN DELETE USER LOOKUP ERROR:',
        targetError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user account.',
        });
    }

    if (
      !targetUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'User not found.',
        });
    }

    // --------------------------------------------------------
    // ADMIN PROTECTION
    // --------------------------------------------------------

    const manageError =
        getManageError(
          req,
          targetUser
        );

      if (
        manageError
      ) {
        return res
          .status(403)
          .json({
            error:
              manageError,
          });
      }

    // --------------------------------------------------------
    // REASON (kept by a hash of the email, so it can be shown
    // if someone signs in with that email again)
    // --------------------------------------------------------

    const {
      reason,
      error:
        reasonError,
    } =
      readReason(
        req.body?.reason
      );

    if (reasonError) {
      return res
        .status(400)
        .json({
          error:
            reasonError,
        });
    }

    if (targetUser.email) {
      const {
        error:
          removalError,
      } =
        await supabaseAdmin
          .from(
            'removed_accounts'
          )
          .insert({
            email_hash:
              emailHash(
                targetUser.email
              ),

            reason,

            removed_by:
              req.dbUser?.id ||
              null,
          });

      if (removalError) {
        console.error(
          'ADMIN DELETE USER REASON ERROR:',
          removalError
        );

        return res
          .status(500)
          .json({
            error:
              isMissingMigration(
                removalError
              )
                ? MIGRATION_MESSAGE
                : 'Unable to save the reason. The account was not deleted.',
          });
      }
    }

    // --------------------------------------------------------
    // RELEASE OPEN OFFERS AND REQUESTS
    //
    // Same as deactivating: donors and requesters waiting on
    // this person are told before the delete removes their
    // requests, offers and chats. Runs first because it reads
    // the account (the notifications use their name). Only
    // user accounts are deleted below.
    // --------------------------------------------------------

    const released =
      targetUser.role ===
      'user'
        ? await releaseDeactivatedAccount(
            targetUserId
          )
        : null;

    // --------------------------------------------------------
    // DELETE PUBLIC USER FIRST
    //
    // Existing foreign-key rules handle related Hemo-Hero data.
    // --------------------------------------------------------

    const {
      data:
        deletedUser,
      error:
        databaseDeleteError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .delete()
        .eq(
          'id',
          targetUserId
        )
        .eq(
          'role',
          targetUser.role
        )
        .select(
          'id'
        )
        .maybeSingle();

    if (
      databaseDeleteError
    ) {
      console.error(
        'ADMIN PERMANENT USER DATABASE DELETE ERROR:',
        databaseDeleteError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to delete user data.',

          code:
            'USER_DATA_DELETE_FAILED',
        });
    }

    if (
      !deletedUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'User account could not be found.',

          code:
            'USER_NOT_FOUND',
        });
    }

    // --------------------------------------------------------
    // KEEP TARGET ID FOR ACTIVITY LOG
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    // --------------------------------------------------------
    // DELETE SUPABASE AUTH ACCOUNT
    // --------------------------------------------------------

    const {
      error:
        authDeleteError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .deleteUser(
          targetUserId
        );

    if (
      authDeleteError
    ) {
      console.error(
        'ADMIN PERMANENT USER AUTH DELETE ERROR:',
        authDeleteError
      );

      return res
        .status(500)
        .json({
          error:
            'The user data was removed, but the authentication account could not be fully deleted.',

          code:
            'AUTH_ACCOUNT_DELETE_FAILED',

          data_deleted:
            true,
        });
    }

    const releaseSummary =
      describeRelease(
        released
      );

    return res
      .status(200)
      .json({
        message:
          releaseSummary
            ? `User account permanently deleted successfully. ${releaseSummary}`
            : 'User account permanently deleted successfully.',

        released,

        deleted:
          true,

        user_id:
          targetUserId,
      });
  } catch (
    error
  ) {
    console.error(
      'ADMIN DELETE USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to permanently delete user account.',

        code:
          'USER_DELETE_FAILED',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

// ============================================================
// LOCK / UNLOCK / ROLE
//
// PATCH /api/admin/users/:id/lock     { reason? }
// PATCH /api/admin/users/:id/unlock
// PATCH /api/admin/users/:id/role     { role }  (super admin)
//
// Lock: the account can't sign in and its current sessions
// stop working (authMiddleware), until unlocked. Supabase also
// bans the sign-in, so its sessions can't be renewed. Unlike
// deactivating, nothing else about the account changes.
//
// Unlock: lifts that lock and also clears a sign-in lockout
// from wrong passwords (and with it the CAPTCHA).
// ============================================================

// Effectively forever; lifted by Unlock.
const LOCK_BAN_DURATION =
  '876000h';

const MAX_LOCK_REASON_LENGTH =
  300;

// The account to act on, or null after sending the error.
// ============================================================
// DECLINE AN ACCOUNT REVIEW
//
// PATCH /api/admin/users/:id/review/decline { note }
//
// The account stays deactivated. The note is shown to the
// person the next time they sign in; they can ask again.
// (Reactivating the account approves the request instead.)
// ============================================================

async function declineAccountReview(
  req,
  res
) {
  try {
    const targetUserId =
      cleanText(
        req.params.id
      );

    if (!targetUserId) {
      return res
        .status(400)
        .json({
          error:
            'User ID is required.',
        });
    }

    setActivityEntity(
      res,
      'user_account',
      targetUserId
    );

    const {
      reason:
        note,
      error:
        noteError,
    } =
      readReason(
        req.body?.note
      );

    if (noteError) {
      return res
        .status(400)
        .json({
          error:
            'Write a note. The person sees it when they try to sign in.',
        });
    }

    const {
      data:
        review,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'account_reviews'
        )
        .update({
          status:
            'declined',

          admin_note:
            note,

          reviewed_by:
            req.dbUser?.id ||
            null,

          reviewed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'user_id',
          targetUserId
        )
        .eq(
          'status',
          'pending'
        )
        .select(
          'id, status, message, admin_note, created_at, reviewed_at'
        )
        .maybeSingle();

    if (updateError) {
      console.error(
        'ADMIN DECLINE REVIEW ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            isMissingMigration(
              updateError
            )
              ? MIGRATION_MESSAGE
              : 'Unable to decline the request.',
        });
    }

    if (!review) {
      return res
        .status(404)
        .json({
          error:
            'There is no open review request for this account.',
        });
    }

    return res
      .status(200)
      .json({
        message:
          'Review request declined. The account stays deactivated.',

        review,
      });
  } catch (error) {
    console.error(
      'ADMIN DECLINE REVIEW SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

async function loadTargetForAction(
  req,
  res,
  {
    selfError,
    logTag,
  }
) {
  const targetUserId =
    cleanText(
      req.params.id
    );

  if (!targetUserId) {
    res
      .status(400)
      .json({
        error:
          'User ID is required.',
      });

    return null;
  }

  setActivityEntity(
    res,
    'user_account',
    targetUserId
  );

  if (
    targetUserId ===
    req.dbUser?.id
  ) {
    res
      .status(400)
      .json({
        error:
          selfError,
      });

    return null;
  }

  const {
    user:
      targetUser,
    error:
      targetError,
  } =
    await findTargetUser(
      targetUserId
    );

  if (targetError) {
    console.error(
      `ADMIN ${logTag} LOOKUP ERROR:`,
      targetError
    );

    res
      .status(500)
      .json({
        error:
          'Unable to load user account.',
      });

    return null;
  }

  if (!targetUser) {
    res
      .status(404)
      .json({
        error:
          'User not found.',
      });

    return null;
  }

  const manageError =
    getManageError(
      req,
      targetUser
    );

  if (manageError) {
    res
      .status(403)
      .json({
        error:
          manageError,
      });

    return null;
  }

  return targetUser;
}

// The users columns come from migration 20261022_account_lock.
function sendLockColumnError(
  res,
  error,
  logTag
) {
  console.error(
    `ADMIN ${logTag} ERROR:`,
    error
  );

  const missingColumn =
    error?.code ===
      '42703' ||
    error?.code ===
      'PGRST204';

  return res
    .status(500)
    .json({
      error:
        missingColumn
          ? 'Account locking needs database migration 20261022_account_lock.sql. Run it in the Supabase SQL editor.'
          : 'Unable to update the account.',
    });
}

async function setSignInBan(
  userId,
  banned
) {
  try {
    const {
      error,
    } =
      await supabaseAdmin
        .auth
        .admin
        .updateUserById(
          userId,
          {
            ban_duration:
              banned
                ? LOCK_BAN_DURATION
                : 'none',
          }
        );

    if (error) {
      console.error(
        'SIGN-IN BAN ERROR:',
        error.message
      );
    }
  } catch (error) {
    console.error(
      'SIGN-IN BAN ERROR:',
      error
    );
  }
}

// ------------------------------------------------------------
// PATCH /api/admin/users/:id/lock
// ------------------------------------------------------------

async function lockAdminUser(
  req,
  res
) {
  try {
    const targetUser =
      await loadTargetForAction(
        req,
        res,
        {
          selfError:
            'You cannot lock your own account.',

          logTag:
            'LOCK USER',
        }
      );

    if (!targetUser) {
      return;
    }

    const reason =
      cleanText(
        req.body?.reason
      ).slice(
        0,
        MAX_LOCK_REASON_LENGTH
      );

    if (
      targetUser.is_locked ===
      true
    ) {
      return res
        .status(200)
        .json({
          message:
            'This account is already locked.',

          user:
            buildSafeUser(
              targetUser
            ),
        });
    }

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updatedUser,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          is_locked:
            true,

          locked_at:
            now,

          locked_reason:
            reason ||
            null,

          updated_at:
            now,
        })
        .eq(
          'id',
          targetUser.id
        )
        .eq(
          'role',
          targetUser.role
        )
        .select('*')
        .single();

    if (updateError) {
      return sendLockColumnError(
        res,
        updateError,
        'LOCK USER'
      );
    }

    // Sessions can't be renewed while locked.
    await setSignInBan(
      targetUser.id,
      true
    );

    setActivityOutcome(
      res,
      {
        description:
          `Administrator locked ${targetUser.email}${reason ? `. Reason: ${reason}` : '.'}`,
      }
    );

    return res
      .status(200)
      .json({
        message:
          'Account locked. The user is signed out and can\'t sign in until the account is unlocked.',

        user:
          buildSafeUser(
            updatedUser
          ),
      });
  } catch (error) {
    console.error(
      'ADMIN LOCK USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ------------------------------------------------------------
// PATCH /api/admin/users/:id/unlock
// ------------------------------------------------------------

async function unlockAdminUser(
  req,
  res
) {
  try {
    const targetUser =
      await loadTargetForAction(
        req,
        res,
        {
          selfError:
            'You cannot unlock your own account.',

          logTag:
            'UNLOCK USER',
        }
      );

    if (!targetUser) {
      return;
    }

    const lockouts =
      await getLoginLockoutsByEmails(
        [
          targetUser.email,
        ]
      );

    const signInLockout =
      describeLoginLockout(
        lockoutFor(
          lockouts,
          targetUser
        )
      );

    const adminLocked =
      targetUser.is_locked ===
      true;

    if (
      !adminLocked &&
      !signInLockout
    ) {
      return res
        .status(200)
        .json({
          message:
            'This account is not locked.',

          user:
            buildSafeUser(
              targetUser
            ),
        });
    }

    let updatedUser =
      targetUser;

    if (adminLocked) {
      const {
        data,
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            'users'
          )
          .update({
            is_locked:
              false,

            locked_at:
              null,

            locked_reason:
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            targetUser.id
          )
          .eq(
            'role',
            targetUser.role
          )
          .select('*')
          .single();

      if (updateError) {
        return sendLockColumnError(
          res,
          updateError,
          'UNLOCK USER'
        );
      }

      updatedUser =
        data;

      await setSignInBan(
        targetUser.id,
        false
      );
    }

    // Wrong-password lockout, its level and the CAPTCHA.
    clearLoginLockout(
      targetUser.email
    );

    const cleared = [
      adminLocked &&
        'the administrator lock',

      signInLockout &&
        'the sign-in lockout from wrong passwords',
    ]
      .filter(Boolean)
      .join(' and ');

    setActivityOutcome(
      res,
      {
        description:
          `Administrator unlocked ${targetUser.email}: removed ${cleared}.`,
      }
    );

    return res
      .status(200)
      .json({
        message:
          'Account unlocked. The user can sign in again.',

        user:
          buildSafeUser(
            updatedUser
          ),
      });
  } catch (error) {
    console.error(
      'ADMIN UNLOCK USER SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ------------------------------------------------------------
// PATCH /api/admin/users/:id/role
//
// Super admin only (route). Between user and admin; the super
// admin role itself can't be given or taken here.
// ------------------------------------------------------------

const ROLE_LABELS = {
  user:
    'User',

  admin:
    'Admin',
};

async function changeAdminUserRole(
  req,
  res
) {
  try {
    const newRole =
      cleanText(
        req.body?.role
      ).toLowerCase();

    if (
      !ROLE_LABELS[newRole]
    ) {
      return res
        .status(400)
        .json({
          error:
            'Role must be user or admin.',
        });
    }

    const targetUser =
      await loadTargetForAction(
        req,
        res,
        {
          selfError:
            'You cannot change your own role.',

          logTag:
            'CHANGE ROLE',
        }
      );

    if (!targetUser) {
      return;
    }

    if (
      !ROLE_LABELS[
        targetUser.role
      ]
    ) {
      return res
        .status(403)
        .json({
          error:
            'This account\'s role can\'t be changed here.',
        });
    }

    if (
      targetUser.role ===
      newRole
    ) {
      return res
        .status(400)
        .json({
          error:
            `This account is already ${ROLE_LABELS[newRole] === 'Admin' ? 'an Admin' : 'a User'}.`,
        });
    }

    const {
      data:
        updatedUser,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          role:
            newRole,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          targetUser.id
        )
        .eq(
          'role',
          targetUser.role
        )
        .select('*')
        .single();

    if (updateError) {
      console.error(
        'ADMIN CHANGE ROLE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to change the role.',
        });
    }

    setActivityOutcome(
      res,
      {
        description:
          `Super admin changed the role of ${targetUser.email} from ${ROLE_LABELS[targetUser.role]} to ${ROLE_LABELS[newRole]}.`,
      }
    );

    return res
      .status(200)
      .json({
        message:
          newRole ===
          'admin'
            ? 'Role changed to Admin. They can now sign in to the Admin Portal.'
            : 'Role changed to User. They can no longer use the Admin Portal.',

        user:
          buildSafeUser(
            updatedUser
          ),
      });
  } catch (error) {
    console.error(
      'ADMIN CHANGE ROLE SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

module.exports = {
  declineAccountReview,
  getAdminUserSummary,
  getAdminUsers,
  getAdminUserById,

  createAdminUser,
  updateAdminUser,

  deactivateAdminUser,
  activateAdminUser,

  lockAdminUser,
  unlockAdminUser,
  changeAdminUserRole,

  deleteAdminUser,
};