// Shared test helpers (not a test file itself — no .test.js suffix).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

export async function mkTmp(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), `opencrew-${prefix}-`));
}

export async function withCwd(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}

// Every file under `dir` with its sha1 — compare two snapshots to prove nothing changed.
export async function snapshot(dir) {
  const out = [];
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out.push(`${path.relative(dir, p)}:${createHash('sha1').update(await fs.readFile(p)).digest('hex')}`);
    }
  }
  await walk(dir);
  return out.sort();
}

// Run fn while capturing console.log/console.error output.
export async function captureOutput(fn) {
  const lines = [];
  const { log, error } = console;
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.log = log;
    console.error = error;
  }
  return lines.join('\n');
}

export function exitPromptError() {
  const e = new Error('User force closed the prompt with SIGINT');
  e.name = 'ExitPromptError';
  return e;
}
