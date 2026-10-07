import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { exists, readJson } from '../lib/fsx.js';
import { newDelivery, deliverTree, deliverFile, writeManifest, readManifest, manifestUnreadable, UNREADABLE } from '../lib/manifest.js';
import { deliverBlock, deliverBridges } from '../lib/blocos.js';
import { createMcp } from '../lib/mcp.js';
import { ideById, allIdeIds, AGENTS_BRIDGE } from '../lib/ides.js';
import { pickIdes as promptIdes } from '../lib/prompts.js';
import { UsageError } from '../lib/errors.js';
import { withoutLegacy, legacyLines } from '../lib/legado.js';
import { repairIdeIds, repairVersionGuard, backupSummary, recordRepair, NO_BRIDGES_FOUND, NO_WORKSPACE } from '../lib/migrations.js';
import { ALREADY_INSTALLED } from '../lib/resumo.js';
import { c, log, info, ok, warn, step } from '../lib/ui.js';

const STAMP = path.join('_opencrew', '.opencrew-version');

/**
 * @param {object} opts  parsed CLI options
 * @param {{ pickIdes?: () => Promise<string[]> }} deps  injectable for tests
 */
export async function init(opts = {}, { pickIdes = promptIdes } = {}) {
  const target = process.cwd();
  const pkg = await readJson(packageJsonPath);
  const version = pkg.version;
  const state = await workspaceState(target);

  if (opts['repair-bridges'] && state === 'none') throw new UsageError(NO_WORKSPACE); // before any write
  if (opts['repair-bridges']) return repairBridges(target, version, opts);

  if (state === 'complete') {
    warn('An opencrew workspace already exists here.');
    info(ALREADY_INSTALLED); // R2 rule 15: never tells the user to delete _opencrew/
    info(`To repair IDE bridges, use: ${c.cyan('npx @aksp/opencrew@latest init --repair-bridges')}`);
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

  const agents = await deliverBlock(ctx, 'AGENTS.md', AGENTS_BRIDGE);
  if (agents.action === 'added') info('AGENTS.md (merged — existing content preserved)');
  else ok('AGENTS.md (bridge to system.md)');

  // Created here → recorded in the manifest as delivered; the user's own file is kept as it is.
  info((await createMcp(ctx, await tpl('.mcp.json'))) ? '.mcp.json' : '.mcp.json (kept existing)');

  // .gitignore / .env.example belong to the user: opencrew only owns a marked block at the end.
  for (const [file, template] of [['.env.example', '.env.example'], ['.gitignore', 'gitignore']]) {
    const res = await deliverBlock(ctx, file, await tpl(template));
    info(res.action === 'added' ? `${file} (opencrew block added at the end — your lines kept)` : file);
  }

  // 3. IDE bridge files.
  step('Configuring AI IDEs');
  await writeBridges(ctx, ids, false);

  if (ids.includes('claude-code')) {
    warn(`opencrew ships its own Playwright MCP server (.mcp.json) — disable Claude Code's`);
    warn(`native Playwright plugin/extension to avoid the two conflicting.`);
  }

  // 4. Manifest (what OpenCrew delivered — lets `update` spot the user's edits), then the
  // version stamp LAST: it is what marks the install as complete.
  await writeManifest(target, version, ctx.files);
  await fs.writeFile(path.join(target, STAMP), version + '\n');
  reportBackups(ctx); // a reinstall over blocks the user edited copies those files first

  // 5. Done.
  log(`\n${c.green(c.bold('Done!'))} opencrew is installed.\n`);
  log(`${c.bold('Next steps:')}`);
  log(`  1. Open this folder in your AI IDE.`);
  log(`  2. Type ${c.cyan('/opencrew')} to start (first run sets up your company profile).`);
  log(`     No API keys needed up front — opencrew asks for them in chat only if a skill you use requires one.\n`);
}

/**
 * --repair-bridges: rewrite IDE bridge files in an existing workspace. --ide wins (even next
 * to --all); --all alone means every IDE; otherwise only the IDEs `update` would detect.
 * Only with the package at the version of the workspace (R2 rule 6), whatever the options.
 */
async function repairBridges(target, version, opts) {
  const otherVersion = await repairVersionGuard(target, version);
  if (otherVersion) throw new Error(otherVersion); // before any write; exit 1, no usage hint
  const ids = await resolveIdes({ ide: opts.ide }, () => repairIdeIds(target, opts));
  if (!ids.length) throw new UsageError(NO_BRIDGES_FOUND); // before the first write
  log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — repairing IDE bridges`);
  log(c.dim(`Target: ${target}\n`));
  const ctx = newDelivery(target, await readManifest(target));
  await withoutLegacy(ctx, ids.map(ideById), () => writeBridges(ctx, ids, true)); // R2 rule 3
  for (const line of legacyLines(ctx)) warn(line);
  if (await manifestUnreadable(target)) warn(UNREADABLE.repair); // R2 rule 12: copied as with none
  await recordRepair(ctx, version); // only where a manifest already exists (and can be read)
  reportBackups(ctx);
  log(`\n${c.green(c.bold('Done!'))} IDE bridges regenerated.\n`);
  log(`${c.bold('Next step:')} Restart your IDE, then type ${c.cyan('/opencrew')} to verify.\n`);
}

/** Say where the backup copies of this run are (nothing when none was made). */
function reportBackups(ctx) {
  const [copied, ...copies] = backupSummary(ctx);
  if (copied) warn(copied);
  for (const copy of copies) log(copy);
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
 * Decide which IDEs to configure. --ide → validated list, whatever comes with it; without it,
 * --all / --yes → every IDE; nothing → `fallback()` (the interactive prompt; in repair mode, the
 * detection). Throws UsageError if --ide names no valid IDE.
 */
async function resolveIdes(opts, fallback) {
  const ids = normalizeIdes(opts.ide);
  if (!ids) return opts.all || opts.yes ? allIdeIds() : fallback();
  const invalid = ids.filter((id) => !ideById(id));
  const valid = ids.filter((id) => ideById(id));
  if (!valid.length) {
    throw new UsageError(`Unknown IDE "${invalid.join('", "')}". Valid: ${allIdeIds().join(', ')}`);
  }
  for (const id of invalid) warn(`Unknown IDE "${id}" — skipped. Valid: ${allIdeIds().join(', ')}`);
  return valid;
}

/**
 * Write the bridge files of the IDEs `ids` (validated) and say what happened to each.
 * `overwrite`: replace a whole-file bridge that differs (repair) or keep it (init).
 */
async function writeBridges(ctx, ids, overwrite) {
  const ides = ids.map(ideById);
  const written = await deliverBridges(ctx, ides, { overwrite });
  for (const ide of ides) {
    for (const f of written.filter((w) => w.ide === ide)) {
      if (f.shared) info(`${f.file} (shared path — written once)`);
      else if (f.action === 'added') info(`${f.file} (merged — existing content preserved)`);
      else if (f.block && f.action !== 'kept' && overwrite) info(`${f.file} (regenerated)`);
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
