require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ADMIN_ROLES,
  isAdminRole,
  isSuperAdmin
} = require('../src/utils/roles');

test('admins and the super admin can use the admin portal', () => {
  assert.deepEqual(ADMIN_ROLES, ['admin', 'super_admin']);
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('super_admin'), true);
  assert.equal(isAdminRole(' Admin '), true);
});

test('regular users and missing roles are not admins', () => {
  assert.equal(isAdminRole('user'), false);
  assert.equal(isAdminRole(''), false);
  assert.equal(isAdminRole(null), false);
  assert.equal(isAdminRole(undefined), false);
});

test('only super_admin is the super admin', () => {
  assert.equal(isSuperAdmin('super_admin'), true);
  assert.equal(isSuperAdmin('SUPER_ADMIN'), true);
  assert.equal(isSuperAdmin('admin'), false);
  assert.equal(isSuperAdmin('user'), false);
  assert.equal(isSuperAdmin(null), false);
});
