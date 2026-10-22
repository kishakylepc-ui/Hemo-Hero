require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// A stand-in for the login_lockouts table, so the limiter can be
// tested without a database. missing: true acts like the table
// hasn't been created yet.
function fakeDatabase({ missing = false } = {}) {
  const rows = new Map();

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

  return {
    rows,

    from(table) {
      assert.equal(table, 'login_lockouts');

      return {
        upsert(row) {
          if (!missing) rows.set(row.email, { ...row });
          return result(null);
        },

        delete() {
          return {
            eq(column, value) {
              if (!missing) rows.delete(value);
              return result(null);
            },
          };
        },

        select() {
          return {
            eq(column, value) {
              return {
                maybeSingle: () =>
                  result(rows.get(value) || null),
              };
            },
          };
        },
      };
    },
  };
}

// Puts a stand-in module in place of a real one.
function fakeModule(path, exports) {
  const module = new Module(path);
  module.filename = path;
  module.loaded = true;
  module.exports = exports;

  require.cache[path] = module;
}

// The answer every test CAPTCHA accepts.
const RIGHT_CAPTCHA = { captcha_id: 'test', captcha_answer: 'right' };

// Loads a fresh copy of the limiter (like a server restart) that
// uses the given database.
function loadLimiter(database) {
  const limiterPath = require.resolve('../src/middleware/loginRateLimiter');

  fakeModule(require.resolve('../src/config/supabase'), {
    supabaseAdmin: database,
  });

  fakeModule(require.resolve('../src/services/captchaService'), {
    verifyCaptcha: (id, answer) => answer === 'right',
  });

  delete require.cache[limiterPath];

  return require(limiterPath).loginLimiter[0];
}

async function signInAttempt(limiter, email, extra = {}) {
  const req = { body: { email, ...extra } };
  const outcome = { req, status: null, body: null, passed: false };

  const res = {
    status(code) {
      outcome.status = code;
      return this;
    },
    json(body) {
      outcome.body = body;
      return this;
    },
  };

  await limiter(req, res, () => {
    outcome.passed = true;
  });

  return outcome;
}

// Saves are sent in the background; let them finish.
const settle = () => new Promise(resolve => setImmediate(resolve));

// Wrong passwords, each with a solved CAPTCHA (ignored until
// one is needed).
async function wrongPasswords(limiter, email, times) {
  let last = null;

  for (let i = 0; i < times; i += 1) {
    const attempt = await signInAttempt(limiter, email, RIGHT_CAPTCHA);
    assert.equal(attempt.passed, true);
    last = attempt.req.recordFailedLogin();
  }

  await settle();
  return last;
}

test('three wrong passwords lock the account for 1 minute', async () => {
  const limiter = loadLimiter(fakeDatabase());
  const email = 'donor@example.com';

  const second = await wrongPasswords(limiter, email, 2);
  assert.equal(second.attempts_remaining, 1);
  assert.equal(second.locked, false);

  const third = await wrongPasswords(limiter, email, 1);
  assert.equal(third.locked, true);
  assert.equal(third.retry_after_minutes, 1);

  const blocked = await signInAttempt(limiter, ' Donor@Example.com ');
  assert.equal(blocked.passed, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'LOGIN_ACCOUNT_RATE_LIMIT');

  // Exact time left, for the apps' countdown.
  assert.ok(blocked.body.retry_after_seconds > 55);
  assert.ok(blocked.body.retry_after_seconds <= 60);
  assert.equal(blocked.body.retry_after_minutes, 1);
  assert.ok(blocked.body.locked_until);
});

test('a lockout is saved and survives a server restart', async () => {
  const database = fakeDatabase();
  const email = 'requester@example.com';

  await wrongPasswords(loadLimiter(database), email, 3);

  const saved = database.rows.get(email);
  assert.ok(saved.locked_until);
  assert.equal(saved.lock_level, 1);
  assert.equal(saved.failed_count, 0);

  const afterRestart = await signInAttempt(loadLimiter(database), email);
  assert.equal(afterRestart.passed, false);
  assert.equal(afterRestart.status, 429);
});

test('each lockout lasts longer (1, 5, then 15 minutes)', async () => {
  const database = fakeDatabase();
  const email = 'repeat@example.com';
  const minutes = [];

  for (const _ of [1, 2, 3, 4, 5]) {
    const limiter = loadLimiter(database);
    const result = await wrongPasswords(limiter, email, 3);
    minutes.push(result.retry_after_minutes);

    // Let the lock run out before the next round.
    database.rows.get(email).locked_until =
      new Date(Date.now() - 1000).toISOString();
  }

  assert.deepEqual(minutes, [1, 5, 15, 15, 15]);
});

// Moves a saved record's times into the past, as if that much
// time had gone by.
function timePasses(database, email, ms) {
  const row = database.rows.get(email);

  for (const key of ['first_failed_at', 'last_failed_at', 'locked_until']) {
    if (row[key]) {
      row[key] = new Date(Date.parse(row[key]) - ms).toISOString();
    }
  }
}

test('after a lockout, signing in needs a CAPTCHA', async () => {
  const database = fakeDatabase();
  const email = 'captcha@example.com';

  const locked = await wrongPasswords(loadLimiter(database), email, 3);
  assert.equal(locked.captcha_required, true);

  timePasses(database, email, 2 * 60 * 1000);
  const limiter = loadLimiter(database);

  const without = await signInAttempt(limiter, email);
  assert.equal(without.passed, false);
  assert.equal(without.status, 428);
  assert.equal(without.body.code, 'CAPTCHA_REQUIRED');

  const wrong = await signInAttempt(limiter, email, {
    captcha_id: 'test',
    captcha_answer: 'wrong',
  });
  assert.equal(wrong.status, 428);
  assert.equal(wrong.body.code, 'CAPTCHA_INCORRECT');

  const solved = await signInAttempt(limiter, email, RIGHT_CAPTCHA);
  assert.equal(solved.passed, true);
});

test('no CAPTCHA before the first lockout', async () => {
  const limiter = loadLimiter(fakeDatabase());
  const email = 'fresh@example.com';

  const second = await wrongPasswords(limiter, email, 2);
  assert.equal(second.captcha_required, false);

  const attempt = await signInAttempt(limiter, email);
  assert.equal(attempt.passed, true);
});

test('a 15-minute lockout keeps the account at that level after it ends', async () => {
  const database = fakeDatabase();
  const email = 'longlock@example.com';
  const minutes = [];

  for (const _ of [1, 2, 3, 4]) {
    const result = await wrongPasswords(loadLimiter(database), email, 3);
    minutes.push(result.retry_after_minutes);

    // The lockout ended 20 minutes ago.
    timePasses(database, email, 35 * 60 * 1000);
  }

  assert.deepEqual(minutes, [1, 5, 15, 15]);
});

test('a day without wrong passwords starts over', async () => {
  const database = fakeDatabase();
  const email = 'nextday@example.com';

  await wrongPasswords(loadLimiter(database), email, 3);
  timePasses(database, email, 25 * 60 * 60 * 1000);

  const limiter = loadLimiter(database);
  const attempt = await signInAttempt(limiter, email);
  assert.equal(attempt.passed, true);

  const result = await wrongPasswords(limiter, email, 3);
  assert.equal(result.retry_after_minutes, 1);
});

test('a successful sign-in clears the saved record', async () => {
  const database = fakeDatabase();
  const limiter = loadLimiter(database);
  const email = 'success@example.com';

  await wrongPasswords(limiter, email, 2);
  assert.ok(database.rows.has(email));

  const attempt = await signInAttempt(limiter, email);
  attempt.req.resetLoginAttempts();
  await settle();

  assert.equal(database.rows.has(email), false);
});

test('without the table, lockouts still work in memory', async t => {
  t.mock.method(console, 'warn', () => {});

  const limiter = loadLimiter(fakeDatabase({ missing: true }));
  const email = 'nomigration@example.com';

  const third = await wrongPasswords(limiter, email, 3);
  assert.equal(third.locked, true);

  const blocked = await signInAttempt(limiter, email);
  assert.equal(blocked.status, 429);
  assert.equal(console.warn.mock.callCount(), 1);
});
