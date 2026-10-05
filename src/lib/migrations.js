// What `update` does beyond refreshing _opencrew/core and the catalog skills, so that every
// improvement reaches people who already use OpenCrew (AGENTS.md rule 14). The IDE detection
// is shared with `init --repair-bridges`, whose helpers live here too.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists, writeBridgeFile } from './fsx.js';
import { IDES, allIdeIds } from './ides.js';
import { deliverFile, writeManifest } from './manifest.js';

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

const sharedPaths = (() => {
  const count = new Map();
  for (const ide of IDES) for (const f of ide.files) count.set(f.path, (count.get(f.path) ?? 0) + 1);
  return new Set([...count].filter(([, n]) => n > 1).map(([p]) => p));
})();

async function hasOpencrew(file) {
  return (await exists(file)) && /opencrew/i.test(await fs.readFile(file, 'utf8'));
}

/**
 * IDEs installed in `target`, detected by their own bridge files (a path shared by several
 * IDEs only counts for an IDE that has no file of its own — e.g. Codex).
 */
export async function detectInstalledIdes(target) {
  const found = [];
  for (const ide of IDES) {
    const own = ide.files.filter((f) => !sharedPaths.has(f.path));
    const probes = own.length ? own : ide.files;
    for (const f of probes) {
      if (await hasOpencrew(path.join(target, f.path))) {
        found.push(ide);
        break;
      }
    }
  }
  return found;
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
    ...ctx.copied.map((file) => `    ${dir}/${file}`),
  ];
}

/** Rewrite the bridges of the installed IDEs only (frontmatter files whole, others by block). */
export async function refreshBridges(ctx, ides) {
  const done = new Set();
  for (const ide of ides) {
    for (const f of ide.files) {
      if (done.has(f.path)) continue;
      done.add(f.path);
      const file = path.join(ctx.target, f.path);
      if (f.content.startsWith('---')) await deliverFile(ctx, file, f.content, { overwrite: true });
      else await writeBridgeFile(file, f.content);
    }
  }
}

const OUTPUT_DIR = ['--output-dir', '_opencrew/logs/playwright'];

/**
 * Merge the Playwright server of the template into the project's .mcp.json without touching
 * other servers. @returns 'created' | 'updated' | 'unchanged' | 'invalid'
 */
export async function mergeMcp(target, templateFile) {
  const file = path.join(target, '.mcp.json');
  const template = JSON.parse(await fs.readFile(templateFile, 'utf8'));
  if (!(await exists(file))) {
    await fs.writeFile(file, JSON.stringify(template, null, 2) + '\n');
    return 'created';
  }
  let current;
  try {
    current = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return 'invalid';
  }
  current.mcpServers ??= {};
  const pw = current.mcpServers.playwright;
  if (!pw) current.mcpServers.playwright = template.mcpServers.playwright;
  else if (Array.isArray(pw.args) && !pw.args.includes('--output-dir')) pw.args.push(...OUTPUT_DIR);
  else return 'unchanged';
  await fs.writeFile(file, JSON.stringify(current, null, 2) + '\n');
  return 'updated';
}

const LEGACY_ROOTS = ['.gemini/skills', '.claude/skills', '.agents/skills', '.agent/workflows', '.agent/rules'];

/** Old bridges that point to a system no longer installed (e.g. `_opensquad/`). Never deleted. */
export async function findLegacyBridges(target) {
  if (await exists(path.join(target, '_opensquad'))) return [];
  const found = [];
  async function walk(dir, depth) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 2) await walk(p, depth + 1);
      else if (e.isFile() && e.name.endsWith('.md') && /_opensquad\//.test(await fs.readFile(p, 'utf8'))) {
        found.push(path.relative(target, p).split(path.sep).join('/'));
      }
    }
  }
  for (const root of LEGACY_ROOTS) await walk(path.join(target, root), 0);
  return found;
}
