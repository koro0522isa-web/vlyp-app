#!/usr/bin/env node
// Pre-commit guard: 書きかけコミット事故防止
// - NULL byte 含むソースを拒否
// - ファイル末尾が文字列 (' or ") の中 / JSXタグ '<' の途中で終わってるソースを拒否
// - サイズ 0 のソースを拒否 (誤って消したケース)

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const exts = /\.(ts|tsx|js|jsx)$/;

function staged() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter((s) => s && exts.test(s) && fs.existsSync(s));
  } catch {
    return [];
  }
}

const problems = [];
for (const f of staged()) {
  let data;
  try { data = fs.readFileSync(f); } catch { continue; }

  // 1. NULL bytes
  if (data.includes(0x00)) {
    const n = data.filter ? data.filter((b) => b === 0).length : [...data].filter((b) => b === 0).length;
    problems.push(`${f}: contains ${n} NULL byte(s) — file is corrupted (Windows editor save failure?)`);
    continue;
  }

  // 2. zero size
  if (data.length === 0) {
    problems.push(`${f}: file is empty (0 bytes). Did you mean to delete it instead?`);
    continue;
  }

  // 3. truncated tail patterns: ends mid-string or mid-JSX
  const text = data.toString('utf8');
  const trimmed = text.replace(/\s+$/, '');
  const lastChar = trimmed.slice(-1);

  // ends with '<' alone => unfinished JSX
  if (/\n\s*<\s*$/.test(text)) {
    problems.push(`${f}: file ends with a bare '<' (truncated JSX tag).`);
    continue;
  }

  // unmatched string quotes at EOF (very rough heuristic): last line contains an unterminated string
  const lastLine = trimmed.split('\n').pop() || '';
  if (/["'`][^"'`]*$/.test(lastLine) && !/^\s*\/\//.test(lastLine)) {
    // allow if the line ends with backtick continuation common in template literals
    if (!/`\s*$/.test(lastLine)) {
      problems.push(`${f}: last line looks like an unterminated string: "${lastLine.slice(-60)}"`);
      continue;
    }
  }

  // ends with a TSX class attribute open: e.g. className="
  if (/=\s*"[^"]*$/.test(lastLine) || /=\s*'[^']*$/.test(lastLine)) {
    problems.push(`${f}: last line has an unterminated attribute value: "${lastLine.slice(-60)}"`);
    continue;
  }
}

if (problems.length) {
  console.error('\n[check-source-integrity] commit blocked — corrupted/truncated source detected:\n');
  for (const p of problems) console.error('  ✖ ' + p);
  console.error('\nFix or unstage the file(s) and retry.\n');
  process.exit(1);
}

process.exit(0);
