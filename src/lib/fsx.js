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

/** Is `p` a symbolic link (also a dangling one)? Looks at the link itself, never at what it points to. */
export async function isLink(p) {
  try {
    return (await fs.lstat(p)).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Write `p` (creating its folders). A symbolic link is never written through: false, nothing written. */
export async function writeFileSafe(p, content, { overwrite = true } = {}) {
  if (await isLink(p)) return false;
  if (!overwrite && (await exists(p))) return false;
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
  return true;
}

// Marked blocks (`opencrew:start … opencrew:end`) are written by `deliverBlock`, in ./blocos.js.

export async function readFile(p) {
  return fs.readFile(p, 'utf8');
}

export async function readJson(p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch (e) {
    const reason = e.code === 'ENOENT' ? 'file not found' : e.message;
    throw new Error(`Failed to read ${p}: ${reason}`);
  }
}
