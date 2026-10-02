// What `update` does beyond refreshing _opencrew/core and the catalog skills, so that every
// improvement reaches people who already use OpenCrew (AGENTS.md rule 14).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists, writeBridgeFile } from './fsx.js';
import { IDES } from './ides.js';
import { deliverFile } from './manifest.js';

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
