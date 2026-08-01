// Filesystem helpers (no external deps).
import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

/**
 * Recursively copy `src` into `dest`.
 * @param {object} opts
 * @param {boolean} opts.overwrite  Overwrite existing files (default false).
 * @param {(rel:string)=>boolean} opts.skip  Return true to skip a relative path.
 * @param {(rel:string)=>void} opts.onCopy  Called for each file copied.
 */
export async function copyDir(src, dest, opts = {}) {
  const { overwrite = false, skip = () => false, onCopy, _root = src } = opts;
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    const rel = path.relative(_root, from).split(path.sep).join('/');
    if (skip(rel)) continue;
    if (entry.isDirectory()) {
      await copyDir(from, to, { ...opts, _root });
    } else {
      const present = await exists(to);
      if (present && !overwrite) continue;
      await ensureDir(path.dirname(to));
      await fs.copyFile(from, to);
      if (onCopy) onCopy(rel);
    }
  }
}

export async function writeFileSafe(p, content, { overwrite = true } = {}) {
  if (!overwrite && (await exists(p))) return false;
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, content);
  return true;
}

export async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}
