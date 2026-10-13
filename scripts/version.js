// ============================================================
// HEMO-HERO
// RELEASE VERSION
//
// The server, the mobile app and the admin portal share one
// version number (semantic versioning: MAJOR.MINOR.PATCH).
// This script keeps every file that holds it in step and
// moves the "Unreleased" notes in CHANGELOG.md under the new
// version.
//
// Run from the project folder:
//
//   node scripts/version.js          show the current version
//   node scripts/version.js patch    1.0.0 -> 1.0.1  fixes only
//   node scripts/version.js minor    1.0.0 -> 1.1.0  new features
//   node scripts/version.js major    1.0.0 -> 2.0.0  breaking changes
//   node scripts/version.js 1.2.3    set an exact version
//
// The Android build number (versionCode) is separate: EAS
// raises it on every build (see HemoHeroMobile/eas.json).
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md');

const UNRELEASED_HEADING = '## Unreleased';

// Every file that holds the version, and where in it.
const VERSION_FILES = [
  { file: 'server/package.json', keys: [['version']] },
  {
    file: 'server/package-lock.json',
    keys: [['version'], ['packages', '', 'version']],
  },

  { file: 'HemoHeroMobile/app.json', keys: [['expo', 'version']] },
  { file: 'HemoHeroMobile/package.json', keys: [['version']] },
  {
    file: 'HemoHeroMobile/package-lock.json',
    keys: [['version'], ['packages', '', 'version']],
  },

  { file: 'HemoHeroAdmin/app.json', keys: [['expo', 'version']] },
  { file: 'HemoHeroAdmin/package.json', keys: [['version']] },
  {
    file: 'HemoHeroAdmin/package-lock.json',
    keys: [['version'], ['packages', '', 'version']],
  },
];

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

// ============================================================
// JSON FILES
// ============================================================

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const text = fs.readFileSync(fullPath, 'utf8');

  return {
    fullPath,
    data: JSON.parse(text),
    newline: text.includes('\r\n') ? '\r\n' : '\n',
  };
}

function getAt(data, keys) {
  return keys.reduce(
    (value, key) => (value == null ? undefined : value[key]),
    data
  );
}

function setAt(data, keys, value) {
  const parent = getAt(data, keys.slice(0, -1));

  parent[keys[keys.length - 1]] = value;
}

// Every place the version is written, with what it says now.
function readAllVersions() {
  const found = [];

  for (const entry of VERSION_FILES) {
    const { data } = readJson(entry.file);

    for (const keys of entry.keys) {
      found.push({
        label:
          entry.file +
          (keys.length > 1 ? ` (${keys.filter(Boolean).join('.')})` : ''),
        version: getAt(data, keys),
      });
    }
  }

  return found;
}

function writeAllVersions(version) {
  for (const entry of VERSION_FILES) {
    const { fullPath, data, newline } = readJson(entry.file);

    for (const keys of entry.keys) {
      setAt(data, keys, version);
    }

    const text = JSON.stringify(data, null, 2) + '\n';

    fs.writeFileSync(fullPath, text.replace(/\n/g, newline));
  }
}

// ============================================================
// VERSION NUMBERS
// ============================================================

function nextVersion(current, request) {
  const match = VERSION_PATTERN.exec(current);

  if (!match) {
    throw new Error(`The current version "${current}" is not MAJOR.MINOR.PATCH.`);
  }

  const [major, minor, patch] = match.slice(1).map(Number);

  if (request === 'major') return `${major + 1}.0.0`;
  if (request === 'minor') return `${major}.${minor + 1}.0`;
  if (request === 'patch') return `${major}.${minor}.${patch + 1}`;

  if (VERSION_PATTERN.test(request)) return request;

  throw new Error(
    `"${request}" is not patch, minor, major or a version like 1.2.3.`
  );
}

function isNewer(next, current) {
  const a = next.split('.').map(Number);
  const b = current.split('.').map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }

  return false;
}

function today() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

// ============================================================
// CHANGELOG
//
// Turns
//   ## Unreleased
//   - notes
//   ## 1.0.0 - ...
// into
//   ## Unreleased
//
//   ## 1.1.0 - 2026-11-02
//   - notes
//   ## 1.0.0 - ...
// ============================================================

function releaseChangelog(version) {
  const text = fs.readFileSync(CHANGELOG_FILE, 'utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  const start = lines.findIndex(line => line.trim() === UNRELEASED_HEADING);

  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "${UNRELEASED_HEADING}" heading.`);
  }

  if (lines.some(line => line.startsWith(`## ${version} `))) {
    throw new Error(`CHANGELOG.md already has a ${version} section.`);
  }

  let end = lines.findIndex(
    (line, index) => index > start && line.startsWith('## ')
  );

  if (end === -1) end = lines.length;

  const notes = lines.slice(start + 1, end);

  if (!notes.some(line => line.trim().startsWith('-'))) {
    throw new Error(
      `Write what changed under "${UNRELEASED_HEADING}" in CHANGELOG.md first.`
    );
  }

  const updated = [
    ...lines.slice(0, start + 1),
    '',
    `## ${version} - ${today()}`,
    ...notes,
    ...lines.slice(end),
  ];

  fs.writeFileSync(CHANGELOG_FILE, updated.join(newline));
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const request = process.argv[2];
  const versions = readAllVersions();
  const distinct = [...new Set(versions.map(item => item.version))];

  if (!request) {
    if (distinct.length === 1) {
      console.log(`Hemo-Hero version ${distinct[0]}`);
      return;
    }

    console.log('The version is not the same everywhere:');

    for (const item of versions) {
      console.log(`  ${item.version}  ${item.label}`);
    }

    console.log('\nSet one version with: node scripts/version.js 1.2.3');
    process.exitCode = 1;
    return;
  }

  // patch / minor / major only make sense from one agreed version.
  if (distinct.length > 1 && !VERSION_PATTERN.test(request)) {
    throw new Error(
      'The version is not the same everywhere. Run without arguments to see where, then set an exact version.'
    );
  }

  const current = distinct.length === 1 ? distinct[0] : null;
  const version = nextVersion(current || request, request);

  if (current && !isNewer(version, current)) {
    throw new Error(`${version} is not newer than the current ${current}.`);
  }

  releaseChangelog(version);
  writeAllVersions(version);

  console.log(`Hemo-Hero version ${current || 'mixed'} -> ${version}\n`);

  for (const entry of VERSION_FILES) {
    console.log(`  updated ${entry.file}`);
  }

  console.log('  updated CHANGELOG.md\n');
  console.log('Next:');
  console.log('  git add -A');
  console.log(`  git commit -m "Release v${version}"`);
  console.log(`  git tag v${version}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
