const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

const {
  normalizeUsername,
} = require(
  '../utils/username'
);

// ============================================================
// SIGN IN WITH A USERNAME OR EMAIL
//
// The apps send what was typed as `email`. Without an @ it's a
// username: this looks up the account and puts its email in
// req.body.email, so everything after (the lockout, the CAPTCHA,
// the log trail and Supabase sign-in) works on the same account
// whichever was typed.
//
// An unknown username sets req.loginUnknownUsername; the login
// controller answers "No account uses this username."
// ============================================================

async function resolveLoginIdentifier(
  req,
  res,
  next
) {
  try {
    const typed =
      typeof req.body?.email ===
      'string'
        ? req.body.email.trim()
        : '';

    if (
      !typed ||
      typed.includes('@')
    ) {
      return next();
    }

    req.loginUsername =
      typed;

    const check =
      normalizeUsername(
        typed
      );

    if (check.valid) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from(
            'users'
          )
          .select(
            'email'
          )
          .eq(
            'username',
            check.value
          )
          .maybeSingle();

      if (error) {
        console.error(
          'LOGIN USERNAME LOOKUP ERROR:',
          error.message
        );
      }

      if (data?.email) {
        req.body.email =
          data.email;

        return next();
      }
    }

    req.loginUnknownUsername =
      true;

    return next();
  } catch (error) {
    console.error(
      'LOGIN IDENTIFIER ERROR:',
      error
    );

    return next();
  }
}

module.exports = {
  resolveLoginIdentifier,
};
