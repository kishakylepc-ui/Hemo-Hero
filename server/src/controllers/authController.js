const {
  supabaseAnon,
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// ACTIVITY LOG HELPERS
// ============================================================

const {
  setActivityUser,
  setActivityEntity,
  setActivityOutcome,
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  createCaptcha,
} = require(
  '../services/captchaService'
);

// 10-minute codes, 5 wrong tries, 60 s between codes.
const {
  getResendBlock,
  recordCodeSent,
  getVerifyBlock,
  recordWrongCode,
  recordCodeUsed,
} = require(
  '../services/otpGuardService'
);

const {
  clearLoginLockout,
} = require(
  '../middleware/loginRateLimiter'
);

const {
  getBloodTypeProof,
  removeBloodTypeProofs,
} = require(
  '../services/bloodTypeProofService'
);

const {
  normalizePhone,
} = require(
  '../utils/phone'
);

const {
  isAdminRole,
} = require(
  '../utils/roles'
);

const {
  normalizeUsername,
  checkUsernameTaken,
  isUsernameConflict,
} = require(
  '../utils/username'
);

const {
  MIN_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
  MIGRATION_MESSAGE,
  createReviewToken,
  verifyReviewToken,
  isMissingMigration,
  getLatestReview,
  getRemovalRecord,
  describeDeactivation,
  reviewForClient,
} = require(
  '../services/accountReviewService'
);

const {
  notifyAdmins,
} = require(
  '../services/notificationService'
);

// The profile plus whether a blood type proof is on file.
async function withBloodTypeProof(
  user
) {
  if (!user) {
    return user;
  }

  const proof =
    await getBloodTypeProof(
      user.id
    );

  return {
    ...user,

    blood_type_proof:
      proof
        ? {
            uploaded_at:
              proof.uploaded_at,
          }
        : null,
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const VALID_GENDERS = [
  'Male',
  'Female',
  'Prefer not to say',
];

const VALID_BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// ============================================================
// HELPERS
// ============================================================

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
    value === null ||
    value === undefined
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
// PASSWORD VALIDATION
// ============================================================

function validatePassword(
  password
) {
  if (
    typeof password !==
    'string'
  ) {
    return {
      valid: false,

      error:
        'Password must be text',
    };
  }

  if (
    password.length <
    8
  ) {
    return {
      valid: false,

      error:
        'Password must be at least 8 characters',
    };
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one lowercase letter',
    };
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one uppercase letter',
    };
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one number',
    };
  }

  if (
    !/[^A-Za-z0-9]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one special character',
    };
  }

  return {
    valid: true,
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
      valid: false,

      error:
        'date_of_birth must be text',
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
      valid: false,

      error:
        'date_of_birth must use YYYY-MM-DD format',
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
      valid: false,

      error:
        'Invalid date of birth',
    };
  }

  const today =
    new Date();

  const todayUtc =
    new Date(
      Date.UTC(
        today
          .getUTCFullYear(),

        today
          .getUTCMonth(),

        today
          .getUTCDate()
      )
    );

  if (
    birthDate >
    todayUtc
  ) {
    return {
      valid: false,

      error:
        'Date of birth cannot be in the future',
    };
  }

  return {
    valid: true,

    value:
      cleanDate,
  };
}

// ============================================================
// COORDINATE
// ============================================================

function parseCoordinate(
  value,
  type
) {
  if (
    value === null ||
    value === ''
  ) {
    return {
      valid: true,

      value: null,
    };
  }

  const number =
    typeof value ===
      'number'
      ? value
      : Number(
          value
        );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return {
      valid: false,

      error:
        `${type} must be a valid number`,
    };
  }

  if (
    type ===
      'latitude' &&
    (
      number <
        -90 ||
      number >
        90
    )
  ) {
    return {
      valid: false,

      error:
        'latitude must be between -90 and 90',
    };
  }

  if (
    type ===
      'longitude' &&
    (
      number <
        -180 ||
      number >
        180
    )
  ) {
    return {
      valid: false,

      error:
        'longitude must be between -180 and 180',
    };
  }

  return {
    valid: true,

    value:
      number,
  };
}

// ============================================================
// PROFILE PHOTO URL
// ============================================================

function validateProfilePhotoUrl(
  value
) {
  if (
    value === null ||
    value === ''
  ) {
    return {
      valid: true,

      value: null,
    };
  }

  if (
    typeof value !==
    'string'
  ) {
    return {
      valid: false,

      error:
        'profile_photo_url must be text',
    };
  }

  const cleanUrl =
    value.trim();

  if (!cleanUrl) {
    return {
      valid: true,

      value: null,
    };
  }

  try {
    const url =
      new URL(
        cleanUrl
      );

    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {
      return {
        valid: false,

        error:
          'profile_photo_url must use http or https',
      };
    }

    return {
      valid: true,

      value:
        cleanUrl,
    };
  } catch {
    return {
      valid: false,

      error:
        'profile_photo_url must be a valid URL',
    };
  }
}

// ============================================================
// POST /api/auth/register
// ============================================================

async function register(
  req,
  res
) {
  try {
    const {
      email,
      username,
      password,
      confirm_password,
    } =
      req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (
      !email ||
      !username ||
      !password ||
      !confirm_password
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Email, username, password, and confirm password are required.',
        });
    }

    // --------------------------------------------------------
    // FIELD TYPES
    // --------------------------------------------------------

    if (
      typeof email !==
        'string' ||
      typeof password !==
        'string' ||
      typeof confirm_password !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email and password fields must be text',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // EMAIL FORMAT
    // --------------------------------------------------------

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter a valid email address',
        });
    }

    // --------------------------------------------------------
    // CONFIRM PASSWORD
    // --------------------------------------------------------

    if (
      password !==
      confirm_password
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Passwords do not match',
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
      !passwordValidation
        .valid
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            passwordValidation
              .error,
        });
    }

    // --------------------------------------------------------
    // USERNAME: VALID AND FREE
    // --------------------------------------------------------

    const usernameCheck =
      normalizeUsername(
        username
      );

    if (
      !usernameCheck.valid
    ) {
      return res
        .status(
          400
        )
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
        .status(
          500
        )
        .json({
          error:
            usernameLookup.error,
        });
    }

    if (
      usernameLookup.taken
    ) {
      return res
        .status(
          409
        )
        .json({
          error:
            'This username is taken. Please choose another.',

          code:
            'USERNAME_TAKEN',
        });
    }

    // --------------------------------------------------------
    // CREATE SUPABASE AUTH ACCOUNT
    // --------------------------------------------------------

    const frontendUrl =
      process.env
        .FRONTEND_URL ||
      'http://localhost:8081';

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .signUp({
          email:
            cleanEmail,

          password,

          options: {
            emailRedirectTo:
              `${frontendUrl}/`,

            data: {
              onboarding_complete:
                false,
            },
          },
        });

    // --------------------------------------------------------
    // ALREADY REGISTERED
    //
    // Supabase either errors ("User already registered") or,
    // with email confirmation on, returns a user with no
    // identities and sends nothing. Without this the app would
    // wait for a verification code that never comes. (Sign in
    // already tells whether an account exists.)
    // --------------------------------------------------------

    const alreadyRegistered =
      (error &&
        /already (registered|exists)/i.test(
          error.message ||
            ''
        )) ||
      (!error &&
        Array.isArray(
          data?.user
            ?.identities
        ) &&
        data.user
          .identities
          .length === 0);

    if (
      alreadyRegistered
    ) {
      return res
        .status(
          409
        )
        .json({
          code:
            'EMAIL_ALREADY_REGISTERED',

          error:
            'An account with this email already exists.',
        });
    }

    if (error) {
      console.log(
        'REGISTER ERROR:',
        error.message
      );

      const tooManyEmails =
        error.status === 429 ||
        /rate limit/i.test(
          error.message ||
            ''
        );

      return res
        .status(
          tooManyEmails
            ? 429
            : 400
        )
        .json({
          error:
            tooManyEmails
              ? 'Too many emails were sent just now. Please wait a while and try again.'
              : error.code === 'weak_password'
                ? 'Please choose a stronger password.'
                : 'Unable to create your account. Please check your details and try again.',
        });
    }

    if (
      !data?.user
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to create account',
        });
    }

    // --------------------------------------------------------
    // SAVE THE USERNAME
    //
    // The auth trigger made the users row during signUp. If
    // someone took the name a moment ago, the account still
    // works and they pick another in Edit Profile.
    // --------------------------------------------------------

    const {
      error:
        usernameSaveError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          username:
            usernameCheck.value,
        })
        .eq(
          'id',
          data.user.id
        );

    if (
      usernameSaveError
    ) {
      console.error(
        'REGISTER USERNAME ERROR:',
        usernameSaveError
      );
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          data.user.id,

        email:
          data.user.email,

        role:
          'user',
      }
    );

    setActivityEntity(
      res,
      'user_account',
      data.user.id
    );

    // A verification code was emailed: its time limit and
    // tries start now.
    if (
      !data.session
    ) {
      await recordCodeSent(
        'signup',
        cleanEmail
      );
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res
      .status(
        201
      )
      .json({
        message:
          data.session
            ? 'Account created successfully'
            : 'Account created. Please verify your email.',

        user: {
          id:
            data.user.id,

          email:
            data.user
              .email,
        },

        session:
          data.session ??
          null,
      });
  } catch (
    error
  ) {
    console.log(
      'REGISTER CONTROLLER ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Internal server error',
      });
  }
}

// ============================================================
// POST /api/auth/verify-email
// ============================================================

// The right app for the account: admin accounts use the Admin
// Portal (which sends { portal: 'admin' }), everyone else the
// app. Says why not, or null when it's fine.
function getPortalRefusal(
  role,
  portal
) {
  const adminAccount =
    isAdminRole(
      role
    );

  if (
    portal === 'admin' &&
    !adminAccount
  ) {
    return {
      description:
        `Blocked: an account with the ${role || 'unknown'} role tried to sign in to the Admin Portal.`,

      error:
        'This account is not authorized to access the Hemo-Hero Admin Portal.',

      code:
        'ADMIN_REQUIRED',
    };
  }

  if (
    portal !== 'admin' &&
    adminAccount
  ) {
    return {
      description:
        `Blocked: an account with the ${role} role tried to sign in to the user app.`,

      error:
        'Admin accounts sign in through the Hemo-Hero Admin Portal.',

      code:
        'USE_ADMIN_PORTAL',
    };
  }

  return null;
}

// Ends only this new session; other sessions stay.
async function endNewSession(
  accessToken
) {
  try {
    await supabaseAdmin
      .auth
      .admin
      .signOut(
        accessToken,
        'local'
      );
  } catch (signOutError) {
    console.error(
      'END NEW SESSION ERROR:',
      signOutError
    );
  }
}

// Emails a new verification code. False if it couldn't be sent.
async function sendVerificationCode(
  cleanEmail
) {
  const frontendUrl =
    process.env
      .FRONTEND_URL ||
    'http://localhost:8081';

  const {
    error,
  } =
    await supabaseAnon
      .auth
      .resend({
        type:
          'signup',

        email:
          cleanEmail,

        options: {
          emailRedirectTo:
            `${frontendUrl}/`,
        },
      });

  if (error) {
    console.error(
      'RESEND VERIFICATION SUPABASE ERROR:',
      error.message
    );

    return false;
  }

  await recordCodeSent(
    'signup',
    cleanEmail
  );

  return true;
}

async function verifyEmail(
  req,
  res
) {
  try {
    const {
      email,
      code,
    } =
      req.body;

    if (
      !email ||
      !code
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email and code are required',
        });
    }

    if (
      typeof email !==
        'string' ||
      typeof code !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email and code must be text',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const cleanCode =
      code.trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter a valid email address',
        });
    }

    if (
      !/^\d{6}$/.test(
        cleanCode
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Verification code must be 6 digits',
        });
    }

    // Expired, or too many wrong tries: a new code is needed.
    const blocked =
      await getVerifyBlock(
        'signup',
        cleanEmail
      );

    if (blocked) {
      setActivityOutcome(
        res,
        {
          description:
            `Email verification blocked: ${blocked.body.error}`,
        }
      );

      return res
        .status(
          blocked.status
        )
        .json(
          blocked.body
        );
    }

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .verifyOtp({
          email:
            cleanEmail,

          token:
            cleanCode,

          type:
            'email',
        });

    if (error) {
      console.error(
        'VERIFY EMAIL SUPABASE ERROR:',
        error.message
      );

      const wrong =
        await recordWrongCode(
          'signup',
          cleanEmail
        );

      setActivityOutcome(
        res,
        {
          description:
            `Email verification failed: ${wrong.body.error}`,
        }
      );

      return res
        .status(
          wrong.status
        )
        .json(
          wrong.body
        );
    }

    // Each code works once.
    await recordCodeUsed(
      'signup',
      cleanEmail
    );

    if (
      !data?.user
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to verify email',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          data.user.id,

        email:
          data.user.email,

        role:
          null,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      data.user.id
    );

    // --------------------------------------------------------
    // SIGN IN RIGHT AWAY
    //
    // Verifying the code also gives a session. It is returned
    // the same way as from /login, so the app goes straight to
    // completing the profile instead of the sign-in screen.
    // Without a usable profile the person just signs in.
    // --------------------------------------------------------

    let profile =
      null;

    if (
      data.session
        ?.access_token
    ) {
      const {
        data:
          dbUser,

        error:
          dbError,
      } =
        await supabaseAdmin
          .from(
            'users'
          )
          .select(
            '*'
          )
          .eq(
            'id',
            data.user.id
          )
          .maybeSingle();

      if (dbError) {
        console.error(
          'VERIFY EMAIL PROFILE LOOKUP ERROR:',
          dbError
        );
      }

      // Verified, but this isn't their app: they sign in at the
      // right one instead.
      const wrongApp =
        dbUser &&
        getPortalRefusal(
          dbUser.role,
          req.body?.portal
        );

      if (wrongApp) {
        await endNewSession(
          data.session
            .access_token
        );
      }

      if (
        dbUser &&
        !wrongApp &&
        dbUser.is_active !==
          false &&
        dbUser.is_locked !==
          true
      ) {
        profile =
          dbUser;

        setActivityUser(
          res,
          {
            id:
              dbUser.id,

            email:
              dbUser.email,

            role:
              dbUser.role,
          }
        );
      }
    }

    if (profile) {
      // For the activity log description.
      res.locals.signedIn =
        true;

      return res
        .status(
          200
        )
        .json({
          message:
            'Email verified. You are now signed in.',

          session:
            data.session,

          user:
            data.user,

          profile,
        });
    }

    return res
      .status(
        200
      )
      .json({
        message:
          'Email verified successfully. You can now sign in.',

        user: {
          id:
            data.user.id,

          email:
            data.user
              .email,
        },
      });
  } catch (
    error
  ) {
    console.error(
      'VERIFY EMAIL ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Email verification failed',
      });
  }
}

// ============================================================
// POST /api/auth/resend-verification
// ============================================================

async function resendVerification(
  req,
  res
) {
  try {
    const {
      email,
    } =
      req.body;

    if (
      !email ||
      typeof email !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email is required',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter a valid email address',
        });
    }

    // 60 seconds between codes.
    const wait =
      await getResendBlock(
        'signup',
        cleanEmail
      );

    if (wait) {
      return res
        .status(
          wait.status
        )
        .json(
          wait.body
        );
    }

    const sent =
      await sendVerificationCode(
        cleanEmail
      );

    if (!sent) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to resend verification code. Please wait and try again.',
        });
    }

    return res
      .status(
        200
      )
      .json({
        message:
          'A new verification code has been sent to your email.',
      });
  } catch (
    error
  ) {
    console.error(
      'RESEND VERIFICATION ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Unable to resend verification code',
      });
  }
}

// ============================================================
// POST /api/auth/login
// ============================================================

async function login(
  req,
  res
) {
  try {
    const {
      email,
      password,
    } =
      req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    const emailMissing =
      typeof email !==
        'string' ||
      email.trim() ===
        '';

    const passwordMissing =
      typeof password !==
        'string' ||
      password.length ===
        0;

    // --------------------------------------------------------
    // BOTH EMPTY
    // --------------------------------------------------------

    if (
      emailMissing &&
      passwordMissing
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter your username or email, and your password.',

          code:
            'EMPTY_CREDENTIALS',
        });
    }

    // --------------------------------------------------------
    // USERNAME/EMAIL EMPTY
    // --------------------------------------------------------

    if (
      emailMissing
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter your username or email.',

          code:
            'EMAIL_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // UNKNOWN USERNAME (loginIdentifier.js)
    // --------------------------------------------------------

    if (
      req.loginUnknownUsername
    ) {
      return res
        .status(
          404
        )
        .json({
          error:
            'No account uses this username.',

          code:
            'ACCOUNT_NOT_FOUND',
        });
    }

    // --------------------------------------------------------
    // PASSWORD EMPTY
    // --------------------------------------------------------

    if (
      passwordMissing
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter your password.',

          code:
            'PASSWORD_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // INVALID TYPES
    // --------------------------------------------------------

    if (
      typeof email !==
        'string' ||
      typeof password !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Email and password must be text.',

          code:
            'INVALID_CREDENTIAL_FORMAT',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    // --------------------------------------------------------
    // EMAIL FORMAT
    // --------------------------------------------------------

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter a valid email address.',

          code:
            'INVALID_EMAIL',
        });
    }

    // --------------------------------------------------------
    // CHECK IF ACCOUNT EXISTS
    // --------------------------------------------------------

    const {
      data:
        existingAccount,

      error:
        accountLookupError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        // '*': is_locked only exists after migration 20261022.
        .select(
          '*'
        )
        .eq(
          'email',
          cleanEmail
        )
        .maybeSingle();

    if (
      accountLookupError
    ) {
      console.error(
        'LOGIN ACCOUNT LOOKUP ERROR:',
        accountLookupError
      );

      return res
        .status(
          500
        )
        .json({
          error:
            'Unable to check account information. Please try again.',

          code:
            'ACCOUNT_LOOKUP_FAILED',
        });
    }

    // --------------------------------------------------------
    // ACCOUNT DOES NOT EXIST
    // --------------------------------------------------------

    if (
      !existingAccount
    ) {
      // Deleted by an admin: say why (the reason was written for
      // the person, migration 20261102).
      const removal =
        await getRemovalRecord(
          cleanEmail
        );

      if (removal) {
        return res
          .status(
            404
          )
          .json({
            error:
              'This account was removed by Hemo-Hero.',

            code:
              'ACCOUNT_REMOVED',

            removal: {
              removed_at:
                removal.removed_at,

              reason:
                removal.reason,
            },
          });
      }

      return res
        .status(
          404
        )
        .json({
          error:
            'Account does not exist.',

          code:
            'ACCOUNT_NOT_FOUND',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    //
    // From this point onward we know which existing account
    // is attempting to sign in, even if the password is wrong.
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          existingAccount.id,

        email:
          existingAccount.email,

        role:
          existingAccount.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      existingAccount.id
    );

    // A deactivated account is told so only after its password
    // is confirmed (below), so nobody learns it from an email
    // alone; that answer also carries the reason and a way to
    // ask for a review.

    // --------------------------------------------------------
    // ACCOUNT LOCKED BY AN ADMIN
    // --------------------------------------------------------

    if (
      existingAccount
        .is_locked ===
      true
    ) {
      setActivityOutcome(
        res,
        {
          description:
            'Sign-in blocked: the account is locked by an administrator.',
        }
      );

      return res
        .status(
          403
        )
        .json({
          error:
            'Your account has been locked by an administrator. Please contact support.',

          code:
            'ACCOUNT_LOCKED',
        });
    }

    // --------------------------------------------------------
    // ATTEMPT SUPABASE LOGIN
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .signInWithPassword({
          email:
            cleanEmail,

          password,
        });

    // --------------------------------------------------------
    // LOGIN FAILED
    // --------------------------------------------------------

    if (error) {
      const message =
        String(
          error.message ||
          ''
        );

      // ------------------------------------------------------
      // EMAIL NOT VERIFIED
      // ------------------------------------------------------

      if (
        message
          .toLowerCase()
          .includes(
            'email not confirmed'
          )
      ) {
        // Supabase only says this when the password is right.
        if (
          typeof req
            .resetLoginAttempts ===
          'function'
        ) {
          req.resetLoginAttempts();
        }

        const wrongApp =
          getPortalRefusal(
            existingAccount.role,
            req.body?.portal
          );

        if (wrongApp) {
          setActivityOutcome(
            res,
            {
              action:
                'UNAUTHORIZED_ACCESS',

              module:
                'Access Control',

              description:
                wrongApp.description,
            }
          );

          return res
            .status(
              403
            )
            .json({
              error:
                wrongApp.error,

              code:
                wrongApp.code,
            });
        }

        // First sign-in: email the code now, so it's fresh. A
        // code sent under a minute ago still works.
        const recentCode =
          await getResendBlock(
            'signup',
            cleanEmail
          );

        const codeSent =
          recentCode
            ? true
            : await sendVerificationCode(
                cleanEmail
              );

        setActivityOutcome(
          res,
          {
            description:
              codeSent
                ? 'Sign-in needs email verification: a code was sent.'
                : 'Sign-in needs email verification: the code could not be sent.',
          }
        );

        return res
          .status(
            403
          )
          .json({
            error:
              'Please verify your email before signing in.',

            code:
              'EMAIL_NOT_VERIFIED',

            // They may have typed a username.
            email:
              cleanEmail,

            code_sent:
              codeSent,
          });
      }

      // ------------------------------------------------------
      // FAILED PASSWORD ATTEMPT
      // ------------------------------------------------------

      const attemptResult =
        typeof req
          .recordFailedLogin ===
        'function'
          ? req
              .recordFailedLogin()
          : null;

      const attemptsRemaining =
        Number(
          attemptResult
            ?.attempts_remaining
        );

      // ------------------------------------------------------
      // LOCKED
      // ------------------------------------------------------

      if (
        attemptResult
          ?.locked === true
      ) {
        const retryMinutes =
          Number(
            attemptResult
              ?.retry_after_minutes
          );

        const safeRetryMinutes =
          Number.isFinite(
            retryMinutes
          ) &&
          retryMinutes >
            0
            ? retryMinutes
            : 1;

        const minuteText =
          `${safeRetryMinutes} minute${safeRetryMinutes === 1 ? '' : 's'}`;

        setActivityOutcome(
          res,
          {
            action:
              'ACCOUNT_LOCKOUT',

            description:
              `Account locked for ${minuteText} after 3 incorrect passwords.`,
          }
        );

        return res
          .status(
            429
          )
          .json({
            error:
              `Too many incorrect password attempts. Please try again in ${minuteText}.`,

            code:
              'LOGIN_ACCOUNT_RATE_LIMIT',

            attempts_remaining:
              0,

            retry_after_minutes:
              safeRetryMinutes,

            retry_after_seconds:
              attemptResult
                .retry_after_seconds ??
              safeRetryMinutes *
                60,

            locked_until:
              attemptResult
                .locked_until ??
              null,

            captcha_required:
              attemptResult
                .captcha_required ===
              true,
          });
      }

      // ------------------------------------------------------
      // WRONG PASSWORD MESSAGE
      // ------------------------------------------------------

      let loginError =
        'Incorrect password.';

      if (
        Number.isFinite(
          attemptsRemaining
        )
      ) {
        if (
          attemptsRemaining ===
          1
        ) {
          loginError =
            'Incorrect password. 1 attempt remaining before temporary lockout.';
        } else if (
          attemptsRemaining >
          1
        ) {
          loginError =
            `Incorrect password. ${attemptsRemaining} attempts remaining.`;
        }
      }

      setActivityOutcome(
        res,
        {
          description:
            `User login attempt failed: ${loginError}`,
        }
      );

      return res
        .status(
          401
        )
        .json({
          error:
            loginError,

          code:
            'INCORRECT_PASSWORD',

          attempts_remaining:
            Number.isFinite(
              attemptsRemaining
            )
              ? attemptsRemaining
              : null,

          // The next attempt needs a new CAPTCHA (the one just
          // used is spent).
          captcha_required:
            attemptResult
              ?.captcha_required ===
            true,
        });
    }

    // --------------------------------------------------------
    // SUCCESSFUL LOGIN
    // --------------------------------------------------------

    if (
      typeof req
        .resetLoginAttempts ===
      'function'
    ) {
      req
        .resetLoginAttempts();
    }

    // --------------------------------------------------------
    // GET APPLICATION PROFILE
    // --------------------------------------------------------

    const {
      data:
        dbUser,

      error:
        dbError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          '*'
        )
        .eq(
          'id',
          data.user.id
        )
        .single();

    if (
      dbError ||
      !dbUser
    ) {
      console.error(
        'LOGIN PROFILE LOOKUP ERROR:',
        dbError
      );

      return res
        .status(
          404
        )
        .json({
          error:
            'User profile not found',
        });
    }

    // --------------------------------------------------------
    // UPDATE ACTIVITY IDENTITY WITH FULL PROFILE
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          dbUser.id,

        email:
          dbUser.email,

        role:
          dbUser.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      dbUser.id
    );

    // --------------------------------------------------------
    // ACCOUNT DEACTIVATED
    //
    // The password was right, so the person learns when and
    // why, sees any review request they sent, and gets a short-
    // lived token to send one. The new session is ended at once.
    // --------------------------------------------------------

    if (
      dbUser.is_active ===
      false
    ) {
      try {
        await supabaseAdmin
          .auth
          .admin
          .signOut(
            data.session
              .access_token,
            'local'
          );
      } catch (signOutError) {
        console.error(
          'DEACTIVATED LOGIN SIGNOUT ERROR:',
          signOutError
        );
      }

      setActivityOutcome(
        res,
        {
          description:
            'Sign-in blocked: the account is deactivated.',
        }
      );

      const review =
        await getLatestReview(
          dbUser.id
        );

      return res
        .status(
          403
        )
        .json({
          error:
            'Your account has been deactivated.',

          code:
            'ACCOUNT_DEACTIVATED',

          deactivation:
            describeDeactivation(
              dbUser
            ),

          review:
            reviewForClient(
              review
            ),

          review_token:
            createReviewToken(
              dbUser.id
            ),
        });
    }

    // --------------------------------------------------------
    // THE RIGHT APP FOR THE ACCOUNT
    //
    // No session in the wrong app, and the attempt is recorded.
    // --------------------------------------------------------

    const wrongApp =
      getPortalRefusal(
        dbUser.role,
        req.body?.portal
      );

    if (wrongApp) {
      await endNewSession(
        data.session
          .access_token
      );

      setActivityOutcome(
        res,
        {
          action:
            'UNAUTHORIZED_ACCESS',

          module:
            'Access Control',

          description:
            wrongApp.description,
        }
      );

      return res
        .status(
          403
        )
        .json({
          error:
            wrongApp.error,

          code:
            wrongApp.code,
        });
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res
      .status(
        200
      )
      .json({
        message:
          'Login successful.',

        session:
          data.session,

        user:
          data.user,

        profile:
          dbUser,
      });
  } catch (
    error
  ) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Login failed',
      });
  }
}

// ============================================================
// GET /api/auth/username-available?username=
//
// For the sign-up and profile screens while typing:
// { available, username } or { available: false, error }.
// Signed in, your own username counts as available.
// ============================================================

async function getUsernameAvailability(
  req,
  res
) {
  try {
    const check =
      normalizeUsername(
        req.query
          ?.username
      );

    if (!check.valid) {
      return res
        .status(
          200
        )
        .json({
          available:
            false,

          error:
            check.error,
        });
    }

    const lookup =
      await checkUsernameTaken(
        check.value,
        req.dbUser?.id ||
          null
      );

    if (lookup.error) {
      return res
        .status(
          500
        )
        .json({
          error:
            lookup.error,
        });
    }

    return res
      .status(
        200
      )
      .json({
        available:
          !lookup.taken,

        username:
          check.value,

        error:
          lookup.taken
            ? 'This username is taken.'
            : null,
      });
  } catch (error) {
    console.error(
      'USERNAME AVAILABILITY ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Unable to check the username.',
      });
  }
}

// ============================================================
// GET /api/auth/captcha
//
// A new sign-in CAPTCHA, needed after an account has been
// locked (see loginRateLimiter.js). Returns the picture as SVG
// markup; the answer stays on the server.
// ============================================================

function getLoginCaptcha(
  req,
  res
) {
  try {
    res.set(
      'Cache-Control',
      'no-store'
    );

    return res
      .status(
        200
      )
      .json(
        createCaptcha()
      );
  } catch (
    error
  ) {
    console.error(
      'CAPTCHA ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Unable to load the CAPTCHA. Please try again.',
      });
  }
}

// ============================================================
// POST /api/auth/refresh
//
// Exchanges a refresh token for a new session so the mobile
// app stays signed in after the access token expires (~1 hour).
//
// Body: { refresh_token: string }
//
// Does NOT require a valid access token (the old one has
// usually expired). Deactivated accounts cannot refresh.
// ============================================================

async function refreshSession(
  req,
  res
) {
  try {
    const refreshToken =
      typeof req.body?.refresh_token ===
      'string'
        ? req.body.refresh_token.trim()
        : '';

    if (!refreshToken) {
      return res
        .status(400)
        .json({
          error:
            'Refresh token is required.',

          code:
            'REFRESH_TOKEN_REQUIRED',
        });
    }

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .refreshSession({
          refresh_token:
            refreshToken,
        });

    if (
      error ||
      !data?.session ||
      !data?.user
    ) {
      return res
        .status(401)
        .json({
          error:
            'Your session has expired. Please sign in again.',

          code:
            'REFRESH_TOKEN_INVALID',
        });
    }

    // --------------------------------------------------------
    // ACCOUNT MUST STILL BE ACTIVE
    // --------------------------------------------------------

    const {
      data:
        dbUser,
      error:
        dbError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          '*'
        )
        .eq(
          'id',
          data.user.id
        )
        .maybeSingle();

    if (dbError) {
      console.error(
        'REFRESH PROFILE LOOKUP ERROR:',
        dbError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to refresh session.',
        });
    }

    const locked =
      dbUser?.is_locked ===
      true;

    if (
      !dbUser ||
      dbUser.is_active ===
        false ||
      locked
    ) {
      try {
        await supabaseAdmin
          .auth
          .admin
          .signOut(
            data.session.access_token
          );
      } catch (signOutError) {
        console.error(
          'REFRESH SIGNOUT ERROR:',
          signOutError
        );
      }

      return res
        .status(403)
        .json(
          locked
            ? {
                error:
                  'Your account has been locked by an administrator. Please contact support.',

                code:
                  'ACCOUNT_LOCKED',
              }
            : {
                error:
                  'Your account has been deactivated. Please contact an administrator.',

                code:
                  'ACCOUNT_DEACTIVATED',
              }
        );
    }

    return res
      .status(200)
      .json({
        session:
          data.session,

        profile:
          dbUser,
      });
  } catch (
    error
  ) {
    console.error(
      'REFRESH SESSION ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to refresh session.',
      });
  }
}

// ============================================================
// POST /api/auth/logout
// ============================================================

async function logout(
  req,
  res
) {
  try {
    const authHeader =
      req.headers
        .authorization ||
      '';

    const token =
      authHeader
        .startsWith(
          'Bearer '
        )
        ? authHeader.slice(
            7
          )
        : null;

    if (!token) {
      return res
        .status(
          401
        )
        .json({
          error:
            'Missing authentication token',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    if (
      req.dbUser
    ) {
      setActivityUser(
        res,
        req.dbUser
      );

      setActivityEntity(
        res,
        'user_account',
        req.dbUser.id
      );
    }

    const {
      error,
    } =
      await supabaseAdmin
        .auth
        .admin
        .signOut(
          token
        );

    if (error) {
      console.error(
        'LOGOUT SUPABASE ERROR:',
        error.message
      );

      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to log out',
        });
    }

    // --------------------------------------------------------
    // AUTO-LOGOUT
    //
    // The apps sign out on their own after a period without
    // activity and send { reason: 'inactivity', idle_minutes }.
    // --------------------------------------------------------

    if (
      req.body
        ?.reason ===
      'inactivity'
    ) {
      const idleMinutes =
        Number(
          req.body
            ?.idle_minutes
        );

      const minutes =
        Number.isInteger(
          idleMinutes
        ) &&
        idleMinutes >=
          1 &&
        idleMinutes <=
          120
          ? idleMinutes
          : 15;

      setActivityOutcome(
        res,
        {
          action:
            'AUTO_LOGOUT',

          description:
            `User was signed out automatically after ${minutes} minute${minutes === 1 ? '' : 's'} of inactivity.`,
        }
      );
    }

    return res
      .status(
        200
      )
      .json({
        message:
          'Logged out successfully',
      });
  } catch (
    error
  ) {
    console.error(
      'LOGOUT ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Logout failed',
      });
  }
}

// ============================================================
// POST /api/auth/forgot-password
// ============================================================

async function forgotPassword(
  req,
  res
) {
  try {
    const {
      email,
    } =
      req.body;

    if (
      !email ||
      typeof email !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email is required',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Invalid email address',
        });
    }

    // 60 seconds between codes (checked for any email, so the
    // reply doesn't reveal whether an account exists).
    const wait =
      await getResendBlock(
        'recovery',
        cleanEmail
      );

    if (wait) {
      return res
        .status(
          wait.status
        )
        .json(
          wait.body
        );
    }

    const frontendUrl =
      process.env
        .FRONTEND_URL ||
      'http://localhost:8081';

    const {
      error,
    } =
      await supabaseAnon
        .auth
        .resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${frontendUrl}/reset-password`,
          }
        );

    if (error) {
      console.error(
        'FORGOT PASSWORD SUPABASE ERROR:',
        error.message
      );
    } else {
      await recordCodeSent(
        'recovery',
        cleanEmail
      );
    }

    return res
      .status(
        200
      )
      .json({
        message:
          'If an account exists for this email, a password reset email will be sent.',
      });
  } catch (
    error
  ) {
    console.error(
      'FORGOT PASSWORD ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Request failed',
      });
  }
}

// ============================================================
// POST /api/auth/verify-recovery-code
// ============================================================

async function verifyRecoveryCode(
  req,
  res
) {
  try {
    const {
      email,
      code,
    } =
      req.body;

    if (
      !email ||
      !code
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email and code are required',
        });
    }

    if (
      typeof email !==
        'string' ||
      typeof code !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'email and code must be text',
        });
    }

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const cleanCode =
      code.trim();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanEmail
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Please enter a valid email address',
        });
    }

    if (
      !/^\d{6}$/.test(
        cleanCode
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Verification code must be 6 digits',
        });
    }

    // Expired, or too many wrong tries: a new code is needed.
    const blocked =
      await getVerifyBlock(
        'recovery',
        cleanEmail
      );

    if (blocked) {
      setActivityOutcome(
        res,
        {
          description:
            `Password reset code blocked: ${blocked.body.error}`,
        }
      );

      return res
        .status(
          blocked.status
        )
        .json(
          blocked.body
        );
    }

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .verifyOtp({
          email:
            cleanEmail,

          token:
            cleanCode,

          type:
            'recovery',
        });

    if (
      error ||
      !data?.user ||
      !data?.session
        ?.access_token
    ) {
      console.error(
        'VERIFY RECOVERY CODE ERROR:',
        error?.message
      );

      const wrong =
        await recordWrongCode(
          'recovery',
          cleanEmail
        );

      setActivityOutcome(
        res,
        {
          description:
            `Password reset code failed: ${wrong.body.error}`,
        }
      );

      return res
        .status(
          wrong.status
        )
        .json(
          wrong.body
        );
    }

    // Each code works once.
    await recordCodeUsed(
      'recovery',
      cleanEmail
    );

    const verifiedEmail =
      data.user.email
        ?.trim()
        .toLowerCase();

    if (
      verifiedEmail !==
      cleanEmail
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Verification email does not match',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          data.user.id,

        email:
          data.user.email,

        role:
          null,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      data.user.id
    );

    return res
      .status(
        200
      )
      .json({
        message:
          'Verification code confirmed.',

        recovery_token:
          data.session
            .access_token,
      });
  } catch (
    error
  ) {
    console.error(
      'VERIFY RECOVERY CODE ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Unable to verify password reset code',
      });
  }
}

// ============================================================
// POST /api/auth/reset-password
// ============================================================

async function resetPassword(
  req,
  res
) {
  try {
    const {
      recovery_token,
      password,
      confirm_password,
    } =
      req.body;

    // --------------------------------------------------------
    // REQUIRED
    // --------------------------------------------------------

    if (
      !recovery_token ||
      !password ||
      !confirm_password
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Recovery verification is required before changing the password',
        });
    }

    // --------------------------------------------------------
    // TYPES
    // --------------------------------------------------------

    if (
      typeof recovery_token !==
        'string' ||
      typeof password !==
        'string' ||
      typeof confirm_password !==
        'string'
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Invalid password reset information',
        });
    }

    // --------------------------------------------------------
    // CONFIRM PASSWORD
    // --------------------------------------------------------

    if (
      password !==
      confirm_password
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'Passwords do not match',
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
      !passwordValidation
        .valid
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            passwordValidation
              .error,
        });
    }

    // --------------------------------------------------------
    // VERIFY RECOVERY TOKEN
    // --------------------------------------------------------

    const {
      data:
        userData,

      error:
        userError,
    } =
      await supabaseAnon
        .auth
        .getUser(
          recovery_token
        );

    if (
      userError ||
      !userData?.user
    ) {
      console.error(
        'RESET PASSWORD TOKEN ERROR:',
        userError?.message
      );

      return res
        .status(
          401
        )
        .json({
          error:
            'Your password reset session has expired. Please request a new code.',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          userData.user.id,

        email:
          userData.user
            .email,

        role:
          null,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      userData.user.id
    );

    // --------------------------------------------------------
    // UPDATE PASSWORD
    // --------------------------------------------------------

    const {
      error:
        updateError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .updateUserById(
          userData.user.id,
          {
            password,
          }
        );

    if (
      updateError
    ) {
      console.error(
        'RESET PASSWORD UPDATE ERROR:',
        updateError
          .message
      );

      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to update password',
        });
    }

    // --------------------------------------------------------
    // END EVERY SESSION
    //
    // Signs the account out everywhere (other phones, browser
    // tabs, and this reset session), so only the new password
    // works from now on.
    // --------------------------------------------------------

    try {
      const {
        error:
          signOutError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .signOut(
            recovery_token,
            'global'
          );

      if (signOutError) {
        console.error(
          'RESET PASSWORD SIGNOUT ERROR:',
          signOutError.message
        );
      }
    } catch (signOutError) {
      console.error(
        'RESET PASSWORD SIGNOUT ERROR:',
        signOutError
      );
    }

    // The email owner proved who they are: a sign-in lockout
    // from wrong guesses at the old password no longer applies.
    clearLoginLockout(
      userData.user.email
    );

    setActivityOutcome(
      res,
      {
        description:
          'User reset their account password. Every session was signed out.',
      }
    );

    return res
      .status(
        200
      )
      .json({
        message:
          'Password reset successfully. You can now sign in with your new password.',
      });
  } catch (
    error
  ) {
    console.error(
      'RESET PASSWORD ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Password reset failed',
      });
  }
}

// ============================================================
// GET /api/auth/me
// ============================================================

async function getProfile(
  req,
  res
) {
  if (
    req.dbUser
  ) {
    setActivityUser(
      res,
      req.dbUser
    );

    setActivityEntity(
      res,
      'user_profile',
      req.dbUser.id
    );
  }

  return res
    .status(
      200
    )
    .json({
      user:
        await withBloodTypeProof(
          req.dbUser
        ),
    });
}

// ============================================================
// PATCH /api/auth/me
//
// SAFE PROFILE UPDATE
// ============================================================

async function updateProfile(
  req,
  res
) {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      suffix,
      phone,
      username,

      date_of_birth,
      gender,

      barangay,
      city,
      province,

      latitude,
      longitude,

      blood_type,

      profile_photo_url,

      complete_onboarding,
    } =
      req.body;

    const updates =
      {};

    // ========================================================
    // USERNAME (unique; can be changed, not removed)
    // ========================================================

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
        req.dbUser
          .username
      ) {
        const lookup =
          await checkUsernameTaken(
            usernameCheck.value,
            req.dbUser.id
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

    // ========================================================
    // FIRST NAME
    // ========================================================

    if (
      first_name !==
      undefined
    ) {
      const cleanValue =
        cleanRequiredText(
          first_name
        );

      if (!cleanValue) {
        return res
          .status(
            400
          )
          .json({
            error:
              'first_name cannot be empty',
          });
      }

      updates.first_name =
        cleanValue;
    }

    // ========================================================
    // MIDDLE NAME
    // ========================================================

    if (
      middle_name !==
      undefined
    ) {
      updates.middle_name =
        cleanOptionalText(
          middle_name
        );
    }

    // ========================================================
    // LAST NAME
    // ========================================================

    if (
      last_name !==
      undefined
    ) {
      const cleanValue =
        cleanRequiredText(
          last_name
        );

      if (!cleanValue) {
        return res
          .status(
            400
          )
          .json({
            error:
              'last_name cannot be empty',
          });
      }

      updates.last_name =
        cleanValue;
    }

    // ========================================================
    // SUFFIX
    // ========================================================

    if (
      suffix !==
      undefined
    ) {
      updates.suffix =
        cleanOptionalText(
          suffix
        );
    }

    // ========================================================
    // PHONE
    // ========================================================

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

    // ========================================================
    // DATE OF BIRTH
    // ========================================================

    if (
      date_of_birth !==
      undefined
    ) {
      const validation =
        validateDateOfBirth(
          date_of_birth
        );

      if (
        !validation.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              validation.error,
          });
      }

      updates.date_of_birth =
        validation.value;
    }

    // ========================================================
    // GENDER
    // ========================================================

    if (
      gender !==
      undefined
    ) {
      if (
        typeof gender !==
        'string'
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              'gender must be text',
          });
      }

      const cleanGender =
        gender.trim();

      if (
        !VALID_GENDERS.includes(
          cleanGender
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              'Invalid gender value',
          });
      }

      updates.gender =
        cleanGender;
    }

    // ========================================================
    // BARANGAY
    // ========================================================

    if (
      barangay !==
      undefined
    ) {
      const cleanValue =
        cleanRequiredText(
          barangay
        );

      if (!cleanValue) {
        return res
          .status(
            400
          )
          .json({
            error:
              'barangay cannot be empty',
          });
      }

      updates.barangay =
        cleanValue;
    }

    // ========================================================
    // CITY
    // ========================================================

    if (
      city !==
      undefined
    ) {
      const cleanValue =
        cleanRequiredText(
          city
        );

      if (!cleanValue) {
        return res
          .status(
            400
          )
          .json({
            error:
              'city cannot be empty',
          });
      }

      updates.city =
        cleanValue;
    }

    // ========================================================
    // PROVINCE
    // ========================================================

    if (
      province !==
      undefined
    ) {
      const cleanValue =
        cleanRequiredText(
          province
        );

      if (!cleanValue) {
        return res
          .status(
            400
          )
          .json({
            error:
              'province cannot be empty',
          });
      }

      updates.province =
        cleanValue;
    }

    // ========================================================
    // LATITUDE
    // ========================================================

    if (
      latitude !==
      undefined
    ) {
      const parsed =
        parseCoordinate(
          latitude,
          'latitude'
        );

      if (
        !parsed.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              parsed.error,
          });
      }

      updates.latitude =
        parsed.value;
    }

    // ========================================================
    // LONGITUDE
    // ========================================================

    if (
      longitude !==
      undefined
    ) {
      const parsed =
        parseCoordinate(
          longitude,
          'longitude'
        );

      if (
        !parsed.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              parsed.error,
          });
      }

      updates.longitude =
        parsed.value;
    }

    // ========================================================
    // BLOOD TYPE
    // ========================================================

    // Clearing it removes the proof too. A new blood type needs a
    // proof photo (PUT /api/auth/me/blood-type).
    let clearBloodTypeProof =
      false;

    if (
      blood_type !==
      undefined
    ) {
      if (
        blood_type ===
          null ||
        blood_type ===
          ''
      ) {
        updates.blood_type =
          null;

        clearBloodTypeProof =
          true;
      } else {
        if (
          typeof blood_type !==
          'string'
        ) {
          return res
            .status(
              400
            )
            .json({
              error:
                'blood_type must be text or null',
            });
        }

        const cleanBloodType =
          blood_type
            .trim()
            .toUpperCase();

        if (
          !VALID_BLOOD_TYPES
            .includes(
              cleanBloodType
            )
        ) {
          return res
            .status(
              400
            )
            .json({
              error:
                'Invalid blood type',
            });
        }

        if (
          cleanBloodType !==
          req.dbUser
            ?.blood_type
        ) {
          return res
            .status(
              400
            )
            .json({
              error:
                'Add a photo of your blood type proof to change your blood type.',
              code:
                'BLOOD_TYPE_PROOF_REQUIRED',
            });
        }

        updates.blood_type =
          cleanBloodType;
      }
    }

    // ========================================================
    // PROFILE PHOTO URL
    // ========================================================

    if (
      profile_photo_url !==
      undefined
    ) {
      const validation =
        validateProfilePhotoUrl(
          profile_photo_url
        );

      if (
        !validation.valid
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              validation.error,
          });
      }

      updates.profile_photo_url =
        validation.value;
    }

    // ========================================================
    // COORDINATE PAIR
    // ========================================================

    const nextLatitude =
      updates.latitude !==
      undefined
        ? updates.latitude
        : req.dbUser
            .latitude;

    const nextLongitude =
      updates.longitude !==
      undefined
        ? updates.longitude
        : req.dbUser
            .longitude;

    if (
      (
        nextLatitude ===
          null &&
        nextLongitude !==
          null &&
        nextLongitude !==
          undefined
      ) ||
      (
        nextLongitude ===
          null &&
        nextLatitude !==
          null &&
        nextLatitude !==
          undefined
      )
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'latitude and longitude must be provided together',
        });
    }

    // ========================================================
    // COMPLETE ONBOARDING
    // ========================================================

    if (
      complete_onboarding !==
      undefined
    ) {
      if (
        typeof complete_onboarding !==
        'boolean'
      ) {
        return res
          .status(
            400
          )
          .json({
            error:
              'complete_onboarding must be true or false',
          });
      }

      if (
        complete_onboarding ===
        true
      ) {
        const profile = {
          ...req.dbUser,
          ...updates,
        };

        const requiredFields = [
          'first_name',
          'last_name',
          'date_of_birth',
          'gender',
          'barangay',
          'city',
          'province',
        ];

        const missingFields =
          requiredFields
            .filter(
              field => {
                const value =
                  profile[
                    field
                  ];

                return (
                  value ===
                    null ||
                  value ===
                    undefined ||
                  String(
                    value
                  )
                    .trim() ===
                    ''
                );
              }
            );

        if (
          missingFields
            .length >
          0
        ) {
          return res
            .status(
              400
            )
            .json({
              error:
                'Profile is incomplete',

              missing_fields:
                missingFields,
            });
        }

        updates.onboarding_complete =
          true;
      }
    }

    // ========================================================
    // DO NOT ALLOW EMPTY PATCH
    // ========================================================

    if (
      Object.keys(
        updates
      ).length ===
      0
    ) {
      return res
        .status(
          400
        )
        .json({
          error:
            'No valid fields to update',
        });
    }

    // ========================================================
    // SAVE
    // ========================================================

    const {
      data,
      error,
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
          req.dbUser.id
        )
        .select(
          '*'
        )
        .single();

    if (
      !error &&
      clearBloodTypeProof
    ) {
      await removeBloodTypeProofs(
        data.id
      );
    }

    if (error) {
      console.error(
        'UPDATE PROFILE SUPABASE ERROR:',
        error
      );

      // Two people picked the same username at once.
      if (
        isUsernameConflict(
          error
        )
      ) {
        return res
          .status(
            409
          )
          .json({
            error:
              'This username is taken. Please choose another.',

            code:
              'USERNAME_TAKEN',
          });
      }

      return res
        .status(
          400
        )
        .json({
          error:
            'Unable to update profile',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          data.id,

        email:
          data.email,

        role:
          data.role,
      }
    );

    setActivityEntity(
      res,
      'user_profile',
      data.id
    );

    // ========================================================
    // SUCCESS
    // ========================================================

    return res
      .status(
        200
      )
      .json({
        message:
          data
            .onboarding_complete
            ? 'Profile completed successfully'
            : 'Profile updated successfully',

        user:
          await withBloodTypeProof(
            data
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'UPDATE PROFILE ERROR:',
      error
    );

    return res
      .status(
        500
      )
      .json({
        error:
          'Update failed',
      });
  }
}

// ============================================================
// REQUEST AN ACCOUNT REVIEW
//
// POST /api/auth/account-review { review_token, message }
//
// For a deactivated person, who can't sign in. The token comes
// from their sign-in attempt, after the password was confirmed
// (login). One open request at a time; admins are notified and
// answer it on the person's page in the Admin Portal.
// ============================================================

async function requestAccountReview(
  req,
  res
) {
  try {
    const userId =
      verifyReviewToken(
        req.body?.review_token
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'This page has expired. Sign in again to send your request.',

          code:
            'REVIEW_TOKEN_INVALID',
        });
    }

    const message =
      String(
        req.body?.message ??
          ''
      ).trim();

    if (
      message.length <
      MIN_MESSAGE_LENGTH
    ) {
      return res
        .status(400)
        .json({
          error:
            `Tell the admins a bit more (at least ${MIN_MESSAGE_LENGTH} characters).`,

          code:
            'REVIEW_MESSAGE_SHORT',
        });
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res
        .status(400)
        .json({
          error:
            `Your message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,

          code:
            'REVIEW_MESSAGE_LONG',
        });
    }

    const {
      data:
        user,
      error:
        userError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          'id, email, role, username, first_name, last_name, is_active'
        )
        .eq(
          'id',
          userId
        )
        .maybeSingle();

    if (userError) {
      console.error(
        'ACCOUNT REVIEW USER LOOKUP ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to send your request. Please try again.',
        });
    }

    if (!user) {
      return res
        .status(404)
        .json({
          error:
            'Account not found.',
        });
    }

    setActivityUser(
      res,
      {
        id:
          user.id,

        email:
          user.email,

        role:
          user.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      user.id
    );

    if (
      user.is_active !==
      false
    ) {
      return res
        .status(409)
        .json({
          error:
            'Your account is active again. You can sign in.',

          code:
            'ACCOUNT_ACTIVE',
        });
    }

    const latest =
      await getLatestReview(
        user.id
      );

    if (
      latest?.status ===
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Your request is already waiting for an admin.',

          code:
            'REVIEW_PENDING',

          review:
            reviewForClient(
              latest
            ),
        });
    }

    const {
      data:
        review,
      error:
        insertError,
    } =
      await supabaseAdmin
        .from(
          'account_reviews'
        )
        .insert({
          user_id:
            user.id,

          message,
        })
        .select(
          'id, status, message, admin_note, created_at, reviewed_at'
        )
        .single();

    if (insertError) {
      if (
        insertError.code ===
        '23505'
      ) {
        return res
          .status(409)
          .json({
            error:
              'Your request is already waiting for an admin.',

            code:
              'REVIEW_PENDING',
          });
      }

      console.error(
        'ACCOUNT REVIEW INSERT ERROR:',
        isMissingMigration(
          insertError
        )
          ? MIGRATION_MESSAGE
          : insertError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to send your request. Please try again later.',
        });
    }

    const name =
      [
        user.first_name,
        user.last_name,
      ]
        .filter(Boolean)
        .join(' ') ||
      (user.username
        ? `@${user.username}`
        : user.email) ||
      'A user';

    await notifyAdmins({
      type:
        'admin_account_review',

      title:
        'Account review requested',

      message:
        `${name} asked for their deactivated account to be reviewed.`,

      data: {
        user_id:
          user.id,

        review_id:
          review.id,

        // Opens the person's page in the Admin Portal.
        route:
          `/users/${user.id}`,
      },
    });

    return res
      .status(201)
      .json({
        message:
          'Your request was sent. An admin will review it.',

        review:
          reviewForClient(
            review
          ),
      });
  } catch (
    error
  ) {
    console.error(
      'ACCOUNT REVIEW SERVER ERROR:',
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
// EXPORTS
// ============================================================

module.exports = {
  requestAccountReview,
  register,
  verifyEmail,
  resendVerification,
  login,
  getLoginCaptcha,
  getUsernameAvailability,
  refreshSession,
  logout,
  forgotPassword,
  verifyRecoveryCode,
  resetPassword,
  getProfile,
  updateProfile,
};