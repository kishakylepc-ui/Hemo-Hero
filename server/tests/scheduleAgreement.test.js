require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isScheduleAgreed,
  getScheduleSaveAgreement,
} = require('../src/services/scheduleAgreementService');

const REQUESTER = 'requester-id';
const DONOR = 'donor-id';
const NOW = '2026-10-14T02:00:00.000Z';
const TIME = '2026-10-15T06:30:00.000Z';
const OTHER_TIME = '2026-10-15T08:00:00.000Z';

function suggestion(proposedBy, scheduledAt = TIME) {
  return {
    status: 'proposed',
    proposed_by: proposedBy,
    scheduled_at: scheduledAt,
  };
}

test('only an agreed time, or one set before agreement existed, counts', () => {
  assert.equal(isScheduleAgreed(null), false);
  assert.equal(isScheduleAgreed(suggestion(DONOR)), false);
  assert.equal(isScheduleAgreed({ status: 'agreed' }), true);
  assert.equal(isScheduleAgreed({ status: null }), true);
  assert.equal(isScheduleAgreed({}), true);
});

test('the first time set is a suggestion from whoever set it', () => {
  const result = getScheduleSaveAgreement(
    null,
    REQUESTER,
    Date.parse(TIME),
    NOW
  );

  assert.equal(result.agreesWithTheirTime, false);
  assert.deepEqual(result.fields, {
    status: 'proposed',
    proposed_by: REQUESTER,
    agreed_at: null,
  });
});

test('a different time is a new suggestion back to the other side', () => {
  const result = getScheduleSaveAgreement(
    suggestion(REQUESTER),
    DONOR,
    Date.parse(OTHER_TIME),
    NOW
  );

  assert.equal(result.agreesWithTheirTime, false);
  assert.equal(result.fields.status, 'proposed');
  assert.equal(result.fields.proposed_by, DONOR);
});

test('saving the exact time the other side suggested agrees to it', () => {
  const result = getScheduleSaveAgreement(
    suggestion(REQUESTER),
    DONOR,
    Date.parse(TIME),
    NOW
  );

  assert.equal(result.agreesWithTheirTime, true);
  assert.deepEqual(result.fields, {
    status: 'agreed',
    proposed_by: REQUESTER,
    agreed_at: NOW,
  });
});

test('saving your own suggestion again does not agree to it', () => {
  const result = getScheduleSaveAgreement(
    suggestion(REQUESTER),
    REQUESTER,
    Date.parse(TIME),
    NOW
  );

  assert.equal(result.agreesWithTheirTime, false);
  assert.equal(result.fields.status, 'proposed');
});

test('changing an agreed time makes it a suggestion again', () => {
  const result = getScheduleSaveAgreement(
    {
      status: 'agreed',
      proposed_by: REQUESTER,
      scheduled_at: TIME,
    },
    DONOR,
    Date.parse(TIME),
    NOW
  );

  assert.equal(result.agreesWithTheirTime, false);
  assert.equal(result.fields.status, 'proposed');
  assert.equal(result.fields.proposed_by, DONOR);
});
