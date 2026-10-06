// What `update` does beyond refreshing _opencrew/core and the catalog skills, so that every
// improvement reaches people who already use OpenCrew (AGENTS.md rule 14). The helpers of
// `init --repair-bridges` live here too, with the version guard the two commands share.
// The IDE detection itself is in ./deteccao.js.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists } from './fsx.js';
import { allIdeIds } from './ides.js';
import { writeManifest } from './manifest.js';
import { copyLine } from './blocos.js';
import { detectInstalledIdes } from './deteccao.js';

/** Semver compare (no pre-release tags): >0 if a > b, <0 if a < b, 0 if equal. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Version stamped in the workspace by the last init or update that finished; null = no stamp. */
export async function installedVersion(target) {
  const stamp = path.join(target, '_opencrew', '.opencrew-version');
  return (await exists(stamp)) ? (await fs.readFile(stamp, 'utf8')).trim() : null;
}

const RUN_UPDATE = 'Nada foi alterado. Rode `npx @aksp/opencrew@latest update`: ele já atualiza as pontes. Para a ponte de uma IDE nova, repita este comando depois.';

/**
 * Spec R2, rule 6: `init --repair-bridges` only rewrites with the package at the version
 * stamped in the workspace. An older package would bring old bridges back; a newer one would
 * point them to files the project does not have yet. No stamp (interrupted install): it runs.
 * @returns {Promise<string|null>} the message that stops the repair, or null to go on
 */
export async function repairVersionGuard(target, version) {
  const installed = await installedVersion(target);
  const diff = installed ? compareVersions(installed, version) : 0;
  if (!diff) return null;
  return diff > 0
    ? `Você tem a v${installed} instalada e este pacote é a v${version} (mais antigo). ${RUN_UPDATE}`
    : `Este projeto está na v${installed} e este pacote é a v${version} (mais novo). O reparo não atualiza o projeto. ${RUN_UPDATE}`;
}

/**
 * IDE ids `init --repair-bridges` rewrites when --ide is not given: every IDE with --all,
 * otherwise the ones `update` would detect. --yes chooses nothing here.
 */
export async function repairIdeIds(target, { all } = {}) {
  if (all) return allIdeIds();
  return (await detectInstalledIdes(target)).map((ide) => ide.id);
}

/** `init --repair-bridges` found no bridge and got neither --ide nor --all. */
export const NO_BRIDGES_FOUND =
  `Não encontrei pontes de IDE aqui. Use \`--ide=<id>\` para escolher. Ids válidos: ${allIdeIds().join(', ')}.`;

/** `init --repair-bridges` in a folder that is not a workspace: the repair never installs. */
export const NO_WORKSPACE =
  'Não encontrei um workspace do OpenCrew nesta pasta. O reparo não instala: para instalar, rode `npx @aksp/opencrew@latest init`.';

/**
 * Add the bridges a repair rewrote to the manifest — only when the workspace has one. Without
 * it (installed up to 1.5.0) none is created: a bridges-only manifest would make the next
 * `update` call every older file "edited by you" and hide its first-protected-update notice.
 */
export async function recordRepair(ctx, version) {
  if (ctx.manifest) await writeManifest(ctx.target, version, { ...ctx.manifest.files, ...ctx.files });
}

/** Summary lines of a delivery's backup copies, each with its path in .opencrew-backup/<date>/. */
export function backupSummary(ctx) {
  if (!ctx.copied.length) return [];
  const dir = path.relative(ctx.target, ctx.backupDir).split(path.sep).join('/');
  return [
    `${ctx.copied.length} cópia(s) de segurança feita(s) antes de regravar:`,
    ...ctx.copied.map((file) => `    ${copyLine(ctx, file, `${dir}/${file}`)}`),
  ];
}

// The bridges themselves are written by `deliverBridges` (./blocos.js), for init, update and
// repair; the project's .mcp.json is handled in ./mcp.js.

// ── What an old OpenSquad install left behind (R2 rule 16): only reported, never touched ──

const OLD_DIR = '_opensquad/';
// Folders where a `.md` that cites `_opensquad/` is reported, down to two subfolders.
const LEFTOVER_ROOTS = ['.gemini/skills', '.claude/skills', '.agents/skills', '.agent/workflows', '.agent/rules'];
// Bridges of the OpenSquad reported by their exact path (checked with `opensquad` 0.1.15).
const LEFTOVER_BRIDGES = [
  '.cursor/rules/opensquad.mdc',
  '.cursor/commands/opensquad.md',
  '.opencode/commands/opensquad.md',
  '.qwen/skills/opensquad/SKILL.md',
  '.trae/rules/opensquad.md',
  '.github/prompts/opensquad.prompt.md',
  '.agents/skills/opensquad/SKILL.md',
];

/** A folder `opensquad/` or a file `opensquad.*` in the path: a bridge of the OpenSquad. */
const namedOpensquad = (file) => file.split('/').some((part, i, parts) => (
  i < parts.length - 1 ? part === 'opensquad' : part.startsWith('opensquad.')));

/** The `.md` files under `root` (two subfolders deep) that cite `_opensquad/`. */
async function citingOldDir(target, root) {
  const found = [];
  async function walk(dir, depth) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 2) await walk(p, depth + 1);
      else if (e.isFile() && e.name.endsWith('.md') && (await fs.readFile(p, 'utf8')).includes(OLD_DIR)) {
        found.push(path.relative(target, p).split(path.sep).join('/'));
      }
    }
  }
  await walk(path.join(target, root), 0);
  return found;
}

/** The file of `_opensquad/` the `playwright` server of .mcp.json points to; null when none. */
async function oldPlaywrightConfig(target) {
  let args;
  try {
    args = JSON.parse(await fs.readFile(path.join(target, '.mcp.json'), 'utf8')).mcpServers.playwright.args;
  } catch { return null; }
  if (!Array.isArray(args)) return null;
  const values = args.map((a) => String(a)).map((a) => (a.startsWith('--') && a.includes('=') ? a.slice(a.indexOf('=') + 1) : a));
  return values.find((v) => v.replace(/\\/g, '/').replace(/^\.\//, '').startsWith(OLD_DIR)) ?? null;
}

/**
 * Leftovers of an OpenSquad install that is no longer there. With `_opensquad` at the project
 * root nothing is reported (the system is still installed). Nothing is deleted nor changed.
 * @returns {Promise<{files: Array<{file:string, bridge:boolean}>, config: string|null}>}
 *   `files`, sorted by path: `bridge` = recognised by its name; false = it only cites
 *   `_opensquad/` and may be the user's. `config` = the path of `_opensquad/` (so, missing)
 *   that the `playwright` server of .mcp.json uses.
 */
export async function findLeftovers(target) {
  if (await exists(path.join(target, '_opensquad'))) return { files: [], config: null };
  const found = new Set();
  for (const root of LEFTOVER_ROOTS) for (const file of await citingOldDir(target, root)) found.add(file);
  for (const file of LEFTOVER_BRIDGES) if (await exists(path.join(target, file))) found.add(file);
  const files = [...found].sort().map((file) => ({ file, bridge: namedOpensquad(file) }));
  return { files, config: await oldPlaywrightConfig(target) };
}
