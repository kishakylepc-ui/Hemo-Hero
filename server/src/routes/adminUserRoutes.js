const express =
  require('express');

const {
  getAdminUserSummary,
  getAdminUsers,
  getAdminUserById,

  createAdminUser,
  updateAdminUser,

  deactivateAdminUser,
  activateAdminUser,
  declineAccountReview,

  lockAdminUser,
  unlockAdminUser,
  changeAdminUserRole,

  deleteAdminUser,
} =
  require(
    '../controllers/adminUserController'
  );

const {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  activityLog,
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const router =
  express.Router();

// ============================================================
// ADMIN PROTECTION
//
// Every route below requires:
//
// 1. Valid authenticated session
// 2. Active public.users account
// 3. role === "admin"
// ============================================================

router.use(
  requireAuth,
  requireAdmin
);

// ============================================================
// USER SUMMARY
//
// GET /api/admin/users/summary
//
// Keep BEFORE /:id
// ============================================================

router.get(
  '/summary',
  getAdminUserSummary
);

// ============================================================
// USER LIST
//
// GET /api/admin/users
//
// Query examples:
//
// ?page=1
// ?limit=20
// ?search=kisha
// ?status=active
// ============================================================

router.get(
  '/',
  getAdminUsers
);

// ============================================================
// CREATE USER
//
// POST /api/admin/users
//
// LOG:
// ADMIN_CREATE_USER
// ============================================================

router.post(
  '/',

  activityLog({
    action:
      'ADMIN_CREATE_USER',

    module:
      'User Management',

    successDescription:
      'Administrator created a user account.',

    failureDescription:
      'Administrator attempt to create a user account failed.',

    entityType:
      'user_account',
  }),

  createAdminUser
);

// ============================================================
// DEACTIVATE USER
//
// PATCH /api/admin/users/:id/deactivate
//
// Keep BEFORE /:id.
// ============================================================

router.patch(
  '/:id/deactivate',

  activityLog({
    action:
      'ADMIN_DEACTIVATE_USER',

    module:
      'User Management',

    successDescription:
      'Administrator deactivated a user account.',

    failureDescription:
      'Administrator attempt to deactivate a user account failed.',

    entityType:
      'user_account',
  }),

  deactivateAdminUser
);

// ============================================================
// ACTIVATE USER
//
// PATCH /api/admin/users/:id/activate
//
// Keep BEFORE /:id.
// ============================================================

router.patch(
  '/:id/activate',

  activityLog({
    action:
      'ADMIN_ACTIVATE_USER',

    module:
      'User Management',

    successDescription:
      'Administrator activated a user account.',

    failureDescription:
      'Administrator attempt to activate a user account failed.',

    entityType:
      'user_account',
  }),

  activateAdminUser
);

// ============================================================
// DECLINE AN ACCOUNT REVIEW
//
// PATCH /api/admin/users/:id/review/decline
//
// (Reactivating the account approves it.) Keep BEFORE /:id.
// ============================================================

router.patch(
  '/:id/review/decline',

  activityLog({
    action:
      'ADMIN_DECLINE_ACCOUNT_REVIEW',

    module:
      'User Management',

    successDescription:
      'Administrator declined an account review request.',

    failureDescription:
      'Administrator attempt to decline an account review request failed.',

    entityType:
      'user_account',
  }),

  declineAccountReview
);

// ============================================================
// LOCK / UNLOCK
//
// PATCH /api/admin/users/:id/lock    { reason? }
// PATCH /api/admin/users/:id/unlock
//
// Locked accounts can't sign in until unlocked. Unlock also
// clears a sign-in lockout from wrong passwords.
// Keep BEFORE /:id.
// ============================================================

router.patch(
  '/:id/lock',

  activityLog({
    action:
      'ADMIN_LOCK_USER',

    module:
      'User Management',

    successDescription:
      'Administrator locked a user account.',

    failureDescription:
      'Administrator attempt to lock a user account failed.',

    entityType:
      'user_account',
  }),

  lockAdminUser
);

router.patch(
  '/:id/unlock',

  activityLog({
    action:
      'ADMIN_UNLOCK_USER',

    module:
      'User Management',

    successDescription:
      'Administrator unlocked a user account.',

    failureDescription:
      'Administrator attempt to unlock a user account failed.',

    entityType:
      'user_account',
  }),

  unlockAdminUser
);

// ============================================================
// CHANGE ROLE
//
// PATCH /api/admin/users/:id/role  { role: 'user' | 'admin' }
//
// SUPER ADMIN ONLY. Keep BEFORE /:id.
// ============================================================

router.patch(
  '/:id/role',

  activityLog({
    action:
      'ADMIN_CHANGE_ROLE',

    module:
      'User Management',

    successDescription:
      'Super admin changed a user\'s role.',

    failureDescription:
      'Attempt to change a user\'s role failed.',

    entityType:
      'user_account',

    metadata: ({
      req,
    }) => ({
      requested_role:
        req.body?.role ??
        null,
    }),
  }),

  requireSuperAdmin,

  changeAdminUserRole
);

// ============================================================
// UPDATE USER
//
// PATCH /api/admin/users/:id
//
// This edits normal user profile/account information.
// ============================================================

router.patch(
  '/:id',

  activityLog({
    action:
      'ADMIN_UPDATE_USER',

    module:
      'User Management',

    successDescription:
      'Administrator updated a user account.',

    failureDescription:
      'Administrator attempt to update a user account failed.',

    entityType:
      'user_account',
  }),

  updateAdminUser
);

// ============================================================
// PERMANENTLY DELETE USER
//
// DELETE /api/admin/users/:id
//
// This removes both:
//
// - public.users account data
// - Supabase Auth user
//
// Existing database FK rules handle dependent records.
// ============================================================

router.delete(
  '/:id',

  activityLog({
    action:
      'ADMIN_DELETE_USER',

    module:
      'User Management',

    successDescription:
      'Administrator permanently deleted a user account.',

    failureDescription:
      'Administrator attempt to permanently delete a user account failed.',

    entityType:
      'user_account',
  }),

  deleteAdminUser
);

// ============================================================
// USER DETAILS
//
// GET /api/admin/users/:id
//
// Keep LAST so "summary", "activate", and "deactivate"
// are resolved through their specific routes first.
// ============================================================

router.get(
  '/:id',
  getAdminUserById
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;