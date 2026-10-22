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

const {
  verifyCaptcha,
} = require(
  '../services/captchaService'
);

const {
  setActivityOutcome,
} = require(
  './activityLogMiddleware'
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
// 2nd lockout = 5 minutes
// 3rd+ lockout = 15 minutes
const ACCOUNT_LOCK_MINUTES = [
  1,
  5,
  15,
];

// After this many lockouts, every further sign-in attempt for
// the account needs a solved CAPTCHA (captchaService.js).
const CAPTCHA_AFTER_LOCKOUTS =
  1;

// After a day with no wrong passwords and no lockout, the
// account starts over: a 1-minute first lockout and no CAPTCHA.
// (A successful sign-in starts over right away.)
const ESCALATION_RESET_MS =
  24 * 60 * 60 * 1000;

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
// -> end of the latest lockout (kept after it ends, so the
//    escalation reset counts from the end of the lockout)
//
// lockLevel
// -> number of lockouts so far; sets the next lockout's
//    duration and whether a CAPTCHA is needed
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
// LOCK STATE
// ------------------------------------------------------------

function isLocked(
  record,
  now = Date.now()
) {
  return Boolean(
    record?.lockedUntil &&
      now <
        record.lockedUntil
  );
}

function needsCaptcha(
  record
) {
  return Boolean(
    record &&
      record.lockLevel >=
        CAPTCHA_AFTER_LOCKOUTS
  );
}

// ------------------------------------------------------------
// TIME LEFT ON A LOCKOUT
//
// Seconds drive the apps' countdown; minutes are for the
// message.
// ------------------------------------------------------------

function getRetrySeconds(
  lockedUntil
) {
  if (
    !lockedUntil
  ) {
    return 60;
  }

  return Math.max(
    1,
    Math.ceil(
      (
        lockedUntil -
        Date.now()
      ) /
        1000
    )
  );
}

function describeWait(
  seconds
) {
  const minutes =
    Math.max(
      1,
      Math.ceil(
        seconds /
          60
      )
    );

  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
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

  if (
    isLocked(
      record,
      now
    )
  ) {
    return record;
  }

  // ----------------------------------------------------------
  // ESCALATION RESET
  // ----------------------------------------------------------
  //
  // No wrong password and no lockout for a day: forget the
  // account's history (lockout level and CAPTCHA included).
  // Counted from the later of the last wrong password and the
  // end of the last lockout.
  // ----------------------------------------------------------

  const lastEventAt =
    Math.max(
      record.lastAttemptAt ||
        0,
      record.lockedUntil ||
        0
    );

  if (
    lastEventAt &&
    now -
      lastEventAt >=
      ESCALATION_RESET_MS
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
  // attempt is already outside the window. The lock level
  // is kept.
  // ----------------------------------------------------------

  if (
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
// -> 5 minutes
//
// Third and later lockouts
// -> 15 minutes
//
// CAPTCHA:
//
// After the first lockout ends, every attempt must include a
// solved CAPTCHA (captcha_id + captcha_answer) or it is turned
// away before the password is checked.
//
// SUCCESSFUL LOGIN:
//
// -> resets failed attempts
// -> resets lockout level and the CAPTCHA requirement
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
    isLocked(
      currentRecord
    )
  ) {
    const retrySeconds =
      getRetrySeconds(
        currentRecord
          .lockedUntil
      );

    setActivityOutcome(
      res,
      {
        description:
          `Sign-in blocked: the account is locked for another ${describeWait(retrySeconds)}.`,
      }
    );

    return res
      .status(429)
      .json({
        error:
          `Too many incorrect password attempts. Please try again in ${describeWait(retrySeconds)}.`,

        code:
          'LOGIN_ACCOUNT_RATE_LIMIT',

        attempts_remaining:
          0,

        retry_after_minutes:
          Math.ceil(
            retrySeconds /
              60
          ),

        retry_after_seconds:
          retrySeconds,

        locked_until:
          toIso(
            currentRecord
              .lockedUntil
          ),

        captcha_required:
          needsCaptcha(
            currentRecord
          ),
      });
  }

  // ----------------------------------------------------------
  // CAPTCHA AFTER A LOCKOUT
  // ----------------------------------------------------------

  if (
    needsCaptcha(
      currentRecord
    )
  ) {
    const captchaId =
      req.body
        ?.captcha_id;

    const captchaAnswer =
      req.body
        ?.captcha_answer;

    if (
      !captchaId ||
      !captchaAnswer
    ) {
      setActivityOutcome(
        res,
        {
          description:
            'Sign-in blocked: a CAPTCHA is required after a lockout.',
        }
      );

      return res
        .status(428)
        .json({
          error:
            'Please complete the CAPTCHA to sign in.',

          code:
            'CAPTCHA_REQUIRED',

          captcha_required:
            true,
        });
    }

    if (
      !verifyCaptcha(
        captchaId,
        captchaAnswer
      )
    ) {
      setActivityOutcome(
        res,
        {
          action:
            'CAPTCHA_FAILED',

          description:
            'Sign-in blocked: the CAPTCHA answer was wrong or expired.',
        }
      );

      return res
        .status(428)
        .json({
          error:
            'The CAPTCHA answer was incorrect. Please try the new one.',

          code:
            'CAPTCHA_INCORRECT',

          captcha_required:
            true,
        });
    }
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

          retry_after_seconds:
            lockMinutes *
            60,

          locked_until:
            toIso(
              record.lockedUntil
            ),

          lockout_level:
            record.lockLevel,

          captcha_required:
            needsCaptcha(
              record
            ),
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

        retry_after_seconds:
          null,

        locked_until:
          null,

        lockout_level:
          record.lockLevel,

        captcha_required:
          needsCaptcha(
            record
          ),
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
  // - the CAPTCHA requirement
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

      retry_after_seconds:
        IP_RETRY_MINUTES *
        60,
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
// CLEAR A LOCKOUT
//
// After a password reset: the attempts were against the old
// password. Also clears the lockout level and the CAPTCHA.
// ============================================================

function clearLoginLockout(
  email
) {
  const clean =
    String(
      email || ''
    )
      .trim()
      .toLowerCase();

  if (clean) {
    accountAttempts.delete(
      clean
    );
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  loginLimiter,
  clearLoginLockout,
};
