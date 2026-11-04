require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTrendWeeks,
  getRangeStart,
} = require('../src/controllers/adminAnalyticsController');

// Wednesday, Nov 4, 2026, noon in the Philippines.
const NOW = Date.parse('2026-11-04T04:00:00.000Z');

test('weeks run Monday to Sunday, oldest first, ending this week', () => {
  const weeks = buildTrendWeeks({}, 4, NOW);

  assert.deepEqual(
    weeks.map(week => [week.start, week.end]),
    [
      ['2026-10-12', '2026-10-18'],
      ['2026-10-19', '2026-10-25'],
      ['2026-10-26', '2026-11-01'],
      ['2026-11-02', '2026-11-08'],
    ]
  );
});

test('weeks with nothing still appear with zeros', () => {
  const [week] = buildTrendWeeks({}, 4, NOW);

  assert.equal(week.requests, 0);
  assert.equal(week.donations, 0);
  assert.equal(week.activity_successful, 0);
  assert.equal(week.activity_failed, 0);
});

test('each record counts in its own week and column', () => {
  const weeks = buildTrendWeeks(
    {
      requests: [{ created_at: '2026-11-03T01:00:00.000Z' }],
      donations: [
        { donated_at: '2026-11-03T01:00:00.000Z' },
        { donated_at: '2026-10-20T01:00:00.000Z' },
      ],
      activity: [
        { created_at: '2026-11-03T01:00:00.000Z', success: true },
        { created_at: '2026-11-03T02:00:00.000Z', success: false },
      ],
    },
    4,
    NOW
  );

  assert.equal(weeks[3].requests, 1);
  assert.equal(weeks[3].donations, 1);
  assert.equal(weeks[1].donations, 1);
  assert.equal(weeks[3].activity_successful, 1);
  assert.equal(weeks[3].activity_failed, 1);
});

test('the week changes at midnight Philippine time, not UTC', () => {
  // Sunday Nov 1, 11:30 PM in the Philippines.
  const sunday = '2026-11-01T15:30:00.000Z';
  // Monday Nov 2, 12:30 AM in the Philippines, still Sunday in UTC.
  const monday = '2026-11-01T16:30:00.000Z';

  const weeks = buildTrendWeeks(
    {
      requests: [
        { created_at: sunday },
        { created_at: monday },
      ],
    },
    4,
    NOW
  );

  assert.equal(weeks[2].requests, 1);
  assert.equal(weeks[3].requests, 1);
});

test('records outside the range and bad dates are ignored', () => {
  const weeks = buildTrendWeeks(
    {
      requests: [
        { created_at: '2020-01-01T00:00:00.000Z' },
        { created_at: 'not a date' },
        { created_at: null },
      ],
    },
    4,
    NOW
  );

  assert.equal(
    weeks.reduce((sum, week) => sum + week.requests, 0),
    0
  );
});

test('the query starts when the first week begins', () => {
  // Monday Oct 12, midnight in the Philippines.
  assert.equal(
    getRangeStart(4, NOW),
    '2026-10-11T16:00:00.000Z'
  );
});
