#!/usr/bin/env node
const path = require('path');
const {
  fileExists,
  getStateValue,
  logColor,
  sha256,
  upsertDocumentState,
  usage,
} = require('./orbit-utils');

const STATE_FILE = '.orbit/state.yaml';
const docType = process.argv[2];
const filePath = process.argv[3];

if (!docType || !filePath) {
  usage('Usage: orbit-update-hash.js <doc-type> <file-path>');
}

if (!fileExists(STATE_FILE)) {
  logColor('red', `✗ State file not found: ${STATE_FILE}`);
  process.exit(1);
}

if (!fileExists(filePath)) {
  logColor('red', `✗ File not found: ${filePath}`);
  process.exit(1);
}

const change = getStateValue(STATE_FILE, 'current_change', '');
const changeDir = path.join('.orbit', 'changes', change);
const parentPathByDocType = {
  spec: path.join(changeDir, 'proposal.md'),
  brainstorming: path.join(changeDir, 'spec.md'),
  plan: path.join(changeDir, 'brainstorming.md'),
  review: path.join(changeDir, 'plan.md'),
};

const newHash = sha256(filePath);
const parentPath = parentPathByDocType[docType];
const parentHash = parentPath && fileExists(parentPath) ? sha256(parentPath) : '';

upsertDocumentState(STATE_FILE, docType, filePath, newHash, parentHash);

logColor('green', `✓ Updated ${docType} hash: ${newHash.slice(0, 12)}...`);
if (parentHash) {
  logColor('green', `✓ Parent hash: ${parentHash.slice(0, 12)}...`);
}

process.exit(0);
