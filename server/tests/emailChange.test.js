require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Change email with a code (accountController.js), against a
// stand-in for Supabase. The otp_attempts table is "missing",
// so the code rules run in memory.

const OLD_EMAIL = 'old@example.com';
const NEW_EMAIL = 'new@example.com';

function fakeSupabase({
  passwordOk = true,
  codeOk = true,
  accounts = [],
} = {}) {
  const calls = {
    usersUpdates: [],
    signOuts: [],
    verifies: [],
  };

  // getUserById answers in order (before / after the code).
  const accountQueue = [...accounts];

  const missingTable = Promise.resolve({
    data: null,
    error: { code: 'PGRST205', message: 'missing' },
  });

  const otpChain = {
    eq: () => otpChain,
    maybeSingle: () => missingTable,
    then: (resolve, reject) => missingTable.then(resolve, reject),
  };

  return {
    calls,

    supabaseAnon: {
      auth: {
        signInWithPassword: async () =>
          passwordOk
            ? { data: { user: { id: 'u1' } }, error: null }
            : { data: {}, error: { message: 'Invalid login credentials' } },

        verifyOtp: async params => {
          calls.verifies.push(params);

          return codeOk
            ? { data: { user: null, session: null }, error: null }
            : { data: { user: null, session: null }, error: { message: 'Token has expired or is invalid' } };
        },
      },
    },

    supabaseAdmin: {
      auth: {
        admin: {
          getUserById: async () => ({
            data: { user: accountQueue.length > 1 ? accountQueue.shift() : accountQueue[0] },
            error: null,
          }),

          signOut: async (token, scope) => {
            calls.signOuts.push({ token, scope });
            return { error: null };
          },

          updateUserById: async () => ({ error: null }),
        },
      },

      from(table) {
        if (table === 'otp_attempts') {
          return {
            upsert: () => missingTable,
            delete: () => otpChain,
            select: () => otpChain,
          };
        }

        assert.equal(table, 'users');

        const lookup = {
          eq: () => lookup,
          neq: () => lookup,
          maybeSingle: async () => ({ data: null, error: null }),
        };

        return {
          select: () => lookup,

          update(values) {
            calls.usersUpdates.push(values);
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    },
  };
}

function loadController(fake) {
  const configPath = require.resolve('../src/config/supabase');

  const config = new Module(configPath);
  config.filename = configPath;
  config.loaded = true;
  config.exports = fake;
  require.cache[configPath] = config;

  for (const path of [
    '../src/controllers/accountController',
    '../src/services/otpGuardService',
  ]) {
    delete require.cache[require.resolve(path)];
  }

  return require('../src/controllers/accountController');
}

function call(handler, body) {
  const req = {
    dbUser: { id: 'u1', email: OLD_EMAIL, role: 'user' },
    authToken: 'access-token',
    body,
  };

  const res = {
    statusCode: 200,
    body: null,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  return handler(req, res).then(() => res);
}

const requestBody = {
  current_password: 'Old-password1',
  new_email: NEW_EMAIL,
  confirm_email: NEW_EMAIL,
};

const pending = { email: OLD_EMAIL, new_email: NEW_EMAIL };

test('a wrong current password sends no code', async t => {
  t.mock.method(console, 'warn', () => {});
  const fetch = t.mock.method(global, 'fetch', async () => ({ ok: true }));

  const { requestEmailChange } = loadController(fakeSupabase({ passwordOk: false }));
  const res = await call(requestEmailChange, requestBody);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'CURRENT_PASSWORD_INCORRECT');
  assert.equal(fetch.mock.callCount(), 0);
});

test('the request asks Supabase to email a code, then waits 60 seconds', async t => {
  t.mock.method(console, 'warn', () => {});
  const fetch = t.mock.method(global, 'fetch', async () => ({ ok: true }));

  const { requestEmailChange } = loadController(fakeSupabase());

  const res = await call(requestEmailChange, requestBody);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.new_email, NEW_EMAIL);

  const [url, init] = fetch.mock.calls[0].arguments;
  assert.match(url, /\/auth\/v1\/user$/);
  assert.equal(init.method, 'PUT');
  assert.equal(init.headers.Authorization, 'Bearer access-token');
  assert.deepEqual(JSON.parse(init.body), { email: NEW_EMAIL });

  const again = await call(requestEmailChange, requestBody);
  assert.equal(again.statusCode, 429);
  assert.equal(again.body.code, 'OTP_RESEND_COOLDOWN');
  assert.equal(fetch.mock.callCount(), 1);
});

test('a code for a change that is no longer pending is refused', async t => {
  t.mock.method(console, 'warn', () => {});

  const { verifyEmailChange } = loadController(
    fakeSupabase({ accounts: [{ email: OLD_EMAIL, new_email: null }] })
  );

  const res = await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '123456' });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'EMAIL_CHANGE_NOT_PENDING');
});

test('wrong codes count down, then a new code is needed', async t => {
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});

  const fake = fakeSupabase({ codeOk: false, accounts: [pending] });
  const { verifyEmailChange } = loadController(fake);

  const first = await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '111111' });
  assert.equal(first.statusCode, 400);
  assert.equal(first.body.attempts_remaining, 4);

  for (const _ of [2, 3, 4, 5]) {
    await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '111111' });
  }

  const blocked = await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '222222' });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.code, 'OTP_TOO_MANY_ATTEMPTS');

  // The sixth try never reached Supabase.
  assert.equal(fake.calls.verifies.length, 5);
  assert.equal(fake.calls.usersUpdates.length, 0);
});

test('secure email change: after the new address, the current one is asked for', async t => {
  t.mock.method(console, 'warn', () => {});

  const fake = fakeSupabase({ accounts: [pending, pending] });
  const { verifyEmailChange } = loadController(fake);

  const res = await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '123456', target: 'new' });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'confirm_other');
  assert.equal(res.body.next_target, 'current');
  assert.deepEqual(fake.calls.verifies[0], { email: NEW_EMAIL, token: '123456', type: 'email_change' });
  assert.equal(fake.calls.usersUpdates.length, 0);
  assert.equal(fake.calls.signOuts.length, 0);
});

test('the last code changes the email and signs out every session', async t => {
  t.mock.method(console, 'warn', () => {});

  const fake = fakeSupabase({
    accounts: [pending, { email: NEW_EMAIL, new_email: null }],
  });
  const { verifyEmailChange } = loadController(fake);

  const res = await call(verifyEmailChange, { new_email: NEW_EMAIL, code: '654321', target: 'current' });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'changed');
  assert.equal(fake.calls.verifies[0].email, OLD_EMAIL);
  assert.equal(fake.calls.usersUpdates[0].email, NEW_EMAIL);
  assert.deepEqual(fake.calls.signOuts, [{ token: 'access-token', scope: 'global' }]);
});
