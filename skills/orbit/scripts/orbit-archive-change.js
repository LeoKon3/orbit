#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const {
  assertSafeChangeName,
  dirExists,
  ensureDir,
  fileExists,
  getStateValue,
  isPathInside,
  logColor,
  readText,
  todayLocal,
  usage,
  writeText,
} = require('./orbit-utils');

const STATE_FILE = '.orbit/state.yaml';
const changeName = process.argv[2] || getStateValue(STATE_FILE, 'current_change', '');

if (!changeName) {
  usage('Usage: orbit-archive-change.js [change-name]');
}

if (!fileExists(STATE_FILE)) {
  logColor('red', `✗ State file not found: ${STATE_FILE}`);
  process.exit(1);
}

assertSafeChangeName(changeName);

const changeRoot = path.join('.orbit', 'changes');
const changePath = path.join(changeRoot, changeName);
if (!isPathInside(changeRoot, changePath)) {
  logColor('red', `✗ Change path escapes ${changeRoot}: ${changePath}`);
  process.exit(1);
}

if (!dirExists(changePath)) {
  logColor('red', `✗ Change directory not found: ${changePath}`);
  process.exit(1);
}

const archiveDate = todayLocal();
const archiveName = `${archiveDate}-${changeName}`;
const archiveRoot = path.join('.orbit', 'archive');
const archivePath = path.join(archiveRoot, archiveName);
if (!isPathInside(archiveRoot, archivePath)) {
  logColor('red', `✗ Archive path escapes ${archiveRoot}: ${archivePath}`);
  process.exit(1);
}

if (dirExists(archivePath)) {
  logColor('red', `✗ Archive already exists at ${archivePath}`);
  console.error('Suggest: Use different date suffix or rename existing archive');
  process.exit(1);
}

ensureDir(archiveRoot);
fs.renameSync(changePath, archivePath);

const changeType = getStateValue(STATE_FILE, 'change_type', 'feature');
const archivedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

writeText(
  path.join(archivePath, '.archive-meta.yaml'),
  `archived_at: ${archivedAt}\n` +
    `original_name: ${changeName}\n` +
    `archive_name: ${archiveName}\n` +
    `change_type: ${changeType}\n` +
    'phases_completed:\n' +
    '  - explore\n' +
    '  - brainstorming\n' +
    '  - build\n' +
    '  - review\n' +
    '  - archive\n' +
    'final_status: completed\n',
);

writeText(
  STATE_FILE,
  `workflow: full\n` +
    `phase: idle\n` +
    `last_archived_change: ${archiveName}\n` +
    `archived_at: ${archivedAt}\n`,
);

const indexPath = path.join(archiveRoot, 'INDEX.md');
if (!fileExists(indexPath)) {
  writeText(
    indexPath,
    '# Archived Changes\n\n' +
      'This directory contains completed and archived changes.\n\n' +
      '## Archive List\n\n',
  );
}

const currentIndex = readText(indexPath);
writeText(indexPath, `${currentIndex.replace(/\s*$/, '')}\n- **${archiveDate}** - [${changeName}](${archiveName}/) - [Brief description]\n`);

logColor('green', '✓ Archived change');
console.log(`ARCHIVE_NAME=${archiveName}`);
console.log(`ARCHIVE_PATH=${archivePath}`);
process.exit(0);
