const {
  isAdminRole,
  isSuperAdmin
} = require(
  '../utils/roles'
);

const {
  supabaseAnon,
  supabaseAdmin,
} = require(
  '../config/supabase'
);

const {
  logUnauthorizedAccess,
} = require(
  '../utils/accessLog'
);

// Turns a request away and records it in the log trail as
// UNAUTHORIZED_ACCESS (utils/accessLog.js).
function block(
  req,
  res,
  {
    status,
    body,
    reason,
    user = null,
  }
) {
  logUnauthorizedAccess(
    req,
    {
      reason,

      reasonCode:
        body.code,

      statusCode:
        status,

      user,
    }
  );

  return res
    .status(status)
    .json(body);
}

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
//
// Verifies the Supabase Bearer access token and attaches:
//
// req.authToken -> current access token
// req.authUser  -> Supabase auth.users account
// req.dbUser    -> matching public.users profile
//
// Also blocks deactivated Hemo-Hero accounts.
//
// Client request format:
//
// Authorization: Bearer <access_token>
// ============================================================

async function requireAuth(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization;

    // --------------------------------------------------------
    // VALIDATE AUTHORIZATION HEADER
    // --------------------------------------------------------

    if (
      !authHeader ||
      typeof authHeader !==
        'string'
    ) {
      return block(
        req,
        res,
        {
          status:
            401,

          body: {
            error:
              'Missing Authorization header',

            code:
              'AUTH_HEADER_MISSING',
          },

          reason:
            'Blocked: a protected route was opened without signing in.',
        }
      );
    }

    // Accept:
    //
    // Bearer eyJ...
    //
    // "Bearer" is case-insensitive.
    const match =
      authHeader.match(
        /^Bearer\s+(.+)$/i
      );

    if (
      !match
    ) {
      return block(
        req,
        res,
        {
          status:
            401,

          body: {
            error:
              'Invalid Authorization header',

            code:
              'AUTH_HEADER_INVALID',
          },

          reason:
            'Blocked: a protected route was opened with a malformed sign-in header.',
        }
      );
    }

    const token =
      match[1].trim();

    if (
      !token
    ) {
      return block(
        req,
        res,
        {
          status:
            401,

          body: {
            error:
              'Missing authentication token',

            code:
              'AUTH_TOKEN_MISSING',
          },

          reason:
            'Blocked: a protected route was opened without a sign-in token.',
        }
      );
    }

    // --------------------------------------------------------
    // VERIFY TOKEN WITH SUPABASE AUTH
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .getUser(
          token
        );

    if (
      error ||
      !data?.user
    ) {
      if (
        error
      ) {
        console.error(
          'Supabase token validation failed:',
          error.message
        );
      }

      const body = {
        error:
          'Invalid or expired token',

        code:
          'AUTH_TOKEN_INVALID',
      };

      // An expired token is routine: the apps renew it and try
      // again. Anything else (forged, revoked) is recorded.
      if (
        /expired/i.test(
          error?.message ||
            ''
        )
      ) {
        return res
          .status(401)
          .json(body);
      }

      return block(
        req,
        res,
        {
          status:
            401,

          body,

          reason:
            'Blocked: the sign-in token was not valid (forged, revoked or from a signed-out session).',
        }
      );
    }

    // --------------------------------------------------------
    // SAVE AUTH INFORMATION
    // --------------------------------------------------------

    req.authToken =
      token;

    req.authUser =
      data.user;

    // --------------------------------------------------------
    // LOAD PUBLIC.USERS PROFILE
    // --------------------------------------------------------

    const {
      data: dbUser,
      error: dbError,
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

    // --------------------------------------------------------
    // DATABASE ERROR
    // --------------------------------------------------------

    if (
      dbError
    ) {
      console.error(
        'public.users lookup error:',
        dbError.message
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load user profile',

          code:
            'USER_PROFILE_LOOKUP_FAILED',
        });
    }

    // --------------------------------------------------------
    // PUBLIC PROFILE NOT FOUND
    // --------------------------------------------------------

    if (
      !dbUser
    ) {
      console.error(
        'Authenticated user does not have a public.users profile:',
        data.user.id
      );

      return res
        .status(404)
        .json({
          error:
            'User profile not found. Contact support.',

          code:
            'USER_PROFILE_NOT_FOUND',
        });
    }

    // --------------------------------------------------------
    // ACCOUNT STATUS CHECK
    // --------------------------------------------------------
    //
    // public.users.is_active is the source of truth for
    // whether the Hemo-Hero account may use the application.
    //
    // This check is important because a user may still possess
    // a technically valid Supabase access token after an admin
    // deactivates the account.
    // --------------------------------------------------------

    if (
      dbUser.is_active ===
      false
    ) {
      return block(
        req,
        res,
        {
          status:
            403,

          body: {
            error:
              'Your account has been deactivated. Please contact an administrator.',

            code:
              'ACCOUNT_DEACTIVATED',
          },

          reason:
            'Blocked: a deactivated account tried to keep using the app.',

          user:
            dbUser,
        }
      );
    }

    // Locked by an admin: current sessions stop working too.
    if (
      dbUser.is_locked ===
      true
    ) {
      return block(
        req,
        res,
        {
          status:
            403,

          body: {
            error:
              'Your account has been locked by an administrator. Please contact support.',

            code:
              'ACCOUNT_LOCKED',
          },

          reason:
            'Blocked: a locked account tried to keep using the app.',

          user:
            dbUser,
        }
      );
    }

    // --------------------------------------------------------
    // ATTACH DATABASE USER
    // --------------------------------------------------------

    req.dbUser =
      dbUser;

    return next();
  } catch (
    err
  ) {
    console.error(
      'requireAuth error:',
      err
    );

    return res
      .status(500)
      .json({
        error:
          'Authentication check failed',

        code:
          'AUTH_CHECK_FAILED',
      });
  }
}

// ============================================================
// ADMIN AUTHORIZATION MIDDLEWARE
// ============================================================
//
// Always use AFTER requireAuth.
//
// Example:
//
// router.get(
//   '/admin',
//   requireAuth,
//   requireAdmin,
//   controller
// );
//
// requireAuth already guarantees:
//
// - valid Supabase session
// - matching public.users profile
// - active account
//
// requireAdmin only needs to verify the role.
// ============================================================

function requireAdmin(
  req,
  res,
  next
) {
  // ----------------------------------------------------------
  // AUTHENTICATION REQUIRED
  // ----------------------------------------------------------

  if (
    !req.dbUser
  ) {
    return res
      .status(401)
      .json({
        error:
          'Authentication required',

        code:
          'AUTH_REQUIRED',
      });
  }

  // ----------------------------------------------------------
  // ADMIN ROLE REQUIRED
  // ----------------------------------------------------------

  if (
    !isAdminRole(
      req.dbUser.role
    )
  ) {
    return block(
      req,
      res,
      {
        status:
          403,

        body: {
          error:
            'Admin access required',

          code:
            'ADMIN_REQUIRED',
        },

        reason:
          `Blocked: an account with the ${req.dbUser.role || 'unknown'} role tried to use an admin-only feature.`,

        user:
          req.dbUser,
      }
    );
  }

  return next();
}

// ============================================================
// SUPER ADMIN ONLY
//
// Use after requireAuth. For work only the super admin may do
// (database backups and restore).
// ============================================================

function requireSuperAdmin(
  req,
  res,
  next
) {
  if (
    !req.dbUser
  ) {
    return res
      .status(401)
      .json({
        error:
          'Authentication required',

        code:
          'AUTH_REQUIRED',
      });
  }

  if (
    !isSuperAdmin(
      req.dbUser.role
    )
  ) {
    return block(
      req,
      res,
      {
        status:
          403,

        body: {
          error:
            'Only the super admin can do this.',

          code:
            'SUPER_ADMIN_REQUIRED',
        },

        reason:
          `Blocked: an account with the ${req.dbUser.role || 'unknown'} role tried to use a super-admin-only feature.`,

        user:
          req.dbUser,
      }
    );
  }

  return next();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
};