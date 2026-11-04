require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const {
  errorHandler,
} = require('../src/middleware/errorHandler');

// The same setup as server.js, on a real port.
function startApp() {
  const app = express();

  app.use(express.json());

  app.post('/echo', (req, res) => res.json({ ok: true }));

  app.get('/boom', () => {
    throw new Error('secret table name in C:\\server\\src\\file.js');
  });

  app.use(errorHandler);

  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

test('a request with broken JSON gets a plain message, no stack trace', async t => {
  const server = await startApp();

  t.after(() => server.close());

  const res = await fetch(
    `http://127.0.0.1:${server.address().port}/echo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"password":"Secret123!"',
    }
  );

  const text = await res.text();

  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /json/);
  assert.equal(JSON.parse(text).code, 'BAD_REQUEST');
  assert.doesNotMatch(text, /node_modules|\.js|Secret123/);
});

test('a broken request is not logged, because it can hold a password', async t => {
  const server = await startApp();

  t.after(() => server.close());

  const logged = t.mock.method(console, 'error', () => {});

  await fetch(
    `http://127.0.0.1:${server.address().port}/echo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"password":"Secret123!"',
    }
  );

  assert.equal(logged.mock.callCount(), 0);
});

test('an unexpected error stays in the log, not the reply', async t => {
  const server = await startApp();

  t.after(() => server.close());

  const logged = t.mock.method(console, 'error', () => {});

  const res = await fetch(
    `http://127.0.0.1:${server.address().port}/boom`
  );

  const text = await res.text();

  assert.equal(res.status, 500);
  assert.equal(JSON.parse(text).code, 'SERVER_ERROR');
  assert.doesNotMatch(text, /secret table|\.js/);
  assert.equal(logged.mock.callCount(), 1);
});
