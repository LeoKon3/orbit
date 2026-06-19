#!/usr/bin/env node
const path = require('path');
const {
  dirExists,
  fileExists,
  getStateValue,
  logColor,
} = require('./orbit-utils');

const STATE_FILE = '.orbit/state.yaml';

if (!fileExists(STATE_FILE)) {
  logColor('yellow', '📍 No state found (.orbit/state.yaml)');
  console.log('PHASE=none');
  console.log('CHANGE=');
  console.log('WORKFLOW=');
  console.log('CHANGE_TYPE=');
  process.exit(0);
}

const phase = getStateValue(STATE_FILE, 'phase', 'unknown');
const change = getStateValue(STATE_FILE, 'current_change', '');
const workflow = getStateValue(STATE_FILE, 'workflow', 'full');
const changeType = getStateValue(STATE_FILE, 'change_type', 'feature');

console.log(`PHASE=${phase}`);
console.log(`CHANGE=${change}`);
console.log(`WORKFLOW=${workflow}`);
console.log(`CHANGE_TYPE=${changeType}`);

logColor('blue', '📍 Current State:');
console.error(`   Workflow: ${workflow}`);
console.error(`   Phase: ${phase}`);
console.error(`   Change: ${change}`);
console.error(`   Type: ${changeType}`);

if (change) {
  const changeDir = path.join('.orbit', 'changes', change);
  if (!dirExists(changeDir)) {
    logColor('red', `⚠️  Warning: Change directory not found: ${changeDir}`);
    process.exit(1);
  }

  console.error('');
  logColor('blue', '📄 Documents:');
  for (const doc of ['proposal.md', 'spec.md', 'brainstorming.md', 'plan.md', 'review.md']) {
    if (fileExists(path.join(changeDir, doc))) {
      logColor('green', `   ✓ ${doc}`);
    } else {
      console.error(`   ✗ ${doc}`);
    }
  }
}

process.exit(0);
