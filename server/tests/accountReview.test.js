require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

// Review tokens, reasons and what a deactivated person is told
// (accountReviewService.js).

const {
  createReviewToken,
  verifyReviewToken,
  readReason,
  emailHash,
  describeDeactivation,
  reviewForClient,
} = require('../src/services/accountReviewService');

test('a review token from sign-in gives back its account', () => {
  const token = createReviewToken('user-1');

  assert.equal(verifyReviewToken(token), 'user-1');
});

test('a changed or made-up review token is refused', () => {
  const token = createReviewToken('user-1');
  const [, expiresAt, signature] = token.split('.');

  assert.equal(verifyReviewToken(`user-2.${expiresAt}.${signature}`), null);
  assert.equal(verifyReviewToken(`user-1.${Number(expiresAt) + 1}.${signature}`), null);
  assert.equal(verifyReviewToken('user-1.123'), null);
  assert.equal(verifyReviewToken(null), null);
});

test('an old review token is refused', (t) => {
  const realNow = Date.now;
  const token = createReviewToken('user-1');

  // 31 minutes later
  t.mock.method(Date, 'now', () => realNow() + 31 * 60 * 1000);

  assert.equal(verifyReviewToken(token), null);
});

test('a reason is required and kept short', () => {
  assert.ok(readReason('').error);
  assert.ok(readReason('   ').error);
  assert.ok(readReason('x'.repeat(301)).error);
  assert.deepEqual(readReason('  Repeated   no-shows '), { reason: 'Repeated no-shows' });
});

test('the email hash ignores case and spaces', () => {
  assert.equal(emailHash(' Juan@Example.com '), emailHash('juan@example.com'));
});

test('a person who deactivated their own account sees no admin reason', () => {
  assert.deepEqual(
    describeDeactivation({
      id: 'u1',
      deactivated_by: 'u1',
      deactivated_at: '2026-10-30T00:00:00Z',
      deactivation_reason: 'old text',
    }),
    { deactivated_at: '2026-10-30T00:00:00Z', by_self: true, reason: null }
  );

  assert.equal(
    describeDeactivation({ id: 'u1', deactivated_by: 'admin-1', deactivation_reason: 'Repeated no-shows' }).reason,
    'Repeated no-shows'
  );
});

test('only a declined review shows the admin note', () => {
  assert.equal(reviewForClient({ status: 'pending', admin_note: 'x' }).admin_note, null);
  assert.equal(reviewForClient({ status: 'declined', admin_note: 'Proof was edited.' }).admin_note, 'Proof was edited.');
  assert.equal(reviewForClient(null), null);
});
