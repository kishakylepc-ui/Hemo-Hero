const crypto = require(
  'crypto'
);

const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// ACCOUNT REVIEWS
//
// Why an account was deactivated or deleted, and the
// "please review my account" requests from deactivated
// people (migration 20261102_account_reviews.sql).
//
// A deactivated person can't sign in, so sign-in hands them a
// short-lived review token once their password is confirmed;
// sending a review request needs that token. The token is
// signed with a server secret, so it can't be made up.
// ============================================================

const REVIEW_TOKEN_MINUTES = 30;

const MAX_REASON_LENGTH = 300;

const MIN_MESSAGE_LENGTH = 10;

const MAX_MESSAGE_LENGTH = 1000;

function getSecret() {
  return (
    process.env.ACCOUNT_REVIEW_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

function sign(payload) {
  return crypto
    .createHmac(
      'sha256',
      getSecret()
    )
    .update(payload)
    .digest('base64url');
}

// ------------------------------------------------------------
// REVIEW TOKEN: "<userId>.<expiresAtMs>.<signature>"
// ------------------------------------------------------------

function createReviewToken(userId) {
  const expiresAt =
    Date.now() +
    REVIEW_TOKEN_MINUTES *
      60 *
      1000;

  const payload =
    `${userId}.${expiresAt}`;

  return `${payload}.${sign(payload)}`;
}

// Returns the user id, or null when the token is wrong or old.
function verifyReviewToken(token) {
  if (
    typeof token !== 'string' ||
    !getSecret()
  ) {
    return null;
  }

  const parts =
    token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [
    userId,
    expiresAt,
    signature,
  ] = parts;

  const expected =
    sign(`${userId}.${expiresAt}`);

  const given =
    Buffer.from(signature);

  const wanted =
    Buffer.from(expected);

  if (
    given.length !== wanted.length ||
    !crypto.timingSafeEqual(
      given,
      wanted
    )
  ) {
    return null;
  }

  if (
    !Number.isFinite(Number(expiresAt)) ||
    Number(expiresAt) < Date.now()
  ) {
    return null;
  }

  return userId;
}

// ------------------------------------------------------------
// TEXT
// ------------------------------------------------------------

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

// The admin's reason: required, at most 300 characters.
// Returns { reason } or { error }.
function readReason(value) {
  const reason =
    cleanText(value);

  if (!reason) {
    return {
      error:
        'Give a reason. The person sees it when they try to sign in.',
    };
  }

  if (
    reason.length >
    MAX_REASON_LENGTH
  ) {
    return {
      error:
        `The reason must not exceed ${MAX_REASON_LENGTH} characters.`,
    };
  }

  return {
    reason,
  };
}

function emailHash(email) {
  return crypto
    .createHash('sha256')
    .update(
      cleanText(email)
        .toLowerCase()
    )
    .digest('hex');
}

// Missing table or column: the migration hasn't been run.
function isMissingMigration(error) {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205'
  );
}

const MIGRATION_MESSAGE =
  'Deactivation reasons need database migration 20261102_account_reviews.sql. Run it in the Supabase SQL editor.';

// ------------------------------------------------------------
// LOOKUPS
// ------------------------------------------------------------

// The person's latest review request, or null.
async function getLatestReview(userId) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from('account_reviews')
      .select(
        'id, status, message, admin_note, created_at, reviewed_at'
      )
      .eq('user_id', userId)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    if (!isMissingMigration(error)) {
      console.error(
        'ACCOUNT REVIEW LOOKUP ERROR:',
        error
      );
    }

    return null;
  }

  return data || null;
}

// Why an account with this email was deleted, or null.
async function getRemovalRecord(email) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from('removed_accounts')
      .select('reason, removed_at')
      .eq(
        'email_hash',
        emailHash(email)
      )
      .order('removed_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    if (!isMissingMigration(error)) {
      console.error(
        'REMOVED ACCOUNT LOOKUP ERROR:',
        error
      );
    }

    return null;
  }

  return data || null;
}

// What a deactivated person sees: when, by whom, and why.
function describeDeactivation(user) {
  const bySelf =
    Boolean(user.deactivated_by) &&
    user.deactivated_by === user.id;

  return {
    deactivated_at:
      user.deactivated_at || null,

    by_self:
      bySelf,

    reason:
      bySelf
        ? null
        : user.deactivation_reason ||
          null,
  };
}

function reviewForClient(review) {
  if (!review) {
    return null;
  }

  return {
    status:
      review.status,

    created_at:
      review.created_at,

    reviewed_at:
      review.reviewed_at || null,

    // Only declined requests carry a note for the person.
    admin_note:
      review.status === 'declined'
        ? review.admin_note || null
        : null,
  };
}

module.exports = {
  MAX_REASON_LENGTH,
  MIN_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
  MIGRATION_MESSAGE,
  createReviewToken,
  verifyReviewToken,
  readReason,
  emailHash,
  isMissingMigration,
  getLatestReview,
  getRemovalRecord,
  describeDeactivation,
  reviewForClient,
};
