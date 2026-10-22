const crypto =
  require('crypto');

const svgCaptcha =
  require('svg-captcha');

// ============================================================
// SIGN-IN CAPTCHA
//
// After an account has been locked once, every further sign-in
// attempt for it needs a solved CAPTCHA (see
// loginRateLimiter.js).
//
// Each CAPTCHA is a picture of 5 characters. svg-captcha draws
// the characters as SVG paths, so the answer can't be read from
// the markup. The answer stays on the server, in memory, for
// 5 minutes, and each CAPTCHA can be checked only once: right or
// wrong, the next attempt needs a new one.
// ============================================================

const CAPTCHA_TTL_MS =
  5 * 60 * 1000;

// Caps memory if someone requests CAPTCHAs in a loop.
const MAX_STORED_CAPTCHAS =
  5000;

// id -> { answer, expiresAt }
const captchas =
  new Map();

function removeExpired(
  now
) {
  for (const [
    id,
    item,
  ] of captchas) {
    if (
      item.expiresAt <=
      now
    ) {
      captchas.delete(
        id
      );
    }
  }
}

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------

function createCaptcha() {
  const now =
    Date.now();

  removeExpired(
    now
  );

  // A Map keeps insertion order, so the oldest go first.
  while (
    captchas.size >=
    MAX_STORED_CAPTCHAS
  ) {
    captchas.delete(
      captchas
        .keys()
        .next()
        .value
    );
  }

  const {
    data,
    text,
  } =
    svgCaptcha.create({
      size:
        5,

      noise:
        3,

      color:
        true,

      background:
        '#F4F6FA',

      width:
        200,

      height:
        64,

      // Characters that are easy to mix up.
      ignoreChars:
        '0oO1iIlL',
    });

  const id =
    crypto.randomUUID();

  captchas.set(
    id,
    {
      answer:
        text.toLowerCase(),

      expiresAt:
        now +
        CAPTCHA_TTL_MS,
    }
  );

  return {
    captcha_id:
      id,

    svg:
      data,

    expires_in_seconds:
      CAPTCHA_TTL_MS /
      1000,
  };
}

// ------------------------------------------------------------
// CHECK
//
// Not case-sensitive. The CAPTCHA is used up either way.
// ------------------------------------------------------------

function verifyCaptcha(
  id,
  answer
) {
  if (
    typeof id !==
      'string' ||
    typeof answer !==
      'string'
  ) {
    return false;
  }

  const item =
    captchas.get(
      id
    );

  if (!item) {
    return false;
  }

  captchas.delete(
    id
  );

  if (
    item.expiresAt <=
    Date.now()
  ) {
    return false;
  }

  const given =
    Buffer.from(
      answer
        .trim()
        .toLowerCase()
    );

  const expected =
    Buffer.from(
      item.answer
    );

  return (
    given.length ===
      expected.length &&
    crypto.timingSafeEqual(
      given,
      expected
    )
  );
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createCaptcha,
  verifyCaptcha,
};
