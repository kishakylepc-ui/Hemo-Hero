const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// USERNAMES
//
// 3 to 20 characters: lowercase letters, numbers, periods and
// underscores, starting with a letter or number. Saved in
// lowercase and unique, ignoring letter case (migration
// 20261022_usernames.sql has the same rule). A username never
// contains @, so sign-in can tell it from an email.
// ============================================================

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._]{2,19}$/;

// { valid: true, value } or { valid: false, error }.
function normalizeUsername(
  value
) {
  if (
    typeof value !==
    'string'
  ) {
    return {
      valid: false,

      error:
        'Please enter a username.',
    };
  }

  // "@juan" is accepted as "juan".
  const clean =
    value
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

  if (!clean) {
    return {
      valid: false,

      error:
        'Please enter a username.',
    };
  }

  if (
    clean.length < 3 ||
    clean.length > 20
  ) {
    return {
      valid: false,

      error:
        'Username must be 3 to 20 characters.',
    };
  }

  if (
    !USERNAME_PATTERN.test(
      clean
    )
  ) {
    return {
      valid: false,

      error:
        'Username can use only letters, numbers, periods and underscores, and must start with a letter or number.',
    };
  }

  return {
    valid: true,

    value:
      clean,
  };
}

// The users column comes from migration 20261022_usernames.
function isMissingColumn(
  error
) {
  return (
    error?.code ===
      '42703' ||
    error?.code ===
      'PGRST204'
  );
}

const MIGRATION_MESSAGE =
  'Usernames need database migration 20261022_usernames.sql. Run it in the Supabase SQL editor.';

// { taken } or { error } (a database problem, already logged).
async function checkUsernameTaken(
  username,
  exceptUserId = null
) {
  let query =
    supabaseAdmin
      .from(
        'users'
      )
      .select(
        'id'
      )
      .eq(
        'username',
        username
      )
      .limit(1);

  if (exceptUserId) {
    query =
      query.neq(
        'id',
        exceptUserId
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    console.error(
      'USERNAME LOOKUP ERROR:',
      error.message
    );

    return {
      error:
        isMissingColumn(
          error
        )
          ? MIGRATION_MESSAGE
          : 'Unable to check the username. Please try again.',
    };
  }

  return {
    taken:
      (data || []).length >
      0,
  };
}

// A unique-index error when two people pick the same username
// at the same moment.
function isUsernameConflict(
  error
) {
  return (
    error?.code ===
      '23505' &&
    /username/i.test(
      `${error?.message || ''} ${error?.details || ''}`
    )
  );
}

module.exports = {
  USERNAME_PATTERN,
  normalizeUsername,
  checkUsernameTaken,
  isUsernameConflict,
  isMissingColumn,
  MIGRATION_MESSAGE,
};
