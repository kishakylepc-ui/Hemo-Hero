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
      return res
        .status(401)
        .json({
          error:
            'Missing Authorization header',

          code:
            'AUTH_HEADER_MISSING',
        });
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
      return res
        .status(401)
        .json({
          error:
            'Invalid Authorization header',

          code:
            'AUTH_HEADER_INVALID',
        });
    }

    const token =
      match[1].trim();

    if (
      !token
    ) {
      return res
        .status(401)
        .json({
          error:
            'Missing authentication token',

          code:
            'AUTH_TOKEN_MISSING',
        });
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

      return res
        .status(401)
        .json({
          error:
            'Invalid or expired token',

          code:
            'AUTH_TOKEN_INVALID',
        });
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
      return res
        .status(403)
        .json({
          error:
            'Your account has been deactivated. Please contact an administrator.',

          code:
            'ACCOUNT_DEACTIVATED',
        });
    }

    // Locked by an admin: current sessions stop working too.
    if (
      dbUser.is_locked ===
      true
    ) {
      return res
        .status(403)
        .json({
          error:
            'Your account has been locked by an administrator. Please contact support.',

          code:
            'ACCOUNT_LOCKED',
        });
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
    return res
      .status(403)
      .json({
        error:
          'Admin access required',

        code:
          'ADMIN_REQUIRED',
      });
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
    return res
      .status(403)
      .json({
        error:
          'Only the super admin can do this.',

        code:
          'SUPER_ADMIN_REQUIRED',
      });
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