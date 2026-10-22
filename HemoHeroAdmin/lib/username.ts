// ============================================================
// USERNAMES (same rule as the server, utils/username.js)
//
// 3 to 20 characters: lowercase letters, numbers, periods and
// underscores, starting with a letter or number. Saved in
// lowercase. Never contains @, so sign-in can tell it from an
// email.
// ============================================================

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._]{2,19}$/;

export function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

// A message for what's wrong, or null when it's fine.
export function getUsernameProblem(
  value: string
): string | null {
  const clean = cleanUsername(value);

  if (!clean) {
    return 'Please enter a username.';
  }

  if (
    clean.length < 3 ||
    clean.length > 20
  ) {
    return 'Username must be 3 to 20 characters.';
  }

  if (!USERNAME_PATTERN.test(clean)) {
    return 'Username can use only letters, numbers, periods and underscores, and must start with a letter or number.';
  }

  return null;
}
