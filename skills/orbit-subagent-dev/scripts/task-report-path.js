#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: task-report-path.js TASK_NUMBER');
  console.error('');
  console.error('Prints the path where task N\'s report should be written.');
  console.error('Reads current_change from .orbit/state.yaml to determine the execution directory.');
}

function readCurrentChange() {
  if (!fs.existsSync('.orbit/state.yaml')) {
    console.error('ERROR: .orbit/state.yaml not found');
    process.exit(1);
  }

  const state = fs.readFileSync('.orbit/state.yaml', 'utf8');
  const match = state.match(/^current_change:\s*(.+)$/m);

  if (!match) {
    console.error('ERROR: current_change not found in .orbit/state.yaml');
    process.exit(1);
  }

  return match[1].trim();
}

function isSafeChangeName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);
}

const [, , taskNumberRaw] = process.argv;

if (!taskNumberRaw || process.argv.length > 3) {
  usage();
  process.exit(2);
}

if (!/^[1-9][0-9]*$/.test(taskNumberRaw)) {
  console.error('ERROR: task number must be a positive integer');
  process.exit(2);
}

const taskNumber = Number(taskNumberRaw);
const changeName = readCurrentChange();

if (!isSafeChangeName(changeName)) {
  console.error(`ERROR: invalid change name in .orbit/state.yaml: ${changeName}`);
  process.exit(1);
}

const executionDir = path.join('.orbit', 'changes', changeName, 'execution');
const reportPath = path.join(executionDir, `task-${taskNumber}-report.md`);

fs.mkdirSync(executionDir, { recursive: true });
console.log(reportPath);
