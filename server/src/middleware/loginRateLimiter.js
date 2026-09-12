const {
  rateLimit,
} = require(
  'express-rate-limit'
);

// ============================================================
// CONSTANTS
// ============================================================

const LOGIN_WINDOW_MS =
  15 * 60 * 1000;

const ACCOUNT_ATTEMPT_LIMIT =
  5;

const IP_ATTEMPT_LIMIT =
  30;

// ============================================================
// IN-MEMORY ACCOUNT ATTEMPTS
//
// CAPSTONE / DEVELOPMENT:
// This is stored in server memory.
//
// Restarting the backend clears the counters.
//
// For production later, we can move this to Redis or a
// database-backed store.
// ============================================================

const accountAttempts =
  new Map();

// ============================================================
// HELPERS
// ============================================================

function normalizeEmail(req) {
  return String(
    req.body?.email || ''
  )
    .trim()
    .toLowerCase();
}

function getRetryMinutes(
  lockedUntil
) {
  if (!lockedUntil) {
    return 15;
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

function getAccountRecord(
  email
) {
  const record =
    accountAttempts.get(
      email
    );

  if (!record) {
    return null;
  }

  const now =
    Date.now();

  // --------------------------------------------------------
  // LOCK EXPIRED
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
  // --------------------------------------------------------

  if (
    !record.lockedUntil &&
    now -
      record.firstAttemptAt >=
      LOGIN_WINDOW_MS
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
// Wrong password #1 -> 4 remaining
// Wrong password #2 -> 3 remaining
// Wrong password #3 -> 2 remaining
// Wrong password #4 -> 1 remaining
// Wrong password #5 -> locked for 15 minutes
//
// Successful login -> reset account counter
// ============================================================

function accountLoginLimiter(
  req,
  res,
  next
) {
  const email =
    normalizeEmail(req);

  // --------------------------------------------------------
  // NO EMAIL
  //
  // Normal login validation will handle this.
  // --------------------------------------------------------

  if (!email) {
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
          'Too many failed login attempts.',

        code:
          'LOGIN_ACCOUNT_RATE_LIMIT',

        attempts_remaining:
          0,

        retry_after_minutes:
          retryMinutes,
      });
  }

  // --------------------------------------------------------
  // RECORD FAILURE
  // --------------------------------------------------------

  req.recordFailedLogin =
    () => {
      const now =
        Date.now();

      let record =
        getAccountRecord(
          email
        );

      if (!record) {
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
      // FIFTH FAILURE
      // ----------------------------------------------------

      if (
        record.count >=
        ACCOUNT_ATTEMPT_LIMIT
      ) {
        record.count =
          ACCOUNT_ATTEMPT_LIMIT;

        record.lockedUntil =
          now +
          LOGIN_WINDOW_MS;
      }

      accountAttempts.set(
        email,
        record
      );

      return {
        attempts_remaining:
          remaining,

        locked:
          remaining === 0,

        retry_after_minutes:
          remaining === 0
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
// This is intentionally higher than the 5-attempt account
// limit because multiple legitimate users may share Wi-Fi.
// ============================================================

const ipLoginLimiter =
  rateLimit({
    windowMs:
      LOGIN_WINDOW_MS,

    limit:
      IP_ATTEMPT_LIMIT,

    skipSuccessfulRequests:
      true,

    // Only 401 and 429 should remain counted as login
    // credential/rate-limit failures.
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
        'Too many login attempts from this network.',

      code:
        'LOGIN_IP_RATE_LIMIT',

      retry_after_minutes:
        15,
    },
  });

// ============================================================
// COMBINED LOGIN LIMITER
//
// Existing route can remain:
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