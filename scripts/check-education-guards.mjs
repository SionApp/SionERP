#!/usr/bin/env node
// scripts/check-education-guards.mjs
//
// CI-checkable guard for the Education module's theming and copy rules
// (spec: education-theming — "No raw hex in education component files,
// MUST be machine-enforced"; education-content-model — "dangerouslySetInnerHTML
// appears nowhere"; education-copy-and-omissions — no "líder", no certificate
// promises). Zero dependencies, deliberately: ESLint can't see inside
// Tailwind arbitrary-value strings or plain template literals, so this walks
// the raw source text instead of the AST.
//
// Usage: node scripts/check-education-guards.mjs
// Exit 0 + silent when clean. Exit 1 + one `file:line: literal — reason`
// line per violation when not.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const TARGET_DIR = join(ROOT, 'src/pages/dashboard/education');

// The theme file is the ONE place hex literals are allowed to live — every
// other education file must resolve color through an edu-* Tailwind alias or
// an existing system token (spec scenario: "The theme file is the single
// exception").
const SKIP_FILES = new Set(['education-theme.css']);
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

const RULES = [
  {
    name: 'raw-hex-color',
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'raw hex color literal — use an edu-* Tailwind alias or a system token instead',
  },
  {
    name: 'dangerously-set-inner-html',
    pattern: /dangerouslySetInnerHTML/g,
    message:
      'dangerouslySetInnerHTML is banned in the education module — walk PMDoc into React elements instead',
  },
  {
    name: 'lider-terminology',
    pattern: /\blíder\b/gi,
    message: '"líder" is banned user-facing terminology in Education — use "instructor" instead',
  },
  {
    name: 'certificate-copy',
    pattern: /ertificado/g,
    message:
      'certificate copy/promises are out of scope for this module — see education-copy-and-omissions',
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  let hasViolations = false;
  const files = walk(TARGET_DIR);

  for (const filePath of files) {
    const fileName = filePath.split('/').pop();
    if (SKIP_FILES.has(fileName)) continue;

    const relPath = relative(ROOT, filePath);
    const lines = readFileSync(filePath, 'utf8').split('\n');

    lines.forEach((line, idx) => {
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        let match;
        while ((match = rule.pattern.exec(line)) !== null) {
          hasViolations = true;
          console.error(`${relPath}:${idx + 1}: ${match[0]} — ${rule.message}`);
        }
      }
    });
  }

  if (hasViolations) {
    console.error('\neducation guard check FAILED — see violations above.');
    process.exit(1);
  }

  console.log(
    'education guard check passed — no raw hex, no dangerouslySetInnerHTML, no banned copy.'
  );
}

main();
