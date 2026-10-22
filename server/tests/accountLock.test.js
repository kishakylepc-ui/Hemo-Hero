require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Lock, unlock and role changes (adminUserController.js) and
// the session check (authMiddleware.js), against a stand-in for
// Supabase.

function fakeSupabase({
  target,
  lockout = null,
} = {}) {
  const calls = {
    updates: [],
    bans: [],
    lockoutDeletes: [],
  };

  const ok = data =>
    Promise.resolve({ data, error: null });

  return {
    calls,

    supabaseAnon: {
      auth: {
        getUser: async () => ({
          data: { user: { id: target.id } },
          error: null,
        }),
      },
    },

    supabaseAdmin: {
      auth: {
        admin: {
          updateUserById: async (id, attributes) => {
            calls.bans.push({ id, ...attributes });
            return { error: null };
          },
        },
      },

      from(table) {
        if (table === 'login_lockouts') {
          return {
            select: () => ({
              in: () => ok(lockout ? [lockout] : []),
              eq: () => ({ maybeSingle: () => ok(lockout) }),
            }),

            delete: () => ({
              eq: (column, value) => {
                calls.lockoutDeletes.push(value);
                return ok(null);
              },
            }),

            upsert: () => ok(null),
          };
        }

        assert.equal(table, 'users');

        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ok(target),
            }),
          }),

          update(values) {
            calls.updates.push(values);

            const chain = {
              eq: () => chain,
              select: () => ({
                single: () => ok({ ...target, ...values }),
              }),
            };

            return chain;
          },
        };
      },
    },
  };
}

function load(fake, modulePath) {
  const configPath = require.resolve('../src/config/supabase');

  const config = new Module(configPath);
  config.filename = configPath;
  config.loaded = true;
  config.exports = fake;
  require.cache[configPath] = config;

  for (const path of [
    modulePath,
    '../src/middleware/loginRateLimiter',
  ]) {
    delete require.cache[require.resolve(path)];
  }

  return require(modulePath);
}

const loadController = fake =>
  load(fake, '../src/controllers/adminUserController');

function call(handler, { role = 'admin', body = {}, id = 'target' } = {}) {
  const req = {
    params: { id },
    body,
    dbUser: { id: 'me', email: 'me@example.com', role },
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

  return Promise.resolve(handler(req, res)).then(() => res);
}

const member = {
  id: 'target',
  email: 'donor@example.com',
  role: 'user',
  is_active: true,
  is_locked: false,
};

test('locking stops sign-in and session renewal, and is logged with the reason', async () => {
  const fake = fakeSupabase({ target: member });
  const { lockAdminUser } = loadController(fake);

  const res = await call(lockAdminUser, { body: { reason: 'Suspicious activity' } });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.is_locked, true);
  assert.equal(fake.calls.updates[0].is_locked, true);
  assert.equal(fake.calls.updates[0].locked_reason, 'Suspicious activity');
  assert.deepEqual(fake.calls.bans, [{ id: 'target', ban_duration: '876000h' }]);
  assert.match(res.locals.activityDescription, /locked donor@example\.com\. Reason: Suspicious activity/);
});

test('an admin cannot lock their own account or an admin account', async () => {
  const own = loadController(fakeSupabase({ target: member }));
  const self = await call(own.lockAdminUser, { id: 'me' });
  assert.equal(self.statusCode, 400);

  const admin = loadController(fakeSupabase({ target: { ...member, role: 'admin' } }));
  const blocked = await call(admin.lockAdminUser);
  assert.equal(blocked.statusCode, 403);

  const bySuperAdmin = await call(admin.lockAdminUser, { role: 'super_admin' });
  assert.equal(bySuperAdmin.statusCode, 200);
});

test('unlocking lifts the lock and clears a wrong-password lockout', async () => {
  const fake = fakeSupabase({
    target: { ...member, is_locked: true, locked_reason: 'Test' },
    lockout: {
      email: 'donor@example.com',
      failed_count: 0,
      lock_level: 1,
      locked_until: new Date(Date.now() + 60000).toISOString(),
      last_failed_at: new Date().toISOString(),
    },
  });
  const { unlockAdminUser } = loadController(fake);

  const res = await call(unlockAdminUser);

  assert.equal(res.statusCode, 200);
  assert.equal(fake.calls.updates[0].is_locked, false);
  assert.deepEqual(fake.calls.bans, [{ id: 'target', ban_duration: 'none' }]);
  assert.deepEqual(fake.calls.lockoutDeletes, ['donor@example.com']);
  assert.match(res.locals.activityDescription, /administrator lock and the sign-in lockout/);
});

test('unlocking an account that is not locked changes nothing', async () => {
  const fake = fakeSupabase({ target: member });
  const { unlockAdminUser } = loadController(fake);

  const res = await call(unlockAdminUser);

  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /not locked/);
  assert.equal(fake.calls.updates.length, 0);
});

test('the super admin can make a user an admin, and it is logged', async () => {
  const fake = fakeSupabase({ target: member });
  const { changeAdminUserRole } = loadController(fake);

  const res = await call(changeAdminUserRole, { role: 'super_admin', body: { role: 'admin' } });

  assert.equal(res.statusCode, 200);
  assert.equal(fake.calls.updates[0].role, 'admin');
  assert.equal(res.body.user.role, 'admin');
  assert.match(res.locals.activityDescription, /from User to Admin/);
});

test('roles: no unknown roles, no own role, no super admin accounts', async () => {
  const users = loadController(fakeSupabase({ target: member }));

  const unknown = await call(users.changeAdminUserRole, { role: 'super_admin', body: { role: 'super_admin' } });
  assert.equal(unknown.statusCode, 400);

  const own = await call(users.changeAdminUserRole, { role: 'super_admin', id: 'me', body: { role: 'user' } });
  assert.equal(own.statusCode, 400);

  const supers = loadController(fakeSupabase({ target: { ...member, role: 'super_admin' } }));
  const superTarget = await call(supers.changeAdminUserRole, { role: 'super_admin', body: { role: 'user' } });
  assert.equal(superTarget.statusCode, 403);
});

test('a locked account\'s current session stops working', async () => {
  const fake = fakeSupabase({ target: { ...member, is_locked: true } });
  const { requireAuth } = load(fake, '../src/middleware/authMiddleware');

  const req = { headers: { authorization: 'Bearer token' } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  let passed = false;
  await requireAuth(req, res, () => {
    passed = true;
  });

  assert.equal(passed, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ACCOUNT_LOCKED');
});
