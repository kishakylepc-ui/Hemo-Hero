// ============================================================
// HEMO-HERO
// DATABASE STRUCTURE DOCUMENT
//
// Reads the live table structure from Supabase (the PostgREST
// schema description) and writes database/SCHEMA.md: every
// table with its columns, primary and foreign keys, and a
// relationship diagram.
//
// Run from the server folder after a migration:
//
//   npm run schema:doc
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
// Only the structure is read, never table rows.
// ============================================================

const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const OUTPUT_FILE = path.join(
  __dirname,
  '..',
  'database',
  'SCHEMA.md'
);

// What each table is for. Tables missing here still appear,
// with no description.
const TABLE_PURPOSES = {
  users:
    'Every account: donors, requesters and admins. The id is the Supabase Auth user id. role is user, admin or super_admin.',
  donor_applications:
    'A user\'s application to become a donor: eligibility answers, blood type, availability and the admin\'s review.',
  blood_requests:
    'Blood requests posted by requesters: blood type, bags needed, urgency, schedule, meet-up location and status.',
  blood_request_responses:
    'A donor\'s offer to help with a request (pending, accepted, rejected, no-show and so on).',
  blood_request_invitations:
    'A requester\'s invitation to a specific donor to help with a request.',
  blood_request_coordination_messages:
    'Chat messages between the requester and a donor about a request.',
  blood_request_coordination_schedules:
    'The meet-up time for a requester and donor: suggested by one side (status proposed) until the other agrees (agreed).',
  blood_request_trips:
    'The donor\'s live trip to the meet-up location (shared location and arrival).',
  blood_donations:
    'Donations recorded when a request is completed. Flagged ones wait for admin review.',
  donation_feedback:
    'Ratings and comments both sides leave after a donation.',
  notifications:
    'In-app notifications for users and admins.',
  push_tokens:
    'Expo push notification tokens, one per signed-in device.',
  user_reports:
    'Problems reported by users (no-shows, false requests and other issues) for admin review.',
  activity_logs:
    'The log trail: every user and admin action. Only admins and the super admin can view it.',
  facility_locations:
    'Verified hospitals, blood banks and Red Cross chapters shown on the map.',
  login_lockouts:
    'Failed sign-in counts and lockouts per email, so a lockout survives a server restart.',
  notification_preferences:
    'Which kinds of updates alert a user\'s phone. No row means everything is on.',
  data_backups:
    'The list of database backups. The backup files are in the private backups storage bucket.',
};

// Main tables first, then the rest alphabetically.
const TABLE_ORDER = [
  'users',
  'donor_applications',
  'blood_requests',
  'blood_request_responses',
  'blood_request_invitations',
  'blood_request_coordination_messages',
  'blood_request_coordination_schedules',
  'blood_request_trips',
  'blood_donations',
  'donation_feedback',
  'user_reports',
  'notifications',
  'push_tokens',
  'activity_logs',
  'facility_locations',
  'notification_preferences',
  'login_lockouts',
  'data_backups',
];

// ============================================================
// HELPERS
// ============================================================

async function fetchSchema() {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server/.env.'
    );
  }

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/openapi+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not read the schema (HTTP ${response.status}).`
    );
  }

  return response.json();
}

function shortType(format) {
  return String(format || '')
    .replace(/^public\./, '')
    .replace('timestamp with time zone', 'timestamptz')
    .replace('timestamp without time zone', 'timestamp')
    .replace('character varying', 'varchar')
    .replace('double precision', 'double');
}

function readColumns(definition) {
  const required = new Set(
    definition.required || []
  );

  return Object.entries(
    definition.properties || {}
  ).map(([name, column]) => {
    const note =
      column.description || '';

    const foreignKey =
      note.match(
        /<fk table='([^']+)' column='([^']+)'\/>/
      );

    return {
      name,
      type: shortType(column.format),
      enumValues: column.enum || null,
      nullable: !required.has(name),
      defaultValue:
        column.default === undefined
          ? null
          : String(column.default),
      primaryKey: note.includes('<pk/>'),
      references: foreignKey
        ? {
            table: foreignKey[1],
            column: foreignKey[2],
          }
        : null,
    };
  });
}

function sortTables(names) {
  return [...names].sort((a, b) => {
    const ai = TABLE_ORDER.indexOf(a);
    const bi = TABLE_ORDER.indexOf(b);

    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;

    return a.localeCompare(b);
  });
}

function cell(value) {
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

// ============================================================
// MARKDOWN
// ============================================================

function buildDiagram(tables) {
  const lines = ['```mermaid', 'erDiagram'];

  // Keys only, so the diagram stays readable.
  for (const table of tables) {
    const keys = table.columns.filter(
      column =>
        column.primaryKey ||
        column.references
    );

    lines.push(`  ${table.name} {`);

    for (const column of keys) {
      const marks = [
        column.primaryKey && 'PK',
        column.references && 'FK',
      ]
        .filter(Boolean)
        .join(', ');

      lines.push(
        `    ${column.type.replace(/\W+/g, '_')} ${column.name} ${marks}`
      );
    }

    lines.push('  }');
  }

  for (const table of tables) {
    for (const column of table.columns) {
      if (!column.references) continue;

      const optional = column.nullable
        ? 'o|'
        : '||';

      lines.push(
        `  ${column.references.table} ${optional}--o{ ${table.name} : "${column.name}"`
      );
    }
  }

  lines.push('```');

  return lines.join('\n');
}

function buildTableSection(table) {
  const lines = [
    `### ${table.name}`,
    '',
  ];

  if (TABLE_PURPOSES[table.name]) {
    lines.push(TABLE_PURPOSES[table.name], '');
  }

  lines.push(
    '| Column | Type | Null | Default | Key |',
    '| --- | --- | --- | --- | --- |'
  );

  for (const column of table.columns) {
    const type = column.enumValues
      ? `${column.type} (${column.enumValues.join(', ')})`
      : column.type;

    const keys = [
      column.primaryKey && 'PK',
      column.references &&
        `FK → ${column.references.table}.${column.references.column}`,
    ]
      .filter(Boolean)
      .join(', ');

    lines.push(
      `| ${cell(column.name)} | ${cell(type)} | ${column.nullable ? 'yes' : 'no'} | ${column.defaultValue === null ? '' : `\`${cell(column.defaultValue)}\``} | ${keys} |`
    );
  }

  return lines.join('\n');
}

function buildMarkdown(schema) {
  const tables = sortTables(
    Object.keys(schema.definitions || {})
  ).map(name => ({
    name,
    columns: readColumns(
      schema.definitions[name]
    ),
  }));

  const foreignKeys = tables.flatMap(
    table =>
      table.columns
        .filter(column => column.references)
        .map(column => ({
          table: table.name,
          column,
        }))
  );

  const functions = Object.keys(
    schema.paths || {}
  )
    .filter(name => name.startsWith('/rpc/'))
    .map(name => name.slice(5))
    .sort();

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const sections = [
    '# Hemo-Hero Database Structure',
    '',
    `Generated from the live Supabase database on ${today} by \`npm run schema:doc\` (server folder). Don't edit this file by hand; run the command again after a migration.`,
    '',
    'The tables live in the `public` schema of Supabase (PostgreSQL). Sign-in accounts are Supabase Auth users, and `users.id` is the same id. The server reads and writes with the service role, so the apps never touch the tables directly.',
    '',
    'Schema changes are in [migrations](migrations/), run in date order in the Supabase SQL editor.',
    '',
    '## Summary',
    '',
    `${tables.length} tables, ${foreignKeys.length} foreign keys.`,
    '',
    '| Table | Columns | Foreign keys | Purpose |',
    '| --- | --- | --- | --- |',
    ...tables.map(table => {
      const count = table.columns.filter(
        column => column.references
      ).length;

      return `| [${table.name}](#${table.name}) | ${table.columns.length} | ${count} | ${cell(TABLE_PURPOSES[table.name] || '')} |`;
    }),
    '',
    '## Relationships',
    '',
    'Primary and foreign key columns only. Every table is listed in full under Tables.',
    '',
    buildDiagram(tables),
    '',
    '| From | To |',
    '| --- | --- |',
    ...foreignKeys.map(
      ({ table, column }) =>
        `| ${table}.${column.name} | ${column.references.table}.${column.references.column} |`
    ),
    '',
    '## Tables',
    '',
    'Null "no" means the column is required (NOT NULL).',
    '',
    tables
      .map(buildTableSection)
      .join('\n\n'),
  ];

  if (functions.length) {
    sections.push(
      '',
      '## Database functions',
      '',
      ...functions.map(name => `- \`${name}\``)
    );
  }

  return `${sections.join('\n')}\n`;
}

// ============================================================
// RUN
// ============================================================

fetchSchema()
  .then(schema => {
    const markdown = buildMarkdown(schema);

    fs.writeFileSync(
      OUTPUT_FILE,
      markdown
    );

    console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_FILE)} (${Object.keys(schema.definitions || {}).length} tables).`
    );
  })
  .catch(error => {
    console.error(
      'SCHEMA DOC ERROR:',
      error.message
    );

    process.exitCode = 1;
  });
