require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  BACKUP_TABLES,
  fileStamp,
  describeRestoreError
} = require('../src/services/backupService');

test('backup file names use Philippine time', () => {
  assert.equal(
    fileStamp(new Date('2026-10-05T08:40:00Z')),
    '2026-10-05_1640'
  );
  assert.equal(
    fileStamp(new Date('2026-12-31T16:05:00Z')),
    '2027-01-01_0005'
  );
});

test('every table the restore replaces is in the backup', () => {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '../database/migrations/20261007_notification_settings_backups.sql'
    ),
    'utf8'
  );

  const list = sql
    .match(/restore_tables text\[\] := ARRAY\[([\s\S]*?)\];/)[1]
    .match(/'([a-z_]+)'/g)
    .map(name => name.slice(1, -1));

  for (const table of [...list, 'users', 'activity_logs']) {
    assert.ok(BACKUP_TABLES.includes(table), table);
  }

  assert.equal(BACKUP_TABLES.length, list.length + 2);
});

test('sign-in data is not in backups', () => {
  for (const table of ['push_tokens', 'login_lockouts', 'data_backups']) {
    assert.equal(BACKUP_TABLES.includes(table), false, table);
  }
});

test('restore errors are explained', () => {
  assert.match(
    describeRestoreError({ code: '23503' }),
    /account that has since been deleted.*Nothing was changed/
  );
  assert.match(
    describeRestoreError({ code: 'XX000', message: 'boom' }),
    /nothing was changed: boom/
  );
});
