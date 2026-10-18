const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

const {
  setActivityEntity,
} = require(
  '../middleware/activityLogMiddleware'
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

function buildSafeUser(
  user,
  donorApplication = null
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
        .select(`
          id,
          role,
          is_active
        `)
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
    };

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
        user =>
          buildSafeUser(
            user,
            donorMap.get(
              user.id
            ) ||
            null
          )
      );

    return res
      .status(200)
      .json({
        users,

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

    return res
      .status(200)
      .json({
        user:
          buildSafeUser(
            user,
            donorMap.get(
              user.id
            ) ||
            null
          ),
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
    } =
      req.body ||
      {};

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
    } =
      req.body ||
      {};

    const updates =
      {};

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
          'user'
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

          updated_at:
            now,
        })
        .eq(
          'id',
          targetUserId
        )
        .eq(
          'role',
          'user'
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
            'Unable to deactivate user account.',
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
            true,

          deactivated_at:
            null,

          updated_at:
            now,
        })
        .eq(
          'id',
          targetUserId
        )
        .eq(
          'role',
          'user'
        )
        .select('*')
        .single();

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
          'user'
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

module.exports = {
  getAdminUserSummary,
  getAdminUsers,
  getAdminUserById,

  createAdminUser,
  updateAdminUser,

  deactivateAdminUser,
  activateAdminUser,

  deleteAdminUser,
};