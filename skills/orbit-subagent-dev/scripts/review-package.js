#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function usage() {
  console.error('Usage: review-package.js BASE [HEAD]');
}

function runGit(args, options = {}) {
  return spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: options.timeout || 10000,
    maxBuffer: options.maxBuffer || 50 * 1024 * 1024,
  });
}

function gitOutput(args, label) {
  const result = runGit(args);
  if (result.error || result.status !== 0) {
    const detail = result.error ? result.error.message : (result.stderr || `exit ${result.status}`);
    console.error(`ERROR: failed to collect ${label}: ${detail.trim()}`);
    process.exit(1);
  }
  return result.stdout.trim();
}

function verifyCommit(ref, label) {
  const result = runGit(['rev-parse', '--verify', `${ref}^{commit}`]);
  if (result.status !== 0) {
    console.error(`ERROR: ${label} commit not found: ${ref}`);
    process.exit(1);
  }
}

function readCurrentChange() {
  if (!fs.existsSync('.orbit/state.yaml')) {
    return '';
  }

  const state = fs.readFileSync('.orbit/state.yaml', 'utf8');
  const match = state.match(/^current_change:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

function isSafeChangeName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);
}

function isPathInside(baseDir, targetPath) {
  const basePath = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  return target === basePath || target.startsWith(`${basePath}${path.sep}`);
}

const [, , base, head] = process.argv;
if (!base || process.argv.length > 4) {
  usage();
  process.exit(2);
}

verifyCommit(base, 'base');
if (head) {
  verifyCommit(head, 'head');
}

let outputDir;
const changeName = readCurrentChange();
if (changeName) {
  if (!isSafeChangeName(changeName)) {
    console.error(`ERROR: invalid change name in .orbit/state.yaml: ${changeName}`);
    process.exit(1);
  }

  const changeRoot = path.join('.orbit', 'changes');
  outputDir = path.join(changeRoot, changeName, 'execution');
  if (!isPathInside(changeRoot, outputDir)) {
    console.error(`ERROR: review package path escapes ${changeRoot}: ${outputDir}`);
    process.exit(1);
  }
} else {
  outputDir = gitOutput(['rev-parse', '--git-path', 'sdd'], 'git path') || path.join('.git', 'sdd');
}

fs.mkdirSync(outputDir, { recursive: true });

const baseShort = gitOutput(['rev-parse', '--short', base], 'base short hash');
const headLabel = head || 'working-tree';
const headShort = head ? gitOutput(['rev-parse', '--short', head], 'head short hash') : 'working-tree';
const outputFile = path.join(outputDir, `review-${baseShort}-${headShort}.md`);

const logRange = head ? `${base}..${head}` : `${base}..HEAD`;
const diffRange = head ? `${base}..${head}` : base;
const log = gitOutput(['log', '--oneline', '--decorate', logRange], 'commit log');
const diffStat = gitOutput(['diff', '--stat', diffRange], 'diff stat');
const diff = gitOutput(['diff', '-U10', diffRange], 'diff');

const content = [
  '# Review Package',
  '',
  `Base: \`${base}\` (${baseShort})`,
  `Head: \`${headLabel}\` (${headShort})`,
  '',
  '## Commits',
  '',
  log,
  '',
  '## Diff Stat',
  '',
  diffStat,
  '',
  '## Diff',
  '',
  '```diff',
  diff,
  '```',
  '',
].join('\n');

fs.writeFileSync(outputFile, content);
console.log(outputFile);
