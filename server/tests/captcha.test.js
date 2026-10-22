require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const servicePath = require.resolve('../src/services/captchaService');
const svgCaptchaPath = require.resolve('svg-captcha');

// Loads a fresh copy of the service. With a fixed answer, the
// picture library is replaced so the test knows the answer.
function loadService(answer = null) {
  delete require.cache[servicePath];
  delete require.cache[svgCaptchaPath];

  if (answer) {
    const fake = new Module(svgCaptchaPath);
    fake.filename = svgCaptchaPath;
    fake.loaded = true;
    fake.exports = {
      create: () => ({ data: '<svg></svg>', text: answer }),
    };

    require.cache[svgCaptchaPath] = fake;
  }

  return require(servicePath);
}

test('a CAPTCHA is an SVG picture with no readable answer in it', () => {
  const { createCaptcha } = loadService();

  const captcha = createCaptcha();

  assert.match(captcha.captcha_id, /^[0-9a-f-]{36}$/);
  assert.match(captcha.svg, /^<svg/);
  assert.doesNotMatch(captcha.svg, /<text/);
  assert.equal(captcha.expires_in_seconds, 300);
});

test('the right answer passes, in any letter case', () => {
  const { createCaptcha, verifyCaptcha } = loadService('Ab3dE');

  const { captcha_id } = createCaptcha();

  assert.equal(verifyCaptcha(captcha_id, ' aB3De '), true);
});

test('each CAPTCHA can be checked only once', () => {
  const { createCaptcha, verifyCaptcha } = loadService('Ab3dE');

  const used = createCaptcha();
  assert.equal(verifyCaptcha(used.captcha_id, 'Ab3dE'), true);
  assert.equal(verifyCaptcha(used.captcha_id, 'Ab3dE'), false);

  const missed = createCaptcha();
  assert.equal(verifyCaptcha(missed.captcha_id, 'wrong'), false);
  assert.equal(verifyCaptcha(missed.captcha_id, 'Ab3dE'), false);
});

test('a CAPTCHA expires after 5 minutes', t => {
  const { createCaptcha, verifyCaptcha } = loadService('Ab3dE');

  const { captcha_id } = createCaptcha();

  const later = Date.now() + 5 * 60 * 1000 + 1;
  t.mock.method(Date, 'now', () => later);

  assert.equal(verifyCaptcha(captcha_id, 'Ab3dE'), false);
});

test('unknown or missing CAPTCHAs fail', () => {
  const { verifyCaptcha } = loadService('Ab3dE');

  assert.equal(verifyCaptcha('not-a-real-id', 'Ab3dE'), false);
  assert.equal(verifyCaptcha(undefined, 'Ab3dE'), false);
  assert.equal(verifyCaptcha('id', undefined), false);
});
