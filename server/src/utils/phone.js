// ============================================================
// PHONE NUMBERS
//
// Phone is optional. When given it must be a Philippine mobile
// number, written any common way:
//
//   0917 123 4567   +63 917 123 4567   63-917-123-4567
//
// It is saved as 09171234567.
// ============================================================

const PHONE_ERROR =
  'Enter a Philippine mobile number, like 0917 123 4567.';

// { valid: true, value: '09…' | null } or { valid: false, error }
function normalizePhone(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return {
      valid: true,
      value: null
    };
  }

  if (
    typeof value !==
    'string'
  ) {
    return {
      valid: false,
      error: PHONE_ERROR
    };
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return {
      valid: true,
      value: null
    };
  }

  // Digits with spaces, dashes, dots or brackets; "+" only at
  // the start.
  if (
    !/^\+?[\d\s().-]+$/.test(
      trimmed
    )
  ) {
    return {
      valid: false,
      error: PHONE_ERROR
    };
  }

  const digits =
    trimmed.replace(
      /\D/g,
      ''
    );

  let local =
    null;

  if (/^09\d{9}$/.test(digits)) {
    local = digits;
  } else if (/^639\d{9}$/.test(digits)) {
    local = `0${digits.slice(2)}`;
  } else if (/^9\d{9}$/.test(digits)) {
    local = `0${digits}`;
  }

  if (!local) {
    return {
      valid: false,
      error: PHONE_ERROR
    };
  }

  return {
    valid: true,
    value: local
  };
}

module.exports = {
  PHONE_ERROR,
  normalizePhone
};
