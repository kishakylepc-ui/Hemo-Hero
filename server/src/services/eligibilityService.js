// ============================================================
// DONATION ELIGIBILITY
//
// A donor must wait ELIGIBILITY_DAYS after a whole-blood
// donation before donating again. Checked before offering,
// accepting or being invited, and when a donation is recorded.
//
// last_donation_date is a calendar date ('YYYY-MM-DD') in
// Philippine time.
//
// DONATION_INTERVAL_DAYS in server/.env overrides the 90 days
// (e.g. 0 while testing the donation cycle with the same
// accounts).
// ============================================================

const configuredDays =
  Number(
    process.env.DONATION_INTERVAL_DAYS
  );

const ELIGIBILITY_DAYS =
  process.env.DONATION_INTERVAL_DAYS !== undefined &&
  process.env.DONATION_INTERVAL_DAYS !== '' &&
  Number.isFinite(configuredDays) &&
  configuredDays >= 0
    ? configuredDays
    : 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// The first day the donor may donate again, or null when there
// is no previous donation on record.
function getNextEligibleDate(
  lastDonationDate
) {
  if (!lastDonationDate) {
    return null;
  }

  const day =
    String(lastDonationDate).slice(0, 10);

  const start =
    new Date(`${day}T00:00:00+08:00`);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return new Date(
    start.getTime() +
      ELIGIBILITY_DAYS * DAY_MS
  );
}

function isEligibleToDonate(
  lastDonationDate,
  now = new Date()
) {
  const next =
    getNextEligibleDate(
      lastDonationDate
    );

  return (
    !next ||
    next.getTime() <= now.getTime()
  );
}

// "Dec 30, 2026"
function formatEligibleDate(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    }
  );
}

module.exports = {
  ELIGIBILITY_DAYS,
  getNextEligibleDate,
  isEligibleToDonate,
  formatEligibleDate
};
