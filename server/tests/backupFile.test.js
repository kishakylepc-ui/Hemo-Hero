require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const express = require('express');

// Restore from File, through the real route, upload handling and
// checks, against a stand-in for Supabase and sign-in.
const ADMIN_ID = 'admin-1';

function fakeSupabase({ rpcError = null } = {}) {
  const calls = [];

  const ok = data =>
    Promise.resolve({ data, error: null });

  const query = table => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => ok([]),
      maybeSingle: () => ok(null),
      insert: row => {
        calls.push(`insert ${table}`);

        return {
          select: () => ({
            single: () => ok({ id: 'safety-backup', ...row }),
          }),
          then: (done, failed) => ok(null).then(done, failed),
        };
      },
      then: (done, failed) => ok([]).then(done, failed),
    };

    return chain;
  };

  return {
    calls,
    client: {
      from: query,
      rpc: (name, args) => {
        calls.push(`rpc ${name}`);
        calls.payload = args.backup;

        return Promise.resolve(
          rpcError
            ? { data: null, error: rpcError }
            : { data: { users: 1 }, error: null }
        );
      },
      storage: {
        getBucket: () => ok({ name: 'backups' }),
        from: () => ({
          upload: () => {
            calls.push('save safety file');

            return Promise.resolve({ error: null });
          },
        }),
      },
    },
  };
}

function stubModule(request, exports) {
  const resolved = require.resolve(request);
  const stub = new Module(resolved);

  stub.filename = resolved;
  stub.loaded = true;
  stub.exports = exports;
  require.cache[resolved] = stub;
}

// Starts the real router; x-role stands in for the signed-in role.
async function startRoutes(fake) {
  stubModule('../src/config/supabase', {
    supabaseAdmin: fake.client,
  });

  stubModule('../src/middleware/authMiddleware', {
    requireAuth: (req, res, next) => {
      req.dbUser = {
        id: ADMIN_ID,
        email: 'admin@example.com',
        role: req.headers['x-role'] || 'super_admin',
      };

      next();
    },
    requireSuperAdmin: (req, res, next) =>
      req.dbUser.role === 'super_admin'
        ? next()
        : res.status(403).json({ error: 'Super admin only' }),
  });

  for (const request of [
    '../src/routes/adminBackupRoutes',
    '../src/controllers/adminBackupController',
    '../src/services/backupService',
    '../src/middleware/activityLogMiddleware',
    '../src/utils/activityLogger',
  ]) {
    delete require.cache[require.resolve(request)];
  }

  const app = express();

  app.use(express.json());
  app.use(
    '/api/admin/backups',
    require('../src/routes/adminBackupRoutes')
  );

  const server = await new Promise(resolve => {
    const running = app.listen(0, '127.0.0.1', () =>
      resolve(running)
    );
  });

  return {
    url: `http://127.0.0.1:${server.address().port}/api/admin/backups/restore-file`,
    close: () =>
      new Promise(resolve => server.close(resolve)),
  };
}

function goodBackup(change) {
  const {
    BACKUP_TABLES,
  } = require('../src/services/backupService');

  const tables = Object.fromEntries(
    BACKUP_TABLES.map(table => [table, []])
  );

  tables.users = [
    {
      id: ADMIN_ID,
      role: 'super_admin',
      is_active: true,
      is_locked: false,
    },
  ];

  const backup = {
    app: 'hemo-hero',
    format: 1,
    kind: 'manual',
    created_at: '2026-11-04T02:37:05.798Z',
    table_counts: Object.fromEntries(
      Object.entries(tables).map(([table, rows]) => [
        table,
        rows.length,
      ])
    ),
    tables,
  };

  change?.(backup);

  return backup;
}

async function send(
  routes,
  text,
  { confirm = 'RESTORE', role } = {}
) {
  const form = new FormData();

  if (confirm) {
    form.append('confirm', confirm);
  }

  if (text !== null) {
    form.append(
      'backup',
      new Blob([text], { type: 'application/json' }),
      'hemo-hero-backup.json'
    );
  }

  const response = await fetch(routes.url, {
    method: 'POST',
    headers: role ? { 'x-role': role } : {},
    body: form,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function withRoutes(name, options, run) {
  test(name, async () => {
    const fake = fakeSupabase(options);
    const routes = await startRoutes(fake);

    try {
      await run(routes, fake.calls);
    } finally {
      await routes.close();
    }
  });
}

// Never reached the restore, and made no safety backup either.
function assertNothingChanged(calls) {
  assert.equal(calls.includes('rpc restore_backup'), false);
  assert.equal(calls.includes('save safety file'), false);
  assert.equal(calls.includes('insert data_backups'), false);
}

withRoutes(
  'a good file makes a safety backup, then restores',
  {},
  async (routes, calls) => {
    const { status, body } = await send(
      routes,
      JSON.stringify(goodBackup())
    );

    assert.equal(status, 200);
    assert.equal(body.safety_backup.kind, 'before_restore');
    assert.deepEqual(body.restored, { users: 1 });

    assert.ok(
      calls.indexOf('save safety file') <
        calls.indexOf('rpc restore_backup')
    );
    assert.ok(calls.includes('rpc restore_backup'));
    assert.equal(calls.payload.tables.users[0].id, ADMIN_ID);
  }
);

withRoutes(
  'a file saved with a byte order mark is still read',
  {},
  async (routes, calls) => {
    const { status } = await send(
      routes,
      '﻿' + JSON.stringify(goodBackup())
    );

    assert.equal(status, 200);
    assert.ok(calls.includes('rpc restore_backup'));
  }
);

withRoutes(
  'only a super admin can restore a file',
  {},
  async (routes, calls) => {
    const { status } = await send(
      routes,
      JSON.stringify(goodBackup()),
      { role: 'admin' }
    );

    assert.equal(status, 403);
    assertNothingChanged(calls);
  }
);

withRoutes(
  'the RESTORE confirmation and a file are required',
  {},
  async (routes, calls) => {
    const noConfirm = await send(
      routes,
      JSON.stringify(goodBackup()),
      { confirm: 'yes' }
    );

    assert.equal(noConfirm.status, 400);
    assert.match(noConfirm.body.error, /Type RESTORE/);

    const noFile = await send(routes, null);

    assert.equal(noFile.status, 400);
    assert.match(noFile.body.error, /Choose a backup file/);

    assertNothingChanged(calls);
  }
);

withRoutes(
  'a file over the limit is refused',
  {},
  async (routes, calls) => {
    const {
      MAX_BACKUP_FILE_BYTES,
    } = require('../src/services/backupService');

    const { status, body } = await send(
      routes,
      'x'.repeat(MAX_BACKUP_FILE_BYTES + 1)
    );

    assert.equal(status, 413);
    assert.match(body.error, /too large/);
    assertNothingChanged(calls);
  }
);

for (const [name, makeText, message] of [
  [
    'text that is not JSON',
    () => 'not a backup',
    /damaged/,
  ],
  [
    "another app's JSON",
    () => JSON.stringify({ app: 'other', tables: {} }),
    /not a Hemo-Hero backup/,
  ],
  [
    'a different backup format',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.format = 2;
        })
      ),
    /different version/,
  ],
  [
    'a file with no date',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          delete backup.created_at;
        })
      ),
    /no date/,
  ],
  [
    // restore_backup would empty this table.
    'a file missing a table',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          delete backup.tables.blood_requests;
        })
      ),
    /missing part of its data \(blood_requests\)/,
  ],
  [
    'a table that is not a list of rows',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.blood_donations = ['oops'];
        })
      ),
    /missing part of its data \(blood_donations\)/,
  ],
  [
    'rows removed from the file',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.table_counts.blood_requests = 18;
        })
      ),
    /row count/,
  ],
  [
    'a file with no accounts',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.users = [];
          backup.table_counts.users = 0;
        })
      ),
    /no accounts/,
  ],
  [
    'a file that demotes the restorer',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.users[0].role = 'user';
        })
      ),
    /take away your Super Admin access/,
  ],
  [
    'a file that deactivates the restorer',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.users[0].is_active = false;
        })
      ),
    /take away your Super Admin access/,
  ],
  [
    'a file that locks the restorer',
    () =>
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.users[0].is_locked = true;
        })
      ),
    /take away your Super Admin access/,
  ],
]) {
  withRoutes(
    `refused before anything changes: ${name}`,
    {},
    async (routes, calls) => {
      const { status, body } = await send(
        routes,
        makeText()
      );

      assert.equal(status, 422);
      assert.match(body.error, message);
      assertNothingChanged(calls);
    }
  );
}

withRoutes(
  'a file from before the restorer existed is allowed',
  {},
  async (routes, calls) => {
    const { status } = await send(
      routes,
      JSON.stringify(
        goodBackup(backup => {
          backup.tables.users[0].id = 'someone-else';
        })
      )
    );

    assert.equal(status, 200);
    assert.ok(calls.includes('rpc restore_backup'));
  }
);

withRoutes(
  'a failed restore explains that nothing changed',
  { rpcError: { code: '23503', message: 'fk' } },
  async routes => {
    const { status, body } = await send(
      routes,
      JSON.stringify(goodBackup())
    );

    assert.equal(status, 500);
    assert.match(body.error, /Nothing was changed/);
  }
);
