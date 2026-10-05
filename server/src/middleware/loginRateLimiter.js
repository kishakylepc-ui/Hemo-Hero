const {
  rateLimit,
} = require(
  'express-rate-limit'
);

const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// CONSTANTS
// ============================================================

// Failed password attempts are grouped within this period.
const ACCOUNT_ATTEMPT_WINDOW_MS =
  15 * 60 * 1000;

// Professor requirement:
// Only 3 unsuccessful password attempts are allowed
// before temporary account lockout.
const ACCOUNT_ATTEMPT_LIMIT =
  3;

// Increasing lockout duration.
//
// 1st lockout = 1 minute
// 2nd lockout = 3 minutes
// 3rd lockout = 5 minutes
// 4th+ lockout = 10 minutes
const ACCOUNT_LOCK_MINUTES = [
  1,
  3,
  5,
  10,
];

// Network/IP protection remains broader.
const IP_WINDOW_MS =
  15 * 60 * 1000;

const IP_ATTEMPT_LIMIT =
  30;

const IP_RETRY_MINUTES =
  15;

// ============================================================
// ACCOUNT ATTEMPTS
// ============================================================
//
// Kept in memory for speed and copied to the login_lockouts
// table (migration 20261006), so a lockout survives a server
// restart. Until that table exists, memory alone is used.
//
// Each account record contains:
//
// count
// -> number of wrong passwords in the current attempt cycle
//
// firstAttemptAt
// -> first wrong password in the current cycle
//
// lastAttemptAt
// -> most recent wrong password
//
// lockedUntil
// -> timestamp until which login is blocked
//
// lockLevel
// -> determines increasing lockout duration
//
// IMPORTANT:
//
// recordFailedLogin() must ONLY be called when:
//
// 1. The account exists.
// 2. The supplied password is incorrect.
//
// Non-existent accounts must NOT consume password attempts.
// ============================================================

let lockoutTableAvailable =
  true;

function toIso(
  ms
) {
  return ms
    ? new Date(ms).toISOString()
    : null;
}

function toMs(
  value
) {
  const ms =
    value
      ? Date.parse(value)
      : NaN;

  return Number.isFinite(ms)
    ? ms
    : null;
}

function handleLockoutTableError(
  error,
  action
) {
  // Table missing: the migration hasn't been run yet.
  if (
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  ) {
    if (lockoutTableAvailable) {
      console.warn(
        'login_lockouts table not found; lockouts are kept in memory only until migration 20261006 is run.'
      );
    }

    lockoutTableAvailable =
      false;

    return;
  }

  console.error(
    `LOGIN LOCKOUT ${action} ERROR:`,
    error?.message ||
      error
  );
}

function saveLockout(
  email,
  record
) {
  if (!lockoutTableAvailable) {
    return;
  }

  supabaseAdmin
    .from(
      'login_lockouts'
    )
    .upsert({
      email,

      failed_count:
        record.count,

      first_failed_at:
        toIso(record.firstAttemptAt),

      last_failed_at:
        toIso(record.lastAttemptAt),

      locked_until:
        toIso(record.lockedUntil),

      lock_level:
        record.lockLevel,

      updated_at:
        new Date()
          .toISOString(),
    })
    .then(
      ({ error }) =>
        error &&
        handleLockoutTableError(
          error,
          'SAVE'
        ),
      error =>
        handleLockoutTableError(
          error,
          'SAVE'
        )
    );
}

function removeLockout(
  email
) {
  if (!lockoutTableAvailable) {
    return;
  }

  supabaseAdmin
    .from(
      'login_lockouts'
    )
    .delete()
    .eq(
      'email',
      email
    )
    .then(
      ({ error }) =>
        error &&
        handleLockoutTableError(
          error,
          'DELETE'
        ),
      error =>
        handleLockoutTableError(
          error,
          'DELETE'
        )
    );
}

// The in-memory store; every change is copied to the table.
class SavedAttempts extends Map {
  set(
    email,
    record
  ) {
    super.set(
      email,
      record
    );

    saveLockout(
      email,
      record
    );

    return this;
  }

  delete(
    email
  ) {
    const existed =
      super.delete(
        email
      );

    removeLockout(
      email
    );

    return existed;
  }
}

const accountAttempts =
  new SavedAttempts();

// Brings a saved record back into memory (e.g. after a
// restart). Never throws.
async function loadAccountRecord(
  email
) {
  if (
    !lockoutTableAvailable ||
    accountAttempts.has(email)
  ) {
    return;
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
        .select('*')
        .eq(
          'email',
          email
        )
        .maybeSingle();

    if (error) {
      handleLockoutTableError(
        error,
        'LOAD'
      );

      return;
    }

    if (
      data &&
      !accountAttempts.has(email)
    ) {
      // Map.set directly: it's already saved.
      Map.prototype.set.call(
        accountAttempts,
        email,
        {
          count:
            data.failed_count || 0,

          firstAttemptAt:
            toMs(data.first_failed_at),

          lastAttemptAt:
            toMs(data.last_failed_at),

          lockedUntil:
            toMs(data.locked_until),

          lockLevel:
            data.lock_level || 0,
        }
      );
    }
  } catch (error) {
    handleLockoutTableError(
      error,
      'LOAD'
    );
  }
}

// ============================================================
// HELPERS
// ============================================================

// ------------------------------------------------------------
// NORMALIZE EMAIL
// ------------------------------------------------------------

function normalizeEmail(
  req
) {
  return String(
    req.body?.email ||
      ''
  )
    .trim()
    .toLowerCase();
}

// ------------------------------------------------------------
// LOCKOUT DURATION
// ------------------------------------------------------------

function getLockDurationMinutes(
  lockLevel
) {
  const safeLevel =
    Number.isFinite(
      lockLevel
    )
      ? Math.max(
          0,
          Math.floor(
            lockLevel
          )
        )
      : 0;

  const index =
    Math.min(
      safeLevel,
      ACCOUNT_LOCK_MINUTES.length -
        1
    );

  return ACCOUNT_LOCK_MINUTES[
    index
  ];
}

// ------------------------------------------------------------
// RETRY MINUTES
// ------------------------------------------------------------

function getRetryMinutes(
  lockedUntil
) {
  if (
    !lockedUntil
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(
      (
        lockedUntil -
        Date.now()
      ) /
        60000
    )
  );
}

// ============================================================
// GET ACCOUNT ATTEMPT RECORD
// ============================================================

function getAccountRecord(
  email
) {
  const record =
    accountAttempts.get(
      email
    );

  if (
    !record
  ) {
    return null;
  }

  const now =
    Date.now();

  // ----------------------------------------------------------
  // LOCKOUT EXPIRED
  // ----------------------------------------------------------
  //
  // After the lock expires:
  //
  // - allow login again
  // - reset the current 3-attempt cycle
  // - KEEP the lock level so another set of 3 failures
  //   receives a longer lockout
  // ----------------------------------------------------------

  if (
    record.lockedUntil &&
    now >=
      record.lockedUntil
  ) {
    record.lockedUntil =
      null;

    record.count =
      0;

    record.firstAttemptAt =
      null;

    accountAttempts.set(
      email,
      record
    );
  }

  // ----------------------------------------------------------
  // CLEAN INACTIVITY RESET
  // ----------------------------------------------------------
  //
  // If there have been no failed password attempts for
  // 15 minutes and the account is not currently locked,
  // completely reset the escalation.
  // ----------------------------------------------------------

  if (
    !record.lockedUntil &&
    record.lastAttemptAt &&
    now -
      record.lastAttemptAt >=
      ACCOUNT_ATTEMPT_WINDOW_MS
  ) {
    accountAttempts.delete(
      email
    );

    return null;
  }

  // ----------------------------------------------------------
  // CURRENT ATTEMPT WINDOW EXPIRED
  // ----------------------------------------------------------
  //
  // Reset the current 3-attempt counter if its first
  // attempt is already outside the window.
  //
  // The lock level is preserved unless the inactivity
  // reset above has also been reached.
  // ----------------------------------------------------------

  if (
    !record.lockedUntil &&
    record.firstAttemptAt &&
    now -
      record.firstAttemptAt >=
      ACCOUNT_ATTEMPT_WINDOW_MS
  ) {
    record.count =
      0;

    record.firstAttemptAt =
      null;

    accountAttempts.set(
      email,
      record
    );
  }

  return record;
}

// ============================================================
// ACCOUNT LOGIN ATTEMPT TRACKER
// ============================================================
//
// RULE:
//
// Wrong password #1
// -> 2 attempts remaining
//
// Wrong password #2
// -> 1 attempt remaining
//
// Wrong password #3
// -> account temporarily locked
//
// LOCKOUT ESCALATION:
//
// First lockout
// -> 1 minute
//
// Second lockout
// -> 3 minutes
//
// Third lockout
// -> 5 minutes
//
// Fourth and later lockouts
// -> 10 minutes
//
// SUCCESSFUL LOGIN:
//
// -> resets failed attempts
// -> resets lockout level
//
// NON-EXISTENT ACCOUNT:
//
// -> controller must NOT call recordFailedLogin()
// ============================================================

async function accountLoginLimiter(
  req,
  res,
  next
) {
  const email =
    normalizeEmail(
      req
    );

  // ----------------------------------------------------------
  // NO EMAIL
  // ----------------------------------------------------------
  //
  // Normal login validation handles missing email.
  // ----------------------------------------------------------

  if (
    !email
  ) {
    req.recordFailedLogin =
      () => null;

    req.resetLoginAttempts =
      () => {};

    return next();
  }

  await loadAccountRecord(
    email
  );

  const currentRecord =
    getAccountRecord(
      email
    );

  // ----------------------------------------------------------
  // ACCOUNT CURRENTLY LOCKED
  // ----------------------------------------------------------

  if (
    currentRecord
      ?.lockedUntil &&
    Date.now() <
      currentRecord
        .lockedUntil
  ) {
    const retryMinutes =
      getRetryMinutes(
        currentRecord
          .lockedUntil
      );

    return res
      .status(429)
      .json({
        error:
          `Too many incorrect password attempts. Please try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`,

        code:
          'LOGIN_ACCOUNT_RATE_LIMIT',

        attempts_remaining:
          0,

        retry_after_minutes:
          retryMinutes,
      });
  }

  // ----------------------------------------------------------
  // RECORD WRONG PASSWORD
  // ----------------------------------------------------------
  //
  // The login controller decides when this gets called.
  //
  // Only call this for:
  //
  // Existing account + incorrect password
  // ----------------------------------------------------------

  req.recordFailedLogin =
    () => {
      const now =
        Date.now();

      let record =
        getAccountRecord(
          email
        );

      // ------------------------------------------------------
      // CREATE NEW RECORD
      // ------------------------------------------------------

      if (
        !record
      ) {
        record = {
          count:
            0,

          firstAttemptAt:
            null,

          lastAttemptAt:
            null,

          lockedUntil:
            null,

          lockLevel:
            0,
        };
      }

      // ------------------------------------------------------
      // START NEW ATTEMPT CYCLE
      // ------------------------------------------------------

      if (
        record.count ===
          0 ||
        !record.firstAttemptAt
      ) {
        record.firstAttemptAt =
          now;
      }

      // ------------------------------------------------------
      // RECORD FAILURE
      // ------------------------------------------------------

      record.count +=
        1;

      record.lastAttemptAt =
        now;

      const remaining =
        Math.max(
          0,

          ACCOUNT_ATTEMPT_LIMIT -
            record.count
        );

      // ------------------------------------------------------
      // THIRD WRONG PASSWORD
      // ------------------------------------------------------

      if (
        record.count >=
        ACCOUNT_ATTEMPT_LIMIT
      ) {
        const lockMinutes =
          getLockDurationMinutes(
            record.lockLevel
          );

        record.lockedUntil =
          now +
          lockMinutes *
            60 *
            1000;

        // Increase the lockout level for the NEXT lockout.
        //
        // It can keep increasing internally, but the
        // duration is capped at the last configured value.
        record.lockLevel +=
          1;

        // Current 3-attempt cycle is finished.
        record.count =
          0;

        record.firstAttemptAt =
          null;

        accountAttempts.set(
          email,
          record
        );

        return {
          attempts_remaining:
            0,

          locked:
            true,

          retry_after_minutes:
            lockMinutes,

          lockout_level:
            record.lockLevel,
        };
      }

      // ------------------------------------------------------
      // STILL HAS ATTEMPTS REMAINING
      // ------------------------------------------------------

      accountAttempts.set(
        email,
        record
      );

      return {
        attempts_remaining:
          remaining,

        locked:
          false,

        retry_after_minutes:
          null,

        lockout_level:
          record.lockLevel,
      };
    };

  // ----------------------------------------------------------
  // RESET AFTER SUCCESSFUL LOGIN
  // ----------------------------------------------------------
  //
  // A successful login completely resets:
  //
  // - failed attempts
  // - lockout
  // - escalating lockout level
  // ----------------------------------------------------------

  req.resetLoginAttempts =
    () => {
      accountAttempts.delete(
        email
      );
    };

  next();
}

// ============================================================
// IP / NETWORK LIMITER
// ============================================================
//
// Secondary protection.
//
// Maximum:
// 30 credential/rate-limit failures within 15 minutes.
//
// This is separate from the individual account lockout.
// ============================================================

const ipLoginLimiter =
  rateLimit({
    windowMs:
      IP_WINDOW_MS,

    limit:
      IP_ATTEMPT_LIMIT,

    skipSuccessfulRequests:
      true,

    // --------------------------------------------------------
    // COUNT ONLY AUTHENTICATION/RATE-LIMIT FAILURES
    // --------------------------------------------------------
    //
    // 401
    // -> incorrect password
    //
    // 429
    // -> rate limited
    //
    // 404 ACCOUNT_NOT_FOUND
    // -> intentionally does NOT count for the classroom
    //    requirement
    // --------------------------------------------------------

    requestWasSuccessful:
      (
        req,
        res
      ) => {
        return (
          res.statusCode !==
            401 &&
          res.statusCode !==
            429
        );
      },

    standardHeaders:
      false,

    legacyHeaders:
      false,

    statusCode:
      429,

    message: {
      error:
        'Too many login attempts from this network. Please try again later.',

      code:
        'LOGIN_IP_RATE_LIMIT',

      retry_after_minutes:
        IP_RETRY_MINUTES,
    },
  });

// ============================================================
// COMBINED LOGIN LIMITER
// ============================================================
//
// Existing route:
//
// router.post(
//   '/login',
//   loginLimiter,
//   login
// );
//
// Express accepts an array of middleware here.
// ============================================================

const loginLimiter = [
  accountLoginLimiter,
  ipLoginLimiter,
];

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  loginLimiter,
};