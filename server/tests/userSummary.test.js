require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// The counts on User Management's tabs (adminUserController.js),
// against a stand-in for Supabase.
const accounts = [
  { id: 'u1', email: 'one@example.com', role: 'user', is_active: true },
  { id: 'u2', email: 'two@example.com', role: 'user', is_active: false },
  { id: 'a1', email: 'admin1@example.com', role: 'admin', is_active: true },
  { id: 'a2', email: 'admin2@example.com', role: 'admin', is_active: false, is_locked: true },
];

function loadController() {
  const ok = data =>
    Promise.resolve({ data, error: null });

  const fake = {
    supabaseAnon: {},
    supabaseAdmin: {
      from(table) {
        const rows = table === 'users' ? accounts : [];
        const query = {
          select: () => query,
          in: () => query,
          eq: () => query,
          then: (done, failed) => ok(rows).then(done, failed),
        };

        return query;
      },
    },
  };

  const configPath = require.resolve('../src/config/supabase');
  const config = new Module(configPath);

  config.filename = configPath;
  config.loaded = true;
  config.exports = fake;
  require.cache[configPath] = config;

  for (const path of [
    '../src/controllers/adminUserController',
    '../src/middleware/loginRateLimiter',
  ]) {
    delete require.cache[require.resolve(path)];
  }

  return require('../src/controllers/adminUserController');
}

async function getSummary(role) {
  const { getAdminUserSummary } = loadController();

  const res = {
    body: null,
    status() {
      return this;
    },
    json(value) {
      this.body = value;

      return this;
    },
  };

  await getAdminUserSummary(
    { dbUser: { id: 'me', role } },
    res
  );

  return res.body.summary;
}

test('the Users counts leave admin accounts out', async () => {
  const summary = await getSummary('super_admin');

  assert.equal(summary.total, 2);
  assert.equal(summary.active, 1);
  assert.equal(summary.inactive, 1);
});

test('the super admin gets status counts for admin accounts', async () => {
  const summary = await getSummary('super_admin');

  assert.equal(summary.admins, 2);
  assert.deepEqual(summary.admin_accounts, {
    active: 1,
    inactive: 1,
    locked: 1,
  });
});

test('a regular admin gets no counts for admin accounts', async () => {
  const summary = await getSummary('admin');

  assert.equal(summary.admins, undefined);
  assert.equal(summary.admin_accounts, undefined);
  assert.equal(summary.total, 2);
});
