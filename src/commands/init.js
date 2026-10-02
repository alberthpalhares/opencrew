import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { exists, writeFileSafe, readJson, writeBridgeFile } from '../lib/fsx.js';
import { newDelivery, deliverTree, deliverFile, writeManifest, readManifest } from '../lib/manifest.js';
import { ideById, allIdeIds, AGENTS_BRIDGE } from '../lib/ides.js';
import { pickIdes as promptIdes } from '../lib/prompts.js';
import { UsageError } from '../lib/errors.js';
import { c, log, info, ok, warn, step } from '../lib/ui.js';

const STAMP = path.join('_opencrew', '.opencrew-version');
// .gitignore / .env.example belong to the user: opencrew only owns a marked block at the end.
const SHARED_BLOCK = { comment: 'hash', position: 'append' };

/**
 * @param {object} opts  parsed CLI options
 * @param {{ pickIdes?: () => Promise<string[]> }} deps  injectable for tests
 */
export async function init(opts = {}, { pickIdes = promptIdes } = {}) {
  const target = process.cwd();
  const pkg = await readJson(packageJsonPath);
  const version = pkg.version;
  const state = await workspaceState(target);

  // --repair-bridges mode: regenerate IDE bridge files in an existing workspace.
  if (opts['repair-bridges'] && state !== 'none') {
    const ids = await resolveIdes(opts, async () => allIdeIds());
    log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — repairing IDE bridges`);
    log(c.dim(`Target: ${target}\n`));
    const previous = await readManifest(target);
    const repairCtx = newDelivery(target, previous);
    await writeBridges(target, ids, { overwrite: true, ctx: repairCtx });
    await writeManifest(target, version, { ...(previous?.files ?? {}), ...repairCtx.files });

    log(`\n${c.green(c.bold('Done!'))} IDE bridges regenerated.\n`);
    log(`${c.bold('Next step:')} Restart your IDE, then type ${c.cyan('/opencrew')} to verify.\n`);
    return;
  }

  if (state === 'complete') {
    warn('An opencrew workspace already exists here.');
    info(`To update only the framework, use: ${c.cyan('npx @aksp/opencrew update')}`);
    info(`To repair IDE bridges, use: ${c.cyan('npx @aksp/opencrew init --repair-bridges')}`);
    info(`To reinstall from scratch, delete _opencrew/ first, then run init again.`);
    return;
  }

  // Every choice is resolved BEFORE the first write: a bad --ide or Ctrl+C on the
  // prompt leaves the folder exactly as it was.
  const ids = await resolveIdes(opts, pickIdes);

  log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — scaffolding a crew workspace`);
  log(c.dim(`Target: ${target}\n`));
  if (state === 'partial') info('A previous install was interrupted — resuming (existing files are kept).');

  // 1. Copy the framework payload (never clobber user work).
  step('Installing framework files');
  const ctx = newDelivery(target, null);
  const copied = await installPayload(target, ctx);
  ok(`Framework files ready (${copied} written, existing files preserved)`);

  // 2. System doc + root configs.
  step('Writing configuration');

  // Full system definition lives in _opencrew/core/ — never at project root.
  // The root AGENTS.md is just a thin bridge (like CLAUDE.md, GEMINI.md, etc.).
  await deliverFile(ctx, path.join(target, '_opencrew', 'core', 'system.md'), await tpl('AGENTS.md'), { overwrite: true });
  ok('_opencrew/core/system.md (full system definition)');

  const agentsResult = await writeBridgeFile(path.join(target, 'AGENTS.md'), AGENTS_BRIDGE);
  if (agentsResult.merged) info('AGENTS.md (merged — existing content preserved)');
  else ok('AGENTS.md (bridge to system.md)');

  const mcpWritten = await writeFileSafe(path.join(target, '.mcp.json'), await tpl('.mcp.json'), {
    overwrite: false,
  });
  info(mcpWritten ? '.mcp.json' : '.mcp.json (kept existing)');

  for (const [file, template] of [['.env.example', '.env.example'], ['.gitignore', 'gitignore']]) {
    const res = await writeBridgeFile(path.join(target, file), await tpl(template), SHARED_BLOCK);
    info(res.merged ? `${file} (opencrew block added at the end — your lines kept)` : file);
  }

  // 3. IDE bridge files.
  step('Configuring AI IDEs');
  await writeBridges(target, ids, { overwrite: false, ctx });

  if (ids.includes('claude-code')) {
    warn(`opencrew ships its own Playwright MCP server (.mcp.json) — disable Claude Code's`);
    warn(`native Playwright plugin/extension to avoid the two conflicting.`);
  }

  // 4. Manifest (what OpenCrew delivered — lets `update` spot the user's edits), then the
  // version stamp LAST: it is what marks the install as complete.
  await writeManifest(target, version, ctx.files);
  await fs.writeFile(path.join(target, STAMP), version + '\n');

  // 5. Done.
  log(`\n${c.green(c.bold('Done!'))} opencrew is installed.\n`);
  log(`${c.bold('Next steps:')}`);
  log(`  1. Open this folder in your AI IDE.`);
  log(`  2. Type ${c.cyan('/opencrew')} to start (first run sets up your company profile).`);
  log(`     No API keys needed up front — opencrew asks for them in chat only if a skill you use requires one.\n`);
}

/**
 * Copy the framework payload into `target` without overwriting anything.
 * Never copies the version stamp: only a finished init writes it.
 * @returns {Promise<number>} files written
 */
export async function installPayload(target, ctx = newDelivery(target, null)) {
  await deliverTree(ctx, path.join(templatesDir, '_opencrew'), path.join(target, '_opencrew'), {
    overwrite: false,
    // Never ship stray logs, browser sessions or the template's own stamp.
    skip: (rel) =>
      (rel.startsWith('logs/') && rel !== 'logs/.gitkeep') ||
      rel.startsWith('_browser_profile/') ||
      rel === '.opencrew-version',
  });
  await deliverTree(ctx, path.join(templatesDir, 'skills'), path.join(target, 'skills'), { overwrite: false });
  await deliverTree(ctx, path.join(templatesDir, 'crews'), path.join(target, 'crews'), { overwrite: false });
  return ctx.written;
}

/** 'none' (no core) · 'partial' (core without stamp: interrupted install) · 'complete'. */
async function workspaceState(target) {
  if (!(await exists(path.join(target, '_opencrew', 'core')))) return 'none';
  return (await exists(path.join(target, STAMP))) ? 'complete' : 'partial';
}

/**
 * Decide which IDEs to configure. --all / --yes → every IDE; --ide → validated list;
 * nothing → `fallback()` (the interactive prompt). Throws UsageError if --ide names no
 * valid IDE.
 */
async function resolveIdes(opts, fallback) {
  if (opts.all || opts.yes) return allIdeIds();
  const ids = normalizeIdes(opts.ide);
  if (!ids) return fallback();
  const invalid = ids.filter((id) => !ideById(id));
  const valid = ids.filter((id) => ideById(id));
  if (!valid.length) {
    throw new UsageError(`Unknown IDE "${invalid.join('", "')}". Valid: ${allIdeIds().join(', ')}`);
  }
  for (const id of invalid) warn(`Unknown IDE "${id}" — skipped. Valid: ${allIdeIds().join(', ')}`);
  return valid;
}

/**
 * Write IDE bridge files to the target directory.
 * @param {string} target — project root
 * @param {string[]} ids — validated IDE ids to configure
 * @param {{ overwrite: boolean }} opts
 */
async function writeBridges(target, ids, { overwrite, ctx }) {
  const writtenPaths = new Set();

  for (const id of ids) {
    const ide = ideById(id);
    for (const f of ide.files) {
      if (writtenPaths.has(f.path)) {
        info(`${f.path} (shared path — written once)`);
        continue;
      }
      writtenPaths.add(f.path);
      const fp = path.join(target, f.path);
      const hasFrontmatter = f.content.startsWith('---');
      if (hasFrontmatter) {
        await deliverFile(ctx, fp, f.content, { overwrite });
      } else {
        const result = await writeBridgeFile(fp, f.content);
        if (result.merged) info(`${f.path} (merged — existing content preserved)`);
        else if (result.written && overwrite) info(`${f.path} (regenerated)`);
      }
    }
    ok(`${ide.label} → ${ide.files.map((f) => f.path).join(', ')}`);
  }
}

async function tpl(name) {
  return fs.readFile(path.join(templatesDir, name), 'utf8');
}

function normalizeIdes(val) {
  if (!val || val === true) return null;
  const list = Array.isArray(val) ? val : String(val).split(',');
  const ids = list.map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}
