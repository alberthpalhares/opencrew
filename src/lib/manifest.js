// Manifest of the files OpenCrew delivered (path → sha256). It lets `update` tell a file the
// user edited (copy it to .opencrew-backup/ before replacing) from one that is just older.
// Workspaces without a manifest (≤ 1.5.0): any file that differs from the new package is copied.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { exists } from './fsx.js';

export const MANIFEST = path.join('_opencrew', 'manifest.json');

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (target, abs) => path.relative(target, abs).split(path.sep).join('/');

/** @returns {Promise<{files: Record<string,string>} | null>} null = no (or unreadable) manifest */
export async function readManifest(target) {
  try {
    const data = JSON.parse(await fs.readFile(path.join(target, MANIFEST), 'utf8'));
    return data && typeof data.files === 'object' ? data : null;
  } catch {
    return null;
  }
}

export async function writeManifest(target, version, files) {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(path.join(target, MANIFEST), JSON.stringify({ version, files: sorted }, null, 2) + '\n');
}

/**
 * Delivery context shared by one init/update run.
 * @param {string} target project root
 * @param {{files:Record<string,string>}|null} manifest previous manifest (null = none)
 */
export function newDelivery(target, manifest) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return { target, manifest, backupDir: path.join(target, '.opencrew-backup', stamp), files: {}, copied: [], written: 0 };
}

/**
 * Put `content` at `dest`. Missing → write. Equal → nothing. Different → only if `overwrite`,
 * copying the current file to the backup dir first when the user edited it.
 */
export async function deliverFile(ctx, dest, content, { overwrite }) {
  const key = rel(ctx.target, dest);
  const fresh = sha(content);
  if (!(await exists(dest))) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
    ctx.files[key] = fresh;
    ctx.written += 1;
    return;
  }
  const current = sha(await fs.readFile(dest));
  if (current === fresh) {
    ctx.files[key] = fresh;
    return;
  }
  if (!overwrite) return; // the user's version stays (and is not tracked)
  const edited = ctx.manifest ? ctx.manifest.files[key] !== current : true;
  if (edited) {
    const copy = path.join(ctx.backupDir, key);
    await fs.mkdir(path.dirname(copy), { recursive: true });
    await fs.copyFile(dest, copy);
    ctx.copied.push(key);
  }
  await fs.writeFile(dest, content);
  ctx.files[key] = fresh;
  ctx.written += 1;
}

/** deliverFile for every file under `src`, mirrored into `dest`. */
export async function deliverTree(ctx, src, dest, { overwrite, skip = () => false }) {
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const from = path.join(dir, entry.name);
      const relPath = path.relative(src, from).split(path.sep).join('/');
      if (skip(relPath)) continue;
      if (entry.isDirectory()) await walk(from);
      else await deliverFile(ctx, path.join(dest, relPath), await fs.readFile(from), { overwrite });
    }
  }
  await walk(src);
}
