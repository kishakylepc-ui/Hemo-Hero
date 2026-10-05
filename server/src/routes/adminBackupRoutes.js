const express =
  require('express');

const router =
  express.Router();

// ============================================================
// CONTROLLER
// ============================================================

const {
  getBackups,
  postBackup,
  getBackupDownload,
  postRestore,
  removeBackup
} = require(
  '../controllers/adminBackupController'
);

// ============================================================
// AUTHORIZATION
// ============================================================

const {
  requireAuth,
  requireSuperAdmin
} = require(
  '../middleware/authMiddleware'
);

const {
  activityLog
} = require(
  '../middleware/activityLogMiddleware'
);

// ============================================================
// DATABASE BACKUP ROUTES
//
// Every route needs a signed-in super admin. Backups hold
// everyone's personal data.
// ============================================================

router.use(
  requireAuth,
  requireSuperAdmin
);

// ------------------------------------------------------------
// GET /api/admin/backups (read-only, not logged)
// ------------------------------------------------------------

router.get(
  '/',
  getBackups
);

// ------------------------------------------------------------
// POST /api/admin/backups
// ------------------------------------------------------------

router.post(
  '/',
  activityLog({
    action:
      'CREATE_BACKUP',
    module:
      'Backups',
    successDescription:
      'Super admin made a database backup.',
    failureDescription:
      'Database backup attempt failed.',
    entityType:
      'data_backup'
  }),
  postBackup
);

// ------------------------------------------------------------
// GET /api/admin/backups/:id/download
//
// Logged: the file has every user's data.
// ------------------------------------------------------------

router.get(
  '/:id/download',
  activityLog({
    action:
      'DOWNLOAD_BACKUP',
    module:
      'Backups',
    successDescription:
      'Super admin downloaded a database backup.',
    failureDescription:
      'Database backup download failed.',
    entityType:
      'data_backup'
  }),
  getBackupDownload
);

// ------------------------------------------------------------
// POST /api/admin/backups/:id/restore
// ------------------------------------------------------------

router.post(
  '/:id/restore',
  activityLog({
    action:
      'RESTORE_BACKUP',
    module:
      'Backups',
    successDescription:
      'Super admin restored a database backup.',
    failureDescription:
      'Database restore attempt failed.',
    entityType:
      'data_backup'
  }),
  postRestore
);

// ------------------------------------------------------------
// DELETE /api/admin/backups/:id
// ------------------------------------------------------------

router.delete(
  '/:id',
  activityLog({
    action:
      'DELETE_BACKUP',
    module:
      'Backups',
    successDescription:
      'Super admin deleted a database backup.',
    failureDescription:
      'Database backup delete failed.',
    entityType:
      'data_backup'
  }),
  removeBackup
);

module.exports =
  router;
