require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Usernames (utils/username.js) and signing in with one
// (middleware/loginIdentifier.js).

// Fresh copies with a stand-in users table.
function load(accounts = []) {
  const configPath = require.resolve('../src/config/supabase');

  const config = new Module(configPath);
  config.filename = configPath;
  config.loaded = true;
  config.exports = {
    supabaseAdmin: {
      from(table) {
        assert.equal(table, 'users');

        return {
          select: () => ({
            eq: (column, value) => ({
              maybeSingle: async () => ({
                data: accounts.find(account => account[column] === value) || null,
                error: null,
              }),
            }),
          }),
        };
      },
    },
  };
  require.cache[configPath] = config;

  for (const path of ['../src/utils/username', '../src/middleware/loginIdentifier']) {
    delete require.cache[require.resolve(path)];
  }

  return {
    ...require('../src/utils/username'),
    ...require('../src/middleware/loginIdentifier'),
  };
}

test('usernames are saved in lowercase, with or without @', () => {
  const { normalizeUsername } = load();

  assert.deepEqual(normalizeUsername(' Juan.DelaCruz '), { valid: true, value: 'juan.delacruz' });
  assert.deepEqual(normalizeUsername('@donor_07'), { valid: true, value: 'donor_07' });
  assert.deepEqual(normalizeUsername('abc'), { valid: true, value: 'abc' });
});

test('usernames that break the rules are refused', () => {
  const { normalizeUsername } = load();

  for (const bad of ['', 'ab', 'a'.repeat(21), '_juan', '.juan', 'juan cruz', 'juan-cruz', 'juan@mail.com', 'ñino', null]) {
    assert.equal(normalizeUsername(bad).valid, false, `should refuse ${JSON.stringify(bad)}`);
  }
});

async function signIn(identifierMiddleware, typed) {
  const req = { body: { email: typed, password: 'x' } };
  let passed = false;

  await identifierMiddleware(req, {}, () => {
    passed = true;
  });

  assert.equal(passed, true);
  return req;
}

test('signing in with a username uses that account\'s email', async () => {
  const { resolveLoginIdentifier } = load([
    { username: 'juan.delacruz', email: 'juan@example.com' },
  ]);

  const byUsername = await signIn(resolveLoginIdentifier, 'Juan.DelaCruz');
  assert.equal(byUsername.body.email, 'juan@example.com');
  assert.equal(byUsername.loginUnknownUsername, undefined);

  const byEmail = await signIn(resolveLoginIdentifier, 'juan@example.com');
  assert.equal(byEmail.body.email, 'juan@example.com');
});

test('an unknown username is flagged for the login controller', async () => {
  const { resolveLoginIdentifier } = load([]);

  const req = await signIn(resolveLoginIdentifier, 'nobody_here');
  assert.equal(req.loginUnknownUsername, true);
  assert.equal(req.body.email, 'nobody_here');
});
