const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const scriptsDir = path.join(repoRoot, 'skills', 'orbit', 'scripts');
const subagentScriptsDir = path.join(repoRoot, 'skills', 'orbit-subagent-dev', 'scripts');

function runScript(scriptName, args = [], cwd = repoRoot) {
  return spawnSync(process.execPath, [path.join(scriptsDir, scriptName), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 5000,
  });
}

function runSubagentScript(scriptName, args = [], cwd = repoRoot) {
  return spawnSync(process.execPath, [path.join(subagentScriptsDir, scriptName), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 5000,
  });
}

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-scripts-'));
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function write(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function git(cwd, args, input = undefined) {
  return spawnSync('git', args, {
    cwd,
    input,
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Orbit Test',
      GIT_AUTHOR_EMAIL: 'orbit@example.test',
      GIT_COMMITTER_NAME: 'Orbit Test',
      GIT_COMMITTER_EMAIL: 'orbit@example.test',
    },
  });
}

function createGitWorkspace() {
  const cwd = tempWorkspace();
  assert.strictEqual(git(cwd, ['init']).status, 0);
  write(path.join(cwd, 'app.txt'), 'before\n');
  assert.strictEqual(git(cwd, ['add', 'app.txt']).status, 0);
  const tree = git(cwd, ['write-tree']).stdout.trim();
  const commit = git(cwd, ['commit-tree', tree], 'initial\n').stdout.trim();
  assert.match(commit, /^[0-9a-f]{40}$/);
  assert.strictEqual(git(cwd, ['update-ref', 'refs/heads/main', commit]).status, 0);
  assert.strictEqual(git(cwd, ['symbolic-ref', 'HEAD', 'refs/heads/main']).status, 0);
  return { cwd, commit };
}

function sha(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseEnvLines(output) {
  return Object.fromEntries(
    output
      .trim()
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function createState(cwd, extra = '') {
  write(path.join(cwd, '.orbit', 'state.yaml'), `workflow: full\nphase: build\ncurrent_change: demo\n${extra}`);
  mkdirp(path.join(cwd, '.orbit', 'changes', 'demo'));
}

function createFullChange(cwd) {
  createState(cwd, 'change_type: bugfix\n');
  const changeDir = path.join(cwd, '.orbit', 'changes', 'demo');
  write(path.join(changeDir, 'proposal.md'), '# Proposal\noriginal proposal\n');
  write(path.join(changeDir, 'spec.md'), '# Spec\n\n## Requirements\noriginal spec\n');
  write(path.join(changeDir, 'brainstorming.md'), '# Brainstorming\noriginal brainstorming\n');
  write(path.join(changeDir, 'plan.md'), '# Plan\noriginal plan\n');
  write(path.join(changeDir, 'review.md'), 'Status: PASS\noriginal review\n');
  return changeDir;
}

function updateHash(cwd, docType, filePath) {
  const result = runScript('orbit-update-hash.js', [docType, filePath], cwd);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result;
}

function createSyncedChange(cwd) {
  const changeDir = createFullChange(cwd);
  updateHash(cwd, 'proposal', '.orbit/changes/demo/proposal.md');
  updateHash(cwd, 'spec', '.orbit/changes/demo/spec.md');
  updateHash(cwd, 'brainstorming', '.orbit/changes/demo/brainstorming.md');
  updateHash(cwd, 'plan', '.orbit/changes/demo/plan.md');
  updateHash(cwd, 'review', '.orbit/changes/demo/review.md');
  return changeDir;
}

test('check-state reports no state without requiring bash', () => {
  const cwd = tempWorkspace();
  const result = runScript('orbit-check-state.js', [], cwd);
  const fields = parseEnvLines(result.stdout);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fields.PHASE, 'none');
  assert.strictEqual(fields.CHANGE, '');
  assert.strictEqual(fields.WORKFLOW, '');
  assert.strictEqual(fields.CHANGE_TYPE, '');
});

test('check-state defaults old state files to feature change_type', () => {
  const cwd = tempWorkspace();
  createState(cwd);

  const result = runScript('orbit-check-state.js', [], cwd);
  const fields = parseEnvLines(result.stdout);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fields.PHASE, 'build');
  assert.strictEqual(fields.CHANGE, 'demo');
  assert.strictEqual(fields.WORKFLOW, 'full');
  assert.strictEqual(fields.CHANGE_TYPE, 'feature');
});

test('check-state preserves explicit change_type', () => {
  const cwd = tempWorkspace();
  createState(cwd, 'change_type: bugfix\n');

  const result = runScript('orbit-check-state.js', [], cwd);
  const fields = parseEnvLines(result.stdout);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fields.CHANGE_TYPE, 'bugfix');
});

test('check-state fails when active change directory is missing', () => {
  const cwd = tempWorkspace();
  write(path.join(cwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: build\ncurrent_change: missing\n');

  const result = runScript('orbit-check-state.js', [], cwd);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Change directory not found/);
});

test('phase-guard enforces prerequisites and review PASS status', () => {
  const cwd = tempWorkspace();

  assert.strictEqual(runScript('orbit-phase-guard.js', ['explore'], cwd).status, 0);
  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['build'], cwd).status, 0);

  createState(cwd);
  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['brainstorming'], cwd).status, 0);

  const changeDir = path.join(cwd, '.orbit', 'changes', 'demo');
  write(path.join(changeDir, 'proposal.md'), '# Proposal\n');
  write(path.join(changeDir, 'spec.md'), '# Spec\n');
  assert.strictEqual(runScript('orbit-phase-guard.js', ['brainstorming'], cwd).status, 0);

  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['build'], cwd).status, 0);
  write(path.join(changeDir, 'brainstorming.md'), '# Brainstorming\n');
  assert.strictEqual(runScript('orbit-phase-guard.js', ['build'], cwd).status, 0);

  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['review'], cwd).status, 0);
  write(path.join(changeDir, 'plan.md'), '# Plan\n');
  assert.strictEqual(runScript('orbit-phase-guard.js', ['review'], cwd).status, 0);

  write(path.join(changeDir, 'review.md'), 'Status: FAIL\n');
  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['archive'], cwd).status, 0);
  write(path.join(changeDir, 'review.md'), 'Status: NOT PASS\n');
  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['archive'], cwd).status, 0);
  write(path.join(changeDir, 'review.md'), 'Status: FAIL - PASS mentioned below\n');
  assert.notStrictEqual(runScript('orbit-phase-guard.js', ['archive'], cwd).status, 0);
  write(path.join(changeDir, 'review.md'), 'Status: PASS\n');
  assert.strictEqual(runScript('orbit-phase-guard.js', ['archive'], cwd).status, 0);
});

test('update-hash creates and updates hash lineage', () => {
  const cwd = tempWorkspace();
  const changeDir = createFullChange(cwd);
  const stateFile = path.join(cwd, '.orbit', 'state.yaml');

  updateHash(cwd, 'spec', '.orbit/changes/demo/spec.md');
  let state = read(stateFile);
  assert.match(state, /documents:\n  spec:/);
  assert.match(state, new RegExp(`hash: ${sha(path.join(changeDir, 'spec.md'))}`));
  assert.match(state, new RegExp(`based_on_proposal_hash: ${sha(path.join(changeDir, 'proposal.md'))}`));

  write(path.join(changeDir, 'spec.md'), '# Spec\nchanged\n');
  updateHash(cwd, 'spec', '.orbit/changes/demo/spec.md');
  state = read(stateFile);
  assert.match(state, new RegExp(`hash: ${sha(path.join(changeDir, 'spec.md'))}`));
});

test('update-hash rejects missing state or document files', () => {
  const cwd = tempWorkspace();
  assert.notStrictEqual(runScript('orbit-update-hash.js', ['spec', '.orbit/changes/demo/spec.md'], cwd).status, 0);

  createState(cwd);
  assert.notStrictEqual(runScript('orbit-update-hash.js', ['spec', '.orbit/changes/demo/spec.md'], cwd).status, 0);
});

test('sync-detect passes for synced hash chain', () => {
  const cwd = tempWorkspace();
  createSyncedChange(cwd);

  const result = runScript('orbit-sync-detect.js', [], cwd);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /All documents in sync/);
});

for (const [upstreamFile, expectedMessage] of [
  ['proposal.md', /Proposal changed since spec was created/],
  ['spec.md', /Spec changed since brainstorming was created/],
  ['brainstorming.md', /Brainstorming changed since plan was created/],
  ['plan.md', /Plan changed since review was created/],
]) {
  test(`sync-detect catches stale downstream document after ${upstreamFile} changes`, () => {
    const cwd = tempWorkspace();
    const changeDir = createSyncedChange(cwd);
    fs.appendFileSync(path.join(changeDir, upstreamFile), '\nchanged\n');

    const result = runScript('orbit-sync-detect.js', [], cwd);

    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, expectedMessage);
    assert.match(result.stderr + result.stdout, /Sync needed/);
  });
}

test('sync-detect exits cleanly with no state or no active change', () => {
  const noStateCwd = tempWorkspace();
  assert.strictEqual(runScript('orbit-sync-detect.js', [], noStateCwd).status, 0);

  const noChangeCwd = tempWorkspace();
  write(path.join(noChangeCwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: idle\n');
  assert.strictEqual(runScript('orbit-sync-detect.js', [], noChangeCwd).status, 0);
});

test('merge-spec creates a new main spec with change history', () => {
  const cwd = tempWorkspace();
  write(path.join(cwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: archive\ncurrent_change: auth-flow\n');
  write(path.join(cwd, '.orbit', 'changes', 'auth-flow', 'spec.md'), '# User Authentication System\n\n## Requirements\n- Login\n');

  const result = runScript('orbit-merge-spec.js', [], cwd);
  const mainSpec = path.join(cwd, '.orbit', 'specs', 'user-authentication-system.md');

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(mainSpec));
  assert.match(read(mainSpec), /## Change History/);
  assert.match(read(mainSpec), /auth-flow - Initial specification/);
});

test('merge-spec appends history for existing main spec and prints requirements', () => {
  const cwd = tempWorkspace();
  write(path.join(cwd, '.orbit', 'changes', 'auth-v2', 'spec.md'), '# User Authentication System\n\n## Requirements\n- MFA\n\n## Notes\nKeep this\n');
  write(path.join(cwd, '.orbit', 'specs', 'user-authentication-system.md'), '# User Authentication System\n\nExisting spec\n');

  const result = runScript('orbit-merge-spec.js', ['auth-v2'], cwd);
  const mainSpec = read(path.join(cwd, '.orbit', 'specs', 'user-authentication-system.md'));

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(mainSpec, /Existing spec/);
  assert.match(mainSpec, /auth-v2 - User Authentication System/);
  assert.match(result.stdout, /## Requirements\n- MFA/);
});

test('merge-spec rejects missing specs, specs without headings, and unsafe change names', () => {
  const missingCwd = tempWorkspace();
  assert.notStrictEqual(runScript('orbit-merge-spec.js', ['missing'], missingCwd).status, 0);

  const noHeadingCwd = tempWorkspace();
  write(path.join(noHeadingCwd, '.orbit', 'changes', 'bad', 'spec.md'), 'No heading\n');
  assert.notStrictEqual(runScript('orbit-merge-spec.js', ['bad'], noHeadingCwd).status, 0);

  const unsafeCwd = tempWorkspace();
  assert.notStrictEqual(runScript('orbit-merge-spec.js', ['../bad'], unsafeCwd).status, 0);
});

test('archive-change moves active change, writes metadata, index, and idle state', () => {
  const cwd = tempWorkspace();
  const changeDir = createFullChange(cwd);
  write(path.join(changeDir, 'build-output.txt'), 'kept\n');

  const result = runScript('orbit-archive-change.js', ['demo'], cwd);
  const fields = parseEnvLines(result.stdout);
  const archivePath = path.join(cwd, fields.ARCHIVE_PATH);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.ok(!fs.existsSync(changeDir));
  assert.ok(fs.existsSync(path.join(archivePath, 'build-output.txt')));
  assert.match(read(path.join(archivePath, '.archive-meta.yaml')), /change_type: bugfix/);
  assert.match(read(path.join(cwd, '.orbit', 'state.yaml')), /phase: idle/);
  assert.match(read(path.join(cwd, '.orbit', 'state.yaml')), new RegExp(`last_archived_change: ${fields.ARCHIVE_NAME}`));
  assert.match(read(path.join(cwd, '.orbit', 'archive', 'INDEX.md')), new RegExp(`\\[demo\\]\\(${fields.ARCHIVE_NAME}/\\)`));
});

test('archive-change refuses missing state, missing changes, and duplicate archives', () => {
  const noStateCwd = tempWorkspace();
  assert.notStrictEqual(runScript('orbit-archive-change.js', ['demo'], noStateCwd).status, 0);

  const missingChangeCwd = tempWorkspace();
  write(path.join(missingChangeCwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: archive\ncurrent_change: demo\n');
  assert.notStrictEqual(runScript('orbit-archive-change.js', ['demo'], missingChangeCwd).status, 0);

  const unsafeCwd = tempWorkspace();
  write(path.join(unsafeCwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: archive\ncurrent_change: ../demo\n');
  assert.notStrictEqual(runScript('orbit-archive-change.js', [], unsafeCwd).status, 0);

  const duplicateCwd = tempWorkspace();
  createFullChange(duplicateCwd);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  mkdirp(path.join(duplicateCwd, '.orbit', 'archive', `${today}-demo`));
  assert.notStrictEqual(runScript('orbit-archive-change.js', ['demo'], duplicateCwd).status, 0);
});


test('task-brief extracts one task into the execution directory', () => {
  const cwd = tempWorkspace();
  const planFile = path.join(cwd, '.orbit', 'changes', 'demo', 'plan.md');
  write(planFile, '# Plan\n\n### Task 1\nDo first thing.\n\n### Task 2\nDo second thing.\n');

  const result = runSubagentScript('task-brief.js', [planFile, '2'], cwd);
  const outputFile = result.stdout.trim();

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.strictEqual(outputFile, path.join(path.dirname(planFile), 'execution', 'task-2-brief.md'));
  assert.strictEqual(read(outputFile), '### Task 2\nDo second thing.\n');
});

test('task-brief rejects missing plans, invalid task numbers, and absent tasks', () => {
  const cwd = tempWorkspace();
  const planFile = path.join(cwd, 'plan.md');

  assert.strictEqual(runSubagentScript('task-brief.js', ['missing.md', '1'], cwd).status, 1);
  write(planFile, '### Task 1\nOnly task.\n');
  assert.strictEqual(runSubagentScript('task-brief.js', [planFile, '0'], cwd).status, 2);
  assert.strictEqual(runSubagentScript('task-brief.js', [planFile, '2'], cwd).status, 1);
});

test('review-package writes active change review package for working tree diff', () => {
  const { cwd, commit } = createGitWorkspace();
  write(path.join(cwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: build\ncurrent_change: demo\n');
  write(path.join(cwd, 'app.txt'), 'after\n');

  const result = runSubagentScript('review-package.js', [commit], cwd);
  const outputFile = path.join(cwd, result.stdout.trim());

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^\.orbit\/changes\/demo\/execution\/review-[0-9a-f]+-working-tree\.md\n$/);
  assert.ok(fs.existsSync(outputFile));
  const content = read(outputFile);
  assert.match(content, /# Review Package/);
  assert.match(content, /Head: `working-tree`/);
  assert.match(content, /app\.txt/);
  assert.match(content, /\+after/);
});

test('review-package rejects invalid refs before writing output', () => {
  const { cwd } = createGitWorkspace();

  const result = runSubagentScript('review-package.js', ['not-a-ref'], cwd);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /base commit not found/);
});


test('review-package rejects unsafe current_change values', () => {
  const { cwd, commit } = createGitWorkspace();
  write(path.join(cwd, '.orbit', 'state.yaml'), 'workflow: full\nphase: build\ncurrent_change: ../escape\n');
  write(path.join(cwd, 'app.txt'), 'after\n');

  const result = runSubagentScript('review-package.js', [commit], cwd);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /invalid change name/);
  assert.ok(!fs.existsSync(path.join(cwd, '.orbit', 'escape')));
});
