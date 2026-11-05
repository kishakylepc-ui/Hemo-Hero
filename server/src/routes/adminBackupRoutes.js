const express =
  require('express');

const multer =
  require('multer');

const router =
  express.Router();

// ============================================================
// CONTROLLER
// ============================================================

const {
  getBackups,
  postBackup,
  getBackupDownload,
  getBackupSqlFile,
  postRestore,
  postRestoreFile,
  removeBackup
} = require(
  '../controllers/adminBackupController'
);

const {
  MAX_BACKUP_FILE_BYTES
} = require(
  '../services/backupService'
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
// GET /api/admin/backups/:id/download-sql
//
// Logged: the file has every user's data.
// ------------------------------------------------------------

router.get(
  '/:id/download-sql',
  activityLog({
    action:
      'DOWNLOAD_BACKUP_SQL',
    module:
      'Backups',
    successDescription:
      'Super admin downloaded a database backup as SQL.',
    failureDescription:
      'Database backup SQL download failed.',
    entityType:
      'data_backup'
  }),
  getBackupSqlFile
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
// POST /api/admin/backups/restore-file
//
// Sent as a form because the JSON body limit is far smaller than
// a backup. The file is only held in memory.
// ------------------------------------------------------------

const backupFileUploader =
  multer({
    storage:
      multer.memoryStorage(),
    limits: {
      fileSize:
        MAX_BACKUP_FILE_BYTES,
      files:
        1
    }
  });

function handleBackupFileUpload(
  req,
  res,
  next
) {
  const middleware =
    backupFileUploader.single(
      'backup'
    );

  middleware(
    req,
    res,
    error => {
      if (!error) {
        return next();
      }

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(413)
          .json({
            error:
              'That file is too large to be a Hemo-Hero backup. Nothing was changed.'
          });
      }

      console.error(
        'BACKUP FILE UPLOAD ERROR:',
        error
      );

      return res
        .status(400)
        .json({
          error:
            'The backup file could not be read. Nothing was changed.'
        });
    }
  );
}

router.post(
  '/restore-file',
  activityLog({
    action:
      'RESTORE_BACKUP_FILE',
    module:
      'Backups',
    successDescription:
      'Super admin restored the database from an uploaded backup file.',
    failureDescription:
      'Restoring the database from an uploaded backup file failed.',
    entityType:
      'data_backup'
  }),
  handleBackupFileUpload,
  postRestoreFile
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
