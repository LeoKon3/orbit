#!/usr/bin/env node
const path = require('path');
const {
  assertSafeChangeName,
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
  usage('Usage: orbit-merge-spec.js [change-name]');
}

assertSafeChangeName(changeName);

const changeRoot = path.join('.orbit', 'changes');
const changeSpec = path.join(changeRoot, changeName, 'spec.md');
if (!isPathInside(changeRoot, changeSpec)) {
  logColor('red', `✗ Change spec path escapes ${changeRoot}: ${changeSpec}`);
  process.exit(1);
}

if (!fileExists(changeSpec)) {
  logColor('red', `✗ Change spec not found: ${changeSpec}`);
  process.exit(1);
}

const changeSpecContent = readText(changeSpec);
const titleMatch = changeSpecContent.match(/^#\s+(.+)$/m);
const topic = titleMatch ? titleMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';

if (!topic) {
  logColor('red', '✗ Could not determine topic from spec title');
  process.exit(1);
}

const mainSpec = path.join('.orbit', 'specs', `${topic}.md`);
ensureDir(path.dirname(mainSpec));

logColor('blue', `📝 Merging spec for topic: ${topic}`);

const archiveDate = todayLocal();

if (!fileExists(mainSpec)) {
  logColor('blue', `   Creating new main spec: ${mainSpec}`);
  writeText(
    mainSpec,
    `${changeSpecContent.replace(/\s*$/, '')}\n\n---\n\n## Change History\n\n- ${archiveDate}: ${changeName} - Initial specification (archived: .orbit/archive/${archiveDate}-${changeName}/)\n`,
  );
  logColor('green', '✓ Created new main spec');
  process.exit(0);
}

logColor('blue', '   Main spec exists, performing intelligent merge...');

let mainContent = readText(mainSpec);
if (!/^## Change History$/m.test(mainContent)) {
  mainContent = `${mainContent.replace(/\s*$/, '')}\n\n---\n\n## Change History\n\n`;
}

const changeTitle = titleMatch[1];
const historyEntry = `- ${archiveDate}: ${changeName} - ${changeTitle} (archived: .orbit/archive/${archiveDate}-${changeName}/)`;
mainContent = mainContent.replace(/^## Change History$/m, `## Change History\n${historyEntry}`);
writeText(mainSpec, mainContent.endsWith('\n') ? mainContent : `${mainContent}\n`);

console.log('');
logColor('yellow', '📋 Requirements from change spec that may need merging:');
console.log('');
const requirementsStart = changeSpecContent.search(/^## Requirements$/m);
if (requirementsStart !== -1) {
  const requirementsContent = changeSpecContent.slice(requirementsStart);
  const historyStart = requirementsContent.search(/^## Change History$/m);
  const output = historyStart === -1 ? requirementsContent : requirementsContent.slice(0, historyStart);
  console.log(output.replace(/\s*$/, ''));
}
console.log('');

logColor('green', '✓ Updated change history in main spec');
logColor('yellow', `⚠️  Note: Review ${mainSpec} to manually merge new requirements if needed`);
process.exit(0);
