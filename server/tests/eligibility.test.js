require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ELIGIBILITY_DAYS,
  getNextEligibleDate,
  isEligibleToDonate,
  formatEligibleDate
} = require('../src/services/eligibilityService');

const DAY_MS = 24 * 60 * 60 * 1000;

test('default interval is 90 days', () => {
  assert.equal(ELIGIBILITY_DAYS, 90);
});

test('a donor with no donation on record can donate', () => {
  assert.equal(getNextEligibleDate(null), null);
  assert.equal(isEligibleToDonate(null), true);
  assert.equal(isEligibleToDonate(''), true);
});

test('next eligible date is 90 days after the donation (Philippine time)', () => {
  const next = getNextEligibleDate('2026-09-01');

  assert.equal(next.toISOString(), '2026-11-29T16:00:00.000Z');
  assert.equal(formatEligibleDate(next), 'Nov 30, 2026');
});

test('waiting period blocks until the next eligible date', () => {
  const donated = '2026-09-01';
  const next = getNextEligibleDate(donated);

  assert.equal(isEligibleToDonate(donated, new Date(next.getTime() - DAY_MS)), false);
  assert.equal(isEligibleToDonate(donated, next), true);
  assert.equal(isEligibleToDonate(donated, new Date(next.getTime() + DAY_MS)), true);
});

test('a full timestamp is read as its calendar date', () => {
  assert.equal(
    getNextEligibleDate('2026-09-01T10:30:00Z').toISOString(),
    getNextEligibleDate('2026-09-01').toISOString()
  );
});

test('an unreadable date does not block donating', () => {
  assert.equal(getNextEligibleDate('not-a-date'), null);
  assert.equal(isEligibleToDonate('not-a-date'), true);
});

test('DONATION_INTERVAL_DAYS overrides the interval', () => {
  const modulePath = require.resolve('../src/services/eligibilityService');

  delete require.cache[modulePath];
  process.env.DONATION_INTERVAL_DAYS = '0';

  try {
    const overridden = require(modulePath);

    assert.equal(overridden.ELIGIBILITY_DAYS, 0);
    assert.equal(overridden.isEligibleToDonate('2026-09-01', new Date('2026-09-01T00:00:00+08:00')), true);
  } finally {
    delete process.env.DONATION_INTERVAL_DAYS;
    delete require.cache[modulePath];
  }
});
