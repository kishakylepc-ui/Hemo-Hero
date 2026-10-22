require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// A stand-in for the otp_attempts table. missing: true acts
// like the migration hasn't been run.
function fakeDatabase({ missing = false } = {}) {
  const rows = new Map();
  const key = (kind, email) => `${kind}:${email}`;

  const missingError = {
    code: 'PGRST205',
    message: 'Could not find the table',
  };

  const result = data =>
    Promise.resolve(
      missing
        ? { data: null, error: missingError }
        : { data, error: null }
    );

  // .eq('kind', k).eq('email', e) then the final call.
  function filtered(finish) {
    const where = {};

    const chain = {
      eq(column, value) {
        where[column] = value;
        return chain;
      },
      maybeSingle: () => finish(where),
      then: (resolve, reject) =>
        finish(where).then(resolve, reject),
    };

    return chain;
  }

  return {
    rows,

    from(table) {
      assert.equal(table, 'otp_attempts');

      return {
        upsert(row) {
          if (!missing) rows.set(key(row.kind, row.email), { ...row });
          return result(null);
        },

        delete() {
          return filtered(where => {
            if (!missing) rows.delete(key(where.kind, where.email));
            return result(null);
          });
        },

        select() {
          return filtered(where =>
            result(rows.get(key(where.kind, where.email)) || null)
          );
        },
      };
    },
  };
}

// A fresh copy of the service (like a server restart).
function loadGuard(database) {
  const configPath = require.resolve('../src/config/supabase');
  const guardPath = require.resolve('../src/services/otpGuardService');

  const config = new Module(configPath);
  config.filename = configPath;
  config.loaded = true;
  config.exports = { supabaseAdmin: database };

  require.cache[configPath] = config;
  delete require.cache[guardPath];

  return require(guardPath);
}

const EMAIL = 'donor@example.com';

test('a new code can be sent only 60 seconds after the last one', async t => {
  const guard = loadGuard(fakeDatabase());

  assert.equal(await guard.getResendBlock('signup', EMAIL), null);

  await guard.recordCodeSent('signup', ' Donor@Example.com ');

  const wait = await guard.getResendBlock('signup', EMAIL);
  assert.equal(wait.status, 429);
  assert.equal(wait.body.code, 'OTP_RESEND_COOLDOWN');
  assert.ok(wait.body.retry_after_seconds > 55);

  const later = Date.now() + 61 * 1000;
  t.mock.method(Date, 'now', () => later);

  assert.equal(await guard.getResendBlock('signup', EMAIL), null);
});

test('5 wrong codes use the code up, with the tries left shown', async () => {
  const guard = loadGuard(fakeDatabase());

  await guard.recordCodeSent('recovery', EMAIL);

  const first = await guard.recordWrongCode('recovery', EMAIL);
  assert.equal(first.status, 400);
  assert.equal(first.body.attempts_remaining, 4);
  assert.match(first.body.error, /4 tries left/);

  for (const _ of [2, 3, 4]) {
    await guard.recordWrongCode('recovery', EMAIL);
  }

  const last = await guard.recordWrongCode('recovery', EMAIL);
  assert.equal(last.status, 429);
  assert.equal(last.body.code, 'OTP_TOO_MANY_ATTEMPTS');

  const blocked = await guard.getVerifyBlock('recovery', EMAIL);
  assert.equal(blocked.body.code, 'OTP_TOO_MANY_ATTEMPTS');
});

test('a new code starts over with 5 tries', async t => {
  const guard = loadGuard(fakeDatabase());

  await guard.recordCodeSent('signup', EMAIL);

  for (const _ of [1, 2, 3, 4, 5]) {
    await guard.recordWrongCode('signup', EMAIL);
  }

  const later = Date.now() + 61 * 1000;
  t.mock.method(Date, 'now', () => later);

  await guard.recordCodeSent('signup', EMAIL);

  assert.equal(await guard.getVerifyBlock('signup', EMAIL), null);
});

test('a code expires 10 minutes after it was sent', async t => {
  const guard = loadGuard(fakeDatabase());

  await guard.recordCodeSent('email_change', EMAIL);
  assert.equal(await guard.getVerifyBlock('email_change', EMAIL), null);

  const later = Date.now() + 10 * 60 * 1000 + 1000;
  t.mock.method(Date, 'now', () => later);

  const blocked = await guard.getVerifyBlock('email_change', EMAIL);
  assert.equal(blocked.body.code, 'OTP_EXPIRED');
});

test('a used code is forgotten, and kinds are kept apart', async () => {
  const database = fakeDatabase();
  const guard = loadGuard(database);

  await guard.recordCodeSent('signup', EMAIL);
  await guard.recordCodeSent('recovery', EMAIL);

  await guard.recordCodeUsed('signup', EMAIL);

  assert.equal(database.rows.has(`signup:${EMAIL}`), false);
  assert.equal(database.rows.has(`recovery:${EMAIL}`), true);
});

test('tries and send times survive a server restart', async () => {
  const database = fakeDatabase();

  const before = loadGuard(database);
  await before.recordCodeSent('recovery', EMAIL);
  await before.recordWrongCode('recovery', EMAIL);

  const after = loadGuard(database);

  const wait = await after.getResendBlock('recovery', EMAIL);
  assert.equal(wait.body.code, 'OTP_RESEND_COOLDOWN');

  const next = await after.recordWrongCode('recovery', EMAIL);
  assert.equal(next.body.attempts_remaining, 3);
});

test('without the table, the rules still work in memory', async t => {
  t.mock.method(console, 'warn', () => {});

  const guard = loadGuard(fakeDatabase({ missing: true }));

  await guard.recordCodeSent('signup', EMAIL);

  const wait = await guard.getResendBlock('signup', EMAIL);
  assert.equal(wait.body.code, 'OTP_RESEND_COOLDOWN');
  assert.equal(console.warn.mock.callCount(), 1);
});
