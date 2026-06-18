#!/usr/bin/env node
/*
 * Orbit CLI.
 * Installs, updates, and removes Orbit skills for Claude Code or Codex.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const icon = {
  ok: `${color.green}✓${color.reset}`,
  warn: `${color.yellow}!${color.reset}`,
  err: `${color.red}✗${color.reset}`,
  arrow: `${color.cyan}›${color.reset}`,
};

const AGENTS = [
  { value: 'claude', label: 'Claude Code', hint: 'uses .claude/skills' },
  { value: 'codex', label: 'Codex', hint: 'uses .agents/skills' },
];

const SCOPES = [
  { value: 'local', label: 'Local project', hint: 'only this repository/folder' },
  { value: 'global', label: 'Global user', hint: 'all your projects' },
];

function paint(text, style) {
  return `${color[style] || ''}${text}${color.reset}`;
}

function printBanner() {
  console.log('');
  console.log(paint(' ██████╗ ██████╗ ██████╗ ██╗████████╗', 'cyan'));
  console.log(paint('██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝', 'cyan'));
  console.log(paint('██║   ██║██████╔╝██████╔╝██║   ██║   ', 'cyan'));
  console.log(paint('██║   ██║██╔══██╗██╔══██╗██║   ██║   ', 'cyan'));
  console.log(paint('╚██████╔╝██║  ██║██████╔╝██║   ██║   ', 'cyan'));
  console.log(paint(' ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝   ', 'cyan'));
  console.log('');
  console.log(paint('Keep your AI development workflow in orbit', 'bold'));
  console.log(paint('Interactive skill installer for Claude Code and Codex', 'dim'));
  console.log('');
}

function printHelp() {
  console.log('Usage: orbit <command>');
  console.log('');
  console.log('Commands:');
  console.log('  init                     Interactively install Orbit skills');
  console.log('  update                   Interactively update installed Orbit skills');
  console.log('  uninstall                Interactively remove Orbit skills');
  console.log('');
  console.log('Options:');
  console.log('  -v, --version, -version  Show Orbit version');
  console.log('  -h, --help               Show help');
  console.log('');
  console.log('Examples:');
  console.log('  orbit init');
  console.log('  orbit update');
  console.log('  orbit uninstall');
}

function packageRoot() {
  return path.resolve(__dirname, '..');
}

function packageInfo() {
  return require(path.join(packageRoot(), 'package.json'));
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    return { help: true };
  }

  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    return { help: true };
  }

  if (args.length === 1 && ['-v', '--version', '-version'].includes(args[0])) {
    return { version: true };
  }

  const command = args[0];
  if (!['init', 'update', 'uninstall'].includes(command)) {
    throw new Error(`Unknown command: ${command}. Expected init, update, or uninstall.`);
  }

  if (args.length === 2 && ['-h', '--help'].includes(args[1])) {
    return { help: true };
  }

  if (args.length > 1) {
    const extra = args[1];
    if (extra.startsWith('-')) {
      throw new Error(`Unknown option: ${extra}`);
    }
    throw new Error(`Unexpected argument: ${extra}`);
  }

  return { command };
}

function skillsSourceDir() {
  const candidates = [
    path.join(packageRoot(), 'skills'),
    path.join(process.cwd(), 'skills'),
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'orbit', 'SKILL.md')));
}

function listOrbitSkills(sourceDir) {
  return fs.readdirSync(sourceDir)
    .filter((entry) => entry === 'orbit' || entry.startsWith('orbit-'))
    .filter((entry) => fs.existsSync(path.join(sourceDir, entry, 'SKILL.md')))
    .sort();
}

function listInstalledOrbitSkills(destination) {
  if (!fs.existsSync(destination)) return [];

  return fs.readdirSync(destination)
    .filter((entry) => entry === 'orbit' || entry.startsWith('orbit-'))
    .filter((entry) => fs.existsSync(path.join(destination, entry, 'SKILL.md')))
    .sort();
}

function destinationFor(agent, scope) {
  if (agent.value === 'claude') {
    return scope.value === 'local'
      ? path.resolve(process.cwd(), '.claude', 'skills')
      : path.join(os.homedir(), '.claude', 'skills');
  }

  return scope.value === 'local'
    ? path.resolve(process.cwd(), '.agents', 'skills')
    : path.join(os.homedir(), '.agents', 'skills');
}

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDirectory(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    ensureDirectory(destination);
    for (const entry of fs.readdirSync(source)) {
      copyDirectory(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  if (stat.isFile()) {
    ensureDirectory(path.dirname(destination));
    fs.copyFileSync(source, destination);
  }
}

function copySkills(sourceDir, destination, skills, verb) {
  ensureDirectory(destination);

  for (const skill of skills) {
    const from = path.join(sourceDir, skill);
    const to = path.join(destination, skill);
    fs.rmSync(to, { recursive: true, force: true });
    copyDirectory(from, to);
    console.log(`${icon.ok} ${verb} ${skill}`);
  }
}

function renderSelect(output, title, options, selected, previousLineCount) {
  if (previousLineCount > 0) {
    readline.moveCursor(output, 0, -previousLineCount);
    readline.clearScreenDown(output);
  }

  const lines = [
    `${icon.arrow} ${paint(title, 'bold')}`,
    ...options.map((option, index) => {
      const marker = index === selected ? '❯' : ' ';
      const label = index === selected ? paint(option.label, 'cyan') : option.label;
      const hint = option.hint ? paint(`  ${option.hint}`, 'dim') : '';
      return `${marker} ${label}${hint}`;
    }),
  ];

  output.write(`${lines.join('\n')}\n`);
  return lines.length;
}

function select(title, options, defaultIndex = 0) {
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY) {
    throw new Error('Interactive selection requires a TTY. Run `orbit init` in a terminal.');
  }

  return new Promise((resolve) => {
    let selected = defaultIndex;
    let previousLineCount = 0;
    const wasRaw = input.isRaw;

    function cleanup() {
      input.removeListener('keypress', onKeypress);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\x1B[?25h');
    }

    function choose() {
      cleanup();
      output.write('\n');
      resolve(options[selected]);
    }

    function onKeypress(_, key) {
      if (key && key.ctrl && key.name === 'c') {
        cleanup();
        output.write('\n');
        process.exit(130);
      }

      if (key && (key.name === 'down' || key.name === 'j')) {
        selected = (selected + 1) % options.length;
        previousLineCount = renderSelect(output, title, options, selected, previousLineCount);
        return;
      }

      if (key && (key.name === 'up' || key.name === 'k')) {
        selected = (selected - 1 + options.length) % options.length;
        previousLineCount = renderSelect(output, title, options, selected, previousLineCount);
        return;
      }

      if (key && key.name === 'return') {
        choose();
      }
    }

    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKeypress);
    output.write('\x1B[?25l');
    previousLineCount = renderSelect(output, title, options, selected, previousLineCount);
  });
}

async function resolveChoices(agentTitle, scopeTitle) {
  const agent = await select(agentTitle, AGENTS);
  const scope = await select(scopeTitle, SCOPES);
  return { agent, scope };
}

async function confirmOverwrite(existing) {
  console.log(`${icon.warn} Existing Orbit skills found: ${existing.join(', ')}`);
  return select('Overwrite existing Orbit skills?', [
    { value: true, label: 'Yes', hint: 'replace the existing Orbit skills' },
    { value: false, label: 'No', hint: 'cancel installation' },
  ]);
}

async function install({ agent, scope }, sourceDir, skills) {
  const destination = destinationFor(agent, scope);
  const existing = listInstalledOrbitSkills(destination);

  console.log(`${icon.arrow} ${paint('Install plan', 'bold')}`);
  console.log(`  Agent:       ${agent.label}`);
  console.log(`  Scope:       ${scope.label}`);
  console.log(`  Source:      ${sourceDir}`);
  console.log(`  Destination: ${destination}`);
  console.log(`  Skills:      ${skills.length}`);
  console.log('');

  if (existing.length > 0) {
    const overwrite = await confirmOverwrite(existing);
    if (!overwrite.value) {
      console.log(`${icon.warn} Installation cancelled.`);
      return;
    }
    console.log('');
  }

  copySkills(sourceDir, destination, skills, 'Installed');

  console.log('');
  console.log(`${icon.ok} ${paint('Orbit installed successfully!', 'bold')}`);
  console.log('');
  console.log(paint('Next step:', 'bold'));
  console.log(`  Open ${agent.label} in ${scope.value === 'local' ? 'this project' : 'any project'} and run:`);
  console.log(`  ${paint('/orbit', 'cyan')}`);
  console.log('');
}

async function update({ agent, scope }, sourceDir, skills) {
  const destination = destinationFor(agent, scope);
  const existing = listInstalledOrbitSkills(destination);

  if (existing.length === 0) {
    console.error(`${icon.err} No Orbit skills found at ${destination}`);
    console.error('Run `orbit init` first.');
    process.exit(1);
  }

  console.log(`${icon.arrow} ${paint('Update plan', 'bold')}`);
  console.log(`  Agent:       ${agent.label}`);
  console.log(`  Scope:       ${scope.label}`);
  console.log(`  Source:      ${sourceDir}`);
  console.log(`  Destination: ${destination}`);
  console.log(`  Skills:      ${skills.length}`);
  console.log('');

  copySkills(sourceDir, destination, skills, 'Updated');

  console.log('');
  console.log(`${icon.ok} ${paint('Orbit skills updated successfully!', 'bold')}`);
  console.log('');
}

async function uninstall({ agent, scope }, packagedSkills) {
  const destination = destinationFor(agent, scope);
  const packaged = new Set(packagedSkills);
  const installed = listInstalledOrbitSkills(destination).filter((skill) => packaged.has(skill));

  if (installed.length === 0) {
    console.error(`${icon.err} No packaged Orbit skills found at ${destination}`);
    process.exit(1);
  }

  console.log(`${icon.arrow} ${paint('Uninstall plan', 'bold')}`);
  console.log(`  Agent:       ${agent.label}`);
  console.log(`  Scope:       ${scope.label}`);
  console.log(`  Destination: ${destination}`);
  console.log('');
  console.log('  Will remove:');
  for (const skill of installed) {
    console.log(`  - ${skill}`);
  }
  console.log('');

  const confirmation = await select('Remove these Orbit skills?', [
    { value: false, label: 'No', hint: 'keep installed' },
    { value: true, label: 'Yes', hint: 'delete Orbit skills' },
  ]);

  if (!confirmation.value) {
    console.log(`${icon.warn} Uninstall cancelled.`);
    return;
  }

  for (const skill of installed) {
    fs.rmSync(path.join(destination, skill), { recursive: true, force: true });
    console.log(`${icon.ok} Removed ${skill}`);
  }

  console.log('');
  console.log(`${icon.ok} ${paint('Orbit skills removed successfully!', 'bold')}`);
  console.log('');
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(`Orbit ${packageInfo().version}`);
    return;
  }

  printBanner();

  const sourceDir = skillsSourceDir();
  if (!sourceDir) {
    console.error(`${icon.err} Could not find Orbit skills.`);
    console.error(paint('Run this from the Orbit repository, or use the published npm package.', 'dim'));
    process.exit(1);
  }

  const skills = listOrbitSkills(sourceDir);
  if (skills.length === 0) {
    console.error(`${icon.err} No Orbit skills found in ${sourceDir}`);
    process.exit(1);
  }

  if (options.command === 'init') {
    const choices = await resolveChoices('Which agent do you use?', 'Where should Orbit be installed?');
    await install(choices, sourceDir, skills);
    return;
  }

  if (options.command === 'update') {
    const choices = await resolveChoices('Which agent do you want to update?', 'Which installation should be updated?');
    await update(choices, sourceDir, skills);
    return;
  }

  if (options.command === 'uninstall') {
    const choices = await resolveChoices('Which agent do you want to uninstall from?', 'Which installation should be removed?');
    await uninstall(choices, skills);
  }
}

main().catch((error) => {
  console.error(`${icon.err} ${error.message}`);
  process.exit(1);
});
