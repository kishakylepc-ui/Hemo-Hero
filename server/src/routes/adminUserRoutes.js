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

  deleteAdminUser,
} =
  require(
    '../controllers/adminUserController'
  );

const {
  requireAuth,
  requireAdmin,
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