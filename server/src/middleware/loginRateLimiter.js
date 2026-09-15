const {
  rateLimit,
} = require(
  'express-rate-limit'
);

// ============================================================
// CONSTANTS
// ============================================================

// How long failed password attempts are grouped together.
const ACCOUNT_ATTEMPT_WINDOW_MS =
  15 * 60 * 1000;

// After the 5th wrong password, only lock the account
// login attempt for 3 minutes.
const ACCOUNT_LOCK_MS =
  3 * 60 * 1000;

const ACCOUNT_LOCK_MINUTES =
  3;

const ACCOUNT_ATTEMPT_LIMIT =
  5;

// Network/IP protection stays broader.
const IP_WINDOW_MS =
  15 * 60 * 1000;

const IP_ATTEMPT_LIMIT =
  30;

const IP_RETRY_MINUTES =
  15;

// ============================================================
// IN-MEMORY ACCOUNT ATTEMPTS
//
// CAPSTONE / DEVELOPMENT:
//
// These counters are stored in server memory.
// Restarting the backend clears them.
//
// IMPORTANT:
// recordFailedLogin() should only be called by the login
// controller after confirming that:
//
// 1. The account exists.
// 2. The supplied password is incorrect.
//
// A non-existent account must NOT consume password attempts.
// ============================================================

const accountAttempts =
  new Map();

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// GET RETRY MINUTES
// ============================================================

function getRetryMinutes(
  lockedUntil
) {
  if (
    !lockedUntil
  ) {
    return ACCOUNT_LOCK_MINUTES;
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

  // --------------------------------------------------------
  // LOCK EXPIRED
  //
  // Once the 3-minute cooldown has expired, completely
  // clear the failed password attempts.
  // --------------------------------------------------------

  if (
    record.lockedUntil &&
    now >=
      record.lockedUntil
  ) {
    accountAttempts.delete(
      email
    );

    return null;
  }

  // --------------------------------------------------------
  // NORMAL ATTEMPT WINDOW EXPIRED
  //
  // If the user never reached the lock threshold and their
  // failed attempts are already old, clear them.
  // --------------------------------------------------------

  if (
    !record.lockedUntil &&
    now -
      record.firstAttemptAt >=
      ACCOUNT_ATTEMPT_WINDOW_MS
  ) {
    accountAttempts.delete(
      email
    );

    return null;
  }

  return record;
}

// ============================================================
// ACCOUNT LOGIN ATTEMPT TRACKER
//
// RULE:
//
// Existing account + wrong password #1
// -> 4 attempts remaining
//
// Existing account + wrong password #2
// -> 3 attempts remaining
//
// Existing account + wrong password #3
// -> 2 attempts remaining
//
// Existing account + wrong password #4
// -> 1 attempt remaining
//
// Existing account + wrong password #5
// -> locked for 3 minutes
//
// Successful login
// -> reset counter
//
// Non-existent account
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

  // --------------------------------------------------------
  // NO EMAIL
  //
  // Normal login validation handles this.
  // --------------------------------------------------------

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

  // --------------------------------------------------------
  // ACCOUNT CURRENTLY LOCKED
  // --------------------------------------------------------

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

  // --------------------------------------------------------
  // RECORD WRONG PASSWORD
  //
  // IMPORTANT:
  //
  // The controller decides when this function is called.
  // It must only be called for an existing account with an
  // incorrect password.
  // --------------------------------------------------------

  req.recordFailedLogin =
    () => {
      const now =
        Date.now();

      let record =
        getAccountRecord(
          email
        );

      if (
        !record
      ) {
        record = {
          count:
            0,

          firstAttemptAt:
            now,

          lockedUntil:
            null,
        };
      }

      record.count +=
        1;

      const remaining =
        Math.max(
          0,
          ACCOUNT_ATTEMPT_LIMIT -
            record.count
        );

      // ----------------------------------------------------
      // FIFTH WRONG PASSWORD
      // ----------------------------------------------------

      if (
        record.count >=
        ACCOUNT_ATTEMPT_LIMIT
      ) {
        record.count =
          ACCOUNT_ATTEMPT_LIMIT;

        record.lockedUntil =
          now +
          ACCOUNT_LOCK_MS;
      }

      accountAttempts.set(
        email,
        record
      );

      return {
        attempts_remaining:
          remaining,

        locked:
          remaining ===
          0,

        retry_after_minutes:
          remaining ===
          0
            ? getRetryMinutes(
                record.lockedUntil
              )
            : null,
      };
    };

  // --------------------------------------------------------
  // RESET AFTER SUCCESSFUL LOGIN
  // --------------------------------------------------------

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
//
// Secondary protection.
//
// This stays at 30 failed credential/rate-limit responses
// within 15 minutes.
//
// This is separate from the individual account's 3-minute
// wrong-password cooldown.
// ============================================================

const ipLoginLimiter =
  rateLimit({
    windowMs:
      IP_WINDOW_MS,

    limit:
      IP_ATTEMPT_LIMIT,

    skipSuccessfulRequests:
      true,

    // ------------------------------------------------------
    // COUNT ONLY CREDENTIAL / RATE-LIMIT FAILURES
    //
    // 401 = incorrect password
    // 429 = rate limited
    //
    // A 404 ACCOUNT_NOT_FOUND response is intentionally
    // treated as successful for this limiter and therefore
    // does not count toward the network attempt total.
    // ------------------------------------------------------

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
//
// Existing route remains:
//
// router.post('/login', loginLimiter, login);
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