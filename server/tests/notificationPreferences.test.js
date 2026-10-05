require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PREFERENCES,
  getPreferenceKey,
  wantsPush,
  toPreferences,
  readPreferenceUpdates
} = require('../src/services/notificationPreferenceService');

test('each notification type belongs to one setting', () => {
  assert.equal(getPreferenceKey('request'), 'donation_requests');
  assert.equal(getPreferenceKey('donor_response_accepted'), 'request_updates');
  assert.equal(getPreferenceKey('blood_request_expired'), 'request_updates');
  assert.equal(getPreferenceKey('coordination_message'), 'messages');
  assert.equal(getPreferenceKey('coordination_trip_near'), 'messages');
  assert.equal(getPreferenceKey('donation_feedback_received'), 'donations');
});

test('account and application updates always alert', () => {
  const allOff = toPreferences({
    push_enabled: true,
    donation_requests: false,
    request_updates: false,
    messages: false,
    donations: false
  });

  assert.equal(getPreferenceKey('donor_application_approved'), null);
  assert.equal(wantsPush(allOff, 'donor_application_approved'), true);
  assert.equal(wantsPush(allOff, 'system'), true);
  assert.equal(wantsPush(allOff, 'coordination_message'), false);
});

test('everything is on when nothing is saved', () => {
  assert.equal(wantsPush(undefined, 'coordination_message'), true);
  assert.deepEqual(toPreferences(null), { ...DEFAULT_PREFERENCES });
});

test('turning phone alerts off stops every alert', () => {
  const off = toPreferences({ push_enabled: false });

  assert.equal(wantsPush(off, 'request'), false);
  assert.equal(wantsPush(off, 'donor_application_approved'), false);
});

test('settings changes must be true or false', () => {
  assert.deepEqual(
    readPreferenceUpdates({ messages: false, unknown: true }),
    { valid: true, updates: { messages: false } }
  );
  assert.equal(readPreferenceUpdates({ messages: 'no' }).valid, false);
  assert.equal(readPreferenceUpdates({}).valid, false);
});
