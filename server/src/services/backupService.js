const crypto = require('crypto');

const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// DATABASE BACKUPS
//
// A backup is one JSON file with every row of the app's tables,
// saved in the private "backups" storage bucket and listed in
// the data_backups table (migration 20261007).
//
// - The super admin can back up now, download, delete and
//   restore (Admin Portal → Settings → Backups).
// - The server makes an automatic backup once a day and keeps
//   the newest 7 automatic ones.
// - A restore first makes a "before restore" backup, then puts
//   the chosen backup back in one database transaction
//   (restore_backup function), so a failed restore changes
//   nothing.
//
// Photos and ID images stay in Supabase Storage; push tokens,
// login lockouts and the backup list aren't backed up.
// ============================================================

const BUCKET =
  'backups';

const BACKUP_FORMAT =
  1;

// Saved in this order (parents first).
const BACKUP_TABLES = [
  'users',
  'facility_locations',
  'donor_applications',
  'notification_preferences',
  'blood_requests',
  'blood_request_responses',
  'blood_request_invitations',
  'blood_request_coordination_schedules',
  'blood_request_coordination_messages',
  'blood_request_trips',
  'blood_donations',
  'donation_feedback',
  'user_reports',
  'notifications',
  'activity_logs'
];

// Tables whose key isn't "id".
const TABLE_KEYS = {
  notification_preferences:
    'user_id'
};

const PAGE_SIZE =
  1000;

const KEEP_AUTOMATIC =
  7;

const AUTOMATIC_EVERY_MS =
  24 * 60 * 60 * 1000;

const CHECK_EVERY_MS =
  60 * 60 * 1000;

const FIRST_CHECK_DELAY_MS =
  2 * 60 * 1000;

const DOWNLOAD_LINK_SECONDS =
  5 * 60;

const NOT_SET_UP_MESSAGE =
  'Backups are not set up yet. Run migration 20261007_notification_settings_backups.sql in Supabase.';

// An error with the HTTP status to send.
class BackupError extends Error {
  constructor(
    message,
    status = 500
  ) {
    super(message);

    this.status =
      status;
  }
}

// One backup or restore at a time.
let busy =
  null;

function isMissingTable(
  error
) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  );
}

// "2026-10-05_1640" in Philippine time.
function fileStamp(
  date
) {
  const parts =
    Object.fromEntries(
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }
      )
        .formatToParts(
          date
        )
        .map(
          part => [
            part.type,
            part.value
          ]
        )
    );

  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}${parts.minute}`;
}

function downloadName(
  backup
) {
  return `hemo-hero-backup-${fileStamp(
    new Date(
      backup.created_at
    )
  )}.json`;
}

// ============================================================
// STORAGE
// ============================================================

let bucketReady =
  null;

function ensureBucket() {
  if (!bucketReady) {
    bucketReady =
      (async () => {
        const {
          data
        } =
          await supabaseAdmin
            .storage
            .getBucket(
              BUCKET
            );

        if (data) {
          return;
        }

        const {
          error
        } =
          await supabaseAdmin
            .storage
            .createBucket(
              BUCKET,
              {
                public:
                  false
              }
            );

        if (
          error &&
          !/already exists/i.test(
            error.message ||
              ''
          )
        ) {
          throw error;
        }
      })().catch(
        error => {
          bucketReady =
            null;

          throw error;
        }
      );
  }

  return bucketReady;
}

async function removeFile(
  filePath
) {
  const {
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        BUCKET
      )
      .remove([
        filePath
      ]);

  if (error) {
    console.error(
      'BACKUP FILE DELETE ERROR:',
      error.message ||
        error
    );
  }
}

// ============================================================
// BACKUP LIST
// ============================================================

async function assertSetUp() {
  const {
    error
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .select(
        'id'
      )
      .limit(1);

  if (error) {
    if (isMissingTable(error)) {
      throw new BackupError(
        NOT_SET_UP_MESSAGE,
        503
      );
    }

    throw error;
  }
}

async function getBackupRow(
  backupId
) {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .select('*')
      .eq(
        'id',
        backupId
      )
      .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      throw new BackupError(
        NOT_SET_UP_MESSAGE,
        503
      );
    }

    throw error;
  }

  if (!data) {
    throw new BackupError(
      'Backup not found.',
      404
    );
  }

  return data;
}

function personName(
  person
) {
  if (!person) {
    return null;
  }

  return (
    [
      person.first_name,
      person.last_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    person.email ||
    null
  );
}

async function listBackups() {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .select(`
        *,
        creator:users!data_backups_created_by_fkey (
          first_name,
          last_name,
          email
        ),
        restorer:users!data_backups_restored_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )
      .limit(100);

  if (error) {
    if (isMissingTable(error)) {
      throw new BackupError(
        NOT_SET_UP_MESSAGE,
        503
      );
    }

    throw error;
  }

  const backups =
    (data || []).map(
      ({
        creator,
        restorer,
        ...row
      }) => ({
        ...row,

        created_by_name:
          personName(
            creator
          ),

        restored_by_name:
          personName(
            restorer
          ),

        download_name:
          downloadName(
            row
          )
      })
    );

  const latestAutomatic =
    backups.find(
      row =>
        row.kind ===
        'automatic'
    );

  return {
    backups,

    summary: {
      total:
        backups.length,

      total_size_bytes:
        backups.reduce(
          (sum, row) =>
            sum +
            Number(
              row.size_bytes ||
                0
            ),
          0
        ),

      latest_at:
        backups[0]
          ?.created_at ||
        null,

      // Checked every hour; made when the last one is a day old.
      next_automatic_at:
        latestAutomatic
          ? new Date(
              Date.parse(
                latestAutomatic.created_at
              ) +
                AUTOMATIC_EVERY_MS
            ).toISOString()
          : null,

      automatic_kept:
        KEEP_AUTOMATIC
    }
  };
}

// ============================================================
// MAKE A BACKUP
// ============================================================

async function readTable(
  table
) {
  const key =
    TABLE_KEYS[table] ||
    'id';

  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          table
        )
        .select('*')
        .order(
          key,
          {
            ascending:
              true
          }
        )
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );

    if (error) {
      throw new Error(
        `Could not read ${table}: ${error.message}`
      );
    }

    rows.push(
      ...(data || [])
    );

    if (
      !data ||
      data.length <
        PAGE_SIZE
    ) {
      return rows;
    }
  }
}

async function writeBackup({
  kind,
  createdBy
}) {
  await assertSetUp();
  await ensureBucket();

  const createdAt =
    new Date();

  const tables = {};
  const tableCounts = {};

  for (const table of BACKUP_TABLES) {
    tables[table] =
      await readTable(
        table
      );

    tableCounts[table] =
      tables[table].length;
  }

  const totalRows =
    Object.values(
      tableCounts
    ).reduce(
      (sum, count) =>
        sum + count,
      0
    );

  const json =
    JSON.stringify({
      app:
        'hemo-hero',

      format:
        BACKUP_FORMAT,

      kind,

      created_at:
        createdAt.toISOString(),

      table_counts:
        tableCounts,

      tables
    });

  const filePath =
    `${fileStamp(createdAt)}-${kind}-${crypto
      .randomBytes(3)
      .toString('hex')}.json`;

  const {
    error: uploadError
  } =
    await supabaseAdmin
      .storage
      .from(
        BUCKET
      )
      .upload(
        filePath,
        Buffer.from(
          json,
          'utf8'
        ),
        {
          contentType:
            'application/json',

          upsert:
            false
        }
      );

  if (uploadError) {
    throw new Error(
      `Could not save the backup file: ${uploadError.message}`
    );
  }

  const {
    data: row,
    error: insertError
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .insert({
        file_path:
          filePath,

        kind,

        size_bytes:
          Buffer.byteLength(
            json,
            'utf8'
          ),

        table_counts:
          tableCounts,

        total_rows:
          totalRows,

        created_by:
          createdBy ||
          null,

        created_at:
          createdAt.toISOString()
      })
      .select('*')
      .single();

  if (insertError) {
    await removeFile(
      filePath
    );

    throw insertError;
  }

  return row;
}

async function runExclusive(
  task,
  work
) {
  if (busy) {
    throw new BackupError(
      busy === 'restore'
        ? 'A restore is running. Try again in a minute.'
        : 'A backup is being made. Try again in a minute.',
      409
    );
  }

  busy =
    task;

  try {
    return await work();
  } finally {
    busy =
      null;
  }
}

function createBackup({
  kind = 'manual',
  createdBy = null
} = {}) {
  return runExclusive(
    'backup',
    async () => {
      const row =
        await writeBackup({
          kind,
          createdBy
        });

      if (
        kind ===
        'automatic'
      ) {
        await pruneAutomaticBackups();
      }

      return row;
    }
  );
}

// Keeps the newest KEEP_AUTOMATIC automatic backups.
async function pruneAutomaticBackups() {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .select(
        'id,file_path'
      )
      .eq(
        'kind',
        'automatic'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )
      .range(
        KEEP_AUTOMATIC,
        KEEP_AUTOMATIC + 99
      );

  if (error) {
    console.error(
      'BACKUP PRUNE ERROR:',
      error.message ||
        error
    );

    return;
  }

  for (const old of data || []) {
    await removeFile(
      old.file_path
    );

    await supabaseAdmin
      .from(
        'data_backups'
      )
      .delete()
      .eq(
        'id',
        old.id
      );
  }
}

// ============================================================
// DOWNLOAD / DELETE
// ============================================================

async function getDownloadLink(
  backupId
) {
  const backup =
    await getBackupRow(
      backupId
    );

  const {
    data,
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        BUCKET
      )
      .createSignedUrl(
        backup.file_path,
        DOWNLOAD_LINK_SECONDS,
        {
          download:
            downloadName(
              backup
            )
        }
      );

  if (error) {
    throw new Error(
      `Could not create the download link: ${error.message}`
    );
  }

  return {
    backup,

    url:
      data.signedUrl,

    file_name:
      downloadName(
        backup
      ),

    expires_in_seconds:
      DOWNLOAD_LINK_SECONDS
  };
}

async function deleteBackup(
  backupId
) {
  const backup =
    await getBackupRow(
      backupId
    );

  if (busy) {
    throw new BackupError(
      'Wait for the current backup or restore to finish.',
      409
    );
  }

  await removeFile(
    backup.file_path
  );

  const {
    error
  } =
    await supabaseAdmin
      .from(
        'data_backups'
      )
      .delete()
      .eq(
        'id',
        backup.id
      );

  if (error) {
    throw error;
  }

  return backup;
}

// ============================================================
// RESTORE
// ============================================================

async function readBackupFile(
  backup
) {
  const {
    data,
    error
  } =
    await supabaseAdmin
      .storage
      .from(
        BUCKET
      )
      .download(
        backup.file_path
      );

  if (error || !data) {
    throw new BackupError(
      'The backup file could not be read from storage.',
      404
    );
  }

  let payload;

  try {
    payload =
      JSON.parse(
        await data.text()
      );
  } catch {
    throw new BackupError(
      'The backup file is damaged and cannot be restored.',
      422
    );
  }

  if (
    payload?.app !==
      'hemo-hero' ||
    !payload.tables ||
    typeof payload.tables !==
      'object'
  ) {
    throw new BackupError(
      'This file is not a Hemo-Hero backup.',
      422
    );
  }

  return payload;
}

function describeRestoreError(
  error
) {
  // Foreign key: a row points at something that no longer
  // exists (usually a deleted sign-in account).
  if (
    error?.code ===
    '23503'
  ) {
    return 'This backup has data for an account that has since been deleted, so it cannot be restored. Nothing was changed.';
  }

  // A column the backup doesn't have (made before a migration).
  if (
    error?.code ===
    '23502'
  ) {
    return 'This backup was made before a database update and is missing required information. Nothing was changed.';
  }

  return `The restore failed and nothing was changed: ${error?.message || 'unknown error'}`;
}

function restoreBackup(
  backupId,
  restoredBy
) {
  return runExclusive(
    'restore',
    async () => {
      const backup =
        await getBackupRow(
          backupId
        );

      const payload =
        await readBackupFile(
          backup
        );

      // So this restore can be undone.
      const safetyBackup =
        await writeBackup({
          kind:
            'before_restore',

          createdBy:
            restoredBy
        });

      const {
        data: restored,
        error
      } =
        await supabaseAdmin
          .rpc(
            'restore_backup',
            {
              backup:
                payload
            }
          );

      if (error) {
        console.error(
          'RESTORE BACKUP ERROR:',
          error
        );

        throw new BackupError(
          describeRestoreError(
            error
          ),
          isMissingTable(error) ||
          error.code ===
            'PGRST202'
            ? 503
            : 500
        );
      }

      const restoredAt =
        new Date()
          .toISOString();

      await supabaseAdmin
        .from(
          'data_backups'
        )
        .update({
          restored_at:
            restoredAt,

          restored_by:
            restoredBy ||
            null
        })
        .eq(
          'id',
          backup.id
        );

      return {
        backup: {
          ...backup,

          restored_at:
            restoredAt,

          restored_by:
            restoredBy ||
            null
        },

        restored:
          restored ||
          {},

        safety_backup:
          safetyBackup
      };
    }
  );
}

// ============================================================
// AUTOMATIC DAILY BACKUP
// ============================================================

let warnedNotSetUp =
  false;

async function runAutomaticBackup() {
  if (busy) {
    return null;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'data_backups'
        )
        .select(
          'created_at'
        )
        .eq(
          'kind',
          'automatic'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(1);

    if (error) {
      if (isMissingTable(error)) {
        if (!warnedNotSetUp) {
          console.warn(
            'Automatic backups are off until migration 20261007 is run.'
          );

          warnedNotSetUp =
            true;
        }

        return null;
      }

      throw error;
    }

    const last =
      data?.[0]
        ? Date.parse(
            data[0].created_at
          )
        : 0;

    if (
      Date.now() - last <
      AUTOMATIC_EVERY_MS
    ) {
      return null;
    }

    const row =
      await createBackup({
        kind:
          'automatic'
      });

    console.log(
      `Automatic backup saved (${row.total_rows} rows).`
    );

    return row;
  } catch (error) {
    console.error(
      'AUTOMATIC BACKUP ERROR:',
      error.message ||
        error
    );

    return null;
  }
}

function startAutomaticBackups() {
  const first =
    setTimeout(
      runAutomaticBackup,
      FIRST_CHECK_DELAY_MS
    );

  const repeat =
    setInterval(
      runAutomaticBackup,
      CHECK_EVERY_MS
    );

  // Don't keep the process alive just for backups.
  first.unref?.();
  repeat.unref?.();
}

module.exports = {
  BACKUP_TABLES,
  BackupError,
  fileStamp,
  describeRestoreError,
  listBackups,
  createBackup,
  getDownloadLink,
  deleteBackup,
  restoreBackup,
  runAutomaticBackup,
  startAutomaticBackups
};
