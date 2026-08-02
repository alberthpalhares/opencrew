// Shared test helpers (not a test file itself — no .test.js suffix).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
