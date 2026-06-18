const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const cli = path.join(repoRoot, 'bin', 'orbit.js');
const packageJson = require(path.join(repoRoot, 'package.json'));

function runNode(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd || repoRoot,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeout || 5000,
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runPty(args, inputScript, cwd) {
  const command = `${shellQuote(process.execPath)} ${shellQuote(cli)} ${args.map(shellQuote).join(' ')}`;
  return spawnSync('bash', ['-lc', `{ ${inputScript}; } | script -qfec ${shellQuote(command)} /dev/null`], {
    cwd,
    encoding: 'utf8',
    timeout: 5000,
  });
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
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

test('help documents only interactive orbit init usage', () => {
  const result = runNode(['--help']);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: orbit <command>/);
  assert.match(result.stdout, /orbit init/);
  assert.doesNotMatch(result.stdout, /--agent/);
  assert.doesNotMatch(result.stdout, /--scope/);
  assert.doesNotMatch(result.stdout, /--yes/);
});

test('init rejects removed non-interactive options', () => {
  const result = runNode(['init', '--agent', 'claude'], { timeout: 1000 });

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option: --agent/);
});

test('interactive init renders cursor choices and installs selected defaults', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const result = runPty(['init'], "sleep 0.2; printf '\\r'; sleep 0.2; printf '\\r'", tempDir);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const plainOutput = stripAnsi(result.stdout);
  assert.match(plainOutput, /❯ Claude Code/);
  assert.match(plainOutput, /❯ Local project/);
  assert.ok(fs.existsSync(path.join(tempDir, '.claude', 'skills', 'orbit', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(tempDir, '.claude', 'skills', 'orbit-brainstorming', 'SKILL.md')));
});

test('interactive init supports arrow-key selection for Codex local install', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const down = '\\033[B';
  const enter = '\\r';
  const result = runPty(['init'], `sleep 0.2; printf '${down}'; sleep 0.1; printf '${enter}'; sleep 0.2; printf '${enter}'`, tempDir);

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const plainOutput = stripAnsi(result.stdout);
  assert.match(plainOutput, /❯ Codex/);
  assert.ok(fs.existsSync(path.join(tempDir, '.agents', 'skills', 'orbit', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(tempDir, '.agents', 'skills', 'orbit-brainstorming', 'SKILL.md')));
});

test('interactive cleanup pauses stdin so real terminals can exit', () => {
  const source = fs.readFileSync(cli, 'utf8');

  assert.match(source, /function cleanup\(\)[\s\S]*input\.pause\(\)/);
});

test('version flags print the package version', () => {
  for (const flag of ['-version', '--version', '-v']) {
    const result = runNode([flag]);

    assert.strictEqual(result.status, 0, `${flag}: ${result.stderr}`);
    assert.strictEqual(result.stdout.trim(), `Orbit ${packageJson.version}`);
  }
});

test('interactive update refreshes an existing local Claude install', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const enterEnter = "sleep 0.2; printf '\\r'; sleep 0.2; printf '\\r'";

  const installResult = runPty(['init'], enterEnter, tempDir);
  assert.strictEqual(installResult.status, 0, installResult.stderr || installResult.stdout);

  const installedSkill = path.join(tempDir, '.claude', 'skills', 'orbit', 'SKILL.md');
  fs.writeFileSync(installedSkill, 'stale local content\n');

  const updateResult = runPty(['update'], enterEnter, tempDir);
  assert.strictEqual(updateResult.status, 0, updateResult.stderr || updateResult.stdout);
  assert.match(stripAnsi(updateResult.stdout), /Orbit skills updated successfully/);
  assert.strictEqual(fs.readFileSync(installedSkill, 'utf8'), fs.readFileSync(path.join(repoRoot, 'skills', 'orbit', 'SKILL.md'), 'utf8'));
});

test('interactive update refuses missing installations', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const result = runPty(['update'], "sleep 0.2; printf '\\r'; sleep 0.2; printf '\\r'", tempDir);

  assert.notStrictEqual(result.status, 0);
  assert.match(stripAnsi(result.stderr + result.stdout), /No Orbit skills found/);
  assert.match(stripAnsi(result.stderr + result.stdout), /Run `orbit init` first/);
});

test('interactive uninstall defaults to no and keeps installed skills', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const enterEnter = "sleep 0.2; printf '\\r'; sleep 0.2; printf '\\r'";

  const installResult = runPty(['init'], enterEnter, tempDir);
  assert.strictEqual(installResult.status, 0, installResult.stderr || installResult.stdout);

  const uninstallResult = runPty(['uninstall'], `${enterEnter}; sleep 0.2; printf '\\r'`, tempDir);
  assert.strictEqual(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.match(stripAnsi(uninstallResult.stdout), /Uninstall cancelled/);
  assert.ok(fs.existsSync(path.join(tempDir, '.claude', 'skills', 'orbit', 'SKILL.md')));
});

test('interactive uninstall removes only packaged Orbit skills after confirmation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-cli-'));
  const enterEnter = "sleep 0.2; printf '\\r'; sleep 0.2; printf '\\r'";
  const down = '\\033[B';

  const installResult = runPty(['init'], enterEnter, tempDir);
  assert.strictEqual(installResult.status, 0, installResult.stderr || installResult.stdout);

  const customSkillDir = path.join(tempDir, '.claude', 'skills', 'orbit-custom-user-skill');
  fs.mkdirSync(customSkillDir, { recursive: true });
  fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '# Custom user skill\n');

  const uninstallInput = `${enterEnter}; sleep 0.2; printf '${down}'; sleep 0.1; printf '\\r'`;
  const uninstallResult = runPty(['uninstall'], uninstallInput, tempDir);
  assert.strictEqual(uninstallResult.status, 0, uninstallResult.stderr || uninstallResult.stdout);
  assert.match(stripAnsi(uninstallResult.stdout), /Orbit skills removed successfully/);
  assert.ok(!fs.existsSync(path.join(tempDir, '.claude', 'skills', 'orbit')));
  assert.ok(!fs.existsSync(path.join(tempDir, '.claude', 'skills', 'orbit-brainstorming')));
  assert.ok(fs.existsSync(path.join(customSkillDir, 'SKILL.md')));
});
