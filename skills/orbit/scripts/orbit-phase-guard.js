#!/usr/bin/env node
const path = require('path');
const {
  fileExists,
  getStateValue,
  logColor,
  readText,
  usage,
} = require('./orbit-utils');

const STATE_FILE = '.orbit/state.yaml';
const targetPhase = process.argv[2];

if (!targetPhase) {
  usage('Usage: orbit-phase-guard.js <target-phase>');
}

if (!fileExists(STATE_FILE)) {
  if (targetPhase === 'explore') {
    logColor('green', '✓ Can start with explore phase');
    process.exit(0);
  }

  logColor('red', '✗ No state file. Must start with explore phase first.');
  process.exit(1);
}

const change = getStateValue(STATE_FILE, 'current_change', '');
const changeDir = path.join('.orbit', 'changes', change);

function requireFile(fileName, message) {
  if (!fileExists(path.join(changeDir, fileName))) {
    logColor('red', message);
    process.exit(1);
  }
}

switch (targetPhase) {
  case 'explore':
    logColor('green', '✓ Can always start explore phase');
    process.exit(0);
    break;

  case 'brainstorming':
    requireFile('proposal.md', '✗ Missing proposal.md. Run explore phase first.');
    requireFile('spec.md', '✗ Missing spec.md. Run explore phase first.');
    logColor('green', '✓ Can transition to brainstorming phase');
    process.exit(0);
    break;

  case 'build':
    requireFile('brainstorming.md', '✗ Missing brainstorming.md. Run brainstorming phase first.');
    logColor('green', '✓ Can transition to build phase');
    process.exit(0);
    break;

  case 'review':
    requireFile('plan.md', '✗ Missing plan.md. Run build phase (planning) first.');
    logColor('green', '✓ Can transition to review phase');
    process.exit(0);
    break;

  case 'archive': {
    const reviewPath = path.join(changeDir, 'review.md');
    requireFile('review.md', '✗ Missing review.md. Run review phase first.');
    if (/^Status:\s*PASS\s*$/m.test(readText(reviewPath))) {
      logColor('green', '✓ Can transition to archive phase');
      process.exit(0);
    }

    logColor('red', '✗ Review has not passed. Fix issues before archiving.');
    process.exit(1);
    break;
  }

  default:
    logColor('red', `✗ Unknown phase: ${targetPhase}`);
    process.exit(1);
}
