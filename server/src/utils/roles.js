// ============================================================
// ROLES
//
//   user         mobile app (donors and requesters)
//   admin        admin portal: every module, including the
//                log trail
//   super_admin  everything an admin can do, plus managing
//                admin accounts
// ============================================================

const ADMIN_ROLES = [
  'admin',
  'super_admin'
];

function normalizeRole(
  role
) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

// Can use the admin portal.
function isAdminRole(
  role
) {
  return ADMIN_ROLES.includes(
    normalizeRole(role)
  );
}

function isSuperAdmin(
  role
) {
  return normalizeRole(role) ===
    'super_admin';
}

module.exports = {
  ADMIN_ROLES,
  isAdminRole,
  isSuperAdmin
};
