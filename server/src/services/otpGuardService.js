const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// ONE-TIME CODE RULES
//
// Supabase emails the 6-digit codes and checks them, and each
// code works only once. This service adds the rules the server
// enforces itself, whatever the Supabase settings:
//
// - a code expires 10 minutes after it was sent
// - 5 wrong tries use the code up; a new code is needed
// - a new code can be sent only 60 seconds after the last one
//
// Kinds of code:
//   'signup'        verify a new account's email
//   'recovery'      forgot password
//   'email_change'  change email (the new address, and the
//                   current one when Supabase's secure email
//                   change is on)
//
// One row per kind and email in the otp_attempts table
// (migration 20261022), kept in memory too. Until that table
// exists, memory alone is used.
// ============================================================

const OTP_TTL_MS =
  10 * 60 * 1000;

const OTP_MAX_WRONG =
  5;

const OTP_RESEND_WAIT_MS =
  60 * 1000;

let tableAvailable =
  true;

// `${kind}:${email}` -> { kind, email, sentAt, wrongCount }
const codes =
  new Map();

function keyOf(
  kind,
  email
) {
  return `${kind}:${email}`;
}

function cleanEmail(
  email
) {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
}

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

// ------------------------------------------------------------
// TABLE
// ------------------------------------------------------------

function handleTableError(
  error,
  action
) {
  // Table missing: the migration hasn't been run yet.
  if (
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  ) {
    if (tableAvailable) {
      console.warn(
        'otp_attempts table not found; code limits are kept in memory only until migration 20261022 is run.'
      );
    }

    tableAvailable =
      false;

    return;
  }

  console.error(
    `OTP GUARD ${action} ERROR:`,
    error?.message ||
      error
  );
}

async function saveRecord(
  record
) {
  codes.set(
    keyOf(
      record.kind,
      record.email
    ),
    record
  );

  if (!tableAvailable) {
    return;
  }

  try {
    const {
      error,
    } =
      await supabaseAdmin
        .from(
          'otp_attempts'
        )
        .upsert({
          kind:
            record.kind,

          email:
            record.email,

          sent_at:
            toIso(
              record.sentAt
            ),

          wrong_count:
            record.wrongCount,

          updated_at:
            new Date()
              .toISOString(),
        });

    if (error) {
      handleTableError(
        error,
        'SAVE'
      );
    }
  } catch (error) {
    handleTableError(
      error,
      'SAVE'
    );
  }
}

async function removeRecord(
  kind,
  email
) {
  codes.delete(
    keyOf(
      kind,
      email
    )
  );

  if (!tableAvailable) {
    return;
  }

  try {
    const {
      error,
    } =
      await supabaseAdmin
        .from(
          'otp_attempts'
        )
        .delete()
        .eq(
          'kind',
          kind
        )
        .eq(
          'email',
          email
        );

    if (error) {
      handleTableError(
        error,
        'DELETE'
      );
    }
  } catch (error) {
    handleTableError(
      error,
      'DELETE'
    );
  }
}

// From memory, or from the table (e.g. after a restart).
async function loadRecord(
  kind,
  email
) {
  const key =
    keyOf(
      kind,
      email
    );

  if (
    codes.has(key)
  ) {
    return codes.get(
      key
    );
  }

  if (!tableAvailable) {
    return null;
  }

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'otp_attempts'
        )
        .select(
          '*'
        )
        .eq(
          'kind',
          kind
        )
        .eq(
          'email',
          email
        )
        .maybeSingle();

    if (error) {
      handleTableError(
        error,
        'LOAD'
      );

      return null;
    }

    if (!data) {
      return null;
    }

    const record = {
      kind,
      email,

      sentAt:
        toMs(
          data.sent_at
        ),

      wrongCount:
        data.wrong_count ||
        0,
    };

    codes.set(
      key,
      record
    );

    return record;
  } catch (error) {
    handleTableError(
      error,
      'LOAD'
    );

    return null;
  }
}

function plural(
  count,
  word
) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// ============================================================
// SENDING
// ============================================================

// null when a code may be sent now, otherwise the reply
// { status, body } to send instead.
async function getResendBlock(
  kind,
  email
) {
  const record =
    await loadRecord(
      kind,
      cleanEmail(email)
    );

  if (
    !record?.sentAt
  ) {
    return null;
  }

  const waitMs =
    record.sentAt +
    OTP_RESEND_WAIT_MS -
    Date.now();

  if (
    waitMs <= 0
  ) {
    return null;
  }

  const seconds =
    Math.ceil(
      waitMs /
        1000
    );

  return {
    status:
      429,

    body: {
      error:
        `Please wait ${plural(seconds, 'second')} before requesting another code.`,

      code:
        'OTP_RESEND_COOLDOWN',

      retry_after_seconds:
        seconds,
    },
  };
}

// A new code went out: its 10 minutes and 5 tries start now.
async function recordCodeSent(
  kind,
  email
) {
  await saveRecord({
    kind,

    email:
      cleanEmail(email),

    sentAt:
      Date.now(),

    wrongCount:
      0,
  });
}

// ============================================================
// CHECKING
// ============================================================

// null when the code may be checked, otherwise the reply
// { status, body } to send instead.
async function getVerifyBlock(
  kind,
  email
) {
  const record =
    await loadRecord(
      kind,
      cleanEmail(email)
    );

  // No record (sent before these rules existed): Supabase's own
  // expiry still applies.
  if (!record) {
    return null;
  }

  if (
    record.wrongCount >=
    OTP_MAX_WRONG
  ) {
    return {
      status:
        429,

      body: {
        error:
          'Too many incorrect codes. Please request a new code.',

        code:
          'OTP_TOO_MANY_ATTEMPTS',

        attempts_remaining:
          0,
      },
    };
  }

  if (
    record.sentAt &&
    Date.now() -
      record.sentAt >
      OTP_TTL_MS
  ) {
    return {
      status:
        400,

      body: {
        error:
          'This code has expired. Please request a new code.',

        code:
          'OTP_EXPIRED',
      },
    };
  }

  return null;
}

// A wrong (or expired) code. Returns the reply { status, body }.
async function recordWrongCode(
  kind,
  email
) {
  const clean =
    cleanEmail(email);

  const record =
    (await loadRecord(
      kind,
      clean
    )) || {
      kind,
      email:
        clean,
      sentAt:
        null,
      wrongCount:
        0,
    };

  record.wrongCount +=
    1;

  await saveRecord(
    record
  );

  const remaining =
    Math.max(
      0,
      OTP_MAX_WRONG -
        record.wrongCount
    );

  if (
    remaining === 0
  ) {
    return {
      status:
        429,

      body: {
        error:
          'Incorrect code. That was the last try; please request a new code.',

        code:
          'OTP_TOO_MANY_ATTEMPTS',

        attempts_remaining:
          0,
      },
    };
  }

  return {
    status:
      400,

    body: {
      error:
        `Incorrect or expired code. ${remaining} ${remaining === 1 ? 'try' : 'tries'} left.`,

      code:
        'OTP_INVALID',

      attempts_remaining:
        remaining,
    },
  };
}

// The code worked; it can't be used again.
async function recordCodeUsed(
  kind,
  email
) {
  await removeRecord(
    kind,
    cleanEmail(email)
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  OTP_TTL_MS,
  OTP_MAX_WRONG,
  OTP_RESEND_WAIT_MS,
  getResendBlock,
  recordCodeSent,
  getVerifyBlock,
  recordWrongCode,
  recordCodeUsed,
};
