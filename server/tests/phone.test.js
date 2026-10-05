require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PHONE_ERROR,
  normalizePhone
} = require('../src/utils/phone');

test('phone is optional', () => {
  assert.deepEqual(normalizePhone(undefined), { valid: true, value: null });
  assert.deepEqual(normalizePhone(null), { valid: true, value: null });
  assert.deepEqual(normalizePhone('   '), { valid: true, value: null });
});

test('common ways of writing a mobile number are saved as 09XXXXXXXXX', () => {
  for (const input of [
    '09171234567',
    '0917 123 4567',
    '0917-123-4567',
    '+63 917 123 4567',
    '+639171234567',
    '63 917 123 4567',
    '(0917) 123-4567',
    '917 123 4567'
  ]) {
    assert.deepEqual(
      normalizePhone(input),
      { valid: true, value: '09171234567' },
      input
    );
  }
});

test('other numbers and text are rejected', () => {
  for (const input of [
    '1234567',
    '0917123456',
    '091712345678',
    '0817 123 4567',
    '(032) 123 4567',
    '0917 123 456a',
    '0917+1234567',
    12345
  ]) {
    assert.deepEqual(
      normalizePhone(input),
      { valid: false, error: PHONE_ERROR },
      String(input)
    );
  }
});
