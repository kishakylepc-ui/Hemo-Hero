const { supabaseAnon, supabaseAdmin } = require('../config/supabase');

// ------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
//
// Verifies the Supabase Bearer access token and attaches:
//
// req.authToken -> current access token
// req.authUser  -> Supabase auth.users account
// req.dbUser    -> matching public.users profile
//
// Client request format:
//
// Authorization: Bearer <access_token>
// ------------------------------------------------------------

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // --------------------------------------------------------
    // Validate Authorization header
    // --------------------------------------------------------

    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({
        error: 'Missing Authorization header'
      });
    }

    // Accept:
    // Bearer eyJ...
    //
    // Case-insensitive for "Bearer"
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        error: 'Invalid Authorization header'
      });
    }

    const token = match[1].trim();

    if (!token) {
      return res.status(401).json({
        error: 'Missing authentication token'
      });
    }

    // --------------------------------------------------------
    // Verify token with Supabase Auth
    // --------------------------------------------------------

    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data?.user) {
      if (error) {
        console.error('Supabase token validation failed:', error.message);
      }

      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

    // Save authentication information for later middleware
    // and controllers.
    req.authToken = token;
    req.authUser = data.user;

    // --------------------------------------------------------
    // Retrieve Hemo-Hero public.users profile
    // --------------------------------------------------------

    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    // A database failure is different from a missing profile.
    if (dbError) {
      console.error(
        'public.users lookup error:',
        dbError.message
      );

      return res.status(500).json({
        error: 'Unable to load user profile'
      });
    }

    // Auth account exists but corresponding public.users
    // profile does not.
    if (!dbUser) {
      console.error(
        'Authenticated user does not have a public.users profile'
      );

      return res.status(404).json({
        error: 'User profile not found. Contact support.'
      });
    }

    req.dbUser = dbUser;

    return next();
  } catch (err) {
    console.error('requireAuth error:', err);

    return res.status(500).json({
      error: 'Authentication check failed'
    });
  }
}

// ------------------------------------------------------------
// ADMIN AUTHORIZATION MIDDLEWARE
//
// Always use AFTER requireAuth.
//
// Example:
// router.get('/admin', requireAuth, requireAdmin, controller);
// ------------------------------------------------------------

function requireAdmin(req, res, next) {
  if (!req.dbUser) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.dbUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};