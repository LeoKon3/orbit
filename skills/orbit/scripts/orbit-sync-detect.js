#!/usr/bin/env node
const path = require('path');
const {
  fileExists,
  getDocField,
  getStateValue,
  logColor,
  sha256,
} = require('./orbit-utils');

const STATE_FILE = '.orbit/state.yaml';

if (!fileExists(STATE_FILE)) {
  logColor('green', '✓ No state file, nothing to sync');
  process.exit(0);
}

const change = getStateValue(STATE_FILE, 'current_change', '');
if (!change) {
  logColor('green', '✓ No active change, nothing to sync');
  process.exit(0);
}

const changeDir = path.join('.orbit', 'changes', change);
let syncNeeded = false;

function checkPair({ upstreamDoc, downstreamDoc, downstreamField, changedMessage, upstreamLabel, downstreamLabel }) {
  const upstreamPath = path.join(changeDir, upstreamDoc);
  const downstreamPath = path.join(changeDir, downstreamDoc);

  if (!fileExists(upstreamPath) || !fileExists(downstreamPath)) {
    return;
  }

  const currentHash = sha256(upstreamPath);
  const basedOnHash = getDocField(STATE_FILE, downstreamDoc.replace(/\.md$/, ''), downstreamField);

  if (basedOnHash && currentHash !== basedOnHash) {
    logColor('yellow', changedMessage);
    console.log(`   ${upstreamLabel}: ${currentHash.slice(0, 12)}...`);
    console.log(`   ${downstreamLabel}: ${basedOnHash.slice(0, 12)}...`);
    syncNeeded = true;
  }
}

checkPair({
  upstreamDoc: 'proposal.md',
  downstreamDoc: 'spec.md',
  downstreamField: 'based_on_proposal_hash',
  changedMessage: '⚠️  Proposal changed since spec was created',
  upstreamLabel: 'Proposal',
  downstreamLabel: 'Spec based on',
});

checkPair({
  upstreamDoc: 'spec.md',
  downstreamDoc: 'brainstorming.md',
  downstreamField: 'based_on_spec_hash',
  changedMessage: '⚠️  Spec changed since brainstorming was created',
  upstreamLabel: 'Spec',
  downstreamLabel: 'Brainstorming based on',
});

checkPair({
  upstreamDoc: 'brainstorming.md',
  downstreamDoc: 'plan.md',
  downstreamField: 'based_on_brainstorming_hash',
  changedMessage: '⚠️  Brainstorming changed since plan was created',
  upstreamLabel: 'Brainstorming',
  downstreamLabel: 'Plan based on',
});

checkPair({
  upstreamDoc: 'plan.md',
  downstreamDoc: 'review.md',
  downstreamField: 'based_on_plan_hash',
  changedMessage: '⚠️  Plan changed since review was created',
  upstreamLabel: 'Plan',
  downstreamLabel: 'Review based on',
});

if (syncNeeded) {
  console.log('');
  logColor('yellow', '🔄 Sync needed! Run orbit sync to update downstream documents.');
  process.exit(1);
}

logColor('green', '✓ All documents in sync');
process.exit(0);
