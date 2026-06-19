#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: task-brief.js PLAN_FILE TASK_NUMBER [OUTPUT_DIR]');
}

const [, , planFile, taskNumberRaw, outputDirRaw] = process.argv;
if (!planFile || !taskNumberRaw || process.argv.length > 5) {
  usage();
  process.exit(2);
}

if (!fs.existsSync(planFile) || !fs.statSync(planFile).isFile()) {
  console.error(`ERROR: plan file not found: ${planFile}`);
  process.exit(1);
}

if (!/^[1-9][0-9]*$/.test(taskNumberRaw)) {
  console.error('ERROR: task number must be a positive integer');
  process.exit(2);
}

const taskNumber = Number(taskNumberRaw);
const changeDir = path.dirname(planFile);
const outputDir = outputDirRaw || path.join(changeDir, 'execution');
const outputFile = path.join(outputDir, `task-${taskNumber}-brief.md`);
const text = fs.readFileSync(planFile, 'utf8');
const pattern = new RegExp(`^###\\s+Task\\s+${taskNumber}\\b[\\s\\S]*?(?=^###\\s+Task\\s+\\d+\\b|(?![\\s\\S]))`, 'm');
const match = text.match(pattern);

if (!match) {
  console.error(`ERROR: Task ${taskNumber} not found in ${planFile}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, `${match[0].trim()}\n`);
console.log(outputFile);
