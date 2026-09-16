const {
  rateLimit,
} = require(
  'express-rate-limit'
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
// IN-MEMORY ACCOUNT ATTEMPTS
// ============================================================
//
// CAPSTONE / DEVELOPMENT:
//
// These counters are stored in server memory.
//
// Restarting the backend clears them.
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

const accountAttempts =
  new Map();

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

function accountLoginLimiter(
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