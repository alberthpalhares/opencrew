// Manifest of the files OpenCrew delivered (path → sha256). It lets `update` tell a file the
// user edited (copy it to .opencrew-backup/ before replacing) from one that is just older.
// Workspaces without a manifest (≤ 1.5.0): any file that differs from the new package is copied.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { exists } from './fsx.js';

export const MANIFEST = path.join('_opencrew', 'manifest.json');

// Text files are hashed with LF line endings: an editor, git or a sync tool switching CRLF/LF
// must not make a file look "edited by the user". Binary files (with NUL bytes) are hashed as is.
const normalize = (buf) => {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.includes(0) ? b : Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'));
};
/** sha256 of a file or text as the manifest records it (text with LF line endings). */
export const hashOf = (buf) => createHash('sha256').update(normalize(buf)).digest('hex');
const rel = (target, abs) => path.relative(target, abs).split(path.sep).join('/');

/** A JSON object: not null, not an array. */
export const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The manifest, when it can be used: valid JSON whose `files` is an object with at least one
 * entry. @returns {Promise<{files: Record<string,string>} | null>} null = none, or unreadable
 */
export async function readManifest(target) {
  try {
    const data = JSON.parse(await fs.readFile(path.join(target, MANIFEST), 'utf8'));
    return isRecord(data?.files) && Object.keys(data.files).length ? data : null;
  } catch {
    return null;
  }
}

/**
 * R2 rule 12: the manifest file exists but `readManifest` cannot use it (a merge conflict, a
 * file cut short). The run goes on as in a project with no record — whatever differs from the
 * package is copied first — and says so with UNREADABLE. A missing manifest is not unreadable.
 */
export async function manifestUnreadable(target) {
  return (await exists(path.join(target, MANIFEST))) && !(await readManifest(target));
}

/** Spec R2 §6: `update` before it rewrites, `summary` in its list of copies, `repair` in the repair. */
export const UNREADABLE = {
  update: 'O registro de arquivos (`_opencrew/manifest.json`) está ilegível. Vou tratar esta atualização como a de um projeto sem registro: todo arquivo diferente do pacote novo é copiado para `.opencrew-backup/` antes de ser substituído. O registro é refeito no fim.',
  summary: 'O registro estava ilegível: guardamos tudo o que diferia do pacote novo. Daqui em diante, só o que você editar.',
  repair: 'O registro de arquivos (`_opencrew/manifest.json`) está ilegível; o reparo não o refaz. Rode `npx @aksp/opencrew@latest update` para refazer.',
};

export async function writeManifest(target, version, files) {
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(path.join(target, MANIFEST), JSON.stringify({ version, files: sorted }, null, 2) + '\n');
}

/**
 * Delivery context shared by one init/update/repair run. `files` = what goes into the next
 * manifest; `copied` = files copied to `backupDir`; `blocks` = one result per marked block
 * written by `deliverBlock` (src/lib/blocos.js); `legacy` = one entry per bridge file where
 * the old text of ≤ 1.2.2 was removed or found edited (src/lib/legado.js).
 * @param {string} target project root
 * @param {{files:Record<string,string>}|null} manifest previous manifest (null = none, or unreadable)
 */
export function newDelivery(target, manifest) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(target, '.opencrew-backup', stamp);
  return { target, manifest, backupDir, files: {}, copied: [], blocks: [], legacy: [], written: 0 };
}

/**
 * Copy the file `key` (path relative to the project root, with `/`) to the backup dir before it
 * is changed. Once per run: a second change to the same file must not replace the copy of how
 * the file was. @returns {Promise<boolean>} true when this call made the copy
 */
export async function backupFile(ctx, key) {
  if (ctx.copied.includes(key)) return false;
  const copy = path.join(ctx.backupDir, key);
  await fs.mkdir(path.dirname(copy), { recursive: true });
  await fs.copyFile(path.join(ctx.target, key), copy);
  ctx.copied.push(key);
  return true;
}

/**
 * Put `content` at `dest`. Missing → write. Equal → nothing. Different → only if `overwrite`,
 * copying the current file to the backup dir first when the user edited it.
 * @returns {Promise<{file:string, action:'created'|'updated'|'kept', copied:boolean}>}
 */
export async function deliverFile(ctx, dest, content, { overwrite }) {
  const file = rel(ctx.target, dest);
  const fresh = hashOf(content);
  if (!(await exists(dest))) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
    ctx.files[file] = fresh;
    ctx.written += 1;
    return { file, action: 'created', copied: false };
  }
  const current = hashOf(await fs.readFile(dest));
  if (current === fresh) ctx.files[file] = fresh;
  // Different and no `overwrite`: the user's version stays (and is not tracked).
  if (current === fresh || !overwrite) return { file, action: 'kept', copied: false };
  const edited = ctx.manifest ? ctx.manifest.files[file] !== current : true;
  const copied = edited && (await backupFile(ctx, file));
  await fs.writeFile(dest, content);
  ctx.files[file] = fresh;
  ctx.written += 1;
  return { file, action: 'updated', copied };
}

/**
 * deliverFile for every file under `src`, mirrored into `dest`.
 * @returns {Promise<Array<{file:string, action:string, copied:boolean}>>} one result per file
 */
export async function deliverTree(ctx, src, dest, { overwrite, skip = () => false }) {
  const results = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const from = path.join(dir, entry.name);
      const relPath = path.relative(src, from).split(path.sep).join('/');
      if (skip(relPath)) continue;
      if (entry.isDirectory()) await walk(from);
      else results.push(await deliverFile(ctx, path.join(dest, relPath), await fs.readFile(from), { overwrite }));
    }
  }
  await walk(src);
  return results;
}
