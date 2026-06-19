const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function color(name, message) {
  return `${COLORS[name]}${message}${COLORS.reset}`;
}

function logColor(name, message) {
  console.error(color(name, message));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content);
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeLines(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function isSafeChangeName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);
}

function assertSafeChangeName(name) {
  if (!isSafeChangeName(name)) {
    logColor('red', `✗ Invalid change name: ${name}`);
    console.error('Use only letters, numbers, dots, underscores, and hyphens; path separators are not allowed.');
    process.exit(1);
  }
}

function isPathInside(baseDir, targetPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  return target === base || target.startsWith(`${base}${path.sep}`);
}

function readStateFields(stateFile = '.orbit/state.yaml') {
  if (!fileExists(stateFile)) {
    return {};
  }

  const fields = {};
  for (const line of normalizeLines(readText(stateFile))) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2];
    }
  }
  return fields;
}

function getStateValue(stateFile, key, fallback = '') {
  const fields = readStateFields(stateFile);
  return fields[key] || fallback;
}

function getDocField(stateFile, docType, field) {
  if (!fileExists(stateFile)) {
    return '';
  }

  const lines = normalizeLines(readText(stateFile));
  const docStart = lines.findIndex((line) => line === `  ${docType}:`);
  if (docStart === -1) {
    return '';
  }

  for (let index = docStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^  [^ ].*:/.test(line) || /^[^\s].*:/.test(line)) {
      break;
    }

    const match = line.match(new RegExp(`^    ${field}:\\s*(.*)$`));
    if (match) {
      return match[1];
    }
  }

  return '';
}

function parentFieldFor(docType) {
  return {
    spec: 'based_on_proposal_hash',
    brainstorming: 'based_on_spec_hash',
    plan: 'based_on_brainstorming_hash',
    review: 'based_on_plan_hash',
  }[docType] || '';
}

function upsertDocumentState(stateFile, docType, filePath, hash, parentHash = '') {
  const parentField = parentFieldFor(docType);
  const text = readText(stateFile);
  const hasTrailingNewline = text.endsWith('\n');
  const lines = normalizeLines(text);
  if (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }

  let documentsIndex = lines.findIndex((line) => line === 'documents:');
  if (documentsIndex === -1) {
    if (lines.length && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push('documents:');
    documentsIndex = lines.length - 1;
  }

  let documentsEnd = lines.length;
  for (let index = documentsIndex + 1; index < lines.length; index += 1) {
    if (/^[^\s].*:/.test(lines[index])) {
      documentsEnd = index;
      break;
    }
  }

  let docStart = -1;
  for (let index = documentsIndex + 1; index < documentsEnd; index += 1) {
    if (lines[index] === `  ${docType}:`) {
      docStart = index;
      break;
    }
  }

  if (docStart === -1) {
    const block = [`  ${docType}:`, `    path: ${filePath}`, `    hash: ${hash}`];
    if (parentField && parentHash) {
      block.push(`    ${parentField}: ${parentHash}`);
    }
    lines.splice(documentsEnd, 0, ...block);
  } else {
    let docEnd = documentsEnd;
    for (let index = docStart + 1; index < documentsEnd; index += 1) {
      if (/^  [^ ].*:/.test(lines[index])) {
        docEnd = index;
        break;
      }
    }

    let sawPath = false;
    let sawHash = false;
    let sawParent = false;
    const block = [lines[docStart]];

    for (let index = docStart + 1; index < docEnd; index += 1) {
      const line = lines[index];
      if (/^    path:/.test(line)) {
        sawPath = true;
        block.push(line);
      } else if (/^    hash:/.test(line)) {
        sawHash = true;
        block.push(`    hash: ${hash}`);
      } else if (parentField && new RegExp(`^    ${parentField}:`).test(line)) {
        sawParent = true;
        if (parentHash) {
          block.push(`    ${parentField}: ${parentHash}`);
        }
      } else {
        block.push(line);
      }
    }

    if (!sawPath) {
      block.splice(1, 0, `    path: ${filePath}`);
    }
    if (!sawHash) {
      block.push(`    hash: ${hash}`);
    }
    if (parentField && parentHash && !sawParent) {
      block.push(`    ${parentField}: ${parentHash}`);
    }

    lines.splice(docStart, docEnd - docStart, ...block);
  }

  writeText(stateFile, `${lines.join('\n')}${hasTrailingNewline ? '\n' : '\n'}`);
}

function usage(message) {
  console.error(message);
  process.exit(1);
}

module.exports = {
  color,
  logColor,
  readText,
  writeText,
  fileExists,
  dirExists,
  ensureDir,
  sha256,
  todayLocal,
  assertSafeChangeName,
  isPathInside,
  readStateFields,
  getStateValue,
  getDocField,
  upsertDocumentState,
  usage,
};
