require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Unauthorized access records (utils/accessLog.js, used by
// authMiddleware.js) and the log trail's date filter.

function fakeModule(path, exports) {
  const module = new Module(path);
  module.filename = path;
  module.loaded = true;
  module.exports = exports;
  require.cache[path] = module;
}

// Fresh copies of the modules, with the log writer and Supabase
// replaced. Returns what was logged.
function load({ getUserError = null, queryCalls = [] } = {}) {
  const logged = [];

  fakeModule(require.resolve('../src/utils/activityLogger'), {
    logActivity: async entry => {
      logged.push(entry);
    },
    getClientIp: req => req.ip || null,
    sanitizeMetadata: value => value,
  });

  // A query builder that remembers its calls.
  const query = {
    select: () => query,
    gte: (...args) => {
      queryCalls.push(['gte', ...args]);
      return query;
    },
    lt: (...args) => {
      queryCalls.push(['lt', ...args]);
      return query;
    },
    eq: () => query,
    ilike: () => query,
    order: () => query,
    range: () => Promise.resolve({ data: [], error: null, count: 0 }),
  };

  fakeModule(require.resolve('../src/config/supabase'), {
    supabaseAnon: {
      auth: {
        getUser: async () =>
          getUserError
            ? { data: {}, error: { message: getUserError } }
            : { data: { user: { id: 'u1' } }, error: null },
      },
    },
    supabaseAdmin: { from: () => query },
  });

  const paths = [
    '../src/utils/accessLog',
    '../src/middleware/authMiddleware',
    '../src/controllers/adminActivityLogController',
  ];

  for (const path of paths) {
    delete require.cache[require.resolve(path)];
  }

  return {
    logged,
    accessLog: require(paths[0]),
    auth: require(paths[1]),
    logs: require(paths[2]),
  };
}

function fakeRes() {
  return {
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
}

test('a user opening an admin-only feature is recorded', () => {
  const { logged, auth } = load();

  const req = {
    ip: '10.0.0.5',
    method: 'GET',
    originalUrl: '/api/admin/users',
    dbUser: { id: 'u1', email: 'donor@example.com', role: 'user' },
  };
  const res = fakeRes();

  auth.requireAdmin(req, res, () => assert.fail('should not pass'));

  assert.equal(res.statusCode, 403);
  assert.equal(logged.length, 1);
  assert.equal(logged[0].action, 'UNAUTHORIZED_ACCESS');
  assert.equal(logged[0].module, 'Access Control');
  assert.equal(logged[0].success, false);
  assert.equal(logged[0].user.email, 'donor@example.com');
  assert.match(logged[0].description, /user role tried to use an admin-only feature/);
  assert.equal(logged[0].metadata.reason_code, 'ADMIN_REQUIRED');
});

test('an admin opening a super-admin-only feature is recorded', () => {
  const { logged, auth } = load();

  const res = fakeRes();
  auth.requireSuperAdmin(
    { method: 'GET', originalUrl: '/api/admin/backups', dbUser: { id: 'a1', role: 'admin' } },
    res,
    () => assert.fail('should not pass')
  );

  assert.equal(res.statusCode, 403);
  assert.equal(logged[0].metadata.reason_code, 'SUPER_ADMIN_REQUIRED');
});

test('no sign-in token, or a bad one, is recorded; an expired one is not', async () => {
  const missing = load();
  await missing.auth.requireAuth(
    { headers: {}, method: 'GET', originalUrl: '/api/admin/users', ip: '1.2.3.4' },
    fakeRes(),
    () => assert.fail('should not pass')
  );
  assert.equal(missing.logged[0].metadata.reason_code, 'AUTH_HEADER_MISSING');

  const forged = load({ getUserError: 'invalid JWT: unable to parse or verify signature' });
  await forged.auth.requireAuth(
    { headers: { authorization: 'Bearer forged' }, method: 'GET', originalUrl: '/api/auth/me' },
    fakeRes(),
    () => assert.fail('should not pass')
  );
  assert.equal(forged.logged[0].metadata.reason_code, 'AUTH_TOKEN_INVALID');

  const expired = load({ getUserError: 'invalid JWT: token has invalid claims: token is expired' });
  const res = fakeRes();
  await expired.auth.requireAuth(
    { headers: { authorization: 'Bearer old' }, method: 'GET', originalUrl: '/api/auth/me' },
    res,
    () => assert.fail('should not pass')
  );
  assert.equal(res.statusCode, 401);
  assert.equal(expired.logged.length, 0);
});

test('the same caller and reason is recorded at most once a minute', t => {
  const { logged, accessLog } = load();

  const req = { ip: '10.0.0.9', method: 'GET', originalUrl: '/api/admin/users?page=2' };
  const entry = { reason: 'Blocked', reasonCode: 'AUTH_HEADER_MISSING', statusCode: 401 };

  accessLog.logUnauthorizedAccess(req, entry);
  accessLog.logUnauthorizedAccess({ ...req, originalUrl: '/api/admin/users?page=3' }, entry);
  assert.equal(logged.length, 1);

  // Another route counts separately.
  accessLog.logUnauthorizedAccess({ ...req, originalUrl: '/api/admin/reports' }, entry);
  assert.equal(logged.length, 2);

  const later = Date.now() + 61 * 1000;
  t.mock.method(Date, 'now', () => later);

  accessLog.logUnauthorizedAccess(req, entry);
  assert.equal(logged.length, 3);
});

test('the log trail filters by date', async () => {
  const queryCalls = [];
  const { logs } = load({ queryCalls });

  const from = '2026-10-21T16:00:00.000Z';
  const to = '2026-10-22T16:00:00.000Z';

  const res = fakeRes();
  await logs.getActivityLogs({ query: { from, to } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(queryCalls, [
    ['gte', 'created_at', from],
    ['lt', 'created_at', to],
  ]);
});

test('bad date filters are refused', async () => {
  const { logs } = load();

  const invalid = fakeRes();
  await logs.getActivityLogs({ query: { from: 'yesterday' } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const backwards = fakeRes();
  await logs.getActivityLogs(
    { query: { from: '2026-10-22T00:00:00Z', to: '2026-10-21T00:00:00Z' } },
    backwards
  );
  assert.equal(backwards.statusCode, 400);
});
