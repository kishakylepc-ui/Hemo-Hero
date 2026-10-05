// ============================================================
// ROLES
//
//   admin        every Admin Portal module, including the log
//                trail
//   super_admin  everything an admin can do, plus managing
//                admin accounts (create, edit, deactivate,
//                delete)
// ============================================================

// Can sign in to the Admin Portal.
export function isAdminRole(
  role?: string | null
) {
  return (
    role === 'admin' ||
    role === 'super_admin'
  );
}

export function isSuperAdmin(
  role?: string | null
) {
  return role === 'super_admin';
}
