// ============================================================
// PHONE NUMBERS
//
// Same rules as the server (server/src/utils/phone.js): phone
// is optional; when given it must be a Philippine mobile
// number such as 0917 123 4567 or +63 917 123 4567. The server
// saves it as 09171234567.
// ============================================================

export const PHONE_ERROR =
  'Enter a Philippine mobile number, like 0917 123 4567.';

// The number as 09XXXXXXXXX, '' when empty, or null when it
// isn't a valid mobile number.
export function normalizePhone(
  value: string
): string | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return '';
  }

  if (
    !/^\+?[\d\s().-]+$/.test(
      trimmed
    )
  ) {
    return null;
  }

  const digits =
    trimmed.replace(
      /\D/g,
      ''
    );

  if (/^09\d{9}$/.test(digits)) {
    return digits;
  }

  if (/^639\d{9}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }

  if (/^9\d{9}$/.test(digits)) {
    return `0${digits}`;
  }

  return null;
}

// "0917 123 4567"
export function formatPhone(
  value?: string | null
) {
  const digits =
    String(
      value ||
      ''
    );

  return /^09\d{9}$/.test(
    digits
  )
    ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    : digits;
}
