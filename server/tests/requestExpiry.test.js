require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDeadline,
  getScheduleLimit
} = require('../src/services/requestExpiryService');

const HOUR_MS = 60 * 60 * 1000;

test('urgent requests close 3 days after posting', () => {
  const created = '2026-10-01T00:00:00.000Z';

  assert.equal(
    getDeadline({ urgency: 'urgent', created_at: created }),
    Date.parse(created) + 72 * HOUR_MS
  );
});

test('scheduled requests close 24 hours after the needed date and time (Philippine time)', () => {
  const deadline = getDeadline({
    urgency: 'needed',
    needed_date: '2026-10-05',
    needed_time: '14:30:00',
    created_at: '2026-10-01T00:00:00.000Z'
  });

  assert.equal(
    new Date(deadline).toISOString(),
    '2026-10-06T06:30:00.000Z'
  );
});

test('a scheduled request without a time uses the end of the needed day', () => {
  const deadline = getDeadline({
    urgency: 'needed',
    needed_date: '2026-10-05',
    needed_time: null,
    created_at: '2026-10-01T00:00:00.000Z'
  });

  assert.equal(
    new Date(deadline).toISOString(),
    '2026-10-06T15:59:00.000Z'
  );
});

test('meeting limit: a scheduled request uses its needed date and time', () => {
  const limit = getScheduleLimit({
    urgency: 'needed',
    needed_date: '2026-10-05',
    needed_time: '14:30:00',
    created_at: '2026-10-01T00:00:00.000Z'
  });

  // 2:30 PM in Manila, without the 24-hour grace used for closing.
  assert.equal(new Date(limit).toISOString(), '2026-10-05T06:30:00.000Z');
});

test('meeting limit: no needed time means the end of the needed day', () => {
  const limit = getScheduleLimit({
    urgency: 'needed',
    needed_date: '2026-10-05',
    needed_time: null,
    created_at: '2026-10-01T00:00:00.000Z'
  });

  assert.equal(new Date(limit).toISOString(), '2026-10-05T15:59:00.000Z');
});

test('meeting limit: an urgent request uses its closing time (3 days)', () => {
  const created = '2026-10-01T00:00:00.000Z';

  assert.equal(
    getScheduleLimit({ urgency: 'urgent', needed_date: '2026-10-02', created_at: created }),
    Date.parse(created) + 72 * HOUR_MS
  );
});

test('meeting limit: a request without a date uses its closing time (7 days)', () => {
  const created = '2026-10-01T00:00:00.000Z';

  assert.equal(
    getScheduleLimit({ urgency: 'needed', needed_date: null, created_at: created }),
    Date.parse(created) + 7 * 24 * HOUR_MS
  );
});

test('requests with no date close 7 days after posting', () => {
  const created = '2026-10-01T00:00:00.000Z';

  assert.equal(
    getDeadline({ urgency: 'needed', needed_date: null, created_at: created }),
    Date.parse(created) + 7 * 24 * HOUR_MS
  );
});
