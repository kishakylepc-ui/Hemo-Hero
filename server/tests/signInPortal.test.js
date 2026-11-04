require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Which app an account may use, and the code on a first sign-in
// (authController.js), against a stand-in for Supabase.
function fakeSupabase({
  account,
  signInError = null,
  verifyError = null,
  resendError = null,
} = {}) {
  const calls = {
    resends: [],
    signOuts: [],
    created: [],
  };

  const ok = data =>
    Promise.resolve({ data, error: null });

  const session = { access_token: 'new-session' };

  const chain = result => {
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      is: () => query,
      order: () => query,
      limit: () => query,
      maybeSingle: () => ok(result),
      single: () => ok(result),
      then: (done, failed) => ok(result).then(done, failed),
    };

    return query;
  };

  return {
    calls,
    supabaseAnon: {
      auth: {
        signInWithPassword: async () =>
          signInError
            ? { data: {}, error: signInError }
            : {
                data: { session, user: { id: account.id } },
                error: null,
              },
        verifyOtp: async () =>
          verifyError
            ? { data: {}, error: verifyError }
            : {
                data: {
                  session,
                  user: { id: account.id, email: account.email },
                },
                error: null,
              },
        resend: async request => {
          calls.resends.push(request);

          return { error: resendError };
        },
      },
    },
    supabaseAdmin: {
      auth: {
        admin: {
          signOut: async (token, scope) => {
            calls.signOuts.push({ token, scope });

            return { error: null };
          },
          createUser: async attributes => {
            calls.created.push(attributes);

            // Enough to see what was asked for; stops there.
            return {
              data: {},
              error: { message: 'stop here' },
            };
          },
        },
      },
      from(table) {
        if (table === 'users') {
          return chain(account);
        }

        return {
          ...chain(null),
          insert: () => ({
            select: () => ({ single: () => ok({}) }),
          }),
          upsert: () => ok(null),
          delete: () => ({ eq: () => ok(null) }),
        };
      },
    },
  };
}

function loadAuth(fake) {
  const configPath = require.resolve('../src/config/supabase');
  const config = new Module(configPath);

  config.filename = configPath;
  config.loaded = true;
  config.exports = fake;
  require.cache[configPath] = config;

  for (const path of [
    '../src/controllers/authController',
    '../src/controllers/adminUserController',
    '../src/services/otpGuardService',
    '../src/middleware/loginRateLimiter',
  ]) {
    delete require.cache[require.resolve(path)];
  }

  return require('../src/controllers/authController');
}

async function call(handler, body) {
  const req = {
    body,
    headers: {},
    resetLoginAttempts() {
      req.attemptsReset = true;
    },
    recordFailedLogin: () => null,
  };

  const res = {
    statusCode: 200,
    body: null,
    locals: {},
    status(code) {
      this.statusCode = code;

      return this;
    },
    json(value) {
      this.body = value;

      return this;
    },
  };

  await handler(req, res);

  res.req = req;

  return res;
}

const member = {
  id: 'member-1',
  email: 'donor@example.com',
  role: 'user',
  is_active: true,
  is_locked: false,
};

const admin = {
  ...member,
  id: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
};

const notConfirmed = { message: 'Email not confirmed' };

test('an admin account gets no session in the user app, and it is logged', async () => {
  const fake = fakeSupabase({ account: admin });

  const res = await call(loadAuth(fake).login, {
    email: admin.email,
    password: 'Secret123!',
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'USE_ADMIN_PORTAL');
  assert.equal(res.body.session, undefined);
  assert.deepEqual(fake.calls.signOuts, [
    { token: 'new-session', scope: 'local' },
  ]);
  assert.equal(res.locals.activityAction, 'UNAUTHORIZED_ACCESS');
});

test('an admin account signs in through the Admin Portal', async () => {
  const fake = fakeSupabase({ account: admin });

  const res = await call(loadAuth(fake).login, {
    email: admin.email,
    password: 'Secret123!',
    portal: 'admin',
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.session.access_token, 'new-session');
  assert.deepEqual(fake.calls.signOuts, []);
});

test('a regular account still signs in to the app, and not the Admin Portal', async () => {
  const fake = fakeSupabase({ account: member });
  const { login } = loadAuth(fake);

  const app = await call(login, {
    email: member.email,
    password: 'Secret123!',
  });

  assert.equal(app.statusCode, 200);

  const portal = await call(login, {
    email: member.email,
    password: 'Secret123!',
    portal: 'admin',
  });

  assert.equal(portal.statusCode, 403);
  assert.equal(portal.body.code, 'ADMIN_REQUIRED');
});

test('a first sign-in emails a code and says which email to verify', async () => {
  const fake = fakeSupabase({
    account: member,
    signInError: notConfirmed,
  });

  const res = await call(loadAuth(fake).login, {
    email: member.email,
    password: 'Secret123!',
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(res.body.email, member.email);
  assert.equal(res.body.code_sent, true);
  assert.equal(res.body.session, undefined);
  assert.equal(fake.calls.resends.length, 1);
  assert.equal(fake.calls.resends[0].type, 'signup');
  assert.equal(res.req.attemptsReset, true);
});

test('signing in again within a minute reuses the code just sent', async () => {
  const fake = fakeSupabase({
    account: member,
    signInError: notConfirmed,
  });

  const { login } = loadAuth(fake);

  await call(login, { email: member.email, password: 'Secret123!' });

  const second = await call(login, {
    email: member.email,
    password: 'Secret123!',
  });

  assert.equal(second.body.code_sent, true);
  assert.equal(fake.calls.resends.length, 1);
});

test('if the code cannot be sent, the sign-in says so', async () => {
  const fake = fakeSupabase({
    account: member,
    signInError: notConfirmed,
    resendError: { message: 'email rate limit exceeded' },
  });

  const res = await call(loadAuth(fake).login, {
    email: member.email,
    password: 'Secret123!',
  });

  assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(res.body.code_sent, false);
});

test('an unverified account sends no code from the wrong app', async () => {
  const fake = fakeSupabase({
    account: admin,
    signInError: notConfirmed,
  });

  const res = await call(loadAuth(fake).login, {
    email: admin.email,
    password: 'Secret123!',
  });

  assert.equal(res.body.code, 'USE_ADMIN_PORTAL');
  assert.equal(fake.calls.resends.length, 0);
});

test('verifying in the Admin Portal signs an admin in', async () => {
  const fake = fakeSupabase({ account: admin });

  const res = await call(loadAuth(fake).verifyEmail, {
    email: admin.email,
    code: '123456',
    portal: 'admin',
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.session.access_token, 'new-session');
});

test('verifying in the wrong app confirms the email but gives no session', async () => {
  const fake = fakeSupabase({ account: admin });

  const res = await call(loadAuth(fake).verifyEmail, {
    email: admin.email,
    code: '123456',
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.session, undefined);
  assert.equal(fake.calls.signOuts.length, 1);
});

test('an account made by an admin needs its email confirmed', async () => {
  const fake = fakeSupabase({ account: null });

  loadAuth(fake);

  const {
    createAdminUser,
  } = require('../src/controllers/adminUserController');

  const res = {
    statusCode: 200,
    locals: {},
    status(code) {
      this.statusCode = code;

      return this;
    },
    json(value) {
      this.body = value;

      return this;
    },
  };

  await createAdminUser(
    {
      headers: {},
      dbUser: { id: 'me', email: 'me@example.com', role: 'admin' },
      body: {
        email: 'new@example.com',
        username: 'newperson',
        password: 'Secret123!',
        confirm_password: 'Secret123!',
        first_name: 'New',
        last_name: 'Person',
        role: 'user',
      },
    },
    res
  );

  assert.equal(fake.calls.created.length, 1, JSON.stringify(res.body));
  assert.equal(fake.calls.created[0].email_confirm, false);
  // What Supabase said stays out of the reply.
  assert.doesNotMatch(res.body.error, /stop here/);
});
