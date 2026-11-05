const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  BackupError,
  listBackups,
  createBackup,
  getDownloadLink,
  getBackupSql,
  deleteBackup,
  restoreBackup,
  restoreBackupFile
} = require(
  '../services/backupService'
);

// ============================================================
// ADMIN: DATABASE BACKUPS (super admin only)
//
// GET    /api/admin/backups               list + summary
// POST   /api/admin/backups               back up now
// GET    /api/admin/backups/:id/download  5-minute download link
// GET    /api/admin/backups/:id/download-sql  { file_name, sql }
// POST   /api/admin/backups/:id/restore   body { confirm: 'RESTORE' }
// POST   /api/admin/backups/restore-file  form: confirm, backup (file)
// DELETE /api/admin/backups/:id
// ============================================================

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBackupId(
  req,
  res
) {
  const id =
    String(
      req.params.id ||
      ''
    ).trim();

  if (
    !UUID_PATTERN.test(
      id
    )
  ) {
    res
      .status(400)
      .json({
        error:
          'Invalid backup ID.'
      });

    return null;
  }

  return id;
}

function sendError(
  res,
  error,
  label,
  fallback
) {
  if (
    error instanceof
    BackupError
  ) {
    return res
      .status(
        error.status
      )
      .json({
        error:
          error.message
      });
  }

  console.error(
    `${label}:`,
    error
  );

  return res
    .status(500)
    .json({
      error:
        fallback
    });
}

async function getBackups(
  req,
  res
) {
  try {
    return res
      .status(200)
      .json(
        await listBackups()
      );
  } catch (error) {
    return sendError(
      res,
      error,
      'LIST BACKUPS ERROR',
      'Unable to load backups.'
    );
  }
}

async function postBackup(
  req,
  res
) {
  try {
    const backup =
      await createBackup({
        kind:
          'manual',

        createdBy:
          req.dbUser.id
      });

    setActivityEntity(
      res,
      'data_backup',
      backup.id
    );

    return res
      .status(201)
      .json({
        message:
          'Backup saved.',

        backup
      });
  } catch (error) {
    return sendError(
      res,
      error,
      'CREATE BACKUP ERROR',
      'Unable to make a backup.'
    );
  }
}

async function getBackupDownload(
  req,
  res
) {
  const id =
    getBackupId(
      req,
      res
    );

  if (!id) {
    return;
  }

  try {
    const link =
      await getDownloadLink(
        id
      );

    setActivityEntity(
      res,
      'data_backup',
      id
    );

    return res
      .status(200)
      .json({
        url:
          link.url,

        file_name:
          link.file_name,

        expires_in_seconds:
          link.expires_in_seconds
      });
  } catch (error) {
    return sendError(
      res,
      error,
      'BACKUP DOWNLOAD ERROR',
      'Unable to download this backup.'
    );
  }
}

async function getBackupSqlFile(
  req,
  res
) {
  const id =
    getBackupId(
      req,
      res
    );

  if (!id) {
    return;
  }

  try {
    const file =
      await getBackupSql(
        id
      );

    setActivityEntity(
      res,
      'data_backup',
      id
    );

    return res
      .status(200)
      .json(file);
  } catch (error) {
    return sendError(
      res,
      error,
      'BACKUP SQL ERROR',
      'Unable to make the SQL file for this backup.'
    );
  }
}

async function postRestore(
  req,
  res
) {
  const id =
    getBackupId(
      req,
      res
    );

  if (!id) {
    return;
  }

  if (
    req.body?.confirm !==
    'RESTORE'
  ) {
    return res
      .status(400)
      .json({
        error:
          'Type RESTORE to confirm.'
      });
  }

  try {
    const result =
      await restoreBackup(
        id,
        req.dbUser.id
      );

    setActivityEntity(
      res,
      'data_backup',
      id
    );

    return res
      .status(200)
      .json({
        message:
          'Backup restored.',

        ...result
      });
  } catch (error) {
    return sendError(
      res,
      error,
      'RESTORE BACKUP ERROR',
      'Unable to restore this backup. Nothing was changed.'
    );
  }
}

async function postRestoreFile(
  req,
  res
) {
  if (
    req.body?.confirm !==
    'RESTORE'
  ) {
    return res
      .status(400)
      .json({
        error:
          'Type RESTORE to confirm.'
      });
  }

  if (!req.file?.buffer) {
    return res
      .status(400)
      .json({
        error:
          'Choose a backup file to restore.'
      });
  }

  try {
    const result =
      await restoreBackupFile(
        req.file.buffer.toString(
          'utf8'
        ),
        req.dbUser.id
      );

    // The file isn't in the list, but this backup, the way to
    // undo the restore, is.
    setActivityEntity(
      res,
      'data_backup',
      result.safety_backup.id
    );

    return res
      .status(200)
      .json({
        message:
          'Backup restored.',

        ...result
      });
  } catch (error) {
    return sendError(
      res,
      error,
      'RESTORE BACKUP FILE ERROR',
      'Unable to restore this file. Nothing was changed.'
    );
  }
}

async function removeBackup(
  req,
  res
) {
  const id =
    getBackupId(
      req,
      res
    );

  if (!id) {
    return;
  }

  try {
    await deleteBackup(
      id
    );

    setActivityEntity(
      res,
      'data_backup',
      id
    );

    return res
      .status(200)
      .json({
        message:
          'Backup deleted.'
      });
  } catch (error) {
    return sendError(
      res,
      error,
      'DELETE BACKUP ERROR',
      'Unable to delete this backup.'
    );
  }
}

module.exports = {
  getBackups,
  postBackup,
  getBackupDownload,
  getBackupSqlFile,
  postRestore,
  postRestoreFile,
  removeBackup
};
