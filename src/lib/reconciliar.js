// What `update` reconciles with the package (spec U7-F3): the files the package no longer delivers
// (orphans: removed with a copy when the user did not edit them, left when they did), the skills
// the user uninstalled (not brought back), and the lines the summary says about both.
// The one rule that outranks the rest: nothing that is the user's is removed — the manifest only
// knows what this CLI delivered, and only four folders of it are looked at.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from './paths.js';
import { backupFile, hashOf } from './manifest.js';

/** The only folders (relative to the project, with `/`) where a file can be an orphan. */
export const PREFIXES = ['_opencrew/core/', '_opencrew/agents/', '_opencrew/config/', 'skills/'];
const NEVER = 'skills/.custom/'; // the user's own skills: not even a forged manifest entry reaches them
const MAX_LISTED = 20;

const keyToPath = (target, key) => path.join(target, ...key.split('/'));
const prefixOf = (key) => PREFIXES.find((p) => key.startsWith(p));

/**
 * A manifest key that may name an orphan: normalized it stays under one of the four folders, it is
 * not absolute and has no backslash, colon or `..` segment. Anything else is ignored.
 */
export function candidateKey(key) {
  if (typeof key !== 'string' || key.includes('#') || key.includes('\\') || key.includes(':') || key.startsWith('/')) return false;
  if (key.split('/').includes('..') || path.posix.normalize(key) !== key) return false;
  return Boolean(prefixOf(key)) && !key.startsWith(NEVER);
}

/** Every file the package delivers under the four folders, as manifest keys (`init` and `update` write the same). */
export async function payloadKeys() {
  const keys = new Set(['_opencrew/core/system.md']);
  async function walk(dir, base) {
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory()) await walk(path.join(dir, e.name), `${base}${e.name}/`);
      else keys.add(`${base}${e.name}`);
    }
  }
  await walk(path.join(templatesDir, '_opencrew', 'core'), '_opencrew/core/');
  await walk(path.join(templatesDir, '_opencrew', 'agents'), '_opencrew/agents/');
  await walk(path.join(templatesDir, '_opencrew', 'config'), '_opencrew/config/');
  await walk(path.join(templatesDir, 'skills'), 'skills/');
  return keys;
}

const skillOf = (key) => (key.startsWith('skills/') ? key.split('/')[1] : null);

/**
 * The skills the user uninstalled: the manifest knows files of `skills/<name>/`, the package still
 * delivers it, and the folder is gone (or empty). A folder that is there without its SKILL.md is
 * not uninstalled: the missing files come back. Only reads.
 */
export async function findUninstalled(target, manifest, payload) {
  const names = new Set();
  for (const key of Object.keys(manifest?.files ?? {})) {
    const name = candidateKey(key) ? skillOf(key) : null;
    if (name && [...payload].some((k) => k.startsWith(`skills/${name}/`))) names.add(name);
  }
  const gone = new Set();
  for (const name of names) {
    const inside = await fs.readdir(path.join(target, 'skills', name)).catch(() => null);
    if (!inside || inside.length === 0) gone.add(name);
  }
  return gone;
}

/** `findUninstalled`, and the manifest entries of those skills are carried to the next manifest. */
export async function uninstalledSkills(ctx, payload) {
  const gone = await findUninstalled(ctx.target, ctx.manifest, payload);
  for (const [key, hash] of Object.entries(ctx.manifest?.files ?? {})) {
    if (candidateKey(key) && gone.has(skillOf(key))) ctx.files[key] = hash;
  }
  return gone;
}

const fold = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

/**
 * Is the folder of `key` really where the key says, inside the project? No link (or junction) on the
 * way, not even one that points to another place of the project: the real path of the folder must be
 * the real path of the project plus the folder of the key.
 */
async function folderInPlace(target, key) {
  try {
    const root = await fs.realpath(target);
    const real = await fs.realpath(path.dirname(keyToPath(target, key)));
    return fold(real) === fold(path.join(root, ...key.split('/').slice(0, -1)));
  } catch {
    return false;
  }
}

/**
 * What would happen to each orphan, without touching anything. `remove`: not edited; `edited`: the
 * user's now, it stays; the rest is ignored (a link, a link folder, a gone file, a strange key).
 * @returns {Promise<{remove: string[], edited: string[]}>}
 */
export async function planOrphans(target, manifest, payload) {
  const plan = { remove: [], edited: [] };
  for (const [key, recorded] of Object.entries(manifest?.files ?? {})) {
    if (!candidateKey(key) || payload.has(key)) continue;
    const abs = keyToPath(target, key);
    const info = await fs.lstat(abs).catch(() => null);
    if (!info || info.isSymbolicLink() || !(await folderInPlace(target, key))) continue;
    const text = info.isFile() ? await fs.readFile(abs).catch(() => null) : null;
    (text !== null && hashOf(text) === recorded ? plan.remove : plan.edited).push(key);
  }
  return plan;
}

async function pruneEmptyFolders(target, key) {
  const root = path.join(target, ...prefixOf(key).split('/').filter(Boolean));
  for (let dir = path.dirname(keyToPath(target, key)); dir !== root && dir.startsWith(root); dir = path.dirname(dir)) {
    try {
      await fs.rmdir(dir); // not recursive: a folder with anything in it stays
    } catch {
      return;
    }
  }
}

/**
 * Remove the orphans the user did not edit — link? → hash → copy → remove, in that order, and no
 * copy means no removal. Whatever is not removed and was edited is reported; the manifest is
 * rebuilt from `ctx.files`, so removed and edited orphans are no longer in it.
 * @returns {Promise<{removed: string[], edited: string[]}>}
 */
export async function removeOrphans(ctx, payload) {
  const { remove, edited } = await planOrphans(ctx.target, ctx.manifest, payload);
  const removed = [];
  for (const key of remove) {
    await backupFile(ctx, key);
    if (!ctx.copied.includes(key)) { edited.push(key); continue; }
    try {
      await fs.rm(keyToPath(ctx.target, key));
      removed.push(key);
      await pruneEmptyFolders(ctx.target, key);
    } catch {
      edited.push(key); // read-only, in use: it stays, and it is said
    }
  }
  return { removed, edited };
}

const list = (keys) => (keys.length > MAX_LISTED ? `${keys.slice(0, MAX_LISTED).join(', ')} … e mais ${keys.length - MAX_LISTED}` : keys.join(', '));

/** The lines of the `update` summary about the reconciliation: `[mark, text]` for `say`. */
export function reconcileLines(ctx, done) {
  const dir = path.relative(ctx.target, ctx.backupDir).split(path.sep).join('/');
  const { removed = [], edited = [], skills = [], restamped = null } = done;
  return [
    ...(restamped ? [['info', `O carimbo da versão estava ausente: usei a versão do registro (${restamped}) e refiz o carimbo.`]] : []),
    ...(removed.length ? [['ok', `Arquivos que saíram do pacote e foram removidos (cópia em ${dir}/): ${list(removed)}.`]] : []),
    ...(edited.length ? [['warn', `Arquivos que saíram do pacote, mas você editou, então ficaram onde estão (agora são seus): ${list(edited)}.`]] : []),
    ...(skills.length ? [['info', `Skill desinstalada, não recriei: ${skills.join(', ')}. Para reinstalar: peça /opencrew → skills → instalar.`]] : []),
  ];
}

/** The lines of `update --check`: what a real `update` would remove, keep and not bring back. Writes nothing. */
export async function previewLines(target, manifest) {
  if (!manifest) return [];
  const payload = await payloadKeys();
  const { remove, edited } = await planOrphans(target, manifest, payload);
  const skills = [...(await findUninstalled(target, manifest, payload))];
  return [
    ...(remove.length ? [['warn', `Sairiam do projeto (o pacote novo não traz mais; cópia em .opencrew-backup/): ${list(remove)}.`]] : []),
    ...(edited.length ? [['info', `Ficariam onde estão (você editou): ${list(edited)}.`]] : []),
    ...(skills.length ? [['info', `Skill desinstalada, não recriarei: ${skills.join(', ')}.`]] : []),
  ];
}
