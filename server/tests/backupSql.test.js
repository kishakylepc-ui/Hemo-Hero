require('./setup');

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const fs = require('fs');
const path = require('path');
const express = require('express');

const {
  ARRAY_COLUMNS,
  BACKUP_TABLES,
  buildBackupSql,
} = require('../src/services/backupService');

const BACKUP_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'manual',
  file_path: 'backup.json',
  created_at: '2026-11-04T02:37:05.798Z',
};

function sqlFor(tables) {
  return buildBackupSql(
    { tables },
    BACKUP_ROW
  );
}

test('text typed by users cannot be read as SQL', () => {
  const sql = sqlFor({
    users: [
      { id: 'a', first_name: "O'Brien" },
      { id: 'b', first_name: "'); DROP TABLE public.users; --" },
      { id: 'c', first_name: 'back\\slash' },
      { id: 'd', first_name: "both\\'" },
    ],
  });

  assert.match(sql, /\('a', 'O''Brien'\)/);
  assert.ok(
    sql.includes("('b', '''); DROP TABLE public.users; --')")
  );
  assert.ok(sql.includes("('c', E'back\\\\slash')"));
  assert.ok(sql.includes("('d', E'both\\\\''')"));
});

test('values are written for their column type', () => {
  const sql = sqlFor({
    blood_donations: [
      {
        id: 'a',
        units: 1,
        lat: 14.65,
        done: true,
        missing: null,
        previous_donor_history: { said: "it's" },
        review_reasons: ['late', "O'Brien"],
      },
      {
        id: 'b',
        units: 0,
        lat: -1.5,
        done: false,
        missing: null,
        previous_donor_history: null,
        review_reasons: [],
      },
    ],
    notifications: [{ id: 'c', data: [1, 2] }],
  });

  assert.ok(
    sql.includes(
      `('a', 1, 14.65, true, NULL, '{"said":"it''s"}', ARRAY['late', 'O''Brien']::text[])`
    )
  );
  assert.ok(
    sql.includes(
      "('b', 0, -1.5, false, NULL, NULL, ARRAY[]::text[])"
    )
  );

  // A list in a jsonb column stays JSON.
  assert.ok(sql.includes("('c', '[1,2]')"));
});

test('it does what the restore does, in one transaction', () => {
  const sql = sqlFor({
    users: [{ id: 'u', first_name: 'A' }],
    blood_requests: [{ id: 'r' }],
    notifications: [{ id: 'n' }],
    activity_logs: [{ id: 'l' }],
  });

  const statements = sql
    .split('\n')
    .filter(line =>
      /^(BEGIN|COMMIT|DELETE|INSERT)/.test(line)
    )
    .map(line => line.split(' (')[0]);

  const restored = BACKUP_TABLES.filter(
    table =>
      table !== 'users' && table !== 'activity_logs'
  );

  assert.deepEqual(
    statements.filter(line => line.startsWith('DELETE')),
    [...restored]
      .reverse()
      .map(table => `DELETE FROM public.${table};`),
    'children are emptied first; accounts and logs never are'
  );

  assert.deepEqual(
    statements.filter(line => !line.startsWith('DELETE')),
    [
      'BEGIN;',
      'INSERT INTO public.users',
      'INSERT INTO public.blood_requests',
      'INSERT INTO public.notifications',
      'INSERT INTO public.activity_logs',
      'COMMIT;',
    ],
    'parents go back first'
  );

  assert.match(
    sql,
    /ON CONFLICT \("id"\) DO UPDATE SET\n {2}"first_name" = EXCLUDED\."first_name";/
  );
  assert.match(sql, /ON CONFLICT \("id"\) DO NOTHING;/);
});

test('empty and missing tables still get emptied', () => {
  const sql = sqlFor({ users: [{ id: 'u' }] });

  assert.match(sql, /-- blood_requests: no rows/);
  assert.match(sql, /DELETE FROM public\.blood_requests;/);
  assert.equal(
    sql.includes('INSERT INTO public.blood_requests'),
    false
  );
});

test('the file says what it is, in Philippine time', () => {
  const sql = sqlFor({
    users: [{ id: 'u' }],
    blood_requests: [{ id: 'r' }],
  });

  assert.match(sql, /^-- Hemo-Hero database backup\n/);
  assert.match(sql, /-- Made: 2026-11-04 10:37 Philippine time\n/);
  assert.match(sql, /-- Rows: 2 in 15 tables\n/);
  assert.match(sql, /personal data/);
});

test('every Postgres list column is known', () => {
  const folder = path.join(
    __dirname,
    '../database/migrations'
  );

  const known = Object.values(ARRAY_COLUMNS).flatMap(
    columns => Object.keys(columns)
  );

  for (const file of fs.readdirSync(folder)) {
    const sql = fs.readFileSync(
      path.join(folder, file),
      'utf8'
    );

    for (const [, column] of sql.matchAll(
      // Not "name text[] := ...", a variable inside a function.
      /(?:ADD COLUMN IF NOT EXISTS |^\s*)([a-z_]+)\s+[a-z]+\[\](?!\s*:=)/gm
    )) {
      assert.ok(known.includes(column), `${file}: ${column}`);
    }
  }
});

// The route, against a stand-in for Supabase and sign-in.
function stubModule(request, exports) {
  const resolved = require.resolve(request);
  const stub = new Module(resolved);

  stub.filename = resolved;
  stub.loaded = true;
  stub.exports = exports;
  require.cache[resolved] = stub;
}

async function startRoutes({ row = BACKUP_ROW, file } = {}) {
  const ok = data =>
    Promise.resolve({ data, error: null });

  const query = () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => ok(row),
      insert: () => ok(null),
      then: (done, failed) => ok([]).then(done, failed),
    };

    return chain;
  };

  stubModule('../src/config/supabase', {
    supabaseAdmin: {
      from: query,
      storage: {
        from: () => ({
          download: () =>
            Promise.resolve(
              file === undefined
                ? {
                    data: new Blob([
                      JSON.stringify({
                        app: 'hemo-hero',
                        format: 1,
                        tables: {
                          users: [
                            { id: 'u', first_name: "O'Brien" },
                          ],
                        },
                      }),
                    ]),
                    error: null,
                  }
                : file
            ),
        }),
      },
    },
  });

  stubModule('../src/middleware/authMiddleware', {
    requireAuth: (req, res, next) => {
      req.dbUser = {
        id: 'admin-1',
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
    get: (id = BACKUP_ROW.id, headers = {}) =>
      fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/backups/${id}/download-sql`,
        { headers }
      ),
    close: () =>
      new Promise(resolve => server.close(resolve)),
  };
}

test('the route sends a named .sql file from the stored backup', async () => {
  const routes = await startRoutes();

  try {
    const response = await routes.get();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(
      body.file_name,
      'hemo-hero-backup-2026-11-04_1037.sql'
    );
    assert.ok(body.sql.includes("('u', 'O''Brien')"));
  } finally {
    await routes.close();
  }
});

test('only a super admin can get the SQL file', async () => {
  const routes = await startRoutes();

  try {
    const response = await routes.get(BACKUP_ROW.id, {
      'x-role': 'admin',
    });

    assert.equal(response.status, 403);
    assert.equal(
      (await response.json()).sql,
      undefined
    );
  } finally {
    await routes.close();
  }
});

test('a bad ID, or a backup that is gone, gets an error', async () => {
  const badId = await startRoutes();

  try {
    assert.equal((await badId.get('nope')).status, 400);
  } finally {
    await badId.close();
  }

  const noRow = await startRoutes({ row: null });

  try {
    assert.equal((await noRow.get()).status, 404);
  } finally {
    await noRow.close();
  }

  const noFile = await startRoutes({
    file: { data: null, error: { message: 'gone' } },
  });

  try {
    assert.equal((await noFile.get()).status, 404);
  } finally {
    await noFile.close();
  }
});
